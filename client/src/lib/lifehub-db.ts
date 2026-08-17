import Dexie, { type Table } from "dexie";
import { getDemoDocuments, getDemoEvents, getDemoFinancialRecords } from "./lifehub-data";
import type { AppSetting, AuditLog, CalendarEvent, DocumentRecord, FinancialRecord, LifeHubSnapshot } from "./lifehub-domain";

type SchemaMeta = { key: string; value: number; updatedAt: string };

class LifeHubDatabase extends Dexie {
  documents!: Table<DocumentRecord, string>;
  financialRecords!: Table<FinancialRecord, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  settings!: Table<AppSetting, string>;
  auditLogs!: Table<AuditLog, string>;
  schemaMeta!: Table<SchemaMeta, string>;

  constructor() {
    super("lifehub-local");
    this.version(1).stores({
      documents: "id, status, category, dueAt, expiresAt, createdAt, favorite, archived",
      financialRecords: "id, status, category, dueAt, occurredAt, createdAt",
      calendarEvents: "id, startsAt, type, personId",
      settings: "key",
      auditLogs: "id, entityType, entityId, createdAt",
    });
    this.version(2)
      .stores({
        documents: "id, status, category, dueAt, expiresAt, createdAt, favorite, archived",
        financialRecords: "id, status, category, dueAt, occurredAt, createdAt",
        calendarEvents: "id, startsAt, type, personId, recurrence",
        settings: "key",
        auditLogs: "id, entityType, entityId, createdAt",
        schemaMeta: "&key, updatedAt",
      })
      .upgrade(async transaction => {
        await transaction.table("schemaMeta").put({ key: "schema-version", value: 2, updatedAt: new Date().toISOString() });
      });
  }
}

export const lifeHubDb = new LifeHubDatabase();

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();

async function audit(entityType: AuditLog["entityType"], entityId: string, action: AuditLog["action"]) {
  await lifeHubDb.auditLogs.add({ id: makeId(), entityType, entityId, action, createdAt: now() });
}

async function ensureDatabaseOpen() {
  await lifeHubDb.open();
  await lifeHubDb.schemaMeta.put({ key: "schema-version", value: 2, updatedAt: now() });
}

export async function getLifeHubSnapshot(): Promise<LifeHubSnapshot> {
  await ensureDatabaseOpen();
  const [documents, financialRecords, calendarEvents, settings] = await Promise.all([
    lifeHubDb.documents.orderBy("createdAt").reverse().toArray(),
    lifeHubDb.financialRecords.orderBy("occurredAt").reverse().toArray(),
    lifeHubDb.calendarEvents.orderBy("startsAt").toArray(),
    lifeHubDb.settings.toArray(),
  ]);
  return { documents, financialRecords, calendarEvents, settings };
}

export async function saveDocument(input: Omit<DocumentRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const existing = input.id ? await lifeHubDb.documents.get(input.id) : undefined;
  const record: DocumentRecord = { ...input, id: input.id ?? makeId(), createdAt: existing?.createdAt ?? now(), updatedAt: now() };
  await lifeHubDb.documents.put(record);
  await audit("document", record.id, existing ? "updated" : "created");
  return record;
}

export async function archiveDocument(id: string) {
  await lifeHubDb.documents.update(id, { archived: true, updatedAt: now() });
  await audit("document", id, "archived");
}

export async function deleteDocument(id: string) {
  await lifeHubDb.documents.delete(id);
  await audit("document", id, "deleted");
}

export async function saveFinancialRecord(input: Omit<FinancialRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const existing = input.id ? await lifeHubDb.financialRecords.get(input.id) : undefined;
  const record: FinancialRecord = { ...input, id: input.id ?? makeId(), createdAt: existing?.createdAt ?? now(), updatedAt: now() };
  await lifeHubDb.financialRecords.put(record);
  await audit("financialRecord", record.id, existing ? "updated" : "created");
  return record;
}

export async function deleteFinancialRecord(id: string) {
  await lifeHubDb.financialRecords.delete(id);
  await audit("financialRecord", id, "deleted");
}

export async function saveCalendarEvent(input: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const existing = input.id ? await lifeHubDb.calendarEvents.get(input.id) : undefined;
  const record: CalendarEvent = { ...input, id: input.id ?? makeId(), createdAt: existing?.createdAt ?? now(), updatedAt: now() };
  await lifeHubDb.calendarEvents.put(record);
  await audit("calendarEvent", record.id, existing ? "updated" : "created");
  return record;
}

export async function deleteCalendarEvent(id: string) {
  await lifeHubDb.calendarEvents.delete(id);
  await audit("calendarEvent", id, "deleted");
}

export async function seedDemoData() {
  await ensureDatabaseOpen();
  await lifeHubDb.transaction("rw", lifeHubDb.documents, lifeHubDb.financialRecords, lifeHubDb.calendarEvents, lifeHubDb.settings, async () => {
    const hasDemo = await lifeHubDb.settings.get("demo-seeded");
    if (hasDemo) return;
    await lifeHubDb.documents.bulkPut(getDemoDocuments());
    await lifeHubDb.financialRecords.bulkPut(getDemoFinancialRecords());
    await lifeHubDb.calendarEvents.bulkPut(getDemoEvents());
    await lifeHubDb.settings.put({ key: "demo-seeded", value: true, updatedAt: now() });
  });
}

export async function clearDemoData() {
  await ensureDatabaseOpen();
  await lifeHubDb.transaction("rw", lifeHubDb.documents, lifeHubDb.financialRecords, lifeHubDb.calendarEvents, lifeHubDb.settings, async () => {
    const [documents, finances, events] = await Promise.all([
      lifeHubDb.documents.filter(record => record.isDemo === true).primaryKeys(),
      lifeHubDb.financialRecords.filter(record => record.isDemo === true).primaryKeys(),
      lifeHubDb.calendarEvents.filter(record => record.isDemo === true).primaryKeys(),
    ]);
    await Promise.all([
      lifeHubDb.documents.bulkDelete(documents),
      lifeHubDb.financialRecords.bulkDelete(finances),
      lifeHubDb.calendarEvents.bulkDelete(events),
      lifeHubDb.settings.delete("demo-seeded"),
    ]);
  });
}

export async function setLifeHubSetting(key: string, value: unknown) {
  await lifeHubDb.settings.put({ key, value, updatedAt: now() });
  await audit("settings", key, "updated");
}

export async function exportLifeHubData() {
  const snapshot = await getLifeHubSnapshot();
  await audit("settings", "local-export", "exported");
  return JSON.stringify({ exportedAt: now(), version: 2, ...snapshot }, null, 2);
}
