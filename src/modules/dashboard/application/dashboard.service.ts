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
import {
  EXPENSE_CATEGORY_PROVIDERS,
  ExpenseCategoryTotal,
  IExpenseCategoryProvider,
} from '../domain/interfaces/expense-category-provider';

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

export interface ProfitSummaryData {
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  expenseBreakdown: ExpenseCategoryTotal[];
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
    @Inject(EXPENSE_CATEGORY_PROVIDERS)
    private readonly expenseCategoryProviders: IExpenseCategoryProvider[],
  ) {}

  async getDashboard(
    companyId: string,
    selectedBillingMonth?: number,
    selectedBillingYear?: number,
  ): Promise<DashboardData> {
    const { billingMonth, billingYear } = this.getCurrentBillingPeriod();
    const periodMonth = selectedBillingMonth ?? billingMonth;
    const periodYear = selectedBillingYear ?? billingYear;

    const [
      summaryCards,
      paymentSummary,
      revenueSummary,
      upcomingPayments,
      recentActivity,
    ] = await Promise.all([
      this.getSummaryCards(companyId),
      this.getPaymentSummary(companyId, periodMonth, periodYear),
      this.getRevenueSummary(companyId, periodMonth, periodYear),
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

  async getProfitSummary(
    companyId: string,
    selectedBillingMonth?: number,
    selectedBillingYear?: number,
  ): Promise<ProfitSummaryData> {
    const { billingMonth, billingYear } = this.getCurrentBillingPeriod();
    const periodMonth = selectedBillingMonth ?? billingMonth;
    const periodYear = selectedBillingYear ?? billingYear;

    const [{ collected: income }, expenseBreakdown] = await Promise.all([
      this.dashboardRepository.getPaymentAmountTotals(
        companyId,
        periodMonth,
        periodYear,
      ),
      this.getExpenseBreakdown(companyId, periodMonth, periodYear),
    ]);

    const expenses = expenseBreakdown.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const profit = income - expenses;

    return {
      income,
      expenses,
      profit,
      margin: this.calculatePercentage(profit, income),
      fuelExpenses: this.findCategoryAmount(expenseBreakdown, 'fuel'),
      maintenanceExpenses: this.findCategoryAmount(
        expenseBreakdown,
        'maintenance',
      ),
      expenseBreakdown,
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
      expected: totals.expected,
      collected: totals.collected,
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

  private async getExpenseBreakdown(
    companyId: string,
    month: number,
    year: number,
  ): Promise<ExpenseCategoryTotal[]> {
    return Promise.all(
      this.expenseCategoryProviders.map(async (provider) => ({
        category: provider.category,
        label: provider.label,
        amount: await provider.getTotal(companyId, month, year),
      })),
    );
  }

  private findCategoryAmount(
    breakdown: ExpenseCategoryTotal[],
    category: string,
  ): number {
    return breakdown.find((item) => item.category === category)?.amount ?? 0;
  }
}
