import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const phases = [
  { num: 1, label: "Initialisation", icon: "ti-rocket" },
  { num: 2, label: "Qualification", icon: "ti-search" },
  { num: 3, label: "Sélection managers", icon: "ti-users" },
  { num: 4, label: "Proposition", icon: "ti-file-text" },
  { num: 5, label: "Onboarding", icon: "ti-briefcase" },
  { num: 6, label: "Exécution", icon: "ti-tool" },
  { num: 7, label: "Suivi & pilotage", icon: "ti-chart-bar" },
  { num: 8, label: "Livrables", icon: "ti-package" },
  { num: 9, label: "Facturation", icon: "ti-coin" },
  { num: 10, label: "Capitalisation", icon: "ti-star" },
]

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nouvelle: { label: "Nouvelle", color: "#0369A1", bg: "#EFF6FF" },
  en_cours: { label: "En cours", color: "#065F46", bg: "#ECFDF5" },
  terminee: { label: "Terminée", color: "#475569", bg: "#F1F5F9" },
  annulee:  { label: "Annulée",  color: "#991B1B", bg: "#FEF2F2" },
}

export default function PartenaireMissions() {
  const [missions, setMissions] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("consultant_id", user.id)
      .order("created_at", { ascending: false })
    setMissions(data || [])
    setLoading(false)
  }

  if (loading) return <div style={{ color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "13px", color: "#64748B" }}>
        <span style={{ fontWeight: 500, color: "#0F172A" }}>{missions.length}</span> mission{missions.length > 1 ? "s" : ""} assignée{missions.length > 1 ? "s" : ""}
      </div>

      {missions.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-briefcase" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune mission</div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>AGE vous assignera des missions prochainement</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "300px 1fr" : "1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {missions.map(m => {
              const statut = STATUT_CONFIG[m.statut] || STATUT_CONFIG.nouvelle
              const pct = ((m.phase || 1) / 10) * 100
              return (
                <div key={m.id} onClick={() => setSelected(m)} style={{ background: "#FFFFFF", border: `1px solid ${selected?.id === m.id ? "#0F6E56" : "#E2E8F0"}`, borderRadius: "10px", padding: "14px 16px", cursor: "pointer", transition: "border-color 0.12s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{m.societe || "Mission"}</div>
                    <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px" }}>{m.type_manager || "—"} · {m.secteur || "—"}</div>
                  <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden", marginBottom: "4px" }}>
                    <div style={{ background: "#0F6E56", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>Phase {m.phase || 1}/10 — {phases[(m.phase || 1) - 1]?.label}</div>
                </div>
              )
            })}
          </div>

          {selected && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{selected.societe}</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.secteur} · {selected.type_manager}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>

              {selected.description && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Description</div>
                  <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
                </div>
              )}

              <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "10px" }}>Progression — 10 phases</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {phases.map(p => {
                  const isDone   = selected.phase > p.num
                  const isActive = selected.phase === p.num
                  return (
                    <div key={p.num} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "7px", background: isActive ? "#EFF6FF" : isDone ? "#ECFDF5" : "#F8FAFC", border: isActive ? "1px solid #BFDBFE" : "1px solid transparent" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#E2E8F0", color: isDone || isActive ? "white" : "#94A3B8", fontSize: "11px", fontWeight: 700 }}>
                        {isDone ? <i className="ti ti-check" aria-hidden="true" /> : p.num}
                      </div>
                      <i className={`ti ${p.icon}`} style={{ fontSize: "14px", color: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#94A3B8" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", color: isDone ? "#065F46" : isActive ? "#1E40AF" : "#64748B", fontWeight: isActive ? 500 : 400 }}>{p.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}