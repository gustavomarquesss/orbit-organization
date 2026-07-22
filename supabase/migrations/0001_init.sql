-- Painel interno: schema inicial
-- Tabelas de lookup (card_types/statuses/priorities) em vez de enums para permitir
-- que novos tipos/status/prioridades sejam adicionados via INSERT (tela de Configurações),
-- sem precisar de deploy de código.

create extension if not exists pgcrypto;

-- ========== Lookup tables ==========

create table public.card_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  emoji text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  color text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  color text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.modelos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ========== team_members (espelha auth.users) ==========

create table public.team_members (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_color text not null default '#6366f1',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Toda vez que alguém é convidado/criado via Supabase Auth, vira automaticamente
-- um team_member — adicionar pessoa nova não exige nenhuma alteração de código.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== cards (entidade central) ==========

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  card_type_id uuid not null references public.card_types (id),
  modelo_id uuid references public.modelos (id),
  status_id uuid not null references public.statuses (id),
  priority_id uuid not null references public.priorities (id),
  responsavel_id uuid references public.team_members (id),
  observacoes text,
  created_by uuid not null references public.team_members (id),
  updated_by uuid references public.team_members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(observacoes, '')), 'C')
  ) stored
);

create index cards_search_idx on public.cards using gin (search_vector);
create index cards_status_idx on public.cards (status_id);
create index cards_type_idx on public.cards (card_type_id);
create index cards_priority_idx on public.cards (priority_id);
create index cards_responsavel_idx on public.cards (responsavel_id);
create index cards_modelo_idx on public.cards (modelo_id);
create index cards_created_at_idx on public.cards (created_at desc);
create index cards_updated_at_idx on public.cards (updated_at desc);

-- updated_at/updated_by nunca dependem de código da aplicação lembrar de setá-los.
create function public.set_updated_at_and_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at_and_by();

-- ========== card_tags (muitos-para-muitos) ==========

create table public.card_tags (
  card_id uuid not null references public.cards (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (card_id, tag_id)
);

create index card_tags_tag_idx on public.card_tags (tag_id);

-- ========== meeting_details (extensão específica do tipo Reunião) ==========
-- Padrão a repetir para qualquer tipo futuro que precise de campos próprios
-- (ex.: um futuro funil_details) sem nunca alterar a tabela cards.
-- Status e Observações não são duplicados aqui: reaproveitam os campos de cards.

create table public.meeting_details (
  card_id uuid primary key references public.cards (id) on delete cascade,
  meeting_date date not null,
  meeting_time time,
  assuntos text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at_only()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meeting_details_set_updated_at
  before update on public.meeting_details
  for each row execute function public.set_updated_at_only();

create table public.meeting_participants (
  card_id uuid not null references public.meeting_details (card_id) on delete cascade,
  team_member_id uuid not null references public.team_members (id),
  primary key (card_id, team_member_id)
);

-- ========== RLS ==========
-- Não é multi-tenant: qualquer pessoa autenticada da equipe pode ler/escrever tudo.
-- team_members é a única exceção (somente leitura via client; escrita via trigger/service role).

alter table public.card_types enable row level security;
alter table public.statuses enable row level security;
alter table public.priorities enable row level security;
alter table public.modelos enable row level security;
alter table public.tags enable row level security;
alter table public.team_members enable row level security;
alter table public.cards enable row level security;
alter table public.card_tags enable row level security;
alter table public.meeting_details enable row level security;
alter table public.meeting_participants enable row level security;

create policy "authenticated full access" on public.card_types
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.statuses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.priorities
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.modelos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.tags
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.cards
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.card_tags
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.meeting_details
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on public.meeting_participants
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated can read team" on public.team_members
  for select using (auth.role() = 'authenticated');
