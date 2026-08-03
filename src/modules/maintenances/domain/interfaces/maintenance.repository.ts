import { Maintenance } from '../maintenance.entity';

export interface MaintenanceFilters {
  companyId?: string;
  vehicleId?: string;
  month?: number;
  year?: number;
  // ILIKE across vehicle plate/brand/model and workshop/description.
  search?: string;
}

export interface MaintenanceSummaryTotals {
  totalInvested: number;
  count: number;
}

export interface IMaintenanceRepository {
  create(data: Partial<Maintenance>): Promise<Maintenance>;
  // Both findAll and findById return records with `vehicle` populated —
  // needed for status computation and the table's flattened vehicle columns.
  findAll(filters: MaintenanceFilters): Promise<Maintenance[]>;
  findById(id: string): Promise<Maintenance | null>;
  update(id: string, data: Partial<Maintenance>): Promise<Maintenance>;
  softDelete(id: string): Promise<void>;
  getSummaryTotals(
    companyId: string,
    month: number,
    year: number,
  ): Promise<MaintenanceSummaryTotals>;
  countVehiclesWithUpcomingMaintenance(companyId: string): Promise<number>;
}

export const MAINTENANCE_REPOSITORY = Symbol('MAINTENANCE_REPOSITORY');
