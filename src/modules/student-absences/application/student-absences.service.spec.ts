import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StudentAbsencesService } from './student-absences.service';
import { AbsenceLeg } from '../domain/enums/absence-leg.enum';
import { AbsenceStatus } from '../domain/enums/absence-status.enum';
import { TripType } from '../../students/domain/enums/trip-type.enum';
import { NotificationType } from '../../notifications/domain/enums/notification-type.enum';

// 10:00 in Bogotá (UTC-5) on 2026-11-25 — after the 06:30 entry, before the 13:00 exit.
const NOW = new Date('2026-11-25T15:00:00Z');
const TODAY = '2026-11-25';
const TOMORROW = '2026-11-26';

function setup(options: { tripType?: TripType; isGuardian?: boolean } = {}) {
  const student = {
    id: 'student-1',
    companyId: 'company-1',
    scheduleId: 'schedule-1',
    firstName: 'Sofía',
    lastName: 'Gómez',
    tripType: options.tripType ?? TripType.ROUND_TRIP,
  };

  const absenceRepository = {
    findActive: jest.fn().mockResolvedValue(null),
    findById: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation((data) =>
        Promise.resolve({ id: 'absence-1', createdAt: NOW, ...data }),
      ),
    update: jest
      .fn()
      .mockImplementation((id, data) =>
        Promise.resolve({
          id,
          studentId: student.id,
          date: TOMORROW,
          createdAt: NOW,
          ...data,
        }),
      ),
  };
  const deps = {
    studentService: { findById: jest.fn().mockResolvedValue(student) },
    studentGuardianService: {
      isGuardianOfStudent: jest
        .fn()
        .mockResolvedValue(options.isGuardian ?? true),
    },
    scheduleService: {
      findById: jest
        .fn()
        .mockResolvedValue({ startTime: '06:30:00', endTime: '13:00:00' }),
    },
    companyService: {
      findById: jest.fn().mockResolvedValue({ timezone: 'America/Bogota' }),
    },
    routeStopsService: {
      findAll: jest.fn().mockResolvedValue([{ schoolRouteId: 'route-1' }]),
    },
    dailyRoutePlansService: { rebuild: jest.fn().mockResolvedValue(null) },
    notificationsService: { create: jest.fn().mockResolvedValue({}) },
    userService: {
      findById: jest
        .fn()
        .mockResolvedValue({ firstName: 'María', lastName: 'López' }),
    },
  };

  const service = new StudentAbsencesService(
    absenceRepository as never,
    deps.studentService as never,
    deps.studentGuardianService as never,
    deps.scheduleService as never,
    deps.companyService as never,
    deps.routeStopsService as never,
    deps.dailyRoutePlansService as never,
    deps.notificationsService as never,
    deps.userService as never,
  );
  return { service, student, absenceRepository, ...deps };
}

