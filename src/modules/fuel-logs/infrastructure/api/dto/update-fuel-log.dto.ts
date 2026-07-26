import { PartialType, PickType } from '@nestjs/swagger';
import { CreateFuelLogDto } from './create-fuel-log.dto';

// vehicleId is intentionally immutable after creation — a fuel log belongs
// to the vehicle it was recorded for, same historical-integrity precedent
// as driverId on DriverPayment.
export class UpdateFuelLogDto extends PartialType(
  PickType(CreateFuelLogDto, [
    'date',
    'amountPaid',
    'gallons',
    'odometer',
    'gasStation',
    'notes',
  ] as const),
) {}
