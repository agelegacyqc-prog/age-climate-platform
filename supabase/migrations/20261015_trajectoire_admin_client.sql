-- 20261015_trajectoire_admin_client.sql
-- Module Trajectoire : validation cote client reservee a admin_client.
-- Etat DEJA applique en production (projet vkclvfsblsjpuycjfiso) le 15/10/2026.
-- Fichier de versionnage : ne pas rejouer. Definitions extraites de pg_get_functiondef.
-- Les triggers trg_trajectoire_exigences_controle / trg_trajectoire_extractions_controle
-- (20261014_trajectoire_v1.sql) pointent sur ces fonctions, inchanges.

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