-- Padroniza o acesso e rebaixamento em exatamente quatro clubes por divisão.
-- Preserva as demais regras de encerramento de temporada.
do $migration$
declare
  v_definition text;
  v_original text;
begin
  select pg_get_functiondef('public.mfo_encerrar_temporada(text)'::regprocedure)
    into v_definition;

  v_original := v_definition;
  v_definition := replace(
    v_definition,
    'case when b.c >= 20 then 4 else 2 end',
    '4'
  );

  if v_definition = v_original then
    raise exception 'Não foi possível localizar a regra atual de acesso/rebaixamento; migração cancelada.';
  end if;

  execute v_definition;
end;
$migration$;
