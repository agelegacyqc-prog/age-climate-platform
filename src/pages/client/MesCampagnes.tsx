import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  soumise:          { label: "Soumise",          color: "#64748B", bg: "#F1F5F9", icon: "ti-clock" },
  en_qualification: { label: "En qualification", color: "#92400E", bg: "#FFFBEB", icon: "ti-search" },
  validee:          { label: "Validée",           color: "#065F46", bg: "#ECFDF5", icon: "ti-circle-check" },
  en_cours:         { label: "En cours",          color: "#0369A1", bg: "#EFF6FF", icon: "ti-rocket" },
  terminee:         { label: "Terminée",          color: "#475569", bg: "#F1F5F9", icon: "ti-check" },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sensibilisation: { label: "Sensibilisation", color: "#065F46", bg: "#ECFDF5" },
  scoring:         { label: "Scoring",         color: "#1E40AF", bg: "#EFF6FF" },
  pre_diagnostic:  { label: "Pré-diagnostic",  color: "#5B21B6", bg: "#F5F3FF" },
}

const ETAPES = ["Soumise", "En qualification", "Validée", "En cours", "Terminée"]

interface FormCampagne {
  nom: string
  type_campagne: string
  zone_geo: string
  date_debut: string
  date_fin: string
  description: string
}

