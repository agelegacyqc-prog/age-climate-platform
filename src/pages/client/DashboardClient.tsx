import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const enjeuxMap: any = {
  energie:       { label: "Énergie",    icon: "ti-bolt",         color: "#D97706" },
  environnement: { label: "Carbone",    icon: "ti-plant-2",      color: "#065F46" },
  prevention:    { label: "Risques",    icon: "ti-shield",       color: "#991B1B" },
  resilience:    { label: "Résilience", icon: "ti-refresh",      color: "#1E40AF" },
  financement:   { label: "Aides",      icon: "ti-coin",         color: "#5B21B6" },
  reporting:     { label: "Reporting",  icon: "ti-file-analytics",color: "#0F172A" },
}

const profilsMap: any = {
  entreprise:      { label: "Entreprise",        icon: "ti-building" },
  banque_assurance:{ label: "Banque / Assurance", icon: "ti-building-bank" },
  proprietaire:    { label: "Propriétaire",       icon: "ti-home" },
  collectivite:    { label: "Collectivité",       icon: "ti-building-community" },
  expert:          { label: "Expert",             icon: "ti-search" },
}

const niveauxMap: any = {
  debutant: { label: "Débutant",  color: "#991B1B" },
  en_cours: { label: "En cours",  color: "#D97706" },
  avance:   { label: "Avancé",    color: "#065F46" },
}

const alertes = [
  { icon: "ti-alert-triangle", texte: "Décret Tertiaire — Rapport 2025 à déposer", echeance: "30/09/2025", color: "#D97706", bg: "#FFFBEB" },
  { icon: "ti-circle-x",       texte: "Décret BACS — Mise en conformité requise",   echeance: "01/01/2025", color: "#991B1B", bg: "#FEF2F2" },
  { icon: "ti-clock",          texte: "Audit énergétique — Renouvellement 6 mois",  echeance: "01/11/2025", color: "#1E40AF", bg: "#EFF6FF" },
]

const actionsRapides = [
  { label: "Mes actifs",         icon: "ti-building",       path: "/client/actifs" },
  { label: "Marketplace",        icon: "ti-building-store", path: "/marketplace" },
  { label: "Consulting Climat",  icon: "ti-leaf",           path: "/marketplace" },
  { label: "Modifier mon profil",icon: "ti-settings",       path: "/client/profil" },
]

