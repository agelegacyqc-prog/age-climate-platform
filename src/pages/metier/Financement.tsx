import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const PIPELINE = ["depose", "instruction", "valide", "paye"]

const PIPELINE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  depose:      { label: "Déposé",      color: "#92400E", bg: "#FFFBEB", icon: "ti-upload" },
  instruction: { label: "Instruction", color: "#1E40AF", bg: "#EFF6FF", icon: "ti-search" },
  valide:      { label: "Validé",      color: "#065F46", bg: "#ECFDF5", icon: "ti-circle-check" },
  paye:        { label: "Payé",        color: "#0F172A", bg: "#F1F5F9", icon: "ti-coin" },
}

const SUBVENTIONS: Record<string, number> = { eleve: 12000, moyen: 8000, faible: 5000 }
const RESTES: Record<string, number>      = { eleve: 3000,  moyen: 2000, faible: 1500 }

export default function Financement() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState("tous")

  useEffect(() => { loadDossiers() }, [])

  async function loadDossiers() {
    const { data } = await supabase
      .from("dossiers")
      .select("*, biens(adresse, ville, niveau_risque, type_bien)")
      .order("created_at", { ascending: false })
    setDossiers(data || [])
    setLoading(false)
  }

  const totalSubventions = dossiers.reduce((a, d) => a + (SUBVENTIONS[d.biens?.niveau_risque] || 0), 0)
  const totalReste       = dossiers.reduce((a, d) => a + (RESTES[d.biens?.niveau_risque] || 0), 0)
  const dossiersValides  = dossiers.filter(d => d.financement_statut === "valide" || d.financement_statut === "paye").length

  const dossiersFiltres = filtre === "tous" ? dossiers : dossiers.filter(d => d.financement_statut === filtre)

  function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; key?: string }) {
    return (
      <button onClick={onClick} style={{
        padding: "5px 12px", borderRadius: "6px",
        border: active ? "1px solid #0F6E56" : "1px solid #E2E8F0",
        background: active ? "#ECFDF5" : "#FFFFFF",
        color: active ? "#065F46" : "#64748B",
        fontSize: "12px", fontWeight: active ? 600 : 400,
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
      }}>
        {label}
      </button>
    )
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{dossiers.length}</span> dossier{dossiers.length > 1 ? "s" : ""}
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "#0F6E56", color: "white", border: "none",
          padding: "8px 16px", borderRadius: "7px",
          fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouveau dossier
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Subventions mobilisées", val: totalSubventions, suffix: " €", icon: "ti-coin", color: "#065F46" },
          { label: "Reste à charge total",   val: totalReste,       suffix: " €", icon: "ti-trending-down", color: "#991B1B" },
          { label: "Dossiers validés",        val: dossiersValides,  suffix: ` / ${dossiers.length}`, icon: "ti-circle-check", color: "#1E40AF" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: "#0F6E56" }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>
              {typeof k.val === "number" ? k.val.toLocaleString("fr-FR") : k.val}{k.suffix}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Pipeline de financement</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {PIPELINE.map((p, i) => {
            const cfg = PIPELINE_CONFIG[p]
            const nb  = dossiers.filter(d => d.financement_statut === p).length
            const pct = dossiers.length > 0 ? Math.round(nb / dossiers.length * 100) : 0
            return (
              <div key={p} style={{ background: cfg.bg, borderRadius: "8px", padding: "14px 16px", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: "16px", color: cfg.color }} aria-hidden="true" />
                  <span style={{ fontSize: "12px", fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: "28px", fontWeight: 500, color: cfg.color, fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>{nb}</div>
                <div style={{ fontSize: "12px", color: cfg.color, opacity: 0.7 }}>{pct} % du total</div>
                {i < PIPELINE.length - 1 && (
                  <div style={{ position: "absolute", right: "-8px", top: "50%", transform: "translateY(-50%)", zIndex: 1, color: "#CBD5E1", fontSize: "18px" }}>
                    <i className="ti ti-chevron-right" aria-hidden="true" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtres + Tableau */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "4px" }}>Statut</span>
          <FilterPill label="Tous" active={filtre === "tous"} onClick={() => setFiltre("tous")} />
          {PIPELINE.map(p => (
            <FilterPill key={p} label={PIPELINE_CONFIG[p].label} active={filtre === p} onClick={() => setFiltre(p)} />
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              {["Bien", "Type", "Subvention", "Reste à charge", "Statut"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dossiersFiltres.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                  Aucun dossier pour ce statut
                </td>
              </tr>
            ) : (
              dossiersFiltres.map((d, i) => {
                const cfg = PIPELINE_CONFIG[d.financement_statut]
                return (
                  <tr key={d.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{d.biens?.adresse}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>{d.biens?.ville}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>{d.biens?.type_bien || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#065F46", fontFamily: "'DM Mono', monospace" }}>
                      {(SUBVENTIONS[d.biens?.niveau_risque] || 0).toLocaleString("fr-FR")} €
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#991B1B", fontFamily: "'DM Mono', monospace" }}>
                      {(RESTES[d.biens?.niveau_risque] || 0).toLocaleString("fr-FR")} €
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {cfg ? (
                        <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                          {cfg.label}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}