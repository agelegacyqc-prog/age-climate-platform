import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const phases = [
  { num: 1,  label: "Initialisation",      icon: "ti-rocket" },
  { num: 2,  label: "Qualification",        icon: "ti-search" },
  { num: 3,  label: "Sélection managers",   icon: "ti-users" },
  { num: 4,  label: "Proposition",          icon: "ti-file-text" },
  { num: 5,  label: "Onboarding",           icon: "ti-briefcase" },
  { num: 6,  label: "Exécution",            icon: "ti-tool" },
  { num: 7,  label: "Suivi & pilotage",     icon: "ti-chart-bar" },
  { num: 8,  label: "Livrables",            icon: "ti-package" },
  { num: 9,  label: "Facturation",          icon: "ti-coin" },
  { num: 10, label: "Capitalisation",       icon: "ti-star" },
]

const URGENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Standard (4-6 semaines)": { label: "Standard", color: "#065F46", bg: "#ECFDF5" },
  "Urgent (2-3 semaines)":   { label: "Urgent",   color: "#92400E", bg: "#FFFBEB" },
  "Très urgent (< 1 semaine)": { label: "Très urgent", color: "#991B1B", bg: "#FEF2F2" },
}

const STATUT_OPTIONS = [
  { value: "nouvelle",  label: "Nouvelle" },
  { value: "en_cours",  label: "En cours" },
  { value: "terminee",  label: "Terminée" },
  { value: "annulee",   label: "Annulée" },
]

export default function Missions() {
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadMissions() }, [])

  async function loadMissions() {
    const { data } = await supabase.from("missions").select("*").order("created_at", { ascending: false })
    setMissions(data || [])
    setLoading(false)
  }

  async function updatePhase(id: string, phase: number) {
    await supabase.from("missions").update({ phase }).eq("id", id)
    setMissions(missions.map(m => m.id === id ? { ...m, phase } : m))
    if (selected?.id === id) setSelected({ ...selected, phase })
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from("missions").update({ statut }).eq("id", id)
    setMissions(missions.map(m => m.id === id ? { ...m, statut } : m))
    if (selected?.id === id) setSelected({ ...selected, statut })
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{missions.length}</span> mission{missions.length > 1 ? "s" : ""} reçue{missions.length > 1 ? "s" : ""}
        </div>
      </div>

      {missions.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="ti ti-briefcase" style={{ fontSize: "24px", color: "#0F6E56" }} aria-hidden="true" />
          </div>
          <div style={{ fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune mission pour l'instant</div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>Les demandes de la Marketplace apparaîtront ici.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "320px 1fr" : "1fr", gap: "16px", alignItems: "start" }}>

          {/* Liste missions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {missions.map(m => {
              const urgence = URGENCE_CONFIG[m.urgence]
              const isSelected = selected?.id === m.id
              const pct = ((m.phase || 1) / 10) * 100
              return (
                <div key={m.id} onClick={() => setSelected(m)} style={{
                  background: "#FFFFFF",
                  border: `1px solid ${isSelected ? "#0F6E56" : "#E2E8F0"}`,
                  borderRadius: "10px", padding: "14px 16px",
                  cursor: "pointer", transition: "border-color 0.12s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", flex: 1, paddingRight: "8px" }}>{m.societe}</div>
                    {urgence && (
                      <span style={{ background: urgence.bg, color: urgence.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, flexShrink: 0 }}>
                        {urgence.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>{m.type_manager}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "10px" }}>{m.format_mission} · {m.secteur}</div>
                  <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden", marginBottom: "4px" }}>
                    <div style={{ background: "#0F6E56", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                    Phase {m.phase || 1}/10 — {phases[(m.phase || 1) - 1]?.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Détail mission */}
          {selected && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{selected.societe}</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.contact_nom} · {selected.contact_email}</div>
                  {selected.contact_telephone && <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.contact_telephone}</div>}
                </div>
                <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: "16px" }}>
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>

              {/* Infos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                {[
                  ["Manager", selected.type_manager],
                  ["Format", selected.format_mission],
                  ["Secteur", selected.secteur],
                  ["Urgence", selected.urgence?.split(" ")[0] || "Standard"],
                ].map(([k, v], i) => (
                  <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{k}</div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v || "—"}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selected.description && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Description</div>
                  <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
                </div>
              )}

              {/* Workflow */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>Workflow — 10 phases</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {phases.map(p => {
                    const isDone = selected.phase > p.num
                    const isActive = selected.phase === p.num
                    return (
                      <div key={p.num} onClick={() => updatePhase(selected.id, p.num)} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 12px", borderRadius: "7px", cursor: "pointer",
                        background: isActive ? "#EFF6FF" : isDone ? "#ECFDF5" : "#F8FAFC",
                        border: isActive ? "1px solid #BFDBFE" : "1px solid transparent",
                        transition: "background 0.12s",
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#E2E8F0",
                          color: isDone || isActive ? "white" : "#94A3B8",
                          fontSize: isDone ? "12px" : "11px", fontWeight: 700,
                        }}>
                          {isDone ? <i className="ti ti-check" aria-hidden="true" /> : p.num}
                        </div>
                        <i className={`ti ${p.icon}`} style={{ fontSize: "14px", color: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#94A3B8" }} aria-hidden="true" />
                        <span style={{ fontSize: "13px", color: isDone ? "#065F46" : isActive ? "#1E40AF" : "#64748B", fontWeight: isActive ? 500 : 400 }}>{p.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={selected.statut}
                  onChange={e => updateStatut(selected.id, e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "white" }}
                >
                  {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                  Contacter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}