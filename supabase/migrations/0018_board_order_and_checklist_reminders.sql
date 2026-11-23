-- Ordem manual dos cards dentro das colunas do quadro e lembretes de checklist diário.

-- ========== ordem manual no quadro ==========
alter table public.cards add column board_position double precision;

create index cards_board_position_idx on public.cards (status_id, board_position);

-- Reordenar no quadro ou trocar a capa não deve contar como "atualização" do card
-- (senão o card sobe em "Atualizados recentemente" e some de "Parados"). Qualquer outra
-- mudança continua atualizando updated_at/updated_by normalmente.
create or replace function public.set_updated_at_and_by()
returns trigger
language plpgsql
as $$
begin
  if (new.board_position is distinct from old.board_position or new.cover_color is distinct from old.cover_color)
     and (to_jsonb(new) - 'board_position' - 'cover_color' - 'updated_at' - 'updated_by')
       = (to_jsonb(old) - 'board_position' - 'cover_color' - 'updated_at' - 'updated_by') then
    new.updated_at = old.updated_at;
    new.updated_by = old.updated_by;
    return new;
  end if;

  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- ========== lembretes de checklist ==========
-- O resumo diário passa a ter mais de um tipo por dia (manhã e fim do dia).
alter table public.member_digest_log add column kind text not null default 'morning';

alter table public.member_digest_log
  drop constraint if exists member_digest_log_team_member_id_digest_date_key;

alter table public.member_digest_log
  add constraint member_digest_log_member_date_kind_key unique (team_member_id, digest_date, kind);
