import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const alertes = [
  { icon: "ti-alert-triangle", texte: "Dossiers sans contact", color: "#D97706", bg: "#FFFBEB" },
  { icon: "ti-clock", texte: "Diagnostics en attente", color: "#D97706", bg: "#FFFBEB" },
  { icon: "ti-circle-x", texte: "Financement bloqué", color: "#B91C1C", bg: "#FEF2F2" },
]

export default function DashboardMetier() {
  const [stats, setStats] = useState({ biens: 0, diagnostics: 0, travaux: 0, campagnes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [biensRes, diagRes, travauxRes, campRes] = await Promise.all([
      supabase.from("biens").select("id", { count: "exact" }),
      supabase.from("biens").select("id", { count: "exact" }).eq("statut", "diagnostic"),
      supabase.from("biens").select("id", { count: "exact" }).eq("statut", "travaux"),
      supabase.from("campagnes").select("id", { count: "exact" }),
    ])
    setStats({
      biens: biensRes.count || 0,
      diagnostics: diagRes.count || 0,
      travaux: travauxRes.count || 0,
      campagnes: campRes.count || 0,
    })
    setLoading(false)
  }

  const kpis = [
    { label: "Biens dans le portefeuille", valeur: stats.biens, icon: "ti-building-bank", tendance: "Total actifs suivis" },
    { label: "En phase diagnostic", valeur: stats.diagnostics, icon: "ti-clipboard-list", tendance: `${stats.biens > 0 ? Math.round(stats.diagnostics / stats.biens * 100) : 0} % du portefeuille` },
    { label: "En phase travaux", valeur: stats.travaux, icon: "ti-tool", tendance: `${stats.biens > 0 ? Math.round(stats.travaux / stats.biens * 100) : 0} % du portefeuille` },
    { label: "Campagnes actives", valeur: stats.campagnes, icon: "ti-speakerphone", tendance: "En cours" },
  ]

  const funnel = [
    { name: "Contact", valeur: stats.biens },
    { name: "RDV", valeur: Math.round(stats.biens * 0.45) },
    { name: "Diagnostic", valeur: stats.diagnostics },
    { name: "Travaux", valeur: stats.travaux },
  ]
  const maxFunnel = funnel[0].valeur || 1

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: "#0F6E56" }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 500, color: "#0F172A", letterSpacing: "-0.02em", fontFamily: "'DM Mono', monospace", marginBottom: "6px" }}>
              {k.valeur.toLocaleString("fr-FR")}
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8" }}>{k.tendance}</div>
          </div>
        ))}
      </div>

      {/* Funnel + Alertes */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "20px" }}>Funnel de transformation</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {funnel.map((f, i) => {
              const pct = Math.round(f.valeur / maxFunnel * 100)
              const colors = ["#0F6E56", "#1D9E75", "#D97706", "#B91C1C"]
              return (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#64748B" }}>{f.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{f.valeur.toLocaleString("fr-FR")}</span>
                      <span style={{ fontSize: "11px", color: "#94A3B8", minWidth: "36px", textAlign: "right" }}>{pct} %</span>
                    </div>
                  </div>
                  <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div style={{ background: colors[i], width: `${pct}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Alertes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alertes.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 14px", background: a.bg,
                borderRadius: "0 8px 8px 0", borderLeft: `3px solid ${a.color}`,
              }}>
                <i className={`ti ${a.icon}`} style={{ fontSize: "16px", color: a.color, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{a.texte}</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: a.color, fontFamily: "'DM Mono', monospace" }}>
                  {i === 0 ? stats.biens - stats.diagnostics - stats.travaux : i === 1 ? stats.diagnostics : 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Répartition du portefeuille</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              {["Phase", "Nombre de biens", "Part du portefeuille"].map(h => (
                <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { phase: "À contacter", nb: stats.biens - stats.diagnostics - stats.travaux, color: "#D97706" },
              { phase: "Diagnostic", nb: stats.diagnostics, color: "#0369A1" },
              { phase: "Travaux", nb: stats.travaux, color: "#7C3AED" },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "12px 20px", fontSize: "13px", color: "#0F172A" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                    {r.phase}
                  </div>
                </td>
                <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{r.nb.toLocaleString("fr-FR")}</td>
                <td style={{ padding: "12px 20px", fontSize: "13px", color: "#64748B" }}>
                  {stats.biens > 0 ? Math.round(r.nb / stats.biens * 100) : 0} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}