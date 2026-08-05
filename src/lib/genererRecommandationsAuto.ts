// src/lib/genererRecommandationsAuto.ts
//
// Sélection automatique des recommandations d'adaptation par aléa,
// à partir du référentiel bat_adapt_actions (OID, 2021).
//
// Règles (validées PO le 05/08/2026) :
// - Déclenchement uniquement si scores_aleas[alea] >= 40.
// - Aléas automatisés : inondation, chaleur, feux_foret, tempetes, submersion.
//   RGA, sécheresse et épisodes_froids restent en saisie manuelle (aucune
//   action générée automatiquement pour ces 3 aléas).
// - Actions "spécifiques" (associées à <= 2 aléas dans le référentiel)
//   priorisées sur les actions "génériques" (associées à 3+ aléas).
// - 3 actions maximum par aléa. Si moins de 3 spécifiques disponibles,
//   compléter avec des génériques.

import { supabase } from "./supabase"

const ALEAS_AUTOMATISES = ["inondation", "chaleur", "feux_foret", "tempetes", "submersion"] as const

const SEUIL_DECLENCHEMENT = 40
const NB_ACTIONS_MAX = 3

interface BatAdaptAction {
  id: string
  intitule: string
  aleas: string[]
  niveau_competence: "faible" | "moyen" | "eleve"
}

export interface RecommandationAuto {
  alea: string
  actions: string[]  // libellés, format attendu par prediagnostics.recommandations
}

/**
 * Génère les recommandations automatiques pour les aléas éligibles
 * (score >= 40, aléa dans la liste automatisée). Les aléas RGA/sécheresse/
 * épisodes_froids ne sont jamais retournés : à saisir manuellement côté
 * consultant dans FicheBien.tsx.
 */
export async function genererRecommandationsAuto(
  scoresAleas: Record<string, number>
): Promise<RecommandationAuto[]> {
  const aleasEligibles = ALEAS_AUTOMATISES.filter(
    (alea) => (scoresAleas[alea] ?? 0) >= SEUIL_DECLENCHEMENT
  )
  if (aleasEligibles.length === 0) return []

  const { data: actions, error } = await supabase
    .from("bat_adapt_actions")
    .select("id, intitule, aleas, niveau_competence")
    .overlaps("aleas", aleasEligibles as unknown as string[])

  if (error) {
    console.error("Erreur chargement bat_adapt_actions:", error)
    throw error
  }

  return aleasEligibles.map((alea) => {
    const actionsAlea = (actions || []).filter((a: BatAdaptAction) => a.aleas.includes(alea))
    const specifiques = actionsAlea.filter((a) => a.aleas.length <= 2)
    const generiques = actionsAlea.filter((a) => a.aleas.length > 2)

    const selection = [...specifiques, ...generiques].slice(0, NB_ACTIONS_MAX)

    return {
      alea,
      actions: selection.map((a) => a.intitule),
    }
  })
}