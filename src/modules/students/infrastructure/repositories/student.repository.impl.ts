import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../domain/student.entity';
import {
  IStudentRepository,
  StudentFilters,
} from '../../domain/interfaces/student.repository';

@Injectable()
export class StudentRepositoryImpl implements IStudentRepository {
  constructor(
    @InjectRepository(Student)
    private readonly repository: Repository<Student>,
  ) {}

  async create(data: Partial<Student>): Promise<Student> {
    const student = this.repository.create(data);
    return this.repository.save(student);
  }

  async findAll(filters: StudentFilters): Promise<Student[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.schoolId) where.schoolId = filters.schoolId;
    if (filters.scheduleId) where.scheduleId = filters.scheduleId;
    if (filters.status) where.status = filters.status;
    if (filters.grade) where.grade = filters.grade;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Student | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<Student>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
