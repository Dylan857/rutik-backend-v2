import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssignmentStatus } from '../../school-assignments/domain/enums/assignment-status.enum';
import { SchoolAssignmentsService } from '../../school-assignments/application/school-assignments.service';
import { RouteStatus } from '../../school-routes/domain/enums/route-status.enum';
import { SchoolRoutesService } from '../../school-routes/application/school-routes.service';
import { SchoolService } from '../../school/application/school.service';
import { CompanyService } from '../../company/application/company.service';
import { Student } from '../../students/domain/student.entity';
import { RouteStop } from '../domain/route-stop.entity';
import {
  IRouteStopRepository,
  RouteStopFilters,
  ROUTE_STOP_REPOSITORY,
} from '../domain/interfaces/route-stop.repository';
import { GoogleDirectionsService } from '../infrastructure/external/google-directions.service';

// Google Directions caps waypoints per request at 25 total (origin +
// destination + up to 23 intermediate stops). The company is the fixed
// origin and every stop is a waypoint, so routes with more than 23 stops
// can't fit and fall back to nearest-neighbor entirely.
const MAX_STOPS_FOR_DIRECTIONS = 23;

@Injectable()
export class RouteStopsService {
  private readonly logger = new Logger(RouteStopsService.name);

  constructor(
    @Inject(ROUTE_STOP_REPOSITORY)
    private readonly routeStopRepository: IRouteStopRepository,
    private readonly assignmentsService: SchoolAssignmentsService,
    private readonly schoolRoutesService: SchoolRoutesService,
    private readonly schoolService: SchoolService,
    private readonly companyService: CompanyService,
    private readonly directionsService: GoogleDirectionsService,
    private readonly configService: ConfigService,
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

    const ordered = await this.computeStopOrder(routeId, stops);

    for (let i = 0; i < ordered.length; i++) {
      await this.routeStopRepository.updateOrder(ordered[i].id, i + 1);
    }

    this.logger.log(
      `Route ${routeId}: recalculated order for ${ordered.length} stops`,
    );
  }

  // ── Private algorithm ────────────────────────────────────────────────────────

  // Directions-first: uses Google Directions' optimizeWaypoints to order stops
  // toward a fixed destination (the school), falling back to the local
  // nearest-neighbor heuristic whenever Directions can't be used or fails.
  private async computeStopOrder(
    routeId: string,
    stops: RouteStop[],
  ): Promise<RouteStop[]> {
    const apiKey = this.configService.get<string>('googleMaps.apiKey');

    if (!apiKey) {
      this.logger.warn(
        `Route ${routeId}: no GOOGLE_MAPS_API_KEY configured — using nearest-neighbor fallback`,
      );
      return this.nearestNeighborSort(stops);
    }

    if (stops.length > MAX_STOPS_FOR_DIRECTIONS) {
      this.logger.warn(
        `Route ${routeId}: ${stops.length} stops exceeds the ${MAX_STOPS_FOR_DIRECTIONS}-stop Directions limit — using nearest-neighbor fallback`,
      );
      return this.nearestNeighborSort(stops);
    }

    const route = await this.schoolRoutesService.findById(routeId);
    const assignment = await this.assignmentsService.findById(
      route.schoolAssignmentId,
    );
    const school = await this.schoolService.findById(assignment.schoolId);
    const company = await this.companyService.findById(route.companyId);

    if (school.latitude == null || school.longitude == null) {
      this.logger.warn(
        `Route ${routeId}: school ${school.id} has no coordinates — using nearest-neighbor fallback`,
      );
      return this.nearestNeighborSort(stops);
    }

    if (company.latitude == null || company.longitude == null) {
      this.logger.warn(
        `Route ${routeId}: company ${company.id} has no coordinates — using nearest-neighbor fallback`,
      );
      return this.nearestNeighborSort(stops);
    }

    if (stops.length === 1) {
      return [...stops];
    }

    try {
      // Origin = the company's real depot location — every stop is a
      // waypoint, none is consumed as a stand-in origin.
      const origin = { lat: company.latitude, lng: company.longitude };
      const destination = { lat: school.latitude, lng: school.longitude };

      const result = await this.directionsService.getOptimizedRoute(
        origin,
        destination,
        stops.map((s) => ({
          lat: s.latitudeSnapshot,
          lng: s.longitudeSnapshot,
        })),
      );

      const ordered = result.waypointOrder.map((idx) => stops[idx]);

      const directionsCache: Parameters<
        typeof this.schoolRoutesService.updateDirectionsCache
      >[1] = {
        polyline: result.polyline,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        directionsUpdatedAt: new Date(),
      };

      // Return leg: mirrors the pickup order (school -> last pickup stop ->
      // ... -> first pickup stop -> company) rather than re-optimizing, and
      // is fetched as a real second call — not the pickup polyline reversed
      // — because streets here often aren't symmetric (divided avenues,
      // one-way segments).
      try {
        const returnWaypoints = [...ordered]
          .reverse()
          .map((s) => ({ lat: s.latitudeSnapshot, lng: s.longitudeSnapshot }));

        const returnResult = await this.directionsService.getOptimizedRoute(
          destination,
          origin,
          returnWaypoints,
          false,
        );

        directionsCache.polylineReturn = returnResult.polyline;
        directionsCache.distanceMetersReturn = returnResult.distanceMeters;
        directionsCache.durationSecondsReturn = returnResult.durationSeconds;
      } catch (returnError) {
        this.logger.warn(
          `Route ${routeId}: return-leg Directions call failed (${
            (returnError as Error).message
          }) — keeping previous return polyline cache`,
        );
      }

      await this.schoolRoutesService.updateDirectionsCache(
        routeId,
        directionsCache,
      );

      return ordered;
    } catch (error) {
      this.logger.warn(
        `Route ${routeId}: Google Directions call failed (${
          (error as Error).message
        }) — using nearest-neighbor fallback`,
      );
      return this.nearestNeighborSort(stops);
    }
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
