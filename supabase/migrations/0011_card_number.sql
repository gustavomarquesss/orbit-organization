-- Número sequencial único e imutável por card, para referência humana rápida
-- ("card #42 precisa ser feito"). É só uma numeração de exibição/busca — não
-- substitui o id (uuid) usado internamente pelas relações.
alter table public.cards add column card_number integer;

with numbered as (
  select id, row_number() over (order by created_at, id) as rn from public.cards
)
update public.cards set card_number = numbered.rn
from numbered
where cards.id = numbered.id;

create sequence public.cards_card_number_seq;
select setval('public.cards_card_number_seq', coalesce((select max(card_number) from public.cards), 0) + 1, false);
alter sequence public.cards_card_number_seq owned by public.cards.card_number;

alter table public.cards
  alter column card_number set default nextval('public.cards_card_number_seq'),
  alter column card_number set not null,
  add constraint cards_card_number_key unique (card_number);
