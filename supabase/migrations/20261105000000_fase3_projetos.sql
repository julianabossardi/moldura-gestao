-- fase 3: arquivar e reativar projetos, leitura de números vivos

-- arquiva o projeto. decisoes: [{"item_id": "...", "acao": "arquivar" | "mover", "projeto_id": "..."}]
-- tarefa aberta sem decisão é arquivada. nada é apagado; ideias e referências ficam na memória.
create or replace function arquivar_projeto(p_id uuid, decisoes jsonb default '[]')
returns void language plpgsql set search_path = public as $$
declare d jsonb;
begin
  for d in select * from jsonb_array_elements(decisoes) loop
    if d->>'acao' = 'mover' and (d->>'projeto_id') is not null then
      update itens set projeto_id = (d->>'projeto_id')::uuid
       where id = (d->>'item_id')::uuid and projeto_id = p_id;
    end if;
  end loop;
  update itens set status = 'arquivada'
   where projeto_id = p_id and tipo = 'tarefa' and status in ('aberta', 'fazendo');
  update projetos set status = 'arquivado', arquivado_em = now() where id = p_id;
  update pessoas set projeto_do_dia = null, projeto_do_dia_em = null where projeto_do_dia = p_id;
end $$;

-- volta tudo como estava, menos as tarefas que foram arquivadas
create or replace function reativar_projeto(p_id uuid)
returns void language sql set search_path = public as $$
  update projetos set status = 'ativo', arquivado_em = null where id = p_id;
$$;

-- números vivos "sql": consulta somente-leitura que devolve um número.
-- só o service role executa (job diário).
create or replace function consulta_leitura(q text) returns numeric
language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  if q !~* '^\s*select\s' or q like '%;%' then
    raise exception 'só select, sem ponto e vírgula';
  end if;
  perform set_config('transaction_read_only', 'on', true);
  execute 'select (' || q || ')::numeric' into v;
  return v;
end $$;
revoke all on function consulta_leitura(text) from public, anon, authenticated;
grant execute on function consulta_leitura(text) to service_role;

-- números vivos iniciais
update projetos set metricas = '[
  {"rotulo":"usuários cadastrados","fonte":"sql","consulta":"select count(*) from auth.users","conexao_env":"FOLGA_DATABASE_URL","historico":[]},
  {"rotulo":"eventos publicados","fonte":"sql","consulta":"select count(*) from events","conexao_env":"FOLGA_DATABASE_URL","historico":[]}
]' where slug = 'folga';
update projetos set metricas = '[
  {"rotulo":"visitas no site","fonte":"manual","valor":0,"historico":[]},
  {"rotulo":"tarefas de prospecção abertas","fonte":"sql","consulta":"select count(*) from itens where tipo = ''tarefa'' and status in (''aberta'', ''fazendo'') and ''prospeccao'' = any(tags)","historico":[]}
]' where slug = 'moldura';
