import React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"

const roiData = [
  { mois: "Jan", cout: 12000, pertes: 45000 },
  { mois: "Fév", cout: 15000, pertes: 62000 },
  { mois: "Mar", cout: 18000, pertes: 78000 },
  { mois: "Avr", cout: 22000, pertes: 95000 },
  { mois: "Mai", cout: 25000, pertes: 120000 },
]

const kpis = [
  { label: "Coût campagne",    val: "65 000 €",     icon: "ti-receipt",       color: "#991B1B" },
  { label: "Travaux générés",  val: "1 200 000 €",  icon: "ti-tool",          color: "#1E40AF" },
  { label: "Subventions",      val: "700 000 €",    icon: "ti-coin",          color: "#065F46" },
  { label: "Pertes évitées",   val: "1 800 000 €",  icon: "ti-shield-check",  color: "#5B21B6" },
]

const synthese = [
  { label: "ROI campagne",        val: "×27",     desc: "1 € investi = 27 € de pertes évitées", color: "#5B21B6" },
  { label: "Taux transformation", val: "7 %",     desc: "Contact → Travaux réalisés",            color: "#1E40AF" },
  { label: "Coût par dossier",    val: "203 €",   desc: "Coût moyen par bien traité",            color: "#D97706" },
]

export default function Reporting() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          Synthèse stratégique — <span style={{ fontWeight: 500, color: "#0F172A" }}>Mai 2026</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "8px 16px", borderRadius: "7px",
            fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            <i className="ti ti-file-analytics" style={{ fontSize: "15px" }} aria-hidden="true" />
            Export PDF
          </button>
          <button style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0",
            padding: "8px 16px", borderRadius: "7px",
            fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            <i className="ti ti-table" style={{ fontSize: "15px" }} aria-hidden="true" />
            Export Excel
          </button>
        </div>
      </div>

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
            <div style={{ fontSize: "22px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>ROI — Coût vs Pertes évitées</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roiData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: any) => v.toLocaleString("fr-FR") + " €"}
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748B" }} />
              <Bar dataKey="cout"   name="Coût"          fill="#FCA5A5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pertes" name="Pertes évitées" fill="#6EE7B7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Évolution cumulative</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={roiData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: any) => v.toLocaleString("fr-FR") + " €"}
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748B" }} />
              <Line type="monotone" dataKey="cout"   name="Coût"          stroke="#F87171" strokeWidth={2} dot={{ fill: "#F87171", r: 3 }} />
              <Line type="monotone" dataKey="pertes" name="Pertes évitées" stroke="#0F6E56" strokeWidth={2} dot={{ fill: "#0F6E56", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Synthèse executive */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Synthèse executive</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {synthese.map((s, i) => (
            <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px 20px" }}>
              <div style={{ fontSize: "28px", fontWeight: 500, color: s.color, fontFamily: "'DM Mono', monospace", marginBottom: "6px" }}>{s.val}</div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "12px", color: "#64748B" }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}