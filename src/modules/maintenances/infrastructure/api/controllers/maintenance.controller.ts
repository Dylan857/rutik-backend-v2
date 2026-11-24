import {
  BadRequestException,
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
import { MaintenancesService } from '../../../application/maintenances.service';
import { CreateMaintenanceDto } from '../dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from '../dto/update-maintenance.dto';
import { MaintenanceResponseDto } from '../dto/maintenance-response.dto';
import { MaintenanceSummaryResponseDto } from '../dto/maintenance-summary-response.dto';

@ApiTags('Maintenances')
@Controller('maintenances')
export class MaintenanceController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a maintenance for a vehicle',
    description:
      'Records that a maintenance was performed on a vehicle. companyId is ' +
      'derived from the vehicle automatically. If mileage exceeds the ' +
      "vehicle's currentMileage, the vehicle record is updated to match.",
  })
  @ApiCreatedResponse({ type: MaintenanceResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  @ApiBadRequestResponse({
    description:
      'Maintenance date cannot be in the future, or next maintenance ' +
      'date/mileage is not coherent with the current record',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<MaintenanceResponseDto> {
    const maintenance = await this.maintenancesService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(MaintenanceResponseDto, maintenance, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List maintenances with optional filters' })
  @ApiOkResponse({ type: [MaintenanceResponseDto] })
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
    name: 'month',
    required: false,
    description: 'Filter by month (1-12)',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Filter by year',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search across vehicle plate/brand/model, workshop and description',
  })
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('search') search?: string,
  ): Promise<MaintenanceResponseDto[]> {
    const maintenances = await this.maintenancesService.findAll({
      companyId: resolveCompanyScope(currentUser, companyId),
      vehicleId,
      month: month !== undefined ? Number(month) : undefined,
      year: year !== undefined ? Number(year) : undefined,
      search,
    });
    return plainToInstance(MaintenanceResponseDto, maintenances, {
      excludeExtraneousValues: true,
    });
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get maintenance dashboard summary cards for a billing period',
  })
  @ApiOkResponse({ type: MaintenanceSummaryResponseDto })
  @ApiQuery({ name: 'companyId', required: true, description: 'Company UUID' })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Month (1-12), defaults to current month',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Year, defaults to current year',
  })
  async getSummary(
    @CurrentUser() currentUser: JwtPayload,
    @Query('companyId') companyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<MaintenanceSummaryResponseDto> {
    const scopedCompanyId = resolveCompanyScope(currentUser, companyId);
    if (!scopedCompanyId) {
      throw new BadRequestException('companyId is required');
    }

    const summary = await this.maintenancesService.getSummary(
      scopedCompanyId,
      month !== undefined ? Number(month) : undefined,
      year !== undefined ? Number(year) : undefined,
    );
    return plainToInstance(MaintenanceSummaryResponseDto, summary, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a maintenance by ID' })
  @ApiOkResponse({ type: MaintenanceResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance not found' })
  async findById(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceResponseDto> {
    const maintenance = await this.maintenancesService.findById(id);
    assertCompanyAccess(currentUser, maintenance.companyId);
    return plainToInstance(MaintenanceResponseDto, maintenance, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a maintenance',
    description: 'Updates maintenance fields. vehicleId is immutable.',
  })
  @ApiOkResponse({ type: MaintenanceResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance not found' })
  @ApiBadRequestResponse({
    description:
      'Maintenance date cannot be in the future, or next maintenance ' +
      'date/mileage is not coherent with the current record',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<MaintenanceResponseDto> {
    const maintenance = await this.maintenancesService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(MaintenanceResponseDto, maintenance, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a maintenance' })
  @ApiNoContentResponse({ description: 'Maintenance deleted successfully' })
  @ApiNotFoundResponse({ description: 'Maintenance not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.maintenancesService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
