import { SchoolRoute } from '../school-route.entity';
import { RouteStatus } from '../enums/route-status.enum';

export interface RouteFilters {
  companyId?: string;
  schoolAssignmentId?: string;
  status?: RouteStatus;
}

export interface ISchoolRouteRepository {
  create(data: Partial<SchoolRoute>): Promise<SchoolRoute>;
  findAll(filters: RouteFilters): Promise<SchoolRoute[]>;
  findById(id: string): Promise<SchoolRoute | null>;
  // withDeleted=true is used by syncRoute to locate soft-deleted routes for restoration
  findByAssignmentId(
    assignmentId: string,
    withDeleted?: boolean,
  ): Promise<SchoolRoute | null>;
  update(id: string, data: Partial<SchoolRoute>): Promise<SchoolRoute>;
  restore(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export const SCHOOL_ROUTE_REPOSITORY = Symbol('SCHOOL_ROUTE_REPOSITORY');
