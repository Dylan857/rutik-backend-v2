import { Injectable } from '@nestjs/common';
import { MaintenancesService } from '../../../maintenances/application/maintenances.service';
import { IExpenseCategoryProvider } from '../../domain/interfaces/expense-category-provider';

@Injectable()
export class MaintenanceExpenseCategoryProvider implements IExpenseCategoryProvider {
  readonly category = 'maintenance';
  readonly label = 'Mantenimientos';

  constructor(private readonly maintenancesService: MaintenancesService) {}

  getTotal(companyId: string, month: number, year: number): Promise<number> {
    return this.maintenancesService.getTotalExpenses(companyId, month, year);
  }
}
