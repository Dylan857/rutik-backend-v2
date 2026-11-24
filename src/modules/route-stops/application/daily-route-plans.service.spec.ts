import { DailyRoutePlansService } from './daily-route-plans.service';
import { AbsenceLeg } from '../../student-absences/domain/enums/absence-leg.enum';
import { TripType } from '../../students/domain/enums/trip-type.enum';

const DATE = '2026-11-26';

function stop(id: string, studentId: string, order: number) {
  return {
    id,
    studentId,
    stopOrder: order,
    stopOrderReturn: order,
    latitudeSnapshot: 4.7,
    longitudeSnapshot: -74.1,
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    student: {
      firstName: studentId,
      lastName: 'X',
      tripType: TripType.ROUND_TRIP,
    },
  };
}

function setup(absences: { studentId: string; leg: AbsenceLeg }[]) {
  const stops = [
    stop('s1', 'ana', 1),
    stop('s2', 'beto', 2),
    stop('s3', 'carla', 3),
  ];

  const planRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const absenceRepository = {
    find: jest.fn().mockResolvedValue(
      absences.map((a) => ({
        ...a,
        student: { firstName: a.studentId, lastName: 'X' },
      })),
    ),
  };
  const routeStopsService = {
    findByRouteId: jest.fn().mockResolvedValue(stops),
    splitLegs: jest
      .fn()
      .mockImplementation((s) => ({ pickupStops: s, dropoffStops: s })),
    computeDailyLegs: jest
      .fn()
      .mockImplementation(
        (_routeId, exPickup: Set<string>, exDropoff: Set<string>) =>
          Promise.resolve({
            stops,
            // Reverse order to prove the daily plan, not stop_order, drives the result.
            pickup: {
              order: stops.filter((s) => !exPickup.has(s.studentId)).reverse(),
              directions: null,
            },
            dropoff: {
              order: stops.filter((s) => !exDropoff.has(s.studentId)),
              directions: null,
            },
          }),
      ),
    recalculateRouteOrder: jest.fn(),
  };
  const schoolRoutesService = {
    findById: jest.fn().mockResolvedValue({
      id: 'route-1',
      polyline: 'base-polyline',
      distanceMeters: 1000,
      durationSeconds: 600,
      polylineReturn: 'base-return',
      distanceMetersReturn: 1000,
      durationSecondsReturn: 600,
    }),
  };

  const service = new DailyRoutePlansService(
    planRepository as never,
    absenceRepository as never,
    routeStopsService as never,
    schoolRoutesService as never,
  );
  return { service, planRepository, routeStopsService };
}

describe('DailyRoutePlansService', () => {
  it('returns the base route untouched when nobody is absent', async () => {
    const { service, routeStopsService } = setup([]);
    const route = await service.getDailyRoute('route-1', DATE);

    expect(route.isModified).toBe(false);
    expect(route.pickup.stops.map((s) => s.routeStopId)).toEqual([
      's1',
      's2',
      's3',
    ]);
    expect(route.pickup.polyline).toBe('base-polyline');
    expect(routeStopsService.computeDailyLegs).not.toHaveBeenCalled();
  });

  it('skips an absent student on the legs they miss only', async () => {
    const { service, planRepository } = setup([
      { studentId: 'beto', leg: AbsenceLeg.PICKUP },
    ]);
    planRepository.findOne
      .mockResolvedValueOnce(null) // no stored plan yet → rebuild
      .mockImplementationOnce(() =>
        Promise.resolve({
          pickupStopIds: (
            planRepository.upsert.mock.calls[0][0] as {
              pickupStopIds: string[];
            }
          ).pickupStopIds,
          dropoffStopIds: (
            planRepository.upsert.mock.calls[0][0] as {
              dropoffStopIds: string[];
            }
          ).dropoffStopIds,
          computedAt: new Date(),
        }),
      );

    const route = await service.getDailyRoute('route-1', DATE);

    expect(route.isModified).toBe(true);
    expect(route.pickup.stops.map((s) => s.routeStopId)).toEqual(['s3', 's1']);
    expect(route.pickup.stops.map((s) => s.order)).toEqual([1, 2]);
    expect(route.dropoff.stops.map((s) => s.routeStopId)).toEqual([
      's1',
      's2',
      's3',
    ]);
    expect(route.absentStudents).toEqual([
      expect.objectContaining({ studentId: 'beto', leg: AbsenceLeg.PICKUP }),
    ]);
  });

  it('never rewrites the base route while planning a day', async () => {
    const { service, routeStopsService } = setup([
      { studentId: 'ana', leg: AbsenceLeg.BOTH },
    ]);
    await service.rebuild('route-1', DATE);
    expect(routeStopsService.recalculateRouteOrder).not.toHaveBeenCalled();
  });

  it('drops the stored plan once no absences remain', async () => {
    const { service, planRepository } = setup([]);
    const plan = await service.rebuild('route-1', DATE);

    expect(plan).toBeNull();
    expect(planRepository.delete).toHaveBeenCalledWith({
      schoolRouteId: 'route-1',
      date: DATE,
    });
    expect(planRepository.upsert).not.toHaveBeenCalled();
  });

  it('rebuilds a stored plan that no longer matches the absences', async () => {
    const { service, planRepository, routeStopsService } = setup([
      { studentId: 'carla', leg: AbsenceLeg.BOTH },
    ]);
    // Stored plan only excluded beto — stale now that carla is the absent one.
    planRepository.findOne.mockResolvedValue({
      pickupStopIds: ['s1', 's3'],
      dropoffStopIds: ['s1', 's3'],
      computedAt: new Date(),
    });

    await service.getDailyRoute('route-1', DATE);
    expect(routeStopsService.computeDailyLegs).toHaveBeenCalled();
  });
});
