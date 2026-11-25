import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { DriverPaymentsService } from '../../driver-payments/application/driver-payments.service';
import { DriverPayment } from '../../driver-payments/domain/driver-payment.entity';
import { DriverService } from '../../drivers/application/drivers.service';
import { Driver } from '../../drivers/domain/driver.entity';
import { GuardianService } from '../../guardians/application/guardians.service';
import { DailyRoutePlansService } from '../../route-stops/application/daily-route-plans.service';
import { RouteStopsService } from '../../route-stops/application/route-stops.service';
import { DailyRouteLegDto } from '../../route-stops/infrastructure/api/dto/daily-route-response.dto';
import { SchoolAssignmentsService } from '../../school-assignments/application/school-assignments.service';
import { AssignmentStatus } from '../../school-assignments/domain/enums/assignment-status.enum';
import { SchoolRoutesService } from '../../school-routes/application/school-routes.service';
import { RouteStatus } from '../../school-routes/domain/enums/route-status.enum';
import { SchoolScheduleService } from '../../school-schedules/application/school-schedules.service';
import { SchoolService } from '../../school/application/school.service';
import { StudentGuardianService } from '../../student-guardians/application/student-guardians.service';
import { VehiclesService } from '../../vehicles/application/vehicles.service';
import { zonedNow } from '../../student-absences/application/absence-cutoff.util';
import {
  DriverDailyRouteDto,
  DriverRouteLegDto,
  DriverRouteSummaryDto,
  DriverVehicleDto,
  GuardianContactDto,
  LatLngDto,
} from '../infrastructure/api/dto/driver-app.dto';

/**
 * Read model for the drivers' mobile app: composes assignments, routes,
 * daily plans, students' guardians and vehicles into driver-scoped views.
 * Every method resolves the caller's own Driver first — a driver can only
 * ever see their own assignments, routes, vehicles and payments.
 */
@Injectable()
export class DriverAppService {
  constructor(
    private readonly driverService: DriverService,
    private readonly assignmentsService: SchoolAssignmentsService,
    private readonly schoolRoutesService: SchoolRoutesService,
    private readonly routeStopsService: RouteStopsService,
    private readonly dailyRoutePlansService: DailyRoutePlansService,
    private readonly schoolService: SchoolService,
    private readonly scheduleService: SchoolScheduleService,
    private readonly companyService: CompanyService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly guardianService: GuardianService,
    private readonly vehiclesService: VehiclesService,
    private readonly driverPaymentsService: DriverPaymentsService,
  ) {}

  /** "Today" in the driver's company timezone, when no date is requested. */
  async resolveDate(userId: string, date?: string): Promise<string> {
    if (date) return date.slice(0, 10);
    const driver = await this.resolveMyDriver(userId);
    const company = await this.companyService.findById(driver.companyId);
    return zonedNow(company.timezone).date;
  }

