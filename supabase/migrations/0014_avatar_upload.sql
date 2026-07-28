-- Foto de perfil (gamificação): campo para a URL da imagem e bucket de
-- Storage público para hospedá-la. O upload em si é feito por uma server
-- action com a service role key (mesmo padrão de lib/actions/team.ts), então
-- não é necessária nenhuma policy de INSERT em storage.objects — só o bucket
-- marcado como público, para que a URL da imagem seja acessível diretamente.
alter table public.team_members
  add column avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
