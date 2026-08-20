import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function tempsEcoule(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "il y a moins d'1h"
  if (h < 24) return `il y a ${h}h`
  const j = Math.floor(h / 24)
  if (j === 1) return "hier"
  return `il y a ${j} jours`
}

function today() {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}
function BlocDepliant({ titre, icon, dotColor, texte, children }: { titre: string; icon: string; dotColor: string; texte: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setOuvert(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        aria-expanded={ouvert}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <i className={`ti ${icon}`} style={{ fontSize: "15px", color: dotColor }} aria-hidden="true" />
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{titre}</span>
          <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{texte}</span>
        </div>
        <i className={`ti ti-chevron-${ouvert ? "up" : "down"}`} style={{ fontSize: "16px", color: "#9CA3AF" }} aria-hidden="true" />
      </button>
      {ouvert && <div style={{ borderTop: "1px solid #E2DDD8" }}>{children}</div>}
    </div>
  )
}
// ─── Composant ───────────────────────────────────────────────────────────────
export default function DashboardMetier() {
  const navigate = useNavigate()
  const [role, setRole]     = useState<string>("")
  const [prenom, setPrenom] = useState<string>("")
  const [region, setRegion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // KPIs admin
  const [kpis, setKpis] = useState({
    campagnesActives: 0,
    missionsEnCours: 0,
    clientsActifs: 0,
    partenairesValides: 0,
  })

  const [kpisReporting, setKpisReporting] = useState({
    tauxTransformation: 0,
    pertes_evitees: 0,
    travaux_generes: 0,
    cout_total_campagnes: 0,
    roi: 0,
  })

  // Points d'attention
  const [alertes, setAlertes] = useState({
    missionsBloquees: 0,
    demandesRdv: 0,
    rapportsEnAttente: 0,
    fileAttente: 0,
    demandesMarketplace: 0,
  })

  // Charge équipe
  const [consultants, setConsultants] = useState<{ id: string; prenom: string; nom: string; missions: number; region: string | null }[]>([])

  // Activité récente
  const [activiteRecente, setActiviteRecente] = useState<{ icon: string; color: string; texte: string; temps: string; route: string }[]>([])

  // Vue consultant
  const [mesMissions, setMesMissions]   = useState<any[]>([])
  const [mesCampagnes, setMesCampagnes] = useState<any[]>([])
  const [mesAlertes, setMesAlertes]     = useState<any[]>([])
  const [kpisConsultant, setKpisConsultant] = useState({
    missionsActives: 0,
    campagnesAgeActives: 0,
    rdvAVenir: 0,
    campagnesATraiter: 0,
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profil } = await supabase
      .from("profils")
      .select("role, prenom, region")
      .eq("id", user.id)
      .single()

    if (profil) {
      setRole(profil.role)
      setPrenom(profil.prenom || "")
      setRegion(profil.region || null)

      if (profil.role === "admin" || profil.role === "admin_national") {
        await loadAdmin()
      } else if (profil.role === "responsable_regional") {
        await loadResponsable(profil.region, user.id)
      } else {
        await loadConsultant(user.id)
      }
    }
    setLoading(false)
  }

  async function loadKpisReporting() {
    const [missRes, campRes] = await Promise.all([
      supabase.from("missions").select("travaux_generes, pertes_evitees, montant_ht"),
      supabase.from("campagnes").select("cout_campagne, courriers_envoyes, diagnostics"),
    ])

    const missions  = missRes.data || []
    const campagnes = campRes.data || []

    const pertes_evitees       = missions.reduce((s: number, m: any) => s + (m.pertes_evitees || 0), 0)
    const travaux_generes      = missions.reduce((s: number, m: any) => s + (m.travaux_generes || 0), 0)
    const cout_total_campagnes = campagnes.reduce((s: number, c: any) => s + (c.cout_campagne || 0), 0)

    const totalCourriers   = campagnes.reduce((s: number, c: any) => s + (c.courriers_envoyes || 0), 0)
    const totalDiagnostics = campagnes.reduce((s: number, c: any) => s + (c.diagnostics || 0), 0)
    const tauxTransformation = totalCourriers > 0 ? (totalDiagnostics / totalCourriers) * 100 : 0

    const roi = cout_total_campagnes > 0 ? pertes_evitees / cout_total_campagnes : 0

    setKpisReporting({ tauxTransformation, pertes_evitees, travaux_generes, cout_total_campagnes, roi })
  }

  async function loadAdmin() {
    // KPIs
    const [campRes, missRes, clientsRes, partRes] = await Promise.all([
      supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("statut", "en_cours"),
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("statut", "en_cours"),
      supabase.from("profils_client").select("id", { count: "exact", head: true }).eq("actif", true),
      supabase.from("prestataires_pro").select("id", { count: "exact", head: true }).eq("statut", "valide"),
    ])

    setKpis({
      campagnesActives:   campRes.count || 0,
      missionsEnCours:    missRes.count || 0,
      clientsActifs:      clientsRes.count || 0,
      partenairesValides: partRes.count || 0,
    })

    // Points d'attention
    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - 5)

    const [bloquRes, rdvRes, rapRes, fileRes, marketRes] = await Promise.all([
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("statut", "en_cours").lte("updated_at", dateLimite.toISOString()),
      supabase.from("demandes_rdv").select("id", { count: "exact", head: true }).eq("statut", "en_attente").eq("lu_admin", false),
      supabase.from("rapports_client").select("id", { count: "exact", head: true }).eq("statut", "demande"),
      supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("origine", "client").eq("statut", "soumise").is("responsable_id", null),
      supabase.from("demandes_marketplace").select("id", { count: "exact", head: true }).eq("statut", "soumise"),
    ])

    // Un seul setAlertes avec les 5 champs
    setAlertes({
      missionsBloquees:    bloquRes.count || 0,
      demandesRdv:         rdvRes.count || 0,
      rapportsEnAttente:   rapRes.count || 0,
      fileAttente:         fileRes.count || 0,
      demandesMarketplace: marketRes.count || 0,
    })

    // Charge consultants ET responsables régionaux
    const { data: profs } = await supabase
      .from("profils")
      .select("id, prenom, nom, region, role")
      .in("role", ["consultant", "responsable_regional"])

   if (profs) {
      const charges = await Promise.all(profs.map(async (p: any) => {
        const { count } = await supabase
          .from("missions")
          .select("id", { count: "exact", head: true })
          .eq("consultant_id", p.id)
          .in("statut", ["nouvelle", "en_cours"])
        return { ...p, missions: count || 0 }
      }))
      setConsultants(charges)
    }

    // Activité récente
    const [campRecentes, missRecentes, clientsRecents] = await Promise.all([
      supabase.from("campagnes").select("nom, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("missions").select("societe, updated_at, created_at").order("updated_at", { ascending: false }).limit(3),
      supabase.from("profils_client").select("prenom, nom, created_at").order("created_at", { ascending: false }).limit(2),
    ])

    const activite: typeof activiteRecente = []
    campRecentes.data?.forEach((c: any) => activite.push({ icon: "ti-speakerphone", color: "#B25C2A", texte: `Campagne "${c.nom}"`, temps: tempsEcoule(c.created_at), route: "/metier/campagnes" }))
    missRecentes.data?.forEach((m: any) => activite.push({ icon: "ti-briefcase", color: "#0369A1", texte: `Mission ${m.societe || "—"} — mise à jour`, temps: tempsEcoule(m.updated_at || m.created_at), route: "/metier/missions" }))
    clientsRecents.data?.forEach((c: any) => activite.push({ icon: "ti-user", color: "#2F7D5C", texte: `Nouveau client ${c.prenom || ""} ${c.nom || ""}`.trim(), temps: tempsEcoule(c.created_at), route: "/metier/clients" }))

    setActiviteRecente(activite.slice(0, 5))
    await loadKpisReporting()
  }

  async function loadResponsable(userRegion: string | null, uid: string) {
    // KPIs filtrés par région
    let campQuery = supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("statut", "en_cours")
    let missQuery = supabase.from("missions").select("id", { count: "exact", head: true }).eq("statut", "en_cours")
    if (userRegion) {
      campQuery = campQuery.eq("region", userRegion)
      missQuery = missQuery.eq("region", userRegion)
    }

    const [campRes, missRes] = await Promise.all([campQuery, missQuery])

    setKpis(prev => ({ ...prev, campagnesActives: campRes.count || 0, missionsEnCours: missRes.count || 0 }))

    // Consultants de la région
    let consultsQuery = supabase.from("profils").select("id, prenom, nom, region").eq("role", "consultant")
    if (userRegion) consultsQuery = consultsQuery.eq("region", userRegion)
    const { data: profs } = await consultsQuery

  if (profs) {
      const charges = await Promise.all(profs.map(async (p: any) => {
        const { count } = await supabase
          .from("missions")
          .select("id", { count: "exact", head: true })
          .eq("consultant_id", p.id)
          .in("statut", ["nouvelle", "en_cours"])
        return { ...p, missions: count || 0 }
      }))
      setConsultants(charges)
    }

    // Missions bloquées de la région
    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - 5)
    let bloquQuery = supabase.from("missions").select("id", { count: "exact", head: true }).eq("statut", "en_cours").lte("updated_at", dateLimite.toISOString())
    if (userRegion) bloquQuery = bloquQuery.eq("region", userRegion)
    const { count: bloquCount } = await bloquQuery
    setAlertes(prev => ({ ...prev, missionsBloquees: bloquCount || 0 }))
  }

async function loadConsultant(uid: string) {
    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - 5)

    const aujourdHui = new Date().toISOString().slice(0, 10)
    const dansSeptJours = new Date()
    dansSeptJours.setDate(dansSeptJours.getDate() + 7)
    const dansSeptJoursStr = dansSeptJours.toISOString().slice(0, 10)

    const [missRes, campRes, missActivesRes, campAgeRes, rdvRes, campATraiterRes, bloqueesRes] = await Promise.all([
      supabase.from("missions").select("id, societe, statut, phase, updated_at, created_at").eq("consultant_id", uid).order("updated_at", { ascending: false }).limit(5),
      supabase.from("campagnes").select("id, nom, statut, origine, created_at").eq("consultant_id", uid).eq("origine", "age").order("created_at", { ascending: false }).limit(5),
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("consultant_id", uid).eq("statut", "en_cours"),
      supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("consultant_id", uid).eq("origine", "age").eq("statut", "en_cours"),
      supabase.from("disponibilites_consultant").select("id", { count: "exact", head: true }).eq("consultant_id", uid).eq("statut", "reserve").gte("date", aujourdHui).lte("date", dansSeptJoursStr),
      supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("origine", "client").eq("statut", "soumise").is("responsable_id", null),
      supabase.from("missions").select("id, societe").eq("consultant_id", uid).eq("statut", "en_cours").lte("updated_at", dateLimite.toISOString()),
    ])

    setMesMissions(missRes.data || [])
    setMesCampagnes(campRes.data || [])
    setMesAlertes(bloqueesRes.data || [])

    setKpisConsultant({
      missionsActives:     missActivesRes.count || 0,
      campagnesAgeActives: campAgeRes.count || 0,
      rdvAVenir:            rdvRes.count || 0,
      campagnesATraiter:   campATraiterRes.count || 0,
    })
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#9CA3AF", fontSize: "14px" }}>
      Chargement…
    </div>
  )

  const isAdmin = role === "admin" || role === "admin_national"
  const isResponsable = role === "responsable_regional"

  // ── VUE ADMIN / RESPONSABLE ──────────────────────────────────────────────
  if (isAdmin || isResponsable) {
        const chargeMax = consultants.length > 0 ? Math.max(...consultants.map(c => Math.min(Math.round((c.missions / 5) * 100), 100))) : 0
    const chargeMaxColor = chargeMax >= 80 ? "#B91C1C" : chargeMax >= 50 ? "#D97706" : "#2F7D5C"

      const totalAlertesCount =
      (alertes.missionsBloquees || 0) +
      (alertes.demandesRdv || 0) +
      (alertes.rapportsEnAttente || 0) +
      (alertes.fileAttente || 0) +
      (alertes.demandesMarketplace || 0)

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Hero */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "12px", padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: "4px" }}>
              {prenom ? `Bonjour, ${prenom}` : "Bonjour"}
            </h2>
            <p style={{ fontSize: "13px", color: "#6B7280" }}>
              {isResponsable ? `Région ${region}` : "Vue d'ensemble de la plateforme"}
            </p>
            <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
              {today().charAt(0).toUpperCase() + today().slice(1)}
            </p>
          </div>
          {totalAlertesCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#B91C1C" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#B91C1C" }}>
                {totalAlertesCount} action{totalAlertesCount > 1 ? "s" : ""} requise{totalAlertesCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Campagnes actives",   value: kpis.campagnesActives,   icon: "ti-speakerphone", color: "#F0997B", route: "/metier/campagnes" },
            { label: "Missions en cours",   value: kpis.missionsEnCours,    icon: "ti-briefcase",    color: "#85B7EB", route: "/metier/missions" },
            ...(!isResponsable ? [
              { label: "Clients actifs",      value: kpis.clientsActifs,      icon: "ti-users",        color: "#5DCAA5", route: "/metier/clients" },
              { label: "Partenaires validés", value: kpis.partenairesValides, icon: "ti-star",         color: "#AFA9EC", route: "/metier/admin" },
            ] : [
              { label: "Consultants",         value: consultants.length,                    icon: "ti-user-check",    color: "#5DCAA5", route: "/metier/equipe" },
              { label: "Missions bloquées",   value: alertes.missionsBloquees,              icon: "ti-alert-triangle", color: alertes.missionsBloquees > 0 ? "#F09595" : "#94A3B8", route: "/metier/missions" },
            ]),
          ].map((k, i) => (
            <div
              key={i}
              onClick={() => navigate(k.route)}
                        style={{ background: "#111C2E", borderLeft: `3px solid ${k.color}`, borderRadius: "12px", padding: "20px", cursor: "pointer", transition: "background 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = "#16233A"
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = `inset 0 0 0 1px ${k.color}60, 0 0 24px ${k.color}25`
                                const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
                if (halo) halo.style.background = `${k.color}55`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "#111C2E"
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
                                const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
                if (halo) halo.style.background = `${k.color}2A`
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div data-halo style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${k.color}2A`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
                </div>
                <i className="ti ti-arrow-up-right" style={{ fontSize: "13px", color: "#94A3B8" }} />
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "28px", fontWeight: 700, color: "#FFFFFF", marginBottom: "4px" }}>
                {k.value}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* KPIs Reporting */}
        <div style={{ background: "#111C2E", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-chart-bar" style={{ fontSize: "15px", color: "#F0997B" }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#FFFFFF" }}>Synthèse Reporting</span>
            </div>
            <button
              onClick={() => navigate("/metier/reporting")}
              style={{ fontSize: "12px", color: "#F0997B", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
            >
              Voir toute la performance →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              {
                label: "ROI campagne",
                value: kpisReporting.roi > 0 ? `×${kpisReporting.roi.toFixed(0)}` : "—",
                sub: "1 € investi = X € de pertes évitées",
                color: "#AFA9EC",
                icon: "ti-trending-up",
              },
              {
                label: "Taux transformation",
                value: kpisReporting.tauxTransformation > 0 ? `${kpisReporting.tauxTransformation.toFixed(1).replace(".", ",")} %` : "—",
                sub: "Contact → Diagnostic réalisé",
                color: "#85B7EB",
                icon: "ti-percentage",
              },
              {
                label: "Pertes évitées",
                value: kpisReporting.pertes_evitees > 0
                  ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(kpisReporting.pertes_evitees) + " €"
                  : "—",
                sub: "Cumul toutes missions",
                color: "#5DCAA5",
                icon: "ti-shield-check",
              },
              {
                label: "Travaux générés",
                value: kpisReporting.travaux_generes > 0
                  ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(kpisReporting.travaux_generes) + " €"
                  : "—",
                sub: "Cumul toutes missions",
                color: "#F0997B",
                icon: "ti-hammer",
              },
            ].map((k, i) => (
              <div
                key={i}
                onClick={() => navigate("/metier/reporting")}
                              style={{
                  padding: "20px",
                  borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  cursor: "pointer",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#16233A"
                  e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${k.color}50`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "14px", color: k.color }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {k.label}
                  </span>
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "22px", fontWeight: 700, color: k.color, marginBottom: "4px" }}>
                  {k.value}
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Points d'attention + Charge équipe */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

                  {/* Points d'attention */}
          <BlocDepliant
            titre="Points d'attention"
            icon="ti-bell"
            dotColor={alertes.missionsBloquees > 0 ? "#B91C1C" : totalAlertesCount > 0 ? "#D97706" : "#0369A1"}
            texte={totalAlertesCount > 0 ? `· ${totalAlertesCount} action${totalAlertesCount > 1 ? "s" : ""} requise${totalAlertesCount > 1 ? "s" : ""}` : "· rien à signaler"}
          >
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Missions bloquées", count: alertes.missionsBloquees || 0,                                                                     icon: "ti-lock",     urgence: true,  route: "/metier/missions" },
                { label: "Demandes RDV",      count: alertes.demandesRdv || 0,                                                                          icon: "ti-calendar", urgence: false, route: "/metier/file-attente" },
                { label: "À traiter",         count: (alertes.fileAttente || 0) + (alertes.demandesMarketplace || 0) + (alertes.rapportsEnAttente || 0), icon: "ti-inbox",    urgence: true,  route: "/metier/file-attente" },
              ].map((a, i) => {
                const isActive     = a.count > 0
                const accentColor  = isActive ? (a.urgence ? "#B91C1C" : "#D97706") : "#9CA3AF"
                const bgColor      = isActive ? (a.urgence ? "#FEF2F2" : "#FFFBEB") : "#F4F3F0"
                return (
                  <div
                    key={i}
                    onClick={() => navigate(a.route)}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 14px", borderRadius: "10px",
                      background: isActive ? bgColor : "#F9F7F4",
                      border: `1px solid ${isActive ? accentColor + "30" : "#E2DDD8"}`,
                      cursor: "pointer", transition: "all 0.1s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isActive ? bgColor : "#F4F3F0" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isActive ? bgColor : "#F9F7F4" }}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: isActive ? accentColor + "15" : "#EEEBE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${a.icon}`} style={{ fontSize: "16px", color: isActive ? accentColor : "#9CA3AF" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: isActive ? 600 : 400, color: isActive ? "#111827" : "#9CA3AF" }}>
                        {a.label}
                      </div>
                      {isActive && (
                        <div style={{ fontSize: "11px", color: accentColor, marginTop: "1px" }}>
                          {a.count} action{a.count > 1 ? "s" : ""} requise{a.count > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {isActive && (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 700, color: accentColor }}>
                          {a.count}
                        </span>
                      )}
                      <i className="ti ti-chevron-right" style={{ fontSize: "14px", color: isActive ? accentColor : "#C9C3BB" }} />
                    </div>
                  </div>
                )
                       })}
            </div>
          </BlocDepliant>

          {/* Charge équipe */}
          <BlocDepliant
            titre={`Charge équipe${region ? ` — ${region}` : ""}`}
            icon="ti-users"
            dotColor={chargeMaxColor}
            texte={`· ${consultants.length} consultant${consultants.length > 1 ? "s" : ""}`}
          >
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {consultants.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: "13px", padding: "16px 0" }}>
                  Aucun consultant
                </div>
              ) : consultants.map((c, i) => {
                const charge      = Math.min(Math.round((c.missions / 5) * 100), 100)
                const chargeColor = charge >= 80 ? "#B91C1C" : charge >= 50 ? "#D97706" : "#2F7D5C"
                return (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#F9F0EA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#B25C2A" }}>
                          {(c.prenom[0] || "").toUpperCase()}{(c.nom[0] || "").toUpperCase()}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{c.prenom} {c.nom}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: chargeColor, fontWeight: 600 }}>
                          {c.missions}/5
                        </span>
                        <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{charge} %</span>
                      </div>
                    </div>
                    <div style={{ background: "#E2DDD8", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                      <div style={{ background: chargeColor, width: `${charge}%`, height: "100%", borderRadius: "3px", transition: "width 0.3s" }} />
                    </div>
                  </div>
                )
                     })}
            </div>
          </BlocDepliant>

        </div>{/* fin grille Points d'attention + Charge équipe */}

      </div>
    )
  }

  // ── VUE CONSULTANT ───────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Hero consultant */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "12px", padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: "4px" }}>
            {prenom ? `Bonjour, ${prenom}` : "Bonjour"}
          </h2>
          <p style={{ fontSize: "13px", color: "#6B7280" }}>
            <span style={{ fontWeight: 500, color: "#111827" }}>{mesMissions.length}</span> mission{mesMissions.length > 1 ? "s" : ""} assignée{mesMissions.length > 1 ? "s" : ""}
            {mesAlertes.length > 0 && (
              <span style={{ color: "#D97706", marginLeft: "8px" }}>
                · <i className="ti ti-alert-triangle" style={{ fontSize: "12px" }} /> {mesAlertes.length} alerte{mesAlertes.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
          <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
            {today().charAt(0).toUpperCase() + today().slice(1)}
          </p>
        </div>
        <button
          onClick={() => navigate("/metier/missions")}
          className="btn-primary"
        >
          <i className="ti ti-briefcase" style={{ fontSize: "14px" }} />
          Mes missions
        </button>
      </div>

      {/* Alerte consultant */}
      {mesAlertes.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: "18px", color: "#D97706", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#92400E", marginBottom: "2px" }}>
              {mesAlertes.length} mission{mesAlertes.length > 1 ? "s" : ""} sans activité depuis +5 jours
            </div>
            <div style={{ fontSize: "12px", color: "#92400E" }}>
              {mesAlertes.map((m: any) => m.societe || "Mission").join(", ")}
            </div>
          </div>
          <button
            onClick={() => navigate("/metier/missions")}
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "#D97706", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            Traiter <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} />
          </button>
        </div>
      )}

      {/* KPIs consultant */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
                    { label: "Missions en cours",     value: kpisConsultant.missionsActives,     icon: "ti-briefcase",    color: "#85B7EB",                                     route: "/metier/missions" },
          { label: "Missions bloquées",     value: mesAlertes.length,                  icon: "ti-lock",         color: mesAlertes.length > 0 ? "#B91C1C" : "#94A3B8", route: "/metier/missions" },
          { label: "Campagnes AGE actives", value: kpisConsultant.campagnesAgeActives, icon: "ti-speakerphone", color: "#F0997B",                                     route: "/metier/campagnes" },
          { label: "RDV à venir (7j)",      value: kpisConsultant.rdvAVenir,           icon: "ti-calendar",     color: "#5DCAA5",                                     route: "/metier/disponibilites-rdv" },
        ].map((k, i) => (
          <div
            key={i}
            onClick={() => navigate(k.route)}
            style={{ background: "#111C2E", borderLeft: `3px solid ${k.color}`, borderRadius: "12px", padding: "20px", cursor: "pointer", transition: "background 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = "#16233A"
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `inset 0 0 0 1px ${k.color}60, 0 0 24px ${k.color}25`
              const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
              if (halo) halo.style.background = `${k.color}55`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = "#111C2E"
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
              const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
              if (halo) halo.style.background = `${k.color}2A`
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div data-halo style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${k.color}2A`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
              </div>
              <i className="ti ti-arrow-up-right" style={{ fontSize: "13px", color: "#94A3B8" }} />
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "28px", fontWeight: 700, color: "#FFFFFF", marginBottom: "4px" }}>
              {k.value}
            </div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Campagnes client à traiter (file globale, prospection) */}
      <BlocDepliant
        titre="Campagnes client à traiter"
        icon="ti-inbox"
        dotColor={kpisConsultant.campagnesATraiter > 0 ? "#D97706" : "#0369A1"}
        texte={kpisConsultant.campagnesATraiter > 0 ? `· ${kpisConsultant.campagnesATraiter} en attente` : "· rien à signaler"}
      >
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "10px" }}>
            File d'attente globale (non affectée à un consultant précis) — {kpisConsultant.campagnesATraiter} campagne{kpisConsultant.campagnesATraiter > 1 ? "s" : ""} client{kpisConsultant.campagnesATraiter > 1 ? "s" : ""} en attente de prise en charge.
          </p>
          <button
            onClick={() => navigate("/metier/file-attente")}
            style={{ fontSize: "12px", color: "#D97706", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
          >
            Aller à la file d'attente →
          </button>
        </div>
      </BlocDepliant>


    </div>
  )
}