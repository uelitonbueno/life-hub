import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  clearDemoData,
  deleteCalendarEvent,
  deleteDocument,
  deleteFinancialRecord,
  exportLifeHubData,
  getLifeHubSnapshot,
  lifeHubDb,
  saveCalendarEvent,
  saveDocument,
  saveFinancialRecord,
  seedDemoData,
} from "../client/src/lib/lifehub-db";

beforeEach(async () => {
  lifeHubDb.close();
  await lifeHubDb.delete();
  await lifeHubDb.open();
});

afterAll(() => {
  lifeHubDb.close();
});

describe("repositório local do Life Hub", () => {
  it("migra uma base legada sem apagar documentos existentes", async () => {
    lifeHubDb.close();
    await lifeHubDb.delete();
    const legacy = new Dexie("lifehub-local");
    legacy.version(1).stores({
      documents: "id, status, category, dueAt, expiresAt, createdAt, favorite, archived",
      financialRecords: "id, status, category, dueAt, occurredAt, createdAt",
      calendarEvents: "id, startsAt, type, personId",
      settings: "key",
      auditLogs: "id, entityType, entityId, createdAt",
    });
    await legacy.open();
    await legacy.table("documents").put({
      id: "legacy-document",
      title: "Contrato legado",
      category: "Contrato",
      status: "confirmed",
      source: "manual",
      favorite: false,
      archived: false,
      createdAt: new Date("2026-08-01").toISOString(),
      updatedAt: new Date("2026-08-01").toISOString(),
    });
    legacy.close();

    const migrated = await getLifeHubSnapshot();
    expect(migrated.documents).toHaveLength(1);
    expect(migrated.documents[0]?.title).toBe("Contrato legado");
    expect(await lifeHubDb.schemaMeta.get("schema-version")).toMatchObject({ value: 2 });
  });

  it("inclui a demonstração de forma idempotente e remove somente seus registros", async () => {
    await seedDemoData();
    await seedDemoData();

    const seeded = await getLifeHubSnapshot();
    expect(seeded.documents).toHaveLength(3);
    expect(seeded.financialRecords).toHaveLength(4);
    expect(seeded.calendarEvents).toHaveLength(3);

    await clearDemoData();
    const cleared = await getLifeHubSnapshot();
    expect(cleared.documents).toHaveLength(0);
    expect(cleared.financialRecords).toHaveLength(0);
    expect(cleared.calendarEvents).toHaveLength(0);
  });

  it("persiste, exclui e audita documentos e lançamentos sem afetar outros registros", async () => {
    const document = await saveDocument({
      title: "Conta de energia",
      category: "Energia",
      status: "needs_review",
      source: "manual",
      favorite: false,
      archived: false,
    });
    const finance = await saveFinancialRecord({
      title: "Conta de energia",
      category: "Moradia",
      amount: 173.5,
      status: "pending",
      occurredAt: new Date("2026-08-17").toISOString(),
      recurrent: true,
    });

    await deleteDocument(document.id);
    const afterDocumentDelete = await getLifeHubSnapshot();
    expect(afterDocumentDelete.documents).toHaveLength(0);
    expect(afterDocumentDelete.financialRecords).toHaveLength(1);

    await deleteFinancialRecord(finance.id);
    const afterFinanceDelete = await getLifeHubSnapshot();
    expect(afterFinanceDelete.financialRecords).toHaveLength(0);
    const deletedActions = await lifeHubDb.auditLogs.filter(log => log.action === "deleted").toArray();
    expect(deletedActions).toHaveLength(2);
  });

  it("preserva recorrência na agenda e gera uma exportação estruturada versionada", async () => {
    const event = await saveCalendarEvent({
      title: "Renovar seguro",
      type: "expiry",
      startsAt: new Date("2026-08-22T09:00:00.000Z").toISOString(),
      allDay: false,
      recurrence: "Anualmente",
      reminderOffsets: [10080],
    });

    const stored = await getLifeHubSnapshot();
    expect(stored.calendarEvents[0]).toMatchObject({ id: event.id, recurrence: "Anualmente" });

    const exported = JSON.parse(await exportLifeHubData()) as { version: number; calendarEvents: Array<{ recurrence?: string }> };
    expect(exported.version).toBe(2);
    expect(exported.calendarEvents).toHaveLength(1);
    expect(exported.calendarEvents[0]?.recurrence).toBe("Anualmente");

    await deleteCalendarEvent(event.id);
    expect((await getLifeHubSnapshot()).calendarEvents).toHaveLength(0);
  });
});
