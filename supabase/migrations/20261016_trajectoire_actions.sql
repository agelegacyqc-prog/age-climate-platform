-- supabase/migrations/20261016_trajectoire_actions.sql
-- Module Trajectoire, lot C : persistance des actions de la roadmap (adoption action par action).
-- Decisions PO du 16/10/2026 :
--  - ecriture reservee a admin_client et au personnel AGE (utilisateur_client en lecture seule) ;
--  - score_priorite = instantane calcule cote client (recalcul serveur de reference : lot D) ;
--  - le statut d une action n agit pas sur l exigence liee.
-- A APPLIQUER dans Supabase Studio, UN SEUL nouvel onglet, en une fois. Ne pas rejouer ensuite.
-- Avant : SELECT count(*) FROM public.trajectoire_actions;  (doit renvoyer 0, sinon me prevenir)

-- 1) Une action vient d une exigence OU d une extraction, jamais des deux, jamais d aucune.
ALTER TABLE public.trajectoire_actions
  ADD CONSTRAINT trajectoire_actions_source_unique
  CHECK ((exigence_id IS NULL) <> (extraction_id IS NULL)) NOT VALID;

-- 2) Score borne entre 0 et 100.
ALTER TABLE public.trajectoire_actions
  ADD CONSTRAINT trajectoire_actions_score_borne
  CHECK (score_priorite IS NULL OR (score_priorite >= 0 AND score_priorite <= 100)) NOT VALID;

-- 3) Pas de doublon d adoption tant que l action n est pas archivee.
CREATE UNIQUE INDEX ux_trajectoire_actions_exigence
  ON public.trajectoire_actions (exigence_id) WHERE exigence_id IS NOT NULL AND NOT archivee;
CREATE UNIQUE INDEX ux_trajectoire_actions_extraction
  ON public.trajectoire_actions (extraction_id) WHERE extraction_id IS NOT NULL AND NOT archivee;

-- 4) Controle des droits et de la coherence (meme modele que trajectoire_controler_exigence).
CREATE OR REPLACE FUNCTION public.trajectoire_controler_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_staff boolean;
  v_org uuid;
  v_type text;
  v_statut text;
begin
  -- auth.uid() nul : service role (Edge Function) ou migration
  if auth.uid() is null then
    return new;
  end if;
  v_staff := public.trajectoire_est_personnel_age();

  if tg_op = 'INSERT' then
    if not v_staff and not public.trajectoire_est_admin_client(new.organisation_id) then
      raise exception 'Gestion des actions reservee a admin_client et au personnel AGE';
    end if;

    if new.exigence_id is not null then
      select organisation_id into v_org from public.trajectoire_exigences where id = new.exigence_id;
      if v_org is distinct from new.organisation_id then
        raise exception 'Exigence introuvable pour cette organisation';
      end if;
    else
      select organisation_id, type_extraction, statut into v_org, v_type, v_statut
        from public.trajectoire_extractions where id = new.extraction_id;
      if v_org is distinct from new.organisation_id then
        raise exception 'Extraction introuvable pour cette organisation';
      end if;
      if v_type is distinct from 'recommandation' or v_statut not in ('valide_client', 'valide_age') then
        raise exception 'Seule une recommandation validee au moins par le client peut devenir une action';
      end if;
    end if;

    new.statut := 'a_lancer';
    new.archivee := false;
    new.archivee_at := null;
    if not v_staff then
      new.mission_id := null;
      new.ageadapt_mission_id := null;
      new.prerequis := '{}';
    end if;
    return new;
  end if;

  -- UPDATE
  if not v_staff and not public.trajectoire_est_admin_client(old.organisation_id) then
    raise exception 'Gestion des actions reservee a admin_client et au personnel AGE';
  end if;
  if new.organisation_id is distinct from old.organisation_id
     or new.exigence_id is distinct from old.exigence_id
     or new.extraction_id is distinct from old.extraction_id
     or new.actif_id is distinct from old.actif_id then
    raise exception 'Organisation, source et actif ne sont pas modifiables';
  end if;
  if not v_staff then
    if new.mission_id is distinct from old.mission_id
       or new.ageadapt_mission_id is distinct from old.ageadapt_mission_id
       or new.prerequis is distinct from old.prerequis then
      raise exception 'Liens missions et prerequis reserves au personnel AGE';
    end if;
  end if;
  if old.archivee and not new.archivee then
    raise exception 'Une action archivee n est pas restauree : adoptez de nouveau la source';
  end if;
  if new.archivee and not old.archivee then
    new.archivee_at := now();
  end if;
  return new;
end;
$function$;

CREATE TRIGGER trg_trajectoire_actions_controle
  BEFORE INSERT OR UPDATE ON public.trajectoire_actions
  FOR EACH ROW EXECUTE FUNCTION public.trajectoire_controler_action();