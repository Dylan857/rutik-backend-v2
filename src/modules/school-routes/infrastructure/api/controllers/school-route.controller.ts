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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { SchoolRoutesService } from '../../../application/school-routes.service';
import { RouteStatus } from '../../../domain/enums/route-status.enum';
import { UpdateSchoolRouteDto } from '../dto/update-school-route.dto';
import { SchoolRouteResponseDto } from '../dto/school-route-response.dto';

@ApiTags('School Routes')
@Controller('school-routes')
export class SchoolRouteController {
  constructor(private readonly schoolRoutesService: SchoolRoutesService) {}

  // No POST endpoint — routes are created automatically via SchoolAssignmentsService.

  @Get()
  @ApiOperation({
    summary: 'List school routes with optional filters',
    description:
      'Routes are system-generated. Use SchoolAssignment to access school, driver, vehicle, and schedule details.',
  })
  @ApiOkResponse({ type: [SchoolRouteResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'schoolAssignmentId',
    required: false,
    description: 'Filter by school assignment UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RouteStatus,
    description: 'Filter by status',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('schoolAssignmentId') schoolAssignmentId?: string,
    @Query('status') status?: RouteStatus,
  ): Promise<SchoolRouteResponseDto[]> {
    const routes = await this.schoolRoutesService.findAll({
      companyId,
      schoolAssignmentId,
      status,
    });
    return plainToInstance(SchoolRouteResponseDto, routes, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a school route by ID',
    description:
      'Fetch a route by its UUID. Load the linked SchoolAssignment to retrieve school, driver, vehicle, and schedule data.',
  })
  @ApiOkResponse({ type: SchoolRouteResponseDto })
  @ApiNotFoundResponse({ description: 'School route not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SchoolRouteResponseDto> {
    const route = await this.schoolRoutesService.findById(id);
    return plainToInstance(SchoolRouteResponseDto, route, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Manually update a school route status',
    description:
      'Allows operators to manually override the route status. ' +
      'Note: the next syncRoute() call from SchoolAssignments may override this.',
  })
  @ApiOkResponse({ type: SchoolRouteResponseDto })
  @ApiNotFoundResponse({ description: 'School route not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolRouteDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SchoolRouteResponseDto> {
    const route = await this.schoolRoutesService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(SchoolRouteResponseDto, route, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Soft delete a school route',
    description:
      'Soft-deletes the route record. If the linked assignment is later reactivated, ' +
      'syncRoute() will restore this route automatically.',
  })
  @ApiNoContentResponse({ description: 'Route deactivated successfully' })
  @ApiNotFoundResponse({ description: 'School route not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.schoolRoutesService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
