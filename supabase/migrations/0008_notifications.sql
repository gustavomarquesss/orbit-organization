-- Prazo opcional em qualquer card (data/hora de entrega), usado para lembretes.
alter table public.cards
  add column prazo_data date,
  add column prazo_hora time;

-- Inscrições de push por membro da equipe (um membro pode ter vários aparelhos).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_team_member_idx on public.push_subscriptions (team_member_id);

alter table public.push_subscriptions enable row level security;

create policy "authenticated full access" on public.push_subscriptions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.push_subscriptions to anon, authenticated, service_role;

-- Evita reenviar o mesmo aviso (reunião/prazo) mais de uma vez.
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  kind text not null check (kind in ('reminder_1h', 'morning_digest')),
  target_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (card_id, kind, target_at)
);

alter table public.notification_log enable row level security;

create policy "authenticated full access" on public.notification_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.notification_log to anon, authenticated, service_role;
