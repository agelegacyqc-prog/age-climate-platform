-- 20261014_trajectoire_v1.sql
-- Module Trajectoire v1.0 (AGE Climate Platform).
-- RECONSTRUIT DEPUIS LA BASE le 15/10/2026 (projet Supabase vkclvfsblsjpuycjfiso) :
-- le fichier d'origine n'a jamais ete place dans le depot. Il reflete l'etat reel de la
-- production, validation client reservee a admin_client incluse.
-- NE PAS REJOUER sur la base de production. Utilisable pour une base vierge (ordre :
-- tables, cles etrangeres, index, fonctions, triggers, RLS, stockage).
-- Hors perimetre de ce fichier : contenu du referentiel et ligne de parametres par defaut
-- (organisation_id null), qui sont des donnees.

-- TABLES
CREATE TABLE public.trajectoire_referentiel (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  libelle text NOT NULL,
  domaine text NOT NULL,
  nature text NOT NULL,
  cadre text NOT NULL,
  description text,
  applicabilite jsonb DEFAULT '{}'::jsonb NOT NULL,
  echeance_type text DEFAULT 'aucune'::text NOT NULL,
  echeance_date date,
  recurrence_mois integer,
  sanction_prevue boolean DEFAULT false NOT NULL,
  competences text[] DEFAULT '{}'::text[] NOT NULL,
  source_url text,
  actif boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_referentiel_code_key UNIQUE (code),
  CONSTRAINT trajectoire_referentiel_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_referentiel_cadre_check CHECK ((cadre = ANY (ARRAY['france'::text, 'europe'::text, 'international'::text]))),
  CONSTRAINT trajectoire_referentiel_domaine_check CHECK ((domaine = ANY (ARRAY['energie'::text, 'environnement'::text, 'it'::text]))),
  CONSTRAINT trajectoire_referentiel_echeance_coherente CHECK ((((echeance_type = 'aucune'::text) AND (echeance_date IS NULL) AND (recurrence_mois IS NULL)) OR ((echeance_type = ANY (ARRAY['fixe'::text, 'annuelle'::text])) AND (echeance_date IS NOT NULL)) OR ((echeance_type = 'pluriannuelle'::text) AND (recurrence_mois IS NOT NULL)))),
  CONSTRAINT trajectoire_referentiel_echeance_type_check CHECK ((echeance_type = ANY (ARRAY['aucune'::text, 'fixe'::text, 'annuelle'::text, 'pluriannuelle'::text]))),
  CONSTRAINT trajectoire_referentiel_nature_check CHECK ((nature = ANY (ARRAY['reglementaire'::text, 'volontaire'::text]))),
  CONSTRAINT trajectoire_referentiel_recurrence_mois_check CHECK (((recurrence_mois IS NULL) OR (recurrence_mois > 0)))
);

CREATE TABLE public.trajectoire_parametres (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid,
  w_leg numeric(4,3) DEFAULT 0.300 NOT NULL,
  w_ech numeric(4,3) DEFAULT 0.250 NOT NULL,
  w_sanc numeric(4,3) DEFAULT 0.150 NOT NULL,
  w_gain numeric(4,3) DEFAULT 0.150 NOT NULL,
  w_cout numeric(4,3) DEFAULT 0.100 NOT NULL,
  w_expo numeric(4,3) DEFAULT 0.050 NOT NULL,
  seuil_ech_jours integer DEFAULT 730 NOT NULL,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_parametres_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_parametres_seuil_ech_jours_check CHECK ((seuil_ech_jours > 0)),
  CONSTRAINT trajectoire_parametres_somme_poids CHECK ((abs(((((((w_leg + w_ech) + w_sanc) + w_gain) + w_cout) + w_expo) - (1)::numeric)) < 0.0001))
);

