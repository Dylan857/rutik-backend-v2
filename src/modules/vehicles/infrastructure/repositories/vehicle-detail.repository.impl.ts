import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { FuelLog } from '../../../fuel-logs/domain/fuel-log.entity';
import { AssignmentStatus } from '../../../school-assignments/domain/enums/assignment-status.enum';
import { RouteStatus } from '../../../school-routes/domain/enums/route-status.enum';
import { SchoolRoute } from '../../../school-routes/domain/school-route.entity';
import { RouteStop } from '../../../route-stops/domain/route-stop.entity';
import {
  ActiveRouteWithContext,
  AssignedStudentWithContext,
  FuelSummaryTotals,
  IVehicleDetailRepository,
} from '../../domain/interfaces/vehicle-detail.repository';

@Injectable()
export class VehicleDetailRepositoryImpl implements IVehicleDetailRepository {
  constructor(
    @InjectRepository(FuelLog)
    private readonly fuelLogRepository: Repository<FuelLog>,
    @InjectRepository(SchoolRoute)
    private readonly schoolRouteRepository: Repository<SchoolRoute>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
  ) {}

  async getFuelSummary(
    vehicleId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<FuelSummaryTotals> {
    const [logs, totals] = await Promise.all([
      this.fuelLogRepository.find({
        where: { vehicleId, date: Between(dateFrom, dateTo) },
        order: { date: 'DESC' },
      }),
      this.fuelLogRepository
        .createQueryBuilder('log')
        .select('COALESCE(SUM(log.amountPaid), 0)', 'totalAmountPaid')
        .addSelect('COALESCE(SUM(log.gallons), 0)', 'totalGallons')
        .addSelect('COUNT(*)', 'logsCount')
        .where('log.vehicleId = :vehicleId', { vehicleId })
        .andWhere('log.date BETWEEN :dateFrom AND :dateTo', {
          dateFrom,
          dateTo,
        })
        .getRawOne<{
          totalAmountPaid: string;
          totalGallons: string;
          logsCount: string;
        }>(),
    ]);

    return {
      logs,
      totalAmountPaid: parseFloat(totals?.totalAmountPaid ?? '0'),
      totalGallons: parseFloat(totals?.totalGallons ?? '0'),
      logsCount: parseInt(totals?.logsCount ?? '0', 10),
    };
  }

  async getActiveRoutes(vehicleId: string): Promise<ActiveRouteWithContext[]> {
    return this.schoolRouteRepository
      .createQueryBuilder('route')
      .innerJoin('route.schoolAssignment', 'assignment')
      .innerJoin('assignment.school', 'school')
      .innerJoin('assignment.schedule', 'schedule')
      .where('assignment.vehicleId = :vehicleId', { vehicleId })
      .andWhere('assignment.status = :assignmentStatus', {
        assignmentStatus: AssignmentStatus.ACTIVE,
      })
      .andWhere('route.status = :routeStatus', {
        routeStatus: RouteStatus.ACTIVE,
      })
      .select('route.id', 'id')
      .addSelect('route.status', 'status')
      .addSelect('assignment.id', 'schoolAssignmentId')
      .addSelect('school.id', 'schoolId')
      .addSelect('school.name', 'schoolName')
      .addSelect('schedule.id', 'scheduleId')
      .addSelect('schedule.name', 'scheduleName')
      .addSelect('route.distanceMeters', 'distanceMeters')
      .addSelect('route.durationSeconds', 'durationSeconds')
      .addSelect('route.distanceMetersReturn', 'distanceMetersReturn')
      .addSelect('route.durationSecondsReturn', 'durationSecondsReturn')
      .orderBy('route.createdAt', 'DESC')
      .getRawMany<ActiveRouteWithContext>();
  }

  async getAssignedStudents(
    routeIds: string[],
  ): Promise<AssignedStudentWithContext[]> {
    if (!routeIds.length) return [];

    const stops = await this.routeStopRepository.find({
      where: { schoolRouteId: In(routeIds) },
      relations: { student: true },
      order: { stopOrder: 'ASC' },
    });

    // A student is only ever on one active route at a time in practice, but
    // dedupe defensively rather than assume it.
    const seen = new Set<string>();
    const students: AssignedStudentWithContext[] = [];

    for (const stop of stops) {
      if (seen.has(stop.studentId)) continue;
      seen.add(stop.studentId);

      students.push({
        id: stop.student.id,
        firstName: stop.student.firstName,
        lastName: stop.student.lastName,
        grade: stop.student.grade,
        tripType: stop.student.tripType,
        schoolRouteId: stop.schoolRouteId,
      });
    }

    return students;
  }
}
