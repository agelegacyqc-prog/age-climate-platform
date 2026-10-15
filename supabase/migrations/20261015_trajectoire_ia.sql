-- 20261015_trajectoire_ia.sql
-- Module Trajectoire : analyse IA des documents (consentement client, limites, journal).
-- A appliquer sur la base de production (projet Supabase vkclvfsblsjpuycjfiso).
-- Ne touche pas aux tables ni aux triggers existants.
-- Decisions PO du 15/10/2026 : analyse automatique au depot, consentement donne par admin_client
-- (une ligne active par organisation, retrait possible), limites de test dans une table de parametres.

-- TABLES

CREATE TABLE public.trajectoire_consentements_ia (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  consenti_par uuid NOT NULL,
  consenti_le timestamp with time zone DEFAULT now() NOT NULL,
  texte_version text NOT NULL,
  retire_par uuid,
  retire_le timestamp with time zone,
  CONSTRAINT trajectoire_consentements_ia_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_consentements_ia_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id),
  CONSTRAINT trajectoire_consentements_ia_retrait_coherent CHECK (((retire_le IS NULL) = (retire_par IS NULL)))
);

-- Un seul consentement actif par organisation ; l'historique des retraits est conserve.
CREATE UNIQUE INDEX ux_trajectoire_consentements_ia_actif
  ON public.trajectoire_consentements_ia USING btree (organisation_id) WHERE (retire_le IS NULL);

CREATE TABLE public.trajectoire_ia_parametres (
  id boolean DEFAULT true NOT NULL,
  analyses_par_jour_par_org integer DEFAULT 5 NOT NULL,
  taille_max_octets bigint DEFAULT 10485760 NOT NULL,
  pages_max integer DEFAULT 40 NOT NULL,
  modele text DEFAULT 'claude-sonnet-5-5' NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_ia_parametres_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_ia_parametres_une_ligne CHECK (id),
  CONSTRAINT trajectoire_ia_parametres_analyses_check CHECK ((analyses_par_jour_par_org > 0)),
  CONSTRAINT trajectoire_ia_parametres_taille_check CHECK ((taille_max_octets > 0)),
  CONSTRAINT trajectoire_ia_parametres_pages_check CHECK ((pages_max > 0))
);

INSERT INTO public.trajectoire_ia_parametres DEFAULT VALUES;

CREATE TABLE public.trajectoire_ia_journal (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  trajectoire_document_id uuid NOT NULL,
  demarre_le timestamp with time zone DEFAULT now() NOT NULL,
  termine_le timestamp with time zone,
  resultat text DEFAULT 'en_cours'::text NOT NULL,
  motif text,
  modele text,
  jetons_entree integer,
  jetons_sortie integer,
  nb_extractions integer,
  CONSTRAINT trajectoire_ia_journal_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_ia_journal_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id),
  CONSTRAINT trajectoire_ia_journal_document_fkey FOREIGN KEY (trajectoire_document_id) REFERENCES trajectoire_documents(id),
  CONSTRAINT trajectoire_ia_journal_resultat_check CHECK ((resultat = ANY (ARRAY['en_cours'::text, 'extrait'::text, 'partiel'::text, 'echec'::text, 'refuse'::text])))
);

CREATE INDEX ix_trajectoire_ia_journal_org_date ON public.trajectoire_ia_journal USING btree (organisation_id, demarre_le);
CREATE INDEX ix_trajectoire_ia_journal_doc ON public.trajectoire_ia_journal USING btree (trajectoire_document_id);

-- FONCTIONS

-- Controle du consentement : auteur et dates forces par le serveur ; seul le retrait est possible.
-- auth.uid() nul : service role ou migration.
CREATE OR REPLACE FUNCTION public.trajectoire_controler_consentement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.consenti_par := auth.uid();
    new.consenti_le  := now();
    new.retire_par   := null;
    new.retire_le    := null;
    return new;
  end if;

  -- UPDATE : seul le retrait est autorise
  if new.organisation_id is distinct from old.organisation_id
     or new.consenti_par is distinct from old.consenti_par
     or new.consenti_le is distinct from old.consenti_le
     or new.texte_version is distinct from old.texte_version then
    raise exception 'Consentement non modifiable';
  end if;
  if old.retire_le is not null then
    raise exception 'Consentement deja retire';
  end if;
  if new.retire_le is not null then
    new.retire_par := auth.uid();
    new.retire_le  := now();
  end if;
  return new;
end;
$function$;

-- Nombre d'analyses du jour pour une organisation (jour calendaire Europe/Paris, refus exclus).
-- Reservee au service role (Edge Function).
CREATE OR REPLACE FUNCTION public.trajectoire_ia_analyses_du_jour(org uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::integer
  from public.trajectoire_ia_journal j
  where j.organisation_id = org
    and j.resultat <> 'refuse'
    and (j.demarre_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date;
$function$;

REVOKE ALL ON FUNCTION public.trajectoire_ia_analyses_du_jour(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trajectoire_ia_analyses_du_jour(uuid) TO service_role;

-- TRIGGERS
CREATE TRIGGER trg_trajectoire_consentements_ia_controle BEFORE INSERT OR UPDATE ON public.trajectoire_consentements_ia FOR EACH ROW EXECUTE FUNCTION trajectoire_controler_consentement();
CREATE TRIGGER trg_trajectoire_ia_parametres_touch BEFORE UPDATE ON public.trajectoire_ia_parametres FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();

-- RLS
ALTER TABLE public.trajectoire_consentements_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_ia_parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_ia_journal ENABLE ROW LEVEL SECURITY;

-- Consentement : lecture pour toute personne ayant acces a l'organisation ;
-- creation et retrait reserves a l'admin_client de l'organisation (pas au personnel AGE).
CREATE POLICY trajectoire_consentements_ia_select ON public.trajectoire_consentements_ia AS PERMISSIVE FOR SELECT TO authenticated
  USING (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_consentements_ia_insert ON public.trajectoire_consentements_ia AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (trajectoire_est_admin_client(organisation_id));

CREATE POLICY trajectoire_consentements_ia_update ON public.trajectoire_consentements_ia AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trajectoire_est_admin_client(organisation_id))
  WITH CHECK (trajectoire_est_admin_client(organisation_id));

-- Parametres IA : lecture pour le personnel AGE, modification pour les admin AGE.
CREATE POLICY trajectoire_ia_parametres_select ON public.trajectoire_ia_parametres AS PERMISSIVE FOR SELECT TO authenticated
  USING (trajectoire_est_personnel_age());

CREATE POLICY trajectoire_ia_parametres_update ON public.trajectoire_ia_parametres AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trajectoire_est_admin())
  WITH CHECK (trajectoire_est_admin());

-- Journal : lecture pour le personnel AGE ayant acces a l'organisation ; ecriture par le service role uniquement.
CREATE POLICY trajectoire_ia_journal_select ON public.trajectoire_ia_journal AS PERMISSIVE FOR SELECT TO authenticated
  USING ((trajectoire_acces(organisation_id) AND trajectoire_est_personnel_age()));