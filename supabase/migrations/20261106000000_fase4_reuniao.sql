-- fase 4: o que a reunião precisa guardar além de áudio, transcrição e proposta
alter table reunioes
  add column marcacoes   jsonb default '[]',   -- [{tipo: projeto|decisao|tarefa, projeto_id, em}] em segundos
  add column painel      jsonb,                -- foto do que mudou por projeto, tirada ao abrir a reunião
  add column fila        jsonb,                -- andamento da transcrição por bloco de áudio
  add column resumo      text,
  add column encerrada_em timestamptz;
