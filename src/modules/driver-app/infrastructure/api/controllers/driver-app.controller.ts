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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { DriverPaymentResponseDto } from '../../../../driver-payments/infrastructure/api/dto/driver-payment-response.dto';
import { DriverAppService } from '../../../application/driver-app.service';
import {
  DriverDailyRouteDto,
  DriverRouteSummaryDto,
  DriverVehicleDto,
} from '../dto/driver-app.dto';

class DateQueryDto {
  @IsDateString()
  @IsOptional()
  date?: string;
}

// The drivers' mobile app. A separate /driver prefix (not /drivers/me) so it
// never collides with the admin DriverController's /drivers/:id.
@ApiTags('Driver App')
@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Not a driver' })
export class DriverAppController {
  constructor(private readonly service: DriverAppService) {}

  @Get('routes')
  @ApiOperation({
    summary: "The caller's routes for a day, with that day's head count",
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: "Defaults to today (company's timezone)",
  })
  @ApiOkResponse({ type: [DriverRouteSummaryDto] })
  async getRoutes(
    @Query() query: DateQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverRouteSummaryDto[]> {
    const date = await this.service.resolveDate(currentUser.sub, query.date);
    return this.service.getMyRoutes(currentUser.sub, date);
  }

  @Get('routes/:routeId/daily')
  @ApiOperation({
    summary: "One of the caller's routes as planned for a day",
    description:
      'Stops in visiting order per leg (absent students removed), each with the ' +
      "student's address and guardian contacts, plus the polyline and map endpoints.",
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: "Defaults to today (company's timezone)",
  })
  @ApiOkResponse({ type: DriverDailyRouteDto })
  @ApiNotFoundResponse({
    description: 'Route not found or not assigned to the caller',
  })
  async getDailyRoute(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Query() query: DateQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverDailyRouteDto> {
    const date = await this.service.resolveDate(currentUser.sub, query.date);
    return this.service.getMyDailyRoute(currentUser.sub, routeId, date);
  }

  @Get('vehicles')
  @ApiOperation({
    summary:
      "Vehicles of the caller's active assignments, with document expirations",
  })
  @ApiOkResponse({ type: [DriverVehicleDto] })
  async getVehicles(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverVehicleDto[]> {
    return this.service.getMyVehicles(currentUser.sub);
  }

  @Get('payments')
  @ApiOperation({
    summary: "The caller's payroll records, newest period first",
  })
  @ApiOkResponse({ type: [DriverPaymentResponseDto] })
  async getPayments(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverPaymentResponseDto[]> {
    const payments = await this.service.getMyPayments(currentUser.sub);
    return plainToInstance(DriverPaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }
}
