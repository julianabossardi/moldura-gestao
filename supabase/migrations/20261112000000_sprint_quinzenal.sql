-- sprint quinzenal por projeto (revisão de 04/11): campos, sem tabela nova.
-- sprint_inicio: a segunda-feira em que a sprint 1 começou; as seguintes vêm a cada 14 dias.
-- sprint_objetivos: {"<número da sprint>": "objetivo"}; o objetivo antigo fica guardado (nada é apagado).
alter table projetos
  add column sprint_inicio date,
  add column sprint_objetivos jsonb not null default '{}';

update projetos set sprint_inicio = date_trunc('week', coalesce(criado_em, now()))::date where sprint_inicio is null;
alter table projetos alter column sprint_inicio set default (date_trunc('week', now()))::date;
alter table projetos alter column sprint_inicio set not null;
