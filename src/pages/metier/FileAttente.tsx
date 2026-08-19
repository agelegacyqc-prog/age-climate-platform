import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
interface DemandeDispatch {
  id: string
  type: "campagne" | "mission" | "climatique" | "rdv"
  client_nom: string
  region: string | null
  multi_region: boolean
  statut: string
  created_at: string
  responsable_id: string | null
  consultant_id: string | null
}

interface DemandeRDV {
  id: string
  client_nom: string
  consultant_nom: string
  type_mission: string
  date_souhaitee: string
  creneau: string
  message: string | null
  statut: string
  lu_admin: boolean
  created_at: string
  responsable_id: string | null
}

interface AlerteScore {
  id: string
  actif_id: string
  nom_actif: string
  type_alerte: string
  classe_avant: string | null
  classe_apres: string | null
  score_avant: number
  score_apres: number
  delta_points: number
  consultant_id: string | null
  consultant_nom: string
  region_code: string | null
  created_at: string
}

interface Responsable {
  id: string
  prenom: string
  nom: string
  region: string
  nb_dossiers?: number
}

const COMPETENCE_LABELS: Record<string, string> = {
  csrd: "CSRD", tertiaire: "Décret Tertiaire", bilan_ges: "Bilan GES",
  audit_energetique: "Audit Énergétique", sfdr: "SFDR",
  eu_taxonomy: "EU Taxonomy", bacs: "Décret BACS",
  iso50001: "ISO 50001", ifrs_s2: "IFRS S2", esrs: "ESRS",
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FileAttente() {
  const navigate = useNavigate()
  const [roleAGE, setRoleAGE] = useState<string>("consultant")
  const [onglet, setOnglet] = useState<"dispatch" | "rdv" | "marketplace" | "climatique" | "alertes">("dispatch")
  const [demandesDispatch, setDemandesDispatch] = useState<DemandeDispatch[]>([])
  const [demandesRdv, setDemandesRdv]         = useState<DemandeRDV[]>([])
  const [demandesMarketplace, setDemandesMarketplace] = useState<any[]>([])
  const [demandesClimatique, setDemandesClimatique] = useState<DemandeDispatch[]>([])
  const [demandesAlertes, setDemandesAlertes] = useState<AlerteScore[]>([])
  const [alerteActionLoading, setAlerteActionLoading] = useState(false)
  const [loading, setLoading]                 = useState(true)

  // Drawer assignation
  const [drawerOpen, setDrawerOpen]           = useState(false)
  const [selectedDemande, setSelectedDemande] = useState<DemandeDispatch | null>(null)
  const [responsables, setResponsables]       = useState<Responsable[]>([])
  const [selectedResponsable, setSelectedResponsable] = useState("")
  const [assignLoading, setAssignLoading]     = useState(false)
  const [assignSuccess, setAssignSuccess]     = useState(false)
// Drawer Marketplace
  const [drawerMarketplaceOpen, setDrawerMarketplaceOpen] = useState(false)
  const [selectedMarketplace, setSelectedMarketplace] = useState<any>(null)
  const [marketplaceRegion, setMarketplaceRegion] = useState("")
  const [marketplaceResponsables, setMarketplaceResponsables] = useState<Responsable[]>([])
  const [marketplaceResponsable, setMarketplaceResponsable] = useState("")
  const [marketplaceActionLoading, setMarketplaceActionLoading] = useState(false)
  const [marketplaceSuccess, setMarketplaceSuccess] = useState(false)
  // Drawer RDV
  const [drawerRdvOpen, setDrawerRdvOpen]     = useState(false)
  const [selectedRdv, setSelectedRdv]         = useState<DemandeRDV | null>(null)
  const [rdvActionLoading, setRdvActionLoading] = useState(false)

  // Filtres
  const [filtreType, setFiltreType]           = useState<"tous" | "campagne" | "mission">("tous")
  const [filtreStatut, setFiltreStatut]       = useState<"tous" | "non_assignee" | "assignee">("tous")

  const [maRegion, setMaRegion] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

 useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data: profil } = await supabase.from("profils").select("role, region").eq("id", user.id).maybeSingle()
      const roleBrut = profil?.role || "consultant"
      const role = roleBrut === "admin" ? "admin_national" : roleBrut
      setRoleAGE(role)
      setMaRegion(profil?.region || null)
      if (role === "responsable_regional") setOnglet("climatique")
      if (role === "consultant") setOnglet("dispatch")
      await charger(role, profil?.region || null, user.id)
    })()
  }, [])

