import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { NotificationType } from '../../notifications/domain/enums/notification-type.enum';
import {
  TripLeg,
  TripStatus,
  TripStopOutcome,
  TripStopStatus,
} from '../domain/enums/trip.enums';
import { RouteTrip } from '../domain/route-trip.entity';
import { TripStop } from '../domain/trip-stop.entity';
import { TripNotifier } from './trip-notifier';
import { ETA_REFRESH_MS, TripsService } from './trips.service';

// ── Minimal in-memory TypeORM repository ─────────────────────────────────────

type Row = Record<string, any> & { id: string };

function matches(row: Row, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected instanceof FindOperator) {
      const value = expected.value as unknown;
      if (expected.type === 'in')
        return (value as unknown[]).includes(row[key]);
      if (expected.type === 'lessThan') return row[key] < (value as never);
      throw new Error(`Unsupported operator ${expected.type}`);
    }
    return row[key] === expected;
  });
}

function fakeRepo<T extends Row>(prefix: string) {
  const rows = new Map<string, T>();
  let seq = 0;
  const sortBy = (list: T[], order?: Record<string, 'ASC' | 'DESC'>) => {
    if (!order) return list;
    const [[key, dir]] = Object.entries(order);
    return [...list].sort(
      (a, b) => (a[key] > b[key] ? 1 : -1) * (dir === 'DESC' ? -1 : 1),
    );
  };
  const saveOne = (e: T) => {
    const row = { ...e, id: e.id ?? `${prefix}-${++seq}` } as T;
    rows.set(row.id, row);
    return { ...row };
  };
  return {
    rows,
    create: jest.fn((data: Partial<T>) => ({ ...data }) as T),
    save: jest.fn(async (e: T | T[]) =>
      Array.isArray(e) ? e.map(saveOne) : saveOne(e),
    ),
    insert: jest.fn(async (list: T[]) => list.forEach(saveOne)),
    update: jest.fn(async (id: string, patch: Partial<T>) => {
      const row = rows.get(id);
      if (row) rows.set(id, { ...row, ...patch });
    }),
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const found = [...rows.values()].find((r) => matches(r, where));
      return found ? { ...found } : null;
    }),
    find: jest.fn(
      async (opts: { where?: Record<string, unknown>; order?: any } = {}) =>
        sortBy(
          [...rows.values()].filter((r) => matches(r, opts.where)),
          opts.order,
        ).map((r) => ({
          ...r,
        })),
    ),
  };
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DATE = '2026-11-25';
const SCHOOL = { latitude: 4.7, longitude: -74.05 };
const STOP_A = { lat: 4.6, lng: -74.1 };
const STOP_B = { lat: 4.65, lng: -74.08 };

function dailyRoute(withStops = true) {
  const stops = withStops
    ? [
        {
          routeStopId: 'rs-a',
          studentId: 'ana',
          studentName: 'Ana Ruiz',
          order: 1,
          latitude: STOP_A.lat,
          longitude: STOP_A.lng,
        },
        {
          routeStopId: 'rs-b',
          studentId: 'beto',
          studentName: 'Beto Gil',
          order: 2,
          latitude: STOP_B.lat,
          longitude: STOP_B.lng,
        },
      ]
    : [];
  return {
    routeId: 'route-1',
    date: DATE,
    isModified: false,
    schoolName: 'Colegio Sol',
    school: SCHOOL,
    company: { latitude: 4.5, longitude: -74.2 },
    pickup: { stops, polyline: 'poly', distanceMeters: 1, durationSeconds: 1 },
    dropoff: {
      stops: [],
      polyline: null,
      distanceMeters: null,
      durationSeconds: null,
    },
    absentStudents: [],
  };
}

