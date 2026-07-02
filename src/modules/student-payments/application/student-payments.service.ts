import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { CompanyStatus } from '../../company/domain/enums/company-status.enum';
import { StudentService } from '../../students/application/students.service';
import { StudentStatus } from '../../students/domain/enums/student-status.enum';
import { StudentPayment } from '../domain/student-payment.entity';
import { PaymentStatus } from '../domain/enums/payment-status.enum';
import {
  IStudentPaymentRepository,
  PaymentFilters,
  STUDENT_PAYMENT_REPOSITORY,
} from '../domain/interfaces/student-payment.repository';
import { CreateStudentPaymentDto } from '../infrastructure/api/dto/create-student-payment.dto';
import { UpdateStudentPaymentDto } from '../infrastructure/api/dto/update-student-payment.dto';
import { computeDueDate, getNextBillingPeriod } from './due-date.util';

const MS_PER_DAY = 86_400_000;

interface ComputedFields {
  status: PaymentStatus;
  paidAt: Date | null;
  outstandingBalance: number;
  daysOverdue: number | null;
}

export interface BillingCycleCompanyResult {
  companyId: string;
  companyName: string;
  created: number;
  skipped: number;
}

export interface BillingCycleSummary {
  billingMonth: number;
  billingYear: number;
  companiesProcessed: number;
  totalCreated: number;
  totalSkipped: number;
  results: BillingCycleCompanyResult[];
}

@Injectable()
export class StudentPaymentsService {
  constructor(
    @Inject(STUDENT_PAYMENT_REPOSITORY)
    private readonly paymentRepository: IStudentPaymentRepository,
    private readonly companyService: CompanyService,
    private readonly studentService: StudentService,
  ) {}

  async create(dto: CreateStudentPaymentDto): Promise<StudentPayment> {
    await this.companyService.findById(dto.companyId);

    const student = await this.studentService.findById(dto.studentId);
    if (student.companyId !== dto.companyId) {
      throw new BadRequestException(
        `Student with ID "${dto.studentId}" does not belong to company with ID "${dto.companyId}"`,
      );
    }

    const duplicate = await this.paymentRepository.findByStudentAndPeriod(
      dto.studentId,
      dto.billingMonth,
      dto.billingYear,
    );
    if (duplicate) {
      throw new ConflictException(
        `A payment record already exists for student "${dto.studentId}" in ${dto.billingMonth}/${dto.billingYear}`,
      );
    }

    const dueDate = computeDueDate(
      dto.billingYear,
      dto.billingMonth,
      student.paymentDueDay,
    );
    const amountPaid = dto.amountPaid ?? 0;
    const computed = this.deriveComputedFields({
      monthlyFee: dto.monthlyFee,
      amountPaid,
      dueDate,
      providedPaidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      existingPaidAt: null,
    });

    const created = await this.paymentRepository.create({
      companyId: dto.companyId,
      studentId: dto.studentId,
      billingMonth: dto.billingMonth,
      billingYear: dto.billingYear,
      monthlyFee: dto.monthlyFee,
      amountPaid,
      dueDate,
      status: computed.status,
      paidAt: computed.paidAt,
      paymentMethod: dto.paymentMethod ?? null,
      notes: dto.notes ?? null,
    });

    return this.attachComputed(created, computed);
  }

  async findAll(filters: PaymentFilters): Promise<StudentPayment[]> {
    const payments = await this.paymentRepository.findAll(filters);
    return payments.map((p) => this.attachComputed(p, this.recompute(p)));
  }