describe('StudentAbsencesService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterAll(() => jest.useRealTimers());

  describe('report', () => {
    it('records the absence, re-plans that day and notifies the admins', async () => {
      const {
        service,
        absenceRepository,
        dailyRoutePlansService,
        notificationsService,
      } = setup();

      const result = await service.report('user-1', {
        studentId: 'student-1',
        date: TOMORROW,
        leg: AbsenceLeg.BOTH,
        reason: 'Cita médica',
      });

      expect(absenceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          date: TOMORROW,
          leg: AbsenceLeg.BOTH,
          status: AbsenceStatus.ACTIVE,
        }),
      );
      expect(dailyRoutePlansService.rebuild).toHaveBeenCalledWith(
        'route-1',
        TOMORROW,
      );
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.STUDENT_ABSENCE_REPORTED,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          studentName: 'Sofía Gómez',
          canCancel: true,
        }),
      );
    });

    it('rejects a guardian of another student', async () => {
      const { service } = setup({ isGuardian: false });
      await expect(
        service.report('user-1', {
          studentId: 'student-1',
          date: TOMORROW,
          leg: AbsenceLeg.BOTH,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a past date', async () => {
      const { service } = setup();
      await expect(
        service.report('user-1', {
          studentId: 'student-1',
          date: '2026-11-24',
          leg: AbsenceLeg.DROPOFF,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects today's ida after the entry time, but suggests the regreso", async () => {
      const { service } = setup();
      await expect(
        service.report('user-1', {
          studentId: 'student-1',
          date: TODAY,
          leg: AbsenceLeg.BOTH,
        }),
      ).rejects.toThrow(/solo el regreso/);
    });

    it("still accepts today's regreso before the exit time", async () => {
      const { service, absenceRepository } = setup();
      await service.report('user-1', {
        studentId: 'student-1',
        date: TODAY,
        leg: AbsenceLeg.DROPOFF,
      });
      expect(absenceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ leg: AbsenceLeg.DROPOFF }),
      );
    });

    it('widens an existing absence for the same day instead of duplicating it', async () => {
      const { service, absenceRepository } = setup();
      absenceRepository.findActive.mockResolvedValue({
        id: 'absence-1',
        leg: AbsenceLeg.PICKUP,
        reason: null,
      });

      await service.report('user-1', {
        studentId: 'student-1',
        date: TOMORROW,
        leg: AbsenceLeg.DROPOFF,
      });

      expect(absenceRepository.create).not.toHaveBeenCalled();
      expect(absenceRepository.update).toHaveBeenCalledWith(
        'absence-1',
        expect.objectContaining({ leg: AbsenceLeg.BOTH }),
      );
    });

    it('narrows "ida y regreso" to the only leg a PICKUP_ONLY student rides', async () => {
      const { service, absenceRepository } = setup({
        tripType: TripType.PICKUP_ONLY,
      });
      await service.report('user-1', {
        studentId: 'student-1',
        date: TOMORROW,
        leg: AbsenceLeg.BOTH,
      });
      expect(absenceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ leg: AbsenceLeg.PICKUP }),
      );
    });

    it('rejects a leg the student never rides', async () => {
      const { service } = setup({ tripType: TripType.PICKUP_ONLY });
      await expect(
        service.report('user-1', {
          studentId: 'student-1',
          date: TOMORROW,
          leg: AbsenceLeg.DROPOFF,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps the report even if re-planning the route fails', async () => {
      const { service, dailyRoutePlansService } = setup();
      dailyRoutePlansService.rebuild.mockRejectedValue(
        new Error('Directions down'),
      );
      await expect(
        service.report('user-1', {
          studentId: 'student-1',
          date: TOMORROW,
          leg: AbsenceLeg.BOTH,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('cancel', () => {
    it('cancels before the cutoff and re-plans the day', async () => {
      const { service, student, absenceRepository, dailyRoutePlansService } =
        setup();
      absenceRepository.findById.mockResolvedValue({
        id: 'absence-1',
        studentId: student.id,
        student,
        date: TOMORROW,
        leg: AbsenceLeg.BOTH,
        status: AbsenceStatus.ACTIVE,
      });

      await service.cancel('user-1', 'absence-1');

      expect(absenceRepository.update).toHaveBeenCalledWith(
        'absence-1',
        expect.objectContaining({ status: AbsenceStatus.CANCELLED }),
      );
      expect(dailyRoutePlansService.rebuild).toHaveBeenCalledWith(
        'route-1',
        TOMORROW,
      );
    });

    it('refuses once the route already left', async () => {
      const { service, student, absenceRepository } = setup();
      absenceRepository.findById.mockResolvedValue({
        id: 'absence-1',
        studentId: student.id,
        student,
        date: TODAY,
        leg: AbsenceLeg.PICKUP,
        status: AbsenceStatus.ACTIVE,
      });

      await expect(
        service.cancel('user-1', 'absence-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(absenceRepository.update).not.toHaveBeenCalled();
    });
  });
});
