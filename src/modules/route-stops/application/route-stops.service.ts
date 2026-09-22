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
import { TripType } from '../../students/domain/enums/trip-type.enum';
import { RouteStop } from '../domain/route-stop.entity';
import {
  IRouteStopRepository,
  RouteStopFilters,
  ROUTE_STOP_REPOSITORY,
} from '../domain/interfaces/route-stop.repository';
import {
  GoogleDirectionsService,
  LatLng,
} from '../infrastructure/external/google-directions.service';

// Google Directions caps waypoints per request at 25 total (origin +
// destination + up to 23 intermediate stops). Each leg (pickup/dropoff) is
// its own request with the company/school as fixed endpoints and its own
// filtered stop set as waypoints, so the limit applies per leg.
const MAX_STOPS_FOR_DIRECTIONS = 23;

interface LegDirectionsResult {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
}

interface LegComputation {
  order: RouteStop[];
  directions: LegDirectionsResult | null;
}

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

  async findByRouteId(
    routeId: string,
    companyId?: string,
  ): Promise<RouteStop[]> {
    return this.routeStopRepository.findAll({
      schoolRouteId: routeId,
      companyId,
    });
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

  // Called when a student's tripType changes but their school/schedule
  // didn't — the student stays on the same route, only which leg(s) their
  // stop participates in changes, so there's no need to remove/re-add it.
  async refreshRouteForStudent(studentId: string): Promise<void> {
    const stop = await this.routeStopRepository.findByStudentId(studentId);

    if (!stop) {
      this.logger.warn(
        `refreshRouteForStudent: student ${studentId} has no active route stop`,
      );
      return;
    }

    await this.recalculateRouteOrder(stop.schoolRouteId);
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

    const { pickupOrder, dropoffOrder } = await this.computeStopOrders(
      routeId,
      stops,
    );

    const pickupIndex = new Map(pickupOrder.map((stop, i) => [stop.id, i + 1]));
    const dropoffIndex = new Map(
      dropoffOrder.map((stop, i) => [stop.id, i + 1]),
    );

    for (const stop of stops) {
      await this.routeStopRepository.updateOrder(stop.id, {
        stopOrder: pickupIndex.get(stop.id) ?? null,
        stopOrderReturn: dropoffIndex.get(stop.id) ?? null,
      });
    }

    this.logger.log(
      `Route ${routeId}: recalculated order for ${pickupOrder.length} pickup / ${dropoffOrder.length} dropoff stops`,
    );
  }

  // ── Private algorithm ────────────────────────────────────────────────────────

  // Splits stops into a pickup leg (company -> school) and a dropoff leg
  // (school -> company), each restricted to the students whose tripType
  // includes that leg, and orders each independently via Google Directions
  // — mixed trip types mean the two legs can have different stop sets, so
  // one is never just the other reversed.
  private async computeStopOrders(
    routeId: string,
    stops: RouteStop[],
  ): Promise<{ pickupOrder: RouteStop[]; dropoffOrder: RouteStop[] }> {
    const pickupStops = stops.filter(
      (s) => s.student.tripType !== TripType.DROPOFF_ONLY,
    );
    const dropoffStops = stops.filter(
      (s) => s.student.tripType !== TripType.PICKUP_ONLY,
    );

    const apiKey = this.configService.get<string>('googleMaps.apiKey');

    const route = await this.schoolRoutesService.findById(routeId);
    const assignment = await this.assignmentsService.findById(
      route.schoolAssignmentId,
    );
    const school = await this.schoolService.findById(assignment.schoolId);
    const company = await this.companyService.findById(route.companyId);

    const hasCoords =
      school.latitude != null &&
      school.longitude != null &&
      company.latitude != null &&
      company.longitude != null;

    if (!hasCoords) {
      this.logger.warn(
        `Route ${routeId}: school or company has no coordinates — using nearest-neighbor fallback for both legs`,
      );
      return {
        pickupOrder: this.nearestNeighborSort(pickupStops),
        dropoffOrder: this.nearestNeighborSort(dropoffStops),
      };
    }

    const companyPoint: LatLng = {
      lat: company.latitude!,
      lng: company.longitude!,
    };
    const schoolPoint: LatLng = {
      lat: school.latitude!,
      lng: school.longitude!,
    };

    const pickup = await this.computeLegOrder(
      routeId,
      pickupStops,
      companyPoint,
      schoolPoint,
      apiKey,
      'pickup',
    );
    const dropoff = await this.computeLegOrder(
      routeId,
      dropoffStops,
      schoolPoint,
      companyPoint,
      apiKey,
      'dropoff',
    );

    const directionsCache: Parameters<
      typeof this.schoolRoutesService.updateDirectionsCache
    >[1] = { directionsUpdatedAt: new Date() };
    let hasFreshDirections = false;

    if (pickup.directions) {
      directionsCache.polyline = pickup.directions.polyline;
      directionsCache.distanceMeters = pickup.directions.distanceMeters;
      directionsCache.durationSeconds = pickup.directions.durationSeconds;
      hasFreshDirections = true;
    }
    if (dropoff.directions) {
      directionsCache.polylineReturn = dropoff.directions.polyline;
      directionsCache.distanceMetersReturn = dropoff.directions.distanceMeters;
      directionsCache.durationSecondsReturn =
        dropoff.directions.durationSeconds;
      hasFreshDirections = true;
    }

    if (hasFreshDirections) {
      await this.schoolRoutesService.updateDirectionsCache(
        routeId,
        directionsCache,
      );
    }

    return { pickupOrder: pickup.order, dropoffOrder: dropoff.order };
  }

  // Orders a single leg's stops via Google Directions' optimizeWaypoints,
  // falling back to the local nearest-neighbor heuristic whenever Directions
  // can't be used or fails for this leg specifically.
  private async computeLegOrder(
    routeId: string,
    legStops: RouteStop[],
    origin: LatLng,
    destination: LatLng,
    apiKey: string | undefined,
    legLabel: 'pickup' | 'dropoff',
  ): Promise<LegComputation> {
    if (legStops.length === 0) {
      return { order: [], directions: null };
    }

    if (!apiKey) {
      this.logger.warn(
        `Route ${routeId}: no GOOGLE_MAPS_API_KEY configured — using nearest-neighbor fallback for the ${legLabel} leg`,
      );
      return { order: this.nearestNeighborSort(legStops), directions: null };
    }

    if (legStops.length > MAX_STOPS_FOR_DIRECTIONS) {
      this.logger.warn(
        `Route ${routeId}: ${legStops.length} stops exceeds the ${MAX_STOPS_FOR_DIRECTIONS}-stop Directions limit for the ${legLabel} leg — using nearest-neighbor fallback`,
      );
      return { order: this.nearestNeighborSort(legStops), directions: null };
    }

    if (legStops.length === 1) {
      return { order: [...legStops], directions: null };
    }

    try {
      const result = await this.directionsService.getOptimizedRoute(
        origin,
        destination,
        legStops.map((s) => ({
          lat: s.latitudeSnapshot,
          lng: s.longitudeSnapshot,
        })),
      );

      return {
        order: result.waypointOrder.map((idx) => legStops[idx]),
        directions: {
          polyline: result.polyline,
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Route ${routeId}: Google Directions call failed for the ${legLabel} leg (${
          (error as Error).message
        }) — using nearest-neighbor fallback`,
      );
      return { order: this.nearestNeighborSort(legStops), directions: null };
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
