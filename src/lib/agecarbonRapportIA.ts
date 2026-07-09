import { supabase } from './supabase'

// ─── Types — reflètent exactement le schéma JSON renvoyé par generate-rapport ──

export interface RapportPosteCommente {
  poste: string
  libelle: string
  commentaire: string
}

export interface RapportSynthese {
  phrase_accroche: string
  pourquoi_agir: string
  budget_carbone_contexte: string
}

export interface RapportAgir {
  typologie_intro: string
  plan_actions: string[]
}

export interface RapportStructureAGEcarbon {
  synthese: RapportSynthese
  resultats_par_poste: RapportPosteCommente[]
  teletravail: string
  barometre_employes: string
  agir: RapportAgir
  annexes: string
}

// ─── Types des données sources (mêmes formes que AGEcarbonResultats.tsx) ──────

interface BilanPourRapport {
  id: string
  raison_sociale: string
  siren: string
  secteur_naf: string
  annee_reporting: number
}

interface ResultatPourRapport {
  poste: string
  scope: number
  total_kg_co2e: number
}

interface BarometrePourRapport {
  taux_teletravail_moyen_pct: number | null
  jours_teletravail_total: number | null
  empreinte_energie_teletravail_tco2e: number | null
  emissions_evitees_teletravail_tco2e: number | null
  distance_domicile_travail_km: number | null
  emissions_domicile_travail_tco2e: number | null
  mode_voiture_pct: number | null
  mode_covoiturage_pct: number | null
  mode_transports_commun_pct: number | null
  mode_velo_pct: number | null
  mode_marche_pct: number | null
  collaborateurs_covoiturage_pct: number | null
  sensibilisation_climat_pct: number | null
  collaborateurs_formes_climat_pct: number | null
  satisfaction_politique_climat_pct: number | null
}

// ─── Fonction principale ───────────────────────────────────────────────────────

/**
 * Récupère bilan + résultats + baromètre pour un bilan donné, appelle
 * l'Edge Function generate-rapport (module "agecarbon"), et retourne
 * la structure JSON du rapport IA.
 *
 * Ne recalcule ni n'arrondit aucune valeur métier — se contente de relayer
 * les données réelles à l'Edge Function, qui elle-même ne fait générer par
 * l'IA que du texte qualitatif (cf. consigne du prompt côté Edge Function).
 */
export async function genererRapportIA(bilanId: string): Promise<RapportStructureAGEcarbon> {
  // Bilan
  const { data: bilan, error: bilanErr } = await supabase
    .from('abc_bilans')
    .select('id, raison_sociale, siren, secteur_naf, annee_reporting')
    .eq('id', bilanId)
    .single()
  if (bilanErr) throw bilanErr
  if (!bilan) throw new Error('Bilan introuvable.')

  // Résultats
  const { data: resultats, error: resultatsErr } = await supabase
    .from('abc_resultats')
    .select('poste, scope, total_kg_co2e')
    .eq('bilan_id', bilanId)
  if (resultatsErr) throw resultatsErr
  if (!resultats || resultats.length === 0) {
    throw new Error('Aucun résultat disponible pour ce bilan — impossible de générer le rapport.')
  }

  // Baromètre employés (peut être absent — maybeSingle, pas d'erreur si vide)
  const { data: barometre, error: barometreErr } = await supabase
    .from('abc_barometre_employes')
    .select('*')
    .eq('bilan_id', bilanId)
    .maybeSingle()
  if (barometreErr) throw barometreErr

  // Appel Edge Function
  const { data: reponse, error: fnErr } = await supabase.functions.invoke('generate-rapport', {
    body: {
      module: 'agecarbon',
      data: {
        bilan: bilan as BilanPourRapport,
        resultats: resultats as ResultatPourRapport[],
        barometre: (barometre as BarometrePourRapport | null) ?? null,
      },
    },
  })

  if (fnErr) throw fnErr
  if (!reponse || reponse.error) {
    throw new Error(reponse?.error ?? "Erreur inconnue lors de l'appel à l'Edge Function.")
  }
  if (!reponse.rapport_structure) {
    throw new Error("Réponse de l'Edge Function incomplète (rapport_structure manquant).")
  }

  return reponse.rapport_structure as RapportStructureAGEcarbon
}