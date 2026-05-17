import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const THEMATIQUE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  prevention_inondation: { label: "Prévention inondation", color: "#1E40AF", bg: "#EFF6FF", icon: "ti-ripple" },
  resilience_batiments:  { label: "Résilience bâtiments",  color: "#5B21B6", bg: "#F5F3FF", icon: "ti-building" },
  decarbonation:         { label: "Décarbonation",          color: "#065F46", bg: "#ECFDF5", icon: "ti-leaf" },
  sensibilisation:       { label: "Sensibilisation",        color: "#92400E", bg: "#FFFBEB", icon: "ti-school" },
  adaptation_urbaine:    { label: "Adaptation urbaine",     color: "#0369A1", bg: "#E0F2FE", icon: "ti-map-pin" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planifie: { label: "Planifié", color: "#92400E", bg: "#FFFBEB" },
  en_cours: { label: "En cours", color: "#065F46", bg: "#ECFDF5" },
  termine:  { label: "Terminé",  color: "#1E40AF", bg: "#EFF6FF" },
}

const ENGAGEMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  observateur:  { label: "Observateur",  color: "#64748B", bg: "#F1F5F9" },
  contributeur: { label: "Contributeur", color: "#065F46", bg: "#ECFDF5" },
  co_porteur:   { label: "Co-porteur",   color: "#5B21B6", bg: "#F5F3FF" },
}

interface FormProjet {
  titre: string
  description: string
  thematique: string
  zone_geo: string
  statut: string
  progression: number
  impact_co2: string
  date_debut: string
  date_fin: string
}

const FORM_VIDE: FormProjet = {
  titre: "", description: "", thematique: "", zone_geo: "",
  statut: "planifie", progression: 0, impact_co2: "",
  date_debut: "", date_fin: "",
}

