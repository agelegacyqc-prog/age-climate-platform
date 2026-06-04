import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
interface Mission {
  id: string
  societe: string
  secteur: string | null
  type_manager: string | null
  format_mission: string | null
  urgence: string | null
  description: string | null
  contact_nom: string | null
  contact_email: string | null
  contact_telephone: string | null
  statut: string
  phase: number
  created_at: string
  updated_at: string | null
  consultant_id: string | null
  origine: string
  region: string | null
  consultant?: { prenom: string; nom: string } | null
}

const phases = [
  { num: 1,  label: "Initialisation",    icon: "ti-rocket" },
  { num: 2,  label: "Qualification",      icon: "ti-search" },
  { num: 3,  label: "Sélection managers", icon: "ti-users" },
  { num: 4,  label: "Proposition",        icon: "ti-file-text" },
  { num: 5,  label: "Onboarding",         icon: "ti-briefcase" },
  { num: 6,  label: "Exécution",          icon: "ti-tool" },
  { num: 7,  label: "Suivi & pilotage",   icon: "ti-chart-bar" },
  { num: 8,  label: "Livrables",          icon: "ti-package" },
  { num: 9,  label: "Facturation",        icon: "ti-coin" },
  { num: 10, label: "Capitalisation",     icon: "ti-star" },
]

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  nouvelle: { label: "Nouvelle", color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE" },
  en_cours: { label: "En cours", color: "#B25C2A", bg: "#F9F0EA", border: "#F0DDD0" },
  terminee: { label: "Terminée", color: "#6B7280", bg: "#F4F3F0", border: "#E2DDD8" },
  annulee:  { label: "Annulée",  color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
}

const URGENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Standard (4-6 semaines)":   { label: "Standard",    color: "#2F7D5C", bg: "#F0FDF4" },
  "Urgent (2-3 semaines)":     { label: "Urgent",      color: "#D97706", bg: "#FFFBEB" },
  "Très urgent (< 1 semaine)": { label: "Très urgent", color: "#B91C1C", bg: "#FEF2F2" },
}

const ORIGINE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  marketplace: { label: "Marketplace", color: "#0369A1", bg: "#EFF6FF" },
  campagne:    { label: "Campagne",    color: "#D97706", bg: "#FFFBEB" },
  patrimoine:  { label: "Patrimoine",  color: "#7C3AED", bg: "#F5F3FF" },
  interne:     { label: "Interne",     color: "#2F7D5C", bg: "#F0FDF4" },
}

