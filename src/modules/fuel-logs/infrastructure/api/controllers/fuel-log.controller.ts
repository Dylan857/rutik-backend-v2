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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
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
  async create(@Body() dto: CreateFuelLogDto): Promise<FuelLogResponseDto> {
    const fuelLog = await this.fuelLogsService.create(dto);
    return plainToInstance(FuelLogResponseDto, fuelLog, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
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
    @Query('companyId') companyId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<FuelLogResponseDto[]> {
    const fuelLogs = await this.fuelLogsService.findAll({
      companyId,
      vehicleId,
      dateFrom,
      dateTo,
    });
    return plainToInstance(FuelLogResponseDto, fuelLogs, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fuel log by ID' })
  @ApiOkResponse({ type: FuelLogResponseDto })
  @ApiNotFoundResponse({ description: 'Fuel log not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FuelLogResponseDto> {
    const fuelLog = await this.fuelLogsService.findById(id);
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFuelLogDto,
  ): Promise<FuelLogResponseDto> {
    const fuelLog = await this.fuelLogsService.update(id, dto);
    return plainToInstance(FuelLogResponseDto, fuelLog, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a fuel log' })
  @ApiNoContentResponse({ description: 'Fuel log deleted successfully' })
  @ApiNotFoundResponse({ description: 'Fuel log not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.fuelLogsService.softDelete(id);
  }
}
