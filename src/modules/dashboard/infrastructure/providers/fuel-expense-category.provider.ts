import { Injectable } from '@nestjs/common';
import { FuelLogsService } from '../../../fuel-logs/application/fuel-logs.service';
import { IExpenseCategoryProvider } from '../../domain/interfaces/expense-category-provider';

@Injectable()
export class FuelExpenseCategoryProvider implements IExpenseCategoryProvider {
  readonly category = 'fuel';
  readonly label = 'Combustible';

  constructor(private readonly fuelLogsService: FuelLogsService) {}

  getTotal(companyId: string, month: number, year: number): Promise<number> {
    return this.fuelLogsService.getTotalExpenses(companyId, month, year);
  }
}
