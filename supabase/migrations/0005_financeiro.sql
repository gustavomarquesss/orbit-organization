-- Novo tipo de card para organizar despesas em uma aba própria (Financeiro),
-- separada das métricas e listagens gerais (Dashboard e Cards).
insert into public.card_types (key, label, emoji, sort_order)
values ('financeiro', 'Financeiro', '💰', 8)
on conflict (key) do nothing;
