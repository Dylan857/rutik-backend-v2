import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../../domain/school.entity';
import { ISchoolRepository } from '../../domain/interfaces/school.repository';

@Injectable()
export class SchoolRepositoryImpl implements ISchoolRepository {
  constructor(
    @InjectRepository(School)
    private readonly repository: Repository<School>,
  ) {}

  async create(data: Partial<School>): Promise<School> {
    const school = this.repository.create(data);
    return this.repository.save(school);
  }

  async findAll(
    companyId?: string,
  ): Promise<(School & { scheduleCount: number })[]> {
    const qb = this.repository
      .createQueryBuilder('school')
      .leftJoin(
        'school_schedules',
        'ss',
        'ss.school_id = school.id AND ss.deleted_at IS NULL',
      )
      .addSelect('COUNT(ss.id)', 'scheduleCount')
      .groupBy('school.id')
      .orderBy('school.createdAt', 'DESC');

    if (companyId) {
      qb.where('school.companyId = :companyId', { companyId });
    }

    const { entities, raw } = await qb.getRawAndEntities();

    return entities.map((school, index) => ({
      ...school,
      scheduleCount: parseInt(raw[index].scheduleCount, 10) || 0,
    }));
  }

  async findById(
    id: string,
  ): Promise<(School & { scheduleCount: number }) | null> {
    const qb = this.repository
      .createQueryBuilder('school')
      .leftJoin(
        'school_schedules',
        'ss',
        'ss.school_id = school.id AND ss.deleted_at IS NULL',
      )
      .addSelect('COUNT(ss.id)', 'scheduleCount')
      .where('school.id = :id', { id })
      .groupBy('school.id');

    const { entities, raw } = await qb.getRawAndEntities();

    if (!entities.length) return null;

    return {
      ...entities[0],
      scheduleCount: parseInt(raw[0].scheduleCount, 10) || 0,
    };
  }

  async findByNameAndCompany(
    name: string,
    companyId: string,
  ): Promise<School | null> {
    return this.repository.findOne({ where: { name, companyId } });
  }

  async update(id: string, data: Partial<School>): Promise<School> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<School>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
