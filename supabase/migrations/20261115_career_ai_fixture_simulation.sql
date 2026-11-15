-- Allow an authenticated career manager to simulate AI-vs-AI fixtures
-- in the same league, while preserving protection for other managed clubs.
CREATE OR REPLACE FUNCTION public.simulate_match(p_match_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_match record;
  v_home_owner uuid;
  v_away_owner uuid;

  v_home_starters uuid[];
  v_away_starters uuid[];
  v_home_bench uuid[];
  v_away_bench uuid[];

  v_home_lineup uuid;
  v_away_lineup uuid;

  v_home_formation text := '4-3-3';
  v_away_formation text := '4-3-3';
  v_home_style text := 'balanced';
  v_away_style text := 'balanced';
  v_home_mentality text := 'normal';
  v_away_mentality text := 'normal';

  v_home_avg numeric;
  v_away_avg numeric;
  v_home_bonus numeric := 0;
  v_away_bonus numeric := 0;
  v_home_chance numeric;
  v_away_chance numeric;

  v_home_score integer := 0;
  v_away_score integer := 0;
  v_minute integer;
  v_scorer uuid;
  v_i integer;
  v_points integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado.';
  END IF;

  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada.';
  END IF;

  IF v_match.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Esta partida não está disponível para simulação.';
  END IF;

  SELECT owner_id INTO v_home_owner
  FROM public.clubs
  WHERE id = v_match.home_club_id;

  SELECT owner_id INTO v_away_owner
  FROM public.clubs
  WHERE id = v_match.away_club_id;

  IF v_home_owner IS DISTINCT FROM v_user
     AND v_away_owner IS DISTINCT FROM v_user
     AND NOT EXISTS (
       SELECT 1
       FROM public.manager_employments me
       JOIN public.manager_careers mc
         ON mc.id = me.career_id
       WHERE mc.user_id = v_user
         AND me.status = 'active'
         AND me.club_id IN (
           v_match.home_club_id,
           v_match.away_club_id
         )
     )
     AND NOT (
       EXISTS (
         SELECT 1
         FROM public.manager_employments me
         JOIN public.manager_careers mc ON mc.id = me.career_id
         JOIN public.clubs managed_club ON managed_club.id = me.club_id
         WHERE mc.user_id = v_user
           AND me.status = 'active'
           AND managed_club.league_id = v_match.league_id
       )
       AND EXISTS (
         SELECT 1
         FROM public.clubs home_club
         JOIN public.clubs away_club ON away_club.id = v_match.away_club_id
         WHERE home_club.id = v_match.home_club_id
           AND COALESCE(home_club.is_ai, false) = true
           AND COALESCE(away_club.is_ai, false) = true
       )
       AND NOT EXISTS (
         SELECT 1
         FROM public.manager_employments other_manager
         WHERE other_manager.status = 'active'
           AND other_manager.club_id IN (
             v_match.home_club_id,
             v_match.away_club_id
           )
       )
     ) THEN
    RAISE EXCEPTION 'Você não é responsável nem treinador ativo de nenhum dos clubes desta partida.';
  END IF;

  -- Carrega as configurações táticas dos dois clubes.
  SELECT formation, tactical_style, mentality
  INTO v_home_formation, v_home_style, v_home_mentality
  FROM public.club_tactical_settings
  WHERE club_id = v_match.home_club_id;

  SELECT formation, tactical_style, mentality
  INTO v_away_formation, v_away_style, v_away_mentality
  FROM public.club_tactical_settings
  WHERE club_id = v_match.away_club_id;

  v_home_formation := COALESCE(v_home_formation, '4-3-3');
  v_away_formation := COALESCE(v_away_formation, '4-3-3');
  v_home_style := COALESCE(v_home_style, 'balanced');
  v_away_style := COALESCE(v_away_style, 'balanced');
  v_home_mentality := COALESCE(v_home_mentality, 'normal');
  v_away_mentality := COALESCE(v_away_mentality, 'normal');

  -- Tenta carregar os titulares salvos.
  SELECT array_agg(p.id ORDER BY x.ord)
  INTO v_home_starters
  FROM public.club_default_lineups d,
       LATERAL jsonb_array_elements_text(d.starters)
         WITH ORDINALITY AS x(player_id, ord)
  JOIN public.players p
    ON p.id = x.player_id::uuid
   AND p.club_id = v_match.home_club_id
   AND COALESCE(p.is_youth, false) = false
  WHERE d.club_id = v_match.home_club_id;

  SELECT array_agg(p.id ORDER BY x.ord)
  INTO v_away_starters
  FROM public.club_default_lineups d,
       LATERAL jsonb_array_elements_text(d.starters)
         WITH ORDINALITY AS x(player_id, ord)
  JOIN public.players p
    ON p.id = x.player_id::uuid
   AND p.club_id = v_match.away_club_id
   AND COALESCE(p.is_youth, false) = false
  WHERE d.club_id = v_match.away_club_id;

  -- Se não houver 11 titulares válidos, seleciona os melhores do elenco.
  IF COALESCE(cardinality(v_home_starters), 0) <> 11 THEN
    SELECT array_agg(id ORDER BY overall DESC, created_at)
    INTO v_home_starters
    FROM (
      SELECT id, overall, created_at
      FROM public.players
      WHERE club_id = v_match.home_club_id
        AND COALESCE(is_youth, false) = false
      ORDER BY overall DESC, created_at
      LIMIT 11
    ) p;
  END IF;

  IF COALESCE(cardinality(v_away_starters), 0) <> 11 THEN
    SELECT array_agg(id ORDER BY overall DESC, created_at)
    INTO v_away_starters
    FROM (
      SELECT id, overall, created_at
      FROM public.players
      WHERE club_id = v_match.away_club_id
        AND COALESCE(is_youth, false) = false
      ORDER BY overall DESC, created_at
      LIMIT 11
    ) p;
  END IF;

  IF COALESCE(cardinality(v_home_starters), 0) <> 11
     OR COALESCE(cardinality(v_away_starters), 0) <> 11 THEN
    RAISE EXCEPTION 'Um dos clubes não possui 11 jogadores profissionais disponíveis.';
  END IF;

  -- Carrega os reservas salvos, quando disponíveis.
  SELECT array_agg(p.id ORDER BY x.ord)
  INTO v_home_bench
  FROM public.club_default_lineups d,
       LATERAL jsonb_array_elements_text(d.bench)
         WITH ORDINALITY AS x(player_id, ord)
  JOIN public.players p
    ON p.id = x.player_id::uuid
   AND p.club_id = v_match.home_club_id
   AND COALESCE(p.is_youth, false) = false
  WHERE d.club_id = v_match.home_club_id
    AND NOT (p.id = ANY(v_home_starters));

  SELECT array_agg(p.id ORDER BY x.ord)
  INTO v_away_bench
  FROM public.club_default_lineups d,
       LATERAL jsonb_array_elements_text(d.bench)
         WITH ORDINALITY AS x(player_id, ord)
  JOIN public.players p
    ON p.id = x.player_id::uuid
   AND p.club_id = v_match.away_club_id
   AND COALESCE(p.is_youth, false) = false
  WHERE d.club_id = v_match.away_club_id
    AND NOT (p.id = ANY(v_away_starters));

  -- Completa os bancos automaticamente quando necessário.
  IF COALESCE(cardinality(v_home_bench), 0) < 7 THEN
    SELECT array_agg(id ORDER BY overall DESC)
    INTO v_home_bench
    FROM (
      SELECT id, overall
      FROM public.players
      WHERE club_id = v_match.home_club_id
        AND COALESCE(is_youth, false) = false
        AND NOT (id = ANY(v_home_starters))
      ORDER BY overall DESC
      LIMIT 7
    ) p;
  END IF;

  IF COALESCE(cardinality(v_away_bench), 0) < 7 THEN
    SELECT array_agg(id ORDER BY overall DESC)
    INTO v_away_bench
    FROM (
      SELECT id, overall
      FROM public.players
      WHERE club_id = v_match.away_club_id
        AND COALESCE(is_youth, false) = false
        AND NOT (id = ANY(v_away_starters))
      ORDER BY overall DESC
      LIMIT 7
    ) p;
  END IF;

  -- Calcula a força média dos titulares.
  SELECT AVG(overall)
  INTO v_home_avg
  FROM public.players
  WHERE id = ANY(v_home_starters);

  SELECT AVG(overall)
  INTO v_away_avg
  FROM public.players
  WHERE id = ANY(v_away_starters);

  -- Bônus tático.
  v_home_bonus :=
    CASE v_home_style
      WHEN 'offensive' THEN 2
      WHEN 'defensive' THEN -1
      ELSE 0
    END
    +
    CASE v_home_mentality
      WHEN 'very_offensive' THEN 3
      WHEN 'offensive' THEN 1
      WHEN 'defensive' THEN -1
      WHEN 'very_defensive' THEN -2
      ELSE 0
    END;

  v_away_bonus :=
    CASE v_away_style
      WHEN 'offensive' THEN 2
      WHEN 'defensive' THEN -1
      ELSE 0
    END
    +
    CASE v_away_mentality
      WHEN 'very_offensive' THEN 3
      WHEN 'offensive' THEN 1
      WHEN 'defensive' THEN -1
      WHEN 'very_defensive' THEN -2
      ELSE 0
    END;

  -- Probabilidade de gol em cada oportunidade.
  v_home_chance := LEAST(0.55, GREATEST(0.08,
    0.22 + ((v_home_avg - v_away_avg) * 0.004)
    + 0.06 + (v_home_bonus * 0.015)
  ));

  v_away_chance := LEAST(0.55, GREATEST(0.08,
    0.22 + ((v_away_avg - v_home_avg) * 0.004)
    - 0.02 + (v_away_bonus * 0.015)
  ));

  -- Registra as escalações da partida.
  INSERT INTO public.match_lineups (
    match_id, club_id, formation
  )
  VALUES (
    p_match_id, v_match.home_club_id, v_home_formation
  )
  ON CONFLICT (match_id, club_id)
  DO UPDATE SET formation = EXCLUDED.formation
  RETURNING id INTO v_home_lineup;

  INSERT INTO public.match_lineups (
    match_id, club_id, formation
  )
  VALUES (
    p_match_id, v_match.away_club_id, v_away_formation
  )
  ON CONFLICT (match_id, club_id)
  DO UPDATE SET formation = EXCLUDED.formation
  RETURNING id INTO v_away_lineup;

  DELETE FROM public.match_lineup_players
  WHERE lineup_id IN (v_home_lineup, v_away_lineup);

  FOR v_i IN 1..11 LOOP
    INSERT INTO public.match_lineup_players
      (lineup_id, player_id, is_starter, order_number)
    VALUES
      (v_home_lineup, v_home_starters[v_i], true, v_i),
      (v_away_lineup, v_away_starters[v_i], true, v_i);
  END LOOP;

  IF v_home_bench IS NOT NULL THEN
    FOR v_i IN 1..LEAST(cardinality(v_home_bench), 7) LOOP
      INSERT INTO public.match_lineup_players
        (lineup_id, player_id, is_starter, order_number)
      VALUES (v_home_lineup, v_home_bench[v_i], false, v_i + 11);
    END LOOP;
  END IF;

  IF v_away_bench IS NOT NULL THEN
    FOR v_i IN 1..LEAST(cardinality(v_away_bench), 7) LOOP
      INSERT INTO public.match_lineup_players
        (lineup_id, player_id, is_starter, order_number)
      VALUES (v_away_lineup, v_away_bench[v_i], false, v_i + 11);
    END LOOP;
  END IF;

  -- Simula cinco oportunidades de gol para cada equipe.
  FOR v_i IN 1..5 LOOP
    IF random() < v_home_chance THEN
      v_home_score := v_home_score + 1;
      v_scorer := v_home_starters[1 + floor(random() * 11)::integer];
      v_minute := 1 + floor(random() * 90)::integer;

      INSERT INTO public.match_events
        (match_id, club_id, player_id, minute, event_type, details)
      VALUES
        (p_match_id, v_match.home_club_id, v_scorer,
         v_minute, 'goal', 'Gol da equipe mandante');
    END IF;

    IF random() < v_away_chance THEN
      v_away_score := v_away_score + 1;
      v_scorer := v_away_starters[1 + floor(random() * 11)::integer];
      v_minute := 1 + floor(random() * 90)::integer;

      INSERT INTO public.match_events
        (match_id, club_id, player_id, minute, event_type, details)
      VALUES
        (p_match_id, v_match.away_club_id, v_scorer,
         v_minute, 'goal', 'Gol da equipe visitante');
    END IF;
  END LOOP;

  -- Finaliza a partida.
  UPDATE public.matches
  SET home_score = v_home_score,
      away_score = v_away_score,
      status = 'finished',
      played_at = now(),
      updated_at = now()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'home_score', v_home_score,
    'away_score', v_away_score,
    'message', 'Partida simulada com sucesso.'
  );
END;
$function$


REVOKE EXECUTE ON FUNCTION public.simulate_match(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.simulate_match(uuid) TO authenticated;
