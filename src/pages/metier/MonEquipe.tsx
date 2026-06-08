import React, { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
interface Consultant {
  id: string
  prenom: string
  nom: string
  region: string
  is_active: boolean
  missions: Mission[]
}

interface Mission {
  id: string
  societe: string
  statut: string
  phase: number
}

const MAX_MISSIONS = 5

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nouvelle: { label: "Nouvelle", color: "#0369A1", bg: "#EFF6FF" },
  en_cours: { label: "En cours", color: "#2F7D5C", bg: "#F0FDF4" },
  terminee: { label: "Terminée", color: "#6B7280", bg: "#F4F3F0" },
  annulee:  { label: "Annulée",  color: "#B91C1C", bg: "#FEF2F2" },
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function MonEquipe() {
  const [consultants, setConsultants]         = useState<Consultant[]>([])
  const [missionsDisponibles, setMissionsDisponibles] = useState<Mission[]>([])
  const [loading, setLoading]                 = useState(true)
  const [region, setRegion]                   = useState<string | null>(null)

  // Drawer
  const [drawerOpen, setDrawerOpen]           = useState(false)
  const [selected, setSelected]               = useState<Consultant | null>(null)
  const [assignMissionId, setAssignMissionId] = useState("")
  const [assignLoading, setAssignLoading]     = useState(false)
  const [assignSuccess, setAssignSuccess]     = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profil } = await supabase
        .from("profils")
        .select("region")
        .eq("id", user.id)
        .single()

      const userRegion = profil?.region || null
      setRegion(userRegion)
console.log("userRegion:", userRegion)
      // Charger les consultants de la région
      const isAdmin = !userRegion

let query = supabase
  .from("profils")
  .select("id, prenom, nom, region, is_active, role")
  .in("role", isAdmin ? ["consultant", "responsable_regional"] : ["consultant"])

if (userRegion) query = query.eq("region", userRegion)

      const { data: consultsData } = await query.order("nom")
console.log("consultsData:", consultsData)
      if (!consultsData) { setLoading(false); return }

      // Charger les missions de chaque consultant
      const consultsAvecMissions = await Promise.all(
        consultsData.map(async (c: any) => {
          const { data: missions } = await supabase
            .from("missions")
            .select("id, societe, statut, phase")
            .eq("consultant_id", c.id)
            .in("statut", ["nouvelle", "en_cours"])
            .order("created_at", { ascending: false })
          return {
            ...c,
            is_active: c.is_active !== false,
            missions: missions || [],
          }
        })
      )

      setConsultants(consultsAvecMissions)

      // Missions disponibles (non assignées) de la région
      let mQuery = supabase
        .from("missions")
        .select("id, societe, statut, phase")
        .is("consultant_id", null)
        .in("statut", ["nouvelle", "en_cours"])

      if (userRegion) mQuery = mQuery.eq("region", userRegion)

      const { data: missionsData } = await mQuery.order("created_at", { ascending: false })
      setMissionsDisponibles(missionsData || [])

    } finally {
      setLoading(false)
    }
  }

  function ouvrirDrawer(c: Consultant) {
    setSelected(c)
    setAssignMissionId("")
    setAssignSuccess(false)
    setDrawerOpen(true)
  }

  async function handleAssigner() {
    if (!selected || !assignMissionId) return
    setAssignLoading(true)
    try {
      await supabase
        .from("missions")
        .update({ consultant_id: selected.id })
        .eq("id", assignMissionId)

      setAssignSuccess(true)
      setMissionsDisponibles(prev => prev.filter(m => m.id !== assignMissionId))

      // Recharger les missions du consultant
      const { data: missions } = await supabase
        .from("missions")
        .select("id, societe, statut, phase")
        .eq("consultant_id", selected.id)
        .in("statut", ["nouvelle", "en_cours"])

      const updatedConsultant = { ...selected, missions: missions || [] }
      setSelected(updatedConsultant)
      setConsultants(prev => prev.map(c => c.id === selected.id ? updatedConsultant : c))
      setAssignMissionId("")

      setTimeout(() => setAssignSuccess(false), 2000)
    } finally {
      setAssignLoading(false)
    }
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalMissionsActives = consultants.reduce((acc, c) => acc + c.missions.length, 0)
  const occupationMoyenne = consultants.length > 0
    ? Math.round(consultants.reduce((acc, c) => acc + (c.missions.length / MAX_MISSIONS) * 100, 0) / consultants.length)
    : 0

  function occupation(c: Consultant) {
    return Math.min(Math.round((c.missions.length / MAX_MISSIONS) * 100), 100)
  }

  function occupationColor(pct: number) {
    if (pct >= 90) return "#B91C1C"
    if (pct >= 60) return "#D97706"
    return "#2F7D5C"
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrapper">

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
            Mon équipe{region ? ` — ${region}` : ""}
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            Consultants rattachés à votre région
          </p>
        </div>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 600, color: "#111827" }}>
          {consultants.length}
          <span style={{ fontSize: "13px", fontWeight: 400, color: "#6B7280", marginLeft: "6px" }}>
            consultant{consultants.length > 1 ? "s" : ""}
          </span>
        </span>
      </div>

      {/* KPIs */}
      <div className="grid-kpi" style={{ marginBottom: "24px" }}>
        {[
          { label: "Consultants actifs",   value: consultants.filter(c => c.is_active).length, icon: "ti-users",      color: "#111827" },
          { label: "Missions actives",     value: totalMissionsActives,                         icon: "ti-briefcase",  color: "#B25C2A" },
          { label: "Occupation moyenne",   value: `${occupationMoyenne} %`,                     icon: "ti-chart-bar",  color: occupationColor(occupationMoyenne) },
          { label: "Missions disponibles", value: missionsDisponibles.length,                   icon: "ti-inbox",      color: missionsDisponibles.length > 0 ? "#D97706" : "#6B7280" },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: "#9CA3AF" }} />
              <span className="label-section">{k.label}</span>
            </div>
            <div className="metric" style={{ fontSize: "24px", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-loader" style={{ fontSize: "20px", display: "block", marginBottom: "8px" }} />
            Chargement…
          </div>
        ) : consultants.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-users-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
            Aucun consultant dans votre région
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                <th style={thStyle}>Consultant</th>
                <th style={thStyle}>Missions actives</th>
                <th style={thStyle}>Occupation</th>
                <th style={thStyle}>Statut</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {consultants.map(c => {
                const pct = occupation(c)
                const color = occupationColor(pct)
                return (
                  <tr
                    key={c.id}
                    style={{ borderBottom: "1px solid #E2DDD8", height: "56px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Consultant */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#F9F0EA", border: "1px solid #F0DDD0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#B25C2A", flexShrink: 0 }}>
                          {(c.prenom[0] || "").toUpperCase()}{(c.nom[0] || "").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>{c.prenom} {c.nom}</div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
  {(c as any).role === "responsable_regional" ? "Resp. régional" : "Consultant"} · {c.region}
</div>
                        </div>
                      </div>
                    </td>

                    {/* Missions */}
                    <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                      <span style={{ color: c.missions.length >= MAX_MISSIONS ? "#B91C1C" : "#111827" }}>
                        {c.missions.length}
                      </span>
                      <span style={{ color: "#9CA3AF" }}>/{MAX_MISSIONS}</span>
                    </td>

                    {/* Occupation */}
                    <td style={{ ...tdStyle, minWidth: "140px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, background: "#E2DDD8", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                          <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: "3px", transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color, fontWeight: 600, minWidth: "34px" }}>
                          {pct} %
                        </span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td style={tdStyle}>
                      <span className={c.is_active ? "badge badge--success" : "badge badge--neutral"}>
                        <i className={`ti ${c.is_active ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "11px" }} />
                        {c.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={() => ouvrirDrawer(c)}
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
      </div>

      {/* ── Drawer fiche consultant ── */}
      {drawerOpen && selected && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", maxWidth: "100vw", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#F9F0EA", border: "1px solid #F0DDD0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: "#B25C2A" }}>
                  {(selected.prenom[0] || "").toUpperCase()}{(selected.nom[0] || "").toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>{selected.prenom} {selected.nom}</h2>
                  <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
  {(selected as any).role === "responsable_regional" ? "Resp. régional" : "Consultant"} · {selected.region}
</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            {/* Corps */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Occupation */}
              <div style={{ padding: "14px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#6B7280" }}>Taux d'occupation</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "14px", fontWeight: 600, color: occupationColor(occupation(selected)) }}>
                    {occupation(selected)} %
                  </span>
                </div>
                <div style={{ background: "#E2DDD8", borderRadius: "3px", height: "8px", overflow: "hidden" }}>
                  <div style={{ background: occupationColor(occupation(selected)), width: `${occupation(selected)}%`, height: "100%", borderRadius: "3px" }} />
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>
                  {selected.missions.length} mission{selected.missions.length > 1 ? "s" : ""} active{selected.missions.length > 1 ? "s" : ""} sur {MAX_MISSIONS} max
                </div>
              </div>

              {/* Missions actives */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  Missions actives ({selected.missions.length})
                </div>
                {selected.missions.length === 0 ? (
                  <div style={{ padding: "16px", background: "#F4F3F0", borderRadius: "8px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>
                    Aucune mission active
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selected.missions.map(m => {
                      const s = STATUT_CONFIG[m.statut] || STATUT_CONFIG.nouvelle
                      return (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F4F3F0", borderRadius: "8px", border: "1px solid #E2DDD8" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <i className="ti ti-briefcase" style={{ fontSize: "14px", color: "#9CA3AF" }} />
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{m.societe || "Mission"}</div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF" }}>Phase {m.phase || 1}/10</div>
                            </div>
                          </div>
                          <span style={{ background: s.bg, color: s.color, fontSize: "10px", padding: "2px 6px", borderRadius: "3px", fontWeight: 500 }}>
                            {s.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Assigner une mission */}
              {selected.missions.length < MAX_MISSIONS && missionsDisponibles.length > 0 && (
                <div style={{ borderTop: "1px solid #E2DDD8", paddingTop: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                    Assigner une mission
                  </div>

                  {assignSuccess && (
                    <div style={{ padding: "8px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", fontSize: "12px", color: "#2F7D5C", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: "13px" }} />
                      Mission assignée avec succès
                    </div>
                  )}

                  <select
                    className="input"
                    value={assignMissionId}
                    onChange={e => setAssignMissionId(e.target.value)}
                  >
                    <option value="">Choisir une mission disponible…</option>
                    {missionsDisponibles.map(m => (
                      <option key={m.id} value={m.id}>{m.societe || "Mission sans nom"}</option>
                    ))}
                  </select>
                </div>
              )}

              {selected.missions.length >= MAX_MISSIONS && (
                <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "12px", color: "#B91C1C", display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "13px" }} />
                  Capacité maximale atteinte ({MAX_MISSIONS} missions)
                </div>
              )}

            </div>

            {/* Footer */}
            {selected.missions.length < MAX_MISSIONS && assignMissionId && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", flexShrink: 0 }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%" }}
                  onClick={handleAssigner}
                  disabled={assignLoading}
                >
                  {assignLoading
                    ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Assignation…</>
                    : <><i className="ti ti-user-check" style={{ fontSize: "14px" }} /> Confirmer l'assignation</>
                  }
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