  async getMyRoutes(
    userId: string,
    date: string,
  ): Promise<DriverRouteSummaryDto[]> {
    const driver = await this.resolveMyDriver(userId);
    const assignments = await this.assignmentsService.findAll({
      driverId: driver.id,
      status: AssignmentStatus.ACTIVE,
    });

    const summaries: DriverRouteSummaryDto[] = [];
    for (const assignment of assignments) {
      const [route] = await this.schoolRoutesService.findAll({
        schoolAssignmentId: assignment.id,
        status: RouteStatus.ACTIVE,
      });
      if (!route) continue;

      const school = await this.schoolService.findById(assignment.schoolId);
      const schedule = await this.scheduleService.findById(
        assignment.scheduleId,
      );
      const daily = await this.dailyRoutePlansService.getDailyRoute(
        route.id,
        date,
      );

      summaries.push({
        routeId: route.id,
        assignmentId: assignment.id,
        schoolName: school.name,
        schoolAddress: school.address,
        scheduleName: schedule.name,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        vehicle: assignment.vehicle
          ? {
              id: assignment.vehicle.id,
              plate: assignment.vehicle.plate,
              brand: assignment.vehicle.brand,
              model: assignment.vehicle.model,
              color: assignment.vehicle.color,
            }
          : null,
        pickupCount: daily.pickup.stops.length,
        dropoffCount: daily.dropoff.stops.length,
        absentCount: daily.absentStudents.length,
      });
    }

    // Earliest school entry first — the order the driver runs them.
    return summaries.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getMyDailyRoute(
    userId: string,
    routeId: string,
    date: string,
  ): Promise<DriverDailyRouteDto> {
    const driver = await this.resolveMyDriver(userId);
    const route = await this.schoolRoutesService.findById(routeId);
    const assignment = await this.assignmentsService.findById(
      route.schoolAssignmentId,
    );
    // 404 (not 403) so other drivers' route IDs can't be probed.
    if (assignment.driverId !== driver.id) {
      throw new NotFoundException('Route not found');
    }

    const daily = await this.dailyRoutePlansService.getDailyRoute(
      routeId,
      date,
    );
    const school = await this.schoolService.findById(assignment.schoolId);
    const company = await this.companyService.findById(route.companyId);

    // Student address + guardian contacts, looked up once per student.
    const stops = await this.routeStopsService.findByRouteId(routeId);
    const addresses = new Map(
      stops.map((s) => [s.studentId, s.student.address]),
    );
    const contacts = new Map<string, GuardianContactDto[]>();
    for (const stop of stops) {
      contacts.set(stop.studentId, await this.findContacts(stop.studentId));
    }

    const toLeg = (leg: DailyRouteLegDto): DriverRouteLegDto => ({
      ...leg,
      stops: leg.stops.map((stop) => ({
        ...stop,
        address: addresses.get(stop.studentId) ?? '',
        contacts: contacts.get(stop.studentId) ?? [],
      })),
    });

    return {
      routeId,
      date,
      isModified: daily.isModified,
      schoolName: school.name,
      school: this.toLatLng(school.latitude, school.longitude),
      company: this.toLatLng(company.latitude, company.longitude),
      pickup: toLeg(daily.pickup),
      dropoff: toLeg(daily.dropoff),
      absentStudents: daily.absentStudents,
    };
  }

  /** Vehicles of the driver's active assignments (usually one). */
  async getMyVehicles(userId: string): Promise<DriverVehicleDto[]> {
    const driver = await this.resolveMyDriver(userId);
    const assignments = await this.assignmentsService.findAll({
      driverId: driver.id,
      status: AssignmentStatus.ACTIVE,
    });

    const vehicleIds = [...new Set(assignments.map((a) => a.vehicleId))];
    const vehicles: DriverVehicleDto[] = [];
    for (const id of vehicleIds) {
      const v = await this.vehiclesService.findById(id);
      vehicles.push({
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        color: v.color,
        year: v.year,
        capacity: v.capacity,
        soatExpirationDate: v.soatExpirationDate,
        technicalInspectionExpirationDate: v.technicalInspectionExpirationDate,
        isPublicService: v.isPublicService,
        bimonthlyInspectionExpirationDate: v.bimonthlyInspectionExpirationDate,
        currentMileage: v.currentMileage,
      });
    }
    return vehicles;
  }

  async getMyPayments(userId: string): Promise<DriverPayment[]> {
    const driver = await this.resolveMyDriver(userId);
    const payments = await this.driverPaymentsService.findAll({
      driverId: driver.id,
    });
    return payments.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveMyDriver(userId: string): Promise<Driver> {
    const driver = await this.driverService.findByUserId(userId);
    if (!driver) {
      throw new ForbiddenException(
        'Tu usuario no tiene un perfil de conductor.',
      );
    }
    return driver;
  }

  private async findContacts(studentId: string): Promise<GuardianContactDto[]> {
    const relations = await this.studentGuardianService.findAll({ studentId });
    const result: GuardianContactDto[] = [];
    for (const relation of relations) {
      const guardian = await this.guardianService.findById(relation.guardianId);
      result.push({
        name: `${guardian.firstName} ${guardian.lastName}`,
        relationshipType: relation.relationshipType,
        phone: guardian.phone,
        isPrimary: relation.isPrimary,
      });
    }
    // Primary guardian first — the one to call when the student isn't out.
    return result.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }

  private toLatLng(lat: number | null, lng: number | null): LatLngDto | null {
    return lat != null && lng != null
      ? { latitude: lat, longitude: lng }
      : null;
  }
}
