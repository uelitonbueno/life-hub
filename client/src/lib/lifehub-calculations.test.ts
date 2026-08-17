import { describe, expect, it } from "vitest";
import { calculateFinanceSummary, getDashboardData } from "./lifehub-calculations";
import type { CalendarEvent, DocumentRecord, FinancialRecord } from "./lifehub-domain";

const timestamp = (value: string) => new Date(value).toISOString();

describe("cálculos do Life Hub", () => {
  it("calcula totais financeiros por status e categoria a partir dos registros", () => {
    const records: FinancialRecord[] = [
      { id: "1", title: "Moradia", category: "Moradia", amount: 1200, status: "paid", occurredAt: timestamp("2026-08-01"), recurrent: true, createdAt: timestamp("2026-08-01"), updatedAt: timestamp("2026-08-01") },
      { id: "2", title: "Mercado", category: "Alimentação", amount: 350, status: "pending", occurredAt: timestamp("2026-08-02"), recurrent: false, createdAt: timestamp("2026-08-02"), updatedAt: timestamp("2026-08-02") },
      { id: "3", title: "Seguro", category: "Seguros", amount: 180, status: "overdue", occurredAt: timestamp("2026-08-03"), recurrent: false, createdAt: timestamp("2026-08-03"), updatedAt: timestamp("2026-08-03") },
      { id: "4", title: "Cancelado", category: "Lazer", amount: 90, status: "cancelled", occurredAt: timestamp("2026-08-04"), recurrent: false, createdAt: timestamp("2026-08-04"), updatedAt: timestamp("2026-08-04") },
    ];

    const summary = calculateFinanceSummary(records);

    expect(summary.total).toBe(1730);
    expect(summary.paid).toBe(1200);
    expect(summary.pending).toBe(350);
    expect(summary.overdue).toBe(180);
    expect(summary.categoryTotals).toEqual([
      { category: "Moradia", amount: 1200 },
      { category: "Alimentação", amount: 350 },
      { category: "Seguros", amount: 180 },
    ]);
  });

  it("monta o resumo do dashboard usando registros persistidos e o próximo evento futuro", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    const documents: DocumentRecord[] = [
      { id: "doc-1", title: "Conta de energia", category: "Energia", status: "needs_review", source: "manual", favorite: false, archived: false, createdAt: timestamp("2026-08-16"), updatedAt: timestamp("2026-08-16") },
      { id: "doc-2", title: "Contrato", category: "Contrato", status: "confirmed", source: "manual", favorite: false, archived: true, createdAt: timestamp("2026-08-10"), updatedAt: timestamp("2026-08-10") },
    ];
    const financialRecords: FinancialRecord[] = [
      { id: "fin-1", title: "Aluguel", category: "Moradia", amount: 2100, status: "pending", occurredAt: timestamp("2026-08-17"), dueAt: timestamp("2026-08-20"), recurrent: true, createdAt: timestamp("2026-08-17"), updatedAt: timestamp("2026-08-17") },
      { id: "fin-2", title: "Mercado", category: "Alimentação", amount: 220, status: "paid", occurredAt: timestamp("2026-08-16"), recurrent: false, createdAt: timestamp("2026-08-16"), updatedAt: timestamp("2026-08-16") },
    ];
    const events: CalendarEvent[] = [
      { id: "event-1", title: "Evento passado", type: "appointment", startsAt: timestamp("2026-08-15"), allDay: true, reminderOffsets: [], createdAt: timestamp("2026-08-15"), updatedAt: timestamp("2026-08-15") },
      { id: "event-2", title: "Consulta", type: "medical", startsAt: timestamp("2026-08-19"), allDay: false, reminderOffsets: [], createdAt: timestamp("2026-08-16"), updatedAt: timestamp("2026-08-16") },
    ];

    const dashboard = getDashboardData(documents, financialRecords, events, now);

    expect(dashboard.dueSoon).toBe(2100);
    expect(dashboard.documentsToReview).toBe(1);
    expect(dashboard.activeDocuments).toBe(1);
    expect(dashboard.unpaidBills).toBe(1);
    expect(dashboard.nextEvent?.title).toBe("Consulta");
    expect(dashboard.inbox).toHaveLength(1);
  });
});
