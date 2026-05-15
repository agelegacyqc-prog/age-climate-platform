import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_contacter: { label: "À contacter", color: "#92400E", bg: "#FFFBEB" },
  diagnostic:  { label: "Diagnostic",  color: "#1E40AF", bg: "#EFF6FF" },
  travaux:     { label: "Travaux",     color: "#5B21B6", bg: "#F5F3FF" },
  termine:     { label: "Terminé",     color: "#065F46", bg: "#ECFDF5" },
}

const URGENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  haute:  { label: "Haute",  color: "#991B1B", bg: "#FEF2F2" },
  moyenne:{ label: "Moyenne",color: "#92400E", bg: "#FFFBEB" },
  basse:  { label: "Basse",  color: "#065F46", bg: "#ECFDF5" },
}

interface Actif {
  id: string
  nom: string
  adresse: string
  ville: string
  statut_analyse: string
  score_climatique: number
  created_at: string
}

interface Mission {
  id: string
  societe: string
  secteur: string
  statut: string
  urgence: string
  description: string
  contact_nom: string
  phase: number
  created_at: string
}

export default function DashboardMetier() {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [prenom, setPrenom] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Stats admin
  const [statsAdmin, setStatsAdmin] = useState({
    totalActifs: 0, actifsAnalyses: 0, campagnes: 0, missions: 0,
    documents: 0, demandesEnAttente: 0,
  })
  const [repartition, setRepartition] = useState<{ phase: string; nb: number; color: string }[]>([])

  // Données consultant
  const [mesActifs, setMesActifs] = useState<Actif[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [mesCampagnes, setMesCampagnes] = useState<any[]>([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profil } = await supabase
      .from("profils")
      .select("role, prenom")
      .eq("id", user.id)
      .single()

    if (profil) {
      setRole(profil.role)
      setPrenom(profil.prenom || "")
      if (profil.role === "admin") {
        await loadStatsAdmin()
      } else {
        await loadStatsConsultant(user.id)
      }
    }
    setLoading(false)
  }

  async function loadStatsAdmin() {
    const [actifsRes, analysesRes, campRes, missRes, docsRes, demandesRes] = await Promise.all([
      supabase.from("actifs").select("id", { count: "exact" }),
      supabase.from("actifs").select("id", { count: "exact" }).not("statut_analyse", "is", null),
      supabase.from("campagnes").select("id", { count: "exact" }),
      supabase.from("missions").select("id", { count: "exact" }),
      supabase.from("documents").select("id", { count: "exact" }),
      supabase.from("demandes_marketplace").select("id", { count: "exact" }).eq("statut", "soumise"),
    ])
    setStatsAdmin({
      totalActifs:        actifsRes.count || 0,
      actifsAnalyses:     analysesRes.count || 0,
      campagnes:          campRes.count || 0,
      missions:           missRes.count || 0,
      documents:          docsRes.count || 0,
      demandesEnAttente:  demandesRes.count || 0,
    })

    // Répartition par statut
    const { data: actifsData } = await supabase.from("actifs").select("statut_analyse")
    const comptage: Record<string, number> = {}
    actifsData?.forEach(a => {
      const s = a.statut_analyse || "non_analyse"
      comptage[s] = (comptage[s] || 0) + 1
    })
    setRepartition([
      { phase: "Non analysé",  nb: comptage["non_analyse"] || 0,  color: "#94A3B8" },
      { phase: "En cours",     nb: comptage["en_cours"] || 0,      color: "#D97706" },
      { phase: "Analysé",      nb: comptage["analyse"] || 0,       color: "#0F6E56" },
      { phase: "À risque",     nb: comptage["a_risque"] || 0,      color: "#B91C1C" },
    ])
  }

  async function loadStatsConsultant(uid: string) {
    const [actifsRes, missionsRes, campRes] = await Promise.all([
      supabase.from("actifs").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
      supabase.from("missions").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("campagnes").select("*").order("created_at", { ascending: false }).limit(5),
    ])
    setMesActifs(actifsRes.data || [])
    setMissions(missionsRes.data || [])
    setMesCampagnes(campRes.data || [])
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  // ── VUE ADMIN ──
  if (role === "admin") {
    const kpis = [
      { label: "Total actifs",        valeur: statsAdmin.totalActifs,       icon: "ti-building",        color: "#0F6E56" },
      { label: "Actifs analysés",      valeur: statsAdmin.actifsAnalyses,    icon: "ti-clipboard-check", color: "#1E40AF" },
      { label: "Campagnes",            valeur: statsAdmin.campagnes,         icon: "ti-speakerphone",    color: "#D97706" },
      { label: "Missions",             valeur: statsAdmin.missions,          icon: "ti-briefcase",       color: "#5B21B6" },
      { label: "Documents",            valeur: statsAdmin.documents,         icon: "ti-folders",         color: "#0369A1" },
      { label: "Demandes en attente",  valeur: statsAdmin.demandesEnAttente, icon: "ti-clock",           color: "#B91C1C" },
    ]
    const totalRep = repartition.reduce((s, r) => s + r.nb, 0) || 1

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ width: 30, height: 30, borderRadius: "7px", background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: k.color }} aria-hidden="true" />
                </div>
                {k.label === "Demandes en attente" && k.valeur > 0 && (
                  <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px" }}>!</span>
                )}
              </div>
              <div style={{ fontSize: "24px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>
                {k.valeur.toLocaleString("fr-FR")}
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Répartition + Alertes */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

          {/* Répartition actifs */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "20px" }}>Répartition des actifs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {repartition.map((r, i) => {
                const pct = Math.round(r.nb / totalRep * 100)
                return (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                        <span style={{ fontSize: "13px", color: "#64748B" }}>{r.phase}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{r.nb}</span>
                        <span style={{ fontSize: "11px", color: "#94A3B8", minWidth: "32px", textAlign: "right" }}>{pct} %</span>
                      </div>
                    </div>
                    <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                      <div style={{ background: r.color, width: `${pct}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Alertes admin */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Alertes & Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { icon: "ti-clock", texte: "Demandes Marketplace en attente", valeur: statsAdmin.demandesEnAttente, color: "#B91C1C", bg: "#FEF2F2", route: "/marketplace" },
                { icon: "ti-alert-triangle", texte: "Actifs sans analyse", valeur: statsAdmin.totalActifs - statsAdmin.actifsAnalyses, color: "#D97706", bg: "#FFFBEB", route: "/metier/portefeuille" },
                { icon: "ti-folders", texte: "Documents uploadés", valeur: statsAdmin.documents, color: "#0369A1", bg: "#EFF6FF", route: "/metier/ged" },
              ].map((a, i) => (
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
          </div>
        </div>

        {/* Tableau répartition */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Détail du portefeuille</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["Statut", "Nombre d'actifs", "Part du portefeuille", "Progression"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 20px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repartition.map((r, i) => {
                const pct = Math.round(r.nb / totalRep * 100)
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", color: "#0F172A" }}>{r.phase}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{r.nb.toLocaleString("fr-FR")}</td>
                    <td style={{ padding: "12px 20px", fontSize: "13px", color: "#64748B" }}>{pct} %</td>
                    <td style={{ padding: "12px 20px", width: "200px" }}>
                      <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                        <div style={{ background: r.color, width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── VUE CONSULTANT ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Bonjour */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>
            {prenom ? `Bonjour, ${prenom}` : "Bonjour"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            {mesActifs.length} actif{mesActifs.length > 1 ? "s" : ""} assigné{mesActifs.length > 1 ? "s" : ""} · {missions.length} mission{missions.length > 1 ? "s" : ""} · {mesCampagnes.length} campagne{mesCampagnes.length > 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/metier/portefeuille")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-building-bank" style={{ fontSize: "14px" }} />
            Portefeuille
          </button>
          <button onClick={() => navigate("/metier/missions")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-briefcase" style={{ fontSize: "14px" }} />
            Missions
          </button>
        </div>
      </div>

      {/* 3 colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>

        {/* Mes actifs */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-building" style={{ fontSize: "15px", color: "#0F6E56" }} />
              Mes actifs
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#065F46", background: "#ECFDF5", padding: "2px 8px", borderRadius: "10px", fontFamily: "'DM Mono', monospace" }}>{mesActifs.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mesActifs.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucun actif assigné</div>
            ) : mesActifs.map((a, i) => (
              <div
                key={a.id}
                onClick={() => navigate(`/client/actifs/${a.id}`)}
                style={{ padding: "12px 16px", borderBottom: i < mesActifs.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{a.nom || a.adresse || "—"}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{a.ville || "—"} · {formatDate(a.created_at)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/metier/portefeuille")} style={{ fontSize: "12px", color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              Voir tout →
            </button>
          </div>
        </div>

        {/* Missions en cours */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-briefcase" style={{ fontSize: "15px", color: "#5B21B6" }} />
              Missions
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#5B21B6", background: "#F5F3FF", padding: "2px 8px", borderRadius: "10px", fontFamily: "'DM Mono', monospace" }}>{missions.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {missions.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune mission en cours</div>
            ) : missions.map((m, i) => {
              const urgence = URGENCE_CONFIG[m.urgence] || { label: m.urgence, color: "#64748B", bg: "#F1F5F9" }
              return (
                <div
                  key={m.id}
                  onClick={() => navigate("/metier/missions")}
                  style={{ padding: "12px 16px", borderBottom: i < missions.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{m.societe || "—"}</div>
                    {m.urgence && (
                      <span style={{ background: urgence.bg, color: urgence.color, fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px" }}>{urgence.label}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>{m.secteur || "—"} · Phase {m.phase || 1}</div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/metier/missions")} style={{ fontSize: "12px", color: "#5B21B6", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              Voir tout →
            </button>
          </div>
        </div>

        {/* Mes campagnes */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-speakerphone" style={{ fontSize: "15px", color: "#D97706" }} />
              Campagnes
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#92400E", background: "#FFFBEB", padding: "2px 8px", borderRadius: "10px", fontFamily: "'DM Mono', monospace" }}>{mesCampagnes.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mesCampagnes.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune campagne</div>
            ) : mesCampagnes.map((c, i) => (
              <div
                key={c.id}
                onClick={() => navigate("/metier/campagnes")}
                style={{ padding: "12px 16px", borderBottom: i < mesCampagnes.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{c.nom || c.titre || `Campagne #${i + 1}`}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{c.statut || "En cours"} · {formatDate(c.created_at)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/metier/campagnes")} style={{ fontSize: "12px", color: "#D97706", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              Voir tout →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}