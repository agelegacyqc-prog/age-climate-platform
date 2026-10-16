// src/pages/trajectoire/useActions.ts
//
// Actions enregistrées de la roadmap (table trajectoire_actions), pour une organisation.
// Lecture : actions non archivées. Écritures (admin_client et personnel AGE, contrôlé par trigger) :
// planifier (adoption d'une action calculée), modifier statut / responsable / date cible, retirer (archivage).
// Les écritures bloquées par la RLS échouent en silence (0 ligne) : on contrôle toujours le nombre de lignes.

import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import type { LigneAction, NouvelleAction, StatutAction } from "../../lib/trajectoireRoadmap"

export type PatchAction = Partial<{
  statut: StatutAction
  responsable: string | null
  date_cible: string | null
}>

export interface UseActions {
  lignes: LigneAction[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
  /** Renvoie null si OK, sinon le message d'erreur à afficher. */
  planifier: (nouvelle: NouvelleAction) => Promise<string | null>
  modifier: (id: string, patch: PatchAction) => Promise<string | null>
  /** Retire l'action de la roadmap (archivage, sans suppression). */
  retirer: (id: string) => Promise<string | null>
}

const COLONNES = "id, exigence_id, extraction_id, statut, responsable, date_cible, archivee"
const CODE_DOUBLON = "23505"

export function useActions(organisationId: string | null): UseActions {
  const [lignes, setLignes] = useState<LigneAction[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!organisationId) { setLignes([]); return }
    setChargement(true)
    setErreur(null)
    const { data, error } = await supabase
      .from("trajectoire_actions")
      .select(COLONNES)
      .eq("organisation_id", organisationId)
      .eq("archivee", false)
    if (error) {
      setErreur(error.message)
      setLignes([])
    } else {
      setLignes((data ?? []) as unknown as LigneAction[])
    }
    setChargement(false)
  }, [organisationId])

  useEffect(() => { void recharger() }, [recharger])

  const planifier = useCallback(async (nouvelle: NouvelleAction): Promise<string | null> => {
    const { data, error } = await supabase.from("trajectoire_actions").insert(nouvelle).select("id")
    if (error) {
      if (error.code === CODE_DOUBLON) {
        await recharger()
        return "Cette action est déjà planifiée."
      }
      return error.message
    }
    if (!data || data.length === 0) return "Création refusée : droits insuffisants."
    await recharger()
    return null
  }, [recharger])

  const modifier = useCallback(async (id: string, patch: PatchAction): Promise<string | null> => {
    const { data, error } = await supabase.from("trajectoire_actions").update(patch).eq("id", id).select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Modification refusée : droits insuffisants ou action introuvable."
    await recharger()
    return null
  }, [recharger])

  const retirer = useCallback(async (id: string): Promise<string | null> => {
    const { data, error } = await supabase.from("trajectoire_actions").update({ archivee: true }).eq("id", id).select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Retrait refusé : droits insuffisants ou action introuvable."
    await recharger()
    return null
  }, [recharger])

  return { lignes, chargement, erreur, recharger, planifier, modifier, retirer }
}