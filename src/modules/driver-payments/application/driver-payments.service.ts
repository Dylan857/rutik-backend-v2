import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { CompanyStatus } from '../../company/domain/enums/company-status.enum';
import { DriverService } from '../../drivers/application/drivers.service';
import { DriverStatus } from '../../drivers/domain/enums/driver-status.enum';
import { PaymentType } from '../../drivers/domain/enums/payment-type.enum';
import { DriverPayment } from '../domain/driver-payment.entity';
import { DriverPaymentStatus } from '../domain/enums/payment-status.enum';
import {
  DriverPaymentFilters,
  DRIVER_PAYMENT_REPOSITORY,
  IDriverPaymentRepository,
} from '../domain/interfaces/driver-payment.repository';
import { CreateDriverPaymentDto } from '../infrastructure/api/dto/create-driver-payment.dto';
import { UpdateDriverPaymentDto } from '../infrastructure/api/dto/update-driver-payment.dto';
import { resolveNextPeriodForDriver } from './payment-period.util';

const MS_PER_DAY = 86_400_000;

interface ComputedFields {
  status: DriverPaymentStatus;
  paidAt: Date | null;
  outstandingBalance: number;
  daysOverdue: number | null;
}

export interface PaymentCycleCompanyResult {
  companyId: string;
  companyName: string;
  driversProcessed: number;
  created: number;
  skipped: number;
}

export interface PaymentCycleSummary {
  referenceDate: Date;
  companiesProcessed: number;
  totalCreated: number;
  totalSkipped: number;
  results: PaymentCycleCompanyResult[];
}

@Injectable()
export class DriverPaymentsService {
  constructor(
    @Inject(DRIVER_PAYMENT_REPOSITORY)
    private readonly paymentRepository: IDriverPaymentRepository,
    private readonly companyService: CompanyService,
    private readonly driverService: DriverService,
  ) {}

  async create(dto: CreateDriverPaymentDto): Promise<DriverPayment> {
    await this.companyService.findById(dto.companyId);

    const driver = await this.driverService.findById(dto.driverId);
    if (driver.companyId !== dto.companyId) {
      throw new BadRequestException(
        `Driver with ID "${dto.driverId}" does not belong to company with ID "${dto.companyId}"`,
      );
    }

    if (new Date(dto.periodEnd) < new Date(dto.periodStart)) {
      throw new BadRequestException('periodEnd must not be before periodStart');
    }

    const duplicate = await this.paymentRepository.findByDriverAndPeriod(
      dto.driverId,
      dto.periodStart,
      dto.periodEnd,
    );
    if (duplicate) {
      throw new ConflictException(
        `A payment record already exists for driver "${dto.driverId}" covering ${dto.periodStart} to ${dto.periodEnd}`,
      );
    }

    const dueDate = dto.periodEnd;
    const amountPaid = dto.amountPaid ?? 0;
    const computed = this.deriveComputedFields({
      salaryAmount: dto.salaryAmount,
      amountPaid,
      dueDate,
      providedPaidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      existingPaidAt: null,
    });

    const created = await this.paymentRepository.create({
      companyId: dto.companyId,
      driverId: dto.driverId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      salaryAmount: dto.salaryAmount,
      amountPaid,
      dueDate,
      status: computed.status,
      paidAt: computed.paidAt,
      paymentMethod: dto.paymentMethod ?? null,
      notes: dto.notes ?? null,
    });

    return this.attachComputed(created, computed);
  }

  async findAll(filters: DriverPaymentFilters): Promise<DriverPayment[]> {
    const payments = await this.paymentRepository.findAll(filters);
    return payments.map((p) => this.attachComputed(p, this.recompute(p)));
  }

