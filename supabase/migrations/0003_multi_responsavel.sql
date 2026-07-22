-- Um card pode ter múltiplos responsáveis (0, 1 ou vários, incluindo todos).
-- Substitui a coluna única cards.responsavel_id por uma tabela de
-- relacionamento, no mesmo padrão já usado por card_tags/meeting_participants.

create table public.card_responsaveis (
  card_id uuid not null references public.cards (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id),
  primary key (card_id, team_member_id)
);

create index card_responsaveis_team_member_idx on public.card_responsaveis (team_member_id);

alter table public.cards drop column responsavel_id;

alter table public.card_responsaveis enable row level security;

create policy "authenticated full access" on public.card_responsaveis
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.card_responsaveis to anon, authenticated, service_role;
