import { CheckCircle2, Clock, FilePlus2, LayoutGrid, RefreshCw, TriangleAlert, Users, Layers } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RecentCardsList } from "@/components/dashboard/recent-cards-list";
import { UpcomingMeetingsList } from "@/components/dashboard/upcoming-meetings-list";
import { BreakdownList } from "@/components/dashboard/breakdown-list";
import { StaleCardsList } from "@/components/dashboard/stale-cards-list";
import { ExportButton } from "@/components/dashboard/export-button";
import { getCardLookups } from "@/lib/queries/cards";
import {
  getConcludedCountByResponsavel,
  getDashboardStats,
  getOpenCountByModelo,
  getOpenCountByResponsavel,
  getRecentCards,
  getRecentlyUpdatedCards,
  getStaleCards,
  getUpcomingMeetings,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [stats, recentCards, updatedCards, meetings, lookups, byModelo, byResponsavel, byConcluidos, staleCards] =
    await Promise.all([
      getDashboardStats(),
      getRecentCards(),
      getRecentlyUpdatedCards(),
      getUpcomingMeetings(),
      getCardLookups(),
      getOpenCountByModelo(),
      getOpenCountByResponsavel(),
      getConcludedCountByResponsavel(),
      getStaleCards(),
    ]);

  const concluidoId = lookups.statuses.find((s) => s.key === "concluido")?.id;
  const urgenteId = lookups.priorities.find((p) => p.key === "urgente")?.id;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" actions={<ExportButton />} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total de Cards" value={stats.total} icon={LayoutGrid} href="/cards" />
        <StatTile
          label="Pendentes"
          value={stats.pendentes}
          icon={Clock}
          tone="yellow"
          href="/cards?pendente=1"
        />
        <StatTile
          label="Concluídos"
          value={stats.concluidos}
          icon={CheckCircle2}
          tone="green"
          href={concluidoId ? `/cards?status=${concluidoId}` : undefined}
        />
        <StatTile
          label="Urgentes"
          value={stats.urgentes}
          icon={TriangleAlert}
          tone="red"
          href={urgenteId ? `/cards?prioridade=${urgenteId}` : undefined}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <BreakdownList
          title="Cards abertos por Modelo"
          icon={Layers}
          items={byModelo}
          emptyLabel="Nenhum card em aberto vinculado a uma modelo."
          href={(id) => `/cards?modelo=${id}&pendente=1`}
        />
        <BreakdownList
          title="Cards abertos por Responsável"
          icon={Users}
          items={byResponsavel}
          emptyLabel="Nenhum card em aberto com responsável definido."
          href={(id) => `/cards?responsavel=${id}&pendente=1`}
        />
        <BreakdownList
          title="Cards concluídos por Responsável"
          icon={CheckCircle2}
          items={byConcluidos}
          emptyLabel="Nenhum card concluído com responsável definido."
          href={concluidoId ? (id) => `/cards?responsavel=${id}&status=${concluidoId}&concluidos=1` : undefined}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RecentCardsList
          title="Criados recentemente"
          icon={FilePlus2}
          items={recentCards}
          emptyLabel="Nenhum card criado ainda."
        />
        <RecentCardsList
          title="Atualizados recentemente"
          icon={RefreshCw}
          items={updatedCards}
          emptyLabel="Nenhuma atualização ainda."
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <StaleCardsList cards={staleCards} />
        <UpcomingMeetingsList meetings={meetings} />
      </div>
    </div>
  );
}
