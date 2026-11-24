import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SchoolRoutesService } from '../../school-routes/application/school-routes.service';
import { StudentAbsence } from '../../student-absences/domain/student-absence.entity';
import { AbsenceStatus } from '../../student-absences/domain/enums/absence-status.enum';
import { AbsenceLeg } from '../../student-absences/domain/enums/absence-leg.enum';
import { DailyRoutePlan } from '../domain/daily-route-plan.entity';
import { RouteStop } from '../domain/route-stop.entity';
import { RouteStopsService } from './route-stops.service';
import {
  DailyRouteLegDto,
  DailyRouteResponseDto,
} from '../infrastructure/api/dto/daily-route-response.dto';

interface Exclusions {
  pickup: Set<string>; // student IDs that skip the pickup leg
  dropoff: Set<string>; // student IDs that skip the dropoff leg
}

/**
 * Plans the route for a single date around reported absences, without ever
 * touching the base route. Plans are rebuilt eagerly when an absence for
 * that date is reported/cancelled, and lazily on read if the base route
 * changed since (a student joined/left, stops were re-ordered).
 *
 * StudentAbsence is read straight from its table (registered read-only in
 * RouteStopsModule) so this module doesn't import StudentAbsencesModule,
 * which itself depends on RouteStopsModule.
 */
@Injectable()
export class DailyRoutePlansService {
  private readonly logger = new Logger(DailyRoutePlansService.name);

  constructor(
    @InjectRepository(DailyRoutePlan)
    private readonly planRepository: Repository<DailyRoutePlan>,
    @InjectRepository(StudentAbsence)
    private readonly absenceRepository: Repository<StudentAbsence>,
    private readonly routeStopsService: RouteStopsService,
    private readonly schoolRoutesService: SchoolRoutesService,
  ) {}