async function charger(roleParam?: string, regionParam?: string | null, uidParam?: string | null) {
    const roleActuel = roleParam ?? roleAGE
    const regionActuelle = regionParam !== undefined ? regionParam : maRegion
    const uidActuel = uidParam !== undefined ? uidParam : userId

    setLoading(true)
    try {
      // Campagnes soumises par clients — scopees par role : admin = tout,
      // responsable_regional = sa region (+ multi_region), consultant = les siennes
      let campagnesQuery = supabase
        .from("campagnes")
        .select("id, nom, statut, region, multi_region, responsable_id, consultant_id, created_at, client_id")
        .eq("origine", "client")
        .order("created_at", { ascending: false })

      let missionsQuery = supabase
        .from("missions")
        .select("id, societe, statut, region, responsable_id, consultant_id, created_at, client_id")
        .order("created_at", { ascending: false })

     if (roleActuel === "responsable_regional" && regionActuelle) {
        campagnesQuery = campagnesQuery.or(`region.eq.${regionActuelle},multi_region.eq.true,responsable_id.is.null,responsable_id.eq.${uidActuel}`)
        missionsQuery = missionsQuery.eq("region", regionActuelle)
      } else if (roleActuel === "consultant" && uidActuel) {
        campagnesQuery = campagnesQuery.eq("consultant_id", uidActuel)
        missionsQuery = missionsQuery.eq("consultant_id", uidActuel)
      }

      const { data: campagnes } = await campagnesQuery
      const { data: missions } = await missionsQuery

   // Demandes d'analyse climatique — scopees au consultant si applicable
      let climatiqueQuery = supabase
        .from("rapports_client")
        .select("id, statut, region, responsable_id, consultant_id, created_at, actif_id, actifs(nom)")
        .eq("type_rapport", "analyse_climatique")
        .in("statut", ["demande", "en_cours"])
        .order("created_at", { ascending: false })

      if (roleActuel === "consultant" && uidActuel) {
        climatiqueQuery = climatiqueQuery.eq("consultant_id", uidActuel)
      }

      const { data: analysesClimatiques } = await climatiqueQuery

      // Demandes RDV — consultant deja fixe par le client a la creation ;
      // seul responsable_id est dispatchable (par l'admin, vers un responsable regional)
      let rdvQuery = supabase
        .from("demandes_rdv")
        .select("id, type_mission, date_souhaitee, creneau, message, statut, lu_admin, created_at, consultant_id, client_id, responsable_id")
        .order("created_at", { ascending: false })

      if (roleActuel === "responsable_regional" && uidActuel) {
        rdvQuery = rdvQuery.or(`responsable_id.is.null,responsable_id.eq.${uidActuel}`)
      }

      const { data: rdvs } = await rdvQuery

// Enrichir avec les noms des consultants
const consultantIds = [...new Set((rdvs || []).map((r: any) => r.consultant_id))]
const { data: consultantsData } = await supabase
  .from("marketplace_consultants")
  .select("id, prenom, nom")
  .in("id", consultantIds)

const consultantsMap: Record<string, string> = {}
;(consultantsData || []).forEach((c: any) => {
  consultantsMap[c.id] = `${c.prenom} ${c.nom}`
})

// Récupérer les emails des clients

// Récupérer les emails des clients
const clientIds = [...new Set((rdvs || []).map((r: any) => r.client_id))]
let clientsMap: Record<string, string> = {}
try {
  const { data: clientsData } = await supabase.rpc("get_users_emails", { user_ids: clientIds })
  ;(clientsData || []).forEach((c: any) => {
    clientsMap[c.id] = c.email
  })
} catch {
  clientsMap = {}
}

      // Mapper campagnes
const campagnesMapped: DemandeDispatch[] = (campagnes || []).map((c: any) => ({
        id: c.id,
        type: "campagne",
        client_nom: c.nom || "—",
        region: c.region,
        multi_region: c.multi_region || false,
        statut: c.statut,
        created_at: c.created_at,
        responsable_id: c.responsable_id,
        consultant_id: c.consultant_id,
      }))

    // Mapper missions
      const missionsMapped: DemandeDispatch[] = (missions || []).map((m: any) => ({
        id: m.id,
        type: "mission",
        client_nom: m.societe || "—",
        region: m.region,
        multi_region: false,
        statut: m.statut,
        created_at: m.created_at,
        responsable_id: m.responsable_id,
        consultant_id: m.consultant_id,
      }))

      // Mapper analyses climatiques (region toujours NULL — pas de filtre régional à l'assignation)
const climatiqueMapped: DemandeDispatch[] = (analysesClimatiques || []).map((r: any) => ({
        id: r.id,
        type: "climatique",
        client_nom: r.actifs?.nom || "—",
        region: r.region,
        multi_region: false,
        statut: r.statut,
        created_at: r.created_at,
        responsable_id: r.responsable_id,
        consultant_id: r.consultant_id ?? null,
      }))
      setDemandesClimatique(climatiqueMapped)

      // Mapper RDV
     const rdvsMapped: DemandeRDV[] = (rdvs || []).map((r: any) => ({
  id: r.id,
  client_nom: clientsMap[r.client_id] || r.client_id || "—",
  consultant_nom: consultantsMap[r.consultant_id] || "—",
        type_mission: r.type_mission,
        date_souhaitee: r.date_souhaitee,
        creneau: r.creneau,
        message: r.message,
        statut: r.statut,
        lu_admin: r.lu_admin,
        created_at: r.created_at,
        responsable_id: r.responsable_id ?? null,
      }))
console.log("campagnes:", campagnes, "missions:", missions, "rdvs:", rdvs)
      setDemandesDispatch([...campagnesMapped, ...missionsMapped].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      setDemandesRdv(rdvsMapped)
      const { data: marketplaceData } = await supabase
  .from("demandes_marketplace")
  .select("id, type_prestation, statut, client_id, created_at, description")
  .eq("statut", "soumise")
  .order("created_at", { ascending: false })

if (marketplaceData && marketplaceData.length > 0) {
  const clientIds = [...new Set(marketplaceData.map((d: any) => d.client_id).filter(Boolean))]
  const { data: pcs } = await supabase.from("profils_client").select("id, organisation_id").in("id", clientIds)
  const orgIds = [...new Set((pcs || []).map((p: any) => p.organisation_id).filter(Boolean))]
  const { data: orgs } = await supabase.from("organisations").select("id, raison_sociale").in("id", orgIds)
  const orgMap: Record<string, string> = {}
  orgs?.forEach((o: any) => { orgMap[o.id] = o.raison_sociale })
  const pcMap: Record<string, string> = {}
  pcs?.forEach((p: any) => { if (p.organisation_id) pcMap[p.id] = orgMap[p.organisation_id] ?? "" })
  setDemandesMarketplace(marketplaceData.map((d: any) => ({ ...d, client_nom: pcMap[d.client_id] || null })))
} else {
  setDemandesMarketplace([])
}

      // Alertes de score non lues — scope géré par RLS (admin voit tout,
      // responsable régional voit sa région)
      const { data: alertesData } = await supabase
        .from("alertes_scores")
        .select("id, actif_id, type_alerte, classe_avant, classe_apres, score_avant, score_apres, delta_points, consultant_id, region_code, created_at, actifs(nom)")
        .eq("lu", false)
        .order("created_at", { ascending: false })

      const consultantAlerteIds = [...new Set((alertesData || []).map((a: any) => a.consultant_id).filter(Boolean))]
      const { data: consultantsAlerteData } = await supabase
        .from("profils")
        .select("id, prenom, nom")
        .in("id", consultantAlerteIds)
      const consultantsAlerteMap: Record<string, string> = {}
      ;(consultantsAlerteData || []).forEach((c: any) => {
        consultantsAlerteMap[c.id] = `${c.prenom} ${c.nom}`
      })

      setDemandesAlertes((alertesData || []).map((a: any) => ({
        id: a.id,
        actif_id: a.actif_id,
        nom_actif: a.actifs?.nom || "—",
        type_alerte: a.type_alerte,
        classe_avant: a.classe_avant,
        classe_apres: a.classe_apres,
        score_avant: a.score_avant,
        score_apres: a.score_apres,
        delta_points: a.delta_points,
        consultant_id: a.consultant_id,
        consultant_nom: consultantsAlerteMap[a.consultant_id] || "—",
        region_code: a.region_code,
        created_at: a.created_at,
      })))
    } finally {
      setLoading(false)
    }
  }

async function ouvrirAssignation(d: DemandeDispatch) {
    setSelectedDemande(d)
    setSelectedResponsable("")
    setAssignSuccess(false)

    const cibleConsultant = roleAGE === "responsable_regional"

    let query = supabase
      .from("profils")
      .select("id, prenom, nom, region")
      .eq("role", cibleConsultant ? "consultant" : "responsable_regional")

    if (cibleConsultant) {
      if (maRegion) query = query.eq("region", maRegion)
    } else if (d.region && !d.multi_region) {
      query = query.eq("region", d.region)
    }

    const { data } = await query
    setResponsables(data || [])
    setDrawerOpen(true)
  }

function ouvrirAssignationRdv(r: DemandeRDV) {
    ouvrirAssignation({
      id: r.id,
      type: "rdv",
      client_nom: r.client_nom,
      region: null,
      multi_region: false,
      statut: r.statut,
      created_at: r.created_at,
      responsable_id: r.responsable_id,
      consultant_id: null,
    })
  }

async function handleAssigner() {
  if (!selectedDemande || !selectedResponsable) return
  setAssignLoading(true)
  try {
   const table =
      selectedDemande.type === "campagne" ? "campagnes" :
      selectedDemande.type === "mission"  ? "missions" :
      selectedDemande.type === "rdv"      ? "demandes_rdv" :
      "rapports_client"

    const cibleConsultant = roleAGE === "responsable_regional" && selectedDemande.type !== "rdv"
    const payload =
      selectedDemande.type === "rdv"
        ? { responsable_id: selectedResponsable }
        : cibleConsultant
          ? { consultant_id: selectedResponsable, statut: "en_cours" }
          : { responsable_id: selectedResponsable, statut: "en_cours" }

const { error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", selectedDemande.id)

    if (error) {
      console.error("Erreur assignation:", error)
      alert("Échec de l'assignation : " + error.message)
      setAssignLoading(false)
      return
    }

      setAssignSuccess(true)
      charger()
      setTimeout(() => {
        setDrawerOpen(false)
        setAssignSuccess(false)
      }, 1500)
    } finally {
      setAssignLoading(false)
    }
  }
async function ouvrirMarketplace(d: any) {
    setSelectedMarketplace(d)
    setMarketplaceRegion(d.region || "")
    setMarketplaceResponsable("")
    setMarketplaceSuccess(false)
   await chargerResponsablesMarketplace()
    setDrawerMarketplaceOpen(true)
  }

async function chargerResponsablesMarketplace() {
    const roleCible = roleAGE === "responsable_regional" ? "consultant" : "responsable_regional"
    let query = supabase
      .from("profils")
      .select("id, prenom, nom, region")
      .eq("role", roleCible)
    if (roleCible === "consultant" && maRegion) {
      query = query.eq("region", maRegion)
    }
    const { data } = await query
    setMarketplaceResponsables(data || [])
  }

async function handleMarketplaceValider() {
    if (!selectedMarketplace || !marketplaceResponsable) return
    setMarketplaceActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (roleAGE === "responsable_regional") {
        // Délégation à un consultant par le responsable région déjà affecté
        const consultant = marketplaceResponsables.find(r => r.id === marketplaceResponsable)

        await supabase.from("demandes_marketplace").update({
          statut: "dispatchee",
          consultant_id: marketplaceResponsable,
        }).eq("id", selectedMarketplace.id)

        await supabase.from("missions").insert({
          societe: selectedMarketplace.client_nom || "Client marketplace",
          type_manager: selectedMarketplace.type_prestation || null,
          description: selectedMarketplace.description || null,
          origine: "marketplace",
          statut: "nouvelle",
          phase: 1,
          region: consultant?.region || null,
          responsable_id: user?.id || null,
          consultant_id: marketplaceResponsable,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else {
        // Récupérer la région du responsable sélectionné
        const responsable = marketplaceResponsables.find(r => r.id === marketplaceResponsable)

        await supabase.from("demandes_marketplace").update({
          statut: "validee",
          region: responsable?.region || null,
          responsable_id: marketplaceResponsable,
        }).eq("id", selectedMarketplace.id)

        await supabase.from("missions").insert({
          societe: selectedMarketplace.client_nom || "Client marketplace",
          type_manager: selectedMarketplace.type_prestation || null,
          description: selectedMarketplace.description || null,
          origine: "marketplace",
          statut: "nouvelle",
          phase: 1,
          region: responsable?.region || null,
          responsable_id: marketplaceResponsable,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      setMarketplaceSuccess(true)
      charger()
      setTimeout(() => {
        setDrawerMarketplaceOpen(false)
        setMarketplaceSuccess(false)
      }, 1500)
    } finally {
      setMarketplaceActionLoading(false)
    }
  }

  async function handleMarketplaceRejeter() {
    if (!selectedMarketplace) return
    setMarketplaceActionLoading(true)
    try {
      await supabase.from("demandes_marketplace").update({ statut: "rejetee" }).eq("id", selectedMarketplace.id)
      setDemandesMarketplace(prev => prev.filter(m => m.id !== selectedMarketplace.id))
      setDrawerMarketplaceOpen(false)
    } finally {
      setMarketplaceActionLoading(false)
    }
  }

  async function marquerAlerteLue(id: string) {
    setAlerteActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from("alertes_scores")
        .update({ lu: true, lu_at: new Date().toISOString(), lu_par: user?.id || null })
        .eq("id", id)
      if (error) {
        console.error("Erreur marquage alerte:", error)
        alert("Échec du marquage : " + error.message)
        return
      }
      setDemandesAlertes(prev => prev.filter(a => a.id !== id))
    } finally {
      setAlerteActionLoading(false)
    }
  }

  async function ouvrirRdv(rdv: DemandeRDV) {
    setSelectedRdv(rdv)
    setDrawerRdvOpen(true)
    // Marquer comme lu
    if (!rdv.lu_admin) {
      await supabase
        .from("demandes_rdv")
        .update({ lu_admin: true })
        .eq("id", rdv.id)
      setDemandesRdv(prev => prev.map(r => r.id === rdv.id ? { ...r, lu_admin: true } : r))
    }
  }

  async function handleRdvAction(statut: "confirme" | "annule") {
    if (!selectedRdv) return
    setRdvActionLoading(true)
    try {
      await supabase
        .from("demandes_rdv")
        .update({ statut })
        .eq("id", selectedRdv.id)

      setDemandesRdv(prev => prev.map(r => r.id === selectedRdv.id ? { ...r, statut } : r))
      setSelectedRdv(prev => prev ? { ...prev, statut } : null)
      charger()
    } finally {
      setRdvActionLoading(false)
    }
  }

  // Filtres dispatch
  const demandesFiltrees = demandesDispatch.filter(d => {
    const matchType = filtreType === "tous" || d.type === filtreType
    const matchStatut =
      filtreStatut === "tous" ||
      (filtreStatut === "non_assignee" && !d.responsable_id) ||
      (filtreStatut === "assignee" && !!d.responsable_id)
    return matchType && matchStatut
  })

  const nbNonLusRdv = demandesRdv.filter(r => r.statut === "en_attente").length

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function creneauLabel(c: string) {
    return { matin: "Matin", apres_midi: "Après-midi", indifferent: "Indifférent" }[c] || c
  }

  return (
    <div className="page-wrapper">

      {/* En-tête */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          File d'attente
        </h1>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
          Demandes clients à traiter et dispatcher
        </p>
      </div>

      {/* Onglets */}
<div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #E2DDD8", paddingBottom: "0" }}>
        {[
          {
            id: "dispatch",
            label:
              roleAGE === "consultant" ? "Mes campagnes & missions" :
              roleAGE === "responsable_regional" ? "Campagnes & Missions (ma région)" :
              "Campagnes & Missions",
            count: roleAGE === "consultant"
              ? demandesDispatch.filter(d => d.statut === "nouvelle" || d.statut === "soumise").length
              : demandesDispatch.filter(d => !d.responsable_id).length,
          },
          { id: "rdv", label: "Demandes RDV", count: nbNonLusRdv },
          { id: "marketplace", label: "Marketplace", count: demandesMarketplace.length },
          { id: "climatique", label: "Analyses climatiques", count: demandesClimatique.filter(d => d.statut === "demande").length },
          { id: "alertes", label: "Alertes score", count: demandesAlertes.length },
   ].filter(o => {
          if (o.id === "dispatch") return true
          if (roleAGE === "admin_national") return true
          if (roleAGE === "responsable_regional") return o.id === "climatique" || o.id === "marketplace" || o.id === "alertes" || o.id === "rdv"
          if (roleAGE === "consultant") return o.id === "climatique" || o.id === "rdv"
          return false
        }).map(o => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id as any)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 16px", border: "none", background: "transparent",
              fontSize: "13px", fontWeight: onglet === o.id ? 600 : 400,
              color: onglet === o.id ? "#B25C2A" : "#6B7280",
              cursor: "pointer", fontFamily: "inherit",
              borderBottom: `2px solid ${onglet === o.id ? "#B25C2A" : "transparent"}`,
              marginBottom: "-1px",
            }}
          >
            {o.label}
            {o.count > 0 && (
              <span style={{ background: "#B91C1C", color: "white", fontSize: "10px", fontWeight: 600, padding: "1px 5px", borderRadius: "10px", minWidth: "16px", textAlign: "center" }}>
                {o.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>Chargement…</div>
      ) : (
        <>
          {/* ── Onglet Campagnes & Missions ── */}
          {onglet === "dispatch" && (
            <>
              {/* Filtres — masques pour le consultant (rien a filtrer, tout lui est deja assigne) */}
              {roleAGE !== "consultant" && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <select className="input" style={{ width: "160px" }} value={filtreType} onChange={e => setFiltreType(e.target.value as any)}>
                  <option value="tous">Tous types</option>
                  <option value="campagne">Campagnes</option>
                  <option value="mission">Missions</option>
                </select>
           <select className="input" style={{ width: "160px" }} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value as any)}>
                  <option value="tous">Tous statuts</option>
                  <option value="non_assignee">Non assignées</option>
                  <option value="assignee">Assignées</option>
                </select>
              </div>
              )}

              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {demandesFiltrees.length === 0 ? (
                  <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
                    <i className="ti ti-inbox" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
                    Aucune demande en attente
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                        <th style={thStyle}>Client / Titre</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Région</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Statut</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demandesFiltrees.map(d => (
                        <tr key={d.id} style={{ borderBottom: "1px solid #E2DDD8", height: "52px" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 500, color: "#111827" }}>{d.client_nom}</span>
                          </td>
                          <td style={tdStyle}>
                            <span className={d.type === "campagne" ? "badge badge--info" : "badge badge--neutral"}>
                              <i className={`ti ${d.type === "campagne" ? "ti-speakerphone" : "ti-briefcase"}`} style={{ fontSize: "11px" }} />
                              {d.type === "campagne" ? "Campagne" : "Mission"}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                            {d.multi_region ? (
                              <span className="badge badge--warning">
                                <i className="ti ti-map-pins" style={{ fontSize: "11px" }} />
                                Multi-régions
                              </span>
                            ) : d.region || "—"}
                          </td>
                          <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                            {formatDate(d.created_at)}
                          </td>
                          <td style={tdStyle}>
                            <span className={d.responsable_id ? "badge badge--success" : "badge badge--warning"}>
                              <i className={`ti ${d.responsable_id ? "ti-circle-check" : "ti-clock"}`} style={{ fontSize: "11px" }} />
                              {d.responsable_id ? "Assignée" : "En attente"}
                            </span>
                          </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                            {roleAGE !== "consultant" ? (
                              <button
                                onClick={() => ouvrirAssignation(d)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                              >
                                <i className="ti ti-user-check" style={{ fontSize: "13px" }} />
                                {d.responsable_id ? "Réassigner" : "Assigner"}
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(d.type === "campagne" ? `/metier/campagnes/${d.id}` : "/metier/missions")}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                              >
                                <i className="ti ti-eye" style={{ fontSize: "13px" }} />
                                Voir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {demandesFiltrees.length > 0 && (
                  <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                      {demandesFiltrees.length} demande{demandesFiltrees.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Onglet Demandes RDV ── */}
          {onglet === "rdv" && (roleAGE === "admin_national" || roleAGE === "responsable_regional" || roleAGE === "consultant") && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {demandesRdv.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
                  <i className="ti ti-calendar" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
                  Aucune demande de RDV
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                 <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                      <th style={thStyle}>Client</th>
                      <th style={thStyle}>Consultant</th>
                      <th style={thStyle}>Mission</th>
                      <th style={thStyle}>Date souhaitée</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Affectation</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandesRdv.map(r => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #E2DDD8", height: "52px", background: !r.lu_admin ? "#FFFBF7" : "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                        onMouseLeave={e => (e.currentTarget.style.background = !r.lu_admin ? "#FFFBF7" : "transparent")}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {!r.lu_admin && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#B91C1C", flexShrink: 0, display: "inline-block" }} />}
                            <span style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>{r.client_nom}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{r.consultant_nom}</td>
                        <td style={tdStyle}>
                          <span className="badge badge--neutral">
                            {COMPETENCE_LABELS[r.type_mission] || r.type_mission}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                          {formatDate(r.date_souhaitee)}
                          <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "4px" }}>
                            {creneauLabel(r.creneau)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className={
                            r.statut === "confirme" ? "badge badge--success" :
                            r.statut === "annule" ? "badge badge--danger" :
                            "badge badge--warning"
                          }>
                            <i className={`ti ${r.statut === "confirme" ? "ti-circle-check" : r.statut === "annule" ? "ti-circle-x" : "ti-clock"}`} style={{ fontSize: "11px" }} />
                            {r.statut === "confirme" ? "Confirmé" : r.statut === "annule" ? "Annulé" : "En attente"}
                          </span>
                        </td>
                       <td style={tdStyle}>
                          <span className={r.responsable_id ? "badge badge--success" : "badge badge--warning"}>
                            <i className={`ti ${r.responsable_id ? "ti-circle-check" : "ti-clock"}`} style={{ fontSize: "11px" }} />
                            {r.responsable_id ? "Assignée" : "En attente"}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            {roleAGE === "admin_national" && (
                              <button
                                onClick={() => ouvrirAssignationRdv(r)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                              >
                                <i className="ti ti-user-check" style={{ fontSize: "13px" }} />
                                {r.responsable_id ? "Réassigner" : "Assigner"}
                              </button>
                            )}
                            <button
                              onClick={() => ouvrirRdv(r)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                            >
                              <i className="ti ti-eye" style={{ fontSize: "13px" }} />
                              Voir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {demandesRdv.length > 0 && (
                <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
                  <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                    {demandesRdv.length} demande{demandesRdv.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
{/* ── Onglet Analyses climatiques ── */}
      {onglet === "climatique" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {demandesClimatique.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
              <i className="ti ti-thermometer" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
              Aucune demande d'analyse climatique
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                  <th style={thStyle}>Actif</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Statut</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {demandesClimatique.map(d => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #E2DDD8", height: "52px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}><span style={{ fontWeight: 500, color: "#111827" }}>{d.client_nom}</span></td>
                    <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{formatDate(d.created_at)}</td>
                    <td style={tdStyle}>
                      <span className={d.responsable_id ? "badge badge--success" : "badge badge--warning"}>
                        <i className={`ti ${d.responsable_id ? "ti-circle-check" : "ti-clock"}`} style={{ fontSize: "11px" }} />
                        {d.responsable_id ? "Assignée" : "En attente"}
                      </span>
                    </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                      {roleAGE !== "consultant" ? (
                        <button
                          onClick={() => ouvrirAssignation(d)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          <i className="ti ti-user-check" style={{ fontSize: "13px" }} />
                          {d.responsable_id ? "Réassigner" : "Assigner"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
       {demandesClimatique.length > 0 && (
            <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                {demandesClimatique.length} demande{demandesClimatique.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
{/* ── Onglet Alertes score ── */}
{onglet === "alertes" && (
  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    {demandesAlertes.length === 0 ? (
      <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
        <i className="ti ti-bell-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
        Aucune alerte de score
      </div>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
            <th style={thStyle}>Actif</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Évolution</th>
            <th style={thStyle}>Consultant</th>
            <th style={thStyle}>Date</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {demandesAlertes.map(a => (
            <tr key={a.id} style={{ borderBottom: "1px solid #E2DDD8", height: "52px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={tdStyle}><span style={{ fontWeight: 500, color: "#111827" }}>{a.nom_actif}</span></td>
              <td style={tdStyle}>
                <span className={a.type_alerte === "changement_classe" ? "badge badge--warning" : "badge badge--neutral"}>
                  {a.type_alerte === "changement_classe" ? "Changement de classe" : "Variation de points"}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: "13px", color: a.delta_points >= 0 ? "#B91C1C" : "#2F7D5C", fontWeight: 500 }}>
                  {a.score_avant} → {a.score_apres} ({a.delta_points >= 0 ? "+" : ""}{a.delta_points})
                </span>
                {a.classe_avant && a.classe_apres && (
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    {a.classe_avant} → {a.classe_apres}
                  </div>
                )}
              </td>
              <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{a.consultant_nom}</td>
              <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{formatDate(a.created_at)}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <button
                  onClick={() => marquerAlerteLue(a.id)}
                  disabled={alerteActionLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-check" style={{ fontSize: "13px" }} />
                  Marquer comme lu
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    {demandesAlertes.length > 0 && (
      <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
          {demandesAlertes.length} alerte{demandesAlertes.length > 1 ? "s" : ""}
        </span>
      </div>
    )}
  </div>
)}
{/* ── Onglet Marketplace ── */}
{onglet === "marketplace" && (roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    {demandesMarketplace.length === 0 ? (
      <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
        <i className="ti ti-shopping-cart-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
        Aucune demande marketplace
      </div>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
            <th style={thStyle}>Type de prestation</th>
            <th style={thStyle}>Client</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Statut</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {demandesMarketplace.map(d => (
            <tr key={d.id} style={{ borderBottom: "1px solid #E2DDD8", height: "52px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ ...tdStyle, fontWeight: 500 }}>{d.type_prestation || "—"}</td>
              <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{d.client_nom || d.client_id || "—"}</td>
              <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{formatDate(d.created_at)}</td>
              <td style={tdStyle}>
                <span style={{ background: "#FFFBEB", color: "#D97706", fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                  En attente
                </span>
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
               <button
                  onClick={() => ouvrirMarketplace(d)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-eye" style={{ fontSize: "13px" }} /> Traiter
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    {demandesMarketplace.length > 0 && (
      <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
          {demandesMarketplace.length} demande{demandesMarketplace.length > 1 ? "s" : ""}
        </span>
      </div>
    )}
  </div>
)}
{/* ── Drawer Marketplace ── */}
      {drawerMarketplaceOpen && selectedMarketplace && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerMarketplaceOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "440px", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            
            {/* En-tête */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Demande Marketplace</h2>
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{selectedMarketplace.client_nom || selectedMarketplace.client_id}</p>
              </div>
              <button onClick={() => setDrawerMarketplaceOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Type de prescription */}
              <div style={{ padding: "14px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #E2DDD8" }}>
                <p style={{ fontSize: "11px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Type de prescription</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{selectedMarketplace.type_prestation || "—"}</p>
              </div>

              {/* Description */}
              {selectedMarketplace.description && (
                <div>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "6px" }}>Description</p>
                  <div style={{ padding: "12px", background: "#F4F3F0", borderRadius: "8px", fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                    {selectedMarketplace.description}
                  </div>
                </div>
              )}

              {/* Date */}
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #F4F3F0" }}>
                <span style={{ fontSize: "12px", color: "#6B7280" }}>Reçue le</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{formatDate(selectedMarketplace.created_at)}</span>
              </div>

              {marketplaceSuccess ? (
                <div style={{ padding: "14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#2F7D5C" }} />
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#2F7D5C" }}>Demande validée et assignée</div>
                </div>
              ) : (
                <>
                 
              {/* Responsables */}
                  <div>
                   <p style={{ fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                      {roleAGE === "responsable_regional" ? "Déléguer à un consultant" : "Assigner à un responsable régional"}
                    </p>
                    {marketplaceResponsables.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Aucun responsable régional disponible.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {marketplaceResponsables.map(r => (
                          <label key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "8px", cursor: "pointer", border: `1px solid ${marketplaceResponsable === r.id ? "#B25C2A" : "#E2DDD8"}`, background: marketplaceResponsable === r.id ? "#F9F0EA" : "white" }}>
                            <input type="radio" name="marketplace_responsable" value={r.id} checked={marketplaceResponsable === r.id} onChange={() => setMarketplaceResponsable(r.id)} style={{ accentColor: "#B25C2A" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{r.prenom} {r.nom}</div>
                              <div style={{ fontSize: "11px", color: "#6B7280" }}>{r.region}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            {!marketplaceSuccess && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  onClick={handleMarketplaceRejeter}
                  disabled={marketplaceActionLoading}
                  style={{ flex: 1, padding: "10px", background: "white", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-x" style={{ fontSize: "14px" }} /> Rejeter
                </button>
                <button
                  onClick={handleMarketplaceValider}
                  disabled={!marketplaceResponsable || marketplaceActionLoading}
                  style={{ flex: 2, padding: "10px", background: !marketplaceResponsable ? "#E5E1DA" : "#B25C2A", color: !marketplaceResponsable ? "#78716C" : "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: !marketplaceResponsable ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-user-check" style={{ fontSize: "14px" }} /> {roleAGE === "responsable_regional" ? "Valider & Déléguer" : "Valider & Assigner"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {/* ── Drawer Assignation ── */}
      {drawerOpen && selectedDemande && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Assigner</h2>
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{selectedDemande.client_nom}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Type</p>
               <span className={selectedDemande.type === "campagne" ? "badge badge--info" : "badge badge--neutral"}>
                  {selectedDemande.type === "campagne" ? "Campagne" : selectedDemande.type === "mission" ? "Mission" : selectedDemande.type === "rdv" ? "Demande de RDV" : "Analyse climatique"}
                </span>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Région</p>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                  {selectedDemande.multi_region ? "Multi-régions" : selectedDemande.region || "—"}
                </p>
              </div>

              {assignSuccess ? (
                <div style={{ padding: "14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#2F7D5C" }} />
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#2F7D5C" }}>Assignation confirmée</div>
                </div>
              ) : (
                <div>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "10px" }}>
                    {selectedDemande.type === "climatique" && roleAGE === "responsable_regional"
                      ? `Consultants disponibles — ${maRegion || "ma région"}`
                      : `Responsables disponibles — ${selectedDemande.region || "toutes régions"}`}
                  </p>
                  {responsables.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Aucun responsable trouvé pour cette région.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {responsables.map(r => (
                        <label key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "8px", cursor: "pointer", border: `1px solid ${selectedResponsable === r.id ? "#B25C2A" : "#E2DDD8"}`, background: selectedResponsable === r.id ? "#F9F0EA" : "white" }}>
                          <input type="radio" name="responsable" value={r.id} checked={selectedResponsable === r.id} onChange={() => setSelectedResponsable(r.id)} style={{ accentColor: "#B25C2A" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{r.prenom} {r.nom}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{r.region}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDrawerOpen(false)}>Annuler</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={handleAssigner}
                disabled={!selectedResponsable || assignLoading}
              >
                {assignLoading
                  ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Assignation…</>
                  : <><i className="ti ti-user-check" style={{ fontSize: "14px" }} /> Confirmer l'assignation</>
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Drawer RDV ── */}
      {drawerRdvOpen && selectedRdv && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerRdvOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Demande de RDV</h2>
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{selectedRdv.client_nom}</p>
              </div>
              <button onClick={() => setDrawerRdvOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Consultant", value: selectedRdv.consultant_nom },
                { label: "Type de mission", value: COMPETENCE_LABELS[selectedRdv.type_mission] || selectedRdv.type_mission },
                { label: "Date souhaitée", value: formatDate(selectedRdv.date_souhaitee) },
                { label: "Créneau", value: creneauLabel(selectedRdv.creneau) },
                { label: "Reçue le", value: formatDate(selectedRdv.created_at) },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #F4F3F0" }}>
                  <span style={{ fontSize: "12px", color: "#6B7280" }}>{item.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{item.value}</span>
                </div>
              ))}

              {selectedRdv.message && (
                <div>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "6px" }}>Message du client</p>
                  <div style={{ padding: "12px", background: "#F9F0EA", borderRadius: "8px", fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                    {selectedRdv.message}
                  </div>
                </div>
              )}

              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "6px" }}>Statut</p>
                <span className={
                  selectedRdv.statut === "confirme" ? "badge badge--success" :
                  selectedRdv.statut === "annule" ? "badge badge--danger" :
                  "badge badge--warning"
                }>
                  <i className={`ti ${selectedRdv.statut === "confirme" ? "ti-circle-check" : selectedRdv.statut === "annule" ? "ti-circle-x" : "ti-clock"}`} style={{ fontSize: "11px" }} />
                  {selectedRdv.statut === "confirme" ? "Confirmé" : selectedRdv.statut === "annule" ? "Annulé" : "En attente"}
                </span>
              </div>
            </div>

            {selectedRdv.statut === "en_attente" && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  onClick={() => handleRdvAction("annule")}
                  disabled={rdvActionLoading}
                  style={{ flex: 1, padding: "10px", background: "white", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-x" style={{ fontSize: "14px" }} /> Annuler
                </button>
                <button
                  onClick={() => handleRdvAction("confirme")}
                  disabled={rdvActionLoading}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  <i className="ti ti-check" style={{ fontSize: "14px" }} /> Confirmer le RDV
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6B7280",
  textAlign: "left",
  whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "0 16px",
  fontSize: "14px",
  color: "#111827",
}