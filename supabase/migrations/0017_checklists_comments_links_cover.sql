-- Recursos estilo Trello dentro do card: checklists (com opção "repetir todo dia"),
-- comentários, links/anexos e cor de capa.

-- ========== capa colorida ==========
alter table public.cards add column cover_color text;

-- ========== checklists ==========
create table public.card_checklists (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  title text not null default 'Checklist',
  -- Quando true, os itens "zeram" sozinhos na virada do dia: um item só conta como
  -- feito se done_on = hoje (fuso de Brasília, calculado no app). Não precisa de cron.
  repeat_daily boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index card_checklists_card_idx on public.card_checklists (card_id, sort_order);

create table public.card_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.card_checklists (id) on delete cascade,
  text text not null,
  -- checklist comum: usa "done". checklist diário: usa "done_on" (dia em que foi marcado).
  done boolean not null default false,
  done_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index card_checklist_items_checklist_idx on public.card_checklist_items (checklist_id, sort_order);

-- Histórico diário dos checklists que repetem todo dia (1 linha por checklist por dia).
create table public.checklist_daily_log (
  checklist_id uuid not null references public.card_checklists (id) on delete cascade,
  log_date date not null,
  done_count integer not null default 0,
  total_count integer not null default 0,
  primary key (checklist_id, log_date)
);

-- ========== comentários ==========
create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  author_id uuid references public.team_members (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index card_comments_card_idx on public.card_comments (card_id, created_at);

-- ========== links / anexos ==========
create table public.card_links (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  title text,
  url text not null,
  created_at timestamptz not null default now()
);

create index card_links_card_idx on public.card_links (card_id, created_at);

-- ========== RLS (mesmo padrão das demais tabelas) ==========
alter table public.card_checklists enable row level security;
alter table public.card_checklist_items enable row level security;
alter table public.checklist_daily_log enable row level security;
alter table public.card_comments enable row level security;
alter table public.card_links enable row level security;

create policy "authenticated full access" on public.card_checklists
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.card_checklist_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.checklist_daily_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.card_comments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.card_links
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.card_checklists to anon, authenticated, service_role;
grant all on public.card_checklist_items to anon, authenticated, service_role;
grant all on public.checklist_daily_log to anon, authenticated, service_role;
grant all on public.card_comments to anon, authenticated, service_role;
grant all on public.card_links to anon, authenticated, service_role;

-- ========== recorrência: o novo card do próximo ciclo herda capa e checklists ==========
-- (mesma função da migration 0009, acrescida da cópia de capa e checklists zerados)
create or replace function public.handle_recurring_card_completion()
returns trigger
language plpgsql
as $$
declare
  concluido_id uuid;
  a_fazer_id uuid;
  new_card_id uuid;
  next_prazo_data date;
  old_list record;
  new_list_id uuid;
begin
  if new.recorrencia is null then
    return new;
  end if;

  select id into concluido_id from public.statuses where key = 'concluido' limit 1;
  if concluido_id is null or new.status_id is distinct from concluido_id then
    return new;
  end if;

  -- só dispara na transição para Concluído, não em saves subsequentes
  if old.status_id = concluido_id then
    return new;
  end if;

  select id into a_fazer_id from public.statuses where key = 'a_fazer' limit 1;
  if a_fazer_id is null then
    return new;
  end if;

  if new.prazo_data is not null then
    next_prazo_data := (new.prazo_data + case new.recorrencia
      when 'diaria' then interval '1 day'
      when 'semanal' then interval '1 week'
      when 'quinzenal' then interval '2 weeks'
      when 'mensal' then interval '1 month'
    end)::date;
  end if;

  insert into public.cards (
    title, description, card_type_id, status_id, priority_id,
    observacoes, created_by, recorrencia, prazo_data, prazo_hora, cover_color
  ) values (
    new.title, new.description, new.card_type_id, a_fazer_id, new.priority_id,
    new.observacoes, auth.uid(), new.recorrencia, next_prazo_data, new.prazo_hora, new.cover_color
  ) returning id into new_card_id;

  insert into public.card_responsaveis (card_id, team_member_id)
  select new_card_id, team_member_id from public.card_responsaveis where card_id = new.id;

  insert into public.card_modelos (card_id, modelo_id)
  select new_card_id, modelo_id from public.card_modelos where card_id = new.id;

  insert into public.card_tags (card_id, tag_id)
  select new_card_id, tag_id from public.card_tags where card_id = new.id;

  for old_list in
    select id, title, repeat_daily, sort_order from public.card_checklists where card_id = new.id order by sort_order
  loop
    insert into public.card_checklists (card_id, title, repeat_daily, sort_order)
    values (new_card_id, old_list.title, old_list.repeat_daily, old_list.sort_order)
    returning id into new_list_id;

    insert into public.card_checklist_items (checklist_id, text, sort_order)
    select new_list_id, text, sort_order from public.card_checklist_items where checklist_id = old_list.id;
  end loop;

  return new;
end;
$$;
