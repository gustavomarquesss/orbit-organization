-- Log de eventos por card ("histórico"): feed simples e tipado, não um diff
-- completo campo-a-campo. Somente inserção — nenhuma linha aqui é editada
-- ou apagada pela aplicação, e nenhum trigger de updated_at é necessário.
create table public.card_activity (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  actor_id uuid references public.team_members (id),
  event_type text not null check (event_type in (
    'created',
    'updated',
    'status_changed',
    'assignee_added',
    'assignee_removed',
    'assignee_done',
    'assignee_undone'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index card_activity_card_id_idx on public.card_activity (card_id, created_at desc);

alter table public.card_activity enable row level security;

create policy "authenticated full access" on public.card_activity
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.card_activity to anon, authenticated, service_role;

-- Conclusão por responsável: estado por par (card, pessoa) direto na linha
-- de vínculo que já existe, sem precisar de tabela nova.
alter table public.card_responsaveis
  add column done_at timestamptz;

-- Backfill opcional: sintetiza um evento "created" retroativo para os cards
-- já existentes, só para o histórico não aparecer vazio nesses casos.
insert into public.card_activity (card_id, actor_id, event_type, created_at)
select id, created_by, 'created', created_at from public.cards;
