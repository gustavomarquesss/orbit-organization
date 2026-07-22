import { CheckCircle2, Clock, LayoutGrid, TrendingUp, TriangleAlert } from "lucide-react";

import { StatTile } from "@/components/dashboard/stat-tile";
import { RecentCardsList } from "@/components/dashboard/recent-cards-list";
import { UpcomingMeetingsList } from "@/components/dashboard/upcoming-meetings-list";
import { BreakdownList } from "@/components/dashboard/breakdown-list";
import { StaleCardsList } from "@/components/dashboard/stale-cards-list";
import { getCardLookups } from "@/lib/queries/cards";
import {
  getDashboardStats,
  getOpenCountByModelo,
  getOpenCountByResponsavel,
  getRecentCards,
  getRecentCompletionsCount,
  getRecentlyUpdatedCards,
  getStaleCards,
  getUpcomingMeetings,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [
    stats,
    recentCards,
    updatedCards,
    meetings,
    lookups,
    byModelo,
    byResponsavel,
    staleCards,
    recentCompletions,
  ] = await Promise.all([
    getDashboardStats(),
    getRecentCards(),
    getRecentlyUpdatedCards(),
    getUpcomingMeetings(),
    getCardLookups(),
    getOpenCountByModelo(),
    getOpenCountByResponsavel(),
    getStaleCards(),
    getRecentCompletionsCount(7),
  ]);

  const concluidoId = lookups.statuses.find((s) => s.key === "concluido")?.id;
  const urgenteId = lookups.priorities.find((p) => p.key === "urgente")?.id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        <StatTile label="Concluídos (7 dias)" value={recentCompletions} icon={TrendingUp} tone="green" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <BreakdownList
          title="Cards abertos por Modelo"
          items={byModelo}
          emptyLabel="Nenhum card em aberto vinculado a uma modelo."
          href={(id) => `/cards?modelo=${id}&pendente=1`}
        />
        <BreakdownList
          title="Cards abertos por Responsável"
          items={byResponsavel}
          emptyLabel="Nenhum card em aberto com responsável definido."
          href={(id) => `/cards?responsavel=${id}&pendente=1`}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RecentCardsList title="Criados recentemente" items={recentCards} emptyLabel="Nenhum card criado ainda." />
        <RecentCardsList
          title="Atualizados recentemente"
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
