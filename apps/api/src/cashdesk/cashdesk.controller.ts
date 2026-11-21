import type {
  CashDesk,
  CashShift,
  Expense,
  ExpenseList,
  MoneyReport,
  Sale,
} from '@awaisa/contracts'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CurrentCustomer } from '../auth/auth.guard.js'
import type { Business } from '../businesses/business.entity.js'
import {
  BusinessAccessGuard,
  CurrentBusiness,
  OwnerOnly,
} from '../businesses/business-access.guard.js'
import type { Customer } from '../customers/customer.entity.js'
import {
  type CashMovementBody,
  type CloseShiftBody,
  cashMovementSchema,
  closeShiftSchema,
  type ExpenseBody,
  expenseSchema,
  type OpenShiftBody,
  openShiftSchema,
  type PeriodQuery,
  periodQuerySchema,
  type SaleBody,
  type SalesQuery,
  saleSchema,
  salesQuerySchema,
} from './cashdesk.schemas.js'
import { CashDeskService } from './cashdesk.service.js'
import { ExpensesService } from './expenses.service.js'
import { MoneyReportService } from './money-report.service.js'

// The counter is the day's work: staff open and close shifts and sell. Expenses and the profit
// are money, so owner only.
@Controller('manage/:slug')
@UseGuards(BusinessAccessGuard)
export class CashDeskController {
  constructor(
    private readonly cashDesk: CashDeskService,
    private readonly expenses: ExpensesService,
    private readonly money: MoneyReportService,
  ) {}

  @Get('cash')
  desk(@CurrentBusiness() business: Business): Promise<CashDesk> {
    return this.cashDesk.desk(business.id)
  }

  @Post('cash/shifts')
  openShift(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer | null,
    @Body({ schema: openShiftSchema }) body: OpenShiftBody,
  ): Promise<CashShift> {
    return this.cashDesk.openShift(business.id, customer?.id ?? null, body)
  }

  @Post('cash/shifts/:id/movements')
  addMovement(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: cashMovementSchema }) body: CashMovementBody,
  ): Promise<CashShift> {
    return this.cashDesk.addMovement(business.id, id, customer?.id ?? null, body)
  }

  @Post('cash/shifts/:id/close')
  @HttpCode(200)
  closeShift(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: closeShiftSchema }) body: CloseShiftBody,
  ): Promise<CashShift> {
    return this.cashDesk.closeShift(business.id, id, customer?.id ?? null, body)
  }

  @Get('sales')
  listSales(
    @CurrentBusiness() business: Business,
    @Query({ schema: salesQuerySchema }) query: SalesQuery,
  ): Promise<Sale[]> {
    return this.cashDesk.listSales(business.id, { bookingId: query.bookingId })
  }

  @Post('sales')
  createSale(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer | null,
    @Body({ schema: saleSchema }) body: SaleBody,
  ): Promise<Sale> {
    return this.cashDesk.createSale(business.id, customer?.id ?? null, body)
  }

  @Post('sales/:id/cancel')
  @HttpCode(200)
  cancelSale(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Sale> {
    return this.cashDesk.cancelSale(business.id, id)
  }

  @Get('expenses')
  @OwnerOnly()
  listExpenses(
    @CurrentBusiness() business: Business,
    @Query({ schema: periodQuerySchema }) query: PeriodQuery,
  ): Promise<ExpenseList> {
    return this.expenses.list(business.id, query.days)
  }

  @Post('expenses')
  @OwnerOnly()
  createExpense(
    @CurrentBusiness() business: Business,
    @CurrentCustomer() customer: Customer | null,
    @Body({ schema: expenseSchema }) body: ExpenseBody,
  ): Promise<Expense> {
    return this.expenses.create(business.id, customer?.id ?? null, body)
  }

  @Put('expenses/:id')
  @OwnerOnly()
  updateExpense(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: expenseSchema }) body: ExpenseBody,
  ): Promise<Expense> {
    return this.expenses.update(business.id, id, body)
  }

  @Delete('expenses/:id')
  @OwnerOnly()
  @HttpCode(204)
  async removeExpense(
    @CurrentBusiness() business: Business,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.expenses.remove(business.id, id)
  }

  @Get('money')
  @OwnerOnly()
  moneyReport(
    @CurrentBusiness() business: Business,
    @Query({ schema: periodQuerySchema }) query: PeriodQuery,
  ): Promise<MoneyReport> {
    return this.money.report(business, query.days)
  }
}
