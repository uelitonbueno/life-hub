import type { CalendarEvent, DocumentRecord, FinancialRecord } from "./lifehub-domain";

const iso = (daysFromToday: number, hour = 12) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString();
};

const id = (name: string) => `demo-${name}`;

export function getDemoDocuments(): DocumentRecord[] {
  const now = iso(0);
  return [
    {
      id: id("internet-aurora"),
      title: "Fatura de internet Aurora",
      category: "Internet",
      status: "needs_review",
      source: "file",
      fileName: "fatura-internet-aurora.pdf",
      dueAt: iso(5),
      amount: 119.9,
      supplier: "Aurora Fibra",
      confidence: 0.74,
      favorite: false,
      archived: false,
      isDemo: true,
      createdAt: iso(-2),
      updatedAt: now,
    },
    {
      id: id("contrato-residencia"),
      title: "Contrato — Residência Horizonte",
      category: "Contrato",
      status: "confirmed",
      source: "file",
      fileName: "contrato-residencia-horizonte.pdf",
      issuedAt: iso(-160),
      expiresAt: iso(198),
      supplier: "Horizonte Gestão",
      confidence: 1,
      favorite: true,
      archived: false,
      isDemo: true,
      createdAt: iso(-160),
      updatedAt: now,
    },
    {
      id: id("garantia-cafeteira"),
      title: "Garantia — Cafeteira Alba",
      category: "Garantia",
      status: "new",
      source: "manual",
      expiresAt: iso(42),
      supplier: "Casa Alba",
      confidence: 1,
      favorite: false,
      archived: false,
      isDemo: true,
      createdAt: iso(-1),
      updatedAt: now,
    },
  ];
}

export function getDemoFinancialRecords(): FinancialRecord[] {
  const now = iso(0);
  return [
    {
      id: id("aluguel"),
      title: "Aluguel — Residência Horizonte",
      category: "Moradia",
      amount: 2450,
      status: "pending",
      occurredAt: iso(0),
      dueAt: iso(3),
      supplier: "Horizonte Gestão",
      recurrent: true,
      isDemo: true,
      createdAt: iso(-6),
      updatedAt: now,
    },
    {
      id: id("plano-saude"),
      title: "Plano de saúde",
      category: "Saúde",
      amount: 689.4,
      status: "paid",
      occurredAt: iso(-4),
      dueAt: iso(-4),
      supplier: "Viva Bem",
      recurrent: true,
      isDemo: true,
      createdAt: iso(-10),
      updatedAt: now,
    },
    {
      id: id("mercado"),
      title: "Mercado da semana",
      category: "Alimentação",
      amount: 276.85,
      status: "paid",
      occurredAt: iso(-2),
      supplier: "Mercado Central",
      recurrent: false,
      isDemo: true,
      createdAt: iso(-2),
      updatedAt: now,
    },
    {
      id: id("lumi"),
      title: "Assinatura Lumi",
      category: "Assinaturas",
      amount: 34.9,
      status: "overdue",
      occurredAt: iso(-1),
      dueAt: iso(-1),
      supplier: "Lumi",
      recurrent: true,
      isDemo: true,
      createdAt: iso(-31),
      updatedAt: now,
    },
  ];
}

export function getDemoEvents(): CalendarEvent[] {
  const now = iso(0);
  return [
    {
      id: id("consulta"),
      title: "Consulta de rotina",
      type: "medical",
      description: "Levar resultados do último exame.",
      startsAt: iso(2, 10),
      endsAt: iso(2, 11),
      allDay: false,
      location: "Clínica Bem-Estar",
      reminderOffsets: [1440, 120],
      isDemo: true,
      createdAt: iso(-4),
      updatedAt: now,
    },
    {
      id: id("renovacao"),
      title: "Revisar renovação do seguro",
      type: "expiry",
      startsAt: iso(8, 9),
      allDay: true,
      reminderOffsets: [10080],
      isDemo: true,
      createdAt: iso(-5),
      updatedAt: now,
    },
    {
      id: id("aniversario"),
      title: "Aniversário de Clara",
      type: "birthday",
      startsAt: iso(14, 12),
      allDay: true,
      reminderOffsets: [10080],
      isDemo: true,
      createdAt: iso(-30),
      updatedAt: now,
    },
  ];
}