export default function MetierProjets() {
  const [projets, setProjets]               = useState<any[]>([])
  const [participations, setParticipations] = useState<Record<string, any[]>>({})
  const [loading, setLoading]               = useState(true)
  const [showForm, setShowForm]             = useState(false)
  const [editProjet, setEditProjet]         = useState<any>(null)
  const [form, setForm]                     = useState<FormProjet>(FORM_VIDE)
  const [loadingForm, setLoadingForm]       = useState(false)
  const [panelOuvert, setPanelOuvert]       = useState<string | null>(null)
  const [loadingPart, setLoadingPart]       = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    await loadProjets()
    setLoading(false)
  }

  async function loadProjets() {
    const { data } = await supabase.from("projets").select("*").order("created_at", { ascending: false })
    setProjets(data || [])
  }

  async function loadParticipations(projetId: string) {
    if (participations[projetId]) return
    setLoadingPart(true)
    const { data } = await supabase
      .from("participations")
      .select("*, client:client_id(type_client)")
      .eq("projet_id", projetId)
      .order("created_at", { ascending: false })
    setParticipations({ ...participations, [projetId]: data || [] })
    setLoadingPart(false)
  }

  function ouvrirPanel(projetId: string) {
    if (panelOuvert === projetId) { setPanelOuvert(null); return }
    setPanelOuvert(projetId)
    loadParticipations(projetId)
  }

  function ouvrirFormCreation() {
    setEditProjet(null)
    setForm(FORM_VIDE)
    setShowForm(true)
  }

  function ouvrirFormEdition(p: any) {
    setEditProjet(p)
    setForm({
      titre:       p.titre || "",
      description: p.description || "",
      thematique:  p.thematique || "",
      zone_geo:    p.zone_geo || "",
      statut:      p.statut || "planifie",
      progression: p.progression || 0,
      impact_co2:  p.impact_co2?.toString() || "",
      date_debut:  p.date_debut || "",
      date_fin:    p.date_fin || "",
    })
    setShowForm(true)
  }

  async function handleSauvegarder() {
    if (!form.titre || !form.thematique) return
    setLoadingForm(true)
    const payload = {
      titre:       form.titre,
      description: form.description || null,
      thematique:  form.thematique,
      zone_geo:    form.zone_geo || null,
      statut:      form.statut,
      progression: form.progression,
      impact_co2:  form.impact_co2 ? parseFloat(form.impact_co2) : null,
      date_debut:  form.date_debut || null,
      date_fin:    form.date_fin || null,
    }
    if (editProjet) {
      await supabase.from("projets").update(payload).eq("id", editProjet.id)
    } else {
      await supabase.from("projets").insert({ ...payload, porteur: "AGE Climate" })
    }
    await loadProjets()
    setShowForm(false)
    setEditProjet(null)
    setForm(FORM_VIDE)
    setLoadingForm(false)
  }

  async function handleSupprimerProjet(id: string) {
    if (!confirm("Supprimer ce projet ? Les participations associées seront également supprimées.")) return
    await supabase.from("projets").delete().eq("id", id)
    setProjets(projets.filter(p => p.id !== id))
    if (panelOuvert === id) setPanelOuvert(null)
  }

  function formatDate(iso: string) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0",
    borderRadius: "7px", fontSize: "13px", color: "#0F172A",
    background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  }

  const lStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8",
    marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.07em",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{projets.length}</span> projet{projets.length > 1 ? "s" : ""}
          {" · "}
          <span style={{ color: "#0F6E56", fontWeight: 500 }}>{projets.filter(p => p.publie).length}</span> publié{projets.filter(p => p.publie).length > 1 ? "s" : ""}
        </div>
        <button onClick={ouvrirFormCreation} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouveau projet
        </button>
      </div>

      {/* Formulaire création / édition */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>
            {editProjet ? "Modifier le projet" : "Nouveau projet"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lStyle}>Titre *</label>
              <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex : Plan de prévention inondation Adour" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Thématique *</label>
              <select value={form.thematique} onChange={e => setForm({ ...form, thematique: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                <option value="">Choisir…</option>
                {Object.entries(THEMATIQUE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lStyle}>Zone géographique</label>
              <input value={form.zone_geo} onChange={e => setForm({ ...form, zone_geo: e.target.value })} placeholder="Ex : Nouvelle-Aquitaine" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Statut</label>
              <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lStyle}>Progression (%)</label>
              <input type="number" min={0} max={100} value={form.progression} onChange={e => setForm({ ...form, progression: parseInt(e.target.value) || 0 })} style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Impact CO₂ (tonnes)</label>
              <input type="number" value={form.impact_co2} onChange={e => setForm({ ...form, impact_co2: e.target.value })} placeholder="Ex : 120" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date de début</label>
              <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date de fin</label>
              <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={iStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lStyle}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Objectifs, périmètre, modalités…" style={{ ...iStyle, resize: "vertical" as const }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(false); setEditProjet(null); setForm(FORM_VIDE) }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={handleSauvegarder} disabled={!form.titre || !form.thematique || loadingForm} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: form.titre && form.thematique ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "13px", fontWeight: 500, cursor: form.titre && form.thematique ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: loadingForm ? 0.7 : 1 }}>
              <i className="ti ti-send" style={{ fontSize: "14px" }} aria-hidden="true" />
              {loadingForm ? "Sauvegarde…" : editProjet ? "Mettre à jour" : "Publier le projet"}
            </button>
          </div>
        </div>
      )}

      {/* Tableau projets */}
      {projets.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucun projet</div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>Créez votre premier projet pour le publier côté client</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["Projet", "Thématique", "Statut", "Progression", "Participants", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", width: i === 0 ? "28%" : i === 3 ? "14%" : i === 4 ? "10%" : i === 5 ? "22%" : "13%" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projets.map(p => {
                const thematique   = THEMATIQUE_CONFIG[p.thematique] || { label: p.thematique, color: "#64748B", bg: "#F1F5F9", icon: "ti-clipboard-list" }
                const statut       = STATUT_CONFIG[p.statut] || STATUT_CONFIG.planifie
                const progColor    = Number(p.progression) >= 80 ? "#0F6E56" : Number(p.progression) >= 40 ? "#D97706" : "#94A3B8"
                const nbParts      = participations[p.id]?.length ?? "—"
                const panelVisible = panelOuvert === p.id

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                      onMouseLeave={e => (e.currentTarget.style.background = "white")}
                      style={{ borderBottom: panelVisible ? "none" : "1px solid #F1F5F9", transition: "background 0.1s", opacity: p.statut === "termine" ? 0.75 : 1 }}>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{p.titre}</div>
                        <div style={{ fontSize: "11px", color: "#94A3B8", display: "flex", alignItems: "center", gap: "4px" }}>
                          {p.zone_geo && <><i className="ti ti-map-pin" style={{ fontSize: "11px" }} aria-hidden="true" />{p.zone_geo}</>}
                          {p.impact_co2 && <span style={{ marginLeft: "4px" }}>· {p.impact_co2} t CO₂</span>}
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: thematique.bg, color: thematique.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{thematique.label}</span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, background: "#F1F5F9", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                            <div style={{ background: progColor, width: `${p.progression}%`, height: "100%", borderRadius: "3px" }} />
                          </div>
                          <span style={{ fontSize: "11px", color: progColor, fontWeight: 500, fontFamily: "'DM Mono', monospace", minWidth: "28px" }}>{p.progression} %</span>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>
                          <i className="ti ti-users" style={{ fontSize: "14px", color: "#0F6E56" }} aria-hidden="true" />
                          {nbParts}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button onClick={() => ouvrirFormEdition(p)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                            <i className="ti ti-edit" style={{ fontSize: "12px" }} aria-hidden="true" /> Modifier
                          </button>
                          <button onClick={() => ouvrirPanel(p.id)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: `1px solid ${panelVisible ? "#0F6E56" : "#A7F3D0"}`, background: panelVisible ? "#0F6E56" : "#ECFDF5", color: panelVisible ? "white" : "#065F46", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-users" style={{ fontSize: "12px" }} aria-hidden="true" /> Participants
                          </button>
                          <button onClick={() => handleSupprimerProjet(p.id)} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#FEE2E2")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#FEF2F2")}>
                            <i className="ti ti-trash" style={{ fontSize: "12px" }} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Panel participants */}
                    {panelVisible && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid #F1F5F9" }}>
                          <div style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0", padding: "16px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                              <i className="ti ti-users" style={{ fontSize: "14px", color: "#0F6E56" }} aria-hidden="true" />
                              Participants — {p.titre}
                            </div>
                            {loadingPart ? (
                              <div style={{ fontSize: "13px", color: "#64748B" }}>Chargement…</div>
                            ) : !participations[p.id] || participations[p.id].length === 0 ? (
                              <div style={{ fontSize: "13px", color: "#94A3B8", padding: "12px 0" }}>Aucune participation pour ce projet</div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse", background: "#FFFFFF", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                                <thead>
                                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                                    {["Client", "Engagement", "Contribution", "Message", "Date"].map((h, i) => (
                                      <th key={i} style={{ padding: "8px 14px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {participations[p.id].map((part, i) => {
                                    const eng = ENGAGEMENT_CONFIG[part.niveau_engagement] || ENGAGEMENT_CONFIG.observateur
                                    return (
                                      <tr key={part.id} style={{ borderBottom: i < participations[p.id].length - 1 ? "1px solid #F1F5F9" : "none" }}>
                                        <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
                                          {(part.client as any)?.type_client || part.client_id?.slice(0, 8) || "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px" }}>
                                          <span style={{ background: eng.bg, color: eng.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{eng.label}</span>
                                        </td>
                                        <td style={{ padding: "10px 14px", fontSize: "12px", color: "#64748B" }}>
                                          {Array.isArray(part.types_contribution) && part.types_contribution.length > 0
                                            ? part.types_contribution.join(", ")
                                            : "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px", fontSize: "12px", color: "#64748B", maxWidth: "200px" }}>
                                          {part.message || "—"}
                                        </td>
                                        <td style={{ padding: "10px 14px", fontSize: "12px", color: "#94A3B8" }}>
                                          {formatDate(part.created_at)}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}