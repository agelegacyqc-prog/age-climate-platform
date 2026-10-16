-- Versionnage du trigger trg_risk_scores_maj_actif (14/10/2026).
-- DÉJÀ APPLIQUÉ EN PRODUCTION (projet vkclvfsblsjpuycjfiso) : ne pas rejouer.
-- Définition reprise telle quelle depuis pg_get_triggerdef / pg_get_functiondef.
-- Effet : à chaque INSERT dans risk_scores, l'actif lié passe à statut_analyse = 'complete'
-- et reçoit score_climatique = round(score_global) (valeur existante conservée si score_global est nul).

CREATE OR REPLACE FUNCTION public.maj_actif_depuis_risk_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.actif_id is not null then
    update public.actifs
    set statut_analyse = 'complete',
        score_climatique = coalesce(round(new.score_global), score_climatique)
    where id = new.actif_id;
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_risk_scores_maj_actif ON public.risk_scores;

CREATE TRIGGER trg_risk_scores_maj_actif
  AFTER INSERT ON public.risk_scores
  FOR EACH ROW EXECUTE FUNCTION public.maj_actif_depuis_risk_score();