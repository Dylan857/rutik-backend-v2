import { SchoolAssignment } from '../school-assignment.entity';
import { AssignmentStatus } from '../enums/assignment-status.enum';

export interface AssignmentFilters {
  companyId?: string;
  schoolId?: string;
  scheduleId?: string;
  driverId?: string;
  vehicleId?: string;
  status?: AssignmentStatus;
}

export interface ISchoolAssignmentRepository {
  create(data: Partial<SchoolAssignment>): Promise<SchoolAssignment>;
  findAll(filters: AssignmentFilters): Promise<SchoolAssignment[]>;
  findById(id: string): Promise<SchoolAssignment | null>;

  // Uniqueness guard — returns the conflicting active record (if any)
  findActiveBySchoolAndSchedule(
    schoolId: string,
    scheduleId: string,
    excludeId?: string,
  ): Promise<SchoolAssignment | null>;

  update(
    id: string,
    data: Partial<SchoolAssignment>,
  ): Promise<SchoolAssignment>;
  softDelete(id: string): Promise<void>;
}

export const SCHOOL_ASSIGNMENT_REPOSITORY = Symbol(
  'SCHOOL_ASSIGNMENT_REPOSITORY',
);
