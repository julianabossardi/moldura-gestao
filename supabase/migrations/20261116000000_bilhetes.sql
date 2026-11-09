-- bilhetes: recado de uma sócia para outra, que aparece como pop-up na página inicial de quem recebe.
-- só quem escreveu e quem recebeu enxergam o bilhete. quem recebe só pode marcar como lido; o texto não muda.
create table bilhetes (
  id        uuid primary key default gen_random_uuid(),
  de_id     uuid not null references pessoas,
  para_id   uuid not null references pessoas check (para_id <> de_id),
  texto     text not null check (length(trim(texto)) > 0 and length(texto) <= 1000),
  criado_em timestamptz not null default now(),
  lido_em   timestamptz
);
create index on bilhetes (para_id, lido_em);
create index on bilhetes (de_id, para_id, criado_em desc);

alter table bilhetes enable row level security;
create policy bilhete_le on bilhetes for select to authenticated using (de_id = auth.uid() or para_id = auth.uid());
create policy bilhete_escreve on bilhetes for insert to authenticated with check (de_id = auth.uid() and eh_socia());
create policy bilhete_lido on bilhetes for update to authenticated using (para_id = auth.uid()) with check (para_id = auth.uid());

-- a única mudança permitida depois de escrito é marcar como lido
create or replace function bilhetes_so_lido() returns trigger
language plpgsql as $$
begin
  if new.de_id <> old.de_id or new.para_id <> old.para_id or new.texto <> old.texto or new.criado_em <> old.criado_em then
    raise exception 'um bilhete escrito não muda: só dá para marcar como lido';
  end if;
  return new;
end $$;
create trigger bilhetes_so_lido before update on bilhetes for each row execute function bilhetes_so_lido();
create trigger bilhetes_sem_delete before delete on bilhetes for each row execute function bloqueia_delete();

alter publication supabase_realtime add table bilhetes;
