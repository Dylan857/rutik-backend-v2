import { FuelLog } from '../../../fuel-logs/domain/fuel-log.entity';
import { RouteStatus } from '../../../school-routes/domain/enums/route-status.enum';
import { TripType } from '../../../students/domain/enums/trip-type.enum';

export interface FuelSummaryTotals {
  logs: FuelLog[];
  totalAmountPaid: number;
  totalGallons: number;
  logsCount: number;
}

export interface ActiveRouteWithContext {
  id: string;
  status: RouteStatus;
  schoolAssignmentId: string;
  schoolId: string;
  schoolName: string;
  scheduleId: string;
  scheduleName: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  distanceMetersReturn: number | null;
  durationSecondsReturn: number | null;
}

export interface AssignedStudentWithContext {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  tripType: TripType;
  schoolRouteId: string;
}

export interface IVehicleDetailRepository {
  // dateFrom/dateTo are inclusive YYYY-MM-DD bounds of the requested period.
  getFuelSummary(
    vehicleId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<FuelSummaryTotals>;

  getActiveRoutes(vehicleId: string): Promise<ActiveRouteWithContext[]>;

  getAssignedStudents(
    routeIds: string[],
  ): Promise<AssignedStudentWithContext[]>;
}

export const VEHICLE_DETAIL_REPOSITORY = Symbol('VEHICLE_DETAIL_REPOSITORY');
