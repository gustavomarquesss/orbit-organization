-- Dedupe do resumo diário agregado por pessoa ("Seu dia"), enviado uma vez
-- por dia por membro (independente de quantos cards estejam envolvidos).
create table public.member_digest_log (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  digest_date date not null,
  created_at timestamptz not null default now(),
  unique (team_member_id, digest_date)
);

alter table public.member_digest_log enable row level security;

create policy "authenticated full access" on public.member_digest_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant all on public.member_digest_log to anon, authenticated, service_role;
