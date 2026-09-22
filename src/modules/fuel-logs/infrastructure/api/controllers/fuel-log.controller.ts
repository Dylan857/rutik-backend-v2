import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
  assertCompanyAccess,
  resolveCompanyScope,
} from '../../../../../common/utils/company-scope';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { FuelLogsService } from '../../../application/fuel-logs.service';
import { CreateFuelLogDto } from '../dto/create-fuel-log.dto';
import { UpdateFuelLogDto } from '../dto/update-fuel-log.dto';
import { FuelLogResponseDto } from '../dto/fuel-log-response.dto';

@ApiTags('Fuel Logs')
@Controller('fuel-logs')
export class FuelLogController {
  constructor(private readonly fuelLogsService: FuelLogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a fuel-up for a vehicle',
    description:
      'Records that a vehicle was fueled. companyId is derived from the ' +
      "vehicle automatically. This is a historical record — it doesn't " +
      'compute statistics itself, it is the raw data future consumption/' +
      'performance indicators will be built from.',
  })
  @ApiCreatedResponse({ type: FuelLogResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({
    description: 'Fuel log date cannot be in the future',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateFuelLogDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FuelLogResponseDto> {
    const fuelLog = await this.fuelLogsService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(FuelLogResponseDto, fuelLog, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List fuel logs with optional filters' })
  @ApiOkResponse({ type: [FuelLogResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle UUID',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Inclusive start of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Inclusive end of date range (YYYY-MM-DD)',
  })
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<FuelLogResponseDto[]> {
    const fuelLogs = await this.fuelLogsService.findAll({
      companyId: resolveCompanyScope(currentUser, companyId),
      vehicleId,
      dateFrom,
      dateTo,
    });
    return plainToInstance(FuelLogResponseDto, fuelLogs, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a fuel log by ID' })
  @ApiOkResponse({ type: FuelLogResponseDto })
  @ApiNotFoundResponse({ description: 'Fuel log not found' })
  async findById(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FuelLogResponseDto> {
    const fuelLog = await this.fuelLogsService.findById(id);
    assertCompanyAccess(currentUser, fuelLog.companyId);
    return plainToInstance(FuelLogResponseDto, fuelLog, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a fuel log',
    description: 'Updates fuel log fields. vehicleId is immutable.',
  })
  @ApiOkResponse({ type: FuelLogResponseDto })
  @ApiNotFoundResponse({ description: 'Fuel log not found' })
  @ApiBadRequestResponse({
    description: 'Fuel log date cannot be in the future',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFuelLogDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<FuelLogResponseDto> {
    const fuelLog = await this.fuelLogsService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(FuelLogResponseDto, fuelLog, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a fuel log' })
  @ApiNoContentResponse({ description: 'Fuel log deleted successfully' })
  @ApiNotFoundResponse({ description: 'Fuel log not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.fuelLogsService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
