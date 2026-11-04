-- ajustes de layout, rodada 1 (docs/ajustes-de-layout-v1.md)

-- reações: dá para clicar várias vezes (cada clique é uma linha). áudio segue um por pessoa por item.
alter table reacoes drop constraint reacoes_item_id_pessoa_id_tipo_key;
create unique index reacoes_audio_unico on reacoes (item_id, pessoa_id) where tipo = 'audio';
-- nada é apagado: reação também não
create trigger reacoes_sem_delete before delete on reacoes for each row execute function bloqueia_delete();

-- tarefa ganha objetivo e definição de pronto no lugar do "texto"
alter table itens add column objetivo text, add column definicao_pronto text;

-- linha do tempo do projeto: [{titulo, data, feito}]. proximo_marco continua sendo o próximo da lista.
alter table projetos add column marcos jsonb default '[]';
update projetos set marcos = jsonb_build_array(jsonb_build_object('titulo', proximo_marco, 'data', proximo_marco_em, 'feito', false))
 where proximo_marco is not null and (marcos is null or marcos = '[]'::jsonb);
