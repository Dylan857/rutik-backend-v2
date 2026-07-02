import { Guardian } from '../guardian.entity';
import { GuardianStatus } from '../enums/guardian-status.enum';

export interface GuardianFilters {
  companyId?: string;
  status?: GuardianStatus;
  document?: string;
  email?: string;
}

export interface IGuardianRepository {
  create(data: Partial<Guardian>): Promise<Guardian>;
  findAll(filters: GuardianFilters): Promise<Guardian[]>;
  findById(id: string): Promise<Guardian | null>;
  findByDocumentAndCompany(
    document: string,
    companyId: string,
  ): Promise<Guardian | null>;
  findByEmailAndCompany(
    email: string,
    companyId: string,
  ): Promise<Guardian | null>;
  findByUserId(userId: string): Promise<Guardian | null>;
  update(id: string, data: Partial<Guardian>): Promise<Guardian>;
  softDelete(id: string): Promise<void>;
}

export const GUARDIAN_REPOSITORY = Symbol('GUARDIAN_REPOSITORY');
