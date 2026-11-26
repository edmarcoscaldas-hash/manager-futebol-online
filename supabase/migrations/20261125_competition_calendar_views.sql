-- Mantém o calendário nacional isolado e disponibiliza uma visão própria para copas.
create or replace view public.current_season_matches as
select m.id,m.league_id,m.round_number,m.match_date,m.home_club_id,m.away_club_id,
       m.home_score,m.away_score,m.status,m.played_at,m.created_at,m.updated_at,m.temporada
from public.matches m
join public.leagues l on l.id=m.league_id and l.temporada=m.temporada
where m.competition_season_id is null;

create or replace view public.current_season_competition_matches as
select m.id,m.league_id,m.competition_season_id,m.round_number,m.match_date,
       m.home_club_id,m.away_club_id,m.home_score,m.away_score,m.status,
       m.played_at,m.created_at,m.updated_at,m.temporada,m.phase,m.group_code,
       m.tie_code,m.leg_number,m.bracket_position,
       c.id as competition_id,c.code as competition_code,c.name as competition_name,
       c.competition_type,c.region,cs.season_number,cs.display_name as season_name,
       cs.status as season_status
from public.matches m
join public.leagues l on l.id=m.league_id and l.temporada=m.temporada
join public.competition_seasons cs on cs.id=m.competition_season_id
join public.competitions c on c.id=cs.competition_id;

grant select on public.current_season_competition_matches to authenticated;
