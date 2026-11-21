import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { BusinessesModule } from '../businesses/businesses.module.js'
import { FiscalModule } from '../fiscal/fiscal.module.js'
import { InventoryModule } from '../inventory/inventory.module.js'
import { CashDeskController } from './cashdesk.controller.js'
import { CashDeskService } from './cashdesk.service.js'
import { ExpensesService } from './expenses.service.js'
import { MoneyReportService } from './money-report.service.js'

@Module({
  imports: [AuthModule, BusinessesModule, InventoryModule, FiscalModule],
  controllers: [CashDeskController],
  providers: [CashDeskService, ExpensesService, MoneyReportService],
})
export class CashDeskModule {}
