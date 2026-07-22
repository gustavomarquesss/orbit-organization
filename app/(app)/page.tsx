import { CheckCircle2, Clock, LayoutGrid, TriangleAlert } from "lucide-react";

import { StatTile } from "@/components/dashboard/stat-tile";
import { RecentCardsList } from "@/components/dashboard/recent-cards-list";
import { UpcomingMeetingsList } from "@/components/dashboard/upcoming-meetings-list";
import {
  getDashboardStats,
  getRecentCards,
  getRecentlyUpdatedCards,
  getUpcomingMeetings,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [stats, recentCards, updatedCards, meetings] = await Promise.all([
    getDashboardStats(),
    getRecentCards(),
    getRecentlyUpdatedCards(),
    getUpcomingMeetings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total de Cards" value={stats.total} icon={LayoutGrid} />
        <StatTile label="Pendentes" value={stats.pendentes} icon={Clock} tone="yellow" />
        <StatTile label="Concluídos" value={stats.concluidos} icon={CheckCircle2} tone="green" />
        <StatTile label="Urgentes" value={stats.urgentes} icon={TriangleAlert} tone="red" />
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
