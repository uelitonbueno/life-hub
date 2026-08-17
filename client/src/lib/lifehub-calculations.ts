import type { CalendarEvent, DocumentRecord, FinancialRecord } from "./lifehub-domain";

export type FinanceSummary = {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  categoryTotals: Array<{ category: string; amount: number }>;
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShortDate(value?: string) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

export function calculateFinanceSummary(records: FinancialRecord[], from?: Date, to?: Date): FinanceSummary {
  const periodRecords = records.filter(record => {
    const date = new Date(record.occurredAt);
    return (!from || date >= from) && (!to || date <= to);
  });

  const categoryMap = new Map<string, number>();
  periodRecords.forEach(record => {
    if (record.status !== "cancelled") {
      categoryMap.set(record.category, (categoryMap.get(record.category) ?? 0) + record.amount);
    }
  });

  return {
    total: periodRecords.filter(record => record.status !== "cancelled").reduce((sum, record) => sum + record.amount, 0),
    paid: periodRecords.filter(record => record.status === "paid").reduce((sum, record) => sum + record.amount, 0),
    pending: periodRecords.filter(record => record.status === "pending").reduce((sum, record) => sum + record.amount, 0),
    overdue: periodRecords.filter(record => record.status === "overdue").reduce((sum, record) => sum + record.amount, 0),
    categoryTotals: Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export function getDashboardData(
  documents: DocumentRecord[],
  financialRecords: FinancialRecord[],
  calendarEvents: CalendarEvent[],
  now = new Date(),
) {
  const today = startOfDay(now);
  const inThirtyDays = new Date(today);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);
  const finance = calculateFinanceSummary(financialRecords);
  const nextEvent = calendarEvents
    .filter(event => new Date(event.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const dueSoon = financialRecords
    .filter(record => record.status === "pending" && record.dueAt)
    .filter(record => {
      const due = new Date(record.dueAt!);
      return due >= today && due <= inThirtyDays;
    })
    .reduce((sum, record) => sum + record.amount, 0);

  return {
    dueSoon,
    finance,
    nextEvent,
    documentsToReview: documents.filter(document => document.status === "needs_review" && !document.archived).length,
    unpaidBills: financialRecords.filter(record => record.status === "pending" || record.status === "overdue").length,
    activeDocuments: documents.filter(document => !document.archived).length,
    inbox: [...documents]
      .filter(document => !document.archived)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4),
  };
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}