  /** The route to run on `date` — the base route when nobody is absent. */
  async getDailyRoute(
    routeId: string,
    date: string,
  ): Promise<DailyRouteResponseDto> {
    const route = await this.schoolRoutesService.findById(routeId);
    const stops = await this.routeStopsService.findByRouteId(routeId);
    const absences = await this.findActiveAbsences(stops, date);

    const absentStudents = absences.map((a) => ({
      studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      leg: a.leg,
    }));

    if (absences.length === 0) {
      const { pickupStops, dropoffStops } =
        this.routeStopsService.splitLegs(stops);
      return {
        schoolRouteId: routeId,
        date,
        isModified: false,
        pickup: this.toLeg(
          [...pickupStops].sort(
            (a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0),
          ),
          route.polyline,
          route.distanceMeters,
          route.durationSeconds,
        ),
        dropoff: this.toLeg(
          [...dropoffStops].sort(
            (a, b) => (a.stopOrderReturn ?? 0) - (b.stopOrderReturn ?? 0),
          ),
          route.polylineReturn,
          route.distanceMetersReturn,
          route.durationSecondsReturn,
        ),
        absentStudents,
      };
    }

    let plan = await this.planRepository.findOne({
      where: { schoolRouteId: routeId, date },
    });
    if (!plan || this.isStale(plan, stops, this.toExclusions(absences))) {
      plan = await this.rebuild(routeId, date);
    }

    const byId = new Map(stops.map((s) => [s.id, s]));
    const resolve = (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((s): s is RouteStop => !!s);

    return {
      schoolRouteId: routeId,
      date,
      isModified: true,
      pickup: this.toLeg(
        resolve(plan?.pickupStopIds ?? []),
        plan?.polyline ?? null,
        plan?.distanceMeters ?? null,
        plan?.durationSeconds ?? null,
      ),
      dropoff: this.toLeg(
        resolve(plan?.dropoffStopIds ?? []),
        plan?.polylineReturn ?? null,
        plan?.distanceMetersReturn ?? null,
        plan?.durationSecondsReturn ?? null,
      ),
      absentStudents,
    };
  }

  /**
   * Recomputes (or drops) the plan for one route/date from the absences
   * currently active. Returns null when nobody is absent — the base route
   * applies as-is.
   */
  async rebuild(routeId: string, date: string): Promise<DailyRoutePlan | null> {
    const stops = await this.routeStopsService.findByRouteId(routeId);
    const absences = await this.findActiveAbsences(stops, date);

    if (absences.length === 0) {
      await this.planRepository.delete({ schoolRouteId: routeId, date });
      this.logger.log(
        `Route ${routeId} on ${date}: no absences — daily plan removed`,
      );
      return null;
    }

    const exclusions = this.toExclusions(absences);
    const { pickup, dropoff } = await this.routeStopsService.computeDailyLegs(
      routeId,
      exclusions.pickup,
      exclusions.dropoff,
    );

    const data: Partial<DailyRoutePlan> = {
      schoolRouteId: routeId,
      date,
      pickupStopIds: pickup.order.map((s) => s.id),
      dropoffStopIds: dropoff.order.map((s) => s.id),
      polyline: pickup.directions?.polyline ?? null,
      distanceMeters: pickup.directions?.distanceMeters ?? null,
      durationSeconds: pickup.directions?.durationSeconds ?? null,
      polylineReturn: dropoff.directions?.polyline ?? null,
      distanceMetersReturn: dropoff.directions?.distanceMeters ?? null,
      durationSecondsReturn: dropoff.directions?.durationSeconds ?? null,
      computedAt: new Date(),
    };

    await this.planRepository.upsert(data, ['schoolRouteId', 'date']);
    this.logger.log(
      `Route ${routeId} on ${date}: daily plan rebuilt — ${exclusions.pickup.size} absent from pickup, ${exclusions.dropoff.size} from dropoff`,
    );

    return this.planRepository.findOne({
      where: { schoolRouteId: routeId, date },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findActiveAbsences(
    stops: RouteStop[],
    date: string,
  ): Promise<StudentAbsence[]> {
    if (stops.length === 0) return [];
    return this.absenceRepository.find({
      where: {
        studentId: In(stops.map((s) => s.studentId)),
        date,
        status: AbsenceStatus.ACTIVE,
      },
      relations: { student: true },
    });
  }

  private toExclusions(absences: StudentAbsence[]): Exclusions {
    const exclusions: Exclusions = { pickup: new Set(), dropoff: new Set() };
    for (const absence of absences) {
      if (absence.leg !== AbsenceLeg.DROPOFF)
        exclusions.pickup.add(absence.studentId);
      if (absence.leg !== AbsenceLeg.PICKUP)
        exclusions.dropoff.add(absence.studentId);
    }
    return exclusions;
  }

  /**
   * A stored plan no longer matches reality when the set of stops it visits
   * differs from what the base route + absences say today, or when the base
   * route's stops were re-ordered/updated after it was computed.
   */
  private isStale(
    plan: DailyRoutePlan,
    stops: RouteStop[],
    exclusions: Exclusions,
  ): boolean {
    const { pickupStops, dropoffStops } =
      this.routeStopsService.splitLegs(stops);
    const expectedPickup = pickupStops
      .filter((s) => !exclusions.pickup.has(s.studentId))
      .map((s) => s.id);
    const expectedDropoff = dropoffStops
      .filter((s) => !exclusions.dropoff.has(s.studentId))
      .map((s) => s.id);

    const sameSet = (a: string[], b: string[]) =>
      a.length === b.length && a.every((id) => b.includes(id));

    if (!sameSet(expectedPickup, plan.pickupStopIds)) return true;
    if (!sameSet(expectedDropoff, plan.dropoffStopIds)) return true;

    const lastStopChange = Math.max(
      0,
      ...stops.map((s) => s.updatedAt.getTime()),
    );
    return plan.computedAt.getTime() < lastStopChange;
  }

  private toLeg(
    ordered: RouteStop[],
    polyline: string | null,
    distanceMeters: number | null,
    durationSeconds: number | null,
  ): DailyRouteLegDto {
    return {
      stops: ordered.map((stop, index) => ({
        routeStopId: stop.id,
        studentId: stop.studentId,
        studentName: `${stop.student.firstName} ${stop.student.lastName}`,
        order: index + 1,
        latitude: stop.latitudeSnapshot,
        longitude: stop.longitudeSnapshot,
      })),
      polyline,
      distanceMeters,
      durationSeconds,
    };
  }
}
