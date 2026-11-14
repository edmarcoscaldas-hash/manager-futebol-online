-- MFO: liberar a Base para o treinador da carreira ativa
-- Migração aditiva: não remove nem altera candidatos já cadastrados.

drop policy if exists mfo_academy_trials_select on public.academy_trials;
create policy mfo_academy_trials_select
on public.academy_trials
for select to authenticated
using (public.mfo_user_can_manage_club(club_id));

drop policy if exists mfo_academy_trials_insert on public.academy_trials;
create policy mfo_academy_trials_insert
on public.academy_trials
for insert to authenticated
with check (public.mfo_user_can_manage_club(club_id));

drop policy if exists mfo_academy_trials_update on public.academy_trials;
create policy mfo_academy_trials_update
on public.academy_trials
for update to authenticated
using (public.mfo_user_can_manage_club(club_id))
with check (public.mfo_user_can_manage_club(club_id));

grant select, insert, update on public.academy_trials to authenticated;

select
  'academy_trials RLS policies installed' as status,
  count(*) filter (where policyname='mfo_academy_trials_select') as select_policy,
  count(*) filter (where policyname='mfo_academy_trials_insert') as insert_policy,
  count(*) filter (where policyname='mfo_academy_trials_update') as update_policy
from pg_policies
where schemaname='public'
  and tablename='academy_trials';
