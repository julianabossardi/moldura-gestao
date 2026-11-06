-- passo 2 da reunião (cruzamento com o contexto): o que cada item guarda de onde veio,
-- e o que a conferência do código achou em cada reunião.

-- de onde veio cada item criado pela reunião. fica em tabela à parte, só para sócias:
-- o trecho é fala da reunião interna e não pode ir junto se o item um dia for mostrado ao cliente.
create table itens_origem (
  item_id        uuid primary key references itens,
  reuniao_id     uuid references reunioes,
  trecho         text,                                          -- 8 a 30 palavras da transcrição, como foram ditas
  dono_origem    text check (dono_origem in ('fala', 'papel')), -- "papel": o responsável é sugestão pelo papel, não foi dito
  desdobramentos text[] not null default '{}',                  -- decisão: o que costuma sair dela (só sugestão, não são tarefas)
  criado_em      timestamptz not null default now()
);
create index on itens_origem (reuniao_id);
alter table itens_origem enable row level security;
create policy socia_itens_origem on itens_origem for all to authenticated using (eh_socia()) with check (eh_socia());
create trigger itens_origem_sem_delete before delete on itens_origem for each row execute function bloqueia_delete();

-- conferência feita pelo código (não pelo modelo) e o erro do passo 2, quando ele não rodou
alter table reunioes
  add column conferencia jsonb,   -- {mudou: [], trechos_apagados: [], altas_fora: [], mesmo_titulo: []}
  add column passo2_erro text;
