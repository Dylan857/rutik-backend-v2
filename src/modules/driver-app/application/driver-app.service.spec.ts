import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DriverAppService } from './driver-app.service';
import { AbsenceLeg } from '../../student-absences/domain/enums/absence-leg.enum';

const DATE = '2026-11-26';

function leg(ids: string[]) {
  return {
    stops: ids.map((id, i) => ({
      routeStopId: `stop-${id}`,
      studentId: id,
      studentName: id,
      order: i + 1,
      latitude: 4.7,
      longitude: -74.1,
    })),
    polyline: 'abc',
    distanceMeters: 1000,
    durationSeconds: 600,
  };
}

function setup() {
  const deps = {
    driverService: {
      findByUserId: jest
        .fn()
        .mockResolvedValue({ id: 'driver-1', companyId: 'co-1' }),
    },
    assignmentsService: {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'asg-late',
          schoolId: 'school-1',
          scheduleId: 'sched-late',
          vehicleId: 'veh-1',
          vehicle: {
            id: 'veh-1',
            plate: 'ABC123',
            brand: 'Chevrolet',
            model: 'NPR',
            color: 'Blanco',
          },
        },
        {
          id: 'asg-early',
          schoolId: 'school-1',
          scheduleId: 'sched-early',
          vehicleId: 'veh-1',
          vehicle: null,
        },
      ]),
      findById: jest
        .fn()
        .mockResolvedValue({
          id: 'asg-early',
          driverId: 'driver-1',
          schoolId: 'school-1',
        }),
    },
    schoolRoutesService: {
      findAll: jest
        .fn()
        .mockImplementation(({ schoolAssignmentId }) =>
          Promise.resolve([{ id: `route-${schoolAssignmentId}` }]),
        ),
      findById: jest
        .fn()
        .mockResolvedValue({
          id: 'route-1',
          schoolAssignmentId: 'asg-early',
          companyId: 'co-1',
        }),
    },
    routeStopsService: {
      findByRouteId: jest.fn().mockResolvedValue([
        { studentId: 'ana', student: { address: 'Calle 1' } },
        { studentId: 'beto', student: { address: 'Calle 2' } },
      ]),
    },
    dailyRoutePlansService: {
      getDailyRoute: jest.fn().mockResolvedValue({
        isModified: true,
        pickup: leg(['ana']),
        dropoff: leg(['ana', 'beto']),
        absentStudents: [
          { studentId: 'beto', studentName: 'beto', leg: AbsenceLeg.PICKUP },
        ],
      }),
    },
    schoolService: {
      findById: jest
        .fn()
        .mockResolvedValue({
          name: 'Colegio',
          address: 'Cra 7',
          latitude: 4.6,
          longitude: -74,
        }),
    },
    scheduleService: {
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(
            id === 'sched-early'
              ? { name: 'Mañana', startTime: '06:30:00', endTime: '12:00:00' }
              : { name: 'Tarde', startTime: '12:30:00', endTime: '18:00:00' },
          ),
        ),
    },
    companyService: {
      findById: jest
        .fn()
        .mockResolvedValue({
          latitude: null,
          longitude: null,
          timezone: 'America/Bogota',
        }),
    },
    studentGuardianService: {
      findAll: jest.fn().mockResolvedValue([
        { guardianId: 'g2', relationshipType: 'FATHER', isPrimary: false },
        { guardianId: 'g1', relationshipType: 'MOTHER', isPrimary: true },
      ]),
    },
    guardianService: {
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve({ firstName: id, lastName: 'X', phone: `300${id}` }),
        ),
    },
    vehiclesService: { findById: jest.fn() },
    driverPaymentsService: { findAll: jest.fn() },
  };

  const service = new DriverAppService(
    deps.driverService as never,
    deps.assignmentsService as never,
    deps.schoolRoutesService as never,
    deps.routeStopsService as never,
    deps.dailyRoutePlansService as never,
    deps.schoolService as never,
    deps.scheduleService as never,
    deps.companyService as never,
    deps.studentGuardianService as never,
    deps.guardianService as never,
    deps.vehiclesService as never,
    deps.driverPaymentsService as never,
  );
  return { service, ...deps };
}

describe('DriverAppService', () => {
  it("lists the day's routes, earliest school entry first, with head counts", async () => {
    const { service } = setup();
    const routes = await service.getMyRoutes('user-1', DATE);

    expect(routes.map((r) => r.scheduleName)).toEqual(['Mañana', 'Tarde']);
    expect(routes[1]).toEqual(
      expect.objectContaining({
        pickupCount: 1,
        dropoffCount: 2,
        absentCount: 1,
      }),
    );
    expect(routes[1].vehicle?.plate).toBe('ABC123');
  });

  it('enriches the daily route with addresses and primary-first contacts', async () => {
    const { service } = setup();
    const route = await service.getMyDailyRoute('user-1', 'route-1', DATE);

    expect(route.pickup.stops[0]).toEqual(
      expect.objectContaining({ studentId: 'ana', address: 'Calle 1' }),
    );
    expect(route.pickup.stops[0].contacts.map((c) => c.name)).toEqual([
      'g1 X',
      'g2 X',
    ]);
    expect(route.school).toEqual({ latitude: 4.6, longitude: -74 });
    expect(route.company).toBeNull();
  });

  it("hides another driver's route behind a 404", async () => {
    const { service, assignmentsService } = setup();
    assignmentsService.findById.mockResolvedValue({
      id: 'asg-x',
      driverId: 'someone-else',
    });

    await expect(
      service.getMyDailyRoute('user-1', 'route-1', DATE),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a user without a driver profile', async () => {
    const { service, driverService } = setup();
    driverService.findByUserId.mockResolvedValue(null);

    await expect(service.getMyRoutes('user-1', DATE)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
