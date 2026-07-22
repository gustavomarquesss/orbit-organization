-- Dados iniciais das tabelas de lookup. team_members é populada automaticamente
-- (trigger on_auth_user_created) assim que pessoas forem criadas/convidadas via Supabase Auth.

insert into public.card_types (key, label, emoji, sort_order) values
  ('video', 'Vídeo', '🎥', 1),
  ('foto', 'Foto', '📸', 2),
  ('funil', 'Funil', '📱', 3),
  ('referencia', 'Referência', '🔎', 4),
  ('conteudo', 'Conteúdo', '📚', 5),
  ('reuniao', 'Reunião', '📅', 6),
  ('anotacao', 'Anotação', '📝', 7);

insert into public.statuses (key, label, color, sort_order) values
  ('a_fazer', 'A Fazer', '#64748b', 1),
  ('em_andamento', 'Em andamento', '#3b82f6', 2),
  ('aguardando', 'Aguardando', '#f59e0b', 3),
  ('concluido', 'Concluído', '#22c55e', 4),
  ('arquivado', 'Arquivado', '#a1a1aa', 5);

insert into public.priorities (key, label, color, sort_order) values
  ('baixa', 'Baixa', '#22c55e', 1),
  ('media', 'Média', '#3b82f6', 2),
  ('alta', 'Alta', '#f97316', 3),
  ('urgente', 'Urgente', '#ef4444', 4);

insert into public.modelos (name) values
  ('Dra. Angela Lima'),
  ('Tia Vera'),
  ('Ju Garçonete'),
  ('Cláudia Tricô');

insert into public.tags (name) values
  ('Telegram'),
  ('Story'),
  ('Instagram'),
  ('Conteúdo'),
  ('Gravação'),
  ('Modelo'),
  ('CTA'),
  ('VIP'),
  ('Marketing'),
  ('Roteiro'),
  ('Referência');
