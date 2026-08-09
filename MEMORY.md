# MEMORY.md — Orbit (firma-milionaria)

## Projeto
- App interno "Orbit" (rebranding recente) — gestão de tarefas (cards), reuniões, financeiro e perfil de equipe.
- Stack: Next.js 16.2.11 (webpack, não Turbopack), React 19.2.4, TypeScript, Tailwind v4, Supabase (auth+db via @supabase/ssr), react-hook-form + zod, shadcn/ui, PWA com web-push.
- ⚠️ AGENTS.md avisa: esta versão do Next.js tem breaking changes vs. treino do modelo — checar `node_modules/next/dist/docs/` antes de escrever código novo.
- Branch atual: `dev`. Branch principal: `main`.
- Rotas: `app/(app)/{cards,configuracoes,financeiro,perfil,reunioes}`, `app/(auth)/login`, `app/api/{export,notifications}`.

## Estado recente (via git log)
- Últimas features: upload de foto de perfil + edição de nome + avatar global; gamificação (ranking mensal por responsável) + página de Perfil; gráfico de pizza no dashboard + receitas/metas no financeiro; notificações push PWA para prazos; recorrência diária de cards; seleção em massa/duplicar cards.
- **NOVO (2026-08-09), ainda não commitado:** pacote completo de notificações push — conclusão, reabertura, atribuição de responsável, card urgente, e resumo diário agregado ("Seu dia" com atrasadas). Ver seção abaixo.

## Sistema de notificações push (mapa de referência)
- Só web-push (PWA), sem sino in-app. Tabelas: `push_subscriptions` (dispositivos), `notification_log` (dedupe do lembrete 1h-antes, kind `reminder_1h`) e **nova** `member_digest_log` (dedupe do resumo diário por pessoa, 1x/dia).
- Helper de baixo nível: `sendPushToMember(supabase, teamMemberId, payload)` em `lib/push/notify.ts` — envia a todos os devices de 1 membro, remove subscription se 404/410.
- Padrão do projeto: cada evento de domínio tem sua função `notifyXxx` em `lib/actions/cards.ts` — busca `team_members` ativos com `.neq("id", actorId)` (evita autonotificação), monta `{title, body, url}`, dispara `Promise.all(...)`. Sempre best-effort (try/catch).
- Status "Concluído" é identificado por `statuses.key === "concluido"`; prioridade urgente por `priorities.key === "urgente"` (não pelo label).
- Funções em `lib/actions/cards.ts`: `notifyCardCreated` (também sinaliza urgente), `notifyCardAssigned` (só quem foi adicionado como responsável em card existente), `notifyCardCompleted`, `notifyCardReopened` — todas chamadas de dentro de `createCard`/`updateCard`/`duplicateCard`.
- `app/api/notifications/check/route.ts` (cron ~15min): `sendReminder` mantém o lembrete 1h-antes por card (reunião/prazo). `sendMemberDigests` roda 1x/dia às 8h BRT e substituiu os pushes individuais "Hoje: Prazo/Reunião" por **um só push por pessoa** ("Seu dia": X tarefas hoje, Y reuniões, Z atrasadas) — decisão deliberada para não duplicar aviso sobre o mesmo card duas vezes.
- Não existe bulk-complete nem função dedicada "marcar como concluído" — tudo via `updateCard` (troca de status no form).
- ⚠️ Migration `supabase/migrations/0015_member_digest_log.sql` **ainda não foi aplicada no banco** — sem credenciais/acesso pra rodar `supabase db push` remoto, é ação do usuário. Sem ela o resumo diário falha silenciosamente (best-effort).
- ⚠️ Existe um worktree separado (`.claude/worktrees/musing-brattain-af11fe/`) com versão mais avançada de `lib/actions/cards.ts` (reabertura + auto-complete por recorrência) — não está na `dev`, só FYI.

## Preferências do usuário / regras de trabalho
- Workflow de memória persistente: ler MEMORY.md no início de cada tarefa, executar, apresentar MEMORY.md atualizado no fim. Manter abaixo de 150 linhas.
- Commits/mensagens de log do projeto são em português.
- Para pedidos exploratórios ("o que vc sugeriria"), dar lista curta com trade-off e esperar aprovação antes de implementar — usuário aprovou os 5 itens de uma vez depois de ver a lista.

## Próximos passos
- Usuário: aplicar a migration 0015 no Supabase (dashboard SQL editor ou `supabase db push`).
- Testar em ambiente real (2+ usuários, push subscription ativa, pg_cron rodando) — não verificável no Browser pane isolado (depende de sessão real + dispositivos inscritos).
- Perguntar se quer commitar (nada commitado ainda nesta sessão).
