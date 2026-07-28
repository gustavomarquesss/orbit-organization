-- Gamificação: ranking mensal de tarefas concluídas por responsável.
-- Precisamos saber EXATAMENTE quando um card virou "Concluído" (não só que
-- está concluído hoje) para poder resetar a contagem do ranking todo mês.
alter table public.cards
  add column concluded_at timestamptz;

create or replace function public.set_concluded_at()
returns trigger
language plpgsql
as $$
declare
  concluido_id uuid;
begin
  select id into concluido_id from public.statuses where key = 'concluido' limit 1;

  if concluido_id is null then
    return new;
  end if;

  if new.status_id = concluido_id then
    -- só marca na transição para Concluído (insert direto nesse status, ou
    -- update vindo de um status diferente) — não re-marca em saves seguintes.
    if tg_op = 'INSERT' or old.status_id is distinct from concluido_id then
      new.concluded_at = now();
    end if;
  else
    new.concluded_at = null;
  end if;

  return new;
end;
$$;

create trigger cards_set_concluded_at
  before insert or update on public.cards
  for each row execute function public.set_concluded_at();

-- Backfill: não temos o instante exato em que os cards já concluídos hoje
-- mudaram de status, então aproximamos usando updated_at (última alteração).
update public.cards
set concluded_at = updated_at
where concluded_at is null
  and status_id = (select id from public.statuses where key = 'concluido' limit 1);

-- A partir de agora, cards de tarefa (Vídeo/Foto/Funil/Referência/Conteúdo)
-- passam a ter no máximo 1 responsável — só Reunião continua permitindo
-- vários. Isso torna a marcação individual "minha parte pronta" (done_at)
-- obsoleta: sem múltiplos responsáveis, ela não tem mais função.
alter table public.card_responsaveis
  drop column done_at;
