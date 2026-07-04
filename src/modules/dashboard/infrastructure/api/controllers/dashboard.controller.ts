import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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
    description:
      'billingMonth/billingYear are optional and, when both are provided, ' +
      'only change revenueSummary.collected to reflect that period instead ' +
      'of the current one — every other value in the dashboard (including ' +
      'expected/remaining/collectionPercentage) still reflects the current ' +
      'billing period, exactly as when the filter is omitted.',
  })
  @ApiQuery({
    name: 'billingMonth',
    required: false,
    description:
      'Billing month (1-12) to compute revenueSummary.collected for. Must be provided together with billingYear.',
  })
  @ApiQuery({
    name: 'billingYear',
    required: false,
    description:
      'Billing year to compute revenueSummary.collected for. Must be provided together with billingMonth.',
  })
  @ApiOkResponse({ type: DashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getDashboard(
    @CurrentUser() currentUser: JwtPayload,
    @Query('billingMonth') billingMonth?: string,
    @Query('billingYear') billingYear?: string,
  ): Promise<DashboardResponseDto> {
    if (!currentUser.companyId) {
      throw new BadRequestException('User is not associated with a company');
    }

    if ((billingMonth === undefined) !== (billingYear === undefined)) {
      throw new BadRequestException(
        'billingMonth and billingYear must be provided together',
      );
    }

    let collectedBillingMonth: number | undefined;
    let collectedBillingYear: number | undefined;

    if (billingMonth !== undefined && billingYear !== undefined) {
      collectedBillingMonth = parseInt(billingMonth, 10);
      collectedBillingYear = parseInt(billingYear, 10);

      if (
        !Number.isInteger(collectedBillingMonth) ||
        collectedBillingMonth < 1 ||
        collectedBillingMonth > 12
      ) {
        throw new BadRequestException('billingMonth must be between 1 and 12');
      }
      if (!Number.isInteger(collectedBillingYear)) {
        throw new BadRequestException('billingYear must be a valid year');
      }
    }

    const data = await this.dashboardService.getDashboard(
      currentUser.companyId,
      collectedBillingMonth,
      collectedBillingYear,
    );
    return plainToInstance(DashboardResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }
}
