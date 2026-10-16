-- supabase/migrations/20261016_trajectoire_scores_exposition.sql
-- Module Trajectoire, roadmap : score d'exposition climatique (c_expo) par actif de l'organisation.
-- Source : risk_scores (score AGE, décision du 13/10), dernier score validé par le client par actif.
-- Actifs de l'organisation : actifs.user_id = profils_client.id avec profils_client.organisation_id = org.
-- À APPLIQUER dans Supabase Studio (une seule commande, nouvel onglet). Ne pas rejouer une fois appliquée.

CREATE OR REPLACE FUNCTION public.trajectoire_scores_exposition(org uuid)
 RETURNS TABLE(actif_id uuid, score_global integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct on (a.id) a.id, r.score_global
  from public.profils_client pc
  join public.actifs a on a.user_id = pc.id and a.actif = true
  join public.risk_scores r on r.actif_id = a.id and r.valide_client = true
  where pc.organisation_id = org
    and public.trajectoire_acces(org)
    and r.score_global is not null
  order by a.id, r.created_at desc;
$function$;

REVOKE ALL ON FUNCTION public.trajectoire_scores_exposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trajectoire_scores_exposition(uuid) TO authenticated;