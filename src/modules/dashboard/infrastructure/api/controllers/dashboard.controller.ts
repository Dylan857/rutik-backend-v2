import {
  BadRequestException,
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { DashboardService } from '../../../application/dashboard.service';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the dashboard summary for the authenticated company',
  })
  @ApiOkResponse({ type: DashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getDashboard(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DashboardResponseDto> {
    if (!currentUser.companyId) {
      throw new BadRequestException('User is not associated with a company');
    }

    const data = await this.dashboardService.getDashboard(
      currentUser.companyId,
    );
    return plainToInstance(DashboardResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }
}
