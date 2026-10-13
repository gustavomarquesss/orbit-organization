# MEMORY.md — Orbit (firma-milionaria)

## Projeto
- App interno "Orbit" (rebranding recente) — gestão de tarefas (cards), reuniões, financeiro e perfil de equipe.
- Stack: Next.js 16.2.11 (webpack, não Turbopack), React 19.2.4, TypeScript, Tailwind v4, Supabase (auth+db via @supabase/ssr), react-hook-form + zod, shadcn/ui, PWA com web-push.
- ⚠️ AGENTS.md avisa: esta versão do Next.js tem breaking changes vs. treino do modelo — checar `node_modules/next/dist/docs/` antes de escrever código novo.
- Branch atual: `dev`. Branch principal: `main`.
- Rotas: `app/(app)/{cards,configuracoes,financeiro,perfil,reunioes}`, `app/(auth)/login`, `app/api/{export,notifications}`.

## Estado recente (via git log)
- Últimas features: upload de foto de perfil + edição de nome + avatar global; gamificação (ranking mensal por responsável) + página de Perfil; gráfico de pizza no dashboard + receitas/metas no financeiro; notificações push PWA para prazos; recorrência diária de cards; seleção em massa/duplicar cards.
- **2026-08-09:** pacote de notificações push — conclusão, reabertura, atribuição de responsável, card urgente, resumo diário agregado ("Seu dia"). Commit `5760801`, mergeado em `main` (prod) via fast-forward. Migration 0015 já foi aplicada pelo usuário no Supabase.
- **2026-08-09 (mesma sessão):** fix de latência do push no iOS — `urgency: "high"` + `TTL: 3600` no `webpush.sendNotification` (`lib/push/notify.ts`). Commit `e9fe28b`, também já em `main`. Causa raiz: sem esse header o iOS pode atrasar/agrupar push por economia de bateria; usuário reportou que até a notificação antiga "Nova tarefa" chegava com delay perceptível, não era bug específico das notificações novas.
- Fluxo de deploy confirmado nesta sessão: push em `main` → Vercel auto-deploy (usuário validou no painel Vercel). `dev` e `main` andam em fast-forward (sem diferenças estruturais entre elas até agora).

## Sistema de notificações push (mapa de referência)
- Só web-push (PWA), sem sino in-app. Tabelas: `push_subscriptions` (dispositivos), `notification_log` (dedupe do lembrete 1h-antes, kind `reminder_1h`) e **nova** `member_digest_log` (dedupe do resumo diário por pessoa, 1x/dia).
- Helper de baixo nível: `sendPushToMember(supabase, teamMemberId, payload)` em `lib/push/notify.ts` — envia a todos os devices de 1 membro, remove subscription se 404/410.
- Padrão do projeto: cada evento de domínio tem sua função `notifyXxx` em `lib/actions/cards.ts` — busca `team_members` ativos com `.neq("id", actorId)` (evita autonotificação), monta `{title, body, url}`, dispara `Promise.all(...)`. Sempre best-effort (try/catch).
- Status "Concluído" é identificado por `statuses.key === "concluido"`; prioridade urgente por `priorities.key === "urgente"` (não pelo label).
- Funções em `lib/actions/cards.ts`: `notifyCardCreated` (também sinaliza urgente), `notifyCardAssigned` (só quem foi adicionado como responsável em card existente), `notifyCardCompleted`, `notifyCardReopened` — todas chamadas de dentro de `createCard`/`updateCard`/`duplicateCard`.
- `app/api/notifications/check/route.ts` (cron ~15min): `sendReminder` mantém o lembrete 1h-antes por card (reunião/prazo). `sendMemberDigests` roda 1x/dia às 8h BRT e substituiu os pushes individuais "Hoje: Prazo/Reunião" por **um só push por pessoa** ("Seu dia": X tarefas hoje, Y reuniões, Z atrasadas) — decisão deliberada para não duplicar aviso sobre o mesmo card duas vezes.
- Não existe bulk-complete nem função dedicada "marcar como concluído" — tudo via `updateCard` (troca de status no form).
- `sendPushToMember` (`lib/push/notify.ts`) manda `{urgency: "high", TTL: 3600}` pro web-push — importante lembrar disso ao adicionar qualquer notificação nova, já está no helper compartilhado, não precisa repetir por chamada.
- ⚠️ Existe um worktree separado (`.claude/worktrees/musing-brattain-af11fe/`) com versão mais avançada de `lib/actions/cards.ts` (reabertura + auto-complete por recorrência) — não está na `dev`, só FYI.

## Painel Admin e permissões (2026-10-13, na `dev`, ainda sem commit)
- Super admin = email `gug4marques@gmail.com` (constante em `lib/auth/permissions.ts`, exige email confirmado). Não há coluna is_admin.
- Rota `/admin` (só admin): criar usuário (com senha direta ou convite por email), editar nome/email/ativo, trocar senha, enviar email de reset, gerar link de recuperação copiável. Sem exclusão de usuário (cards.created_by referencia team_members sem cascade) — só desativar.
- Desativar = `is_active=false` + ban no Supabase Auth (bloqueia login). Reativar remove o ban.
- Permissões em `team_members.permissions` (jsonb, só guarda `false`; chave ausente = liberado). Catálogo/labels em `lib/auth/permissions.ts` (dashboard, export, cards, cards_edit, cards_delete, reunioes, financeiro, financeiro_edit, configuracoes). Nova permissão = adicionar no catálogo + checar com `requirePermission` (páginas) / `checkPermission` (actions) em `lib/auth/session.ts`.
- Aplicação é só na camada do app (páginas + Server Actions + /api/export). RLS do banco continua "authenticated full access" — quem tiver token pode falar direto com a API do Supabase. Endurecer via RLS seria passo futuro.
- **Migration 0016 (`supabase/migrations/0016_user_permissions.sql`) precisa ser aplicada no Supabase pelo usuário** — sem ela o /admin lista vazio e as permissões não salvam.
- `/configuracoes/equipe` agora só redireciona para `/admin`; `TeamEditor`, `inviteTeamMember` e `toggleTeamMemberActive` foram removidos (antes qualquer logado podia chamá-los).
- Não testado logado (sem acesso à senha do usuário): só typecheck, build e redirects sem sessão.
- Arquivos do repo têm CRLF no working copy: ao editar via script, normalizar 
.

## Preferências do usuário / regras de trabalho
- Workflow de memória persistente: ler MEMORY.md no início de cada tarefa, executar, apresentar MEMORY.md atualizado no fim. Manter abaixo de 150 linhas.
- Commits/mensagens de log do projeto são em português.
- Para pedidos exploratórios ("o que vc sugeriria"), dar lista curta com trade-off e esperar aprovação antes de implementar — usuário aprovou os 5 itens de uma vez depois de ver a lista.

## Próximos passos
- Usuário vai testar novamente no iPhone se o `urgency: high` reduziu o delay do push (ainda sem confirmação de que resolveu).
- Se o delay persistir mesmo com urgency high, próxima hipótese a investigar: Modo de Baixo Consumo/Focus no aparelho do usuário, ou comportamento do iOS Web Push em si (fora do nosso controle via código).
- Ainda não testado em produção: as notificações novas de conclusão/reabertura/atribuição/urgente/resumo diário (só a antiga "Nova tarefa" foi confirmada chegando, com delay).
