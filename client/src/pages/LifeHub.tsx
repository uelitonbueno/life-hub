import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  archiveDocument,
  clearDemoData,
  deleteCalendarEvent,
  deleteDocument,
  deleteFinancialRecord,
  exportLifeHubData,
  getLifeHubSnapshot,
  saveCalendarEvent,
  saveDocument,
  saveFinancialRecord,
  seedDemoData,
} from "@/lib/lifehub-db";
import {
  calculateFinanceSummary,
  formatCurrency,
  formatShortDate,
  getDashboardData,
  getInitials,
} from "@/lib/lifehub-calculations";
import {
  DOCUMENT_CATEGORIES,
  FINANCE_CATEGORIES,
  type CalendarEvent,
  type DocumentRecord,
  type DocumentStatus,
  type EventType,
  type FinancialRecord,
  type FinancialStatus,
  type LifeHubSnapshot,
} from "@/lib/lifehub-domain";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AreaChart,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarClock,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Command,
  Download,
  FileCheck2,
  FileText,
  FolderHeart,
  Home,
  Landmark,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Moon,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Tag,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLocation } from "wouter";

type Modal = "document" | "finance" | "event" | null;
type DocumentFilter = "all" | "recent" | "review" | "favorites";

const navigation = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/finance", label: "Finanças", icon: WalletCards },
  { href: "/calendar", label: "Agenda", icon: CalendarClock },
  { href: "/more", label: "Mais", icon: MoreHorizontal },
];

const pageMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/": { eyebrow: "Seu espaço pessoal", title: "Visão geral", description: "O que merece sua atenção hoje, com contexto e tranquilidade." },
  "/documents": { eyebrow: "Biblioteca pessoal", title: "Documentos", description: "Guarde, revise e encontre informações importantes com facilidade." },
  "/finance": { eyebrow: "Clareza financeira", title: "Finanças", description: "Acompanhe o que entrou, o que foi pago e o que está por vir." },
  "/calendar": { eyebrow: "Seu tempo", title: "Agenda", description: "Organize compromissos, lembretes e datas que importam." },
  "/more": { eyebrow: "Vida conectada", title: "Mais do Life Hub", description: "Estruture outras áreas da sua vida no seu próprio ritmo." },
  "/settings": { eyebrow: "Controle pessoal", title: "Configurações", description: "Aparência, privacidade e dados armazenados no seu navegador." },
};