export default function MesCampagnes() {
  const [campagnes, setCampagnes]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [etape, setEtape]           = useState(1)
  const [showForm, setShowForm]     = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [succes, setSucces]         = useState(false)
  const [selected, setSelected]     = useState<string | null>(null)
  const [form, setForm]             = useState<FormCampagne>({
    nom: "", type_campagne: "", zone_geo: "", date_debut: "", date_fin: "", description: "",
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("campagnes")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
    setCampagnes(data || [])
    setLoading(false)
  }

  async function handleSoumettre() {
    if (!form.nom || !form.type_campagne) return
    setLoadingForm(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("campagnes").insert({
      nom:           form.nom,
      type_campagne: form.type_campagne,
      zone_geo:      form.zone_geo || null,
      date_debut:    form.date_debut || null,
      date_fin:      form.date_fin || null,
      description:   form.description || null,
      statut:        "soumise",
      origine:       "client",
      client_id:     user?.id || null,
    })
    await load()
    setSucces(true)
    setLoadingForm(false)
  }

  function resetForm() {
    setForm({ nom: "", type_campagne: "", zone_geo: "", date_debut: "", date_fin: "", description: "" })
    setEtape(1)
    setSucces(false)
    setShowForm(false)
  }

  function etapeIndex(statut: string): number {
    const map: Record<string, number> = { soumise: 0, en_qualification: 1, validee: 2, en_cours: 3, terminee: 4 }
    return map[statut] ?? 0
  }

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0",
    borderRadius: "7px", fontSize: "13px", color: "#0F172A",
    background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  }

  const lStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8",
    marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.07em",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{campagnes.length}</span> campagne{campagnes.length > 1 ? "s" : ""}
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEtape(1); setSucces(false) }}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle campagne
        </button>
      </div>

      {/* Formulaire 3 étapes */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px" }}>

          {succes ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "40px", color: "#0F6E56", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Campagne soumise !</div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Notre équipe AGE va qualifier votre demande et vous recontacter sous 48h.</div>
              <button onClick={resetForm} style={{ background: "#0F6E56", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
                Nouvelle campagne
              </button>
            </div>
          ) : (
            <>
              {/* Stepper */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
                {["Périmètre", "Configuration", "Confirmation"].map((e, i) => {
                  const num = i + 1
                  const done = etape > num
                  const active = etape === num
                  return (
                    <React.Fragment key={i}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#0F6E56" : active ? "#ECFDF5" : "#F1F5F9", border: `2px solid ${done ? "#0F6E56" : active ? "#0F6E56" : "#E2E8F0"}`, fontSize: "13px", fontWeight: 600, color: done ? "white" : active ? "#0F6E56" : "#94A3B8" }}>
                          {done ? <i className="ti ti-check" style={{ fontSize: "14px" }} /> : num}
                        </div>
                        <span style={{ fontSize: "11px", color: done || active ? "#0F6E56" : "#94A3B8", fontWeight: done || active ? 600 : 400, whiteSpace: "nowrap" }}>{e}</span>
                      </div>
                      {i < 2 && <div style={{ flex: 1, height: "2px", background: done ? "#0F6E56" : "#E2E8F0", margin: "0 8px 16px" }} />}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Étape 1 — Périmètre */}
              {etape === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={lStyle}>Nom de la campagne *</label>
                    <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Campagne prévention inondation 2026" style={iStyle} />
                  </div>
                  <div>
                    <label style={lStyle}>Type de campagne *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                        <div key={k} onClick={() => setForm({ ...form, type_campagne: k })} style={{ padding: "14px", borderRadius: "9px", border: `1px solid ${form.type_campagne === k ? "#0F6E56" : "#E2E8F0"}`, background: form.type_campagne === k ? "#ECFDF5" : "white", cursor: "pointer", textAlign: "center", transition: "all 0.12s" }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: form.type_campagne === k ? "#065F46" : "#0F172A", marginBottom: "4px" }}>{v.label}</div>
                          <div style={{ fontSize: "11px", color: form.type_campagne === k ? "#0F6E56" : "#94A3B8" }}>
                            {k === "sensibilisation" && "Informer vos clients sur les risques"}
                            {k === "scoring" && "Évaluer l'exposition climatique"}
                            {k === "pre_diagnostic" && "Premier niveau de diagnostic terrain"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", justify: "flex-end", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                    <button onClick={() => setEtape(2)} disabled={!form.nom || !form.type_campagne} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: form.nom && form.type_campagne ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "13px", fontWeight: 500, cursor: form.nom && form.type_campagne ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      Suivant <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 2 — Configuration */}
              {etape === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={lStyle}>Zone géographique</label>
                    <input value={form.zone_geo} onChange={e => setForm({ ...form, zone_geo: e.target.value })} placeholder="Ex : Nouvelle-Aquitaine, Dax, National…" style={iStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={lStyle}>Date de début souhaitée</label>
                      <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={iStyle} />
                    </div>
                    <div>
                      <label style={lStyle}>Date de fin souhaitée</label>
                      <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={iStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={lStyle}>Description & objectifs</label>
                    <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez vos objectifs, le périmètre visé, les contraintes éventuelles…" style={{ ...iStyle, resize: "vertical" as const }} />
                  </div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setEtape(1)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
                    </button>
                    <button onClick={() => setEtape(3)} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      Suivant <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 3 — Confirmation */}
              {etape === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Récapitulatif</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {[
                        { label: "Nom", val: form.nom },
                        { label: "Type", val: TYPE_CONFIG[form.type_campagne]?.label || form.type_campagne },
                        { label: "Zone géographique", val: form.zone_geo || "Non spécifiée" },
                        { label: "Période", val: form.date_debut ? `${form.date_debut} → ${form.date_fin || "—"}` : "Non spécifiée" },
                        { label: "Description", val: form.description || "Aucune" },
                      ].map(({ label, val }, i) => (
                        <div key={i} style={{ display: "flex", gap: "16px" }}>
                          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, minWidth: "140px" }}>{label}</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <i className="ti ti-info-circle" style={{ fontSize: "16px", color: "#0F6E56" }} aria-hidden="true" />
                    <span style={{ fontSize: "13px", color: "#065F46" }}>Votre demande sera transmise à l'équipe AGE qui vous recontactera sous 48h pour qualification.</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setEtape(2)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
                    </button>
                    <button onClick={handleSoumettre} disabled={loadingForm} style={{ padding: "8px 20px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: loadingForm ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", opacity: loadingForm ? 0.7 : 1 }}>
                      <i className="ti ti-send" style={{ fontSize: "14px" }} />
                      {loadingForm ? "Envoi…" : "Soumettre la campagne"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Liste campagnes */}
      {campagnes.length === 0 && !showForm ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-speakerphone" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune campagne</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Lancez votre première campagne de prévention climatique</div>
          <button onClick={() => setShowForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "14px" }} /> Nouvelle campagne
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {campagnes.map(c => {
            const statut = STATUT_CONFIG[c.statut] || STATUT_CONFIG.soumise
            const type   = TYPE_CONFIG[c.type_campagne]
            const etapeIdx = etapeIndex(c.statut)
            const isOpen = selected === c.id
            return (
              <div key={c.id} style={{ background: "#FFFFFF", border: `1px solid ${isOpen ? "#A7F3D0" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.12s" }}>
                <div onClick={() => setSelected(isOpen ? null : c.id)} style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "8px", background: statut.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${statut.icon}`} style={{ fontSize: "17px", color: statut.color }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>{c.nom || "Campagne sans nom"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {type && <span style={{ background: type.bg, color: type.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ background: statut.bg, color: statut.color, padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                    <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #E2E8F0", padding: "20px" }}>
                    {/* Stepper progression */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Progression</div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {ETAPES.map((e, i) => {
                          const done = i < etapeIdx
                          const active = i === etapeIdx
                          return (
                            <React.Fragment key={i}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? "#0F6E56" : active ? "#ECFDF5" : "#F1F5F9", border: `2px solid ${done ? "#0F6E56" : active ? "#0F6E56" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {done ? <i className="ti ti-check" style={{ fontSize: "12px", color: "white" }} /> : <div style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#0F6E56" : "#CBD5E1" }} />}
                                </div>
                                <span style={{ fontSize: "10px", color: done || active ? "#0F6E56" : "#94A3B8", fontWeight: done || active ? 600 : 400, whiteSpace: "nowrap" }}>{e}</span>
                              </div>
                              {i < ETAPES.length - 1 && <div style={{ flex: 1, height: "2px", background: done ? "#0F6E56" : "#E2E8F0", marginBottom: "14px" }} />}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    </div>
                    {/* Infos */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {c.zone_geo && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Zone</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{c.zone_geo}</div>
                        </div>
                      )}
                      {(c.date_debut || c.date_fin) && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Période</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{c.date_debut || "—"} → {c.date_fin || "—"}</div>
                        </div>
                      )}
                      {c.description && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Description</div>
                          <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>{c.description}</div>
                        </div>
                      )}
                    </div>
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