// src/lib/scoreGeorisques.ts
//
// Calcul du score Géorisques (0-100). Formule validée PO le 05/08/2026 :
// - 50% composante exposition_rga (texte : forte=100, moyenne=50, faible=25, null=0)
// - 50% composante georisques_data (présence de risques climatiques sur la
//   commune, liste fixe de 6 libellés pertinents, cf. LIBELLES_CLIMATIQUES)
//
// Schéma réel (vérifié en base le 05/08/2026) :
//   actifs.exposition_rga    TEXT      -- 'forte' | 'moyenne' | 'faible' | NULL
//   actifs.georisques_data   JSONB     -- { data: [{ code_insee, libelle_commune,
//                                          risques_detail: [{ num_risque, libelle_risque_long, ... }] }] }
//
// Note : zone_rga / zone_ppri N'EXISTENT PAS sur `actifs` (zone_ppri est sur
// `biens`). Ne pas les réutiliser ici.

const LIBELLES_CLIMATIQUES = [
  "Inondation",
  "Mouvement de terrain",
  "Tempête et grains (vent)",
  "Phénomène lié à l'atmosphère",
  "Feu de forêt",
  "Submersion marine",
]

function composanteRga(expositionRga: string | null | undefined): number {
  switch (expositionRga) {
    case "forte":   return 100
    case "moyenne": return 50
    case "faible":  return 25
    default:        return 0
  }
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

function composanteGeorisques(georisquesData: any): number {
  const libelles = extraireLibellesRisques(georisquesData)
  const nbPresents = LIBELLES_CLIMATIQUES.filter(l => libelles.includes(l)).length
  return Math.round((nbPresents / LIBELLES_CLIMATIQUES.length) * 100)
}

export function calculerScoreGeorisques(
  expositionRga: string | null | undefined,
  georisquesData: any
): number {
  const rga = composanteRga(expositionRga)
  const geo = composanteGeorisques(georisquesData)
  return Math.round(0.5 * rga + 0.5 * geo)
}