import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMaintenanceDto } from './create-maintenance.dto';

// vehicleId is immutable after creation, same convention as UpdateFuelLogDto.
export class UpdateMaintenanceDto extends PartialType(
  OmitType(CreateMaintenanceDto, ['vehicleId'] as const),
) {}