CREATE TABLE public.trajectoire_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  document_id uuid NOT NULL,
  actif_id uuid,
  type_document text DEFAULT 'autre'::text NOT NULL,
  date_document date,
  date_validite date,
  statut_analyse text DEFAULT 'depose'::text NOT NULL,
  erreur text,
  depose_par uuid,
  archivee boolean DEFAULT false NOT NULL,
  archivee_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_documents_document_id_key UNIQUE (document_id),
  CONSTRAINT trajectoire_documents_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_documents_statut_analyse_check CHECK ((statut_analyse = ANY (ARRAY['depose'::text, 'classe'::text, 'en_analyse'::text, 'extrait'::text, 'partiel'::text, 'echec'::text]))),
  CONSTRAINT trajectoire_documents_type_document_check CHECK ((type_document = ANY (ARRAY['audit'::text, 'diagnostic'::text, 'dpe'::text, 'bilan_ges'::text, 'rapport_iso'::text, 'norme'::text, 'autre'::text])))
);

CREATE TABLE public.trajectoire_exigences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  actif_id uuid,
  referentiel_id uuid NOT NULL,
  qualification text NOT NULL,
  statut text DEFAULT 'a_evaluer'::text NOT NULL,
  source text DEFAULT 'manuel'::text NOT NULL,
  valide_client_par uuid,
  valide_client_le timestamp with time zone,
  valide_age_par uuid,
  valide_age_le timestamp with time zone,
  derniere_realisation date,
  prochaine_echeance date,
  commentaire text,
  archivee boolean DEFAULT false NOT NULL,
  archivee_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_exigences_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_exigences_conforme_valide CHECK (((statut <> 'conforme'::text) OR ((valide_client_le IS NOT NULL) AND (valide_age_le IS NOT NULL)))),
  CONSTRAINT trajectoire_exigences_ordre_validation CHECK (((valide_age_le IS NULL) OR (valide_client_le IS NOT NULL))),
  CONSTRAINT trajectoire_exigences_qualification_check CHECK ((qualification = ANY (ARRAY['obligatoire'::text, 'potentielle'::text, 'volontaire'::text]))),
  CONSTRAINT trajectoire_exigences_source_check CHECK ((source = ANY (ARRAY['manuel'::text, 'ia'::text, 'import'::text]))),
  CONSTRAINT trajectoire_exigences_statut_check CHECK ((statut = ANY (ARRAY['a_evaluer'::text, 'non_conforme'::text, 'en_cours'::text, 'conforme'::text, 'non_applicable'::text])))
);

CREATE TABLE public.trajectoire_extractions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  trajectoire_document_id uuid NOT NULL,
  type_extraction text NOT NULL,
  contenu text NOT NULL,
  domaine text,
  referentiel_id uuid,
  echeance date,
  cout_estime numeric(14,2),
  gain_estime numeric(14,2),
  gain_unite text,
  source_page integer,
  source_extrait text,
  confiance numeric(4,3),
  modele_ia text,
  statut text DEFAULT 'propose'::text NOT NULL,
  valide_client_par uuid,
  valide_client_le timestamp with time zone,
  valide_age_par uuid,
  valide_age_le timestamp with time zone,
  rejete_par uuid,
  commentaire_rejet text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_extractions_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_extractions_coherence CHECK ((((statut <> 'valide_client'::text) OR (valide_client_le IS NOT NULL)) AND ((statut <> 'valide_age'::text) OR ((valide_client_le IS NOT NULL) AND (valide_age_le IS NOT NULL))))),
  CONSTRAINT trajectoire_extractions_confiance_check CHECK (((confiance IS NULL) OR ((confiance >= (0)::numeric) AND (confiance <= (1)::numeric)))),
  CONSTRAINT trajectoire_extractions_domaine_check CHECK ((domaine = ANY (ARRAY['energie'::text, 'environnement'::text, 'it'::text]))),
  CONSTRAINT trajectoire_extractions_gain_unite_check CHECK ((gain_unite = ANY (ARRAY['eur'::text, 'kwh'::text, 'tco2e'::text]))),
  CONSTRAINT trajectoire_extractions_statut_check CHECK ((statut = ANY (ARRAY['propose'::text, 'valide_client'::text, 'valide_age'::text, 'rejete'::text]))),
  CONSTRAINT trajectoire_extractions_type_extraction_check CHECK ((type_extraction = ANY (ARRAY['constat'::text, 'ecart'::text, 'recommandation'::text, 'echeance'::text, 'certification'::text])))
);

