// src/lib/aleasGeorisques.ts
//
// Détection des aléas présents à l'adresse d'un actif, SANS score chiffré.
// Remplace scoreAleasGeorisques.ts (décision PO : aucun indicateur de score
// climatique avant mission AGE — cf. session en cours).
//
// - 4 aléas automatisables en présence/absence depuis georisques_data
//   (format GASPAR) : inondation, feux_foret, tempetes, submersion.
// - RGA : niveau forte/moyenne/faible depuis actifs.exposition_rga (donnée
//   déjà utilisée par scoreGeorisques.ts), PAS depuis georisques_data
//   ("Mouvement de terrain" est une catégorie GASPAR trop large pour
//   représenter spécifiquement le RGA — cf. décision session précédente).
// - chaleur, secheresse, episodes_froids : aucune source disponible
//   aujourd'hui → "à évaluer" (mission AGE), cohérent avec le blocage déjà
//   noté sur le barème scientifique dans le backlog.

export type NiveauRga = "forte" | "moyenne" | "faible"

export interface AleaDetecte {
  alea: string
  label: string
  automatise: boolean        // true si une donnée Géorisques existe pour cet aléa
  present: boolean | null    // true/false si automatisé et donnée dispo, null sinon ("à évaluer")
  niveau?: NiveauRga | null  // uniquement renseigné pour l'aléa "rga"
}

export const ALEA_LABELS: Record<string, string> = {
  inondation:      "Inondation",
  chaleur:         "Vagues de chaleur",
  secheresse:      "Sécheresse",
  feux_foret:      "Feux de forêt",
  tempetes:        "Tempêtes",
  rga:             "RGA",
  submersion:      "Submersion",
  episodes_froids: "Épisodes froids",
}

const ORDRE_AFFICHAGE = [
  "inondation", "chaleur", "secheresse", "feux_foret",
  "tempetes", "rga", "submersion", "episodes_froids",
]

const ALEAS_PRESENCE_AUTOMATISABLE = ["inondation", "feux_foret", "tempetes", "submersion"] as const

const MAPPING_LIBELLE_GASPAR: Record<string, string> = {
  inondation: "Inondation",
  feux_foret: "Feu de forêt",
  tempetes:   "Tempête et grains (vent)",
  submersion: "Submersion marine",
}

function extraireLibellesRisques(georisquesData: any): string[] {
  const entries = georisquesData?.data
  if (!Array.isArray(entries)) return []
  const libelles = new Set<string>()
  entries.forEach((entry: any) => {
    (entry?.risques_detail || []).forEach((r: any) => {
      if (r?.libelle_risque_long) libelles.add(r.libelle_risque_long)
    })
  })
  return Array.from(libelles)
}

/**
 * Détecte les 8 aléas AGEadapt pour un actif : présence/absence pour les 4
 * aléas automatisables, niveau pour RGA (si exposition_rga renseigné),
 * "à évaluer" pour les 3 restants. Aucun score chiffré n'est calculé.
 */
export function detecterAleas(
  georisquesData: any,
  expositionRga: string | null | undefined
): AleaDetecte[] {
  const donneesIndisponibles = georisquesData === null || georisquesData === undefined
  const libelles = extraireLibellesRisques(georisquesData)

  return ORDRE_AFFICHAGE.map((alea) => {
    if (alea === "rga") {
      const niveau = (expositionRga === "forte" || expositionRga === "moyenne" || expositionRga === "faible")
        ? expositionRga
        : null
      return { alea, label: ALEA_LABELS.rga, automatise: true, present: niveau !== null, niveau }
    }

    const estAutomatisable = (ALEAS_PRESENCE_AUTOMATISABLE as readonly string[]).includes(alea)
    if (!estAutomatisable) {
      return { alea, label: ALEA_LABELS[alea], automatise: false, present: null }
    }
    if (donneesIndisponibles) {
      return { alea, label: ALEA_LABELS[alea], automatise: true, present: null }
    }
    const libelleGaspar = MAPPING_LIBELLE_GASPAR[alea]
    return { alea, label: ALEA_LABELS[alea], automatise: true, present: libelles.includes(libelleGaspar) }
  })
}