export type DocumentStatus = "new" | "processing" | "needs_review" | "confirmed";
export type FinancialStatus = "paid" | "pending" | "overdue" | "cancelled";
export type EventType = "appointment" | "medical" | "birthday" | "bill" | "expiry" | "reminder";

export interface DocumentRecord {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  status: DocumentStatus;
  source: "manual" | "file" | "image" | "camera" | "share";
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  hash?: string;
  extractedText?: string;
  issuedAt?: string;
  dueAt?: string;
  expiresAt?: string;
  amount?: number;
  supplier?: string;
  personId?: string;
  vehicleId?: string;
  residenceId?: string;
  confidence?: number;
  favorite: boolean;
  archived: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecord {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  amount: number;
  status: FinancialStatus;
  occurredAt: string;
  dueAt?: string;
  competence?: string;
  paymentMethod?: string;
  supplier?: string;
  recurrent: boolean;
  installmentCount?: number;
  notes?: string;
  documentId?: string;
  personId?: string;
  residenceId?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  description?: string;
  startsAt: string;
  endsAt?: string;
  allDay: boolean;
  recurrence?: string;
  location?: string;
  personId?: string;
  contactId?: string;
  documentId?: string;
  financialRecordId?: string;
  reminderOffsets: number[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  entityType: "document" | "financialRecord" | "calendarEvent" | "settings";
  entityId: string;
  action: "created" | "updated" | "archived" | "deleted" | "exported";
  createdAt: string;
}

export interface LifeHubSnapshot {
  documents: DocumentRecord[];
  financialRecords: FinancialRecord[];
  calendarEvents: CalendarEvent[];
  settings: AppSetting[];
}

export const DOCUMENT_CATEGORIES = [
  "Energia",
  "Água",
  "Internet",
  "Telefone",
  "Boleto",
  "Fatura",
  "Nota fiscal",
  "Comprovante",
  "Contrato",
  "Documento pessoal",
  "Saúde",
  "Veículo",
  "Seguro",
  "Imposto",
  "Educação",
  "Viagem",
  "Garantia",
  "Assinatura",
  "Outros",
];

export const FINANCE_CATEGORIES = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Compras",
  "Viagens",
  "Impostos",
  "Pets",
  "Seguros",
  "Dívidas",
  "Investimentos",
  "Trabalho",
  "Cuidados pessoais",
  "Presentes",
  "Outros",
];
