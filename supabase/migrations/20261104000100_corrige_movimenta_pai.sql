-- o trigger único lia new.pai_id também em reacoes, que não tem essa coluna.
-- cada tabela passa a ter a sua função.
drop trigger if exists itens_movimenta_pai on itens;
drop trigger if exists reacoes_movimenta_item on reacoes;
drop function if exists movimenta_pai();

create or replace function movimenta_pai_do_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update itens set ultima_movimentacao = now() where id = new.pai_id;
  return null;
end $$;

create or replace function movimenta_item_da_reacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update itens set ultima_movimentacao = now() where id = new.item_id;
  return null;
end $$;

create trigger itens_movimenta_pai after insert on itens
  for each row when (new.pai_id is not null) execute function movimenta_pai_do_item();
create trigger reacoes_movimenta_item after insert on reacoes
  for each row execute function movimenta_item_da_reacao();
