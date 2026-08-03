import { MaintenanceStatus } from '../domain/enums/maintenance-status.enum';

const UPCOMING_DAYS_THRESHOLD = 15;
const UPCOMING_MILEAGE_THRESHOLD = 500;

export function computeMaintenanceStatus(
  nextMaintenanceDate: string | null,
  nextMaintenanceMileage: number | null,
  vehicleCurrentMileage: number,
  today: Date = new Date(),
): MaintenanceStatus {
  if (nextMaintenanceDate === null && nextMaintenanceMileage === null) {
    return MaintenanceStatus.UP_TO_DATE;
  }

  const daysUntil =
    nextMaintenanceDate !== null
      ? daysBetween(nextMaintenanceDate, today)
      : null;
  const mileageRemaining =
    nextMaintenanceMileage !== null
      ? nextMaintenanceMileage - vehicleCurrentMileage
      : null;

  const isOverdue =
    (daysUntil !== null && daysUntil < 0) ||
    (mileageRemaining !== null && mileageRemaining < 0);
  if (isOverdue) return MaintenanceStatus.OVERDUE;

  const isUpcoming =
    (daysUntil !== null && daysUntil < UPCOMING_DAYS_THRESHOLD) ||
    (mileageRemaining !== null &&
      mileageRemaining < UPCOMING_MILEAGE_THRESHOLD);
  if (isUpcoming) return MaintenanceStatus.UPCOMING;

  return MaintenanceStatus.UP_TO_DATE;
}

function daysBetween(dateStr: string, today: Date): number {
  const target = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);
  return Math.floor(
    (target.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24),
  );
}
