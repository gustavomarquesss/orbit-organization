import { CheckCircle2, Clock, LayoutGrid, TriangleAlert } from "lucide-react";

import { StatTile } from "@/components/dashboard/stat-tile";
import { RecentCardsList } from "@/components/dashboard/recent-cards-list";
import { UpcomingMeetingsList } from "@/components/dashboard/upcoming-meetings-list";
import { getCardLookups } from "@/lib/queries/cards";
import {
  getDashboardStats,
  getRecentCards,
  getRecentlyUpdatedCards,
  getUpcomingMeetings,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [stats, recentCards, updatedCards, meetings, lookups] = await Promise.all([
    getDashboardStats(),
    getRecentCards(),
    getRecentlyUpdatedCards(),
    getUpcomingMeetings(),
    getCardLookups(),
  ]);

  const concluidoId = lookups.statuses.find((s) => s.key === "concluido")?.id;
  const urgenteId = lookups.priorities.find((p) => p.key === "urgente")?.id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <div className="grid gap-3 md:grid-cols-2">
        <RecentCardsList title="Criados recentemente" items={recentCards} emptyLabel="Nenhum card criado ainda." />
        <RecentCardsList
          title="Atualizados recentemente"
          items={updatedCards}
          emptyLabel="Nenhuma atualização ainda."
        />
      </div>

      <UpcomingMeetingsList meetings={meetings} />
    </div>
  );
}
