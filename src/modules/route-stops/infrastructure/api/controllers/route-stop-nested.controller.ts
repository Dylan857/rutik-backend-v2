import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { RouteStopsService } from '../../../application/route-stops.service';
import { RouteStopResponseDto } from '../dto/route-stop-response.dto';

// Nested resource: GET /school-routes/:routeId/stops
// Registered in RouteStopsModule, not SchoolRoutesModule, because the response
// type and service logic both belong to the route-stops domain.
@ApiTags('School Routes')
@Controller('school-routes')
export class RouteStopNestedController {
  constructor(private readonly routeStopsService: RouteStopsService) {}

  @Get(':routeId/stops')
  @ApiOperation({
    summary: 'List all stops for a specific school route',
    description: 'Returns stops ordered by stop_order ascending.',
  })
  @ApiOkResponse({ type: [RouteStopResponseDto] })
  @ApiNotFoundResponse({ description: 'School route not found' })
  async findByRoute(
    @Param('routeId', ParseUUIDPipe) routeId: string,
  ): Promise<RouteStopResponseDto[]> {
    const stops = await this.routeStopsService.findByRouteId(routeId);
    return plainToInstance(RouteStopResponseDto, stops, {
      excludeExtraneousValues: true,
    });
  }
}
