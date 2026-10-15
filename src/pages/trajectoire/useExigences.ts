// src/pages/trajectoire/useExigences.ts
//
// Lecture de la matrice d'exigences d'une organisation + écritures contrôlées.
// Les écritures bloquées par la RLS échouent en silence (0 ligne) : on contrôle toujours
// le nombre de lignes renvoyées. Les règles de validation sont dans les triggers de la base.

import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import type { ExigenceLigne, Qualification, ReferentielEntree, StatutExigence } from "../../lib/trajectoire"

export type PatchExigence = Partial<{
  statut: StatutExigence
  qualification: Qualification
  valide_client_le: string | null
  valide_age_le: string | null
  derniere_realisation: string | null
  commentaire: string | null
}>

export interface UseExigences {
  exigences: ExigenceLigne[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
  /** Renvoie null si OK, sinon le message d'erreur à afficher. */
  modifier: (id: string, patch: PatchExigence) => Promise<string | null>
  /** Crée les exigences manquantes depuis le référentiel actif (personnel AGE). Renvoie le nombre créé ou un message d'erreur. */
  initialiser: () => Promise<{ crees: number; erreur: string | null }>
}

export function useExigences(organisationId: string | null): UseExigences {
  const [exigences, setExigences] = useState<ExigenceLigne[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!organisationId) { setExigences([]); return }
    setChargement(true)
    setErreur(null)
    const { data, error } = await supabase
      .from("trajectoire_exigences")
      .select("*, referentiel:trajectoire_referentiel(*)")
      .eq("organisation_id", organisationId)
      .eq("archivee", false)
    if (error) {
      setErreur(error.message)
      setExigences([])
    } else {
      const lignes = (data ?? []) as unknown as ExigenceLigne[]
      lignes.sort((a, b) =>
        a.referentiel.domaine.localeCompare(b.referentiel.domaine) ||
        a.referentiel.libelle.localeCompare(b.referentiel.libelle, "fr"))
      setExigences(lignes)
    }
    setChargement(false)
  }, [organisationId])

  useEffect(() => { void recharger() }, [recharger])

  const modifier = useCallback(async (id: string, patch: PatchExigence): Promise<string | null> => {
    const { data, error } = await supabase
      .from("trajectoire_exigences")
      .update(patch)
      .eq("id", id)
      .select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Modification refusée : droits insuffisants ou exigence introuvable."
    await recharger()
    return null
  }, [recharger])

  const initialiser = useCallback(async (): Promise<{ crees: number; erreur: string | null }> => {
    if (!organisationId) return { crees: 0, erreur: "Aucune organisation sélectionnée." }
    const { data: refs, error: refErr } = await supabase
      .from("trajectoire_referentiel")
      .select("id, nature")
      .eq("actif", true)
    if (refErr) return { crees: 0, erreur: refErr.message }

    const { data: existantes, error: exErr } = await supabase
      .from("trajectoire_exigences")
      .select("referentiel_id")
      .eq("organisation_id", organisationId)
      .eq("archivee", false)
      .is("actif_id", null)
    if (exErr) return { crees: 0, erreur: exErr.message }

    const deja = new Set((existantes ?? []).map(e => e.referentiel_id as string))
    const lignes = ((refs ?? []) as Pick<ReferentielEntree, "id" | "nature">[])
      .filter(r => !deja.has(r.id))
      .map(r => ({
        organisation_id: organisationId,
        referentiel_id: r.id,
        qualification: (r.nature === "volontaire" ? "volontaire" : "potentielle") as Qualification,
        statut: "a_evaluer" as StatutExigence,
        source: "manuel" as const,
      }))
    if (lignes.length === 0) return { crees: 0, erreur: null }

    const { data: ins, error: insErr } = await supabase.from("trajectoire_exigences").insert(lignes).select("id")
    if (insErr) return { crees: 0, erreur: insErr.message }
    if (!ins || ins.length === 0) return { crees: 0, erreur: "Création refusée : droits insuffisants." }
    await recharger()
    return { crees: ins.length, erreur: null }
  }, [organisationId, recharger])

  return { exigences, chargement, erreur, recharger, modifier, initialiser }
}