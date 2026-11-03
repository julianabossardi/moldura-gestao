-- fase 5: memória (busca por sentido), validade das ideias e faxina das tarefas paradas

alter table itens add column parada_em timestamptz; -- marcada pelo job da faxina, a cada 15 dias

-- trigger de escrita, agora ciente do que não é movimentação:
-- preencher embedding, marcar tarefa parada e expirar uma ideia não renovam validade nem "última movimentação"
create or replace function itens_antes_escrita() returns trigger
language plpgsql set search_path = public as $$
declare so_metadados boolean;
begin
  if tg_op = 'UPDATE' then
    if new.status = 'expirada' and old.status is distinct from 'expirada' then
      return new;
    end if;
    so_metadados :=
      (to_jsonb(new) - 'embedding' - 'parada_em' - 'ultima_movimentacao' - 'validade' - 'concluido_em')
      = (to_jsonb(old) - 'embedding' - 'parada_em' - 'ultima_movimentacao' - 'validade' - 'concluido_em');
    -- reação e item filho mexem em ultima_movimentacao de propósito: isso é movimento
    if so_metadados and new.ultima_movimentacao is not distinct from old.ultima_movimentacao then
      new.validade := old.validade;
      return new;
    end if;
    new.parada_em := null; -- qualquer movimento tira a tarefa da faxina
  end if;

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

-- memória: tudo que não é tarefa aberta (inclui arquivadas e expiradas)
create or replace function buscar_memoria(
  consulta extensions.vector(1024), p_projeto uuid default null, p_tipo item_tipo default null,
  p_autor uuid default null, p_site boolean default false, qtd int default 40
) returns table (id uuid, similaridade float)
language sql stable set search_path = public, extensions as $$
  select i.id, 1 - (i.embedding <=> consulta)
    from itens i
   where i.embedding is not null
     and (i.tipo <> 'tarefa' or i.status in ('concluida', 'arquivada', 'expirada'))
     and (p_projeto is null or i.projeto_id = p_projeto)
     and (p_tipo is null or i.tipo = p_tipo)
     and (p_autor is null or i.autor_id = p_autor)
     and (not p_site or 'site' = any (i.tags))
   order by i.embedding <=> consulta
   limit qtd;
$$;

-- "isso pode ajudar": até 3 itens de memória parecidos, acima do limiar de similaridade (a calibrar)
create or replace function ajudas_para_vetor(
  consulta extensions.vector(1024), qtd int default 3, limiar float default 0.78, excluir uuid default null
) returns table (id uuid, titulo text, tipo item_tipo, url text, similaridade float)
language sql stable set search_path = public, extensions as $$
  select m.id, m.titulo, m.tipo, m.url, 1 - (m.embedding <=> consulta)
    from itens m
   where m.embedding is not null
     and (m.tipo <> 'tarefa' or m.status in ('concluida', 'arquivada', 'expirada'))
     and (excluir is null or m.id <> excluir)
     and 1 - (m.embedding <=> consulta) >= limiar
   order by m.embedding <=> consulta
   limit qtd;
$$;

create or replace function ajudas_para(p_item uuid, qtd int default 3, limiar float default 0.78)
returns table (id uuid, titulo text, tipo item_tipo, url text, similaridade float)
language sql stable set search_path = public, extensions as $$
  select r.* from itens a, lateral ajudas_para_vetor(a.embedding, qtd, limiar, a.id) r
   where a.id = p_item and a.embedding is not null;
$$;

-- jobs diários e quinzenais (só o service role executa) --------------------------
create or replace function expirar_ideias() returns int
language sql security definer set search_path = public as $$
  with r as (
    update itens set status = 'expirada'
     where tipo in ('ideia', 'reflexao') and status = 'aberta' and validade < current_date
     returning 1)
  select count(*)::int from r;
$$;

-- recorte começado e não concluído em 3 dias volta para aberta, como abandonado
create or replace function abandonar_recortes() returns int
language sql security definer set search_path = public as $$
  with r as (
    update itens set status = 'aberta', recorte_retorno = 'abandonado'
     where origem = 'recorte' and status = 'fazendo' and ultima_movimentacao < now() - interval '3 days'
     returning 1)
  select count(*)::int from r;
$$;

-- tarefa aberta sem movimento há 30 dias é marcada como parada
create or replace function marcar_paradas() returns int
language sql security definer set search_path = public as $$
  with r as (
    update itens set parada_em = now()
     where tipo = 'tarefa' and status = 'aberta' and pai_id is null and parada_em is null
       and ultima_movimentacao < now() - interval '30 days'
     returning 1)
  select count(*)::int from r;
$$;

revoke all on function expirar_ideias(), abandonar_recortes(), marcar_paradas() from public, anon, authenticated;
grant execute on function expirar_ideias(), abandonar_recortes(), marcar_paradas() to service_role;