const statusLabel: Record<DocumentStatus | FinancialStatus, string> = {
  new: "Novo",
  processing: "Processando",
  needs_review: "Revisar",
  confirmed: "Confirmado",
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const eventLabels: Record<EventType, string> = {
  appointment: "Compromisso",
  medical: "Saúde",
  birthday: "Aniversário",
  bill: "Conta",
  expiry: "Vencimento",
  reminder: "Lembrete",
};

const colors = ["#2F80ED", "#6FAF8B", "#D99A2B", "#7D6CEB", "#D9655D", "#65A8A6"];

function useLifeHubSnapshot() {
  const [snapshot, setSnapshot] = useState<LifeHubSnapshot>({ documents: [], financialRecords: [], calendarEvents: [], settings: [] });
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await getLifeHubSnapshot());
    } catch {
      toast.error("Não foi possível abrir seus dados locais.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { snapshot, loading, refresh };
}

export default function LifeHub() {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { snapshot, loading, refresh } = useLifeHubSnapshot();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | undefined>();
  const [editingFinance, setEditingFinance] = useState<FinancialRecord | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [confirmClear, setConfirmClear] = useState(false);
  const meta = pageMeta[location] ?? pageMeta["/"];
  const hasData = snapshot.documents.length + snapshot.financialRecords.length + snapshot.calendarEvents.length > 0;

  const searchResults = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return [];
    const documents = snapshot.documents.filter(item => `${item.title} ${item.category}`.toLowerCase().includes(term)).map(item => ({ id: item.id, title: item.title, detail: `Documento · ${item.category}`, href: "/documents" }));
    const finances = snapshot.financialRecords.filter(item => `${item.title} ${item.category}`.toLowerCase().includes(term)).map(item => ({ id: item.id, title: item.title, detail: `Financeiro · ${item.category}`, href: "/finance" }));
    const events = snapshot.calendarEvents.filter(item => `${item.title} ${item.type}`.toLowerCase().includes(term)).map(item => ({ id: item.id, title: item.title, detail: `Agenda · ${eventLabels[item.type]}`, href: "/calendar" }));
    return [...documents, ...finances, ...events].slice(0, 8);
  }, [search, snapshot]);

  const navigate = (href: string) => {
    setLocation(href);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const openNew = (type: Modal) => {
    setEditingDocument(undefined);
    setEditingFinance(undefined);
    setEditingEvent(undefined);
    setModal(type);
  };

  const loadDemo = async () => {
    await seedDemoData();
    await refresh();
    toast.success("Dados de demonstração carregados no navegador.");
  };

  const clearDemo = async () => {
    await clearDemoData();
    await refresh();
    setConfirmClear(false);
    toast.success("Dados de demonstração removidos.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="lh-sidebar hidden lg:flex">
        <div className="flex h-full flex-col px-4 py-5">
          <Brand />
          <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Central pessoal</div>
          <nav className="mt-3 space-y-1" aria-label="Navegação principal">
            {navigation.map(item => <NavItem key={item.href} item={item} active={location === item.href} onClick={() => navigate(item.href)} />)}
          </nav>
          <div className="mt-auto space-y-3">
            <button onClick={() => navigate("/settings")} className={cn("lh-nav-item", location === "/settings" && "lh-nav-item-active")}>
              <Settings size={18} /><span>Configurações</span>
            </button>
            <div className="rounded-2xl bg-primary/[0.07] p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck size={17} /> Seus dados, seu controle</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Tudo fica armazenado localmente neste navegador.</p>
            </div>
            <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {theme === "dark" ? <SunMedium size={17} /> : <Moon size={17} />}<span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="lh-header">
          <div className="flex items-center gap-3 lg:hidden"><button className="lh-icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><Brand compact /></div>
          <div className="hidden min-w-0 lg:block"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{meta.eyebrow}</p><h1 className="mt-1 text-xl font-semibold tracking-tight">{meta.title}</h1></div>
          <div className="ml-auto flex items-center gap-2">
            <button className="lh-search-trigger hidden sm:flex" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Buscar no Life Hub</span><kbd><Command size={11} />K</kbd></button>
            <button className="lh-icon-button sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Buscar"><Search size={19} /></button>
            <button className="lh-icon-button hidden sm:flex" onClick={toggleTheme} aria-label="Alternar tema">{theme === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}</button>
            <button className="lh-icon-button relative" aria-label="Lembretes"><BellRing size={18} /><span className="absolute right-2 top-2 block h-1.5 w-1.5 rounded-full bg-warning" /></button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-[#20252B] text-xs font-bold text-white sm:flex">LH</div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-10">
          <div className="mb-7 lg:hidden"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{meta.eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{meta.title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{meta.description}</p></div>
          {loading ? <LoadingState /> : !hasData && location === "/" ? <WelcomeState onDemo={loadDemo} onCreate={() => openNew("document")} /> : (
            <PageRouter
              path={location}
              snapshot={snapshot}
              onCreate={openNew}
              onEditDocument={document => { setEditingDocument(document); setModal("document"); }}
              onEditFinance={record => { setEditingFinance(record); setModal("finance"); }}
              onEditEvent={event => { setEditingEvent(event); setModal("event"); }}
              onRefresh={refresh}
              onClearDemo={() => setConfirmClear(true)}
              onLoadDemo={loadDemo}
            />
          )}
        </main>
      </div>

      <nav className="lh-bottom-nav lg:hidden" aria-label="Navegação mobile">
        {navigation.map(item => <button key={item.href} onClick={() => navigate(item.href)} className={cn("lh-bottom-nav-item", location === item.href && "lh-bottom-nav-item-active")}><item.icon size={19} /><span>{item.label}</span></button>)}
      </nav>

      <div className={cn("fixed inset-0 z-50 transition", mobileMenuOpen ? "visible" : "invisible")}>
        <button className={cn("absolute inset-0 bg-[#20252B]/35 backdrop-blur-[1px] transition-opacity", mobileMenuOpen ? "opacity-100" : "opacity-0")} onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" />
        <div className={cn("absolute bottom-0 left-0 top-0 flex w-[282px] flex-col bg-card px-4 py-5 shadow-2xl transition-transform", mobileMenuOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between"><Brand /><button className="lh-icon-button" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar"><X size={19} /></button></div>
          <nav className="mt-10 space-y-1">{navigation.map(item => <NavItem key={item.href} item={item} active={location === item.href} onClick={() => navigate(item.href)} />)}<button onClick={() => navigate("/settings")} className={cn("lh-nav-item mt-2", location === "/settings" && "lh-nav-item-active")}><Settings size={18} /><span>Configurações</span></button></nav>
        </div>
      </div>

      <SearchDialog open={searchOpen} search={search} results={searchResults} onSearch={setSearch} onClose={() => setSearchOpen(false)} onNavigate={navigate} />
      <DocumentDialog open={modal === "document"} record={editingDocument} onClose={() => setModal(null)} onSaved={refresh} />
      <FinanceDialog open={modal === "finance"} record={editingFinance} onClose={() => setModal(null)} onSaved={refresh} />
      <EventDialog open={modal === "event"} record={editingEvent} onClose={() => setModal(null)} onSaved={refresh} />
      <ConfirmDialog open={confirmClear} title="Remover dados de demonstração?" description="Apenas os registros identificados como demonstração serão removidos. Seus dados criados manualmente não serão afetados." confirmLabel="Remover dados" onClose={() => setConfirmClear(false)} onConfirm={clearDemo} />
    </div>
  );
}

function PageRouter(props: {
  path: string; snapshot: LifeHubSnapshot; onCreate: (modal: Modal) => void; onEditDocument: (item: DocumentRecord) => void; onEditFinance: (item: FinancialRecord) => void; onEditEvent: (item: CalendarEvent) => void; onRefresh: () => Promise<void>; onClearDemo: () => void; onLoadDemo: () => Promise<void>;
}) {
  if (props.path === "/documents") return <DocumentsPage {...props} />;
  if (props.path === "/finance") return <FinancePage {...props} />;
  if (props.path === "/calendar") return <CalendarPage {...props} />;
  if (props.path === "/more") return <MorePage />;
  if (props.path === "/settings") return <SettingsPage {...props} />;
  return <DashboardPage {...props} />;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-white shadow-[0_8px_20px_rgba(47,128,237,.26)]">L</div>{!compact && <div><div className="font-display text-[17px] font-semibold tracking-[-0.04em]">Life Hub</div><div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Sua vida, reunida</div></div>}</div>;
}

function NavItem({ item, active, onClick }: { item: typeof navigation[number]; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn("lh-nav-item", active && "lh-nav-item-active")}><item.icon size={18} strokeWidth={active ? 2.3 : 1.9} /><span>{item.label}</span></button>;
}

function LoadingState() { return <div className="grid gap-5 xl:grid-cols-3"><div className="lh-shimmer h-48 xl:col-span-2" /><div className="lh-shimmer h-48" /><div className="lh-shimmer h-72 xl:col-span-3" /></div>; }

function WelcomeState({ onDemo, onCreate }: { onDemo: () => Promise<void>; onCreate: () => void }) {
  return <section className="lh-welcome"><div className="lh-welcome-orb lh-welcome-orb-one" /><div className="lh-welcome-orb lh-welcome-orb-two" /><div className="relative z-10 max-w-2xl"><span className="lh-kicker"><Sparkles size={14} /> Tudo em um só lugar</span><h2>Um espaço calmo para cuidar da vida que acontece fora da tela.</h2><p>Life Hub organiza seus documentos, contas e compromissos diretamente neste navegador. Você começa do seu jeito: com seus próprios registros ou com uma demonstração para conhecer a experiência.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="lh-primary-button" onClick={onCreate}><Plus size={18} /> Criar primeiro documento</Button><Button size="lg" variant="outline" className="lh-secondary-button" onClick={() => void onDemo()}><PackageCheck size={18} /> Carregar demonstração</Button></div><p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} className="text-success" /> Seus dados ficam armazenados localmente neste navegador.</p></div></section>;
}

function DashboardPage({ snapshot, onCreate }: { snapshot: LifeHubSnapshot; onCreate: (modal: Modal) => void }) {
  const dashboard = getDashboardData(snapshot.documents, snapshot.financialRecords, snapshot.calendarEvents);
  const chartData = dashboard.finance.categoryTotals.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return <div className="space-y-6">
    <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-sm text-muted-foreground">{greeting}. Aqui está o panorama do seu dia.</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.04em]">Tudo sob controle, <span className="text-primary">sem excesso.</span></h2></div><div className="flex flex-wrap gap-2"><QuickButton icon={FileText} label="Documento" onClick={() => onCreate("document")} /><QuickButton icon={WalletCards} label="Conta" onClick={() => onCreate("finance")} /><QuickButton icon={CalendarClock} label="Evento" onClick={() => onCreate("event")} /></div></section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={Landmark} label="A vencer" value={formatCurrency(dashboard.dueSoon)} note="nos próximos 30 dias" tone="blue" />
      <MetricCard icon={WalletCards} label="Gastos do período" value={formatCurrency(dashboard.finance.total)} note={`${formatCurrency(dashboard.finance.paid)} já foram pagos`} tone="slate" />
      <MetricCard icon={FileCheck2} label="Documentos" value={String(dashboard.activeDocuments)} note={`${dashboard.documentsToReview} aguardando revisão`} tone="gold" />
      <MetricCard icon={CalendarClock} label="Próximo evento" value={dashboard.nextEvent ? formatShortDate(dashboard.nextEvent.startsAt) : "Sem eventos"} note={dashboard.nextEvent?.title ?? "Crie um compromisso quando quiser"} tone="green" />
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.28fr_.72fr]">
      <article className="lh-card min-h-[324px] p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="lh-section-eyebrow">Visão financeira</p><h3 className="mt-1 text-lg font-semibold">Onde seu dinheiro está indo</h3></div><div className="flex h-9 items-center gap-1 rounded-xl bg-muted px-3 text-xs text-muted-foreground"><BarChart3 size={15} /> Atual</div></div><div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.15fr]"><div className="space-y-3"><div><p className="text-sm text-muted-foreground">Total do período</p><p className="mt-1 font-display text-3xl font-semibold tracking-[-0.04em]">{formatCurrency(dashboard.finance.total)}</p></div><div className="grid grid-cols-2 gap-2"><MiniStat label="Pago" value={formatCurrency(dashboard.finance.paid)} color="bg-success" /><MiniStat label="Pendente" value={formatCurrency(dashboard.finance.pending + dashboard.finance.overdue)} color="bg-warning" /></div></div><div className="h-48 min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={54} outerRadius={78} paddingAngle={5} stroke="none">{chartData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e6e5e1", boxShadow: "0 10px 30px rgba(32,37,43,.1)" }} /></PieChart></ResponsiveContainer></div></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{chartData.map((item, index) => <span key={item.category} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />{item.category}</span>)}</div></article>
      <article className="lh-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="lh-section-eyebrow">Próximo passo</p><h3 className="mt-1 text-lg font-semibold">Agenda em foco</h3></div><CalendarClock className="text-primary" size={22} /></div><div className="mt-6 space-y-4">{snapshot.calendarEvents.slice(0, 3).map((event, index) => <div key={event.id} className="flex gap-3"><div className={cn("mt-1 h-8 w-1 shrink-0 rounded-full", index === 0 ? "bg-primary" : "bg-border")} /><div><p className="text-sm font-medium">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatShortDate(event.startsAt)} · {event.allDay ? "Dia todo" : new Date(event.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}</div><div className="mt-7 rounded-2xl bg-success/[.10] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-[#4b8765]"><CircleHelp size={16} /> Lembretes com consentimento</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Nesta versão, seus lembretes ficam como dados internos. Alertas do navegador só serão usados com sua autorização.</p></div></article>
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><article className="lh-card overflow-hidden"><div className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-6"><div><p className="lh-section-eyebrow">Caixa de entrada</p><h3 className="mt-1 text-lg font-semibold">Documentos recentes</h3></div><FileText size={20} className="text-muted-foreground" /></div><div className="divide-y divide-border">{dashboard.inbox.map(document => <div key={document.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6"><DocumentIcon category={document.category} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.title}</p><p className="mt-1 text-xs text-muted-foreground">{document.category} · Atualizado {formatShortDate(document.updatedAt)}</p></div><StatusBadge status={document.status} /></div>)}</div></article><article className="lh-card p-5 sm:p-6"><p className="lh-section-eyebrow">Resumo do dia</p><h3 className="mt-1 text-lg font-semibold">Prioridades simples</h3><div className="mt-5 space-y-3"><SummaryRow icon={FileCheck2} text={`${dashboard.documentsToReview} documento${dashboard.documentsToReview === 1 ? "" : "s"} para revisar`} tone="gold" /><SummaryRow icon={WalletCards} text={`${dashboard.unpaidBills} conta${dashboard.unpaidBills === 1 ? "" : "s"} ainda não paga${dashboard.unpaidBills === 1 ? "" : "s"}`} tone="blue" /><SummaryRow icon={CalendarClock} text={dashboard.nextEvent ? `Próximo: ${dashboard.nextEvent.title}` : "Nenhum evento próximo"} tone="green" /></div></article></section>
  </div>;
}

