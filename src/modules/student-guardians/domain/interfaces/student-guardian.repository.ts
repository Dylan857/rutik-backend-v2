import { StudentGuardian } from '../student-guardian.entity';
import { RelationshipType } from '../enums/relationship-type.enum';

export interface StudentGuardianFilters {
  // Relations carry no companyId of their own — filtered through the student.
  companyId?: string;
  studentId?: string;
  guardianId?: string;
  relationshipType?: RelationshipType;
  isPrimary?: boolean;
}

export interface IStudentGuardianRepository {
  create(data: Partial<StudentGuardian>): Promise<StudentGuardian>;
  findAll(filters: StudentGuardianFilters): Promise<StudentGuardian[]>;
  // Loads the `student` relation so callers can check tenant ownership.
  findById(id: string): Promise<StudentGuardian | null>;
  findByStudentAndGuardian(
    studentId: string,
    guardianId: string,
  ): Promise<StudentGuardian | null>;
  /** Unsets isPrimary on all active relations for a student, optionally skipping one record. */
  clearPrimaryForStudent(studentId: string, excludeId?: string): Promise<void>;
  update(id: string, data: Partial<StudentGuardian>): Promise<StudentGuardian>;
  softDelete(id: string): Promise<void>;
}

export const STUDENT_GUARDIAN_REPOSITORY = Symbol(
  'STUDENT_GUARDIAN_REPOSITORY',
);
