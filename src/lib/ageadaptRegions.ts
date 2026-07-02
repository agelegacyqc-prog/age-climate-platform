// src/lib/ageadaptRegions.ts
// Référentiel régions administratives françaises — codes INSEE (région)
// Utilisé pour renseigner ageadapt_missions.region_code, requis par la policy RLS responsable_regional

export const REGIONS_FRANCE: { nom: string; code: string }[] = [
  { nom: 'Auvergne-Rhône-Alpes', code: '84' },
  { nom: 'Bourgogne-Franche-Comté', code: '27' },
  { nom: 'Bretagne', code: '53' },
  { nom: 'Centre-Val de Loire', code: '24' },
  { nom: 'Corse', code: '94' },
  { nom: 'Grand Est', code: '44' },
  { nom: 'Hauts-de-France', code: '32' },
  { nom: 'Île-de-France', code: '11' },
  { nom: 'Normandie', code: '28' },
  { nom: 'Nouvelle-Aquitaine', code: '75' },
  { nom: 'Occitanie', code: '76' },
  { nom: 'Pays de la Loire', code: '52' },
  { nom: "Provence-Alpes-Côte d'Azur", code: '93' },
]

export function regionCodeFromNom(nom: string): string | null {
  return REGIONS_FRANCE.find(r => r.nom === nom)?.code ?? null
}