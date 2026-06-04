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

  // Points d'attention
  const [alertes, setAlertes] = useState({
    missionsBloquees: 0,
    demandesRdv: 0,
    rapportsEnAttente: 0,
    fileAttente: 0,
  })

  // Charge équipe
  const [consultants, setConsultants] = useState<{ id: string; prenom: string; nom: string; missions: number; region: string | null }[]>([])

  // Activité récente
  const [activiteRecente, setActiviteRecente] = useState<{ icon: string; color: string; texte: string; temps: string; route: string }[]>([])

  // Vue consultant
  const [mesMissions, setMesMissions]   = useState<any[]>([])
  const [mesCampagnes, setMesCampagnes] = useState<any[]>([])
  const [mesAlertes, setMesAlertes]     = useState<any[]>([])

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

    const [bloquRes, rdvRes, rapRes, fileRes] = await Promise.all([
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("statut", "en_cours").lte("updated_at", dateLimite.toISOString()),
      supabase.from("demandes_rdv").select("id", { count: "exact", head: true }).eq("statut", "en_attente").eq("lu_admin", false),
      supabase.from("rapports_client").select("id", { count: "exact", head: true }).eq("statut", "demande"),
      supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("origine", "client").eq("statut", "soumise").is("responsable_id", null),
    ])

    setAlertes({
      missionsBloquees:  bloquRes.count || 0,
      demandesRdv:       rdvRes.count || 0,
      rapportsEnAttente: rapRes.count || 0,
      fileAttente:       fileRes.count || 0,
    })

    // Charge consultants
    const { data: profs } = await supabase
      .from("profils")
      .select("id, prenom, nom, region")
      .eq("role", "consultant")

    if (profs) {
      const charges = await Promise.all(profs.map(async (p: any) => {
        const { count } = await supabase
          .from("missions")
          .select("id", { count: "exact", head: true })
          .eq("consultant_id", p.id)
          .eq("statut", "en_cours")
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

    activite.sort((a, b) => 0)
    setActiviteRecente(activite.slice(0, 5))
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
          .eq("statut", "en_cours")
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
    const [missRes, campRes] = await Promise.all([
      supabase.from("missions").select("id, societe, statut, phase, updated_at, created_at").eq("consultant_id", uid).order("updated_at", { ascending: false }).limit(5),
      supabase.from("campagnes").select("id, nom, statut, created_at").order("created_at", { ascending: false }).limit(5),
    ])

    setMesMissions(missRes.data || [])
    setMesCampagnes(campRes.data || [])

    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - 5)
    const { data: bloquees } = await supabase
      .from("missions")
      .select("id, societe")
      .eq("consultant_id", uid)
      .eq("statut", "en_cours")
      .lte("updated_at", dateLimite.toISOString())
    setMesAlertes(bloquees || [])
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
    const totalAlertesCount = alertes.missionsBloquees + alertes.demandesRdv + alertes.rapportsEnAttente + alertes.fileAttente

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
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#B91C1C" }}>{totalAlertesCount} action{totalAlertesCount > 1 ? "s" : ""} requise{totalAlertesCount > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Campagnes actives",   value: kpis.campagnesActives,   icon: "ti-speakerphone", color: "#B25C2A", route: "/metier/campagnes" },
            { label: "Missions en cours",   value: kpis.missionsEnCours,    icon: "ti-briefcase",    color: "#0369A1", route: "/metier/missions" },
            ...(!isResponsable ? [
              { label: "Clients actifs",      value: kpis.clientsActifs,      icon: "ti-users",        color: "#2F7D5C", route: "/metier/clients" },
              { label: "Partenaires validés", value: kpis.partenairesValides, icon: "ti-star",         color: "#7C3AED", route: "/metier/admin" },
            ] : [
              { label: "Consultants",         value: consultants.length,      icon: "ti-user-check",   color: "#2F7D5C", route: "/metier/equipe" },
              { label: "Missions bloquées",   value: alertes.missionsBloquees,icon: "ti-alert-triangle",color: alertes.missionsBloquees > 0 ? "#B91C1C" : "#6B7280", route: "/metier/missions" },
            ]),
          ].map((k, i) => (
            <div
              key={i}
              onClick={() => navigate(k.route)}
              style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "12px", padding: "20px", cursor: "pointer", transition: "border-color 0.1s, box-shadow 0.1s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = k.color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 8px ${k.color}20` }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2DDD8"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${k.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
                </div>
                <i className="ti ti-arrow-up-right" style={{ fontSize: "13px", color: "#9CA3AF" }} />
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "28px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
                {k.value}
              </div>
              <div className="label-section">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Points d'attention + Charge équipe */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Points d'attention */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-bell" style={{ fontSize: "15px", color: "#B25C2A" }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Points d'attention</span>
              {totalAlertesCount > 0 && (
                <span style={{ marginLeft: "auto", background: "#FEF2F2", color: "#B91C1C", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px" }}>
                  {totalAlertesCount}
                </span>
              )}
            </div>
            <div style={{ padding: "8px 0" }}>
              {[
                { label: "Missions bloquées",   count: alertes.missionsBloquees,  icon: "ti-lock",          color: "#B91C1C", route: "/metier/missions",     urgence: alertes.missionsBloquees > 0 },
                { label: "Demandes RDV",         count: alertes.demandesRdv,       icon: "ti-calendar",      color: "#D97706", route: "/metier/file-attente", urgence: false },
                { label: "Rapports en attente",  count: alertes.rapportsEnAttente, icon: "ti-file-analytics",color: "#D97706", route: "/metier/reporting",    urgence: false },
                { label: "File d'attente",       count: alertes.fileAttente,       icon: "ti-inbox",         color: "#B91C1C", route: "/metier/file-attente", urgence: alertes.fileAttente > 0 },
              ].map((a, i) => (
                <div
                  key={i}
                  onClick={() => navigate(a.route)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", cursor: "pointer", borderBottom: i < 3 ? "1px solid #F4F3F0" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: a.count > 0 ? (a.urgence ? "#FEF2F2" : "#FFFBEB") : "#F4F3F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${a.icon}`} style={{ fontSize: "15px", color: a.count > 0 ? a.color : "#9CA3AF" }} />
                  </div>
                  <span style={{ flex: 1, fontSize: "13px", color: a.count > 0 ? "#111827" : "#9CA3AF" }}>{a.label}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 700, color: a.count > 0 ? (a.urgence ? "#B91C1C" : "#D97706") : "#9CA3AF" }}>
                    {a.count}
                  </span>
                  <i className="ti ti-chevron-right" style={{ fontSize: "13px", color: "#C9C3BB" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Charge équipe */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-users" style={{ fontSize: "15px", color: "#B25C2A" }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                Charge équipe{region ? ` — ${region}` : ""}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "12px", color: "#9CA3AF" }}>
                {consultants.length} consultant{consultants.length > 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {consultants.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: "13px", padding: "16px 0" }}>
                  Aucun consultant
                </div>
              ) : consultants.map((c, i) => {
                const charge = Math.min(Math.round((c.missions / 5) * 100), 100)
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
          </div>
        </div>

        {/* Activité récente */}
        {activiteRecente.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-activity" style={{ fontSize: "15px", color: "#B25C2A" }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Activité récente</span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {activiteRecente.map((a, i) => (
                <div
                  key={i}
                  onClick={() => navigate(a.route)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 20px", cursor: "pointer", borderBottom: i < activiteRecente.length - 1 ? "1px solid #F4F3F0" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: `${a.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${a.icon}`} style={{ fontSize: "13px", color: a.color }} />
                  </div>
                  <span style={{ flex: 1, fontSize: "13px", color: "#374151" }}>{a.texte}</span>
                  <span style={{ fontSize: "12px", color: "#9CA3AF", flexShrink: 0 }}>{a.temps}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
        {[
          { label: "Missions assignées", value: mesMissions.length,  icon: "ti-briefcase",    color: "#B25C2A", route: "/metier/missions" },
          { label: "Campagnes actives",  value: mesCampagnes.filter((c: any) => c.statut === "en_cours").length, icon: "ti-speakerphone", color: "#0369A1", route: "/metier/campagnes" },
        ].map((k, i) => (
          <div
            key={i}
            onClick={() => navigate(k.route)}
            style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "12px", padding: "20px", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = k.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2DDD8" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
              <span className="label-section">{k.label}</span>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "28px", fontWeight: 700, color: "#111827" }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Mes missions + Campagnes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Mes missions */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="ti ti-briefcase" style={{ fontSize: "15px", color: "#B25C2A" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>Mes missions</span>
          </div>
          {mesMissions.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>Aucune mission assignée</div>
          ) : mesMissions.map((m: any, i: number) => (
            <div
              key={m.id}
              onClick={() => navigate("/metier/missions")}
              style={{ padding: "12px 20px", borderBottom: i < mesMissions.length - 1 ? "1px solid #F4F3F0" : "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{m.societe || "—"}</div>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#9CA3AF" }}>Phase {m.phase || 1}/10</span>
              </div>
              <div style={{ marginTop: "4px", background: "#E2DDD8", borderRadius: "2px", height: "3px", overflow: "hidden" }}>
                <div style={{ background: "#B25C2A", width: `${((m.phase || 1) / 10) * 100}%`, height: "100%" }} />
              </div>
            </div>
          ))}
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
            <button onClick={() => navigate("/metier/missions")} style={{ fontSize: "12px", color: "#B25C2A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              Voir tout →
            </button>
          </div>
        </div>

        {/* Campagnes */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="ti ti-speakerphone" style={{ fontSize: "15px", color: "#B25C2A" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>Campagnes</span>
          </div>
          {mesCampagnes.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>Aucune campagne</div>
          ) : mesCampagnes.map((c: any, i: number) => (
            <div
              key={c.id}
              onClick={() => navigate("/metier/campagnes")}
              style={{ padding: "12px 20px", borderBottom: i < mesCampagnes.length - 1 ? "1px solid #F4F3F0" : "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "2px" }}>{c.nom || `Campagne #${i + 1}`}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{c.statut || "En cours"} · {formatDate(c.created_at)}</div>
            </div>
          ))}
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
            <button onClick={() => navigate("/metier/campagnes")} style={{ fontSize: "12px", color: "#B25C2A", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              Voir tout →
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}