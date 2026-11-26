-- Finanças específicas para partidas de copa e catálogo inicial de torneios.
do $$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_get_functiondef('public.mfo_process_match_finances()'::regprocedure);
  v_new := replace(v_def,
    '  v_ratio numeric;',
    '  v_ratio numeric;
  v_comp_type text;
  v_comp_name text;'
  );
  v_new := replace(v_new,
    '  v_ref := case v_div when 1 then 60 when 2 then 40 when 3 then 25 else 20 end;',
    '  v_ref := case v_div when 1 then 60 when 2 then 40 when 3 then 25 else 20 end;

  if new.competition_season_id is not null then
    select c.competition_type, c.name into v_comp_type, v_comp_name
    from public.competition_seasons cs join public.competitions c on c.id = cs.competition_id
    where cs.id = new.competition_season_id;
    v_tv := case v_comp_type when ''national_cup'' then 40000 when ''continental_club'' then 120000 when ''intercontinental_club'' then 250000 else 0 end;
    v_ref := 45;
  end if;'
  );
  v_new := replace(v_new,
    '''Cota de TV - rodada '' || new.round_number',
    '''Cota de competição - '' || coalesce(v_comp_name, ''rodada'') || '' - fase '' || coalesce(new.phase, new.round_number::text)'
  );
  if v_new = v_def then raise exception 'Não foi possível ajustar o processamento financeiro de copas.'; end if;
  execute v_new;
end;
$$;

insert into public.competitions (code,name,competition_type,region,country,format,cycle_years)
values
 ('CUP-ZAF','Copa da África do Sul','national_cup','CAF','África do Sul','knockout',1),
 ('CUP-GER','Copa da Alemanha','national_cup','UEFA','Alemanha','knockout',1),
 ('CUP-KSA','Copa da Arábia Saudita','national_cup','AFC','Arábia Saudita','knockout',1),
 ('CUP-ARG','Copa Argentina','national_cup','CONMEBOL','Argentina','knockout',1),
 ('CUP-AUS','Copa da Austrália','national_cup','AFC','Austrália','knockout',1),
 ('CUP-BRA','Copa do Brasil','national_cup','CONMEBOL','Brasil','knockout',1),
 ('CUP-KOR','Copa da Coreia do Sul','national_cup','AFC','Coreia do Sul','knockout',1),
 ('CUP-EGY','Copa do Egito','national_cup','CAF','Egito','knockout',1),
 ('CUP-UAE','Copa dos Emirados Árabes Unidos','national_cup','AFC','Emirados Árabes Unidos','knockout',1),
 ('CUP-ESP','Copa do Rei','national_cup','UEFA','Espanha','knockout',1),
 ('CUP-FRA','Copa da França','national_cup','UEFA','França','knockout',1),
 ('CUP-NED','Copa da Holanda','national_cup','UEFA','Holanda','knockout',1),
 ('CUP-ENG','Copa da Inglaterra','national_cup','UEFA','Inglaterra','knockout',1),
 ('CUP-ITA','Copa da Itália','national_cup','UEFA','Itália','knockout',1),
 ('CUP-JPN','Copa do Imperador','national_cup','AFC','Japão','knockout',1),
 ('CUP-MAR','Copa do Marrocos','national_cup','CAF','Marrocos','knockout',1),
 ('CUP-MEX','Copa do México','national_cup','CONCACAF','México','knockout',1),
 ('CUP-NZL','Copa da Nova Zelândia','national_cup','OFC','Nova Zelândia','knockout',1),
 ('CUP-POR','Taça de Portugal','national_cup','UEFA','Portugal','knockout',1),
 ('CUP-TUN','Copa da Tunísia','national_cup','CAF','Tunísia','knockout',1),
 ('LIBERTADORES','Copa Libertadores','continental_club','CONMEBOL',null,'group_knockout',1),
 ('UCL','Champions League','continental_club','UEFA',null,'group_knockout',1),
 ('ACL','Champions League da Ásia','continental_club','AFC',null,'group_knockout',1),
 ('CAFCL','Champions League da África','continental_club','CAF',null,'group_knockout',1),
 ('CONCACAF','Champions Cup da CONCACAF','continental_club', 'CONCACAF',null,'group_knockout',1),
 ('OFC-CL','Champions League da Oceania','continental_club','OFC',null,'group_knockout',1),
 ('FIFA-CWC','Mundial de Clubes','intercontinental_club','FIFA',null,'group_knockout',4),
 ('FIFA-WCQ','Eliminatórias da Copa do Mundo','national_team_qualifier','FIFA',null,'qualifier',4),
 ('FIFA-WC','Copa do Mundo de Seleções','national_team_tournament','FIFA',null,'group_knockout',4)
on conflict (code) do update set
 name=excluded.name,competition_type=excluded.competition_type,
 region=excluded.region,country=excluded.country,format=excluded.format,
 cycle_years=excluded.cycle_years,is_active=true,updated_at=now();