export default function DashboardClient() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [profil, setProfil] = useState<any>(null)
  const [actifs, setActifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data: profilData } = await supabase
      .from("profils_client")
      .select("*")
      .eq("id", user?.id)
      .single()

    if (!profilData?.onboarding_complete) {
      navigate("/onboarding")
      return
    }

    setProfil(profilData)

    const { data: actifsData } = await supabase
      .from("actifs")
      .select("*")
      .eq("user_id", user?.id)

    setActifs(actifsData || [])
    setLoading(false)
  }

  function getRoadmapWithProgress(roadmap: any[]) {
    return roadmap.map(etape => {
      if (etape.id === "profil") return { ...etape, statut: "complete" }
      if (etape.id === "actif" && actifs.length > 0) return { ...etape, statut: "complete" }
      return etape
    })
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  const roadmap = profil?.roadmap ? getRoadmapWithProgress(profil.roadmap) : []
  const roadmapComplete = roadmap.filter((e: any) => e.statut === "complete").length
  const roadmapTotal = roadmap.length
  const progression = roadmapTotal > 0 ? Math.round((roadmapComplete / roadmapTotal) * 100) : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Hero sobre */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 500, color: "#0F172A", marginBottom: "6px", letterSpacing: "-0.01em" }}>
            Bonjour{user?.email ? ` — ${user.email}` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {profil?.type_client && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px", background: "#ECFDF5", color: "#065F46", padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, border: "1px solid #A7F3D0" }}>
                <i className={`ti ${profilsMap[profil.type_client]?.icon}`} style={{ fontSize: "13px" }} aria-hidden="true" />
                {profilsMap[profil.type_client]?.label}
              </span>
            )}
            {profil?.niveau && (
              <span style={{ background: "#F1F5F9", color: niveauxMap[profil.niveau]?.color || "#64748B", padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                {niveauxMap[profil.niveau]?.label}
              </span>
            )}
            {profil?.enjeux?.map((e: string) => (
              <span key={e} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#F8FAFC", color: "#64748B", padding: "3px 10px", borderRadius: "4px", fontSize: "12px", border: "1px solid #E2E8F0" }}>
                <i className={`ti ${enjeuxMap[e]?.icon}`} style={{ fontSize: "12px" }} aria-hidden="true" />
                {enjeuxMap[e]?.label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate("/client/actifs/nouveau")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Créer un actif
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Actifs enregistrés",    val: actifs.length,                                                   icon: "ti-building",       color: "#0F172A" },
          { label: "Alertes réglementaires",val: alertes.length,                                                  icon: "ti-alert-triangle", color: "#D97706" },
          { label: "Analyses complétées",   val: actifs.filter((a: any) => a.statut_analyse === "complete").length, icon: "ti-circle-check",   color: "#065F46" },
          { label: "Progression roadmap",   val: `${progression} %`,                                              icon: "ti-map",            color: "#1E40AF" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: "#0F6E56" }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        {/* Roadmap */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Votre roadmap personnalisée</div>
            <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "'DM Mono', monospace" }}>{roadmapComplete}/{roadmapTotal} étapes</span>
          </div>

          {/* Barre progression */}
          <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "6px", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ background: "#0F6E56", width: `${progression}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
          </div>

          {roadmap.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8", fontSize: "13px" }}>
              Aucune roadmap —{" "}
              <button onClick={() => navigate("/onboarding")} style={{ color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
                Compléter votre profil
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {roadmap.map((etape: any, i: number) => {
                const isDone = etape.statut === "complete"
                const isActive = etape.statut === "en_cours"
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", borderRadius: "8px",
                    background: isDone ? "#ECFDF5" : isActive ? "#EFF6FF" : "#F8FAFC",
                    border: isActive ? "1px solid #BFDBFE" : "1px solid transparent",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#E2E8F0",
                      color: isDone || isActive ? "white" : "#94A3B8",
                      fontSize: "12px", fontWeight: 700,
                    }}>
                      {isDone ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: "13px", fontWeight: isDone ? 400 : 500, color: isDone ? "#065F46" : "#0F172A" }}>
                      {etape.label}
                    </div>
                    {etape.statut === "a_faire" && (
                      <button
                        onClick={() => {
                          if (etape.id === "actif") navigate("/client/actifs/nouveau")
                          else if (etape.id === "aides") navigate("/client/aides")
                          else if (etape.id === "marketplace") navigate("/marketplace")
                          else navigate("/client/actifs")
                        }}
                        style={{ background: "#0F6E56", color: "white", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        Démarrer
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Alertes */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>Alertes réglementaires</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {alertes.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", padding: "10px 12px", background: a.bg, borderRadius: "0 7px 7px 0", borderLeft: `3px solid ${a.color}` }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: "15px", color: a.color, flexShrink: 0, marginTop: "1px" }} aria-hidden="true" />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{a.texte}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Échéance : {a.echeance}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions rapides */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>Actions rapides</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {actionsRapides.map((a, i) => (
                <button key={i} onClick={() => navigate(a.path)} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 12px", borderRadius: "7px",
                  border: "1px solid #E2E8F0", background: "white",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  fontSize: "13px", color: "#0F172A", fontFamily: "inherit",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                >
                  <i className={`ti ${a.icon}`} style={{ fontSize: "16px", color: "#64748B" }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{a.label}</span>
                  <i className="ti ti-arrow-right" style={{ fontSize: "14px", color: "#CBD5E1" }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}