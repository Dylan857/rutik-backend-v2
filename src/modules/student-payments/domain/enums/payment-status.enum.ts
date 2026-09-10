export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  // A guardian submitted a transfer receipt (referenceNumber + photo) that an
  // admin hasn't approved or rejected yet. Takes priority over every other
  // status regardless of amountPaid — see deriveComputedFields.
  IN_REVIEW = 'IN_REVIEW',
}