  async findById(id: string): Promise<StudentPayment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundException(`Student payment with ID "${id}" not found`);
    }
    return this.attachComputed(payment, this.recompute(payment));
  }

  async update(
    id: string,
    dto: UpdateStudentPaymentDto,
  ): Promise<StudentPayment> {
    const current = await this.paymentRepository.findById(id);
    if (!current) {
      throw new NotFoundException(`Student payment with ID "${id}" not found`);
    }

    if (dto.monthlyFee !== undefined && dto.monthlyFee <= 0) {
      throw new BadRequestException('monthly_fee must be greater than 0');
    }

    const monthlyFee = dto.monthlyFee ?? current.monthlyFee;
    const amountPaid = dto.amountPaid ?? current.amountPaid;
    // dueDate is frozen at creation (mirrors monthlyFee's historical-integrity
    // precedent) — an update never recomputes it, even if the student's
    // paymentDueDay preference changes later.
    const computed = this.deriveComputedFields({
      monthlyFee,
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
      ...(dto.monthlyFee !== undefined && { monthlyFee: dto.monthlyFee }),
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
   * Opens the next billing cycle (the calendar month after "now", see
   * getNextBillingPeriod) for every ACTIVE company, generating PENDING
   * student_payments records via generateMonthlyPayments below.
   *
   * Manually triggered by a super_admin via REST (POST /student-payments/billing-cycle/generate)
   * — there is deliberately no cron. Safe to run more than once for the same
   * period: generateMonthlyPayments skips students that already have a record.
   */
  async generateNextBillingCycle(): Promise<BillingCycleSummary> {
    const { billingMonth, billingYear } = getNextBillingPeriod();

    const companies = await this.companyService.findAll();
    const activeCompanies = companies.filter(
      (company) => company.status === CompanyStatus.ACTIVE,
    );

    const results: BillingCycleCompanyResult[] = [];
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const company of activeCompanies) {
      const { created, skipped } = await this.generateMonthlyPayments(
        company.id,
        billingMonth,
        billingYear,
      );
      results.push({
        companyId: company.id,
        companyName: company.name,
        created,
        skipped,
      });
      totalCreated += created;
      totalSkipped += skipped;
    }

    return {
      billingMonth,
      billingYear,
      companiesProcessed: activeCompanies.length,
      totalCreated,
      totalSkipped,
      results,
    };
  }

  /**
   * Generates PENDING payment records for every active student in the company
   * that does not already have one for the given month/year.
   *
   * Students are skipped when:
   *  - They already have a payment record for this period.
   *  - Their transport service ended before this billing period.
   *  - Their transport service hasn't started yet for this period.
   */
  async generateMonthlyPayments(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<{ created: number; skipped: number }> {
    await this.companyService.findById(companyId);

    const [activeStudents, existingPayments] = await Promise.all([
      this.studentService.findAll({ companyId, status: StudentStatus.ACTIVE }),
      this.paymentRepository.findByCompanyAndPeriod(
        companyId,
        billingMonth,
        billingYear,
      ),
    ]);

    const alreadyBilled = new Set(existingPayments.map((p) => p.studentId));

    // First day of the billing month used to compare against transport dates
    const periodStart = new Date(billingYear, billingMonth - 1, 1);
    const periodEnd = new Date(billingYear, billingMonth, 0); // last day of month

    let created = 0;
    let skipped = 0;

    for (const student of activeStudents) {
      if (alreadyBilled.has(student.id)) {
        skipped++;
        continue;
      }

      // Skip if transport hasn't started yet for this period
      if (
        student.transportStartDate &&
        new Date(student.transportStartDate) > periodEnd
      ) {
        skipped++;
        continue;
      }

      // Skip if transport already ended before this period
      if (
        student.transportEndDate &&
        new Date(student.transportEndDate) < periodStart
      ) {
        skipped++;
        continue;
      }

      const dueDate = computeDueDate(
        billingYear,
        billingMonth,
        student.paymentDueDay,
      );
      const computed = this.deriveComputedFields({
        monthlyFee: student.monthlyFee,
        amountPaid: 0,
        dueDate,
        providedPaidAt: null,
        existingPaidAt: null,
      });

      await this.paymentRepository.create({
        companyId,
        studentId: student.id,
        billingMonth,
        billingYear,
        monthlyFee: student.monthlyFee,
        amountPaid: 0,
        dueDate,
        status: computed.status,
        paidAt: computed.paidAt,
        paymentMethod: null,
        notes: null,
      });

      created++;
    }

    return { created, skipped };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Single source of truth for status/paidAt/outstandingBalance/daysOverdue.
   * Priority order: PAID > PARTIAL > OVERDUE > PENDING — a partial payment
   * received after the due date still reads as PARTIAL, not OVERDUE (OVERDUE
   * is reserved for periods where nothing at all has been paid).
   */
  private deriveComputedFields(input: {
    monthlyFee: number;
    amountPaid: number;
    dueDate: string | null;
    providedPaidAt?: Date | null;
    existingPaidAt: Date | null;
  }): ComputedFields {
    const outstandingBalance = Math.max(0, input.monthlyFee - input.amountPaid);

    let status: PaymentStatus;
    if (input.amountPaid >= input.monthlyFee) {
      status = PaymentStatus.PAID;
    } else if (input.amountPaid > 0) {
      status = PaymentStatus.PARTIAL;
    } else if (input.dueDate && new Date() > new Date(input.dueDate)) {
      status = PaymentStatus.OVERDUE;
    } else {
      status = PaymentStatus.PENDING;
    }

    const paidAt =
      input.amountPaid > 0
        ? ((input.providedPaidAt !== undefined
            ? input.providedPaidAt
            : input.existingPaidAt) ?? new Date())
        : null;

    const daysOverdue =
      status === PaymentStatus.OVERDUE && input.dueDate
        ? Math.floor(
            (Date.now() - new Date(input.dueDate).getTime()) / MS_PER_DAY,
          )
        : null;

    return { status, paidAt, outstandingBalance, daysOverdue };
  }

  /** Read-path recompute — never persisted, just keeps GET responses accurate "as of now". */
  private recompute(payment: StudentPayment): ComputedFields {
    return this.deriveComputedFields({
      monthlyFee: payment.monthlyFee,
      amountPaid: payment.amountPaid,
      dueDate: payment.dueDate,
      providedPaidAt: undefined,
      existingPaidAt: payment.paidAt,
    });
  }

  private attachComputed(
    payment: StudentPayment,
    computed: ComputedFields,
  ): StudentPayment {
    return Object.assign(payment, {
      status: computed.status,
      outstandingBalance: computed.outstandingBalance,
      daysOverdue: computed.daysOverdue,
    });
  }
}
