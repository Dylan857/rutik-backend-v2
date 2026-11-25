import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { resolveCompanyScope } from '../../../../../common/utils/company-scope';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { TripsService } from '../../../application/trips.service';
import { GuardianLiveTripDto, TripDetailDto, TripDto } from '../dto/trip.dto';

class LiveTripQueryDto {
  @IsUUID()
  studentId: string;
}

class ActiveTripsQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

@ApiTags('Trips (live tracking)')
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // Declared before :tripId so "live"/"active" aren't parsed as UUIDs.
  @Get('live')
  @Roles(UserRole.GUARDIAN)
  @ApiOperation({
    summary: "Live view of my child's trip in progress",
    description:
      'Bus position, polyline, my stop with its ETA, the stop the bus is heading ' +
      'to and the ETA to school. data is null when no trip is running.',
  })
  @ApiQuery({ name: 'studentId', required: true })
  @ApiOkResponse({ type: GuardianLiveTripDto })
  getLive(
    @Query() query: LiveTripQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GuardianLiveTripDto | null> {
    return this.tripsService.getLiveForGuardian(
      currentUser.sub,
      query.studentId,
    );
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Trips in progress right now (admin live map)' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'SUPER_ADMIN only',
  })
  @ApiOkResponse({ type: [TripDto] })
  listActive(
    @Query() query: ActiveTripsQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TripDto[]> {
    return this.tripsService.listActive(
      resolveCompanyScope(currentUser, query.companyId),
    );
  }

  @Get(':tripId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'One trip with its stops and breadcrumb trail' })
  @ApiOkResponse({ type: TripDetailDto })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  getDetail(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TripDetailDto> {
    return this.tripsService.getDetail(currentUser, tripId);
  }
}
