import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { RouteStopsService } from '../../../application/route-stops.service';
import { RouteStopResponseDto } from '../dto/route-stop-response.dto';

@ApiTags('Route Stops')
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
    @Query('schoolRouteId') schoolRouteId?: string,
    @Query('studentId') studentId?: string,
  ): Promise<RouteStopResponseDto[]> {
    const stops = await this.routeStopsService.findAll({
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
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RouteStopResponseDto> {
    const stop = await this.routeStopsService.findById(id);
    return plainToInstance(RouteStopResponseDto, stop, {
      excludeExtraneousValues: true,
    });
  }
}
