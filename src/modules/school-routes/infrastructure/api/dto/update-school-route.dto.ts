import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RouteStatus } from '../../../domain/enums/route-status.enum';

// Only status is manually updatable. companyId and schoolAssignmentId are
// immutable — the route is permanently tied to its originating assignment.
export class UpdateSchoolRouteDto {
  @ApiPropertyOptional({
    enum: RouteStatus,
    description: 'Manually override the route status',
  })
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;
}