CREATE TABLE public.trajectoire_actions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL,
  actif_id uuid,
  exigence_id uuid,
  extraction_id uuid,
  titre text NOT NULL,
  domaine text NOT NULL,
  horizon text,
  date_cible date,
  score_priorite numeric(6,2),
  score_detail jsonb,
  statut text DEFAULT 'a_lancer'::text NOT NULL,
  responsable text,
  cout_estime numeric(14,2),
  gain_estime numeric(14,2),
  gain_unite text,
  prerequis uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  mission_id uuid,
  ageadapt_mission_id uuid,
  archivee boolean DEFAULT false NOT NULL,
  archivee_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT trajectoire_actions_pkey PRIMARY KEY (id),
  CONSTRAINT trajectoire_actions_domaine_check CHECK ((domaine = ANY (ARRAY['energie'::text, 'environnement'::text, 'it'::text]))),
  CONSTRAINT trajectoire_actions_gain_unite_check CHECK ((gain_unite = ANY (ARRAY['eur'::text, 'kwh'::text, 'tco2e'::text]))),
  CONSTRAINT trajectoire_actions_horizon_check CHECK ((horizon = ANY (ARRAY['0_3m'::text, '3_12m'::text, '12_36m'::text, '36m_plus'::text]))),
  CONSTRAINT trajectoire_actions_statut_check CHECK ((statut = ANY (ARRAY['a_lancer'::text, 'en_cours'::text, 'realise'::text, 'abandonne'::text])))
);

-- CLES ETRANGERES
ALTER TABLE public.trajectoire_parametres ADD CONSTRAINT trajectoire_parametres_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE public.trajectoire_documents ADD CONSTRAINT trajectoire_documents_actif_id_fkey FOREIGN KEY (actif_id) REFERENCES actifs(id);
ALTER TABLE public.trajectoire_documents ADD CONSTRAINT trajectoire_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE public.trajectoire_documents ADD CONSTRAINT trajectoire_documents_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE public.trajectoire_exigences ADD CONSTRAINT trajectoire_exigences_actif_id_fkey FOREIGN KEY (actif_id) REFERENCES actifs(id);
ALTER TABLE public.trajectoire_exigences ADD CONSTRAINT trajectoire_exigences_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE public.trajectoire_exigences ADD CONSTRAINT trajectoire_exigences_referentiel_id_fkey FOREIGN KEY (referentiel_id) REFERENCES trajectoire_referentiel(id);
ALTER TABLE public.trajectoire_extractions ADD CONSTRAINT trajectoire_extractions_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE public.trajectoire_extractions ADD CONSTRAINT trajectoire_extractions_referentiel_id_fkey FOREIGN KEY (referentiel_id) REFERENCES trajectoire_referentiel(id);
ALTER TABLE public.trajectoire_extractions ADD CONSTRAINT trajectoire_extractions_trajectoire_document_id_fkey FOREIGN KEY (trajectoire_document_id) REFERENCES trajectoire_documents(id);
ALTER TABLE public.trajectoire_actions ADD CONSTRAINT trajectoire_actions_actif_id_fkey FOREIGN KEY (actif_id) REFERENCES actifs(id);
ALTER TABLE public.trajectoire_actions ADD CONSTRAINT trajectoire_actions_ageadapt_mission_id_fkey FOREIGN KEY (ageadapt_mission_id) REFERENCES ageadapt_missions(id);
ALTER TABLE public.trajectoire_actions ADD CONSTRAINT trajectoire_actions_exigence_id_fkey FOREIGN KEY (exigence_id) REFERENCES trajectoire_exigences(id);
ALTER TABLE public.trajectoire_actions ADD CONSTRAINT trajectoire_actions_extraction_id_fkey FOREIGN KEY (extraction_id) REFERENCES trajectoire_extractions(id);
ALTER TABLE public.trajectoire_actions ADD CONSTRAINT trajectoire_actions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES missions(id);
ALTER TABLE public.trajectoire_actions ADD CONSTRAINT trajectoire_actions_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id);

