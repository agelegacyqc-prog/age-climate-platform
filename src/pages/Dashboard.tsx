import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from "recharts"
import { supabase } from "../lib/supabase"
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

type TypeClient = "banque" | "assurance" | "entreprise" | "collectivite" | null

interface Stats {
  totalActifs: number
  actifsAnalyses: number
  scoreMoyen: number
  campagnesActives: number
  demandesEnCours: number
  demandesEnAttente: number
  missionsEnCours: number
  actifsADiagnostiquer: number
}

function StatCard({ label, valeur, icon, color, bg, tendance, onClick }: {
  label: string
  valeur: string | number
  icon: string
  color: string
  bg: string
  tendance?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px",
        padding: "18px 20px", cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.12s",
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = "#A7F3D0")}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`ti ${icon}`} style={{ fontSize: "16px", color }} aria-hidden="true" />
        </div>
      </div>
      <div style={{ fontSize: "26px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>
        {valeur}
      </div>
      {tendance && <div style={{ fontSize: "12px", color: "#94A3B8" }}>{tendance}</div>}
    </div>
  )
}

function Raccourci({ icon, titre, desc, color, bg, onClick }: {
  icon: string; titre: string; desc: string
  color: string; bg: string; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px",
        padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#A7F3D0"; (e.currentTarget as HTMLDivElement).style.background = "#FAFFFE" }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLDivElement).style.background = "#FFFFFF" }}
    >
      <div style={{ width: 36, height: 36, borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: "18px", color }} aria-hidden="true" />
      </div>
      <div>
        <div style={{ fontWeight: 500, color: "#0F172A", fontSize: "13px", marginBottom: "3px" }}>{titre}</div>
        <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: meteo, loading: meteoLoading } = useMeteo()
  const [typeClient, setTypeClient] = useState<TypeClient>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalActifs: 0, actifsAnalyses: 0, scoreMoyen: 0,
    campagnesActives: 0, demandesEnCours: 0, demandesEnAttente: 0,
    missionsEnCours: 0, actifsADiagnostiquer: 0,
  })
  const [repartitionRisque, setRepartitionRisque] = useState<{ name: string; value: number; color: string }[]>([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profil } = await supabase
      .from("profils_client")
      .select("type_client")
      .eq("id", user.id)
      .single()

    if (profil) {
      setTypeClient(profil.type_client as TypeClient)
      await loadStats(user.id)
    }
    setLoading(false)
  }

  async function loadStats(uid: string) {
    const [actifsRes, analysesRes, campRes, demandesRes, demandesAttenteRes, missionsRes] = await Promise.all([
      supabase.from("actifs").select("id, score_climatique, statut_analyse", { count: "exact" }).eq("user_id", uid),
      supabase.from("actifs").select("id", { count: "exact" }).eq("user_id", uid).not("statut_analyse", "is", null),
      supabase.from("campagnes").select("id", { count: "exact" }),
      supabase.from("demandes_marketplace").select("id", { count: "exact" }).eq("client_id", uid).in("statut", ["validee", "dispatchee", "en_cours"]),
      supabase.from("demandes_marketplace").select("id", { count: "exact" }).eq("client_id", uid).eq("statut", "soumise"),
      supabase.from("missions").select("id", { count: "exact" }),
    ])

    const actifs = actifsRes.data || []
    const scores = actifs.map(a => a.score_climatique).filter(Boolean)
    const scoreMoyen = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0

    // Répartition risque
    const faible  = actifs.filter(a => (a.score_climatique || 0) < 40).length
    const moyen   = actifs.filter(a => (a.score_climatique || 0) >= 40 && (a.score_climatique || 0) < 70).length
    const eleve   = actifs.filter(a => (a.score_climatique || 0) >= 70).length

    setRepartitionRisque([
      { name: "Faible",  value: faible, color: "#0F6E56" },
      { name: "Modéré",  value: moyen,  color: "#D97706" },
      { name: "Élevé",   value: eleve,  color: "#B91C1C" },
    ])

    setStats({
      totalActifs:          actifsRes.count || 0,
      actifsAnalyses:       analysesRes.count || 0,
      scoreMoyen,
      campagnesActives:     campRes.count || 0,
      demandesEnCours:      demandesRes.count || 0,
      demandesEnAttente:    demandesAttenteRes.count || 0,
      missionsEnCours:      missionsRes.count || 0,
      actifsADiagnostiquer: (actifsRes.count || 0) - (analysesRes.count || 0),
    })
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  // ── VUE GÉNÉRIQUE (non connecté ou profil inconnu) ──
  if (!typeClient) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 40, height: 40, borderRadius: "9px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-map-pin" style={{ fontSize: "20px", color: "#0F6E56" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px" }}>Météo en direct — Dax</div>
            {meteoLoading && <div style={{ fontSize: "13px", color: "#64748B" }}>Chargement…</div>}
            {meteo && <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{meteo.temperature}°C · Vent : {meteo.windspeed} km/h</div>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Évolution CO₂ (ppm)</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dataCO2} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="annee" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[395, 425]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
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
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="valeur" stroke="#0F6E56" strokeWidth={2} dot={{ fill: "#0F6E56", r: 3 }} name="Température (°C)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  // ── VUE BANQUE / ASSURANCE ──
  if (typeClient === "banque" || typeClient === "assurance") {
    const labelType = typeClient === "banque" ? "Banque" : "Assurance"
    const alertes = [
      ...(stats.demandesEnAttente > 0 ? [{ icon: "ti-clock", texte: "Demandes en attente de qualification", valeur: stats.demandesEnAttente, color: "#B91C1C", bg: "#FEF2F2", route: "/marketplace" }] : []),
      ...(stats.actifsADiagnostiquer > 0 ? [{ icon: "ti-alert-triangle", texte: "Actifs sans analyse", valeur: stats.actifsADiagnostiquer, color: "#D97706", bg: "#FFFBEB", route: "/client/actifs" }] : []),
    ]

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Bandeau type */}
        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <i className="ti ti-building-bank" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#065F46" }}>Tableau de bord {labelType} — Vue portefeuille</span>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <StatCard label="Actifs analysés" valeur={`${stats.actifsAnalyses} / ${stats.totalActifs}`} icon="ti-building" color="#0F6E56" bg="#ECFDF5" tendance="Du portefeuille total" onClick={() => navigate("/client/actifs")} />
          <StatCard label="Score risque moyen" valeur={stats.scoreMoyen > 0 ? `${stats.scoreMoyen} / 100` : "—"} icon="ti-chart-bar" color="#1E40AF" bg="#EFF6FF" tendance="Score climatique moyen" />
          <StatCard label="Campagnes actives" valeur={stats.campagnesActives} icon="ti-speakerphone" color="#D97706" bg="#FFFBEB" tendance="En cours" onClick={() => navigate("/metier/campagnes")} />
          <StatCard label="Demandes en cours" valeur={stats.demandesEnCours} icon="ti-briefcase" color="#5B21B6" bg="#F5F3FF" tendance="Validées ou en cours" onClick={() => navigate("/marketplace")} />
        </div>

        {/* Répartition risque + Alertes */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

          {/* Graphique répartition */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "20px" }}>Répartition risque climatique du portefeuille</div>
            {repartitionRisque.every(r => r.value === 0) ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                <i className="ti ti-chart-bar" style={{ fontSize: "28px", display: "block", marginBottom: "8px" }} />
                Aucun actif analysé
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={repartitionRisque} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Actifs">
                      {repartitionRisque.map((r, i) => <Cell key={i} fill={r.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "center" }}>
                  {repartitionRisque.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                      <span style={{ fontSize: "12px", color: "#64748B" }}>{r.name} : <strong style={{ color: "#0F172A" }}>{r.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alertes */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Alertes</div>
            {alertes.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "28px", color: "#0F6E56", display: "block", marginBottom: "8px" }} />
                <div style={{ fontSize: "13px", color: "#64748B" }}>Aucune alerte</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {alertes.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(a.route)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: a.bg, borderRadius: "0 8px 8px 0", borderLeft: `3px solid ${a.color}`, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <i className={`ti ${a.icon}`} style={{ fontSize: "15px", color: a.color, flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "#0F172A" }}>{a.texte}</div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: a.color, fontFamily: "'DM Mono', monospace" }}>{a.valeur}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Raccourcis */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Accès rapides</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            <Raccourci icon="ti-speakerphone" titre="Nouvelle campagne" desc="Lancer une campagne de prévention pour vos clients" color="#D97706" bg="#FFFBEB" onClick={() => navigate("/metier/campagnes")} />
            <Raccourci icon="ti-building-store" titre="Marketplace" desc="Déposer une demande de prestation ou de mission" color="#5B21B6" bg="#F5F3FF" onClick={() => navigate("/marketplace")} />
            <Raccourci icon="ti-building" titre="Mes actifs" desc="Consulter et gérer votre portefeuille d'actifs" color="#0F6E56" bg="#ECFDF5" onClick={() => navigate("/client/actifs")} />
          </div>
        </div>
      </div>
    )
  }

  // ── VUE ENTREPRISE / COLLECTIVITÉ ──
  const labelType = typeClient === "collectivite" ? "Collectivité" : "Entreprise"
  const alertesEC = [
    ...(stats.actifsADiagnostiquer > 0 ? [{ icon: "ti-alert-triangle", texte: "Sites sans diagnostic", valeur: stats.actifsADiagnostiquer, color: "#D97706", bg: "#FFFBEB", route: "/client/actifs" }] : []),
    ...(stats.demandesEnAttente > 0 ? [{ icon: "ti-clock", texte: "Demandes en attente", valeur: stats.demandesEnAttente, color: "#B91C1C", bg: "#FEF2F2", route: "/marketplace" }] : []),
  ]

  const avancementMissions = [
    { name: "Soumise",    valeur: stats.demandesEnAttente, color: "#94A3B8" },
    { name: "En cours",   valeur: stats.demandesEnCours,   color: "#0F6E56" },
    { name: "Terminée",   valeur: 0,                       color: "#1E40AF" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Bandeau type */}
      <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <i className={`ti ${typeClient === "collectivite" ? "ti-map" : "ti-building"}`} style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
        <span style={{ fontSize: "13px", fontWeight: 500, color: "#065F46" }}>Tableau de bord {labelType} — Vue territoire & patrimoine</span>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <StatCard label="Sites analysés" valeur={`${stats.actifsAnalyses} / ${stats.totalActifs}`} icon="ti-building" color="#0F6E56" bg="#ECFDF5" tendance="Du patrimoine total" onClick={() => navigate("/client/actifs")} />
        <StatCard label="Score résilience moyen" valeur={stats.scoreMoyen > 0 ? `${stats.scoreMoyen} / 100` : "—"} icon="ti-shield-check" color="#1E40AF" bg="#EFF6FF" tendance="Score climatique moyen" />
        <StatCard label="Missions en cours" valeur={stats.missionsEnCours} icon="ti-briefcase" color="#5B21B6" bg="#F5F3FF" tendance="Toutes missions" onClick={() => navigate("/metier/missions")} />
        <StatCard label="Demandes Marketplace" valeur={stats.demandesEnCours + stats.demandesEnAttente} icon="ti-building-store" color="#D97706" bg="#FFFBEB" tendance="En cours ou en attente" onClick={() => navigate("/marketplace")} />
      </div>

      {/* Avancement missions + Alertes */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        {/* Graphique avancement missions */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "20px" }}>Avancement des demandes par statut</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={avancementMissions} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="valeur" radius={[4, 4, 0, 0]} name="Demandes">
                {avancementMissions.map((r, i) => <Cell key={i} fill={r.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Alertes</div>
          {alertesEC.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "28px", color: "#0F6E56", display: "block", marginBottom: "8px" }} />
              <div style={{ fontSize: "13px", color: "#64748B" }}>Aucune alerte</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {alertesEC.map((a, i) => (
                <div
                  key={i}
                  onClick={() => navigate(a.route)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: a.bg, borderRadius: "0 8px 8px 0", borderLeft: `3px solid ${a.color}`, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <i className={`ti ${a.icon}`} style={{ fontSize: "15px", color: a.color, flexShrink: 0 }} aria-hidden="true" />
                  <div style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "#0F172A" }}>{a.texte}</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: a.color, fontFamily: "'DM Mono', monospace" }}>{a.valeur}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raccourcis */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Accès rapides</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <Raccourci icon="ti-building" titre="Mon patrimoine" desc={`Gérer les sites de votre ${labelType.toLowerCase()}`} color="#0F6E56" bg="#ECFDF5" onClick={() => navigate("/client/actifs")} />
          <Raccourci icon="ti-building-store" titre="Nouvelle demande" desc="Déposer une demande sur la Marketplace" color="#5B21B6" bg="#F5F3FF" onClick={() => navigate("/marketplace")} />
          <Raccourci icon="ti-file-analytics" titre="Reporting" desc="Accéder aux rapports et tableaux de bord" color="#0369A1" bg="#EFF6FF" onClick={() => navigate("/metier/reporting")} />
        </div>
      </div>
    </div>
  )
}