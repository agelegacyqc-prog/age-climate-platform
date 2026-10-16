// src/pages/trajectoire/useExigences.ts
//
// Lecture de la matrice d'exigences d'une organisation + écritures contrôlées.
// Les écritures bloquées par la RLS échouent en silence (0 ligne) : on contrôle toujours
// le nombre de lignes renvoyées. Les règles de validation sont dans les triggers de la base.
//
// Point 6 (16/10/2026) : une exigence par entrée du référentiel ET par actif de l'organisation.
// Lecture paginée (PostgREST plafonne une réponse à 1 000 lignes : actifs × référentiel le dépasse vite).

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
  /**
   * Crée les exigences manquantes : une par entrée active du référentiel et par actif de l'organisation
   * (personnel AGE). Idempotent. Renvoie le nombre créé ou un message d'erreur.
   */
  initialiser: () => Promise<{ crees: number; erreur: string | null }>
}

/** Taille de page alignée sur le plafond PostgREST de Supabase (max-rows = 1 000 par défaut). */
const TAILLE_PAGE = 1000
/** Taille d'un lot d'insertion. */
const TAILLE_LOT = 200

type PageSupabase = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>

/** Lit toutes les pages d'une requête (la requête doit être ordonnée de façon stable, ex. .order("id")). */
async function lirePages(requete: (de: number, a: number) => PageSupabase): Promise<{ lignes: unknown[]; erreur: string | null }> {
  const lignes: unknown[] = []
  for (let de = 0; ; de += TAILLE_PAGE) {
    const { data, error } = await requete(de, de + TAILLE_PAGE - 1)
    if (error) return { lignes: [], erreur: error.message }
    const page = data ?? []
    lignes.push(...page)
    if (page.length < TAILLE_PAGE) return { lignes, erreur: null }
  }
}

interface NouvelleExigence {
  organisation_id: string
  actif_id: string
  referentiel_id: string
  qualification: Qualification
  statut: StatutExigence
  source: "manuel"
}

export function useExigences(organisationId: string | null): UseExigences {
  const [exigences, setExigences] = useState<ExigenceLigne[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!organisationId) { setExigences([]); return }
    setChargement(true)
    setErreur(null)
    const lecture = await lirePages((de, a) =>
      supabase
        .from("trajectoire_exigences")
        .select("*, referentiel:trajectoire_referentiel(*)")
        .eq("organisation_id", organisationId)
        .eq("archivee", false)
        .order("id")
        .range(de, a))
    if (lecture.erreur) {
      setErreur(lecture.erreur)
      setExigences([])
    } else {
      const lignes = lecture.lignes as unknown as ExigenceLigne[]
      lignes.sort((a, b) =>
        a.referentiel.domaine.localeCompare(b.referentiel.domaine) ||
        a.referentiel.libelle.localeCompare(b.referentiel.libelle, "fr") ||
        (a.actif_id ?? "").localeCompare(b.actif_id ?? ""))
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
    const referentiel = (refs ?? []) as Pick<ReferentielEntree, "id" | "nature">[]

    // Actifs de l'organisation : fonction SECURITY DEFINER (la RLS de actifs masque les actifs des autres comptes).
    const { data: actifs, error: actErr } = await supabase.rpc("trajectoire_actifs_organisation", { org: organisationId })
    if (actErr) return { crees: 0, erreur: actErr.message }
    const idsActifs = ((actifs ?? []) as Array<{ actif_id: string }>).map(a => a.actif_id)
    if (idsActifs.length === 0) return { crees: 0, erreur: "Aucun actif rattaché à cette organisation : rien à initialiser." }

    const lecture = await lirePages((de, a) =>
      supabase
        .from("trajectoire_exigences")
        .select("id, actif_id, referentiel_id")
        .eq("organisation_id", organisationId)
        .eq("archivee", false)
        .not("actif_id", "is", null)
        .order("id")
        .range(de, a))
    if (lecture.erreur) return { crees: 0, erreur: lecture.erreur }

    const cle = (actifId: string, referentielId: string): string => `${actifId}|${referentielId}`
    const deja = new Set(
      (lecture.lignes as Array<{ actif_id: string; referentiel_id: string }>).map(e => cle(e.actif_id, e.referentiel_id)),
    )

    const lignes: NouvelleExigence[] = []
    for (const actifId of idsActifs) {
      for (const r of referentiel) {
        if (deja.has(cle(actifId, r.id))) continue
        lignes.push({
          organisation_id: organisationId,
          actif_id: actifId,
          referentiel_id: r.id,
          qualification: r.nature === "volontaire" ? "volontaire" : "potentielle",
          statut: "a_evaluer",
          source: "manuel",
        })
      }
    }
    if (lignes.length === 0) return { crees: 0, erreur: null }

    let crees = 0
    for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
      const lot = lignes.slice(i, i + TAILLE_LOT)
      const { data: ins, error: insErr } = await supabase.from("trajectoire_exigences").insert(lot).select("id")
      if (insErr || !ins || ins.length === 0) {
        if (crees > 0) await recharger()
        return {
          crees,
          erreur: insErr ? insErr.message : "Création refusée : droits insuffisants.",
        }
      }
      crees += ins.length
    }
    await recharger()
    return { crees, erreur: null }
  }, [organisationId, recharger])

  return { exigences, chargement, erreur, recharger, modifier, initialiser }
}