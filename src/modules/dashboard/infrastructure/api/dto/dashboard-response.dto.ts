import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { SummaryCardsDto } from './summary-cards.dto';
import { PaymentSummaryDto } from './payment-summary.dto';
import { RevenueSummaryDto } from './revenue-summary.dto';
import { UpcomingPaymentDto } from './upcoming-payments.dto';
import { RecentActivityDto } from './recent-activity.dto';

export class DashboardResponseDto {
  @ApiProperty({ type: SummaryCardsDto })
  @Expose()
  @Type(() => SummaryCardsDto)
  summaryCards: SummaryCardsDto;

  @ApiProperty({ type: PaymentSummaryDto })
  @Expose()
  @Type(() => PaymentSummaryDto)
  paymentSummary: PaymentSummaryDto;

  @ApiProperty({ type: RevenueSummaryDto })
  @Expose()
  @Type(() => RevenueSummaryDto)
  revenueSummary: RevenueSummaryDto;

  @ApiProperty({ type: [UpcomingPaymentDto] })
  @Expose()
  @Type(() => UpcomingPaymentDto)
  upcomingPayments: UpcomingPaymentDto[];

  @ApiProperty({ type: [RecentActivityDto] })
  @Expose()
  @Type(() => RecentActivityDto)
  recentActivity: RecentActivityDto[];
}
