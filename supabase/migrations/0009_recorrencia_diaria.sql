-- Adiciona a opção "diária" de recorrência de cards e faz o prazo (se houver)
-- avançar junto no próximo ciclo, para que o lembrete de notificação continue
-- funcionando a cada card recriado (antes o prazo não era copiado).

alter table public.cards drop constraint cards_recorrencia_check;
alter table public.cards
  add constraint cards_recorrencia_check check (recorrencia in ('diaria', 'semanal', 'quinzenal', 'mensal'));

create or replace function public.handle_recurring_card_completion()
returns trigger
language plpgsql
as $$
declare
  concluido_id uuid;
  a_fazer_id uuid;
  new_card_id uuid;
  next_prazo_data date;
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
    observacoes, created_by, recorrencia, prazo_data, prazo_hora
  ) values (
    new.title, new.description, new.card_type_id, a_fazer_id, new.priority_id,
    new.observacoes, auth.uid(), new.recorrencia, next_prazo_data, new.prazo_hora
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