-- INDEX
CREATE INDEX ix_trajectoire_actions_org ON public.trajectoire_actions USING btree (organisation_id);
CREATE INDEX ix_trajectoire_documents_org ON public.trajectoire_documents USING btree (organisation_id);
CREATE INDEX ix_trajectoire_exigences_org ON public.trajectoire_exigences USING btree (organisation_id);
CREATE INDEX ix_trajectoire_extractions_doc ON public.trajectoire_extractions USING btree (trajectoire_document_id);
CREATE INDEX ix_trajectoire_extractions_org ON public.trajectoire_extractions USING btree (organisation_id);
CREATE UNIQUE INDEX ux_trajectoire_exigences_unique ON public.trajectoire_exigences USING btree (organisation_id, COALESCE(actif_id, '00000000-0000-0000-0000-000000000000'::uuid), referentiel_id) WHERE (NOT archivee);
CREATE UNIQUE INDEX ux_trajectoire_parametres_org ON public.trajectoire_parametres USING btree (COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- FONCTIONS
CREATE OR REPLACE FUNCTION public.trajectoire_est_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profils p
    where p.id = auth.uid()
      and p.role in ('admin','admin_national')
      and p.deleted_at is null
      and coalesce(p.is_active, true)
  );
$function$;

CREATE OR REPLACE FUNCTION public.trajectoire_est_personnel_age()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profils p
    where p.id = auth.uid()
      and p.role in ('admin','admin_national','responsable_regional','consultant')
      and p.deleted_at is null
      and coalesce(p.is_active, true)
  );
$function$;

