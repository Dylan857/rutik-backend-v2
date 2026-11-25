/** Which half of the school day a trip runs. */
export enum TripLeg {
  PICKUP = 'PICKUP', // ida: casas -> colegio
  DROPOFF = 'DROPOFF', // regreso: colegio -> casas
}

export enum TripStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * PENDING → APPROACHING (≤ 5 min away, guardian notified) → ARRIVED (driver
 * stopped at the door) → DONE / NOT_DONE (driver answered "¿Recogió/Entregó?").
 * Students reported absent never get a stop: the trip is built from the
 * day's plan, which already excludes them.
 */
export enum TripStopStatus {
  PENDING = 'PENDING',
  APPROACHING = 'APPROACHING',
  ARRIVED = 'ARRIVED',
  DONE = 'DONE',
  NOT_DONE = 'NOT_DONE',
}

/** The driver's answer to "¿Recogió/Entregó a X?". */
export enum TripStopOutcome {
  DONE = 'DONE',
  NOT_DONE = 'NOT_DONE',
}

/** Stops the bus still has to visit. */
export const OPEN_STOP_STATUSES: ReadonlySet<TripStopStatus> = new Set([
  TripStopStatus.PENDING,
  TripStopStatus.APPROACHING,
  TripStopStatus.ARRIVED,
]);
