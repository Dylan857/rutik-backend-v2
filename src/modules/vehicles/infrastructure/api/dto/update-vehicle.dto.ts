import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';

// companyId is immutable after creation — ownership cannot be transferred between companies.
export class UpdateVehicleDto extends PartialType(
  OmitType(CreateVehicleDto, ['companyId'] as const),
) {}
