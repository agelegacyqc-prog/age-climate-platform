// src/lib/trajectoireAccueil.ts
//
// Point 6 : comptage par statut pour les anneaux de l'Accueil client (Trajectoire).
// Exécution : côté client (affichage). Maturité = conformes validées / applicables (fiche Trajectoire, section 4).
// Les non applicables sont exclues. Aucun arrondi dans le calcul.

import type { DomaineTrajectoire, ExigenceLigne } from "./trajectoire"
import { statutAffiche } from "./trajectoire"

export type CleStatutAnneau = "conformes" | "attente_age" | "en_cours" | "non_conformes" | "a_evaluer"

export interface ComptageAnneau {
  conformes: number
  attente_age: number
  en_cours: number
  non_conformes: number
  a_evaluer: number
  /** Somme des cinq statuts = exigences applicables. */
  applicables: number
  /** Pourcentage 0 à 100, non arrondi : conformes validées / applicables. */
  pct: number
}

type LigneComptable = Pick<ExigenceLigne, "statut" | "valide_client_le" | "valide_age_le" | "actif_id" | "archivee"> & {
  referentiel: Pick<ExigenceLigne["referentiel"], "domaine">
}

/**
 * Compte les exigences par statut. actifId = null : somme de tous les actifs.
 * domaine = null : tous domaines (anneau global).
 * Une exigence "conforme" non validée par le client ET par AGE n'est pas comptée conforme :
 * elle passe en "Confirmation AGE attendue".
 */
export function compterAnneau(
  exigences: ReadonlyArray<LigneComptable>,
  domaine: DomaineTrajectoire | null,
  actifId: string | null,
): ComptageAnneau {
  const c: ComptageAnneau = { conformes: 0, attente_age: 0, en_cours: 0, non_conformes: 0, a_evaluer: 0, applicables: 0, pct: 0 }
  for (const e of exigences) {
    if (e.archivee || e.actif_id === null) continue
    if (actifId !== null && e.actif_id !== actifId) continue
    if (domaine !== null && e.referentiel.domaine !== domaine) continue
    if (e.statut === "non_applicable") continue
    c.applicables += 1
    if (e.statut === "conforme") {
      if (e.valide_client_le !== null && e.valide_age_le !== null) c.conformes += 1
      else c.attente_age += 1
      continue
    }
    const s = statutAffiche(e)
    if (s === "attente_age") c.attente_age += 1
    else if (s === "en_cours") c.en_cours += 1
    else if (s === "non_conforme") c.non_conformes += 1
    else c.a_evaluer += 1
  }
  c.pct = c.applicables === 0 ? 0 : (100 * c.conformes) / c.applicables
  return c
}