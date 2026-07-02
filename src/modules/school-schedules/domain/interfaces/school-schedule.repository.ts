import { SchoolSchedule } from '../school-schedule.entity';

export interface ScheduleFilters {
  companyId?: string;
  schoolId?: string;
}

export interface ISchoolScheduleRepository {
  create(data: Partial<SchoolSchedule>): Promise<SchoolSchedule>;
  findAll(filters: ScheduleFilters): Promise<SchoolSchedule[]>;
  findById(id: string): Promise<SchoolSchedule | null>;
  findByNameAndSchool(
    name: string,
    schoolId: string,
  ): Promise<SchoolSchedule | null>;
  update(id: string, data: Partial<SchoolSchedule>): Promise<SchoolSchedule>;
  softDelete(id: string): Promise<void>;
}

export const SCHOOL_SCHEDULE_REPOSITORY = Symbol('SCHOOL_SCHEDULE_REPOSITORY');
