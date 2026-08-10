import { FuelLog } from '../fuel-log.entity';

export interface FuelLogFilters {
  companyId?: string;
  vehicleId?: string;
  // Inclusive range filter on `date` — YYYY-MM-DD. Meant to back future
  // monthly-spend / historical-statistics queries.
  dateFrom?: string;
  dateTo?: string;
}

export interface IFuelLogRepository {
  create(data: Partial<FuelLog>): Promise<FuelLog>;
  findAll(filters: FuelLogFilters): Promise<FuelLog[]>;
  findById(id: string): Promise<FuelLog | null>;
  update(id: string, data: Partial<FuelLog>): Promise<FuelLog>;
  softDelete(id: string): Promise<void>;
  // Sum of amountPaid for a given billing month/year — backs the dashboard's
  // fuel expense category.
  getTotalAmount(
    companyId: string,
    month: number,
    year: number,
  ): Promise<number>;
}

export const FUEL_LOG_REPOSITORY = Symbol('FUEL_LOG_REPOSITORY');
