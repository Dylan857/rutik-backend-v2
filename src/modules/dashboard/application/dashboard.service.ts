import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  IDashboardRepository,
  PaymentAmountTotals,
  PaymentStatusCounts,
  RecentPaymentActivityRecord,
  SummaryCounts,
  UpcomingPaymentRecord,
} from '../domain/interfaces/dashboard.repository';

// "Próximo a vencer" window for the upcomingPayments section.
const UPCOMING_PAYMENTS_WINDOW_DAYS = 5;
// Dashboard widgets are a glanceable summary, not a full listing — capped to
// keep the first-load response small. Raise this (or move to query params)
// if the frontend ever needs pagination here.
const UPCOMING_PAYMENTS_LIMIT = 20;
const RECENT_ACTIVITY_LIMIT = 10;

export interface PaymentSummaryData extends PaymentStatusCounts {
  collectionPercentage: number;
}

export interface RevenueSummaryData extends PaymentAmountTotals {
  remaining: number;
  collectionPercentage: number;
}

export interface DashboardData {
  summaryCards: SummaryCounts;
  paymentSummary: PaymentSummaryData;
  revenueSummary: RevenueSummaryData;
  upcomingPayments: UpcomingPaymentRecord[];
  recentActivity: RecentPaymentActivityRecord[];
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  async getDashboard(companyId: string): Promise<DashboardData> {
    const { billingMonth, billingYear } = this.getCurrentBillingPeriod();

    const [
      summaryCards,
      paymentSummary,
      revenueSummary,
      upcomingPayments,
      recentActivity,
    ] = await Promise.all([
      this.getSummaryCards(companyId),
      this.getPaymentSummary(companyId, billingMonth, billingYear),
      this.getRevenueSummary(companyId, billingMonth, billingYear),
      this.getUpcomingPayments(companyId, billingMonth, billingYear),
      this.getRecentActivity(companyId),
    ]);

    return {
      summaryCards,
      paymentSummary,
      revenueSummary,
      upcomingPayments,
      recentActivity,
    };
  }

  // ── Private section builders ─────────────────────────────────────────────
  // Each method owns exactly one section of the response and delegates its
  // query to DashboardRepository — this service only orchestrates and derives
  // percentages, it never touches SQL directly.

  private getSummaryCards(companyId: string): Promise<SummaryCounts> {
    return this.dashboardRepository.getSummaryCounts(companyId);
  }

  private async getPaymentSummary(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<PaymentSummaryData> {
    const counts = await this.dashboardRepository.getPaymentStatusCounts(
      companyId,
      billingMonth,
      billingYear,
    );

    return {
      ...counts,
      collectionPercentage: this.calculatePercentage(
        counts.paid,
        counts.totalStudents,
      ),
    };
  }

  private async getRevenueSummary(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<RevenueSummaryData> {
    const totals = await this.dashboardRepository.getPaymentAmountTotals(
      companyId,
      billingMonth,
      billingYear,
    );

    return {
      ...totals,
      remaining: Math.max(0, totals.expected - totals.collected),
      collectionPercentage: this.calculatePercentage(
        totals.collected,
        totals.expected,
      ),
    };
  }

  private getUpcomingPayments(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<UpcomingPaymentRecord[]> {
    return this.dashboardRepository.getUpcomingPayments(
      companyId,
      billingMonth,
      billingYear,
      UPCOMING_PAYMENTS_WINDOW_DAYS,
      UPCOMING_PAYMENTS_LIMIT,
    );
  }

  private getRecentActivity(
    companyId: string,
  ): Promise<RecentPaymentActivityRecord[]> {
    return this.dashboardRepository.getRecentPaymentActivity(
      companyId,
      RECENT_ACTIVITY_LIMIT,
    );
  }

  private getCurrentBillingPeriod(): {
    billingMonth: number;
    billingYear: number;
  } {
    const now = new Date();
    return { billingMonth: now.getMonth() + 1, billingYear: now.getFullYear() };
  }

  private calculatePercentage(part: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((part / total) * 10000) / 100;
  }
}
