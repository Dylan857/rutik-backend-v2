import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { CompanyStatus } from '../../company/domain/enums/company-status.enum';
import { StudentService } from '../../students/application/students.service';
import { StudentStatus } from '../../students/domain/enums/student-status.enum';
import { StudentGuardianService } from '../../student-guardians/application/student-guardians.service';
import { PaymentAccountsService } from '../../payment-accounts/application/payment-accounts.service';
import { PaymentAccountType } from '../../payment-accounts/domain/enums/payment-account-type.enum';
import { CloudinaryService } from '../../../shared/cloudinary/cloudinary.service';
import { NotificationsService } from '../../notifications/application/notifications.service';
import { NotificationType } from '../../notifications/domain/enums/notification-type.enum';
import { NotificationSeverity } from '../../notifications/domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../../notifications/domain/enums/notification-source-type.enum';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
import { StudentPayment } from '../domain/student-payment.entity';
import { PaymentStatus } from '../domain/enums/payment-status.enum';
import { PaymentMethod } from '../domain/enums/payment-method.enum';
import {
  IStudentPaymentRepository,
  PaymentAmountTotals,
  PaymentFilters,
  PaymentStatusCounts,
  STUDENT_PAYMENT_REPOSITORY,
} from '../domain/interfaces/student-payment.repository';
import { CreateStudentPaymentDto } from '../infrastructure/api/dto/create-student-payment.dto';
import { UpdateStudentPaymentDto } from '../infrastructure/api/dto/update-student-payment.dto';
import { SubmitReceiptDto } from '../infrastructure/api/dto/submit-receipt.dto';
import { ApprovePaymentDto } from '../infrastructure/api/dto/approve-payment.dto';
import { RejectPaymentDto } from '../infrastructure/api/dto/reject-payment.dto';
import {
  computeDueDate,
  getNextBillingPeriod,
  resolveBillingPeriodForCompany,
} from './due-date.util';

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
  // Period actually opened for this company in this run, or null when the
  // company was already up to date (see upToDate).
  billingMonth: number | null;
  billingYear: number | null;
  created: number;
  skipped: number;
  // True when the company had already reached the reference ceiling and
  // nothing was opened for it in this run.
  upToDate: boolean;
}

export interface PaymentsSummaryResult {
  billingMonth: number;
  billingYear: number;
  schoolId: string | null;
  paymentStatus: PaymentStatusCounts & { collectionPercentage: number };
  revenue: PaymentAmountTotals & {
    remaining: number;
    collectionPercentage: number;
  };
}

