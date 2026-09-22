import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { StudentGuardian } from '../../domain/student-guardian.entity';
import {
  IStudentGuardianRepository,
  StudentGuardianFilters,
} from '../../domain/interfaces/student-guardian.repository';

@Injectable()
export class StudentGuardianRepositoryImpl implements IStudentGuardianRepository {
  constructor(
    @InjectRepository(StudentGuardian)
    private readonly repository: Repository<StudentGuardian>,
  ) {}

  async create(data: Partial<StudentGuardian>): Promise<StudentGuardian> {
    const relation = this.repository.create(data);
    return this.repository.save(relation);
  }

  async findAll(filters: StudentGuardianFilters): Promise<StudentGuardian[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.student = { companyId: filters.companyId };
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.guardianId) where.guardianId = filters.guardianId;
    if (filters.relationshipType)
      where.relationshipType = filters.relationshipType;
    if (filters.isPrimary !== undefined) where.isPrimary = filters.isPrimary;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<StudentGuardian | null> {
    return this.repository.findOne({
      where: { id },
      relations: { student: true },
    });
  }

  async findByStudentAndGuardian(
    studentId: string,
    guardianId: string,
  ): Promise<StudentGuardian | null> {
    return this.repository.findOne({ where: { studentId, guardianId } });
  }

  async clearPrimaryForStudent(
    studentId: string,
    excludeId?: string,
  ): Promise<void> {
    await this.repository.update(
      {
        studentId,
        isPrimary: true,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      { isPrimary: false },
    );
  }

  async update(
    id: string,
    data: Partial<StudentGuardian>,
  ): Promise<StudentGuardian> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<StudentGuardian>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
