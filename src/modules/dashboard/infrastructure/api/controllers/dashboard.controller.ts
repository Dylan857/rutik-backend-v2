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
import { ProfitSummaryResponseDto } from '../dto/profit-summary-response.dto';

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
      'change paymentSummary (paid, partial, pending, overdue, ' +
      'collectionPercentage) and revenueSummary (expected, collected, ' +
      'remaining, collectionPercentage) to reflect that period instead of ' +
      'the current one — summaryCards, upcomingPayments and recentActivity ' +
      'still reflect the current billing period. Defaults to the current ' +
      'billing period when omitted.',
  })
  @ApiQuery({
    name: 'billingMonth',
    required: false,
    description:
      'Billing month (1-12) to compute paymentSummary/revenueSummary for. Must be provided together with billingYear.',
  })
  @ApiQuery({
    name: 'billingYear',
    required: false,
    description:
      'Billing year to compute paymentSummary/revenueSummary for. Must be provided together with billingMonth.',
  })
  @ApiOkResponse({ type: DashboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getDashboard(
    @CurrentUser() currentUser: JwtPayload,
    @Query('billingMonth') billingMonth?: string,
    @Query('billingYear') billingYear?: string,
  ): Promise<DashboardResponseDto> {
    const companyId = this.requireCompanyId(currentUser);
    const period = this.parseBillingPeriod(billingMonth, billingYear);

    const data = await this.dashboardService.getDashboard(
      companyId,
      period?.month,
      period?.year,
    );
    return plainToInstance(DashboardResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get('profit-summary')
  @ApiOperation({
    summary:
      'Get the profit summary (income, expenses, profit, margin) for a billing period',
    description:
      'billingMonth/billingYear are optional and, when both are provided, ' +
      'change which billing period the summary is computed for. Defaults to ' +
      'the current billing period when omitted.',
  })
  @ApiQuery({
    name: 'billingMonth',
    required: false,
    description:
      'Billing month (1-12) to compute the summary for. Must be provided together with billingYear.',
  })
  @ApiQuery({
    name: 'billingYear',
    required: false,
    description:
      'Billing year to compute the summary for. Must be provided together with billingMonth.',
  })
  @ApiOkResponse({ type: ProfitSummaryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getProfitSummary(
    @CurrentUser() currentUser: JwtPayload,
    @Query('billingMonth') billingMonth?: string,
    @Query('billingYear') billingYear?: string,
  ): Promise<ProfitSummaryResponseDto> {
    const companyId = this.requireCompanyId(currentUser);
    const period = this.parseBillingPeriod(billingMonth, billingYear);

    const data = await this.dashboardService.getProfitSummary(
      companyId,
      period?.month,
      period?.year,
    );
    return plainToInstance(ProfitSummaryResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private requireCompanyId(currentUser: JwtPayload): string {
    if (!currentUser.companyId) {
      throw new BadRequestException('User is not associated with a company');
    }
    return currentUser.companyId;
  }

  private parseBillingPeriod(
    billingMonth?: string,
    billingYear?: string,
  ): { month: number; year: number } | undefined {
    if ((billingMonth === undefined) !== (billingYear === undefined)) {
      throw new BadRequestException(
        'billingMonth and billingYear must be provided together',
      );
    }

    if (billingMonth === undefined || billingYear === undefined) {
      return undefined;
    }

    const month = parseInt(billingMonth, 10);
    const year = parseInt(billingYear, 10);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('billingMonth must be between 1 and 12');
    }
    if (!Number.isInteger(year)) {
      throw new BadRequestException('billingYear must be a valid year');
    }

    return { month, year };
  }
}