CREATE OR REPLACE FUNCTION public.trajectoire_acces(org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    exists (select 1 from public.profils_client pc
            where pc.id = auth.uid() and pc.organisation_id = org and pc.actif)
    or public.trajectoire_est_admin()
    or exists (select 1 from public.organisations o
               where o.id = org
                 and (o.consultant_id = auth.uid() or o.responsable_region_id = auth.uid())
                 and public.trajectoire_est_personnel_age());
$function$;

CREATE OR REPLACE FUNCTION public.trajectoire_acces_chemin(chemin text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
begin
  begin
    v_org := ((storage.foldername(chemin))[1])::uuid;
  exception when others then
    return false;
  end;
  return public.trajectoire_acces(v_org);
end;
$function$;

CREATE OR REPLACE FUNCTION public.trajectoire_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

-- Etat final (15/10/2026) : validation client reservee a admin_client
CREATE OR REPLACE FUNCTION public.trajectoire_est_admin_client(org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profils_client pc
    where pc.id = auth.uid()
      and pc.organisation_id = org
      and pc.actif
      and pc.role_client = 'admin_client'
  );
$function$;

CREATE OR REPLACE FUNCTION public.trajectoire_controler_exigence()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_staff boolean;
begin
  -- auth.uid() nul : service role (Edge Function) ou migration
  if auth.uid() is null then
    return new;
  end if;
  v_staff := public.trajectoire_est_personnel_age();

  if tg_op = 'INSERT' then
    new.valide_client_par := null;
    new.valide_client_le  := null;
    new.valide_age_par    := null;
    new.valide_age_le     := null;
    if new.statut = 'conforme' then
      raise exception 'Une exigence ne peut pas etre creee au statut conforme';
    end if;
    if not v_staff then
      new.source := 'manuel';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.organisation_id is distinct from old.organisation_id
     or new.referentiel_id is distinct from old.referentiel_id
     or new.actif_id is distinct from old.actif_id then
    raise exception 'Organisation, referentiel et actif ne sont pas modifiables';
  end if;

  if not v_staff then
    if not public.trajectoire_est_admin_client(old.organisation_id) then
      raise exception 'Modification reservee a admin_client';
    end if;
    if new.statut = 'conforme' and old.statut is distinct from 'conforme' then
      raise exception 'Le statut conforme est confirme par le personnel AGE';
    end if;
    if new.valide_age_par is distinct from old.valide_age_par
       or new.valide_age_le is distinct from old.valide_age_le then
      raise exception 'Validation AGE reservee au personnel AGE';
    end if;
    if new.qualification is distinct from old.qualification
       or new.source is distinct from old.source then
      raise exception 'Qualification et source non modifiables par le client';
    end if;
    -- toute modification client d une exigence confirmee par AGE annule la confirmation
    if old.valide_age_le is not null
       and (new.statut is distinct from old.statut
            or new.derniere_realisation is distinct from old.derniere_realisation) then
      new.valide_age_par := null;
      new.valide_age_le  := null;
      if new.statut = 'conforme' then
        new.statut := 'en_cours';
      end if;
    end if;
    -- validation client : auteur et date forces par le serveur
    if new.valide_client_le is distinct from old.valide_client_le then
      if new.valide_client_le is null then
        new.valide_client_par := null;
        new.valide_age_par := null;
        new.valide_age_le  := null;
        if new.statut = 'conforme' then
          new.statut := 'en_cours';
        end if;
      else
        new.valide_client_par := auth.uid();
        new.valide_client_le  := now();
      end if;
    end if;
  else
    if new.valide_client_par is distinct from old.valide_client_par
       or new.valide_client_le is distinct from old.valide_client_le then
      raise exception 'Validation client reservee au client';
    end if;
    if new.statut = 'conforme' and new.valide_client_le is null then
      raise exception 'Validation client prealable requise';
    end if;
    -- confirmation AGE : auteur et date forces par le serveur
    if new.valide_age_le is distinct from old.valide_age_le then
      if new.valide_age_le is null then
        new.valide_age_par := null;
        if new.statut = 'conforme' then
          new.statut := 'en_cours';
        end if;
      else
        new.valide_age_par := auth.uid();
        new.valide_age_le  := now();
      end if;
    end if;
    if new.statut = 'conforme' and new.valide_age_le is null then
      new.valide_age_par := auth.uid();
      new.valide_age_le  := now();
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.trajectoire_controler_extraction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_staff boolean;
  v_contenu_modifie boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  v_staff := public.trajectoire_est_personnel_age();

  if tg_op = 'INSERT' then
    if not v_staff then
      raise exception 'Les extractions sont creees par analyse IA ou par le personnel AGE';
    end if;
    if new.statut <> 'propose' then
      raise exception 'Une extraction est creee au statut propose';
    end if;
    new.valide_client_par := null;
    new.valide_client_le  := null;
    new.valide_age_par    := null;
    new.valide_age_le     := null;
    new.rejete_par        := null;
    return new;
  end if;

  -- UPDATE
  if new.organisation_id is distinct from old.organisation_id
     or new.trajectoire_document_id is distinct from old.trajectoire_document_id
     or new.modele_ia is distinct from old.modele_ia
     or new.source_page is distinct from old.source_page
     or new.source_extrait is distinct from old.source_extrait
     or new.confiance is distinct from old.confiance then
    raise exception 'Origine de extraction non modifiable';
  end if;

  v_contenu_modifie :=
       new.type_extraction is distinct from old.type_extraction
    or new.contenu         is distinct from old.contenu
    or new.domaine         is distinct from old.domaine
    or new.referentiel_id  is distinct from old.referentiel_id
    or new.echeance        is distinct from old.echeance
    or new.cout_estime     is distinct from old.cout_estime
    or new.gain_estime     is distinct from old.gain_estime
    or new.gain_unite      is distinct from old.gain_unite;

  if not v_staff then
    if not public.trajectoire_est_admin_client(old.organisation_id) then
      raise exception 'Validation ou rejet reserve a admin_client';
    end if;
    if v_contenu_modifie then
      raise exception 'Le contenu est modifie par le personnel AGE uniquement';
    end if;
    if new.valide_age_par is distinct from old.valide_age_par
       or new.valide_age_le is distinct from old.valide_age_le
       or new.valide_client_par is distinct from old.valide_client_par
       or new.valide_client_le is distinct from old.valide_client_le
       or new.rejete_par is distinct from old.rejete_par then
      raise exception 'Horodatages de validation non modifiables';
    end if;
    if new.statut is distinct from old.statut then
      if old.statut = 'propose' and new.statut = 'valide_client' then
        new.valide_client_par := auth.uid();
        new.valide_client_le  := now();
      elsif old.statut in ('propose','valide_client') and new.statut = 'rejete' then
        new.rejete_par := auth.uid();
      else
        raise exception 'Transition de statut non autorisee pour le client';
      end if;
    end if;
    return new;
  end if;

  -- personnel AGE
  if new.valide_client_par is distinct from old.valide_client_par
     or new.valide_client_le is distinct from old.valide_client_le then
    raise exception 'Validation client reservee au client';
  end if;
  if new.valide_age_par is distinct from old.valide_age_par
     or new.valide_age_le is distinct from old.valide_age_le
     or new.rejete_par is distinct from old.rejete_par then
    raise exception 'Horodatages de validation non modifiables';
  end if;

  if v_contenu_modifie then
    -- toute modification de contenu reinitialise les validations
    new.statut := 'propose';
    new.valide_client_par := null;
    new.valide_client_le  := null;
    new.valide_age_par    := null;
    new.valide_age_le     := null;
    new.rejete_par        := null;
    return new;
  end if;

  if new.statut is distinct from old.statut then
    if old.statut = 'valide_client' and new.statut = 'valide_age' then
      new.valide_age_par := auth.uid();
      new.valide_age_le  := now();
    elsif old.statut in ('propose','valide_client') and new.statut = 'rejete' then
      new.rejete_par := auth.uid();
    elsif old.statut = 'rejete' and new.statut = 'propose' then
      new.valide_client_par := null;
      new.valide_client_le  := null;
      new.valide_age_par    := null;
      new.valide_age_le     := null;
      new.rejete_par        := null;
    else
      raise exception 'Transition non autorisee : validation client prealable requise';
    end if;
  end if;

  return new;
end;
$function$;

-- TRIGGERS
CREATE TRIGGER trg_trajectoire_actions_touch BEFORE UPDATE ON public.trajectoire_actions FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();
CREATE TRIGGER trg_trajectoire_documents_touch BEFORE UPDATE ON public.trajectoire_documents FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();
CREATE TRIGGER trg_trajectoire_exigences_controle BEFORE INSERT OR UPDATE ON public.trajectoire_exigences FOR EACH ROW EXECUTE FUNCTION trajectoire_controler_exigence();
CREATE TRIGGER trg_trajectoire_exigences_touch BEFORE UPDATE ON public.trajectoire_exigences FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();
CREATE TRIGGER trg_trajectoire_extractions_controle BEFORE INSERT OR UPDATE ON public.trajectoire_extractions FOR EACH ROW EXECUTE FUNCTION trajectoire_controler_extraction();
CREATE TRIGGER trg_trajectoire_extractions_touch BEFORE UPDATE ON public.trajectoire_extractions FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();
CREATE TRIGGER trg_trajectoire_parametres_touch BEFORE UPDATE ON public.trajectoire_parametres FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();
CREATE TRIGGER trg_trajectoire_referentiel_touch BEFORE UPDATE ON public.trajectoire_referentiel FOR EACH ROW EXECUTE FUNCTION trajectoire_touch_updated_at();


-- RLS
ALTER TABLE public.trajectoire_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_exigences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trajectoire_referentiel ENABLE ROW LEVEL SECURITY;

CREATE POLICY trajectoire_actions_insert ON public.trajectoire_actions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_actions_select ON public.trajectoire_actions AS PERMISSIVE FOR SELECT TO authenticated
  USING (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_actions_update ON public.trajectoire_actions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trajectoire_acces(organisation_id))
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_documents_insert ON public.trajectoire_documents AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_documents_select ON public.trajectoire_documents AS PERMISSIVE FOR SELECT TO authenticated
  USING (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_documents_update ON public.trajectoire_documents AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trajectoire_acces(organisation_id))
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_exigences_insert ON public.trajectoire_exigences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_exigences_select ON public.trajectoire_exigences AS PERMISSIVE FOR SELECT TO authenticated
  USING (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_exigences_update ON public.trajectoire_exigences AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trajectoire_acces(organisation_id))
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_extractions_insert ON public.trajectoire_extractions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((trajectoire_acces(organisation_id) AND trajectoire_est_personnel_age()));

CREATE POLICY trajectoire_extractions_select ON public.trajectoire_extractions AS PERMISSIVE FOR SELECT TO authenticated
  USING (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_extractions_update ON public.trajectoire_extractions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trajectoire_acces(organisation_id))
  WITH CHECK (trajectoire_acces(organisation_id));

CREATE POLICY trajectoire_parametres_insert ON public.trajectoire_parametres AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((((organisation_id IS NULL) AND trajectoire_est_admin()) OR ((organisation_id IS NOT NULL) AND trajectoire_acces(organisation_id) AND trajectoire_est_personnel_age())));

CREATE POLICY trajectoire_parametres_select ON public.trajectoire_parametres AS PERMISSIVE FOR SELECT TO authenticated
  USING (((organisation_id IS NULL) OR trajectoire_acces(organisation_id)));

CREATE POLICY trajectoire_parametres_update ON public.trajectoire_parametres AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((((organisation_id IS NULL) AND trajectoire_est_admin()) OR ((organisation_id IS NOT NULL) AND trajectoire_acces(organisation_id) AND trajectoire_est_personnel_age())))
  WITH CHECK ((((organisation_id IS NULL) AND trajectoire_est_admin()) OR ((organisation_id IS NOT NULL) AND trajectoire_acces(organisation_id) AND trajectoire_est_personnel_age())));

CREATE POLICY trajectoire_referentiel_ecriture ON public.trajectoire_referentiel AS PERMISSIVE FOR ALL TO authenticated
  USING (trajectoire_est_admin())
  WITH CHECK (trajectoire_est_admin());

CREATE POLICY trajectoire_referentiel_select ON public.trajectoire_referentiel AS PERMISSIVE FOR SELECT TO authenticated
  USING ((actif OR trajectoire_est_admin()));

-- STOCKAGE : bucket prive, convention de chemin {organisation_id}/{uuid}-{nom}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents-trajectoire', 'documents-trajectoire', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY documents_trajectoire_select ON public.documents AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM trajectoire_documents td
  WHERE ((td.document_id = documents.id) AND trajectoire_acces(td.organisation_id)))));

CREATE POLICY trajectoire_storage_delete ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'documents-trajectoire'::text) AND trajectoire_est_admin()));

CREATE POLICY trajectoire_storage_insert ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'documents-trajectoire'::text) AND trajectoire_acces_chemin(name)));

CREATE POLICY trajectoire_storage_select ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'documents-trajectoire'::text) AND trajectoire_acces_chemin(name)));