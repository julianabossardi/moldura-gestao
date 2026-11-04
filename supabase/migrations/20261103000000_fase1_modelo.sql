-- plataforma interna da moldura · fase 1
-- tipos, seis tabelas, triggers, RLS, pgvector e bucket de mídia

create extension if not exists vector with schema extensions;

-- tipos ----------------------------------------------------------------
create type papel            as enum ('socia', 'cliente');
create type estado_trabalho  as enum ('leve', 'criativa', 'focada');
create type item_tipo        as enum ('tarefa', 'ideia', 'reflexao', 'referencia', 'decisao', 'entrega');
create type item_status      as enum ('aberta', 'fazendo', 'concluida', 'arquivada', 'expirada');
create type prioridade       as enum ('alta', 'media', 'baixa');
create type item_origem      as enum ('captura', 'reuniao', 'manual', 'recorte', 'faxina');
create type recorte_retorno  as enum ('aceito', 'trocado', 'editado', 'concluido', 'abandonado');
create type projeto_status   as enum ('ativo', 'arquivado');
create type captura_status   as enum ('recebida', 'transcrevendo', 'proposta', 'confirmada', 'recusada', 'erro');
create type reuniao_status   as enum ('gravando', 'processando', 'em_revisao', 'aprovada');

-- tabelas (ordem resolve as chaves estrangeiras) -----------------------
create table projetos (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  nome                text not null,
  descricao           text,
  tema                jsonb not null,
  ordem_prioridade    int,
  metricas            jsonb default '[]',
  links               jsonb default '[]',
  proximo_marco       text,
  proximo_marco_em    date,
  status              projeto_status not null default 'ativo',
  arquivado_em        timestamptz,
  criado_em           timestamptz default now()
);

create table pessoas (
  id                  uuid primary key references auth.users on delete cascade,
  nome                text not null,
  papel               papel not null default 'socia',
  projetos_cliente    uuid[] default '{}',
  avatar              jsonb,
  preferencias        jsonb default '{}',
  estados             estado_trabalho[] default '{}',
  projeto_do_dia      uuid references projetos,
  projeto_do_dia_em   date,
  ativa               boolean not null default true,
  criado_em           timestamptz default now()
);

create table capturas (
  id                  uuid primary key default gen_random_uuid(),
  autor_id            uuid not null references pessoas,
  projeto_id          uuid references projetos,
  formato             text not null check (formato in ('audio', 'link', 'texto', 'arquivo')),
  arquivo_path        text,
  url                 text,
  texto               text,
  transcricao         text,
  proposta            jsonb,
  status              captura_status not null default 'recebida',
  criado_em           timestamptz default now()
);

create table reunioes (
  id                  uuid primary key default gen_random_uuid(),
  data                date not null,
  audio_paths         text[] default '{}',
  falantes            jsonb default '{}',
  transcricao         jsonb,
  proposta            jsonb,
  status              reuniao_status not null default 'gravando',
  criado_em           timestamptz default now()
);

create table itens (
  id                  uuid primary key default gen_random_uuid(),
  tipo                item_tipo not null,
  titulo              text not null,
  corpo               text,
  url                 text,
  midia               jsonb default '[]',
  tags                text[] default '{}',
  projeto_id          uuid references projetos,
  autor_id            uuid not null references pessoas,
  responsavel_id      uuid references pessoas,
  prioridade          prioridade,
  status              item_status not null default 'aberta',
  prazo               date,
  pai_id              uuid references itens,
  estados             estado_trabalho[],
  minutos_estimados   int,
  recorte_retorno     recorte_retorno,
  validade            date,
  visivel_cliente     boolean not null default false,
  origem              item_origem not null default 'manual',
  captura_id          uuid references capturas,
  reuniao_id          uuid references reunioes,
  embedding           extensions.vector(1024),
  ultima_movimentacao timestamptz not null default now(),
  concluido_em        timestamptz,
  criado_em           timestamptz default now()
);