function setup({ withStops = true } = {}) {
  const tripRepo = fakeRepo<RouteTrip & Row>('trip');
  const stopRepo = fakeRepo<TripStop & Row>('stop');
  const locationRepo = fakeRepo<Row>('loc');

  const deps = {
    driverService: {
      findByUserId: jest.fn(async (userId: string) =>
        userId === 'u-driver' ? { id: 'driver-1' } : { id: 'driver-2' },
      ),
    },
    driverAppService: {
      resolveDate: jest.fn().mockResolvedValue(DATE),
      getMyDailyRoute: jest.fn().mockResolvedValue(dailyRoute(withStops)),
    },
    schoolRoutesService: {
      findById: jest.fn().mockResolvedValue({
        id: 'route-1',
        companyId: 'co-1',
        schoolAssignmentId: 'asg-1',
      }),
    },
    assignmentsService: {
      findById: jest.fn().mockResolvedValue({
        id: 'asg-1',
        vehicleId: 'veh-1',
        driver: { firstName: 'Carlos', lastName: 'Pérez' },
        vehicle: { plate: 'ABC123' },
      }),
    },
    studentGuardianService: {
      isGuardianOfStudent: jest.fn().mockResolvedValue(true),
    },
    etaService: {
      // 10 min to the first stop, 20 to the second, 30 to school.
      compute: jest.fn(
        async (_o: unknown, waypoints: unknown[], destination: unknown) => ({
          waypointSeconds: waypoints.map((_, i) => (i + 1) * 600),
          destinationSeconds: destination ? (waypoints.length + 1) * 600 : null,
          source: 'estimate',
        }),
      ),
    },
    notifier: {
      started: jest.fn().mockResolvedValue(undefined),
      approaching: jest.fn().mockResolvedValue(undefined),
      arrived: jest.fn().mockResolvedValue(undefined),
      resolved: jest.fn().mockResolvedValue(undefined),
      finished: jest.fn().mockResolvedValue(undefined),
    },
    gateway: {
      emitToTrip: jest.fn(),
      emitSplit: jest.fn(),
      emitToCompany: jest.fn(),
    },
  };

  const service = new TripsService(
    tripRepo as never,
    stopRepo as never,
    locationRepo as never,
    deps.driverService as never,
    deps.driverAppService as never,
    deps.schoolRoutesService as never,
    deps.assignmentsService as never,
    deps.studentGuardianService as never,
    deps.etaService as never,
    deps.notifier as never,
    deps.gateway as never,
  );
  return { service, tripRepo, stopRepo, locationRepo, ...deps };
}

const point = (lat: number, lng: number, at: Date) => ({
  latitude: lat,
  longitude: lng,
  speed: 8,
  heading: 90,
  recordedAt: at.toISOString(),
});

