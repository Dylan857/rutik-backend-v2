import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VehiclesService } from '../../vehicles/application/vehicles.service';
import { Vehicle } from '../../vehicles/domain/vehicle.entity';
import { VehicleStatus } from '../../vehicles/domain/enums/vehicle-status.enum';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '../domain/enums/notification-type.enum';
import { NotificationSeverity } from '../domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../domain/enums/notification-source-type.enum';

// Reminder cadence: fire once at each milestone, then every day once inside the daily window.
const MILESTONE_DAYS = [30, 15, 10];
const DAILY_REMINDER_THRESHOLD_DAYS = 5;

const SCANNED_STATUSES = new Set([
  VehicleStatus.ACTIVE,
  VehicleStatus.MAINTENANCE,
]);

type DocumentType = 'SOAT' | 'TECHNICAL_INSPECTION' | 'BIMONTHLY_INSPECTION';

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  SOAT: 'SOAT',
  TECHNICAL_INSPECTION: 'Tecnomecánica',
  BIMONTHLY_INSPECTION: 'Tecnomecánica bimestral',
};

@Injectable()
export class VehicleDocumentExpiryScanner {
  private readonly logger = new Logger(VehicleDocumentExpiryScanner.name);

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async scan(): Promise<void> {
    const vehicles = await this.vehiclesService.findAll({});
    const scanned = vehicles.filter((v) => SCANNED_STATUSES.has(v.status));

    for (const vehicle of scanned) {
      await this.checkDocument(
        vehicle,
        'SOAT',
        vehicle.soatExpirationDate,
        vehicle.soatNumber,
      );
      await this.checkDocument(
        vehicle,
        'TECHNICAL_INSPECTION',
        vehicle.technicalInspectionExpirationDate,
        vehicle.technicalInspectionNumber,
      );
      await this.checkBimonthlyInspection(vehicle);
    }

    this.logger.log(`Document expiry scan checked ${scanned.length} vehicles`);
  }

  private async checkBimonthlyInspection(vehicle: Vehicle): Promise<void> {
    if (!vehicle.isPublicService) return;

    if (!vehicle.lastBimonthlyInspectionDate) {
      await this.notifyMissingBimonthlyInspection(vehicle);
      return;
    }

    await this.checkDocument(
      vehicle,
      'BIMONTHLY_INSPECTION',
      vehicle.bimonthlyInspectionExpirationDate as string,
    );
  }

  private async notifyMissingBimonthlyInspection(
    vehicle: Vehicle,
  ): Promise<void> {
    await this.notificationsService.create({
      companyId: vehicle.companyId,
      type: NotificationType.VEHICLE_DOCUMENT_EXPIRING,
      severity: NotificationSeverity.WARNING,
      title: 'Falta registrar la tecnomecánica bimestral',
      message: `El vehículo ${vehicle.plate} es de servicio público y no tiene registrada la fecha de la última revisión preventiva (tecnomecánica bimestral). Ingrese la fecha, evite sanciones.`,
      sourceType: NotificationSourceType.VEHICLE,
      sourceId: vehicle.id,
      dedupeKey: `${NotificationType.VEHICLE_DOCUMENT_EXPIRING}:${vehicle.id}:BIMONTHLY_INSPECTION:MISSING:${this.todayStr()}`,
    });
  }

  private async checkDocument(
    vehicle: Vehicle,
    documentType: DocumentType,
    expirationDate: string,
    documentNumber?: string,
  ): Promise<void> {
    const diffDays = this.daysUntil(expirationDate);

    const isMilestone = MILESTONE_DAYS.includes(diffDays);
    const isDailyWindow = diffDays <= DAILY_REMINDER_THRESHOLD_DAYS;
    if (!isMilestone && !isDailyWindow) return;

    const dedupeSuffix = isDailyWindow
      ? `DAILY:${this.todayStr()}`
      : `M${diffDays}`;

    const documentLabel = DOCUMENT_LABELS[documentType];
    const severity =
      diffDays < 0
        ? NotificationSeverity.CRITICAL
        : NotificationSeverity.WARNING;
    const title =
      diffDays < 0
        ? `${documentLabel} vencido`
        : `${documentLabel} próximo a vencer`;
    const numberSuffix = documentNumber ? ` (${documentNumber})` : '';
    const message =
      diffDays < 0
        ? `El ${documentLabel}${numberSuffix} del vehículo ${vehicle.plate} venció hace ${Math.abs(diffDays)} día(s).`
        : `El ${documentLabel}${numberSuffix} del vehículo ${vehicle.plate} vence en ${diffDays} día(s).`;

    await this.notificationsService.create({
      companyId: vehicle.companyId,
      type: NotificationType.VEHICLE_DOCUMENT_EXPIRING,
      severity,
      title,
      message,
      sourceType: NotificationSourceType.VEHICLE,
      sourceId: vehicle.id,
      dedupeKey: `${NotificationType.VEHICLE_DOCUMENT_EXPIRING}:${vehicle.id}:${documentType}:${expirationDate}:${dedupeSuffix}`,
    });
  }

  private daysUntil(dateStr: string): number {
    const target = new Date(dateStr.slice(0, 10) + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private todayStr(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  }
}
