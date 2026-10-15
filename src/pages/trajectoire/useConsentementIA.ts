// src/pages/trajectoire/useConsentementIA.ts
//
// Consentement de l'organisation à l'analyse automatique des documents par un service d'IA.
// Une ligne active par organisation (retire_le nul). Création et retrait réservés à admin_client (RLS) ;
// auteur et dates sont forcés par le trigger de la base. Les écritures bloquées par la RLS échouent
// en silence (0 ligne) : on contrôle toujours le nombre de lignes renvoyées.

import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { TEXTE_CONSENTEMENT_VERSION } from "../../lib/trajectoireIA"

export interface ConsentementIA {
  id: string
  organisation_id: string
  consenti_par: string
  consenti_le: string
  texte_version: string
}

export interface UseConsentementIA {
  consentement: ConsentementIA | null
  chargement: boolean
  erreur: string | null
  /** Renvoie null si OK, sinon le message d'erreur à afficher. */
  donner: () => Promise<string | null>
  retirer: () => Promise<string | null>
}

export function useConsentementIA(organisationId: string | null): UseConsentementIA {
  const [consentement, setConsentement] = useState<ConsentementIA | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!organisationId) { setConsentement(null); return }
    setChargement(true)
    setErreur(null)
    const { data, error } = await supabase
      .from("trajectoire_consentements_ia")
      .select("id, organisation_id, consenti_par, consenti_le, texte_version")
      .eq("organisation_id", organisationId)
      .is("retire_le", null)
      .maybeSingle()
    if (error) {
      setErreur(error.message)
      setConsentement(null)
    } else {
      setConsentement((data ?? null) as ConsentementIA | null)
    }
    setChargement(false)
  }, [organisationId])

  useEffect(() => { void recharger() }, [recharger])

  const donner = useCallback(async (): Promise<string | null> => {
    if (!organisationId) return "Aucune organisation sélectionnée."
    const { data, error } = await supabase
      .from("trajectoire_consentements_ia")
      .insert({ organisation_id: organisationId, texte_version: TEXTE_CONSENTEMENT_VERSION })
      .select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Consentement refusé : réservé aux administrateurs de l'organisation."
    await recharger()
    return null
  }, [organisationId, recharger])

  const retirer = useCallback(async (): Promise<string | null> => {
    if (!consentement) return "Aucun consentement actif."
    const { data, error } = await supabase
      .from("trajectoire_consentements_ia")
      .update({ retire_le: new Date().toISOString() })
      .eq("id", consentement.id)
      .select("id")
    if (error) return error.message
    if (!data || data.length === 0) return "Retrait refusé : réservé aux administrateurs de l'organisation."
    await recharger()
    return null
  }, [consentement, recharger])

  return { consentement, chargement, erreur, donner, retirer }
}