afterEach(() => jest.useRealTimers());

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TripsService.start', () => {
  it("creates the trip from the day's plan, in visiting order, and notifies", async () => {
    const { service, stopRepo, notifier, gateway } = setup();

    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    expect(trip.status).toBe(TripStatus.IN_PROGRESS);
    expect(trip.driverName).toBe('Carlos Pérez');
    expect(trip.destination).toEqual(SCHOOL);
    expect(trip.stops.map((s) => [s.studentId, s.sequence, s.status])).toEqual([
      ['ana', 1, TripStopStatus.PENDING],
      ['beto', 2, TripStopStatus.PENDING],
    ]);
    expect(stopRepo.rows.size).toBe(2);
    expect(notifier.started).toHaveBeenCalledTimes(1);
    expect(gateway.emitToCompany).toHaveBeenCalledWith(
      'co-1',
      'trip:started',
      expect.anything(),
    );
  });

  it('returns the running trip when "Iniciar" is tapped twice', async () => {
    const { service, notifier } = setup();
    const first = await service.start('u-driver', 'route-1', TripLeg.PICKUP);
    const second = await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    expect(second.id).toBe(first.id);
    expect(notifier.started).toHaveBeenCalledTimes(1);
  });

  it('refuses a second, different trip while one is in progress', async () => {
    const { service } = setup();
    await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    await expect(
      service.start('u-driver', 'route-1', TripLeg.DROPOFF),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a leg with no students today', async () => {
    const { service } = setup({ withStops: false });
    await expect(
      service.start('u-driver', 'route-1', TripLeg.PICKUP),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('TripsService.recordLocations', () => {
  it('stores the position and notifies "cerca" once when a stop is within 500 m', async () => {
    const { service, tripRepo, notifier, gateway } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);
    const t0 = new Date();

    // ~5.5 km away: nothing yet (ETA mock says 10 min).
    await service.recordLocations('u-driver', trip.id, [
      point(4.55, -74.1, t0),
    ]);
    expect(notifier.approaching).not.toHaveBeenCalled();
    expect(tripRepo.rows.get(trip.id)?.lastLat).toBe(4.55);
    expect(gateway.emitToTrip).toHaveBeenCalledWith(
      'co-1',
      trip.id,
      'trip:location',
      expect.anything(),
    );

    // ~330 m from Ana's stop.
    const near = new Date(t0.getTime() + 5_000);
    await service.recordLocations('u-driver', trip.id, [
      point(4.597, -74.1, near),
    ]);
    expect(notifier.approaching).toHaveBeenCalledTimes(1);
    expect(notifier.approaching.mock.calls[0][1].studentId).toBe('ana');

    // Still near: no second push.
    const later = new Date(t0.getTime() + 10_000);
    await service.recordLocations('u-driver', trip.id, [
      point(4.598, -74.1, later),
    ]);
    expect(notifier.approaching).toHaveBeenCalledTimes(1);
  });

  it('notifies "cerca" by ETA (≤ 5 min) even when still far in a straight line', async () => {
    const { service, etaService, notifier } = setup();
    etaService.compute.mockResolvedValueOnce({
      waypointSeconds: [240, 900],
      destinationSeconds: 1500,
      source: 'directions',
    });
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    await service.recordLocations('u-driver', trip.id, [
      point(4.55, -74.1, new Date()),
    ]);

    expect(notifier.approaching).toHaveBeenCalledTimes(1);
    expect(notifier.approaching.mock.calls[0][2]).toBe(4); // minutes
  });

  it('does not tell a later stop "cerca" just because the bus drives past it', async () => {
    const { service, notifier } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    // ~100 m from Beto (stop #2) while Ana (#1) is still to be picked up.
    await service.recordLocations('u-driver', trip.id, [
      point(4.651, -74.08, new Date()),
    ]);

    expect(notifier.approaching).not.toHaveBeenCalled();
  });

  it('calls Directions at most once a minute', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T11:00:00Z') });
    const { service, etaService } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    await service.recordLocations('u-driver', trip.id, [
      point(4.5, -74.1, new Date()),
    ]);
    jest.setSystemTime(Date.now() + 5_000);
    await service.recordLocations('u-driver', trip.id, [
      point(4.51, -74.1, new Date()),
    ]);
    expect(etaService.compute).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.now() + ETA_REFRESH_MS);
    await service.recordLocations('u-driver', trip.id, [
      point(4.52, -74.1, new Date()),
    ]);
    expect(etaService.compute).toHaveBeenCalledTimes(2);
  });

  it('ignores stale points and throttles the breadcrumb trail', async () => {
    const { service, locationRepo } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);
    const t0 = new Date();
    const at = (s: number) => new Date(t0.getTime() + s * 1000);

    const res = await service.recordLocations('u-driver', trip.id, [
      point(4.5, -74.1, at(0)),
      point(4.5, -74.1, at(5)),
      point(4.5, -74.1, at(10)),
      point(4.5, -74.1, at(16)),
    ]);
    expect(res.accepted).toBe(4);
    expect(locationRepo.rows.size).toBe(2); // t=0 and t=16

    const replay = await service.recordLocations('u-driver', trip.id, [
      point(4.5, -74.1, at(3)),
    ]);
    expect(replay.accepted).toBe(0);
  });

  it("hides other drivers' trips", async () => {
    const { service } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);

    await expect(
      service.recordLocations('u-other', trip.id, [
        point(4.5, -74.1, new Date()),
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TripsService stop answers and finish', () => {
  it('"No" marks NOT_DONE and notifies; the stop cannot be answered twice', async () => {
    const { service, notifier } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);
    const ana = trip.stops[0];

    await service.markArrived('u-driver', trip.id, ana.id);
    expect(notifier.arrived).toHaveBeenCalledTimes(1);

    const after = await service.resolveStop(
      'u-driver',
      trip.id,
      ana.id,
      TripStopOutcome.NOT_DONE,
    );
    expect(after.stops[0].status).toBe(TripStopStatus.NOT_DONE);
    expect(after.progress).toEqual({ total: 2, done: 0, notDone: 1, open: 1 });
    expect(notifier.resolved.mock.calls[0][1].status).toBe(
      TripStopStatus.NOT_DONE,
    );

    await expect(
      service.resolveStop('u-driver', trip.id, ana.id, TripStopOutcome.DONE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finish closes the trip; later updates are rejected', async () => {
    const { service, notifier } = setup();
    const trip = await service.start('u-driver', 'route-1', TripLeg.PICKUP);
    await service.resolveStop(
      'u-driver',
      trip.id,
      trip.stops[0].id,
      TripStopOutcome.DONE,
    );

    const done = await service.finish('u-driver', trip.id);
    expect(done.status).toBe(TripStatus.COMPLETED);
    expect(notifier.finished).toHaveBeenCalledTimes(1);

    await expect(
      service.recordLocations('u-driver', trip.id, [
        point(4.5, -74.1, new Date()),
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await service.getActiveForDriver('u-driver')).toBeNull();
  });
});

describe('TripNotifier', () => {
  const trip = {
    id: 'trip-1',
    companyId: 'co-1',
    leg: TripLeg.PICKUP,
    driverName: 'Carlos Pérez',
    schoolName: 'Colegio Sol',
  } as RouteTrip;
  const stop = (status: TripStopStatus) =>
    ({
      id: 'stop-1',
      studentId: 'ana',
      studentName: 'Ana Ruiz',
      status,
    }) as TripStop;

  function notifier() {
    const push = {
      notifyGuardiansOfStudent: jest.fn().mockResolvedValue(undefined),
    };
    const notifications = { create: jest.fn().mockResolvedValue(null) };
    return {
      push,
      notifications,
      n: new TripNotifier(push as never, notifications as never),
    };
  }

  it('"No" pushes the guardian and alerts the admin', async () => {
    const { push, notifications, n } = notifier();
    await n.resolved(trip, stop(TripStopStatus.NOT_DONE));

    expect(push.notifyGuardiansOfStudent).toHaveBeenCalledWith(
      'ana',
      expect.objectContaining({
        title: 'Sin recogida',
        data: expect.objectContaining({
          type: 'TRIP_STOP_RESOLVED',
          tripId: 'trip-1',
        }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.STUDENT_NOT_PICKED_UP,
        companyId: 'co-1',
      }),
    );
  });

  it('"Sí" only pushes the guardian', async () => {
    const { push, notifications, n } = notifier();
    await n.resolved(trip, stop(TripStopStatus.DONE));

    expect(push.notifyGuardiansOfStudent.mock.calls[0][1].body).toBe(
      'Recogimos a Ana. Va camino a Colegio Sol.',
    );
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('never throws when the admin feed fails', async () => {
    const { notifications, n } = notifier();
    notifications.create.mockRejectedValue(new Error('db down'));
    await expect(
      n.started(trip, [stop(TripStopStatus.PENDING)]),
    ).resolves.toBeUndefined();
  });
});
