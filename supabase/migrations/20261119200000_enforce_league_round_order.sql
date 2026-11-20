-- Prevent a league match from being finalized while an earlier round
-- still contains scheduled fixtures. Existing results are not modified.
CREATE OR REPLACE FUNCTION public.enforce_league_round_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.status = 'finished'
     AND OLD.status IS DISTINCT FROM 'finished'
     AND NEW.league_id IS NOT NULL
     AND NEW.round_number IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.matches previous_match
       WHERE previous_match.league_id = NEW.league_id
         AND previous_match.round_number < NEW.round_number
         AND previous_match.status <> 'finished'
     )
  THEN
    RAISE EXCEPTION
      'Conclua todas as partidas das rodadas anteriores antes de finalizar esta partida.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_league_round_order ON public.matches;

CREATE TRIGGER trg_enforce_league_round_order
BEFORE UPDATE OF status ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.enforce_league_round_order();
