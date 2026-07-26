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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { VehiclesService } from '../../../application/vehicles.service';
import { VehicleDetailService } from '../../../application/vehicle-detail.service';
import { VehicleStatus } from '../../../domain/enums/vehicle-status.enum';
import { VehicleType } from '../../../domain/enums/vehicle-type.enum';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { VehicleDetailResponseDto } from '../dto/vehicle-detail-response.dto';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleDetailService: VehicleDetailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new vehicle',
    description:
      'Creates a vehicle and associates it with an existing company.',
  })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiBadRequestResponse({
    description: 'Year exceeds limit or document dates are not future dates',
  })
  @ApiConflictResponse({
    description: 'Plate already registered in this company',
  })
  async create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesService.create(dto);
    return plainToInstance(VehicleResponseDto, vehicle, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List vehicles with optional filters' })
  @ApiOkResponse({ type: [VehicleResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'plate',
    required: false,
    description: 'Filter by plate (partial, case-insensitive)',
  })
  @ApiQuery({
    name: 'vehicleType',
    required: false,
    enum: VehicleType,
    description: 'Filter by vehicle type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: VehicleStatus,
    description: 'Filter by status',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('plate') plate?: string,
    @Query('vehicleType') vehicleType?: VehicleType,
    @Query('status') status?: VehicleStatus,
  ): Promise<VehicleResponseDto[]> {
    const vehicles = await this.vehiclesService.findAll({
      companyId,
      plate,
      vehicleType,
      status,
    });
    return plainToInstance(VehicleResponseDto, vehicles, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a vehicle by ID with its full detail',
    description:
      'Returns the vehicle plus, in the same call, its fuel spend for a ' +
      'period (defaults to the current month), its active routes, and the ' +
      'students currently assigned to those routes.',
  })
  @ApiOkResponse({ type: VehicleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({ description: 'month/year out of range' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Fuel period month (1-12). Defaults to the current month.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Fuel period year. Defaults to the current year.',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<VehicleDetailResponseDto> {
    const detail = await this.vehicleDetailService.getDetail(
      id,
      month !== undefined ? Number(month) : undefined,
      year !== undefined ? Number(year) : undefined,
    );

    return plainToInstance(
      VehicleDetailResponseDto,
      {
        ...detail.vehicle,
        fuel: detail.fuel,
        activeRoutes: detail.activeRoutes,
        assignedStudents: detail.assignedStudents,
      },
      { excludeExtraneousValues: true },
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a vehicle',
    description:
      'Updates vehicle fields. companyId is immutable after creation.',
  })
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({
    description: 'Year exceeds limit or document dates are not future dates',
  })
  @ApiConflictResponse({
    description: 'Plate already registered in this company',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesService.update(id, dto);
    return plainToInstance(VehicleResponseDto, vehicle, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a vehicle' })
  @ApiNoContentResponse({ description: 'Vehicle deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.vehiclesService.softDelete(id);
  }
}