create table reacoes (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references itens,
  pessoa_id           uuid not null references pessoas,
  tipo                text not null default 'foguinho',
  audio_path          text,
  criado_em           timestamptz default now(),
  unique (item_id, pessoa_id, tipo)
);

create index on itens (projeto_id, status);
create index on itens (responsavel_id, status);
create index on itens (tipo, status);
create index on itens (pai_id);
create index on capturas (autor_id, status);
create index on itens using hnsw (embedding extensions.vector_cosine_ops);

-- funções de apoio -----------------------------------------------------
create or replace function eh_socia() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pessoas where id = auth.uid() and papel = 'socia' and ativa);
$$;

create or replace function projetos_do_cliente() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce((select projetos_cliente from pessoas
                   where id = auth.uid() and papel = 'cliente' and ativa), '{}');
$$;

-- triggers: itens ------------------------------------------------------
create or replace function itens_antes_escrita() returns trigger
language plpgsql set search_path = public as $$
begin
  new.ultima_movimentacao := now();
  if tg_op = 'INSERT' and new.tipo in ('ideia', 'reflexao') and new.validade is null then
    new.validade := (now() + interval '42 days')::date;
  end if;
  if tg_op = 'UPDATE' and new.tipo in ('ideia', 'reflexao') then
    new.validade := (now() + interval '42 days')::date;
  end if;
  if new.status = 'concluida' and new.concluido_em is null then
    new.concluido_em := now();
  end if;
  if new.status <> 'concluida' then
    new.concluido_em := null;
  end if;
  return new;
end $$;

create trigger itens_antes_escrita before insert or update on itens
  for each row execute function itens_antes_escrita();

-- no máximo um "fazendo" por pessoa: o anterior volta para aberta
create or replace function itens_um_fazendo() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'fazendo' and new.responsavel_id is not null then
    update itens set status = 'aberta'
     where responsavel_id = new.responsavel_id and status = 'fazendo' and id <> new.id;
  end if;
  return null;
end $$;

create trigger itens_um_fazendo after insert or update of status, responsavel_id on itens
  for each row when (new.status = 'fazendo') execute function itens_um_fazendo();

-- item filho novo e reação contam como movimentação do item
create or replace function movimenta_pai() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'itens' and new.pai_id is not null then
    update itens set ultima_movimentacao = now() where id = new.pai_id;
  elsif tg_table_name = 'reacoes' then
    update itens set ultima_movimentacao = now() where id = new.item_id;
  end if;
  return null;
end $$;

create trigger itens_movimenta_pai after insert on itens
  for each row when (new.pai_id is not null) execute function movimenta_pai();
create trigger reacoes_movimenta_item after insert on reacoes
  for each row execute function movimenta_pai();

-- nada é apagado: delete bloqueado nas tabelas de conteúdo
create or replace function bloqueia_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'nada é apagado na moldura: use status';
end $$;

create trigger itens_sem_delete before delete on itens for each row execute function bloqueia_delete();
create trigger projetos_sem_delete before delete on projetos for each row execute function bloqueia_delete();

-- cria a pessoa quando uma sócia entra pela primeira vez.
-- clientes são criadas pelo script convidar-cliente (service role).
create or replace function nova_pessoa_auth() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  socias text[] := array['juliana.bossardi@gmail.com'];
begin
  if lower(new.email) = any (socias) then
    insert into pessoas (id, nome, papel)
    values (new.id, initcap(split_part(split_part(new.email, '@', 1), '.', 1)), 'socia')
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function nova_pessoa_auth();

-- RLS ------------------------------------------------------------------
alter table pessoas  enable row level security;
alter table projetos enable row level security;
alter table itens    enable row level security;
alter table capturas enable row level security;
alter table reunioes enable row level security;
alter table reacoes  enable row level security;

