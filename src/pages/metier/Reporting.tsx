import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
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

function TooltipCumul({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#B25C2A", fontWeight: 600 }}>
        {formatEurFull(payload[0]?.value || 0)} cumulés
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
    const [caOrphelin,         setCaOrphelin]         = useState(0)

  // ── Onglets + Performance par client ────────────────────────────────────
  const [ongletReporting, setOngletReporting] = useState<"global" | "clients">("global")
  const [missionsParClient, setMissionsParClient] = useState<{ nom: string; nbMissions: number; montantHt: number; travauxGeneres: number; pertesEvitees: number }[]>([])
  const [campagnesParClient, setCampagnesParClient] = useState<{ nom: string; nbCampagnes: number; cout: number; courriers: number; diagnostics: number }[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

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

    // ── Factures (CA) — filtrées par date_emission, et par région via mission/campagne ──
    let factQuery = supabase.from("factures")
      .select("total_ht, date_emission, statut, mission_id, campagne_id")
      .neq("statut", "brouillon")
      .gte("date_emission", debutISO.split("T")[0])
      .lte("date_emission", finISO.split("T")[0])
    const { data: facturesData } = await factQuery

       let factures = facturesData || []

    // ── CA non rattaché à une région (ni mission_id ni campagne_id) ────────
    const orphelines = (facturesData || []).filter((f: any) => !f.mission_id && !f.campagne_id)
    setCaOrphelin(orphelines.reduce((s, f) => s + (f.total_ht || 0), 0))

    if (region) {
      const [{ data: missionsRegion }, { data: campagnesRegion }] = await Promise.all([
        supabase.from("missions").select("id").eq("region", region),
        supabase.from("campagnes").select("id").eq("region", region),
      ])
      const missionIds = new Set((missionsRegion || []).map((m: any) => m.id))
      const campagneIds = new Set((campagnesRegion || []).map((c: any) => c.id))
      factures = factures.filter((f: any) =>
        (f.mission_id && missionIds.has(f.mission_id)) ||
        (f.campagne_id && campagneIds.has(f.campagne_id))
      )
    }

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

  const loadPerformanceClients = useCallback(async () => {
    setLoadingClients(true)
    const { debut, fin } = getPlageDates()
    const debutISO = debut.toISOString()
    const finISO   = fin.toISOString()
    const region   = filtreRegion === "toutes" ? null : filtreRegion

    // ── Missions par organisation (pipeline B2B) ─────────────────────────
    let missQuery = supabase.from("missions")
      .select("client_id, montant_ht, travaux_generes, pertes_evitees")
      .not("client_id", "is", null)
      .gte("created_at", debutISO).lte("created_at", finISO)
    if (region) missQuery = missQuery.eq("region", region)
    const { data: missionsData } = await missQuery

    const orgIds = [...new Set((missionsData || []).map((m: any) => m.client_id))]
    const { data: orgsData } = orgIds.length > 0
      ? await supabase.from("organisations").select("id, raison_sociale").in("id", orgIds)
      : { data: [] }
    const orgMap: Record<string, string> = {}
    orgsData?.forEach((o: any) => { orgMap[o.id] = o.raison_sociale })

    const missionsAgg: Record<string, { nom: string; nbMissions: number; montantHt: number; travauxGeneres: number; pertesEvitees: number }> = {}
    ;(missionsData || []).forEach((m: any) => {
      const key = m.client_id
      if (!missionsAgg[key]) missionsAgg[key] = { nom: orgMap[key] || "Organisation inconnue", nbMissions: 0, montantHt: 0, travauxGeneres: 0, pertesEvitees: 0 }
      missionsAgg[key].nbMissions      += 1
      missionsAgg[key].montantHt       += m.montant_ht || 0
      missionsAgg[key].travauxGeneres  += m.travaux_generes || 0
      missionsAgg[key].pertesEvitees   += m.pertes_evitees || 0
    })
    setMissionsParClient(Object.values(missionsAgg).sort((a, b) => b.montantHt - a.montantHt))

    // ── Campagnes par compte portail ─────────────────────────────────────
    let campQuery = supabase.from("campagnes")
      .select("client_id, cout_campagne, courriers_envoyes, diagnostics")
      .not("client_id", "is", null)
      .gte("created_at", debutISO).lte("created_at", finISO)
    if (region) campQuery = campQuery.eq("region", region)
    const { data: campagnesData } = await campQuery

    const clientIds = [...new Set((campagnesData || []).map((c: any) => c.client_id))]
    const { data: profilsData } = clientIds.length > 0
      ? await supabase.from("profils").select("id, prenom, nom").in("id", clientIds)
      : { data: [] }
    const profilMap: Record<string, string> = {}
    profilsData?.forEach((p: any) => { profilMap[p.id] = `${p.prenom || ""} ${p.nom || ""}`.trim() || "Client" })

    const campAgg: Record<string, { nom: string; nbCampagnes: number; cout: number; courriers: number; diagnostics: number }> = {}
    ;(campagnesData || []).forEach((c: any) => {
      const key = c.client_id
      if (!campAgg[key]) campAgg[key] = { nom: profilMap[key] || "Client inconnu", nbCampagnes: 0, cout: 0, courriers: 0, diagnostics: 0 }
      campAgg[key].nbCampagnes += 1
      campAgg[key].cout        += c.cout_campagne || 0
      campAgg[key].courriers   += c.courriers_envoyes || 0
      campAgg[key].diagnostics += c.diagnostics || 0
    })
    setCampagnesParClient(Object.values(campAgg).sort((a, b) => b.cout - a.cout))

    setLoadingClients(false)
  }, [filtreRegion, filtrePeriode, filtreAnnee, filtreTrimestre, filtreMois])

  useEffect(() => {
    if (ongletReporting === "clients") loadPerformanceClients()
  }, [ongletReporting, loadPerformanceClients])

    const caMaxMois        = Math.max(...caParMois.map(d => d.ca), 1)
  const caCumule = caParMois.reduce<{ mois: string; cumul: number }[]>((acc, d) => {
    const precedent = acc.length > 0 ? acc[acc.length - 1].cumul : 0
    acc.push({ mois: d.mois, cumul: precedent + d.ca })
    return acc
  }, [])
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

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "4px", background: "#F4F3F0", borderRadius: "9px", padding: "4px", width: "fit-content" }}>
        <button onClick={() => setOngletReporting("global")} style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", border: "none",
          background: ongletReporting === "global" ? "white" : "transparent", color: ongletReporting === "global" ? "#0F172A" : "#6B7280",
          fontSize: "13px", fontWeight: ongletReporting === "global" ? 500 : 400, cursor: "pointer", fontFamily: "inherit",
          boxShadow: ongletReporting === "global" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
        }}>
          <i className="ti ti-chart-bar" style={{ fontSize: "14px" }} />
          Vue globale
        </button>
        <button onClick={() => setOngletReporting("clients")} style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", border: "none",
          background: ongletReporting === "clients" ? "white" : "transparent", color: ongletReporting === "clients" ? "#0F172A" : "#6B7280",
          fontSize: "13px", fontWeight: ongletReporting === "clients" ? 500 : 400, cursor: "pointer", fontFamily: "inherit",
          boxShadow: ongletReporting === "clients" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
        }}>
          <i className="ti ti-building-community" style={{ fontSize: "14px" }} />
          Performance par client
        </button>
      </div>

      {ongletReporting === "global" && (
      <>

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
            { label: "CA global",      val: formatEur(caGlobal),        sub: "Factures émises",  icon: "ti-chart-line",       color: "#F0997B" },
            { label: "Clients",        val: nbClients.toString(),        sub: "Comptes actifs",   icon: "ti-building-community",color: "#85B7EB" },
            { label: "Biens analysés", val: nbBiens.toString(),          sub: "Total patrimoine", icon: "ti-building",         color: "#5DCAA5" },
            { label: "Campagnes",      val: nbCampagnes.toString(),      sub: labelPeriode,       icon: "ti-speakerphone",     color: "#AFA9EC" },
            { label: "Missions",       val: nbMissions.toString(),       sub: labelPeriode,       icon: "ti-briefcase",        color: "#85B7EB" },
          ].map((k, i) => (
            <div
              key={i}
              style={{ background: "#111C2E", borderLeft: `3px solid ${k.color}`, borderRadius: "12px", padding: "20px", transition: "background 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = "#16233A"
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = `inset 0 0 0 1px ${k.color}60, 0 0 24px ${k.color}25`
                const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
                if (halo) halo.style.background = `${k.color}55`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "#111C2E"
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
                const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
                if (halo) halo.style.background = `${k.color}2A`
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div data-halo style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${k.color}2A`, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
                </div>
              </div>
                           <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: i === 0 ? "22px" : "28px", fontWeight: 700, color: "#FFFFFF", marginBottom: "4px" }}>{k.val}</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
              {i === 0 && filtreRegion !== "toutes" && caOrphelin > 0 && (
                <div style={{ fontSize: "10px", color: "#F0997B", marginTop: "6px", fontStyle: "italic" }}>
                  dont {formatEur(caOrphelin)} non rattachés à une région
                </div>
              )}
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

          {filtrePeriode === "annee" && !loading && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>Progression du CA cumulé</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={caCumule} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? "0" : formatEur(v)} />
                  <Tooltip content={<TooltipCumul />} />
                  <Line type="monotone" dataKey="cumul" name="CA cumulé" stroke="#B25C2A" strokeWidth={2.5} dot={{ r: 3, fill: "#B25C2A" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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

      </>
      )}

      {ongletReporting === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Missions par organisation */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-building-community" style={{ fontSize: "15px", color: "#B25C2A" }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Missions par organisation</span>
              <span style={{ marginLeft: "8px", fontSize: "11px", color: "#94A3B8" }}>Pipeline B2B</span>
            </div>
            {loadingClients ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Chargement…</div>
            ) : missionsParClient.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune mission rattachée à une organisation sur la période</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    {["Organisation", "Missions", "Montant HT", "Travaux générés", "Pertes évitées"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", textAlign: h === "Organisation" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {missionsParClient.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{m.nom}</td>
                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#0F172A", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{m.nbMissions}</td>
                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#B25C2A", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(m.montantHt)}</td>
                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#0F172A", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(m.travauxGeneres)}</td>
                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#2F7D5C", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(m.pertesEvitees)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Campagnes par compte portail */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-speakerphone" style={{ fontSize: "15px", color: "#0369A1" }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Campagnes par compte portail</span>
              <span style={{ marginLeft: "8px", fontSize: "11px", color: "#94A3B8" }}>Comptes clients actifs</span>
            </div>
            {loadingClients ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Chargement…</div>
            ) : campagnesParClient.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune campagne rattachée à un compte client sur la période</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    {["Client", "Campagnes", "Coût", "Courriers", "Diagnostics", "Taux transfo."].map(h => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", textAlign: h === "Client" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campagnesParClient.map((c, i) => {
                    const taux = c.courriers > 0 ? (c.diagnostics / c.courriers) * 100 : 0
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{c.nom}</td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#0F172A", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{c.nbCampagnes}</td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#0369A1", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(c.cout)}</td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#0F172A", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{c.courriers}</td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#0F172A", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{c.diagnostics}</td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#7C3AED", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{taux > 0 ? `${taux.toFixed(1).replace(".", ",")} %` : "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

    </div>
  )
}