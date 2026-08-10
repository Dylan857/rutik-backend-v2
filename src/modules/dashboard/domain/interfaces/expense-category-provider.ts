export interface ExpenseCategoryTotal {
  category: string;
  label: string;
  amount: number;
}

// Adding a new expense category (insurance, payroll, etc.) to the profit
// summary is just: implement this interface + register the provider in
// DashboardModule's EXPENSE_CATEGORY_PROVIDERS factory. Nothing in
// DashboardService or the controller needs to change.
export interface IExpenseCategoryProvider {
  readonly category: string;
  readonly label: string;
  getTotal(companyId: string, month: number, year: number): Promise<number>;
}

export const EXPENSE_CATEGORY_PROVIDERS = Symbol('EXPENSE_CATEGORY_PROVIDERS');
