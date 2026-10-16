// src/pages/trajectoire/useExtractions.ts
//
// Extractions d'une organisation (constats, écarts, recommandations, échéances, certifications).
// Les règles de transition sont dans les triggers de la base ; les écritures bloquées par la RLS
// échouent en silence (0 ligne) : on contrôle toujours le nombre de lignes renvoyées.

import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import type { DomaineTrajectoire } from "../../lib/trajectoire"
import { estMasquee, type GainUnite, type StatutExtraction, type TypeExtraction } from "../../lib/trajectoireExtractions"
import type { TypeDocument } from "../../lib/trajectoireDocuments"

export interface ExtractionLigne {
  id: string
  organisation_id: string
  trajectoire_document_id: string
  type_extraction: TypeExtraction
  contenu: string
  domaine: DomaineTrajectoire | null
  referentiel_id: string | null
  echeance: string | null
  cout_estime: number | null
  gain_estime: number | null
  gain_unite: GainUnite | null
  source_page: number | null
  source_extrait: string | null
  confiance: number | null
  modele_ia: string | null
  statut: StatutExtraction
  valide_client_le: string | null
  valide_age_le: string | null
  commentaire_rejet: string | null
  created_at: string
  trajectoire_document: {
    type_document: TypeDocument
    archivee: boolean
    document: { nom: string; nom_fichier: string | null } | null
  } | null
  referentiel: { code: string; libelle: string } | null
}

export interface NouvelleExtraction {
  trajectoire_document_id: string
  type_extraction: TypeExtraction
  contenu: string
  domaine: DomaineTrajectoire | null
  referentiel_id: string | null
  echeance: string | null
  cout_estime: number | null
  gain_estime: number | null
  gain_unite: GainUnite | null
  source_page: number | null
  source_extrait: string | null
}

export interface UseExtractions {
  extractions: ExtractionLigne[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
  /** Renvoie null si OK, sinon le message d'erreur à afficher. */
  changerStatut: (id: string, cible: StatutExtraction, motif: string | null) => Promise<string | null>
  /** Création par le personnel AGE (statut "propose"). Renvoie null si OK. */
  creer: (saisie: NouvelleExtraction) => Promise<string | null>
}

export function useExtractions(organisationId: string | null): UseExtractions {
  const [extractions, setExtractions] = useState<ExtractionLigne[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!organisationId) { setExtractions([]); return }
    setChargement(true)
    setErreur(null)
    const { data, error } = await supabase
      .from("trajectoire_extractions")
      .select("*, trajectoire_document:trajectoire_documents(type_document, archivee, document:documents(nom, nom_fichier)), referentiel:trajectoire_referentiel(code, libelle)")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
    if (error) {
      setErreur(error.message)
      setExtractions([])
    } else {
      const lignes = (data ?? []) as unknown as ExtractionLigne[]
      // Les propositions non traitées d'un document archivé sont masquées ; les extractions déjà traitées restent visibles.
      setExtractions(lignes.filter(l => !estMasquee(l.statut, l.trajectoire_document?.archivee === true)))
    }
    setChargement(false)
  }, [organisationId])

  useEffect(() => { void recharger() }, [recharger])

  const changerStatut = useCallback(async (id: string, cible: StatutExtraction, motif: string | null): Promise<string | null> => {
    const patch: { statut: StatutExtraction; commentaire_rejet?: string | null } = { statut: cible }
    if (cible === "rejete") patch.commentaire_rejet = motif && motif.trim() !== "" ? motif.trim() : null
    if (cible === "propose") patch.commentaire_rejet = null
    const { data, error } = await supabase
      .from("trajectoire_extractions")
      .update(patch)
      .eq("id", id)
      .select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Modification refusée : droits insuffisants ou extraction introuvable."
    await recharger()
    return null
  }, [recharger])

  const creer = useCallback(async (saisie: NouvelleExtraction): Promise<string | null> => {
    if (!organisationId) return "Aucune organisation sélectionnée."
    const { data, error } = await supabase
      .from("trajectoire_extractions")
      .insert({ ...saisie, organisation_id: organisationId })
      .select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Création refusée : droits insuffisants."
    await recharger()
    return null
  }, [organisationId, recharger])

  return { extractions, chargement, erreur, recharger, changerStatut, creer }
}