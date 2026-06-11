import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatEur(val: number) {
  if (val >= 1000000) return (val / 1000000).toFixed(1).replace(".", ",") + " M€"
  if (val >= 1000)    return (val / 1000).toFixed(0) + " k€"
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " €"
}

function formatEurFull(val: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " €"
}

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
function TooltipCA({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#B25C2A", fontWeight: 600 }}>
        {formatEurFull(payload[0]?.value || 0)}
      </div>
    </div>
  )
}

function TooltipPie({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "2px" }}>{payload[0]?.name}</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", color: payload[0]?.payload?.color, fontWeight: 700 }}>
        {payload[0]?.value}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Reporting() {
  const navigate  = useNavigate()
  const annee     = new Date().getFullYear()
  const [loading, setLoading] = useState(true)

  // KPIs
  const [caGlobal,        setCaGlobal]        = useState(0)
  const [nbClients,       setNbClients]       = useState(0)
  const [nbBiens,         setNbBiens]         = useState(0)
  const [nbCampagnes,     setNbCampagnes]     = useState(0)
  const [nbMissions,      setNbMissions]      = useState(0)

  // Graphiques
  const [caParMois,       setCaParMois]       = useState<{ mois: string; ca: number }[]>([])
  const [dataPie,         setDataPie]         = useState<{ name: string; value: number; color: string }[]>([])

  // KPIs reporting existants
  const [tauxTransformation, setTauxTransformation] = useState(0)
  const [pertesEvitees,      setPertesEvitees]      = useState(0)
  const [travauxGeneres,     setTravauxGeneres]      = useState(0)
  const [roi,                setRoi]                = useState(0)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [
      factRes, clientRes, actifsRes,
      campRes, missRes,
      missReportRes, campReportRes,
    ] = await Promise.all([
      // Factures émises (statut != brouillon)
      supabase.from("factures")
        .select("total_ht, date_emission, statut")
        .neq("statut", "brouillon"),
      // Clients
      supabase.from("profils_client")
        .select("id", { count: "exact", head: true }),
      // Biens analysés (tous actifs confondus)
      supabase.from("actifs")
        .select("id", { count: "exact", head: true }),
      // Campagnes
      supabase.from("campagnes")
        .select("id", { count: "exact", head: true }),
      // Missions
      supabase.from("missions")
        .select("id", { count: "exact", head: true }),
      // KPIs reporting missions
      supabase.from("missions")
        .select("travaux_generes, pertes_evitees, montant_ht"),
      // KPIs reporting campagnes
      supabase.from("campagnes")
        .select("cout_campagne, courriers_envoyes, diagnostics"),
    ])

    // ── CA global ──────────────────────────────────────────────────────────
    const factures = factRes.data || []
    const ca = factures.reduce((s, f) => s + (f.total_ht || 0), 0)
    setCaGlobal(ca)

    // ── CA par mois (année en cours) ───────────────────────────────────────
    const caMap: Record<number, number> = {}
    for (let i = 0; i < 12; i++) caMap[i] = 0

    factures.forEach(f => {
      if (!f.date_emission) return
      const d = new Date(f.date_emission)
      if (d.getFullYear() === annee) {
        caMap[d.getMonth()] = (caMap[d.getMonth()] || 0) + (f.total_ht || 0)
      }
    })

    setCaParMois(MOIS.map((mois, i) => ({ mois, ca: Math.round(caMap[i]) })))

    // ── Autres KPIs ────────────────────────────────────────────────────────
    setNbClients(clientRes.count || 0)
    setNbBiens(actifsRes.count || 0)
    setNbCampagnes(campRes.count || 0)
    setNbMissions(missRes.count || 0)

    // ── Camembert ─────────────────────────────────────────────────────────
    setDataPie([
      { name: "Campagnes", value: campRes.count || 0, color: "#B25C2A" },
      { name: "Missions",  value: missRes.count || 0, color: "#0369A1" },
    ])

    // ── KPIs reporting ─────────────────────────────────────────────────────
    const missions  = missReportRes.data  || []
    const campagnes = campReportRes.data  || []

    const pe  = missions.reduce((s: number, m: any) => s + (m.pertes_evitees || 0), 0)
    const tg  = missions.reduce((s: number, m: any) => s + (m.travaux_generes || 0), 0)
    const cout = campagnes.reduce((s: number, c: any) => s + (c.cout_campagne || 0), 0)
    const totalCourriers   = campagnes.reduce((s: number, c: any) => s + (c.courriers_envoyes || 0), 0)
    const totalDiagnostics = campagnes.reduce((s: number, c: any) => s + (c.diagnostics || 0), 0)

    setPertesEvitees(pe)
    setTravauxGeneres(tg)
    setRoi(cout > 0 ? pe / cout : 0)
    setTauxTransformation(totalCourriers > 0 ? (totalDiagnostics / totalCourriers) * 100 : 0)

    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#9CA3AF", fontSize: "14px" }}>
      Chargement…
    </div>
  )

  const caMaxMois = Math.max(...caParMois.map(d => d.ca), 1)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          Synthèse — <span style={{ fontWeight: 500, color: "#0F172A" }}>{annee}</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/metier/factures")}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-receipt" style={{ fontSize: "15px" }} aria-hidden="true" />
            Factures
          </button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        {[
          {
            label: "CA global",
            val: formatEur(caGlobal),
            sub: "Factures émises",
            icon: "ti-chart-line",
            color: "#B25C2A",
            bg: "#FEF3EC",
          },
          {
            label: "Clients",
            val: nbClients.toString(),
            sub: "Comptes actifs",
            icon: "ti-building-community",
            color: "#0369A1",
            bg: "#EFF6FF",
          },
          {
            label: "Biens analysés",
            val: nbBiens.toString(),
            sub: "Total patrimoine",
            icon: "ti-building",
            color: "#2F7D5C",
            bg: "#ECFDF5",
          },
          {
            label: "Campagnes",
            val: nbCampagnes.toString(),
            sub: "Toutes périodes",
            icon: "ti-speakerphone",
            color: "#7C3AED",
            bg: "#F5F3FF",
          },
          {
            label: "Missions",
            val: nbMissions.toString(),
            sub: "Toutes périodes",
            icon: "ti-briefcase",
            color: "#1E40AF",
            bg: "#EFF6FF",
          },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px", borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 30, height: 30, borderRadius: "7px", background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: i === 0 ? "20px" : "26px", fontWeight: 600, color: k.color, marginBottom: "4px" }}>
              {k.val}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphiques — Histogramme CA + Camembert */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        {/* Histogramme CA par mois */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>CA mensuel {annee}</div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>Chiffre d'affaires HT par mois (factures émises)</div>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 600, color: "#B25C2A" }}>
              {formatEur(caGlobal)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={caParMois} margin={{ top: 0, right: 0, bottom: 0, left: -10 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "inherit" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "inherit" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? "0" : formatEur(v)}
              />
              <Tooltip content={<TooltipCA />} cursor={{ fill: "#FEF3EC" }} />
              <Bar
                dataKey="ca"
                name="CA HT"
                radius={[4, 4, 0, 0]}
              >
                {caParMois.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.ca === caMaxMois && caMaxMois > 0 ? "#B25C2A" : "#F5DDD0"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Camembert campagnes vs missions */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Répartition activité</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>Campagnes vs Missions</div>

          {nbCampagnes + nbMissions === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94A3B8", fontSize: "13px", flexDirection: "column", gap: "8px" }}>
              <i className="ti ti-chart-pie" style={{ fontSize: "32px", color: "#E2E8F0" }} />
              Aucune donnée
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={dataPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dataPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipPie />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Légende manuelle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {dataPie.map((d, i) => {
                  const total = nbCampagnes + nbMissions
                  const pct   = total > 0 ? Math.round((d.value / total) * 100) : 0
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "2px", background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "#64748B" }}>{d.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", fontWeight: 600, color: d.color }}>{d.value}</span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{pct} %</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPIs Reporting opérationnel */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="ti ti-chart-bar" style={{ fontSize: "15px", color: "#B25C2A" }} aria-hidden="true" />
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Performance opérationnelle</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            {
              label: "ROI campagne",
              val: roi > 0 ? `×${roi.toFixed(0)}` : "—",
              sub: "1 € investi = X € de pertes évitées",
              color: "#7C3AED",
              icon: "ti-trending-up",
            },
            {
              label: "Taux transformation",
              val: tauxTransformation > 0 ? `${tauxTransformation.toFixed(1).replace(".", ",")} %` : "—",
              sub: "Contact → Diagnostic réalisé",
              color: "#0369A1",
              icon: "ti-percentage",
            },
            {
              label: "Pertes évitées",
              val: pertesEvitees > 0 ? formatEur(pertesEvitees) : "—",
              sub: "Cumul toutes missions",
              color: "#2F7D5C",
              icon: "ti-shield-check",
            },
            {
              label: "Travaux générés",
              val: travauxGeneres > 0 ? formatEur(travauxGeneres) : "—",
              sub: "Cumul toutes missions",
              color: "#B25C2A",
              icon: "ti-hammer",
            },
          ].map((k, i) => (
            <div key={i} style={{ padding: "20px", borderRight: i < 3 ? "1px solid #E2E8F0" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "14px", color: k.color }} aria-hidden="true" />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</span>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "22px", fontWeight: 700, color: k.color, marginBottom: "4px" }}>
                {k.val}
              </div>
              <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}