export interface BillingCycleSummary {
  // The "now + 1" ceiling used as reference for this run (see
  // getNextBillingPeriod). Companies with billing history reach exactly this
  // period; companies without history may open an earlier period first —
  // see each entry in `results` for the period actually opened.
  referenceMonth: number;
  referenceYear: number;
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
    @Inject(forwardRef(() => StudentService))
    private readonly studentService: StudentService,
    @Inject(forwardRef(() => StudentGuardianService))
    private readonly studentGuardianService: StudentGuardianService,
    private readonly paymentAccountsService: PaymentAccountsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    dto: CreateStudentPaymentDto,
    actor: AuditActor,
  ): Promise<StudentPayment> {
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
    this.assertAmountPaidNotExceedingFee(dto.monthlyFee, amountPaid);
    const computed = this.deriveComputedFields({
      monthlyFee: dto.monthlyFee,
      amountPaid,
      dueDate,
      providedPaidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      existingPaidAt: null,
      submittedAt: null,
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

    await this.auditLogsService.record({
      companyId: created.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: created.id,
      description: `Se registró un pago de ${amountPaid} para ${student.firstName} ${student.lastName}`,
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
    actor: AuditActor,
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
    this.assertAmountPaidNotExceedingFee(monthlyFee, amountPaid);
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
      submittedAt: current.submittedAt,
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

    const updatedStudent = await this.studentService.findById(
      updated.studentId,
    );
    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: updated.id,
      description: `Se actualizó el pago de ${updatedStudent.firstName} ${updatedStudent.lastName}`,
    });

    return this.attachComputed(updated, computed);
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const payment = await this.findById(id);
    const student = await this.studentService.findById(payment.studentId);
    await this.paymentRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: payment.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: payment.id,
      description: `Se eliminó el pago de ${student.firstName} ${student.lastName}`,
    });
  }

  /**
   * Called by StudentService.update BEFORE persisting a monthlyFee change, so
   * an invalid change (amountPaid would exceed the new fee) rejects the whole
   * student update instead of leaving it half-applied.
   *
   * Returns the student's payment for the current calendar period only when
   * it exists and is still open (PENDING/PARTIAL/OVERDUE) — null when there's
   * nothing to sync (no payment generated yet for this period) or the period
   * is already closed out (PAID) or mid-review (IN_REVIEW), which must never
   * be touched retroactively.
   */
  async getOpenPaymentToSyncOnFeeChange(
    studentId: string,
    newMonthlyFee: number,
  ): Promise<StudentPayment | null> {
    const period = this.getCurrentBillingPeriod();
    const payment = await this.paymentRepository.findByStudentAndPeriod(
      studentId,
      period.billingMonth,
      period.billingYear,
    );

    if (
      !payment ||
      payment.status === PaymentStatus.PAID ||
      payment.status === PaymentStatus.IN_REVIEW
    ) {
      return null;
    }

    this.assertAmountPaidNotExceedingFee(newMonthlyFee, payment.amountPaid);

    return payment;
  }

  /**
   * Applies a student's new monthlyFee to the open payment previously
   * returned by getOpenPaymentToSyncOnFeeChange. Called AFTER the student
   * update is persisted. dueDate stays frozen — only monthlyFee and the
   * fields derived from it (status/paidAt) change.
   */
  async applyFeeChangeToOpenPayment(
    payment: StudentPayment,
    newMonthlyFee: number,
    actor: AuditActor,
  ): Promise<void> {
    const computed = this.deriveComputedFields({
      monthlyFee: newMonthlyFee,
      amountPaid: payment.amountPaid,
      dueDate: payment.dueDate,
      providedPaidAt: undefined,
      existingPaidAt: payment.paidAt,
      submittedAt: payment.submittedAt,
    });

    const updated = await this.paymentRepository.update(payment.id, {
      monthlyFee: newMonthlyFee,
      status: computed.status,
      paidAt: computed.paidAt,
    });

    const student = await this.studentService.findById(updated.studentId);
    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: updated.id,
      description: `Se actualizó la tarifa del pago de ${student.firstName} ${student.lastName} a ${newMonthlyFee} por cambio en la mensualidad del estudiante`,
    });
  }

  /**
   * Status counts (paid/partial/pending/overdue) and revenue totals
   * (expected/collected) for a company, optionally narrowed to a single
   * school. Unlike the main dashboard's revenueSummary, both expected and
   * collected are scoped to the same schoolId/period filter here — this is
   * meant to back a filterable payments-list view, not the dashboard's
   * fixed-to-current-period widget. billingMonth/billingYear default to the
   * current calendar billing period when omitted.
   */
  async getPaymentsSummary(
    companyId: string,
    billingMonth?: number,
    billingYear?: number,
    schoolId?: string,
  ): Promise<PaymentsSummaryResult> {
    const period =
      billingMonth !== undefined && billingYear !== undefined
        ? { billingMonth, billingYear }
        : this.getCurrentBillingPeriod();

    const [statusCounts, amountTotals] = await Promise.all([
      this.paymentRepository.getPaymentStatusCounts(
        companyId,
        period.billingMonth,
        period.billingYear,
        schoolId,
      ),
      this.paymentRepository.getPaymentAmountTotals(
        companyId,
        period.billingMonth,
        period.billingYear,
        schoolId,
      ),
    ]);

    return {
      billingMonth: period.billingMonth,
      billingYear: period.billingYear,
      schoolId: schoolId ?? null,
      paymentStatus: {
        ...statusCounts,
        collectionPercentage: this.calculatePercentage(
          statusCounts.paid,
          statusCounts.totalStudents,
        ),
      },
      revenue: {
        ...amountTotals,
        remaining: Math.max(0, amountTotals.expected - amountTotals.collected),
        collectionPercentage: this.calculatePercentage(
          amountTotals.collected,
          amountTotals.expected,
        ),
      },
    };
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

  /**
   * Opens a billing period for every ACTIVE company, generating PENDING
   * student_payments records via generateMonthlyPayments below.
   *
   * Filling gaps in the company's already-open period takes priority over
   * advancing to the next one: the "open period" is the company's last
   * billed period (or the CURRENT month if it has no billing history yet).
   * generateMonthlyPayments only creates records for active students that
   * don't already have one, so students added after that period was first
   * opened (e.g. new enrollments this month) get billed into it here instead
   * of being skipped straight to the next period. Only once that period has
   * no gaps left (nothing new to create) does the company advance one month,
   * capped at the same "now + 1" ceiling every company is held to
   * (resolveBillingPeriodForCompany).
   *
   * Manually triggered by a super_admin via REST (POST /student-payments/billing-cycle/generate)
   * — there is deliberately no cron. Safe to run more than once: a company
   * already at the ceiling with no gaps is reported as upToDate and nothing
   * is created for it; a company still catching up may open one additional
   * period per call until it reaches the ceiling.
   */
  async generateNextBillingCycle(
    actor: AuditActor,
  ): Promise<BillingCycleSummary> {
    const referenceDate = new Date();
    const { billingMonth: referenceMonth, billingYear: referenceYear } =
      getNextBillingPeriod(referenceDate);

    const companies = await this.companyService.findAll();
    const activeCompanies = companies.filter(
      (company) => company.status === CompanyStatus.ACTIVE,
    );

    const results: BillingCycleCompanyResult[] = [];
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const company of activeCompanies) {
      const lastBilled = await this.paymentRepository.findLatestPeriodByCompany(
        company.id,
      );

      // The period the company is currently open on: its last billed period,
      // or the current month if it has never been billed. Re-running this
      // for an already-open period is safe/idempotent — it only creates
      // records for students that don't have one yet.
      const openPeriod =
        lastBilled ?? resolveBillingPeriodForCompany(null, referenceDate)!;

      let period = openPeriod;
      let { created, skipped } = await this.generateMonthlyPayments(
        company.id,
        openPeriod.billingMonth,
        openPeriod.billingYear,
      );

      // Nothing new to create in the open period — it's fully covered, so
      // try to advance exactly one period (capped at the ceiling).
      if (created === 0 && lastBilled) {
        const next = resolveBillingPeriodForCompany(lastBilled, referenceDate);

        if (!next) {
          results.push({
            companyId: company.id,
            companyName: company.name,
            billingMonth: null,
            billingYear: null,
            created: 0,
            skipped: 0,
            upToDate: true,
          });
          continue;
        }

        const advance = await this.generateMonthlyPayments(
          company.id,
          next.billingMonth,
          next.billingYear,
        );
        period = next;
        created = advance.created;
        skipped = advance.skipped;
      }

      results.push({
        companyId: company.id,
        companyName: company.name,
        billingMonth: period.billingMonth,
        billingYear: period.billingYear,
        created,
        skipped,
        upToDate: false,
      });
      totalCreated += created;
      totalSkipped += skipped;

      // Only notify when this run actually opened up new payments for the
      // period — re-running against an already-covered period is a no-op
      // and shouldn't re-alert admins (dedupeKey guards it either way).
      if (created > 0) {
        const periodLabel = `${String(period.billingMonth).padStart(2, '0')}/${period.billingYear}`;
        await this.notificationsService.create({
          companyId: company.id,
          type: NotificationType.BILLING_CYCLE_READY,
          severity: NotificationSeverity.INFO,
          title: `Pagos del período ${periodLabel} listos`,
          message: `Se generaron ${created} pago(s) para el período de facturación ${periodLabel}.`,
          sourceType: NotificationSourceType.BILLING_CYCLE,
          dedupeKey: `${NotificationType.BILLING_CYCLE_READY}:${company.id}:${period.billingMonth}:${period.billingYear}`,
        });

        await this.auditLogsService.record({
          companyId: company.id,
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: AuditAction.CREATED,
          entityType: AuditEntityType.STUDENT_PAYMENT,
          description: `Se generaron ${created} pago(s) para el período ${periodLabel}`,
        });
      }
    }

    return {
      referenceMonth,
      referenceYear,
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
        submittedAt: null,
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
   * amountPaid must never exceed monthlyFee — an overpayment isn't a valid
   * "PAID" state, it's a data-entry mistake (deriveComputedFields already
   * treats amountPaid >= monthlyFee as PAID, so silently accepting more would
   * hide the excess instead of rejecting it).
   */
  private assertAmountPaidNotExceedingFee(
    monthlyFee: number,
    amountPaid: number,
  ): void {
    if (amountPaid > monthlyFee) {
      throw new BadRequestException(
        `amountPaid (${amountPaid}) cannot exceed monthlyFee (${monthlyFee})`,
      );
    }
  }

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
    // Non-null while a guardian-submitted receipt awaits admin review —
    // overrides every other status regardless of amountPaid.
    submittedAt: Date | null;
  }): ComputedFields {
    const outstandingBalance = Math.max(0, input.monthlyFee - input.amountPaid);

    let status: PaymentStatus;
    if (input.submittedAt) {
      status = PaymentStatus.IN_REVIEW;
    } else if (input.amountPaid >= input.monthlyFee) {
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
      submittedAt: payment.submittedAt,
    });
  }

  private mapAccountTypeToPaymentMethod(type?: PaymentAccountType): PaymentMethod {
    switch (type) {
      case PaymentAccountType.NEQUI:
        return PaymentMethod.NEQUI;
      case PaymentAccountType.DAVIPLATA:
        return PaymentMethod.DAVIPLATA;
      default:
        return PaymentMethod.TRANSFER;
    }
  }

  /**
   * Guardian submits a transfer receipt (photo + reference) for review.
   * Rejected only when the period is already PAID or already IN_REVIEW —
   * every other status (PENDING/PARTIAL/OVERDUE, including one carrying a
   * previous rejectionReason) is reportable.
   */
  async submitReceipt(
    id: string,
    dto: SubmitReceiptDto,
    file: Express.Multer.File,
    actor: AuditActor,
  ): Promise<StudentPayment> {
    const payment = await this.findById(id);

    const isOwner = await this.studentGuardianService.isGuardianOfStudent(
      actor.userId,
      payment.studentId,
    );
    if (!isOwner) {
      throw new ForbiddenException(
        'You are not a guardian of the student this payment belongs to',
      );
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('This period is already paid');
    }
    if (payment.status === PaymentStatus.IN_REVIEW) {
      throw new ConflictException(
        'A receipt for this period is already awaiting review',
      );
    }

    const paymentAccount = await this.paymentAccountsService.findById(
      dto.paymentAccountId,
    );
    if (paymentAccount.companyId !== payment.companyId) {
      throw new BadRequestException(
        'Payment account does not belong to this payment\'s company',
      );
    }

    const receiptUrl = await this.cloudinaryService.uploadReceipt(file);
    const submittedAt = new Date();

    const updated = await this.paymentRepository.update(id, {
      receiptUrl,
      receiptReference: dto.referenceNumber,
      paymentAccountId: dto.paymentAccountId,
      submittedAt,
      rejectionReason: null,
      status: PaymentStatus.IN_REVIEW,
    });

    const student = await this.studentService.findById(updated.studentId);

    await this.notificationsService.create({
      companyId: updated.companyId,
      type: NotificationType.PAYMENT_RECEIPT_SUBMITTED,
      severity: NotificationSeverity.INFO,
      title: 'Nuevo comprobante de pago',
      message: `${student.firstName} ${student.lastName} envió un comprobante para ${updated.billingMonth}/${updated.billingYear}.`,
      sourceType: NotificationSourceType.STUDENT_PAYMENT,
      sourceId: updated.id,
    });

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: updated.id,
      description: `Se envió un comprobante de pago para ${student.firstName} ${student.lastName}`,
    });

    return this.attachComputed(updated, this.recompute(updated));
  }

  /** Admin approves a receipt under review — records the payment for real. */
  async approvePayment(
    id: string,
    dto: ApprovePaymentDto,
    actor: AuditActor,
  ): Promise<StudentPayment> {
    const current = await this.paymentRepository.findById(id);
    if (!current) {
      throw new NotFoundException(`Student payment with ID "${id}" not found`);
    }
    if (!current.submittedAt) {
      throw new ConflictException(
        'This payment has no receipt currently awaiting review',
      );
    }

    const amountPaid = dto.amountPaid ?? current.monthlyFee;
    this.assertAmountPaidNotExceedingFee(current.monthlyFee, amountPaid);

    const paymentAccount = current.paymentAccountId
      ? await this.paymentAccountsService.findById(current.paymentAccountId)
      : null;

    const computed = this.deriveComputedFields({
      monthlyFee: current.monthlyFee,
      amountPaid,
      dueDate: current.dueDate,
      providedPaidAt: current.submittedAt,
      existingPaidAt: current.paidAt,
      submittedAt: null,
    });

    const updated = await this.paymentRepository.update(id, {
      amountPaid,
      paymentMethod: this.mapAccountTypeToPaymentMethod(paymentAccount?.type),
      status: computed.status,
      paidAt: computed.paidAt,
      submittedAt: null,
      reviewedAt: new Date(),
      reviewedBy: actor.userId,
    });

    const student = await this.studentService.findById(updated.studentId);
    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: updated.id,
      description: `Se aprobó el comprobante de pago de ${student.firstName} ${student.lastName}`,
    });

    return this.attachComputed(updated, computed);
  }

  /** Admin rejects a receipt under review — reverts to PENDING/OVERDUE, keeping the reason. */
  async rejectPayment(
    id: string,
    dto: RejectPaymentDto,
    actor: AuditActor,
  ): Promise<StudentPayment> {
    const current = await this.paymentRepository.findById(id);
    if (!current) {
      throw new NotFoundException(`Student payment with ID "${id}" not found`);
    }
    if (!current.submittedAt) {
      throw new ConflictException(
        'This payment has no receipt currently awaiting review',
      );
    }

    const computed = this.deriveComputedFields({
      monthlyFee: current.monthlyFee,
      amountPaid: current.amountPaid,
      dueDate: current.dueDate,
      providedPaidAt: undefined,
      existingPaidAt: current.paidAt,
      submittedAt: null,
    });

    const updated = await this.paymentRepository.update(id, {
      submittedAt: null,
      rejectionReason: dto.reason,
      reviewedAt: new Date(),
      reviewedBy: actor.userId,
      status: computed.status,
    });

    const student = await this.studentService.findById(updated.studentId);
    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.STUDENT_PAYMENT,
      entityId: updated.id,
      description: `Se rechazó el comprobante de pago de ${student.firstName} ${student.lastName}: ${dto.reason}`,
    });

    return this.attachComputed(updated, computed);
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
