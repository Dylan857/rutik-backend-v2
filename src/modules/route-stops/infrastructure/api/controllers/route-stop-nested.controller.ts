import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { resolveCompanyScope } from '../../../../../common/utils/company-scope';
import { RouteStopsService } from '../../../application/route-stops.service';
import { RouteStopResponseDto } from '../dto/route-stop-response.dto';

// Nested resource: GET /school-routes/:routeId/stops
// Registered in RouteStopsModule, not SchoolRoutesModule, because the response
// type and service logic both belong to the route-stops domain.
@ApiTags('School Routes')
@ApiBearerAuth('access-token')
// Admin panel only — the parents' app gets its stop order from
// GET /student-guardians/me; drivers from GET /driver/routes/:id/daily.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
    @CurrentUser() currentUser: JwtPayload,
    @Param('routeId', ParseUUIDPipe) routeId: string,
  ): Promise<RouteStopResponseDto[]> {
    const stops = await this.routeStopsService.findByRouteId(
      routeId,
      resolveCompanyScope(currentUser),
    );
    return plainToInstance(RouteStopResponseDto, stops, {
      excludeExtraneousValues: true,
    });
  }
}
