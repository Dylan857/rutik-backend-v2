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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import {
  assertCompanyAccess,
  resolveCompanyScope,
} from '../../../../../common/utils/company-scope';
import { RouteStopsService } from '../../../application/route-stops.service';
import { RouteStopResponseDto } from '../dto/route-stop-response.dto';

@ApiTags('Route Stops')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('route-stops')
export class RouteStopController {
  constructor(private readonly routeStopsService: RouteStopsService) {}

  @Get()
  @ApiOperation({ summary: 'List route stops with optional filters' })
  @ApiOkResponse({ type: [RouteStopResponseDto] })
  @ApiQuery({
    name: 'schoolRouteId',
    required: false,
    description: 'Filter by school route UUID',
  })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: 'Filter by student UUID',
  })
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('schoolRouteId') schoolRouteId?: string,
    @Query('studentId') studentId?: string,
  ): Promise<RouteStopResponseDto[]> {
    const stops = await this.routeStopsService.findAll({
      companyId: resolveCompanyScope(currentUser),
      schoolRouteId,
      studentId,
    });
    return plainToInstance(RouteStopResponseDto, stops, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a route stop by ID' })
  @ApiOkResponse({ type: RouteStopResponseDto })
  async findById(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RouteStopResponseDto> {
    const stop = await this.routeStopsService.findById(id);
    assertCompanyAccess(currentUser, stop.schoolRoute?.companyId);
    return plainToInstance(RouteStopResponseDto, stop, {
      excludeExtraneousValues: true,
    });
  }
}
