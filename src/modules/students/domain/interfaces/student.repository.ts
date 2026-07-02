import { Student } from '../student.entity';
import { StudentStatus } from '../enums/student-status.enum';

export interface StudentFilters {
  companyId?: string;
  schoolId?: string;
  scheduleId?: string;
  status?: StudentStatus;
  grade?: string;
}

export interface IStudentRepository {
  create(data: Partial<Student>): Promise<Student>;
  findAll(filters: StudentFilters): Promise<Student[]>;
  findById(id: string): Promise<Student | null>;
  update(id: string, data: Partial<Student>): Promise<Student>;
  softDelete(id: string): Promise<void>;
}

export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');
