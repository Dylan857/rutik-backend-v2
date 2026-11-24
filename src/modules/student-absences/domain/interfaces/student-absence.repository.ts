import { StudentAbsence } from '../student-absence.entity';
import { AbsenceStatus } from '../enums/absence-status.enum';

export interface StudentAbsenceFilters {
  companyId?: string;
  studentIds?: string[];
  date?: string;
  // Inclusive lower bound on `date` (YYYY-MM-DD).
  fromDate?: string;
  status?: AbsenceStatus;
}

export interface IStudentAbsenceRepository {
  create(data: Partial<StudentAbsence>): Promise<StudentAbsence>;
  findAll(filters: StudentAbsenceFilters): Promise<StudentAbsence[]>;
  findById(id: string): Promise<StudentAbsence | null>;
  findActive(studentId: string, date: string): Promise<StudentAbsence | null>;
  update(id: string, data: Partial<StudentAbsence>): Promise<StudentAbsence>;
}

export const STUDENT_ABSENCE_REPOSITORY = Symbol('STUDENT_ABSENCE_REPOSITORY');
