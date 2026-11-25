import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { TripsService } from '../../../application/trips.service';
import {
  RecordLocationsDto,
  ResolveStopDto,
  StartTripDto,
  TripDto,
} from '../dto/trip.dto';

// Live route runs from the driver's app. Shares the /driver prefix with
// DriverAppController (read-only views); this one owns the trip lifecycle.
@ApiTags('Driver App · Trips')
@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Not a driver' })
export class DriverTripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('routes/:routeId/trips')
  @ApiOperation({
    summary:
      '"Iniciar ruta": start today\'s ida or regreso of one of my routes',
    description:
      "Notifies the route's guardians and the admin. Calling it again for the " +
      'same route and leg returns the trip already in progress.',
  })
  @ApiCreatedResponse({ type: TripDto })
  @ApiNotFoundResponse({ description: 'Route not found (or not mine)' })
  @ApiConflictResponse({ description: 'Another trip is already in progress' })
  start(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Body() dto: StartTripDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TripDto> {
    return this.tripsService.start(currentUser.sub, routeId, dto.leg);
  }

  @Get('trips/active')
  @ApiOperation({
    summary: 'My trip in progress, if any',
    description:
      'Lets the app resume tracking after a restart. data is null when there is none.',
  })
  @ApiOkResponse({ type: TripDto })
  getActive(@CurrentUser() currentUser: JwtPayload): Promise<TripDto | null> {
    return this.tripsService.getActiveForDriver(currentUser.sub);
  }

  @Post('trips/:tripId/locations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report GPS points (every ~5 s, batched when offline)',
    description:
      'Updates the live position, ETAs and sends the "el bus está cerca" push ' +
      'when a stop is ≤ 5 min (or ≤ 500 m) away.',
  })
  @ApiOkResponse({ description: '{ accepted: number }' })
  recordLocations(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: RecordLocationsDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<{ accepted: number }> {
    return this.tripsService.recordLocations(
      currentUser.sub,
      tripId,
      dto.points,
    );
  }

  @Post('trips/:tripId/stops/:tripStopId/arrived')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'The bus stopped at this stop (detected by the app)',
  })
  @ApiOkResponse({ type: TripDto })
  arrived(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('tripStopId', ParseUUIDPipe) tripStopId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TripDto> {
    return this.tripsService.markArrived(currentUser.sub, tripId, tripStopId);
  }

  @Post('trips/:tripId/stops/:tripStopId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Answer "¿Recogió/Entregó a X?"',
    description:
      'DONE = Sí, NOT_DONE = No (also alerts the guardian and the admin).',
  })
  @ApiOkResponse({ type: TripDto })
  resolve(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('tripStopId', ParseUUIDPipe) tripStopId: string,
    @Body() dto: ResolveStopDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TripDto> {
    return this.tripsService.resolveStop(
      currentUser.sub,
      tripId,
      tripStopId,
      dto.outcome,
    );
  }

  @Post('trips/:tripId/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '"Finalizar ruta"' })
  @ApiOkResponse({ type: TripDto })
  finish(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<TripDto> {
    return this.tripsService.finish(currentUser.sub, tripId);
  }
}
