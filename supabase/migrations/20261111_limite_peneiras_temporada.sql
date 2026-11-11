-- Limite de duas peneiras por clube em cada temporada.
-- Mantém os candidatos já existentes e contabiliza peneiras anteriores agrupadas pelo minuto de criação.

alter table public.academy_trials
  add column if not exists temporada integer,
  add column if not exists peneira_id uuid;

-- Recupera a temporada do clube e agrupa os candidatos antigos da mesma peneira.
update public.academy_trials at
set temporada = coalesce(l.temporada, 1)
from public.clubs c
left join public.leagues l on l.id = c.league_id
where c.id = at.club_id
  and at.temporada is null;

with grupos as (
  select club_id, date_trunc('minute', created_at) as minuto, gen_random_uuid() as novo_id
  from public.academy_trials
  where peneira_id is null
  group by club_id, date_trunc('minute', created_at)
)
update public.academy_trials at
set peneira_id = g.novo_id
from grupos g
where at.club_id = g.club_id
  and date_trunc('minute', at.created_at) = g.minuto
  and at.peneira_id is null;

alter table public.academy_trials
  alter column temporada set default 1,
  alter column temporada set not null,
  alter column peneira_id set not null;

create index if not exists academy_trials_club_season_idx
  on public.academy_trials (club_id, temporada, peneira_id);

create or replace function public.enforce_academy_trial_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_temporada integer;
  v_total integer;
begin
  select coalesce(l.temporada, 1)
    into v_temporada
  from public.clubs c
  left join public.leagues l on l.id = c.league_id
  where c.id = new.club_id;

  if v_temporada is null then
    raise exception 'Clube não encontrado para abrir a peneira.';
  end if;

  new.temporada := v_temporada;

  perform pg_advisory_xact_lock(hashtext(new.club_id::text || ':' || v_temporada::text));

  select count(distinct peneira_id)
    into v_total
  from public.academy_trials
  where club_id = new.club_id
    and temporada = v_temporada;

  if not exists (
    select 1
    from public.academy_trials
    where club_id = new.club_id
      and temporada = v_temporada
      and peneira_id = new.peneira_id
  ) and v_total >= 2 then
    raise exception 'Limite de 2 peneiras por temporada atingido.';
  end if;

  return new;
end;
$$;

drop trigger if exists academy_trials_limit_per_season on public.academy_trials;
create trigger academy_trials_limit_per_season
before insert on public.academy_trials
for each row execute function public.enforce_academy_trial_limit();