const STATUT_OPTIONS = [
  { value: "nouvelle", label: "Nouvelle" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee",  label: "Annulée" },
]

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function estBloquee(m: Mission) {
  if (m.statut !== "en_cours") return false
  const diff = Date.now() - new Date(m.updated_at || m.created_at).getTime()
  return diff > 5 * 86400000
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function Missions() {
  const navigate = useNavigate()
  const [missions, setMissions]         = useState<Mission[]>([])
  const [consultants, setConsultants]   = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [userRole, setUserRole]         = useState<string>("")
  const [userId, setUserId]             = useState<string>("")
  const [regionAGE, setRegionAGE]       = useState<string | null>(null)

  // Filtres
  const [recherche, setRecherche]       = useState("")
  const [filtreStatut, setFiltreStatut] = useState("tous")
  const [filtreOrigine, setFiltreOrigine] = useState("tous")

  // Drawer
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [selected, setSelected]         = useState<Mission | null>(null)
  const [savingPhase, setSavingPhase]   = useState(false)
  const [savingStatut, setSavingStatut] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profil } = await supabase
      .from("profils")
      .select("role, region")
      .eq("id", user.id)
      .single()

    if (profil) {
      setUserRole(profil.role)
      setRegionAGE(profil.region || null)
    }

    await Promise.all([
      loadMissions(user.id, profil?.role, profil?.region),
      loadConsultants(),
    ])
    setLoading(false)
  }

  async function loadMissions(uid: string, role?: string, region?: string | null) {
    let query = supabase
      .from("missions")
      .select("*, consultant:consultant_id(prenom, nom)")
      .order("created_at", { ascending: false })

    if (role === "consultant") {
      query = query.eq("consultant_id", uid)
    } else if (role === "responsable_regional" && region) {
      query = query.eq("region", region)
    }

    const { data } = await query
    setMissions(data || [])
  }

  async function loadConsultants() {
    const { data } = await supabase
      .from("profils")
      .select("id, prenom, nom")
      .eq("role", "consultant")
    setConsultants(data || [])
  }

  async function updatePhase(missionId: string, phase: number) {
    setSavingPhase(true)
    await supabase
      .from("missions")
      .update({ phase, updated_at: new Date().toISOString() })
      .eq("id", missionId)
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, phase } : m))
    if (selected?.id === missionId) setSelected(prev => prev ? { ...prev, phase } : null)
    setSavingPhase(false)
  }

  async function updateStatut(missionId: string, statut: string) {
    setSavingStatut(true)
    await supabase
      .from("missions")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", missionId)
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, statut } : m))
    if (selected?.id === missionId) setSelected(prev => prev ? { ...prev, statut } : null)
    setSavingStatut(false)
  }

  async function assignerConsultant(missionId: string, consultantId: string) {
    await supabase
      .from("missions")
      .update({ consultant_id: consultantId || null })
      .eq("id", missionId)
    const consultant = consultants.find(c => c.id === consultantId)
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, consultant_id: consultantId, consultant } : m))
    if (selected?.id === missionId) setSelected(prev => prev ? { ...prev, consultant_id: consultantId, consultant } : null)
  }

  // Filtres
  const missionsFiltrees = missions.filter(m => {
    if (filtreStatut !== "tous" && m.statut !== filtreStatut) return false
    if (filtreOrigine !== "tous" && (m.origine || "marketplace") !== filtreOrigine) return false
    if (recherche && !m.societe?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const missionsBloquees = missions.filter(m => estBloquee(m)).length
  const isAdmin = userRole === "admin" || userRole === "admin_national"
  const isResponsable = userRole === "responsable_regional"

  if (loading) return <div style={{ padding: "2rem", color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  return (
    <div className="page-wrapper">

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Missions</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {missions.filter(m => m.statut === "en_cours").length} en cours · {missions.length} total
          </p>
        </div>
      </div>

      {/* Alerte missions bloquées */}
      {missionsBloquees > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#D97706" }} />
          <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 500 }}>
            {missionsBloquees} mission{missionsBloquees > 1 ? "s" : ""} sans activité depuis +5 jours
          </span>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "14px" }} />
          <input
            className="input"
            style={{ paddingLeft: "32px" }}
            placeholder="Rechercher une mission…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: "150px" }} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
          <option value="tous">Tous statuts</option>
          {STATUT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input" style={{ width: "150px" }} value={filtreOrigine} onChange={e => setFiltreOrigine(e.target.value)}>
          <option value="tous">Toutes origines</option>
          {Object.entries(ORIGINE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ fontSize: "13px", color: "#6B7280", marginLeft: "auto" }}>
          <span style={{ fontWeight: 500, color: "#111827" }}>{missionsFiltrees.length}</span> mission{missionsFiltrees.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {missionsFiltrees.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-briefcase-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
            Aucune mission
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                {["Société", "Type / Secteur", "Origine", "Consultant", "Phase", "Statut", "Urgence", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missionsFiltrees.map((m) => {
                const statut  = STATUT_CONFIG[m.statut] || STATUT_CONFIG.nouvelle
                const origine = ORIGINE_CONFIG[m.origine || "marketplace"]
                const urgence = URGENCE_CONFIG[m.urgence || ""]
                const bloquee = estBloquee(m)
                const pct     = ((m.phase || 1) / 10) * 100

                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: "1px solid #E2DDD8", height: "56px", cursor: "pointer", background: bloquee ? "#FFFBF7" : "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = bloquee ? "#FFFBF7" : "transparent")}
                    onClick={() => { setSelected(m); setDrawerOpen(true) }}
                  >
                    {/* Société */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {bloquee && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#D97706", flexShrink: 0, display: "inline-block" }} />}
                        <div>
                          <div style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>{m.societe || "—"}</div>
                          {m.contact_nom && <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{m.contact_nom}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Type / Secteur */}
                    <td style={{ ...tdStyle, color: "#6B7280", fontSize: "12px" }}>
                      <div>{m.type_manager || "—"}</div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{m.secteur || "—"}</div>
                    </td>

                    {/* Origine */}
                    <td style={tdStyle}>
                      <span style={{ background: origine.bg, color: origine.color, fontSize: "10px", padding: "2px 7px", borderRadius: "3px", fontWeight: 500 }}>
                        {origine.label}
                      </span>
                    </td>

                    {/* Consultant */}
                    <td style={{ ...tdStyle, fontSize: "12px" }}>
                      {m.consultant ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#F9F0EA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 600, color: "#B25C2A", flexShrink: 0 }}>
                            {(m.consultant.prenom[0] || "").toUpperCase()}{(m.consultant.nom[0] || "").toUpperCase()}
                          </div>
                          <span style={{ color: "#111827" }}>{m.consultant.prenom} {m.consultant.nom}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#D97706", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}>
                          <i className="ti ti-alert-triangle" style={{ fontSize: "11px" }} />
                          Non assigné
                        </span>
                      )}
                    </td>

                    {/* Phase */}
                    <td style={{ ...tdStyle, minWidth: "100px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ flex: 1, background: "#E2DDD8", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                          <div style={{ background: bloquee ? "#D97706" : "#B25C2A", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#6B7280", minWidth: "32px" }}>
                          {m.phase || 1}/10
                        </span>
                      </div>
                      <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>
                        {phases[(m.phase || 1) - 1]?.label}
                      </div>
                    </td>

                    {/* Statut */}
                    <td style={tdStyle}>
                      <span style={{ background: statut.bg, color: statut.color, border: `1px solid ${statut.border}`, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                        {statut.label}
                      </span>
                    </td>

                    {/* Urgence */}
                    <td style={tdStyle}>
                      {urgence && (
                        <span style={{ background: urgence.bg, color: urgence.color, fontSize: "10px", padding: "2px 7px", borderRadius: "3px", fontWeight: 500 }}>
                          {urgence.label}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(m); setDrawerOpen(true) }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <i className="ti ti-eye" style={{ fontSize: "13px" }} />
                        Voir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {missionsFiltrees.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{missionsFiltrees.length} mission{missionsFiltrees.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* ── Drawer détail mission ── */}
      {drawerOpen && selected && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "460px", maxWidth: "100vw", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ flex: 1, paddingRight: "12px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>{selected.societe}</h2>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ background: ORIGINE_CONFIG[selected.origine || "marketplace"].bg, color: ORIGINE_CONFIG[selected.origine || "marketplace"].color, fontSize: "10px", padding: "2px 7px", borderRadius: "3px", fontWeight: 500 }}>
                    {ORIGINE_CONFIG[selected.origine || "marketplace"].label}
                  </span>
                  {estBloquee(selected) && (
                    <span style={{ background: "#FFFBEB", color: "#D97706", fontSize: "10px", padding: "2px 7px", borderRadius: "3px", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: "10px" }} />
                      Bloquée
                    </span>
                  )}
                  {selected.contact_nom && (
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>{selected.contact_nom} · {selected.contact_email}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", flexShrink: 0 }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            {/* Corps */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Infos */}
              <div>
                <div style={sectionTitleStyle}>Informations</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { label: "Manager", value: selected.type_manager },
                    { label: "Format",  value: selected.format_mission },
                    { label: "Secteur", value: selected.secteur },
                    { label: "Urgence", value: selected.urgence?.split(" ")[0] || "Standard" },
                    { label: "Créée le", value: formatDate(selected.created_at) },
                    { label: "Région", value: selected.region || "—" },
                  ].map((item, i) => (
                    <div key={i} style={{ background: "#F4F3F0", borderRadius: "8px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>{item.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{item.value || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <div style={sectionTitleStyle}>Description</div>
                  <div style={{ padding: "10px 12px", background: "#F4F3F0", borderRadius: "8px", fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                    {selected.description}
                  </div>
                </div>
              )}

              {/* Consultant assigné */}
              {(isAdmin || isResponsable) && (
                <div>
                  <div style={sectionTitleStyle}>Consultant assigné</div>
                  <select
                    className="input"
                    value={selected.consultant_id || ""}
                    onChange={e => assignerConsultant(selected.id, e.target.value)}
                  >
                    <option value="">— Non assigné —</option>
                    {consultants.map(c => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Workflow */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #F4F3F0" }}>
                  <span style={sectionTitleStyle as any}>Workflow — Phase {selected.phase || 1}/10</span>
                  {savingPhase && <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Sauvegarde…</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {phases.map(p => {
                    const isDone   = (selected.phase || 1) > p.num
                    const isActive = (selected.phase || 1) === p.num
                    return (
<div
                      key={p.num}
                      onClick={() => {
                        if (userRole === "consultant" && selected.consultant_id === userId) {
                          updatePhase(selected.id, p.num)
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 12px", borderRadius: "7px",
                        cursor: userRole === "consultant" && selected.consultant_id === userId ? "pointer" : "default",
                        background: isActive ? "#F9F0EA" : isDone ? "#F0FDF4" : "#F4F3F0",
                        border: isActive ? "1px solid #F0DDD0" : "1px solid transparent",
                        transition: "all 0.1s",
                      }}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "#2F7D5C" : isActive ? "#B25C2A" : "#E2DDD8", color: isDone || isActive ? "white" : "#9CA3AF", fontSize: "11px", fontWeight: 700 }}>
                        {isDone ? <i className="ti ti-check" style={{ fontSize: "12px" }} /> : p.num}
                      </div>
                      <i className={`ti ${p.icon}`} style={{ fontSize: "14px", color: isDone ? "#2F7D5C" : isActive ? "#B25C2A" : "#9CA3AF" }} />
                      <span style={{ fontSize: "13px", color: isDone ? "#2F7D5C" : isActive ? "#B25C2A" : "#6B7280", fontWeight: isActive ? 500 : 400 }}>
                        {p.label}
                      </span>
                      {isActive && (
                        <span style={{ marginLeft: "auto", fontSize: "10px", background: "#B25C2A", color: "white", padding: "1px 6px", borderRadius: "10px" }}>
                          En cours
                        </span>
                      )}
              </div>
                  )
                })}
                </div>
              </div>

              {/* Statut */}
              <div>
                <div style={sectionTitleStyle}>Statut de la mission</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {STATUT_OPTIONS.map(s => {
                    const conf = STATUT_CONFIG[s.value]
                    return (
                      <button
                        key={s.value}
                        onClick={() => updateStatut(selected.id, s.value)}
                        disabled={savingStatut}
                        style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${selected.statut === s.value ? conf.border : "#E2DDD8"}`, background: selected.statut === s.value ? conf.bg : "white", color: selected.statut === s.value ? conf.color : "#6B7280" }}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                className="btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setDrawerOpen(false)}
              >
                Fermer
              </button>
            </div>

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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6B7280",
  marginBottom: "10px",
  display: "block",
}