-- Permite que o treinador ativo gerencie as táticas do clube em que trabalha,
-- mesmo quando o clube é controlado pela IA e owner_id é NULL.
-- Também permite processar partidas de outros clubes da mesma liga,
-- inclusive quando há outro treinador ativo em uma das equipes.

DROP POLICY IF EXISTS "club_tactics_read" ON public.club_tactical_settings;
DROP POLICY IF EXISTS "club_tactics_insert" ON public.club_tactical_settings;
DROP POLICY IF EXISTS "club_tactics_update" ON public.club_tactical_settings;

CREATE POLICY "club_tactics_read"
ON public.club_tactical_settings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_tactical_settings.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_tactical_settings.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "club_tactics_insert"
ON public.club_tactical_settings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_tactical_settings.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_tactical_settings.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "club_tactics_update"
ON public.club_tactical_settings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_tactical_settings.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_tactical_settings.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_tactical_settings.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_tactical_settings.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Dono pode consultar escalação padrão" ON public.club_default_lineups;
DROP POLICY IF EXISTS "Dono pode inserir escalação padrão" ON public.club_default_lineups;
DROP POLICY IF EXISTS "Dono pode atualizar escalação padrão" ON public.club_default_lineups;

CREATE POLICY "Dono ou treinador consulta escalação padrão"
ON public.club_default_lineups
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_default_lineups.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_default_lineups.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Dono ou treinador insere escalação padrão"
ON public.club_default_lineups
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_default_lineups.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_default_lineups.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Dono ou treinador atualiza escalação padrão"
ON public.club_default_lineups
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_default_lineups.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_default_lineups.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_default_lineups.club_id
      AND c.owner_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_employments me
    JOIN public.manager_careers mc ON mc.id = me.career_id
    WHERE me.club_id = club_default_lineups.club_id
      AND me.status = 'active'
      AND mc.user_id = (SELECT auth.uid())
  )
);

-- O treinador ativo da liga pode processar os jogos dos demais clubes IA.
-- O bloqueio anterior impedia partidas que envolviam outro treinador ativo,
-- fazendo cada treinador simular somente seus próprios jogos.
DO $fix_simulation$
DECLARE
  v_definition text := pg_get_functiondef('public.simulate_match(uuid)'::regprocedure);
  v_old text := $old$
       AND NOT EXISTS (
         SELECT 1
         FROM public.manager_employments other_manager
         WHERE other_manager.status = 'active'
           AND other_manager.club_id IN (
             v_match.home_club_id,
             v_match.away_club_id
           )
       )
$old$;
BEGIN
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Não foi possível localizar o bloqueio antigo em simulate_match(uuid); nenhuma alteração foi aplicada.';
  END IF;

  v_definition := replace(v_definition, v_old, '');
  EXECUTE v_definition;
END;
$fix_simulation$;
