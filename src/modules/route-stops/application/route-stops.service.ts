import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus } from '../../school-assignments/domain/enums/assignment-status.enum';
import { SchoolAssignmentsService } from '../../school-assignments/application/school-assignments.service';
import { RouteStatus } from '../../school-routes/domain/enums/route-status.enum';
import { SchoolRoutesService } from '../../school-routes/application/school-routes.service';
import { Student } from '../../students/domain/student.entity';
import { RouteStop } from '../domain/route-stop.entity';
import {
  IRouteStopRepository,
  RouteStopFilters,
  ROUTE_STOP_REPOSITORY,
} from '../domain/interfaces/route-stop.repository';

@Injectable()
export class RouteStopsService {
  private readonly logger = new Logger(RouteStopsService.name);

  constructor(
    @Inject(ROUTE_STOP_REPOSITORY)
    private readonly routeStopRepository: IRouteStopRepository,
    private readonly assignmentsService: SchoolAssignmentsService,
    private readonly schoolRoutesService: SchoolRoutesService,
  ) {}

  // ── Public read methods (consumed by controllers) ───────────────────────────

  async findAll(filters: RouteStopFilters): Promise<RouteStop[]> {
    return this.routeStopRepository.findAll(filters);
  }

  async findById(id: string): Promise<RouteStop> {
    const stop = await this.routeStopRepository.findById(id);

    if (!stop) {
      throw new NotFoundException(`Route stop with ID "${id}" not found`);
    }

    return stop;
  }

  async findByRouteId(routeId: string): Promise<RouteStop[]> {
    return this.routeStopRepository.findAll({ schoolRouteId: routeId });
  }

  // ── Public domain methods (consumed by StudentService, NOT by controllers) ──

  // Accepts a Student object so RouteStopsModule does not need to import
  // StudentsModule, preventing a circular dependency.
  async addStudentToRoute(student: Student): Promise<void> {
    // Find the active assignment that covers this student's school + schedule
    const assignments = await this.assignmentsService.findAll({
      schoolId: student.schoolId,
      scheduleId: student.scheduleId,
      status: AssignmentStatus.ACTIVE,
    });

    if (!assignments.length) {
      this.logger.warn(
        `addStudentToRoute: no active assignment for school ${student.schoolId} / ` +
          `schedule ${student.scheduleId} — student ${student.id} not added to any route`,
      );
      return;
    }

    const assignment = assignments[0];

    // Find the active route linked to that assignment
    const routes = await this.schoolRoutesService.findAll({
      schoolAssignmentId: assignment.id,
      status: RouteStatus.ACTIVE,
    });

    if (!routes.length) {
      this.logger.warn(
        `addStudentToRoute: no active route for assignment ${assignment.id} — ` +
          `student ${student.id} not added`,
      );
      return;
    }

    const route = routes[0];

    // Idempotency: do not create a duplicate stop for the same student on the same route
    const existing = await this.routeStopRepository.findByRouteAndStudent(
      route.id,
      student.id,
    );
    if (existing) {
      this.logger.warn(
        `addStudentToRoute: student ${student.id} already has a stop on route ${route.id}`,
      );
      return;
    }

    // Validate that both belong to the same company
    if (route.companyId !== student.companyId) {
      throw new ConflictException(
        `Route ${route.id} and student ${student.id} belong to different companies`,
      );
    }

    await this.routeStopRepository.create({
      schoolRouteId: route.id,
      studentId: student.id,
      stopOrder: 0, // Assigned by recalculateRouteOrder immediately after
      latitudeSnapshot: student.latitude,
      longitudeSnapshot: student.longitude,
    });

    await this.recalculateRouteOrder(route.id);
    this.logger.log(`Student ${student.id} added to route ${route.id}`);
  }

  async removeStudentFromRoute(studentId: string): Promise<void> {
    const stop = await this.routeStopRepository.findByStudentId(studentId);

    if (!stop) {
      this.logger.warn(
        `removeStudentFromRoute: student ${studentId} has no active route stop`,
      );
      return;
    }

    const routeId = stop.schoolRouteId;
    await this.routeStopRepository.delete(stop.id);

    // Always recalculate the full route — never assume only one position changed
    await this.recalculateRouteOrder(routeId);
    this.logger.log(`Student ${studentId} removed from route ${routeId}`);
  }

  async recalculateRouteOrder(routeId: string): Promise<void> {
    const stops = await this.routeStopRepository.findAll({
      schoolRouteId: routeId,
    });

    if (stops.length === 0) return;

    const ordered = this.computeStopOrder(stops);

    for (let i = 0; i < ordered.length; i++) {
      await this.routeStopRepository.updateOrder(ordered[i].id, i + 1);
    }

    this.logger.log(
      `Route ${routeId}: recalculated order for ${ordered.length} stops`,
    );
  }

  // ── Private algorithm ────────────────────────────────────────────────────────

  // Entry point for the ordering algorithm. Swap this method body to plug in
  // a different strategy (e.g. Google Directions API) in a future version.
  private computeStopOrder(stops: RouteStop[]): RouteStop[] {
    return this.nearestNeighborSort(stops);
  }

  // Greedy nearest-neighbor starting from the northernmost stop (highest latitude).
  // O(n²) — acceptable for typical route sizes of 10–40 students.
  private nearestNeighborSort(stops: RouteStop[]): RouteStop[] {
    if (stops.length <= 1) return [...stops];

    const unvisited = [...stops];
    const sorted: RouteStop[] = [];

    // Start from the northernmost stop as a deterministic anchor point
    let anchorIndex = 0;
    for (let i = 1; i < unvisited.length; i++) {
      if (
        unvisited[i].latitudeSnapshot > unvisited[anchorIndex].latitudeSnapshot
      ) {
        anchorIndex = i;
      }
    }

    sorted.push(unvisited[anchorIndex]);
    unvisited.splice(anchorIndex, 1);

    while (unvisited.length > 0) {
      const last = sorted[sorted.length - 1];
      let nearestIdx = 0;
      let minDist = this.haversineKm(
        last.latitudeSnapshot,
        last.longitudeSnapshot,
        unvisited[0].latitudeSnapshot,
        unvisited[0].longitudeSnapshot,
      );

      for (let i = 1; i < unvisited.length; i++) {
        const dist = this.haversineKm(
          last.latitudeSnapshot,
          last.longitudeSnapshot,
          unvisited[i].latitudeSnapshot,
          unvisited[i].longitudeSnapshot,
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      sorted.push(unvisited[nearestIdx]);
      unvisited.splice(nearestIdx, 1);
    }

    return sorted;
  }

  // Haversine formula — returns approximate distance in km between two lat/lon points.
  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
