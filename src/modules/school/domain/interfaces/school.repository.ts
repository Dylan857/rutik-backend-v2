import { School } from '../school.entity';

export interface ISchoolRepository {
  create(data: Partial<School>): Promise<School>;
  findAll(companyId?: string): Promise<(School & { scheduleCount: number })[]>;
  findById(id: string): Promise<(School & { scheduleCount: number }) | null>;
  findByNameAndCompany(name: string, companyId: string): Promise<School | null>;
  update(id: string, data: Partial<School>): Promise<School>;
  softDelete(id: string): Promise<void>;
}

export const SCHOOL_REPOSITORY = Symbol('SCHOOL_REPOSITORY');
