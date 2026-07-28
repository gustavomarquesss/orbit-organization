-- Financeiro passa a registrar não só gastos, mas também receitas (mesma
-- tabela, um campo a mais), para permitir calcular Lucro = Receita - Gastos.
alter table public.financeiro_details
  add column tipo text not null default 'gasto' check (tipo in ('gasto', 'receita'));

-- Metas mensais (limite de gastos e alvo de receita). Linha única (singleton)
-- identificada por um id fixo, editada via upsert, sem histórico por mês.
create table public.financeiro_metas (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  meta_gastos_mensal numeric(12, 2) not null default 0,
  meta_receita_mensal numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.financeiro_metas (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

create trigger financeiro_metas_set_updated_at
  before update on public.financeiro_metas
  for each row execute function public.set_updated_at_only();

alter table public.financeiro_metas enable row level security;

create policy "authenticated full access" on public.financeiro_metas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.financeiro_metas to anon, authenticated, service_role;