function DocumentsPage({ snapshot, onCreate, onEditDocument, onRefresh }: { snapshot: LifeHubSnapshot; onCreate: (modal: Modal) => void; onEditDocument: (item: DocumentRecord) => void; onRefresh: () => Promise<void> }) {
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [term, setTerm] = useState("");
  const documents = useMemo(() => snapshot.documents.filter(document => {
    const matchesTerm = `${document.title} ${document.category}`.toLowerCase().includes(term.toLowerCase());
    if (!matchesTerm || document.archived) return false;
    if (filter === "review") return document.status === "needs_review";
    if (filter === "favorites") return document.favorite;
    if (filter === "recent") return Date.now() - new Date(document.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;
    return true;
  }), [filter, snapshot.documents, term]);
  const archive = async (id: string) => { await archiveDocument(id); await onRefresh(); toast.success("Documento arquivado."); };
  return <div className="space-y-6"><PageHeading title="Sua biblioteca, organizada com leveza." description="Crie registros manuais, acompanhe o que precisa de revisão e guarde dados importantes ao seu alcance." action={<Button className="lh-primary-button" onClick={() => onCreate("document")}><Plus size={17} /> Novo documento</Button>} /><section className="lh-card p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input className="h-11 rounded-xl border-border bg-muted/30 pl-10" placeholder="Buscar por título ou categoria" value={term} onChange={event => setTerm(event.target.value)} /></div><Tabs value={filter} onValueChange={value => setFilter(value as DocumentFilter)}><TabsList className="h-11 rounded-xl bg-muted/70 p-1"><TabsTrigger value="all" className="rounded-lg px-3 text-xs">Todos</TabsTrigger><TabsTrigger value="recent" className="rounded-lg px-3 text-xs">Recentes</TabsTrigger><TabsTrigger value="review" className="rounded-lg px-3 text-xs">Revisar</TabsTrigger><TabsTrigger value="favorites" className="rounded-lg px-3 text-xs">Favoritos</TabsTrigger></TabsList></Tabs></div></section><section className="lh-card overflow-hidden"><div className="hidden grid-cols-[1.3fr_.75fr_.65fr_.55fr_40px] gap-4 border-b border-border px-6 py-3 text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground md:grid"><span>Documento</span><span>Categoria</span><span>Status</span><span>Data</span><span /></div>{documents.length ? documents.map(document => <div key={document.id} className="group grid gap-3 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[1.3fr_.75fr_.65fr_.55fr_40px] md:items-center md:gap-4 md:px-6"><div className="flex min-w-0 items-center gap-3"><DocumentIcon category={document.category} /><div className="min-w-0"><p className="truncate text-sm font-medium">{document.title}</p><p className="mt-1 text-xs text-muted-foreground md:hidden">{document.category} · {formatShortDate(document.dueAt ?? document.createdAt)}</p></div></div><span className="hidden text-sm text-muted-foreground md:block">{document.category}</span><div><StatusBadge status={document.status} /></div><span className="hidden text-sm text-muted-foreground md:block">{formatShortDate(document.dueAt ?? document.createdAt)}</span><div className="flex items-center gap-1 md:justify-end"><button className="lh-row-action" onClick={() => onEditDocument(document)} aria-label="Editar documento"><Pencil size={15} /></button><button className="lh-row-action text-destructive hover:bg-destructive/10" onClick={() => void archive(document.id)} aria-label="Arquivar documento"><Trash2 size={15} /></button></div></div>) : <EmptyList icon={FileText} title="Nenhum documento por aqui" description="Ajuste os filtros ou adicione um documento para começar." actionLabel="Novo documento" onAction={() => onCreate("document")} />}</section></div>;
}

function FinancePage({ snapshot, onCreate, onEditFinance }: { snapshot: LifeHubSnapshot; onCreate: (modal: Modal) => void; onEditFinance: (item: FinancialRecord) => void }) {
  const [status, setStatus] = useState<"all" | FinancialStatus>("all");
  const [period, setPeriod] = useState("all");
  const filtered = useMemo(() => snapshot.financialRecords.filter(record => {
    if (status !== "all" && record.status !== status) return false;
    if (period === "month") { const now = new Date(); const date = new Date(record.occurredAt); return now.getMonth() === date.getMonth() && now.getFullYear() === date.getFullYear(); }
    return true;
  }), [period, snapshot.financialRecords, status]);
  const summary = calculateFinanceSummary(filtered);
  return <div className="space-y-6"><PageHeading title="Clareza para decidir com calma." description="Os indicadores são calculados a partir dos seus próprios registros, sempre no navegador." action={<Button className="lh-primary-button" onClick={() => onCreate("finance")}><Plus size={17} /> Novo lançamento</Button>} /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={WalletCards} label="Total" value={formatCurrency(summary.total)} note="no período selecionado" tone="slate" /><MetricCard icon={FileCheck2} label="Já pago" value={formatCurrency(summary.paid)} note="lançamentos confirmados" tone="green" /><MetricCard icon={Landmark} label="Pendente" value={formatCurrency(summary.pending)} note="aguardando pagamento" tone="blue" /><MetricCard icon={BellRing} label="Vencido" value={formatCurrency(summary.overdue)} note="merece sua atenção" tone="red" /></section><section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><article className="lh-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="lh-section-eyebrow">Distribuição</p><h3 className="mt-1 text-lg font-semibold">Por categoria</h3></div><AreaChart size={21} className="text-primary" /></div><div className="mt-5 h-[250px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary.categoryTotals.slice(0, 6)} dataKey="amount" nameKey="category" outerRadius={90} innerRadius={58} paddingAngle={4} stroke="none">{summary.categoryTotals.slice(0, 6).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e6e5e1" }} /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-x-4 gap-y-2">{summary.categoryTotals.slice(0, 6).map((item, index) => <span key={item.category} className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className="h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />{item.category}</span>)}</div></article><article className="lh-card p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row"><Select value={period} onValueChange={setPeriod}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo o histórico</SelectItem><SelectItem value="month">Este mês</SelectItem></SelectContent></Select><Select value={status} onValueChange={value => setStatus(value as "all" | FinancialStatus)}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="paid">Pagos</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="overdue">Vencidos</SelectItem><SelectItem value="cancelled">Cancelados</SelectItem></SelectContent></Select></div><div className="mt-4 divide-y divide-border">{filtered.length ? filtered.map(record => <button key={record.id} onClick={() => onEditFinance(record)} className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-muted/40"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/[.09] text-primary"><Tag size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{record.title}</strong><small className="mt-1 block text-xs text-muted-foreground">{record.category} · {formatShortDate(record.dueAt ?? record.occurredAt)}</small></span><span className="text-right"><strong className="block text-sm font-semibold">{formatCurrency(record.amount)}</strong><StatusBadge status={record.status} small /></span></button>) : <EmptyList icon={WalletCards} title="Nenhum lançamento encontrado" description="Experimente mudar os filtros ou crie um novo lançamento." actionLabel="Novo lançamento" onAction={() => onCreate("finance")} />}</div></article></section></div>;
}

function CalendarPage({ snapshot, onCreate, onEditEvent }: { snapshot: LifeHubSnapshot; onCreate: (modal: Modal) => void; onEditEvent: (item: CalendarEvent) => void }) {
  const events = [...snapshot.calendarEvents].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const upcoming = events.filter(event => new Date(event.startsAt) >= new Date());
  const monthDays = getMonthDays(new Date());
  return <div className="space-y-6"><PageHeading title="Tempo para o que realmente importa." description="Eventos e lembretes ficam organizados em uma visão local, sem notificações automáticas sem seu consentimento." action={<Button className="lh-primary-button" onClick={() => onCreate("event")}><Plus size={17} /> Novo evento</Button>} /><section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><article className="lh-calendar-card"><div className="flex items-center justify-between"><div><p className="lh-section-eyebrow">Hoje</p><h3 className="mt-1 text-2xl font-semibold capitalize">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</h3></div><CalendarClock size={24} className="text-primary" /></div><div className="mt-8 grid grid-cols-7 gap-1 text-center">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="text-[10px] font-bold text-muted-foreground">{day}</span>)}{monthDays.map((day, index) => { if (!day) return <span key={`empty-${index}`} />; const hasEvent = events.some(event => eventOccursOnDay(event, day)); const isToday = sameDay(day, new Date()); return <span key={day.toISOString()} className={cn("relative mx-auto grid h-9 w-9 place-items-center rounded-xl text-sm", isToday && "bg-primary font-semibold text-white", !isToday && hasEvent && "bg-primary/[.10] font-semibold text-primary")}>{day.getDate()}{hasEvent && !isToday && <i className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}</span>; })}</div><div className="mt-8 rounded-2xl bg-muted/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><BellRing size={16} className="text-primary" /> Lembretes no seu ritmo</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Você poderá habilitar alertas do navegador em uma etapa posterior, sempre por escolha explícita.</p></div></article><article className="lh-card overflow-hidden"><div className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-6"><div><p className="lh-section-eyebrow">Próximos eventos</p><h3 className="mt-1 text-lg font-semibold">O que vem pela frente</h3></div><span className="rounded-xl bg-primary/[.08] px-2.5 py-1 text-xs font-medium text-primary">{upcoming.length} futuros</span></div><div className="divide-y divide-border">{upcoming.length ? upcoming.map(event => <button key={event.id} onClick={() => onEditEvent(event)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/35 sm:px-6"><div className="w-12 shrink-0 text-center"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-primary">{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(event.startsAt)).replace(".", "")}</p><p className="font-display text-2xl font-semibold">{new Date(event.startsAt).getDate()}</p></div><div className="h-10 w-px bg-border" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{eventLabels[event.type]}{event.recurrence ? ` · ${event.recurrence}` : ""}{event.location ? ` · ${event.location}` : ""}</p></div><ChevronDown className="-rotate-90 text-muted-foreground" size={17} /></button>) : <EmptyList icon={CalendarClock} title="Nenhum evento futuro" description="Crie um compromisso para manter seu tempo organizado." actionLabel="Novo evento" onAction={() => onCreate("event")} />}</div></article></section></div>;
}

function MorePage() { const modules = [{ icon: UserRound, name: "Família & contatos", text: "Pessoas importantes, aniversários e vínculos familiares." }, { icon: Home, name: "Residências", text: "Informações do lar, contratos e contas relacionadas." }, { icon: FolderHeart, name: "Veículos & saúde", text: "Histórico, documentos e prazos que pedem atenção." }, { icon: PackageCheck, name: "Garantias & assinaturas", text: "Coberturas, renovações e serviços recorrentes." }]; return <div className="space-y-6"><PageHeading title="Outras partes da sua vida, no mesmo lugar." description="O Life Hub foi pensado para crescer em módulos, sem sobrecarregar a experiência que você usa hoje." /><section className="grid gap-4 sm:grid-cols-2">{modules.map(module => <article key={module.name} className="lh-module-card"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/[.09] text-primary"><module.icon size={21} /></div><div className="mt-5"><h3 className="text-lg font-semibold">{module.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{module.text}</p></div><button onClick={() => toast.info("Este módulo está reservado para a evolução do Life Hub.")} className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">Entender o módulo <ChevronDown className="-rotate-90" size={16} /></button></article>)}</section><article className="lh-card flex flex-col gap-5 overflow-hidden bg-[#20252B] p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Arquitetura modular</p><h3 className="mt-2 text-xl font-semibold">Cada área nasce independente, mas conversa com sua rotina.</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">O Life Hub reserva relacionamentos para pessoas, residências, veículos, saúde, garantias e assinaturas sem impedir o uso imediato dos módulos principais.</p></div><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-white"><Sparkles size={22} /></div></article></div>; }

function SettingsPage({ snapshot, onClearDemo, onLoadDemo }: { snapshot: LifeHubSnapshot; onClearDemo: () => void; onLoadDemo: () => Promise<void> }) {
  const { theme, toggleTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const downloadExport = async () => { setExporting(true); try { const content = await exportLifeHubData(); const url = URL.createObjectURL(new Blob([content], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `life-hub-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); toast.success("Exportação preparada com sucesso."); } finally { setExporting(false); } };
  const demoCount = snapshot.documents.filter(item => item.isDemo).length + snapshot.financialRecords.filter(item => item.isDemo).length + snapshot.calendarEvents.filter(item => item.isDemo).length;
  return <div className="space-y-6"><PageHeading title="Do seu jeito, com regras claras." description="Ajuste a aparência e mantenha transparência sobre como seus dados ficam armazenados." /><section className="grid gap-5 xl:grid-cols-2"><article className="lh-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/[.09] text-primary"><Moon size={19} /></div><div className="min-w-0 flex-1"><h3 className="text-base font-semibold">Aparência</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Escolha uma apresentação confortável para você. Esta preferência fica salva localmente.</p></div><Switch checked={theme === "dark"} onCheckedChange={toggleTheme} aria-label="Ativar tema escuro" /></div><div className="mt-5 flex gap-3"><div className="h-14 flex-1 rounded-xl border border-border bg-[#F7F4EE] p-2"><i className="block h-2 w-7 rounded bg-[#2F80ED]" /></div><div className="h-14 flex-1 rounded-xl border border-white/10 bg-[#111820] p-2"><i className="block h-2 w-7 rounded bg-[#6FAF8B]" /></div></div></article><article className="lh-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-success/[.12] text-success"><ShieldCheck size={19} /></div><div><h3 className="text-base font-semibold">Privacidade local</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Life Hub armazena seus registros no IndexedDB deste navegador. Limpar dados do navegador, trocar de perfil ou usar modo privado pode remover esse armazenamento.</p></div></div></article></section><section className="grid gap-5 xl:grid-cols-2"><article className="lh-card p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/[.13] text-warning"><PackageCheck size={19} /></div><div><h3 className="text-base font-semibold">Dados de demonstração</h3><p className="mt-1 text-sm text-muted-foreground">{demoCount ? `${demoCount} registro${demoCount === 1 ? "" : "s"} de demonstração carregado${demoCount === 1 ? "" : "s"}.` : "Nenhum dado de demonstração carregado."}</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" className="lh-secondary-button" onClick={() => void onLoadDemo()}><PackageCheck size={16} /> Carregar demonstração</Button>{demoCount > 0 && <Button variant="outline" className="border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onClearDemo}><Trash2 size={16} /> Apagar demonstração</Button>}</div></article><article className="lh-card p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/[.09] text-primary"><Download size={19} /></div><div><h3 className="text-base font-semibold">Backup estruturado</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Exporte seus registros para manter uma cópia de segurança fora do navegador. O arquivo é gerado apenas no seu dispositivo.</p></div></div><Button className="mt-5 lh-primary-button" onClick={() => void downloadExport()} disabled={exporting}><Download size={16} /> {exporting ? "Preparando…" : "Exportar dados"}</Button></article></section><article className="rounded-2xl border border-warning/25 bg-warning/[.08] p-5"><p className="flex items-center gap-2 text-sm font-semibold text-[#a76e15]"><ShieldCheck size={17} /> Limites claros nesta primeira versão</p><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">O Life Hub não promete sincronização, backup remoto, autenticação de conta, criptografia ponta a ponta, OCR ou IA online enquanto essas capacidades não estiverem implementadas. Você sempre pode revisar e editar os dados criados aqui.</p></article></div>;
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="font-display text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</section>; }
function QuickButton({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) { return <button onClick={onClick} className="lh-quick-button"><Icon size={16} /><span>{label}</span></button>; }
function MetricCard({ icon: Icon, label, value, note, tone }: { icon: typeof Plus; label: string; value: string; note: string; tone: "blue" | "slate" | "gold" | "green" | "red" }) { return <article className="lh-card p-4 sm:p-5"><div className="flex items-center justify-between"><span className={cn("lh-metric-icon", `lh-tone-${tone}`)}><Icon size={18} /></span><span className="text-xs text-muted-foreground">{label}</span></div><p className="mt-6 font-display text-2xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{note}</p></article>; }
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) { return <div className="rounded-xl bg-muted/60 p-3"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><i className={cn("h-1.5 w-1.5 rounded-full", color)} />{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>; }
function SummaryRow({ icon: Icon, text, tone }: { icon: typeof Plus; text: string; tone: "gold" | "blue" | "green" }) { return <div className="flex items-center gap-3 rounded-xl bg-muted/45 px-3 py-3"><span className={cn("grid h-8 w-8 place-items-center rounded-lg", tone === "gold" ? "bg-warning/15 text-warning" : tone === "blue" ? "bg-primary/10 text-primary" : "bg-success/15 text-success")}><Icon size={16} /></span><p className="text-sm font-medium">{text}</p></div>; }
function DocumentIcon({ category }: { category: string }) { return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/[.09] text-primary"><FileText size={18} /><span className="sr-only">{category}</span></span>; }
function StatusBadge({ status, small = false }: { status: DocumentStatus | FinancialStatus; small?: boolean }) { return <span className={cn("lh-status", small && "lh-status-small", `lh-status-${status}`)}>{statusLabel[status]}</span>; }
function EmptyList({ icon: Icon, title, description, actionLabel, onAction }: { icon: typeof Plus; title: string; description: string; actionLabel: string; onAction: () => void }) { return <div className="flex flex-col items-center px-5 py-12 text-center"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground"><Icon size={21} /></span><h4 className="mt-4 text-sm font-semibold">{title}</h4><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p><Button variant="outline" className="mt-5 lh-secondary-button" onClick={onAction}><Plus size={16} /> {actionLabel}</Button></div>; }

function SearchDialog({ open, search, results, onSearch, onClose, onNavigate }: { open: boolean; search: string; results: { id: string; title: string; detail: string; href: string }[]; onSearch: (value: string) => void; onClose: () => void; onNavigate: (href: string) => void }) { return <Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent className="max-w-xl gap-0 overflow-hidden rounded-2xl border-border p-0"><div className="flex items-center gap-3 border-b border-border px-4"><Search size={19} className="text-muted-foreground" /><Input autoFocus className="h-14 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" placeholder="Busque documentos, contas e eventos" value={search} onChange={event => onSearch(event.target.value)} /></div><div className="min-h-[150px] p-2">{search ? results.length ? results.map(result => <button key={`${result.href}-${result.id}`} onClick={() => onNavigate(result.href)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"><Search size={16} className="text-primary" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{result.title}</strong><small className="mt-0.5 block text-xs text-muted-foreground">{result.detail}</small></span></button>) : <p className="px-3 py-5 text-sm text-muted-foreground">Nenhum resultado foi encontrado nos dados locais.</p> : <p className="px-3 py-5 text-sm text-muted-foreground">Comece a digitar para localizar algo importante.</p>}</div></DialogContent></Dialog>; }

function DocumentDialog({ open, record, onClose, onSaved }: { open: boolean; record?: DocumentRecord; onClose: () => void; onSaved: () => Promise<void> }) { const [form, setForm] = useState({ title: "", category: "Outros", status: "new" as DocumentStatus, dueAt: "", supplier: "", favorite: false }); const [confirmDelete, setConfirmDelete] = useState(false); useEffect(() => { setForm(record ? { title: record.title, category: record.category, status: record.status, dueAt: toLocalInput(record.dueAt), supplier: record.supplier ?? "", favorite: record.favorite } : { title: "", category: "Outros", status: "new", dueAt: "", supplier: "", favorite: false }); }, [record, open]); const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!form.title.trim()) return toast.error("Informe um título para o documento."); await saveDocument({ id: record?.id, title: form.title.trim(), category: form.category, status: form.status, source: record?.source ?? "manual", dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined, supplier: form.supplier || undefined, favorite: form.favorite, archived: record?.archived ?? false, isDemo: record?.isDemo }); await onSaved(); onClose(); toast.success(record ? "Documento atualizado." : "Documento criado."); }; const remove = async () => { if (!record) return; await deleteDocument(record.id); await onSaved(); setConfirmDelete(false); onClose(); toast.success("Documento removido."); }; return <><Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>{record ? "Editar documento" : "Novo documento"}</DialogTitle><DialogDescription>Todo dado pode ser revisado e alterado por você.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Título"><Input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Fatura de energia" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Categoria"><Select value={form.category} onValueChange={category => setForm({ ...form, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOCUMENT_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></Field><Field label="Estado"><Select value={form.status} onValueChange={status => setForm({ ...form, status: status as DocumentStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Novo</SelectItem><SelectItem value="processing">Processando</SelectItem><SelectItem value="needs_review">Revisar</SelectItem><SelectItem value="confirmed">Confirmado</SelectItem></SelectContent></Select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Vencimento"><Input type="datetime-local" value={form.dueAt} onChange={event => setForm({ ...form, dueAt: event.target.value })} /></Field><Field label="Fornecedor"><Input value={form.supplier} onChange={event => setForm({ ...form, supplier: event.target.value })} placeholder="Opcional" /></Field></div><div className="flex items-center justify-between rounded-xl bg-muted/50 p-3"><Label htmlFor="favorite" className="text-sm">Marcar como favorito</Label><Switch id="favorite" checked={form.favorite} onCheckedChange={favorite => setForm({ ...form, favorite })} /></div><div className="flex flex-wrap items-center justify-between gap-2 pt-2">{record ? <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Excluir</Button> : <span />}<DialogActions onClose={onClose} /></div></form></DialogContent></Dialog><ConfirmDialog open={confirmDelete} title="Excluir este documento?" description="A exclusão remove este registro do armazenamento local. Esta ação não pode ser desfeita." confirmLabel="Excluir documento" onClose={() => setConfirmDelete(false)} onConfirm={remove} /></>; }

function FinanceDialog({ open, record, onClose, onSaved }: { open: boolean; record?: FinancialRecord; onClose: () => void; onSaved: () => Promise<void> }) { const [form, setForm] = useState({ title: "", category: "Outros", amount: "", status: "pending" as FinancialStatus, occurredAt: "", dueAt: "", supplier: "", recurrent: false, notes: "" }); const [confirmDelete, setConfirmDelete] = useState(false); useEffect(() => { setForm(record ? { title: record.title, category: record.category, amount: String(record.amount), status: record.status, occurredAt: toLocalInput(record.occurredAt), dueAt: toLocalInput(record.dueAt), supplier: record.supplier ?? "", recurrent: record.recurrent, notes: record.notes ?? "" } : { title: "", category: "Outros", amount: "", status: "pending", occurredAt: toLocalInput(new Date().toISOString()), dueAt: "", supplier: "", recurrent: false, notes: "" }); }, [record, open]); const submit = async (event: React.FormEvent) => { event.preventDefault(); const amount = Number(form.amount.replace(",", ".")); if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return toast.error("Informe título e valor válido."); await saveFinancialRecord({ id: record?.id, title: form.title.trim(), category: form.category, amount, status: form.status, occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : new Date().toISOString(), dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined, supplier: form.supplier || undefined, recurrent: form.recurrent, notes: form.notes || undefined, isDemo: record?.isDemo }); await onSaved(); onClose(); toast.success(record ? "Lançamento atualizado." : "Lançamento criado."); }; const remove = async () => { if (!record) return; await deleteFinancialRecord(record.id); await onSaved(); setConfirmDelete(false); onClose(); toast.success("Lançamento removido."); }; return <><Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>{record ? "Editar lançamento" : "Novo lançamento"}</DialogTitle><DialogDescription>Os totais do Life Hub serão atualizados automaticamente.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Título"><Input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Conta de energia" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Categoria"><Select value={form.category} onValueChange={category => setForm({ ...form, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FINANCE_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></Field><Field label="Valor"><Input inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="0,00" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><Select value={form.status} onValueChange={status => setForm({ ...form, status: status as FinancialStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Pago</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="overdue">Vencido</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></Field><Field label="Fornecedor"><Input value={form.supplier} onChange={event => setForm({ ...form, supplier: event.target.value })} placeholder="Opcional" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Data"><Input type="datetime-local" value={form.occurredAt} onChange={event => setForm({ ...form, occurredAt: event.target.value })} /></Field><Field label="Vencimento"><Input type="datetime-local" value={form.dueAt} onChange={event => setForm({ ...form, dueAt: event.target.value })} /></Field></div><Field label="Observações"><Textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Opcional" /></Field><div className="flex items-center justify-between rounded-xl bg-muted/50 p-3"><Label htmlFor="recurrent" className="text-sm">Lançamento recorrente</Label><Switch id="recurrent" checked={form.recurrent} onCheckedChange={recurrent => setForm({ ...form, recurrent })} /></div><div className="flex flex-wrap items-center justify-between gap-2 pt-2">{record ? <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Excluir</Button> : <span />}<DialogActions onClose={onClose} /></div></form></DialogContent></Dialog><ConfirmDialog open={confirmDelete} title="Excluir este lançamento?" description="A exclusão remove este registro do armazenamento local. Esta ação não pode ser desfeita." confirmLabel="Excluir lançamento" onClose={() => setConfirmDelete(false)} onConfirm={remove} /></>; }

function EventDialog({ open, record, onClose, onSaved }: { open: boolean; record?: CalendarEvent; onClose: () => void; onSaved: () => Promise<void> }) { const [form, setForm] = useState({ title: "", type: "appointment" as EventType, startsAt: "", endsAt: "", allDay: false, location: "", description: "", recurrence: "none" }); const [confirmDelete, setConfirmDelete] = useState(false); useEffect(() => { setForm(record ? { title: record.title, type: record.type, startsAt: toLocalInput(record.startsAt), endsAt: toLocalInput(record.endsAt), allDay: record.allDay, location: record.location ?? "", description: record.description ?? "", recurrence: record.recurrence ?? "none" } : { title: "", type: "appointment", startsAt: toLocalInput(new Date().toISOString()), endsAt: "", allDay: false, location: "", description: "", recurrence: "none" }); }, [record, open]); const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!form.title.trim() || !form.startsAt) return toast.error("Informe título e data do evento."); await saveCalendarEvent({ id: record?.id, title: form.title.trim(), type: form.type, startsAt: new Date(form.startsAt).toISOString(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined, allDay: form.allDay, location: form.location || undefined, description: form.description || undefined, recurrence: form.recurrence === "none" ? undefined : form.recurrence, reminderOffsets: record?.reminderOffsets ?? [], isDemo: record?.isDemo }); await onSaved(); onClose(); toast.success(record ? "Evento atualizado." : "Evento criado."); }; const remove = async () => { if (!record) return; await deleteCalendarEvent(record.id); await onSaved(); setConfirmDelete(false); onClose(); toast.success("Evento removido."); }; return <><Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>{record ? "Editar evento" : "Novo evento"}</DialogTitle><DialogDescription>Lembretes são armazenados internamente e podem ser revisados a qualquer momento.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Título"><Input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Consulta médica" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo"><Select value={form.type} onValueChange={type => setForm({ ...form, type: type as EventType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(eventLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Local"><Input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} placeholder="Opcional" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Início"><Input type="datetime-local" value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} /></Field><Field label="Fim"><Input type="datetime-local" value={form.endsAt} onChange={event => setForm({ ...form, endsAt: event.target.value })} /></Field></div><Field label="Repetição"><Select value={form.recurrence} onValueChange={recurrence => setForm({ ...form, recurrence })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não se repete</SelectItem><SelectItem value="Diariamente">Diariamente</SelectItem><SelectItem value="Semanalmente">Semanalmente</SelectItem><SelectItem value="Mensalmente">Mensalmente</SelectItem><SelectItem value="Anualmente">Anualmente</SelectItem></SelectContent></Select></Field><Field label="Descrição"><Textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Opcional" /></Field><div className="flex items-center justify-between rounded-xl bg-muted/50 p-3"><Label htmlFor="allDay" className="text-sm">Evento de dia inteiro</Label><Switch id="allDay" checked={form.allDay} onCheckedChange={allDay => setForm({ ...form, allDay })} /></div><div className="flex flex-wrap items-center justify-between gap-2 pt-2">{record ? <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Excluir</Button> : <span />}<DialogActions onClose={onClose} /></div></form></DialogContent></Dialog><ConfirmDialog open={confirmDelete} title="Excluir este evento?" description="A exclusão remove este registro do armazenamento local. Esta ação não pode ser desfeita." confirmLabel="Excluir evento" onClose={() => setConfirmDelete(false)} onConfirm={remove} /></>; }

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-sm font-medium">{label}</Label>{children}</div>; }
function DialogActions({ onClose }: { onClose: () => void }) { return <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="lh-primary-button">Salvar</Button></div>; }
function ConfirmDialog({ open, title, description, confirmLabel, onClose, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => Promise<void> }) { return <Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="flex justify-end gap-2 pt-3"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void onConfirm()}>{confirmLabel}</Button></div></DialogContent></Dialog>; }
function toLocalInput(value?: string) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function getMonthDays(month: Date) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const last = new Date(month.getFullYear(), month.getMonth() + 1, 0); return [...Array(first.getDay()).fill(null), ...Array.from({ length: last.getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]; }
function sameDay(first: Date, second: Date) { return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate(); }
function eventOccursOnDay(event: CalendarEvent, day: Date) { const startsAt = new Date(event.startsAt); if (sameDay(startsAt, day)) return true; if (event.recurrence === "Diariamente") return day >= startsAt; if (event.recurrence === "Semanalmente") return day >= startsAt && day.getDay() === startsAt.getDay(); if (event.recurrence === "Mensalmente") return day >= startsAt && day.getDate() === startsAt.getDate(); if (event.recurrence === "Anualmente") return day.getMonth() === startsAt.getMonth() && day.getDate() === startsAt.getDate(); return false; }
