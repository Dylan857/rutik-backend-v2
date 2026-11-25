import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { SchoolRoutesService } from '../../../../school-routes/application/school-routes.service';
import { DailyRoutePlansService } from '../../../application/daily-route-plans.service';
import { DailyRouteResponseDto } from '../dto/daily-route-response.dto';

class DailyRouteQueryDto {
  @IsDateString()
  date: string;
}

// GET /school-routes/:routeId/daily — registered in RouteStopsModule (like
// RouteStopNestedController) because the plan is built from route stops.
@ApiTags('School Routes')
@Controller('school-routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class DailyRouteController {
  constructor(
    private readonly dailyRoutePlansService: DailyRoutePlansService,
    private readonly schoolRoutesService: SchoolRoutesService,
  ) {}

  @Get(':routeId/daily')
  // Drivers read their own routes' daily plan through GET /driver/routes/:id/daily.
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "A route's plan for one day",
    description:
      'The base route minus the students whose guardians reported they will not ride that ' +
      'day (per leg), re-ordered. Identical to the base route when nobody is absent.',
  })
  @ApiQuery({ name: 'date', required: true, example: '2026-11-25' })
  @ApiOkResponse({ type: DailyRouteResponseDto })
  @ApiNotFoundResponse({ description: 'School route not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getDaily(
    @Param('routeId', ParseUUIDPipe) routeId: string,
    @Query() query: DailyRouteQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DailyRouteResponseDto> {
    const route = await this.schoolRoutesService.findById(routeId);
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.companyId !== route.companyId
    ) {
      throw new ForbiddenException('This route belongs to another company');
    }

    return this.dailyRoutePlansService.getDailyRoute(
      routeId,
      query.date.slice(0, 10),
    );
  }
}