-- sócia: tudo
create policy socia_pessoas  on pessoas  for all to authenticated using (eh_socia()) with check (eh_socia());
create policy socia_projetos on projetos for all to authenticated using (eh_socia()) with check (eh_socia());
create policy socia_itens    on itens    for all to authenticated using (eh_socia()) with check (eh_socia());
create policy socia_capturas on capturas for all to authenticated using (eh_socia()) with check (eh_socia());
create policy socia_reunioes on reunioes for all to authenticated using (eh_socia()) with check (eh_socia());
create policy socia_reacoes  on reacoes  for all to authenticated using (eh_socia()) with check (eh_socia());

-- cliente
create policy cliente_le_si on pessoas for select to authenticated using (id = auth.uid());
create policy cliente_le_projetos on projetos for select to authenticated
  using (id = any (projetos_do_cliente()) and status = 'ativo');
create policy cliente_le_itens on itens for select to authenticated
  using (projeto_id = any (projetos_do_cliente())
         and (visivel_cliente or responsavel_id = auth.uid()));
create policy cliente_conclui_tarefa on itens for update to authenticated
  using (responsavel_id = auth.uid() and projeto_id = any (projetos_do_cliente()))
  with check (responsavel_id = auth.uid() and projeto_id = any (projetos_do_cliente()));
create policy cliente_cria_captura on capturas for insert to authenticated
  with check (autor_id = auth.uid() and projeto_id = any (projetos_do_cliente()));
create policy cliente_le_capturas on capturas for select to authenticated
  using (autor_id = auth.uid());

-- Storage: bucket privado "midia" ----------------------------------------
insert into storage.buckets (id, name, public)
values ('midia', 'midia', false)
on conflict (id) do nothing;

-- sócias: leitura e escrita; clientes: sobem apenas na própria pasta (<uid>/...)
create policy midia_socia on storage.objects for all to authenticated
  using (bucket_id = 'midia' and eh_socia())
  with check (bucket_id = 'midia' and eh_socia());
create policy midia_cliente_sobe on storage.objects for insert to authenticated
  with check (bucket_id = 'midia' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime ---------------------------------------------------------------
alter publication supabase_realtime add table itens, pessoas, reacoes;

-- busca por sentido: 5 itens abertos mais parecidos, por embedding ----------
create or replace function itens_parecidos(
  consulta extensions.vector(1024), qtd int default 5, so_abertos boolean default true
) returns table (id uuid, titulo text, tipo item_tipo, status item_status, similaridade float)
language sql stable set search_path = public, extensions as $$
  select i.id, i.titulo, i.tipo, i.status, 1 - (i.embedding <=> consulta) as similaridade
    from itens i
   where i.embedding is not null
     and (not so_abertos or i.status in ('aberta', 'fazendo'))
   order by i.embedding <=> consulta
   limit qtd;
$$;

-- seed: projetos iniciais -------------------------------------------------
insert into projetos (slug, nome, descricao, tema, ordem_prioridade, metricas) values
 ('folga', 'folga', 'app de lazer e cultura no rio de janeiro',
  '{"cor_fundo":"#ffffff","cor_texto":"#1a1a1f","cor_destaque":"#e32450","fonte":"Instrument Sans","icone":"folga"}', 1,
  '[{"rotulo":"usuários cadastrados","fonte":"sql"},{"rotulo":"eventos publicados","fonte":"sql"}]'),
 ('moldura', 'moldura', 'site, redes sociais e prospecção',
  '{"cor_fundo":"#f8f7f8","cor_texto":"#000000","cor_destaque":"#e32450","fonte":"Instrument Sans","icone":"moldura"}', 2,
  '[{"rotulo":"visitas no site","fonte":"manual","valor":0},{"rotulo":"tarefas de prospecção abertas","fonte":"sql"}]'),
 ('vetor', 'Vetor', 'praticamente finalizado',
  '{"cor_fundo":"#ffffff","cor_texto":"#1a1a1f","cor_destaque":"#1a1a1f","fonte":"Instrument Sans","icone":"vetor"}', 3,
  '[]');
