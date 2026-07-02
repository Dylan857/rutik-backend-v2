import { Vehicle } from '../vehicle.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { VehicleType } from '../enums/vehicle-type.enum';

export interface VehicleFilters {
  companyId?: string;
  plate?: string;
  vehicleType?: VehicleType;
  status?: VehicleStatus;
}

export interface IVehicleRepository {
  create(data: Partial<Vehicle>): Promise<Vehicle>;
  findAll(filters: VehicleFilters): Promise<Vehicle[]>;
  findById(id: string): Promise<Vehicle | null>;
  findByPlateAndCompany(
    plate: string,
    companyId: string,
  ): Promise<Vehicle | null>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
  softDelete(id: string): Promise<void>;
}

export const VEHICLE_REPOSITORY = Symbol('VEHICLE_REPOSITORY');
