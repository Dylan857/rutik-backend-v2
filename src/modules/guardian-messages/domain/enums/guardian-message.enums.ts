export enum GuardianMessageCategory {
  CONCERN = 'CONCERN', // inquietud
  COMPLAINT = 'COMPLAINT', // incomodidad
}

// The topic the guardian picked from the chat menu.
export enum GuardianMessageTopic {
  PUNCTUALITY = 'PUNCTUALITY',
  DRIVER = 'DRIVER',
  VEHICLE = 'VEHICLE',
  ROUTE = 'ROUTE',
  PAYMENTS = 'PAYMENTS',
  OTHER = 'OTHER',
}

export enum GuardianMessageStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

export const CATEGORY_LABELS: Record<GuardianMessageCategory, string> = {
  [GuardianMessageCategory.CONCERN]: 'inquietud',
  [GuardianMessageCategory.COMPLAINT]: 'incomodidad',
};

export const TOPIC_LABELS: Record<GuardianMessageTopic, string> = {
  [GuardianMessageTopic.PUNCTUALITY]: 'Puntualidad',
  [GuardianMessageTopic.DRIVER]: 'Conductor',
  [GuardianMessageTopic.VEHICLE]: 'Vehículo',
  [GuardianMessageTopic.ROUTE]: 'Ruta',
  [GuardianMessageTopic.PAYMENTS]: 'Pagos',
  [GuardianMessageTopic.OTHER]: 'Otro',
};
