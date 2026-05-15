import React from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { useMeteo } from "../hooks/useMeteo"

const dataCO2 = [
  { annee: "2015", valeur: 400 }, { annee: "2016", valeur: 403 },
  { annee: "2017", valeur: 406 }, { annee: "2018", valeur: 408 },
  { annee: "2019", valeur: 411 }, { annee: "2020", valeur: 413 },
  { annee: "2021", valeur: 416 }, { annee: "2022", valeur: 418 },
  { annee: "2023", valeur: 420 }, { annee: "2024", valeur: 421 },
]

const dataTemp = [
  { annee: "2015", valeur: 0.9 }, { annee: "2016", valeur: 1.1 },
  { annee: "2017", valeur: 1.0 }, { annee: "2018", valeur: 1.0 },
  { annee: "2019", valeur: 1.1 }, { annee: "2020", valeur: 1.2 },
  { annee: "2021", valeur: 1.2 }, { annee: "2022", valeur: 1.3 },
  { annee: "2023", valeur: 1.4 }, { annee: "2024", valeur: 1.4 },
]

const kpis = [
  { label: "Température moyenne", val: "+1.4°C",    icon: "ti-thermometer",  color: "#991B1B" },
  { label: "CO₂ atmosphérique",   val: "421 ppm",   icon: "ti-wind",         color: "#991B1B" },
  { label: "Montée des eaux",     val: "+3.6 mm/an", icon: "ti-ripple",      color: "#1E40AF" },
]

export default function Dashboard() {
  const { data, loading, error } = useMeteo()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Météo en direct */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "9px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-map-pin" style={{ fontSize: "20px", color: "#0F6E56" }} aria-hidden="true" />
        </div>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px" }}>Météo en direct — Dax</div>
          {loading && <div style={{ fontSize: "13px", color: "#64748B" }}>Chargement…</div>}
          {error && <div style={{ fontSize: "13px", color: "#991B1B" }}>{error}</div>}
          {data && (
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>
              {data.temperature}°C · Vent : {data.windspeed} km/h
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Évolution CO₂ (ppm)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dataCO2} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[395, 425]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#0F172A", fontWeight: 500 }}
              />
              <Area type="monotone" dataKey="valeur" stroke="#F87171" fill="#FEE2E2" strokeWidth={2} name="CO₂ (ppm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Température moyenne (°C)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dataTemp} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0.8, 1.5]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#0F172A", fontWeight: 500 }}
              />
              <Line type="monotone" dataKey="valeur" stroke="#0F6E56" strokeWidth={2} dot={{ fill: "#0F6E56", r: 3 }} name="Température (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}