  async findById(id: string): Promise<DriverPayment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Driver payment with ID "${id}" not found`);
    }
    return this.attachComputed(payment, this.recompute(payment));
  }

  async update(
    id: string,
    dto: UpdateDriverPaymentDto,
  ): Promise<DriverPayment> {
    const current = await this.paymentRepository.findById(id);
    if (!current) {
      throw new NotFoundException(`Driver payment with ID "${id}" not found`);
    }

    if (dto.salaryAmount !== undefined && dto.salaryAmount <= 0) {
      throw new BadRequestException('salary_amount must be greater than 0');
    }

    const salaryAmount = dto.salaryAmount ?? current.salaryAmount;
    const amountPaid = dto.amountPaid ?? current.amountPaid;
    // dueDate is frozen at creation (mirrors salaryAmount's historical-
    // integrity precedent) — an update never recomputes it.
    const computed = this.deriveComputedFields({
      salaryAmount,
      amountPaid,
      dueDate: current.dueDate,
      providedPaidAt:
        dto.paidAt !== undefined
          ? dto.paidAt
            ? new Date(dto.paidAt)
            : null
          : undefined,
      existingPaidAt: current.paidAt,
    });

    const updated = await this.paymentRepository.update(id, {
      ...(dto.salaryAmount !== undefined && { salaryAmount: dto.salaryAmount }),
      ...(dto.amountPaid !== undefined && { amountPaid: dto.amountPaid }),
      ...(dto.paymentMethod !== undefined && {
        paymentMethod: dto.paymentMethod,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      status: computed.status,
      paidAt: computed.paidAt,
    });

    return this.attachComputed(updated, computed);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.paymentRepository.softDelete(id);
  }

  /**
   * Opens the current payment period for every ACTIVE, non-PER_ROUTE driver
   * of every ACTIVE company, generating a PENDING driver_payments record.
   *
   * Like student billing, this is meant to be launched a few days AHEAD of
   * each cutoff (e.g. the 25th-29th for MONTHLY drivers) — not only after
   * the cutoff has already passed. A driver's period is capped at "the
   * period containing today" (see resolveNextPeriodForDriver), so the record
   * shows up as a PENDING reminder before it's due, never more than one
   * period ahead of their last billed one. Each driver has its own cadence
   * (MONTHLY/WEEKLY/BIWEEKLY) anchored on their own hireDate/history, so —
   * unlike students, which share one company-wide billing period — there is
   * no single reference period for the whole run; each driver advances
   * independently, at most one period per call.
   *
   * PER_ROUTE drivers are skipped entirely: payment periods don't apply to
   * them, they are paid manually via POST /driver-payments per completed
   * route until route-completion tracking exists.
   *
   * Manually triggered by a super_admin via REST
   * (POST /driver-payments/payment-cycle/generate) — there is deliberately no
   * cron. Safe to run more than once: a driver whose current period is
   * already open, or who already has a record for it, is skipped and
   * nothing is duplicated.
   */
  async generateNextPaymentCycle(): Promise<PaymentCycleSummary> {
    const referenceDate = new Date();

    const companies = await this.companyService.findAll();
    const activeCompanies = companies.filter(
      (company) => company.status === CompanyStatus.ACTIVE,
    );

    const results: PaymentCycleCompanyResult[] = [];
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const company of activeCompanies) {
      const drivers = await this.driverService.findAll({
        companyId: company.id,
        status: DriverStatus.ACTIVE,
      });
      const eligibleDrivers = drivers.filter(
        (driver) => driver.paymentType !== PaymentType.PER_ROUTE,
      );

      let created = 0;
      let skipped = 0;

      for (const driver of eligibleDrivers) {
        const lastBilled =
          await this.paymentRepository.findLatestPeriodByDriver(driver.id);

        const nextPeriod = resolveNextPeriodForDriver(
          driver.hireDate,
          driver.paymentType,
          lastBilled,
          referenceDate,
        );

        if (!nextPeriod) {
          skipped++;
          continue;
        }

        const existing = await this.paymentRepository.findByDriverAndPeriod(
          driver.id,
          nextPeriod.periodStart,
          nextPeriod.periodEnd,
        );
        if (existing) {
          skipped++;
          continue;
        }

        const computed = this.deriveComputedFields({
          salaryAmount: driver.salary,
          amountPaid: 0,
          dueDate: nextPeriod.periodEnd,
          providedPaidAt: null,
          existingPaidAt: null,
        });

        await this.paymentRepository.create({
          companyId: company.id,
          driverId: driver.id,
          periodStart: nextPeriod.periodStart,
          periodEnd: nextPeriod.periodEnd,
          salaryAmount: driver.salary,
          amountPaid: 0,
          dueDate: nextPeriod.periodEnd,
          status: computed.status,
          paidAt: computed.paidAt,
          paymentMethod: null,
          notes: null,
        });

        created++;
      }

      results.push({
        companyId: company.id,
        companyName: company.name,
        driversProcessed: eligibleDrivers.length,
        created,
        skipped,
      });
      totalCreated += created;
      totalSkipped += skipped;
    }

    return {
      referenceDate,
      companiesProcessed: activeCompanies.length,
      totalCreated,
      totalSkipped,
      results,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Single source of truth for status/paidAt/outstandingBalance/daysOverdue.
   * Priority order: PAID > PARTIAL > OVERDUE > PENDING — a partial payment
   * received after the due date still reads as PARTIAL, not OVERDUE (OVERDUE
   * is reserved for periods where nothing at all has been paid).
   */
  private deriveComputedFields(input: {
    salaryAmount: number;
    amountPaid: number;
    dueDate: string | null;
    providedPaidAt?: Date | null;
    existingPaidAt: Date | null;
  }): ComputedFields {
    const outstandingBalance = Math.max(
      0,
      input.salaryAmount - input.amountPaid,
    );

    let status: DriverPaymentStatus;
    if (input.amountPaid >= input.salaryAmount) {
      status = DriverPaymentStatus.PAID;
    } else if (input.amountPaid > 0) {
      status = DriverPaymentStatus.PARTIAL;
    } else if (input.dueDate && new Date() > new Date(input.dueDate)) {
      status = DriverPaymentStatus.OVERDUE;
    } else {
      status = DriverPaymentStatus.PENDING;
    }

    const paidAt =
      input.amountPaid > 0
        ? ((input.providedPaidAt !== undefined
            ? input.providedPaidAt
            : input.existingPaidAt) ?? new Date())
        : null;

    const daysOverdue =
      status === DriverPaymentStatus.OVERDUE && input.dueDate
        ? Math.floor(
            (Date.now() - new Date(input.dueDate).getTime()) / MS_PER_DAY,
          )
        : null;

    return { status, paidAt, outstandingBalance, daysOverdue };
  }

  /** Read-path recompute — never persisted, just keeps GET responses accurate "as of now". */
  private recompute(payment: DriverPayment): ComputedFields {
    return this.deriveComputedFields({
      salaryAmount: payment.salaryAmount,
      amountPaid: payment.amountPaid,
      dueDate: payment.dueDate,
      providedPaidAt: undefined,
      existingPaidAt: payment.paidAt,
    });
  }

  private attachComputed(
    payment: DriverPayment,
    computed: ComputedFields,
  ): DriverPayment {
    return Object.assign(payment, {
      status: computed.status,
      outstandingBalance: computed.outstandingBalance,
      daysOverdue: computed.daysOverdue,
    });
  }
}
