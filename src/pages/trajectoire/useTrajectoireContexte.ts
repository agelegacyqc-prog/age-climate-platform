// src/pages/trajectoire/useTrajectoireContexte.ts
//
// Identité et périmètre de l'utilisateur pour le module Trajectoire.
// - Client : profils_client (organisation_id, role_client) ; une seule organisation.
// - Personnel AGE : profils.role ; organisations visibles = celles affectées
//   (consultant_id / responsable_region_id), toutes pour admin et admin_national.
// La RLS reste la référence : ce hook ne sert qu'à choisir ce qu'on affiche.

import { useCallback, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export type RoleClient = "admin_client" | "utilisateur_client"
export type RoleAGE = "admin" | "admin_national" | "responsable_regional" | "consultant"

export interface OrganisationOption {
  id: string
  raison_sociale: string
}

export interface TrajectoireContexte {
  chargement: boolean
  erreur: string | null
  mode: "client" | "personnel" | null
  userId: string | null
  roleClient: RoleClient | null
  roleAGE: RoleAGE | null
  organisations: OrganisationOption[]
  organisationId: string | null
  choisirOrganisation: (id: string) => void
  estAdminClient: boolean
  estPersonnelAGE: boolean
}

const ROLES_AGE: ReadonlyArray<string> = ["admin", "admin_national", "responsable_regional", "consultant"]

export function useTrajectoireContexte(): TrajectoireContexte {
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [mode, setMode] = useState<"client" | "personnel" | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [roleClient, setRoleClient] = useState<RoleClient | null>(null)
  const [roleAGE, setRoleAGE] = useState<RoleAGE | null>(null)
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([])
  const [organisationId, setOrganisationId] = useState<string | null>(null)

  useEffect(() => {
    let annule = false

    async function charger() {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? null
      if (!uid) {
        if (!annule) { setErreur("Session introuvable. Reconnectez-vous."); setChargement(false) }
        return
      }
      if (annule) return
      setUserId(uid)

      // 1) Personnel AGE (même ordre que Layout.tsx : profils avant profils_client)
      const { data: p, error: pErr } = await supabase
        .from("profils")
        .select("role")
        .eq("id", uid)
        .maybeSingle()
      if (annule) return
      if (pErr) { setErreur(pErr.message); setChargement(false); return }

      if (p && ROLES_AGE.includes(p.role as string)) {
        const role = p.role as RoleAGE

        let requete = supabase
          .from("organisations")
          .select("id, raison_sociale")
          .eq("actif", true)
          .order("raison_sociale")
        if (role === "consultant" || role === "responsable_regional") {
          requete = requete.or(`consultant_id.eq.${uid},responsable_region_id.eq.${uid}`)
        }
        const { data: orgs, error: orgErr } = await requete
        if (annule) return
        if (orgErr) { setErreur(orgErr.message); setChargement(false); return }

        const liste = (orgs ?? []).map(o => ({ id: o.id as string, raison_sociale: o.raison_sociale as string }))
        setMode("personnel")
        setRoleAGE(role)
        setOrganisations(liste)
        setOrganisationId(liste.length > 0 ? liste[0].id : null)
        setChargement(false)
        return
      }

      // 2) Client
      const { data: pc, error: pcErr } = await supabase
        .from("profils_client")
        .select("organisation_id, role_client, actif")
        .eq("id", uid)
        .maybeSingle()
      if (annule) return
      if (pcErr) { setErreur(pcErr.message); setChargement(false); return }

      if (!pc) {
        setErreur("Votre profil n'a pas accès à Trajectoire.")
        setChargement(false)
        return
      }
      if (!pc.actif || !pc.organisation_id) {
        setErreur("Trajectoire est réservé aux comptes rattachés à une organisation active.")
        setChargement(false)
        return
      }
      const { data: org } = await supabase
        .from("organisations")
        .select("id, raison_sociale")
        .eq("id", pc.organisation_id)
        .maybeSingle()
      if (annule) return
      setMode("client")
      setRoleClient(pc.role_client as RoleClient)
      setOrganisations(org ? [{ id: org.id as string, raison_sociale: org.raison_sociale as string }] : [])
      setOrganisationId(pc.organisation_id as string)
      setChargement(false)
    }

    charger().catch((e: unknown) => {
      if (!annule) { setErreur(e instanceof Error ? e.message : "Erreur de chargement."); setChargement(false) }
    })
    return () => { annule = true }
  }, [])

  const choisirOrganisation = useCallback((id: string) => setOrganisationId(id), [])

  return {
    chargement, erreur, mode, userId, roleClient, roleAGE, organisations, organisationId, choisirOrganisation,
    estAdminClient: mode === "client" && roleClient === "admin_client",
    estPersonnelAGE: mode === "personnel",
  }
}