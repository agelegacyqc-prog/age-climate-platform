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

     // Repli / dépli
  const [listeOuverte, setListeOuverte]       = useState(false)
  const [expandedId, setExpandedId]           = useState<string | null>(null)
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
  async function handleAssigner(c: Consultant) {
    if (!assignMissionId) return
    setAssignLoading(true)
    try {
      await supabase
        .from("missions")
        .update({ consultant_id: c.id })
        .eq("id", assignMissionId)

      setAssignSuccess(true)
      setMissionsDisponibles(prev => prev.filter(m => m.id !== assignMissionId))

      const { data: missions } = await supabase
        .from("missions")
        .select("id, societe, statut, phase")
        .eq("consultant_id", c.id)
        .in("statut", ["nouvelle", "en_cours"])

      setConsultants(prev => prev.map(cons => cons.id === c.id ? { ...cons, missions: missions || [] } : cons))
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Consultants actifs", value: consultants.filter(c => c.is_active).length, icon: "ti-users",     color: "#5DCAA5" },
          { label: "Missions actives",   value: totalMissionsActives,                         icon: "ti-briefcase", color: "#85B7EB" },
          { label: "Occupation moyenne", value: `${occupationMoyenne} %`,                     icon: "ti-chart-bar", color: occupationMoyenne >= 90 ? "#F09595" : occupationMoyenne >= 60 ? "#FAC775" : "#5DCAA5" },
        ].map((k, i) => (
          <div
            key={i}
            style={{ background: "#111C2E", borderLeft: `3px solid ${k.color}`, borderRadius: "12px", padding: "20px", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#16233A" }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "#111C2E" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${k.color}2A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</span>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "24px", fontWeight: 700, color: "#FFFFFF" }}>{k.value}</div>
          </div>
        ))}
      </div>

            {/* Liste consultants — dépliante */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <button
          onClick={() => setListeOuverte(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          aria-expanded={listeOuverte}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="ti ti-users" style={{ fontSize: "15px", color: "#B25C2A" }} aria-hidden="true" />
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Consultants</span>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>· {consultants.length} au total</span>
          </div>
          <i className={`ti ti-chevron-${listeOuverte ? "up" : "down"}`} style={{ fontSize: "16px", color: "#9CA3AF" }} aria-hidden="true" />
        </button>
        {listeOuverte && (
        <div style={{ borderTop: "1px solid #E2DDD8", padding: "16px 20px" }}>
      {loading ? (
        <div className="card" style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
          <i className="ti ti-loader" style={{ fontSize: "20px", display: "block", marginBottom: "8px" }} />
          Chargement…
        </div>
      ) : consultants.length === 0 ? (
        <div className="card" style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
          <i className="ti ti-users-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
          Aucun consultant dans votre région
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {consultants.map(c => {
            const pct     = occupation(c)
            const color   = occupationColor(pct)
            const isOpen  = expandedId === c.id
            return (
              <div key={c.id} style={{ background: "#FFFFFF", border: `1px solid ${isOpen ? "#B25C2A" : "#E2DDD8"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.12s" }}>

                {/* En-tête consultant */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                  style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                      <span style={{ color: c.missions.length >= MAX_MISSIONS ? "#B91C1C" : "#111827" }}>{c.missions.length}</span>
                      <span style={{ color: "#9CA3AF" }}>/{MAX_MISSIONS}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}>
                      <div style={{ flex: 1, background: "#E2DDD8", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                        <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color, fontWeight: 600, minWidth: "30px" }}>{pct} %</span>
                    </div>
                    <span className={c.is_active ? "badge badge--success" : "badge badge--neutral"}>
                      <i className={`ti ${c.is_active ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "11px" }} />
                      {c.is_active ? "Actif" : "Inactif"}
                    </span>
                    <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: "16px", color: "#9CA3AF" }} />
                  </div>
                </div>

                {/* Contenu déplié */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid #E2DDD8", padding: "20px" }}>

                    {/* Occupation détaillée */}
                    <div style={{ padding: "14px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0", marginBottom: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#6B7280" }}>Taux d'occupation</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "14px", fontWeight: 600, color }}>{pct} %</span>
                      </div>
                      <div style={{ background: "#E2DDD8", borderRadius: "3px", height: "8px", overflow: "hidden" }}>
                        <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>
                        {c.missions.length} mission{c.missions.length > 1 ? "s" : ""} active{c.missions.length > 1 ? "s" : ""} sur {MAX_MISSIONS} max
                      </div>
                    </div>

                    {/* Missions actives */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                        Missions actives ({c.missions.length})
                      </div>
                      {c.missions.length === 0 ? (
                        <div style={{ padding: "16px", background: "#F4F3F0", borderRadius: "8px", fontSize: "13px", color: "#9CA3AF", textAlign: "center" }}>
                          Aucune mission active
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {c.missions.map(m => {
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
                    {c.missions.length < MAX_MISSIONS && missionsDisponibles.length > 0 && (
                      <div style={{ borderTop: "1px solid #E2DDD8", paddingTop: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                          Assigner une mission
                        </div>

                        {assignSuccess && expandedId === c.id && (
                          <div style={{ padding: "8px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "6px", fontSize: "12px", color: "#2F7D5C", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="ti ti-circle-check" style={{ fontSize: "13px" }} />
                            Mission assignée avec succès
                          </div>
                        )}

                        <select
                          className="input"
                          value={expandedId === c.id ? assignMissionId : ""}
                          onChange={e => setAssignMissionId(e.target.value)}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">Choisir une mission disponible…</option>
                          {missionsDisponibles.map(m => (
                            <option key={m.id} value={m.id}>{m.societe || "Mission sans nom"}</option>
                          ))}
                        </select>

                        {assignMissionId && (
                          <button
                            className="btn-primary"
                            style={{ width: "100%", marginTop: "10px" }}
                            onClick={e => { e.stopPropagation(); handleAssigner(c) }}
                            disabled={assignLoading}
                          >
                            {assignLoading
                              ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Assignation…</>
                              : <><i className="ti ti-user-check" style={{ fontSize: "14px" }} /> Confirmer l'assignation</>
                            }
                          </button>
                        )}
                      </div>
                    )}

                    {c.missions.length >= MAX_MISSIONS && (
                      <div style={{ padding: "12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "12px", color: "#B91C1C", display: "flex", alignItems: "center", gap: "6px" }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: "13px" }} />
                        Capacité maximale atteinte ({MAX_MISSIONS} missions)
                      </div>
                    )}

                  </div>
                )}
              </div>
            )
          })}
          </div>
      )}
        </div>
        )}
      </div>

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