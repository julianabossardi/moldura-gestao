-- fase 2: resumo da equipe para a página inicial (bonequinhos e "fazendo agora")
create or replace function equipe_resumo()
returns table (
  id uuid, nome text, estados estado_trabalho[],
  fazendo_id uuid, fazendo_titulo text,
  concluidos_7d int, ultima_atividade timestamptz, feliz boolean
)
language sql stable set search_path = public as $$
  select
    p.id, p.nome, p.estados,
    f.id, f.titulo,
    (select count(*)::int from itens i
       where coalesce(i.responsavel_id, i.autor_id) = p.id
         and i.status = 'concluida' and i.concluido_em >= now() - interval '7 days'),
    greatest(
      p.criado_em,
      (select max(i.ultima_movimentacao) from itens i where i.autor_id = p.id or i.responsavel_id = p.id),
      (select max(r.criado_em) from reacoes r where r.pessoa_id = p.id)
    ),
    exists (
      select 1 from itens e
       where e.tipo = 'entrega' and e.autor_id = p.id
         and (select count(distinct r.pessoa_id) from reacoes r
               where r.item_id = e.id and r.pessoa_id <> p.id
                 and r.criado_em >= now() - interval '48 hours') >= 2
    )
  from pessoas p
  left join lateral (
    select i.id, i.titulo from itens i
     where i.responsavel_id = p.id and i.status = 'fazendo' limit 1
  ) f on true
  where p.papel = 'socia' and p.ativa
  order by p.nome;
$$;
