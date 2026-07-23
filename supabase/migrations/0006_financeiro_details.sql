-- Detalhes específicos do tipo Financeiro (mesmo padrão de meeting_details):
-- reaproveita id/título de cards, adiciona só o que é próprio de um gasto.

create table public.financeiro_details (
  card_id uuid primary key references public.cards (id) on delete cascade,
  valor numeric(12, 2) not null,
  gasto_por_id uuid references public.team_members (id),
  data_inicio date not null,
  recorrencia text not null check (recorrencia in ('unico', 'mensal', 'trimestral', 'semestral', 'anual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger financeiro_details_set_updated_at
  before update on public.financeiro_details
  for each row execute function public.set_updated_at_only();

alter table public.financeiro_details enable row level security;

create policy "authenticated full access" on public.financeiro_details
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.financeiro_details to anon, authenticated, service_role;
