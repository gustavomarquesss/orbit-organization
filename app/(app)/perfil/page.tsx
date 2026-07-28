import Link from "next/link";
import { Flame, ListChecks, Target, Trophy } from "lucide-react";

import { BreakdownList } from "@/components/dashboard/breakdown-list";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TeamMemberAvatar } from "@/components/team/team-member-avatar";
import { EditProfileDialog } from "@/components/perfil/edit-profile-dialog";
import { getCardTypeIcon } from "@/lib/utils/card-type-icons";
import { formatPrazo, isPrazoVencido } from "@/lib/utils/prazo";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyRanking } from "@/lib/queries/dashboard";
import { getMyPendingTasks, getMyStats } from "@/lib/queries/perfil";
import { cn } from "@/lib/utils";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-muted-foreground">Sessão expirada. Entre novamente.</p>;
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, avatar_url, avatar_color")
    .eq("id", user.id)
    .maybeSingle();

  const [ranking, pendingTasks, stats] = await Promise.all([
    getMonthlyRanking(),
    getMyPendingTasks(user.id),
    getMyStats(user.id),
  ]);

  const me = ranking.items.find((item) => item.id === user.id);
  const above = me && me.position > 1 ? ranking.items[me.position - 2] : undefined;
  const below = me ? ranking.items[me.position] : undefined;

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <TeamMemberAvatar
          name={member?.full_name ?? "Perfil"}
          avatarUrl={member?.avatar_url ?? null}
          avatarColor={member?.avatar_color ?? "#6366f1"}
          size="lg"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{member?.full_name ?? "Perfil"}</h1>
            <EditProfileDialog
              fullName={member?.full_name ?? ""}
              avatarUrl={member?.avatar_url ?? null}
              avatarColor={member?.avatar_color ?? "#6366f1"}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {`Ranking de ${ranking.monthLabel}: ${me ? `${me.position}º lugar` : "—"} com ${me?.count ?? 0} tarefa${me?.count === 1 ? "" : "s"} concluída${me?.count === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Posição no mês" value={me?.position ?? 0} icon={Trophy} />
        <StatTile label="Concluídas no mês" value={me?.count ?? 0} icon={Target} />
        <StatTile label="Sequência de dias ativos" value={stats.streak} icon={Flame} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <Target className="size-4 text-muted-foreground" />
            Objetivos
          </h3>
          <ul className="space-y-2 text-sm">
            {me && above ? (
              <li>
                Faltam <strong>{me.gapToAbove}</strong> tarefa{me.gapToAbove === 1 ? "" : "s"} para ultrapassar{" "}
                <strong>{above.label}</strong> ({above.position}º lugar).
              </li>
            ) : null}
            {me && me.position === 1 ? (
              <li>
                Você lidera o ranking deste mês
                {below ? (
                  <>
                    {" "}
                    — {below.label} precisa de <strong>{Math.max(1, me.count - below.count + 1)}</strong> tarefa
                    {me.count - below.count + 1 === 1 ? "" : "s"} para te ultrapassar.
                  </>
                ) : null}
                .
              </li>
            ) : null}
            {stats.recordMonth ? (
              <li>
                Seu recorde mensal é <strong>{stats.recordMonth.count}</strong> tarefa
                {stats.recordMonth.count === 1 ? "" : "s"} ({stats.recordMonth.label})
                {me ? (
                  <>
                    {" "}
                    — este mês você já fez <strong>{me.count}</strong>.
                  </>
                ) : null}
              </li>
            ) : (
              <li>Conclua tarefas este mês para começar a construir seu histórico de recordes.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
            <ListChecks className="size-4 text-muted-foreground" />
            Minhas tarefas pendentes
          </h3>
          {pendingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente.</p>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map((task) => {
                const TypeIcon = getCardTypeIcon(task.card_type?.key);
                const prazo = formatPrazo(task);
                const vencido = isPrazoVencido(task);
                return (
                  <li key={task.id}>
                    <Link
                      href={`/cards/${task.id}`}
                      className="flex items-center justify-between gap-2 text-sm hover:underline"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <TypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{task.title}</span>
                      </span>
                      {prazo ? (
                        <span
                          className={cn("shrink-0 text-xs", vencido ? "text-destructive" : "text-muted-foreground")}
                        >
                          {prazo}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <BreakdownList
          title="Tipos que mais concluo"
          icon={Target}
          items={stats.byType}
          emptyLabel="Nenhuma tarefa concluída ainda."
        />
        <StatTile label="Total concluído (histórico)" value={stats.totalConcluidas} icon={Trophy} />
      </div>
    </div>
  );
}
