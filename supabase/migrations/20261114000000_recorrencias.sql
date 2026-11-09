-- tarefas que se repetem (post da semana, texto do mês) e tarefas que só podem começar mais tarde.
-- a recorrência é o modelo; cada período vira uma tarefa comum em "itens", criada pelo cron diário.

alter type item_origem add value if not exists 'recorrencia';

create table recorrencias (
  id               uuid primary key default gen_random_uuid(),
  projeto_id       uuid not null references projetos,
  titulo           text not null,
  objetivo         text,
  definicao_pronto text,
  prioridade       prioridade not null default 'media',
  responsavel_id   uuid references pessoas,            -- dono padrão; dá para trocar em cada tarefa
  criada_por       uuid not null references pessoas,   -- autora das tarefas criadas
  frequencia       text not null check (frequencia in ('semanal', 'quinzenal', 'mensal')),
  quantidade       int  not null default 1 check (quantidade between 1 and 14),   -- tarefas por período
  variacoes        text[] not null default '{}',       -- se houver, alternam no título (ex.: "1 lâmina", "carrossel de 4 lâminas")
  prazo_no_periodo text not null default 'sex'
    check (prazo_no_periodo ~ '^(seg|ter|qua|qui|sex|sab|dom|ultimo_dia_util|dia-([1-9]|[12][0-9]|3[01]))$'),
  depende_de       uuid references recorrencias,       -- precisa estar feita antes (a tarefa mostra "espera: ...")
  ativa            boolean not null default true,      -- desligar sem apagar
  inicio           date not null default current_date, -- ponto de partida da conta quinzenal
  criado_em        timestamptz not null default now(),
  check (depende_de is distinct from id)
);
create index on recorrencias (projeto_id);

alter table recorrencias enable row level security;
create policy socia_recorrencias on recorrencias for all to authenticated using (eh_socia()) with check (eh_socia());
create trigger recorrencias_sem_delete before delete on recorrencias for each row execute function bloqueia_delete();

alter table itens
  add column recorrencia_id uuid references recorrencias,
  add column periodo        date,        -- primeiro dia do período (segunda, início da quinzena ou dia 1)
  add column vez            smallint,    -- qual da quantidade do período (1, 2...)
  add column comeca_em      date,        -- só aparece no painel da pessoa a partir daqui
  add column espera_item_id uuid references itens;  -- a tarefa que precisa ficar pronta antes

-- criar duas vezes o mesmo período não duplica (linhas sem recorrência têm null e não entram na regra)
create unique index itens_recorrencia_periodo_vez on itens (recorrencia_id, periodo, vez);
create index on itens (recorrencia_id, status);
