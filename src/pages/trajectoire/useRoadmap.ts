// src/pages/trajectoire/useRoadmap.ts
//
// Roadmap priorisée, calculée à la volée côté client (aucune écriture en base ; persistance au lot C).
// Entrées : exigences et extractions déjà chargées, poids (trajectoire_parametres), scores d'exposition
// (fonction SQL trajectoire_scores_exposition : dernier risk_scores validé par le client, par actif).
// Un échec de lecture des poids ou des scores n'empêche pas l'affichage : valeurs par défaut / exposition à 0.

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { aujourdhuiISO, type ExigenceLigne } from "../../lib/trajectoire"
import {
  PARAMETRES_PAR_DEFAUT, calculerRoadmap, candidatsDepuisExigences, candidatsDepuisExtractions,
  type ActionRoadmap, type ExtractionSource, type ParametresPriorite,
} from "../../lib/trajectoireRoadmap"

export interface UseRoadmap {
  actions: ActionRoadmap[]
  params: ParametresPriorite
  /** Nombre d'actifs de l'organisation ayant un score d'exposition. */
  nbActifsScores: number
  chargement: boolean
  /** Message non bloquant (poids ou scores indisponibles) ; null si tout est chargé. */
  avertissement: string | null
}

interface LigneParametres {
  organisation_id: string | null
  w_leg: number
  w_ech: number
  w_sanc: number
  w_gain: number
  w_cout: number
  w_expo: number
  seuil_ech_jours: number
}

function enParametres(l: LigneParametres): ParametresPriorite {
  return {
    w_leg: Number(l.w_leg), w_ech: Number(l.w_ech), w_sanc: Number(l.w_sanc),
    w_gain: Number(l.w_gain), w_cout: Number(l.w_cout), w_expo: Number(l.w_expo),
    seuil_ech_jours: Number(l.seuil_ech_jours),
  }
}

export function useRoadmap(
  organisationId: string | null,
  exigences: ReadonlyArray<ExigenceLigne>,
  extractions: ReadonlyArray<ExtractionSource>,
): UseRoadmap {
  const [params, setParams] = useState<ParametresPriorite>(PARAMETRES_PAR_DEFAUT)
  const [scoresParActif, setScoresParActif] = useState<Record<string, number>>({})
  const [chargement, setChargement] = useState(false)
  const [avertissement, setAvertissement] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    if (!organisationId) {
      setParams(PARAMETRES_PAR_DEFAUT)
      setScoresParActif({})
      setAvertissement(null)
      return
    }

    async function charger(org: string) {
      setChargement(true)
      const messages: string[] = []

      // Poids : ligne de l'organisation si elle existe, sinon ligne par défaut (organisation_id nul).
      const rp = await supabase
        .from("trajectoire_parametres")
        .select("organisation_id, w_leg, w_ech, w_sanc, w_gain, w_cout, w_expo, seuil_ech_jours")
        .or(`organisation_id.eq.${org},organisation_id.is.null`)
      if (annule) return
      let p = PARAMETRES_PAR_DEFAUT
      if (rp.error) {
        messages.push("Poids de priorité indisponibles : valeurs par défaut utilisées.")
      } else {
        const lignes = (rp.data ?? []) as unknown as LigneParametres[]
        const retenue = lignes.find(l => l.organisation_id === org) ?? lignes.find(l => l.organisation_id === null)
        if (retenue) p = enParametres(retenue)
      }

      // Exposition : dernier score AGE validé par le client, par actif de l'organisation.
      const rs = await supabase.rpc("trajectoire_scores_exposition", { org })
      if (annule) return
      const scores: Record<string, number> = {}
      if (rs.error) {
        messages.push("Scores d'exposition indisponibles : l'exposition est comptée à 0.")
      } else {
        for (const l of (rs.data ?? []) as Array<{ actif_id: string; score_global: number }>) {
          scores[l.actif_id] = Number(l.score_global)
        }
      }

      setParams(p)
      setScoresParActif(scores)
      setAvertissement(messages.length > 0 ? messages.join(" ") : null)
      setChargement(false)
    }

    void charger(organisationId)
    return () => { annule = true }
  }, [organisationId])

  const actions = useMemo(() => {
    const candidats = [
      ...candidatsDepuisExigences(exigences, scoresParActif),
      ...candidatsDepuisExtractions(extractions, exigences, scoresParActif),
    ]
    return calculerRoadmap(candidats, params, aujourdhuiISO())
  }, [exigences, extractions, params, scoresParActif])

  return { actions, params, nbActifsScores: Object.keys(scoresParActif).length, chargement, avertissement }
}