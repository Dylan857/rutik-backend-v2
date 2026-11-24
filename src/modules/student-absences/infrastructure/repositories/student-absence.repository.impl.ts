import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, MoreThanOrEqual, Repository } from 'typeorm';
import { StudentAbsence } from '../../domain/student-absence.entity';
import { AbsenceStatus } from '../../domain/enums/absence-status.enum';
import {
  IStudentAbsenceRepository,
  StudentAbsenceFilters,
} from '../../domain/interfaces/student-absence.repository';

@Injectable()
export class StudentAbsenceRepositoryImpl implements IStudentAbsenceRepository {
  constructor(
    @InjectRepository(StudentAbsence)
    private readonly repository: Repository<StudentAbsence>,
  ) {}

  async create(data: Partial<StudentAbsence>): Promise<StudentAbsence> {
    const absence = this.repository.create(data);
    return this.repository.save(absence);
  }

  async findAll(filters: StudentAbsenceFilters): Promise<StudentAbsence[]> {
    if (filters.studentIds && filters.studentIds.length === 0) return [];

    const where: FindOptionsWhere<StudentAbsence> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.studentIds) where.studentId = In(filters.studentIds);
    if (filters.date) where.date = filters.date;
    else if (filters.fromDate) where.date = MoreThanOrEqual(filters.fromDate);
    if (filters.status) where.status = filters.status;

    return this.repository.find({
      where,
      relations: { student: true },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<StudentAbsence | null> {
    return this.repository.findOne({
      where: { id },
      relations: { student: true },
    });
  }

  async findActive(
    studentId: string,
    date: string,
  ): Promise<StudentAbsence | null> {
    return this.repository.findOne({
      where: { studentId, date, status: AbsenceStatus.ACTIVE },
      relations: { student: true },
    });
  }

  async update(
    id: string,
    data: Partial<StudentAbsence>,
  ): Promise<StudentAbsence> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<StudentAbsence>;
  }
}
