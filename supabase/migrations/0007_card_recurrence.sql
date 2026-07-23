-- Recorrência opcional em qualquer card: ao ser marcado como Concluído, um
-- novo card é criado automaticamente para o próximo ciclo (mesmos dados,
-- status voltando para o inicial "A Fazer"), mantendo o card concluído como
-- histórico em vez de reescrevê-lo.

alter table public.cards
  add column recorrencia text check (recorrencia in ('semanal', 'quinzenal', 'mensal'));

create function public.handle_recurring_card_completion()
returns trigger
language plpgsql
as $$
declare
  concluido_id uuid;
  a_fazer_id uuid;
  new_card_id uuid;
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

  insert into public.cards (
    title, description, card_type_id, status_id, priority_id,
    observacoes, created_by, recorrencia
  ) values (
    new.title, new.description, new.card_type_id, a_fazer_id, new.priority_id,
    new.observacoes, auth.uid(), new.recorrencia
  ) returning id into new_card_id;

  insert into public.card_responsaveis (card_id, team_member_id)
  select new_card_id, team_member_id from public.card_responsaveis where card_id = new.id;

  insert into public.card_modelos (card_id, modelo_id)
  select new_card_id, modelo_id from public.card_modelos where card_id = new.id;

  insert into public.card_tags (card_id, tag_id)
  select new_card_id, tag_id from public.card_tags where card_id = new.id;

  return new;
end;
$$;

create trigger cards_handle_recurring_completion
  after update on public.cards
  for each row execute function public.handle_recurring_card_completion();
