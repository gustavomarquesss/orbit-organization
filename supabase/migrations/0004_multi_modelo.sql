-- Um card pode estar vinculado a 0, 1 ou várias modelos (incluindo todas).
-- Substitui cards.modelo_id (FK única) por uma tabela de relacionamento,
-- no mesmo padrão de card_tags/card_responsaveis.

create table public.card_modelos (
  card_id uuid not null references public.cards (id) on delete cascade,
  modelo_id uuid not null references public.modelos (id),
  primary key (card_id, modelo_id)
);

create index card_modelos_modelo_idx on public.card_modelos (modelo_id);

alter table public.cards drop column modelo_id;

alter table public.card_modelos enable row level security;

create policy "authenticated full access" on public.card_modelos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.card_modelos to anon, authenticated, service_role;
