import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { assertCompanyAccess } from '../../../common/utils/company-scope';
import { GeoPoint, haversineMeters } from '../../../common/utils/geo';
import { DriverAppService } from '../../driver-app/application/driver-app.service';
import { DriverService } from '../../drivers/application/drivers.service';
import { Driver } from '../../drivers/domain/driver.entity';
import { SchoolAssignmentsService } from '../../school-assignments/application/school-assignments.service';
import { SchoolRoutesService } from '../../school-routes/application/school-routes.service';
import { StudentGuardianService } from '../../student-guardians/application/student-guardians.service';
import { UserRole } from '../../user/domain/enums/user-role.enum';
import {
  OPEN_STOP_STATUSES,
  TripLeg,
  TripStatus,
  TripStopOutcome,
  TripStopStatus,
} from '../domain/enums/trip.enums';
import { RouteTrip } from '../domain/route-trip.entity';
import { TripLocation } from '../domain/trip-location.entity';
import { TripStop } from '../domain/trip-stop.entity';
import {
  GuardianLiveTripDto,
  LocationPointDto,
  TripDetailDto,
  TripDto,
  TripLatLngDto,
  TripLocationDto,
  TripStopDto,
} from '../infrastructure/api/dto/trip.dto';
import {
  TRIP_EVENTS,
  TrackingGateway,
} from '../infrastructure/websockets/tracking.gateway';
import { TripEtaService } from './trip-eta.service';
import { TripNotifier } from './trip-notifier';

/** "Cerca" = ≤ 5 min away by ETA, or ≤ 500 m in a straight line as backup. */
export const APPROACHING_ETA_SECONDS = 5 * 60;
export const APPROACHING_DISTANCE_METERS = 500;
/** Directions is called at most once a minute per trip (plus once per answered stop). */
export const ETA_REFRESH_MS = 60_000;
/** One breadcrumb every 15 s is plenty for the admin's trail. */
export const TRAIL_INTERVAL_MS = 15_000;
/** Trips with no location for this long are closed automatically. */
export const STALE_TRIP_MS = 2 * 60 * 60 * 1000;

/**
 * Live route runs ("trips"): the driver starts one, streams GPS points,
 * marks arrivals and answers "¿Recogió/Entregó a X?" for each stop; this
 * service keeps the live state, decides when a stop is "cerca", and fans
 * the changes out over the /tracking socket and as pushes/notifications.
 */
