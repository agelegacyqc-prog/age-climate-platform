import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const URGENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: "Haute",   color: "#991B1B", bg: "#FEF2F2" },
  moyenne: { label: "Moyenne", color: "#92400E", bg: "#FFFBEB" },
  basse:   { label: "Basse",   color: "#065F46", bg: "#ECFDF5" },
}

const ORIGINE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  marketplace: { label: "Marketplace", color: "#0369A1", bg: "#EFF6FF" },
  campagne:    { label: "Campagne",    color: "#D97706", bg: "#FFFBEB" },
  patrimoine:  { label: "Patrimoine",  color: "#5B21B6", bg: "#F5F3FF" },
  interne:     { label: "Interne",     color: "#065F46", bg: "#ECFDF5" },
}

const TYPE_CLIENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  banque:       { label: "Banque",       color: "#1E40AF", bg: "#EFF6FF" },
  assurance:    { label: "Assurance",    color: "#5B21B6", bg: "#F5F3FF" },
  entreprise:   { label: "Entreprise",   color: "#92400E", bg: "#FFFBEB" },
  collectivite: { label: "Collectivité", color: "#065F46", bg: "#ECFDF5" },
  particulier:  { label: "Particulier",  color: "#0369A1", bg: "#EFF6FF" },
}

