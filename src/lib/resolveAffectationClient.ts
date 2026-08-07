// src/lib/resolveAffectationClient.ts
//
// Résout l'affectation courante (responsable région / consultant) d'un
// client, pour router automatiquement toute nouvelle demande (marketplace,
// mes demandes, analyse climatique) sans repasser par l'admin une fois le
// client affecté.
//
// Règle (validée PO, session en cours) :
// - Client B2B (profils_client.organisation_id renseigné) : affectation lue
//   sur organisations.responsable_region_id / organisations.consultant_id
//   (partagée par tous les utilisateurs de l'organisation).
// - Client B2C / particulier (organisation_id NULL) : affectation lue sur
//   profils_client.responsable_region_id / profils_client.consultant_id.
//
// États résultants :
//   consultant_id rempli                              → état 3 (consultant)
//   responsable_region_id rempli, consultant_id NULL   → état 2 (responsable)
//   les deux NULL                                      → état 1 (admin, première réception)

import { supabase } from "./supabase"

export interface AffectationClient {
  responsable_region_id: string | null
  consultant_id: string | null
  etat: 1 | 2 | 3
}

function calculerEtat(responsableId: string | null, consultantId: string | null): 1 | 2 | 3 {
  if (consultantId) return 3
  if (responsableId) return 2
  return 1
}

/**
 * Résout l'affectation courante d'un client à partir de son
 * profils_client.id. Retourne l'état 1 (admin) par défaut si le client
 * est introuvable ou en cas d'erreur — comportement sûr par défaut :
 * mieux vaut une demande visible par l'admin qu'une demande perdue.
 */
export async function resolveAffectationClient(clientId: string): Promise<AffectationClient> {
  const { data: profil, error } = await supabase
    .from("profils_client")
    .select("organisation_id, responsable_region_id, consultant_id")
    .eq("id", clientId)
    .maybeSingle()

  if (error || !profil) {
    console.error("resolveAffectationClient: profil introuvable ou erreur", error)
    return { responsable_region_id: null, consultant_id: null, etat: 1 }
  }

  if (profil.organisation_id) {
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("responsable_region_id, consultant_id")
      .eq("id", profil.organisation_id)
      .maybeSingle()

    if (orgError || !org) {
      console.error("resolveAffectationClient: organisation introuvable ou erreur", orgError)
      return { responsable_region_id: null, consultant_id: null, etat: 1 }
    }

    return {
      responsable_region_id: org.responsable_region_id ?? null,
      consultant_id: org.consultant_id ?? null,
      etat: calculerEtat(org.responsable_region_id ?? null, org.consultant_id ?? null),
    }
  }

  return {
    responsable_region_id: profil.responsable_region_id ?? null,
    consultant_id: profil.consultant_id ?? null,
    etat: calculerEtat(profil.responsable_region_id ?? null, profil.consultant_id ?? null),
  }
}