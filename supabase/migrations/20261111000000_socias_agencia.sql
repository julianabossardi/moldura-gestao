-- sócias reconhecidas no primeiro login: e-mails da agência, mais o e-mail pessoal da Juliana
create or replace function nova_pessoa_auth() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  socias text[] := array[
    'juliana.bossardi@gmail.com',
    'juliana@agenciamoldura.com',
    'larissa@agenciamoldura.com',
    'viviane@agenciamoldura.com'
  ];
begin
  if lower(new.email) = any (socias) then
    insert into pessoas (id, nome, papel)
    values (new.id, initcap(split_part(split_part(new.email, '@', 1), '.', 1)), 'socia')
    on conflict do nothing;
  end if;
  return new;
end $$;
