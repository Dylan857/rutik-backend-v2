// Computed on read from nextMaintenanceDate/nextMaintenanceMileage vs. the
// vehicle's current mileage — never persisted as a column.
export enum MaintenanceStatus {
  UP_TO_DATE = 'UP_TO_DATE',
  UPCOMING = 'UPCOMING',
  OVERDUE = 'OVERDUE',
}