@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(RouteTrip)
    private readonly tripRepository: Repository<RouteTrip>,
    @InjectRepository(TripStop)
    private readonly stopRepository: Repository<TripStop>,
    @InjectRepository(TripLocation)
    private readonly locationRepository: Repository<TripLocation>,
    private readonly driverService: DriverService,
    private readonly driverAppService: DriverAppService,
    private readonly schoolRoutesService: SchoolRoutesService,
    private readonly assignmentsService: SchoolAssignmentsService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly etaService: TripEtaService,
    private readonly notifier: TripNotifier,
    @Inject(forwardRef(() => TrackingGateway))
    private readonly gateway: TrackingGateway,
  ) {}

  // ── Driver ──────────────────────────────────────────────────────────────────

  async start(userId: string, routeId: string, leg: TripLeg): Promise<TripDto> {
    const driver = await this.requireDriver(userId);
    const date = await this.driverAppService.resolveDate(userId);
    // Throws 404 unless the route belongs to this driver.
    const daily = await this.driverAppService.getMyDailyRoute(
      userId,
      routeId,
      date,
    );

    const active = await this.tripRepository.findOne({
      where: { driverId: driver.id, status: TripStatus.IN_PROGRESS },
    });
    if (active) {
      // Tapping "Iniciar" twice (or retrying after a timeout) is harmless.
      if (
        active.schoolRouteId === routeId &&
        active.leg === leg &&
        active.date === date
      ) {
        return this.toTripDto(active, await this.loadStops(active.id));
      }
      throw new ConflictException(
        'Ya tienes una ruta en curso. Finalízala antes de iniciar otra.',
      );
    }

    const legPlan = leg === TripLeg.PICKUP ? daily.pickup : daily.dropoff;
    if (legPlan.stops.length === 0) {
      throw new BadRequestException(
        'No hay estudiantes para este trayecto hoy.',
      );
    }

    const route = await this.schoolRoutesService.findById(routeId);
    const assignment = await this.assignmentsService.findById(
      route.schoolAssignmentId,
    );
    const destination = leg === TripLeg.PICKUP ? daily.school : daily.company;

    const trip = await this.tripRepository.save(
      this.tripRepository.create({
        companyId: route.companyId,
        schoolRouteId: routeId,
        driverId: driver.id,
        vehicleId: assignment.vehicleId ?? null,
        date,
        leg,
        status: TripStatus.IN_PROGRESS,
        startedAt: new Date(),
        schoolName: daily.schoolName,
        driverName:
          `${assignment.driver?.firstName ?? ''} ${assignment.driver?.lastName ?? ''}`.trim() ||
          'El conductor',
        vehiclePlate: assignment.vehicle?.plate ?? null,
        polyline: legPlan.polyline,
        destinationLat: destination?.latitude ?? null,
        destinationLng: destination?.longitude ?? null,
      }),
    );

    const stops = await this.stopRepository.save(
      legPlan.stops.map((stop, index) =>
        this.stopRepository.create({
          tripId: trip.id,
          routeStopId: stop.routeStopId,
          studentId: stop.studentId,
          studentName: stop.studentName,
          sequence: index + 1,
          latitude: stop.latitude,
          longitude: stop.longitude,
          status: TripStopStatus.PENDING,
        }),
      ),
    );

    const dto = this.toTripDto(trip, stops);
    this.gateway.emitToCompany(trip.companyId, TRIP_EVENTS.STARTED, dto);
    void this.notifier.started(trip, stops);
    this.logger.log(
      `Trip ${trip.id} started (${leg}, route ${routeId}, ${stops.length} stops)`,
    );
    return dto;
  }

  async getActiveForDriver(userId: string): Promise<TripDto | null> {
    const driver = await this.requireDriver(userId);
    const trip = await this.tripRepository.findOne({
      where: { driverId: driver.id, status: TripStatus.IN_PROGRESS },
    });
    return trip ? this.toTripDto(trip, await this.loadStops(trip.id)) : null;
  }

  async recordLocations(
    userId: string,
    tripId: string,
    points: LocationPointDto[],
  ): Promise<{ accepted: number }> {
    const trip = await this.requireOwnActiveTrip(userId, tripId);

    // Drop points older than what we already have (retries / reordering).
    const lastKnown = trip.lastLocationAt?.getTime() ?? 0;
    const fresh = points
      .map((p) => ({ ...p, at: new Date(p.recordedAt) }))
      .filter(
        (p) => !Number.isNaN(p.at.getTime()) && p.at.getTime() > lastKnown,
      )
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    if (fresh.length === 0) return { accepted: 0 };

    // Breadcrumbs, throttled.
    let lastTrail = trip.lastTrailAt?.getTime() ?? 0;
    const trail: Partial<TripLocation>[] = [];
    for (const p of fresh) {
      if (p.at.getTime() - lastTrail >= TRAIL_INTERVAL_MS) {
        trail.push({
          tripId,
          latitude: p.latitude,
          longitude: p.longitude,
          speed: p.speed ?? null,
          heading: p.heading ?? null,
          recordedAt: p.at,
        });
        lastTrail = p.at.getTime();
      }
    }
    if (trail.length) await this.locationRepository.insert(trail);

    const last = fresh[fresh.length - 1];
    Object.assign(trip, {
      lastLat: last.latitude,
      lastLng: last.longitude,
      lastSpeed: last.speed ?? null,
      lastHeading: last.heading ?? null,
      lastLocationAt: last.at,
      lastTrailAt: lastTrail ? new Date(lastTrail) : trip.lastTrailAt,
    });
    await this.tripRepository.update(trip.id, {
      lastLat: trip.lastLat,
      lastLng: trip.lastLng,
      lastSpeed: trip.lastSpeed,
      lastHeading: trip.lastHeading,
      lastLocationAt: trip.lastLocationAt,
      lastTrailAt: trip.lastTrailAt,
    });

    this.gateway.emitToTrip(trip.companyId, trip.id, TRIP_EVENTS.LOCATION, {
      tripId: trip.id,
      ...this.toLocationDto(trip),
    });

    const stops = await this.loadStops(trip.id);
    const etaAge = trip.etaUpdatedAt
      ? Date.now() - trip.etaUpdatedAt.getTime()
      : Infinity;
    if (etaAge >= ETA_REFRESH_MS) await this.refreshEta(trip, stops);
    await this.checkApproaching(trip, stops);

    return { accepted: fresh.length };
  }

  async markArrived(
    userId: string,
    tripId: string,
    tripStopId: string,
  ): Promise<TripDto> {
    const trip = await this.requireOwnActiveTrip(userId, tripId);
    const stops = await this.loadStops(trip.id);
    const stop = this.requireOpenStop(stops, tripStopId);

    if (stop.status !== TripStopStatus.ARRIVED) {
      stop.status = TripStopStatus.ARRIVED;
      stop.arrivedAt = new Date();
      await this.stopRepository.update(stop.id, {
        status: stop.status,
        arrivedAt: stop.arrivedAt,
      });
      this.emitStop(trip, stop);
      void this.notifier.arrived(trip, stop);
    }
    return this.toTripDto(trip, stops);
  }

  async resolveStop(
    userId: string,
    tripId: string,
    tripStopId: string,
    outcome: TripStopOutcome,
  ): Promise<TripDto> {
    const trip = await this.requireOwnActiveTrip(userId, tripId);
    const stops = await this.loadStops(trip.id);
    const stop = this.requireOpenStop(stops, tripStopId);

    stop.status =
      outcome === TripStopOutcome.DONE
        ? TripStopStatus.DONE
        : TripStopStatus.NOT_DONE;
    stop.resolvedAt = new Date();
    stop.etaSeconds = null;
    await this.stopRepository.update(stop.id, {
      status: stop.status,
      resolvedAt: stop.resolvedAt,
      etaSeconds: null,
    });
    this.emitStop(trip, stop);
    void this.notifier.resolved(trip, stop);

    // One stop fewer on the way: the remaining ETAs change.
    if (trip.lastLat != null) await this.refreshEta(trip, stops);
    return this.toTripDto(trip, stops);
  }

  async finish(userId: string, tripId: string): Promise<TripDto> {
    const trip = await this.requireOwnActiveTrip(userId, tripId);
    const stops = await this.loadStops(trip.id);

    trip.status = TripStatus.COMPLETED;
    trip.endedAt = new Date();
    await this.tripRepository.update(trip.id, {
      status: trip.status,
      endedAt: trip.endedAt,
    });

    const dto = this.toTripDto(trip, stops);
    this.gateway.emitToTrip(trip.companyId, trip.id, TRIP_EVENTS.FINISHED, {
      tripId: trip.id,
      status: trip.status,
    });
    void this.notifier.finished(trip, stops);
    this.logger.log(`Trip ${trip.id} finished`);
    return dto;
  }

  // ── Guardian ────────────────────────────────────────────────────────────────

  /** The in-progress trip carrying this child, or null when there is none. */
  async getLiveForGuardian(
    userId: string,
    studentId: string,
  ): Promise<GuardianLiveTripDto | null> {
    const isGuardian = await this.studentGuardianService.isGuardianOfStudent(
      userId,
      studentId,
    );
    if (!isGuardian) {
      throw new ForbiddenException('No eres acudiente de este estudiante.');
    }

    const myStop = await this.stopRepository
      .createQueryBuilder('stop')
      .innerJoinAndSelect('stop.trip', 'trip')
      .where('stop.student_id = :studentId', { studentId })
      .andWhere('trip.status = :status', { status: TripStatus.IN_PROGRESS })
      .orderBy('trip.started_at', 'DESC')
      .getOne();
    if (!myStop?.trip) return null;

    const trip = myStop.trip;
    const stops = await this.loadStops(trip.id);
    const mine = stops.find((s) => s.id === myStop.id) ?? myStop;
    const open = stops.filter((s) => OPEN_STOP_STATUSES.has(s.status));

    return {
      tripId: trip.id,
      leg: trip.leg,
      schoolName: trip.schoolName,
      driverName: trip.driverName,
      vehiclePlate: trip.vehiclePlate,
      startedAt: trip.startedAt,
      polyline: trip.polyline,
      destination: this.toDestination(trip),
      lastLocation: this.toLocationDto(trip),
      etaDestinationSeconds: this.remaining(trip, trip.etaDestinationSeconds),
      totalStops: stops.length,
      currentStopNumber: open[0]?.sequence ?? null,
      stopsBeforeMine: open.filter((s) => s.sequence < mine.sequence).length,
      myStop: {
        tripStopId: mine.id,
        studentName: mine.studentName,
        sequence: mine.sequence,
        latitude: mine.latitude,
        longitude: mine.longitude,
        status: mine.status,
        etaSeconds: this.remaining(trip, mine.etaSeconds),
        arrivedAt: mine.arrivedAt,
        resolvedAt: mine.resolvedAt,
      },
    };
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async listActive(companyId: string | undefined): Promise<TripDto[]> {
    const trips = await this.tripRepository.find({
      where: {
        status: TripStatus.IN_PROGRESS,
        ...(companyId ? { companyId } : {}),
      },
      order: { startedAt: 'ASC' },
    });
    if (trips.length === 0) return [];

    const allStops = await this.stopRepository.find({
      where: { tripId: In(trips.map((t) => t.id)) },
      order: { sequence: 'ASC' },
    });
    return trips.map((trip) =>
      this.toTripDto(
        trip,
        allStops.filter((s) => s.tripId === trip.id),
      ),
    );
  }

  async getDetail(user: JwtPayload, tripId: string): Promise<TripDetailDto> {
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    assertCompanyAccess(user, trip.companyId);

    const [stops, trail] = await Promise.all([
      this.loadStops(trip.id),
      this.locationRepository.find({
        where: { tripId },
        order: { recordedAt: 'ASC' },
      }),
    ]);
    return {
      ...this.toTripDto(trip, stops),
      trail: trail.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        heading: p.heading,
        speed: p.speed,
        recordedAt: p.recordedAt,
      })),
    };
  }

  /** Socket room access: admins of the trip's company, its driver, guardians on it. */
  async canWatch(user: JwtPayload, tripId: string): Promise<boolean> {
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) return false;

    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return true;
      case UserRole.ADMIN:
        return trip.companyId === user.companyId;
      case UserRole.DRIVER: {
        const driver = await this.driverService.findByUserId(user.sub);
        return driver?.id === trip.driverId;
      }
      case UserRole.GUARDIAN: {
        const stops = await this.loadStops(trip.id);
        for (const studentId of new Set(stops.map((s) => s.studentId))) {
          if (
            await this.studentGuardianService.isGuardianOfStudent(
              user.sub,
              studentId,
            )
          ) {
            return true;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }

  /** Safety net for drivers who forget "Finalizar ruta" (or whose phone died). */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async closeStaleTrips(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_TRIP_MS);
    const candidates = await this.tripRepository.find({
      where: { status: TripStatus.IN_PROGRESS, startedAt: LessThan(cutoff) },
    });
    for (const trip of candidates) {
      const lastSeen = trip.lastLocationAt ?? trip.startedAt;
      if (lastSeen.getTime() > cutoff.getTime()) continue;

      await this.tripRepository.update(trip.id, {
        status: TripStatus.CANCELLED,
        endedAt: new Date(),
      });
      this.gateway.emitToTrip(trip.companyId, trip.id, TRIP_EVENTS.FINISHED, {
        tripId: trip.id,
        status: TripStatus.CANCELLED,
      });
      this.logger.warn(
        `Trip ${trip.id} auto-cancelled: no location since ${lastSeen.toISOString()}`,
      );
    }
  }

  // ── Live computations ───────────────────────────────────────────────────────

  private async refreshEta(trip: RouteTrip, stops: TripStop[]): Promise<void> {
    if (trip.lastLat == null || trip.lastLng == null) return;

    const open = stops.filter((s) => OPEN_STOP_STATUSES.has(s.status));
    // ETA "a clases" only makes sense on the way to school.
    const destination =
      trip.leg === TripLeg.PICKUP
        ? this.toPoint(trip.destinationLat, trip.destinationLng)
        : null;
    if (open.length === 0 && !destination) return;

    const result = await this.etaService.compute(
      { lat: trip.lastLat, lng: trip.lastLng },
      open.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      destination,
    );

    const now = new Date();
    open.forEach(
      (stop, i) => (stop.etaSeconds = result.waypointSeconds[i] ?? null),
    );
    trip.etaDestinationSeconds = result.destinationSeconds;
    trip.etaUpdatedAt = now;

    await Promise.all([
      ...open.map((s) =>
        this.stopRepository.update(s.id, { etaSeconds: s.etaSeconds }),
      ),
      this.tripRepository.update(trip.id, {
        etaDestinationSeconds: trip.etaDestinationSeconds,
        etaUpdatedAt: now,
      }),
    ]);

    this.gateway.emitToTrip(trip.companyId, trip.id, TRIP_EVENTS.ETA, {
      tripId: trip.id,
      etaDestinationSeconds: trip.etaDestinationSeconds,
      stops: open.map((s) => ({
        tripStopId: s.id,
        sequence: s.sequence,
        etaSeconds: s.etaSeconds,
      })),
    });
  }

  /** Marks (and notifies, once) every pending stop that is now "cerca". */
  private async checkApproaching(
    trip: RouteTrip,
    stops: TripStop[],
  ): Promise<void> {
    if (trip.lastLat == null || trip.lastLng == null) return;
    const here: GeoPoint = { lat: trip.lastLat, lng: trip.lastLng };
    // The straight-line backup only counts for the stop the bus is heading
    // to: driving past a later family's house on the way to an earlier stop
    // must not tell them "ya llega". The ETA already follows visiting order.
    const nextStopId = stops.find((s) => OPEN_STOP_STATUSES.has(s.status))?.id;

    for (const stop of stops) {
      if (stop.status !== TripStopStatus.PENDING || stop.approachingNotifiedAt)
        continue;

      const eta = this.remaining(trip, stop.etaSeconds);
      const nearByEta = eta != null && eta <= APPROACHING_ETA_SECONDS;
      const nearByDistance =
        stop.id === nextStopId &&
        haversineMeters(here, { lat: stop.latitude, lng: stop.longitude }) <=
          APPROACHING_DISTANCE_METERS;
      if (!nearByEta && !nearByDistance) continue;

      stop.status = TripStopStatus.APPROACHING;
      stop.approachingNotifiedAt = new Date();
      await this.stopRepository.update(stop.id, {
        status: stop.status,
        approachingNotifiedAt: stop.approachingNotifiedAt,
      });
      this.emitStop(trip, stop);
      void this.notifier.approaching(
        trip,
        stop,
        eta != null ? Math.max(1, Math.round(eta / 60)) : null,
      );
    }
  }

  /** ETAs are stored as of etaUpdatedAt; count down the time since. */
  private remaining(trip: RouteTrip, seconds: number | null): number | null {
    if (seconds == null) return null;
    const elapsed = trip.etaUpdatedAt
      ? (Date.now() - trip.etaUpdatedAt.getTime()) / 1000
      : 0;
    return Math.max(0, Math.round(seconds - elapsed));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async requireDriver(userId: string): Promise<Driver> {
    const driver = await this.driverService.findByUserId(userId);
    if (!driver)
      throw new ForbiddenException(
        'Tu usuario no tiene un perfil de conductor.',
      );
    return driver;
  }

  private async requireOwnActiveTrip(
    userId: string,
    tripId: string,
  ): Promise<RouteTrip> {
    const driver = await this.requireDriver(userId);
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    // 404 (not 403) so other drivers' trip IDs can't be probed.
    if (!trip || trip.driverId !== driver.id)
      throw new NotFoundException('Trip not found');
    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new ConflictException('Esta ruta ya fue finalizada.');
    }
    return trip;
  }

  private requireOpenStop(stops: TripStop[], tripStopId: string): TripStop {
    const stop = stops.find((s) => s.id === tripStopId);
    if (!stop) throw new NotFoundException('Stop not found');
    if (!OPEN_STOP_STATUSES.has(stop.status)) {
      throw new ConflictException('Esta parada ya fue confirmada.');
    }
    return stop;
  }

  private loadStops(tripId: string): Promise<TripStop[]> {
    return this.stopRepository.find({
      where: { tripId },
      order: { sequence: 'ASC' },
    });
  }

  /** Full stop to admins; sequence/status only to the trip room (other families). */
  private emitStop(trip: RouteTrip, stop: TripStop): void {
    const publicPayload = {
      tripId: trip.id,
      tripStopId: stop.id,
      sequence: stop.sequence,
      status: stop.status,
    };
    this.gateway.emitSplit(
      trip.companyId,
      trip.id,
      TRIP_EVENTS.STOP_UPDATED,
      publicPayload,
      {
        ...publicPayload,
        stop: this.toStopDto(trip, stop),
      },
    );
  }

  private toTripDto(trip: RouteTrip, stops: TripStop[]): TripDto {
    const done = stops.filter((s) => s.status === TripStopStatus.DONE).length;
    const notDone = stops.filter(
      (s) => s.status === TripStopStatus.NOT_DONE,
    ).length;
    return {
      id: trip.id,
      routeId: trip.schoolRouteId,
      date: trip.date,
      leg: trip.leg,
      status: trip.status,
      startedAt: trip.startedAt,
      endedAt: trip.endedAt,
      schoolName: trip.schoolName,
      driverName: trip.driverName,
      vehiclePlate: trip.vehiclePlate,
      polyline: trip.polyline,
      destination: this.toDestination(trip),
      lastLocation: this.toLocationDto(trip),
      etaDestinationSeconds: this.remaining(trip, trip.etaDestinationSeconds),
      progress: {
        total: stops.length,
        done,
        notDone,
        open: stops.length - done - notDone,
      },
      stops: stops.map((s) => this.toStopDto(trip, s)),
    };
  }

  private toStopDto(trip: RouteTrip, stop: TripStop): TripStopDto {
    return {
      id: stop.id,
      routeStopId: stop.routeStopId,
      studentId: stop.studentId,
      studentName: stop.studentName,
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
      status: stop.status,
      etaSeconds: OPEN_STOP_STATUSES.has(stop.status)
        ? this.remaining(trip, stop.etaSeconds)
        : null,
      arrivedAt: stop.arrivedAt,
      resolvedAt: stop.resolvedAt,
    };
  }

  private toLocationDto(trip: RouteTrip): TripLocationDto | null {
    if (trip.lastLat == null || trip.lastLng == null || !trip.lastLocationAt)
      return null;
    return {
      latitude: trip.lastLat,
      longitude: trip.lastLng,
      heading: trip.lastHeading,
      speed: trip.lastSpeed,
      recordedAt: trip.lastLocationAt,
    };
  }

  private toDestination(trip: RouteTrip): TripLatLngDto | null {
    return trip.destinationLat != null && trip.destinationLng != null
      ? { latitude: trip.destinationLat, longitude: trip.destinationLng }
      : null;
  }

  private toPoint(lat: number | null, lng: number | null): GeoPoint | null {
    return lat != null && lng != null ? { lat, lng } : null;
  }
}