export default function DashboardMetier() {
  const navigate = useNavigate()
  const [role, setRole]     = useState<string>("")
  const [prenom, setPrenom] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Stats admin
  const [statsAdmin, setStatsAdmin] = useState({
    totalActifs: 0, actifsAnalyses: 0, campagnes: 0,
    missions: 0, documents: 0, demandesEnAttente: 0,
  })
  const [repartition, setRepartition]         = useState<{ phase: string; nb: number; color: string }[]>([])
  const [fileAttente, setFileAttente]         = useState<any[]>([])
  const [alertesMissions, setAlertesMissions] = useState<any[]>([])
  const [consultants, setConsultants]         = useState<any[]>([])
  const [repartitionClients, setRepartitionClients] = useState<{ type: string; nb: number }[]>([])

  // Stats consultant
  const [mesActifs, setMesActifs]       = useState<any[]>([])
  const [mesMissions, setMesMissions]   = useState<any[]>([])
  const [mesCampagnes, setMesCampagnes] = useState<any[]>([])
  const [mesAlertes, setMesAlertes]     = useState<any[]>([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profil } = await supabase
      .from("profils")
      .select("role, prenom")
      .eq("id", user.id)
      .single()

    if (profil) {
      setRole(profil.role)
      setPrenom(profil.prenom || "")
      if (profil.role === "admin") {
        await loadAdmin()
      } else {
        await loadConsultant(user.id)
      }
    }
    setLoading(false)
  }

  async function loadAdmin() {
    const [actifsRes, analysesRes, campRes, missRes, docsRes, demandesRes] = await Promise.all([
      supabase.from("actifs").select("id", { count: "exact", head: true }),
      supabase.from("actifs").select("id", { count: "exact", head: true }).not("statut_analyse", "is", null),
      supabase.from("campagnes").select("id", { count: "exact", head: true }),
      supabase.from("missions").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("demandes_marketplace").select("id", { count: "exact", head: true }).eq("statut", "soumise"),
    ])

    setStatsAdmin({
      totalActifs:       actifsRes.count || 0,
      actifsAnalyses:    analysesRes.count || 0,
      campagnes:         campRes.count || 0,
      missions:          missRes.count || 0,
      documents:         docsRes.count || 0,
      demandesEnAttente: demandesRes.count || 0,
    })

    // Répartition actifs par statut
    const { data: actifsData } = await supabase.from("actifs").select("statut_analyse")
    const comptage: Record<string, number> = {}
    actifsData?.forEach(a => {
      const s = a.statut_analyse || "non_analyse"
      comptage[s] = (comptage[s] || 0) + 1
    })
    setRepartition([
      { phase: "Non analysé", nb: comptage["non_analyse"] || 0, color: "#94A3B8" },
      { phase: "En cours",    nb: comptage["en_cours"] || 0,    color: "#D97706" },
      { phase: "Analysé",     nb: comptage["analyse"] || 0,     color: "#0F6E56" },
      { phase: "À risque",    nb: comptage["a_risque"] || 0,    color: "#B91C1C" },
    ])

    // File d'attente unifiée — demandes non traitées
    const { data: demandes } = await supabase
      .from("demandes_marketplace")
      .select("*")
      .in("statut", ["soumise", "en_qualification"])
      .order("created_at", { ascending: true })
      .limit(8)
    setFileAttente(demandes || [])

    // Alertes missions bloquées +5 jours
    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - 5)
    const { data: missionsBloquees } = await supabase
      .from("missions")
      .select("*")
      .lte("updated_at", dateLimite.toISOString())
      .eq("statut", "en_cours")
      .limit(5)
    setAlertesMissions(missionsBloquees || [])

    // Charge de travail consultants
    const { data: profs } = await supabase
      .from("profils")
      .select("id, prenom, nom")
      .eq("role", "consultant")
    if (profs) {
      const charges = await Promise.all(profs.map(async p => {
        const { count } = await supabase
          .from("missions")
          .select("id", { count: "exact", head: true })
          .eq("consultant_id", p.id)
          .eq("statut", "en_cours")
        return { ...p, missions: count || 0 }
      }))
      setConsultants(charges)
    }

    // Répartition par type client
    const { data: actifsClients } = await supabase.from("actifs").select("type_client").eq("categorie", "patrimoine_client")
    const comptageClients: Record<string, number> = {}
    actifsClients?.forEach(a => {
      if (a.type_client) comptageClients[a.type_client] = (comptageClients[a.type_client] || 0) + 1
    })
    setRepartitionClients(Object.entries(comptageClients).map(([type, nb]) => ({ type, nb })))
  }

  async function loadConsultant(uid: string) {
    const [actifsRes, missionsRes, campRes] = await Promise.all([
      supabase.from("actifs").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
      supabase.from("missions").select("*").eq("consultant_id", uid).order("created_at", { ascending: false }).limit(5),
      supabase.from("campagnes").select("*").order("created_at", { ascending: false }).limit(5),
    ])
    setMesActifs(actifsRes.data || [])
    setMesMissions(missionsRes.data || [])
    setMesCampagnes(campRes.data || [])

    // Alertes personnelles
    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - 5)
    const { data: bloquees } = await supabase
      .from("missions")
      .select("*")
      .eq("consultant_id", uid)
      .eq("statut", "en_cours")
      .lte("updated_at", dateLimite.toISOString())
    setMesAlertes(bloquees || [])
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function tempsEcoule(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const j = Math.floor(diff / 86400000)
    if (j === 0) return "aujourd'hui"
    if (j === 1) return "hier"
    return `il y a ${j} jours`
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  // ── VUE ADMIN ──
  if (role === "admin") {
    const kpis = [
      { label: "Total actifs",       valeur: statsAdmin.totalActifs,       icon: "ti-building",        color: "#0F6E56" },
      { label: "Actifs analysés",    valeur: statsAdmin.actifsAnalyses,    icon: "ti-clipboard-check", color: "#1E40AF" },
      { label: "Campagnes",          valeur: statsAdmin.campagnes,         icon: "ti-speakerphone",    color: "#D97706" },
      { label: "Missions",           valeur: statsAdmin.missions,          icon: "ti-briefcase",       color: "#5B21B6" },
      { label: "Documents",          valeur: statsAdmin.documents,         icon: "ti-folders",         color: "#0369A1" },
      { label: "Demandes en attente",valeur: statsAdmin.demandesEnAttente, icon: "ti-clock",           color: "#B91C1C" },
    ]
    const totalRep = repartition.reduce((s, r) => s + r.nb, 0) || 1

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ width: 30, height: 30, borderRadius: "7px", background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: k.color }} aria-hidden="true" />
                </div>
                {k.label === "Demandes en attente" && k.valeur > 0 && (
                  <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px" }}>!</span>
                )}
              </div>
              <div style={{ fontSize: "24px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>
                {k.valeur.toLocaleString("fr-FR")}
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* File d'attente + Alertes */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

          {/* File d'attente unifiée */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="ti ti-inbox" style={{ fontSize: "16px", color: "#B91C1C" }} aria-hidden="true" />
                File d'attente
                {fileAttente.length > 0 && (
                  <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "10px" }}>{fileAttente.length}</span>
                )}
              </div>
              <button onClick={() => navigate("/metier/missions")} style={{ fontSize: "12px", color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                Voir tout →
              </button>
            </div>
            {fileAttente.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "24px", color: "#0F6E56", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                Aucune demande en attente
              </div>
            ) : fileAttente.map((d, i) => {
              const origine = ORIGINE_CONFIG[d.origine || "marketplace"]
              return (
                <div key={d.id}
                  onClick={() => navigate("/metier/missions")}
                  style={{ padding: "12px 20px", borderBottom: i < fileAttente.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                >
                  <span style={{ background: origine.bg, color: origine.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, flexShrink: 0 }}>{origine.label}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.type_prestation || d.nom || "Demande de prestation"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{d.note_age || "—"}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", flexShrink: 0 }}>{tempsEcoule(d.created_at)}</div>
                  <i className="ti ti-chevron-right" style={{ fontSize: "14px", color: "#CBD5E1" }} aria-hidden="true" />
                </div>
              )
            })}
          </div>

          {/* Alertes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* Missions bloquées */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: "15px", color: "#D97706" }} aria-hidden="true" />
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>Missions bloquées</div>
                {alertesMissions.length > 0 && (
                  <span style={{ background: "#FFFBEB", color: "#92400E", fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "10px", marginLeft: "auto" }}>{alertesMissions.length}</span>
                )}
              </div>
              {alertesMissions.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#94A3B8", fontSize: "12px" }}>Aucune mission bloquée</div>
              ) : alertesMissions.map((m, i) => (
                <div key={m.id} onClick={() => navigate("/metier/missions")} style={{ padding: "10px 16px", borderBottom: i < alertesMissions.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEB")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A" }}>{m.societe || "—"}</div>
                  <div style={{ fontSize: "11px", color: "#D97706" }}>Phase {m.phase || 1} — {tempsEcoule(m.updated_at || m.created_at)}</div>
                </div>
              ))}
            </div>

            {/* Demandes urgentes */}
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <i className="ti ti-clock" style={{ fontSize: "15px", color: "#B91C1C" }} aria-hidden="true" />
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#991B1B" }}>Action requise</div>
              </div>
              <div style={{ fontSize: "13px", color: "#991B1B" }}>
                <span style={{ fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{statsAdmin.demandesEnAttente}</span> demande{statsAdmin.demandesEnAttente > 1 ? "s" : ""} en attente de qualification
              </div>
              <button onClick={() => navigate("/metier/missions")} style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "5px", background: "#B91C1C", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
                Traiter maintenant
              </button>
            </div>
          </div>
        </div>

        {/* Répartition actifs + Clients + Consultants */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

          {/* Répartition actifs */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Répartition des actifs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {repartition.map((r, i) => {
                const pct = Math.round(r.nb / totalRep * 100)
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.color }} />
                        <span style={{ fontSize: "12px", color: "#64748B" }}>{r.phase}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{r.nb}</span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{pct} %</span>
                      </div>
                    </div>
                    <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                      <div style={{ background: r.color, width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Répartition clients */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Répartition clients</div>
            {repartitionClients.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", padding: "16px 0" }}>Aucun actif client</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {repartitionClients.map((c, i) => {
                  const conf = TYPE_CLIENT_CONFIG[c.type] || { label: c.type, color: "#64748B", bg: "#F1F5F9" }
                  const total = repartitionClients.reduce((s, x) => s + x.nb, 0) || 1
                  const pct = Math.round(c.nb / total * 100)
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ background: conf.bg, color: conf.color, padding: "1px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{conf.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{c.nb}</span>
                          <span style={{ fontSize: "11px", color: "#94A3B8" }}>{pct} %</span>
                        </div>
                      </div>
                      <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                        <div style={{ background: conf.color, width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Charge consultants */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Charge consultants</div>
            {consultants.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", padding: "16px 0" }}>Aucun consultant</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {consultants.map((c, i) => {
                  const charge = Math.min(c.missions * 20, 100)
                  const chargeColor = charge >= 80 ? "#B91C1C" : charge >= 50 ? "#D97706" : "#0F6E56"
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", color: "#0F172A", fontWeight: 500 }}>{c.prenom} {c.nom}</span>
                        <span style={{ fontSize: "12px", color: chargeColor, fontWeight: 500, fontFamily: "'DM Mono', monospace" }}>{c.missions} mission{c.missions > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                        <div style={{ background: chargeColor, width: `${charge}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── VUE CONSULTANT ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
            {prenom ? `Bonjour, ${prenom}` : "Bonjour"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            <span style={{ fontWeight: 500, color: "#0F172A" }}>{mesMissions.length}</span> mission{mesMissions.length > 1 ? "s" : ""} assignée{mesMissions.length > 1 ? "s" : ""}
            {mesAlertes.length > 0 && <span style={{ color: "#D97706", marginLeft: "8px" }}>· <i className="ti ti-alert-triangle" style={{ fontSize: "12px" }} /> {mesAlertes.length} alerte{mesAlertes.length > 1 ? "s" : ""}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/metier/portefeuille")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-building-bank" style={{ fontSize: "14px" }} aria-hidden="true" /> Portefeuille
          </button>
          <button onClick={() => navigate("/metier/missions")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-briefcase" style={{ fontSize: "14px" }} aria-hidden="true" /> Missions
          </button>
        </div>
      </div>

      {/* Alertes personnelles */}
      {mesAlertes.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: "18px", color: "#D97706", flexShrink: 0 }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#92400E", marginBottom: "3px" }}>
              {mesAlertes.length} mission{mesAlertes.length > 1 ? "s" : ""} sans activité depuis +5 jours
            </div>
            <div style={{ fontSize: "12px", color: "#92400E" }}>
              {mesAlertes.map(m => m.societe || "Mission").join(", ")}
            </div>
          </div>
          <button onClick={() => navigate("/metier/missions")} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px", background: "#D97706", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            Voir <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* KPIs consultant */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Missions assignées", val: mesMissions.length,  icon: "ti-briefcase",    color: "#5B21B6" },
          { label: "Actifs suivis",      val: mesActifs.length,    icon: "ti-building",     color: "#0F6E56" },
          { label: "Campagnes actives",  val: mesCampagnes.length, icon: "ti-speakerphone", color: "#D97706" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 28, height: 28, borderRadius: "7px", background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "14px", color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* 3 colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>

        {/* Mes missions */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-briefcase" style={{ fontSize: "15px", color: "#5B21B6" }} aria-hidden="true" />
              Mes missions
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#5B21B6", background: "#F5F3FF", padding: "2px 8px", borderRadius: "10px" }}>{mesMissions.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mesMissions.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune mission assignée</div>
            ) : mesMissions.map((m, i) => (
              <div key={m.id} onClick={() => navigate("/metier/missions")}
                style={{ padding: "12px 16px", borderBottom: i < mesMissions.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{m.societe || "—"}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>Phase {m.phase || 1}/10 · {formatDate(m.created_at)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/metier/missions")} style={{ fontSize: "12px", color: "#5B21B6", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Voir tout →</button>
          </div>
        </div>

        {/* Mes actifs */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-building" style={{ fontSize: "15px", color: "#0F6E56" }} aria-hidden="true" />
              Mes actifs
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#065F46", background: "#ECFDF5", padding: "2px 8px", borderRadius: "10px" }}>{mesActifs.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mesActifs.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucun actif suivi</div>
            ) : mesActifs.map((a, i) => (
              <div key={a.id} onClick={() => navigate(`/metier/portefeuille/${a.id}`)}
                style={{ padding: "12px 16px", borderBottom: i < mesActifs.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{a.nom || a.adresse || "—"}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{a.ville || "—"} · {formatDate(a.created_at)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/metier/portefeuille")} style={{ fontSize: "12px", color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Voir tout →</button>
          </div>
        </div>

        {/* Mes campagnes */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-speakerphone" style={{ fontSize: "15px", color: "#D97706" }} aria-hidden="true" />
              Campagnes
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#92400E", background: "#FFFBEB", padding: "2px 8px", borderRadius: "10px" }}>{mesCampagnes.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mesCampagnes.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune campagne</div>
            ) : mesCampagnes.map((c, i) => (
              <div key={c.id} onClick={() => navigate("/metier/campagnes")}
                style={{ padding: "12px 16px", borderBottom: i < mesCampagnes.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{c.nom || `Campagne #${i + 1}`}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{c.statut || "En cours"} · {formatDate(c.created_at)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/metier/campagnes")} style={{ fontSize: "12px", color: "#D97706", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Voir tout →</button>
          </div>
        </div>
      </div>
    </div>
  )
}