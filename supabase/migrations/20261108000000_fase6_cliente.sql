-- fase 6: portal do cliente e integrações

alter table projetos add column integracoes jsonb default '{}'; -- {"github": "dono/repo", "vercel": {"projeto_id": "...", "time_id": "..."}}

-- cliente só enxerga projetos ativos: arquivar o projeto encerra o acesso, reativar devolve
create or replace function projetos_do_cliente() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select array_agg(p.id)
       from pessoas pe join projetos p on p.id = any (pe.projetos_cliente) and p.status = 'ativo'
      where pe.id = auth.uid() and pe.papel = 'cliente' and pe.ativa),
    '{}');
$$;

-- o cliente não lê a tabela projetos (ali ficam documentos fixados, consultas e integrações internas).
-- ele lê esta visão, só com o que o portal mostra.
drop policy cliente_le_projetos on projetos;
create view portal_projetos with (security_invoker = off) as
  select p.id, p.slug, p.nome, p.descricao, p.tema, p.proximo_marco, p.proximo_marco_em,
         coalesce((select jsonb_agg(m - 'consulta' - 'conexao_env' - 'propriedade')
                     from jsonb_array_elements(coalesce(p.metricas, '[]'::jsonb)) m
                    where coalesce((m ->> 'visivel_cliente')::boolean, true)), '[]'::jsonb) as metricas
    from projetos p
   where p.status = 'ativo' and (p.id = any (projetos_do_cliente()) or eh_socia());
grant select on portal_projetos to authenticated;

-- cliente só muda o status das tarefas em que é responsável (aberta <-> concluída)
create or replace function cliente_so_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare chaves text[] := array['status', 'concluido_em', 'ultima_movimentacao', 'validade', 'parada_em'];
begin
  if auth.uid() is not null and not eh_socia() then
    if (to_jsonb(new) - chaves) <> (to_jsonb(old) - chaves) then
      raise exception 'clientes só mudam o status das próprias tarefas';
    end if;
    if new.status not in ('aberta', 'concluida') then
      raise exception 'status não permitido para clientes';
    end if;
  end if;
  return new;
end $$;
create trigger itens_cliente_so_status before update on itens
  for each row execute function cliente_so_status();

-- cliente lê a própria pasta e a mídia das entregas que foram mostradas a ele
create policy midia_cliente_le on storage.objects for select to authenticated
  using (bucket_id = 'midia' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from itens i
                where i.visivel_cliente and i.projeto_id = any (projetos_do_cliente()) and i.midia ? name)));

-- visitas do site da moldura passam a vir do GA4 (até informar a propriedade, vale o número digitado)
update projetos set metricas = jsonb_set(metricas, '{0}', '{"rotulo":"visitas no site","fonte":"ga4","metrica":"sessions","propriedade":null,"dias":7,"valor":0,"historico":[]}')
 where slug = 'moldura' and metricas -> 0 ->> 'rotulo' = 'visitas no site';
