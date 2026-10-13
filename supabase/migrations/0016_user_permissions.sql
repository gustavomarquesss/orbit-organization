-- Permissões por usuário, editadas pelo painel /admin.
-- Formato: { "financeiro": false, "cards_delete": false, ... }. Chave ausente = padrão
-- do catálogo em lib/auth/permissions.ts (liberado), então quem já existe não perde acesso.
-- O super admin (gug4marques@gmail.com) é identificado pelo email no código, não por esta coluna.
alter table public.team_members
  add column permissions jsonb not null default '{}'::jsonb;
