import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: "En attente", color: "#92400E", bg: "#FFFBEB" },
  en_cours:   { label: "En cours",   color: "#1E40AF", bg: "#EFF6FF" },
  complete:   { label: "Analysé",    color: "#065F46", bg: "#ECFDF5" },
}

const STATUT_CAMPAGNE_CONFIG: Record<string, { color: string; bg: string }> = {
  soumise:          { color: "#64748B", bg: "#F1F5F9" },
  en_qualification: { color: "#92400E", bg: "#FFFBEB" },
  validee:          { color: "#065F46", bg: "#ECFDF5" },
  en_cours:         { color: "#0369A1", bg: "#EFF6FF" },
  terminee:         { color: "#475569", bg: "#F1F5F9" },
}

const LIMITE_BIENS_AFFICHES = 5

interface CampagneAvecActifs {
  id: string
  nom: string
  statut: string
  date_debut: string | null
  date_fin: string | null
  actifs: any[]
}

export default function BiensCampagnes() {
  const navigate = useNavigate()
  const [campagnes, setCampagnes]         = useState<CampagneAvecActifs[]>([])
  const [loading, setLoading]             = useState(true)
  const [labelProfil, setLabelProfil]     = useState("")
  const [recherche, setRecherche]         = useState("")
  const [filtreCampagne, setFiltreCampagne] = useState("toutes")
  const [filtreStatut, setFiltreStatut]   = useState("tous")
  const [campagnesOuvertes, setCampagnesOuvertes] = useState<Set<string>>(new Set())
  const [campagnesEtendues, setCampagnesEtendues] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [])

  async function archiverCampagne(campagneId: string) {
    if (!confirm("Archiver cette campagne ? Elle ne sera plus visible dans la liste active.")) return
    await supabase
      .from("campagnes")
      .update({ archivee: true, archivee_at: new Date().toISOString() })
      .eq("id", campagneId)
    setCampagnes(prev => prev.filter(c => c.id !== campagneId))
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Charger le profil client
    const { data: profilClient } = await supabase
      .from("profils_client")
      .select("type_client")
      .eq("id", user.id)
      .maybeSingle()

    if (profilClient?.type_client === "banque") setLabelProfil("Biens financés")
    else if (profilClient?.type_client === "assureur") setLabelProfil("Biens assurés")
    else setLabelProfil("Biens campagnes")

    // Charger les campagnes du client
    const { data: campagnesData } = await supabase
      .from("campagnes")
      .select("id, nom, statut, date_debut, date_fin")
      .eq("client_id", user.id)
      .eq("archivee", false)
      .order("created_at", { ascending: false })

    if (!campagnesData) { setLoading(false); return }

    // Pour chaque campagne, charger les actifs liés
    const campagnesAvecActifs: CampagneAvecActifs[] = []
    for (const campagne of campagnesData) {
      const { data: actifs } = await supabase
        .from("campagnes_actifs")
        .select("actif:actif_id(id, nom, adresse, ville, code_postal, type_batiment, surface, statut_analyse, score_climatique)")
        .eq("campagne_id", campagne.id)

      campagnesAvecActifs.push({
        ...campagne,
        actifs: actifs?.map(a => a.actif).filter(Boolean) || [],
      })
    }

    setCampagnes(campagnesAvecActifs.filter(c => c.actifs.length > 0))
    setLoading(false)
  }

  function toggleCampagne(id: string) {
    setCampagnesOuvertes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleVoirTout(id: string) {
    setCampagnesEtendues(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const campagnesFiltrees = campagnes
    .filter(c => filtreCampagne === "toutes" || c.id === filtreCampagne)
    .map(c => ({
      ...c,
      actifs: c.actifs.filter(a => {
        if (filtreStatut !== "tous" && a.statut_analyse !== filtreStatut) return false
        if (recherche && !a.nom?.toLowerCase().includes(recherche.toLowerCase()) && !a.ville?.toLowerCase().includes(recherche.toLowerCase())) return false
        return true
      })
    }))
    .filter(c => c.actifs.length > 0)

  // Une campagne dont les biens matchent une recherche active s'ouvre automatiquement
  const campagnesAffichees = campagnesFiltrees.map(c => ({
    ...c,
    ouverte: recherche.trim().length > 0 ? true : campagnesOuvertes.has(c.id),
  }))

  const totalActifs    = campagnes.reduce((acc, c) => acc + c.actifs.length, 0)
  const totalAnalyses  = campagnes.reduce((acc, c) => acc + c.actifs.filter(a => a.statut_analyse === "complete").length, 0)
  const totalAttente   = campagnes.reduce((acc, c) => acc + c.actifs.filter(a => a.statut_analyse === "en_attente").length, 0)

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour
        </button>
        <button onClick={() => navigate("/client/campagnes")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle campagne
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        {[
          { label: labelProfil,       val: totalActifs,   color: "#0F172A" },
          { label: "Campagnes",       val: campagnes.length, color: "#0F172A" },
          { label: "Analysés",        val: totalAnalyses, color: "#065F46" },
          { label: "En attente",      val: totalAttente,  color: "#D97706" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>{k.label}</div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un bien…" style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
        </div>
        <select value={filtreCampagne} onChange={e => setFiltreCampagne(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", outline: "none", background: "white", color: "#0F172A" }}>
          <option value="toutes">Toutes les campagnes</option>
          {campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", outline: "none", background: "white", color: "#0F172A" }}>
          <option value="tous">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="complete">Analysé</option>
        </select>
      </div>

      {/* Liste en accordéon par campagne */}
      {campagnesAffichees.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-building-bank" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucun bien trouvé</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Créez une campagne et importez vos actifs via CSV</div>
          <button onClick={() => navigate("/client/campagnes")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "14px" }} /> Nouvelle campagne
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {campagnesAffichees.map(c => {
            const sc = STATUT_CAMPAGNE_CONFIG[c.statut] || STATUT_CAMPAGNE_CONFIG.soumise
            const etendue = campagnesEtendues.has(c.id)
            const biensAffiches = etendue ? c.actifs : c.actifs.slice(0, LIMITE_BIENS_AFFICHES)
            const nbMasques = c.actifs.length - biensAffiches.length

            return (
              <div key={c.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>

                {/* En-tête campagne — cliquable */}
                <div
                  onClick={() => toggleCampagne(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: c.ouverte ? sc.bg : "white", cursor: "pointer" }}
                >
                  <i className={`ti ${c.ouverte ? "ti-chevron-down" : "ti-chevron-right"}`} style={{ fontSize: "15px", color: c.ouverte ? sc.color : "#94A3B8" }} aria-hidden="true" />
                  <i className="ti ti-speakerphone" style={{ fontSize: "15px", color: c.ouverte ? sc.color : "#64748B" }} aria-hidden="true" />
                  <span style={{ fontSize: "13px", fontWeight: 500, color: c.ouverte ? sc.color : "#0F172A", flex: 1 }}>{c.nom}</span>
                  <span style={{ fontSize: "11px", color: c.ouverte ? sc.color : "#64748B", background: c.ouverte ? "white" : "#F8FAFC", padding: "3px 9px", borderRadius: "99px" }}>
                    {c.actifs.length} bien{c.actifs.length > 1 ? "s" : ""}
                  </span>
                  {(c.date_debut || c.date_fin) && (
                    <span style={{ fontSize: "11px", color: c.ouverte ? sc.color : "#94A3B8" }}>{c.date_debut || "—"} → {c.date_fin || "—"}</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); archiverCampagne(c.id) }}
                    style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", border: "1px solid #E2E8F0", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", color: "#64748B", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <i className="ti ti-archive" style={{ fontSize: "12px" }} aria-hidden="true" />
                    Archiver
                  </button>
                </div>

                {/* Table compacte des biens */}
                {c.ouverte && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px", gap: "8px", padding: "6px 16px", fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #F1F5F9", borderTop: "1px solid #F1F5F9" }}>
                      <span>Bien</span><span>Statut</span><span style={{ textAlign: "right" }}>Score</span>
                    </div>
                    {biensAffiches.map((a: any) => {
                      const statut = STATUT_CONFIG[a.statut_analyse || "en_attente"]
                      const scoreColor = (a.score_climatique || 0) >= 70 ? "#991B1B" : (a.score_climatique || 0) >= 40 ? "#D97706" : "#065F46"
                      return (
                        <div
                          key={a.id}
                          onClick={() => navigate("/client/actifs/" + a.id)}
                          style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px", gap: "8px", padding: "10px 16px", alignItems: "center", borderBottom: "1px solid #F1F5F9", cursor: "pointer", fontSize: "13px" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                          onMouseLeave={e => (e.currentTarget.style.background = "white")}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: "#0F172A" }}>{a.nom}</div>
                            <div style={{ fontSize: "12px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.adresse}{a.ville ? `, ${a.ville}` : ""}{a.type_batiment ? ` · ${a.type_batiment}` : ""}{a.surface ? ` · ${a.surface} m²` : ""}
                            </div>
                          </div>
                          <span style={{ background: statut.bg, color: statut.color, padding: "3px 9px", borderRadius: "99px", fontSize: "11px", fontWeight: 500, width: "fit-content" }}>{statut.label}</span>
                          <div style={{ textAlign: "right" }}>
                            {a.score_climatique ? (
                              <span style={{ fontWeight: 600, color: scoreColor, fontFamily: "'DM Mono', monospace" }}>{a.score_climatique}<span style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 400 }}> / 100</span></span>
                            ) : (
                              <span style={{ color: "#94A3B8", fontFamily: "'DM Mono', monospace" }}>—</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {nbMasques > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleVoirTout(c.id) }}
                        style={{ width: "100%", padding: "10px", textAlign: "center", fontSize: "12px", color: "#0F6E56", background: "#F8FAFC", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                      >
                        Voir les {nbMasques} autre{nbMasques > 1 ? "s" : ""} bien{nbMasques > 1 ? "s" : ""}
                      </button>
                    )}
                    {etendue && c.actifs.length > LIMITE_BIENS_AFFICHES && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleVoirTout(c.id) }}
                        style={{ width: "100%", padding: "10px", textAlign: "center", fontSize: "12px", color: "#64748B", background: "#F8FAFC", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                      >
                        Réduire
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}