import { Company } from '../company.entity';

export interface ICompanyRepository {
  create(data: Partial<Company>): Promise<Company>;
  findAll(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  findByNit(nit: string): Promise<Company | null>;
  findByEmail(email: string): Promise<Company | null>;
  update(id: string, data: Partial<Company>): Promise<Company>;
  softDelete(id: string): Promise<void>;
}

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');
