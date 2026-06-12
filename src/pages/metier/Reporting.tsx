import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
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

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

const TRIMESTRES = [
  { val: "T1", label: "T1 (Jan–Mar)", mois: [0, 1, 2] },
  { val: "T2", label: "T2 (Avr–Jun)", mois: [3, 4, 5] },
  { val: "T3", label: "T3 (Jul–Sep)", mois: [6, 7, 8] },
  { val: "T4", label: "T4 (Oct–Déc)", mois: [9, 10, 11] },
]

// ─── Tooltips ─────────────────────────────────────────────────────────────────
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
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", color: payload[0]?.payload?.color, fontWeight: 700 }}>{payload[0]?.value}</div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Reporting() {
  const navigate = useNavigate()
  const annee    = new Date().getFullYear()

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [roleUser,       setRoleUser]       = useState<string>("admin")
  const [regionUser,     setRegionUser]     = useState<string | null>(null)
  const [regions,        setRegions]        = useState<string[]>([])
  const [filtreRegion,   setFiltreRegion]   = useState<string>("toutes")
  const [filtrePeriode,  setFiltrePeriode]  = useState<"annee" | "trimestre" | "mois">("annee")
  const [filtreAnnee,    setFiltreAnnee]    = useState<number>(annee)
  const [filtreTrimestre,setFiltreTrimestre]= useState<string>("T1")
  const [filtreMois,     setFiltreMois]     = useState<number>(new Date().getMonth())
  const [loading,        setLoading]        = useState(true)

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const [caGlobal,        setCaGlobal]        = useState(0)
  const [nbClients,       setNbClients]       = useState(0)
  const [nbBiens,         setNbBiens]         = useState(0)
  const [nbCampagnes,     setNbCampagnes]     = useState(0)
  const [nbMissions,      setNbMissions]      = useState(0)
  const [caParMois,       setCaParMois]       = useState<{ mois: string; ca: number }[]>([])
  const [dataPie,         setDataPie]         = useState<{ name: string; value: number; color: string }[]>([])
  const [tauxTransformation, setTauxTransformation] = useState(0)
  const [pertesEvitees,      setPertesEvitees]      = useState(0)
  const [travauxGeneres,     setTravauxGeneres]      = useState(0)
  const [roi,                setRoi]                = useState(0)

  // ── Init rôle utilisateur ──────────────────────────────────────────────────
  useEffect(() => {
    async function initRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profil } = await supabase
        .from("profils").select("role, region").eq("id", user.id).single()
      if (profil) {
        setRoleUser(profil.role || "admin")
        setRegionUser(profil.region || null)
        if (profil.role === "responsable_regional" && profil.region) {
          setFiltreRegion(profil.region)
        }
      }
      // Charger toutes les régions disponibles
      const { data: regsData } = await supabase
        .from("profils").select("region").not("region", "is", null)
      const regsUniques = [...new Set((regsData || []).map((r: any) => r.region).filter(Boolean))] as string[]
      setRegions(regsUniques.sort())
    }
    initRole()
  }, [])

  // ── Calcul plage de dates selon filtre ─────────────────────────────────────
  function getPlageDates(): { debut: Date; fin: Date } {
    if (filtrePeriode === "mois") {
      const debut = new Date(filtreAnnee, filtreMois, 1)
      const fin   = new Date(filtreAnnee, filtreMois + 1, 0, 23, 59, 59)
      return { debut, fin }
    }
    if (filtrePeriode === "trimestre") {
      const t    = TRIMESTRES.find(t => t.val === filtreTrimestre) || TRIMESTRES[0]
      const debut = new Date(filtreAnnee, t.mois[0], 1)
      const fin   = new Date(filtreAnnee, t.mois[2] + 1, 0, 23, 59, 59)
      return { debut, fin }
    }
    // Année complète
    return {
      debut: new Date(filtreAnnee, 0, 1),
      fin:   new Date(filtreAnnee, 11, 31, 23, 59, 59),
    }
  }

  // ── Chargement données ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    const { debut, fin } = getPlageDates()
    const debutISO = debut.toISOString()
    const finISO   = fin.toISOString()
    const region   = filtreRegion === "toutes" ? null : filtreRegion

    // ── Factures (CA) — filtrées par date_emission ─────────────────────────
    let factQuery = supabase.from("factures")
      .select("total_ht, date_emission, statut")
      .neq("statut", "brouillon")
      .gte("date_emission", debutISO.split("T")[0])
      .lte("date_emission", finISO.split("T")[0])
    const { data: factures } = await factQuery

    // ── Clients ────────────────────────────────────────────────────────────
    const { count: nbClientsCount } = await supabase
      .from("profils_client").select("id", { count: "exact", head: true })

    // ── Biens analysés ─────────────────────────────────────────────────────
    let biensQuery = supabase.from("actifs").select("id", { count: "exact", head: true })
    const { count: nbBiensCount } = await biensQuery

    // ── Campagnes ─────────────────────────────────────────────────────────
    let campQuery = supabase.from("campagnes")
      .select("id, cout_campagne, courriers_envoyes, diagnostics", { count: "exact" })
      .gte("created_at", debutISO)
      .lte("created_at", finISO)
    if (region) campQuery = campQuery.eq("region", region)
    const { data: campagnes, count: nbCampCount } = await campQuery

    // ── Missions ──────────────────────────────────────────────────────────
    let missQuery = supabase.from("missions")
      .select("id, travaux_generes, pertes_evitees, montant_ht", { count: "exact" })
      .gte("created_at", debutISO)
      .lte("created_at", finISO)
    if (region) missQuery = missQuery.eq("region", region)
    const { data: missions, count: nbMissCount } = await missQuery

    // ── CA global ─────────────────────────────────────────────────────────
    const ca = (factures || []).reduce((s, f) => s + (f.total_ht || 0), 0)
    setCaGlobal(ca)

    // ── CA par mois (histogramme) ─────────────────────────────────────────
    if (filtrePeriode === "annee") {
      const caMap: Record<number, number> = {}
      for (let i = 0; i < 12; i++) caMap[i] = 0
      ;(factures || []).forEach(f => {
        if (!f.date_emission) return
        const d = new Date(f.date_emission)
        if (d.getFullYear() === filtreAnnee) caMap[d.getMonth()] = (caMap[d.getMonth()] || 0) + (f.total_ht || 0)
      })
      setCaParMois(MOIS_LABELS.map((mois, i) => ({ mois, ca: Math.round(caMap[i]) })))
    } else if (filtrePeriode === "trimestre") {
      const t = TRIMESTRES.find(t => t.val === filtreTrimestre) || TRIMESTRES[0]
      const caMap: Record<number, number> = {}
      t.mois.forEach(m => { caMap[m] = 0 })
      ;(factures || []).forEach(f => {
        if (!f.date_emission) return
        const d = new Date(f.date_emission)
        if (t.mois.includes(d.getMonth())) caMap[d.getMonth()] = (caMap[d.getMonth()] || 0) + (f.total_ht || 0)
      })
      setCaParMois(t.mois.map(m => ({ mois: MOIS_LABELS[m], ca: Math.round(caMap[m] || 0) })))
    } else {
      // Mois — par semaine (simplification : par jour groupé en semaines)
      const caMap: Record<string, number> = {}
      ;(factures || []).forEach(f => {
        if (!f.date_emission) return
        const d    = new Date(f.date_emission)
        const week = `S${Math.ceil(d.getDate() / 7)}`
        caMap[week] = (caMap[week] || 0) + (f.total_ht || 0)
      })
      const semaines = ["S1", "S2", "S3", "S4", "S5"]
      setCaParMois(semaines.map(s => ({ mois: s, ca: Math.round(caMap[s] || 0) })))
    }

    // ── KPIs ──────────────────────────────────────────────────────────────
    setNbClients(nbClientsCount || 0)
    setNbBiens(nbBiensCount || 0)
    setNbCampagnes(nbCampCount || 0)
    setNbMissions(nbMissCount || 0)

    setDataPie([
      { name: "Campagnes", value: nbCampCount || 0, color: "#B25C2A" },
      { name: "Missions",  value: nbMissCount || 0, color: "#0369A1" },
    ])

    // ── Reporting opérationnel ─────────────────────────────────────────────
    const pe   = (missions || []).reduce((s: number, m: any) => s + (m.pertes_evitees || 0), 0)
    const tg   = (missions || []).reduce((s: number, m: any) => s + (m.travaux_generes || 0), 0)
    const cout = (campagnes || []).reduce((s: number, c: any) => s + (c.cout_campagne || 0), 0)
    const totalCourriers   = (campagnes || []).reduce((s: number, c: any) => s + (c.courriers_envoyes || 0), 0)
    const totalDiagnostics = (campagnes || []).reduce((s: number, c: any) => s + (c.diagnostics || 0), 0)

    setPertesEvitees(pe)
    setTravauxGeneres(tg)
    setRoi(cout > 0 ? pe / cout : 0)
    setTauxTransformation(totalCourriers > 0 ? (totalDiagnostics / totalCourriers) * 100 : 0)

    setLoading(false)
  }, [filtreRegion, filtrePeriode, filtreAnnee, filtreTrimestre, filtreMois])

  useEffect(() => { loadData() }, [loadData])

  const caMaxMois        = Math.max(...caParMois.map(d => d.ca), 1)
  const isAdmin          = roleUser === "admin" || roleUser === "admin_national"
  const isResponsable    = roleUser === "responsable_regional"
  const labelPeriode     = filtrePeriode === "annee"
    ? `Année ${filtreAnnee}`
    : filtrePeriode === "trimestre"
    ? `${filtreTrimestre} ${filtreAnnee}`
    : `${MOIS_LABELS[filtreMois]} ${filtreAnnee}`

  const anneesDisponibles = Array.from({ length: 5 }, (_, i) => annee - i)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Barre de filtres ─────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>

        {/* Granularité période */}
        <div style={{ display: "flex", gap: "0", border: "1px solid #E2E8F0", borderRadius: "7px", overflow: "hidden" }}>
          {[
            { val: "annee",     label: "Année" },
            { val: "trimestre", label: "Trimestre" },
            { val: "mois",      label: "Mois" },
          ].map(p => (
            <button
              key={p.val}
              onClick={() => setFiltrePeriode(p.val as any)}
              style={{
                padding: "6px 14px", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: filtrePeriode === p.val ? "#B25C2A" : "#FFFFFF",
                color:      filtrePeriode === p.val ? "white"   : "#64748B",
                fontSize: "12px", fontWeight: filtrePeriode === p.val ? 600 : 400,
                borderRight: "1px solid #E2E8F0",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sélecteur année */}
        <select
          value={filtreAnnee}
          onChange={e => setFiltreAnnee(Number(e.target.value))}
          style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", outline: "none", background: "white", color: "#0F172A", cursor: "pointer" }}
        >
          {anneesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Sélecteur trimestre */}
        {filtrePeriode === "trimestre" && (
          <select
            value={filtreTrimestre}
            onChange={e => setFiltreTrimestre(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", outline: "none", background: "white", color: "#0F172A", cursor: "pointer" }}
          >
            {TRIMESTRES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
          </select>
        )}

        {/* Sélecteur mois */}
        {filtrePeriode === "mois" && (
          <select
            value={filtreMois}
            onChange={e => setFiltreMois(Number(e.target.value))}
            style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", outline: "none", background: "white", color: "#0F172A", cursor: "pointer" }}
          >
            {MOIS_LABELS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        )}

        {/* Sélecteur région — admin uniquement */}
        {isAdmin && regions.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <i className="ti ti-map-pin" style={{ fontSize: "14px", color: "#94A3B8" }} />
            <select
              value={filtreRegion}
              onChange={e => setFiltreRegion(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", outline: "none", background: "white", color: "#0F172A", cursor: "pointer" }}
            >
              <option value="toutes">Toutes les régions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* Badge région responsable */}
        {isResponsable && regionUser && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "5px 12px", borderRadius: "6px" }}>
            <i className="ti ti-map-pin" style={{ fontSize: "13px", color: "#1E40AF" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#1E40AF" }}>{regionUser}</span>
          </div>
        )}

        {/* Label période + bouton Factures */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: isAdmin && regions.length > 0 ? "0" : "auto" }}>
          <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "JetBrains Mono, monospace" }}>{labelPeriode}</span>
          <button
            onClick={() => navigate("/metier/factures")}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "6px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-receipt" style={{ fontSize: "13px" }} />
            Factures
          </button>
        </div>
      </div>

      {/* ── KPIs principaux ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px", height: "90px", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
          {[
            { label: "CA global",      val: formatEur(caGlobal),        sub: "Factures émises",  icon: "ti-chart-line",       color: "#B25C2A", bg: "#FEF3EC" },
            { label: "Clients",        val: nbClients.toString(),        sub: "Comptes actifs",   icon: "ti-building-community",color: "#0369A1", bg: "#EFF6FF" },
            { label: "Biens analysés", val: nbBiens.toString(),          sub: "Total patrimoine", icon: "ti-building",         color: "#2F7D5C", bg: "#ECFDF5" },
            { label: "Campagnes",      val: nbCampagnes.toString(),      sub: labelPeriode,       icon: "ti-speakerphone",     color: "#7C3AED", bg: "#F5F3FF" },
            { label: "Missions",       val: nbMissions.toString(),       sub: labelPeriode,       icon: "ti-briefcase",        color: "#1E40AF", bg: "#EFF6FF" },
          ].map((k, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px", borderTop: `3px solid ${k.color}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
                <div style={{ width: 30, height: 30, borderRadius: "7px", background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: k.color }} />
                </div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: i === 0 ? "20px" : "26px", fontWeight: 600, color: k.color, marginBottom: "4px" }}>{k.val}</div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Graphiques ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        {/* Histogramme CA */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>
                CA — {labelPeriode}
                {filtreRegion !== "toutes" && <span style={{ fontSize: "12px", color: "#94A3B8", marginLeft: "8px" }}>· {filtreRegion}</span>}
              </div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>Chiffre d'affaires HT (factures émises)</div>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 600, color: "#B25C2A" }}>
              {formatEur(caGlobal)}
            </div>
          </div>
          {loading ? (
            <div style={{ height: "220px", background: "#F8FAFC", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={caParMois} margin={{ top: 0, right: 0, bottom: 0, left: -10 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? "0" : formatEur(v)} />
                <Tooltip content={<TooltipCA />} cursor={{ fill: "#FEF3EC" }} />
                <Bar dataKey="ca" name="CA HT" radius={[4, 4, 0, 0]}>
                  {caParMois.map((entry, i) => (
                    <Cell key={i} fill={entry.ca === caMaxMois && caMaxMois > 0 ? "#B25C2A" : "#F5DDD0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Camembert */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Répartition activité</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>Campagnes vs Missions · {labelPeriode}</div>

          {loading || (nbCampagnes + nbMissions === 0) ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94A3B8", fontSize: "13px", flexDirection: "column", gap: "8px" }}>
              <i className="ti ti-chart-pie" style={{ fontSize: "32px", color: "#E2E8F0" }} />
              {loading ? "Chargement…" : "Aucune donnée"}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={dataPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {dataPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<TooltipPie />} />
                </PieChart>
              </ResponsiveContainer>
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

      {/* ── Performance opérationnelle ───────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="ti ti-chart-bar" style={{ fontSize: "15px", color: "#B25C2A" }} />
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Performance opérationnelle</span>
          <span style={{ marginLeft: "8px", fontSize: "11px", color: "#94A3B8", fontFamily: "JetBrains Mono, monospace" }}>{labelPeriode}{filtreRegion !== "toutes" ? ` · ${filtreRegion}` : ""}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { label: "ROI campagne",       val: roi > 0 ? `×${roi.toFixed(0)}` : "—",                                                           sub: "1 € investi = X € de pertes évitées", color: "#7C3AED", icon: "ti-trending-up"  },
            { label: "Taux transformation",val: tauxTransformation > 0 ? `${tauxTransformation.toFixed(1).replace(".", ",")} %` : "—",            sub: "Contact → Diagnostic réalisé",         color: "#0369A1", icon: "ti-percentage"   },
            { label: "Pertes évitées",     val: pertesEvitees > 0 ? formatEur(pertesEvitees) : "—",                                              sub: "Cumul missions",                       color: "#2F7D5C", icon: "ti-shield-check" },
            { label: "Travaux générés",    val: travauxGeneres > 0 ? formatEur(travauxGeneres) : "—",                                            sub: "Cumul missions",                       color: "#B25C2A", icon: "ti-hammer"       },
          ].map((k, i) => (
            <div key={i} style={{ padding: "20px", borderRight: i < 3 ? "1px solid #E2E8F0" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "14px", color: k.color }} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</span>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "22px", fontWeight: 700, color: k.color, marginBottom: "4px" }}>
                {loading ? "…" : k.val}
              </div>
              <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}