import React, { useState, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "../../lib/supabase"

const perfData = [
  { semaine: "S1", reponses: 120, rdv: 80, diagnostics: 45 },
  { semaine: "S2", reponses: 340, rdv: 210, diagnostics: 120 },
  { semaine: "S3", reponses: 520, rdv: 380, diagnostics: 240 },
  { semaine: "S4", reponses: 890, rdv: 530, diagnostics: 395 },
]

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:          { label: "Soumise",          color: "#64748B", bg: "#F1F5F9" },
  en_qualification: { label: "En qualification", color: "#92400E", bg: "#FFFBEB" },
  validee:          { label: "Validée",           color: "#065F46", bg: "#ECFDF5" },
  en_cours:         { label: "En cours",          color: "#0369A1", bg: "#EFF6FF" },
  terminee:         { label: "Terminée",          color: "#475569", bg: "#F1F5F9" },
  termine:          { label: "Terminé",           color: "#475569", bg: "#F1F5F9" },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sensibilisation: { label: "Sensibilisation", color: "#065F46", bg: "#ECFDF5" },
  scoring:         { label: "Scoring",         color: "#1E40AF", bg: "#EFF6FF" },
  pre_diagnostic:  { label: "Pré-diagnostic",  color: "#5B21B6", bg: "#F5F3FF" },
}

type Onglet = "age" | "clients"

interface FormCampagne {
  nom: string
  type_campagne: string
  zone_geo: string
  date_debut: string
  date_fin: string
  description: string
}

export default function Campagnes() {
  const [onglet, setOnglet]         = useState<Onglet>("age")
  const [campagnes, setCampagnes]   = useState<any[]>([])
  const [demandesClient, setDemandesClient] = useState<any[]>([])
  const [selected, setSelected]     = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [form, setForm]             = useState<FormCampagne>({
    nom: "", type_campagne: "", zone_geo: "",
    date_debut: "", date_fin: "", description: "",
  })

  useEffect(() => { init() }, [])

  async function init() {
    await Promise.all([loadCampagnes(), loadDemandesClient()])
    setLoading(false)
  }

  async function loadCampagnes() {
    const { data } = await supabase
      .from("campagnes")
      .select("*")
      .eq("origine", "age")
      .order("date_debut", { ascending: false })
    setCampagnes(data || [])
    if (data && data.length > 0) setSelected(data[0])
  }

  async function loadDemandesClient() {
    const { data } = await supabase
      .from("campagnes")
      .select("*")
      .eq("origine", "client")
      .order("created_at", { ascending: false })
    setDemandesClient(data || [])
  }

  async function handleCreerCampagne() {
    if (!form.nom || !form.type_campagne) return
    setLoadingForm(true)
    const { data } = await supabase.from("campagnes").insert({
      nom:           form.nom,
      type_campagne: form.type_campagne,
      zone_geo:      form.zone_geo || null,
      date_debut:    form.date_debut || null,
      date_fin:      form.date_fin || null,
      description:   form.description || null,
      statut:        "en_cours",
      origine:       "age",
    }).select().single()
    if (data) {
      setCampagnes([data, ...campagnes])
      setSelected(data)
    }
    setForm({ nom: "", type_campagne: "", zone_geo: "", date_debut: "", date_fin: "", description: "" })
    setShowForm(false)
    setLoadingForm(false)
  }

  async function updateStatutDemande(id: string, statut: string) {
    await supabase.from("campagnes").update({ statut }).eq("id", id)
    setDemandesClient(demandesClient.map(d => d.id === id ? { ...d, statut } : d))
  }

  const demandesEnAttente = demandesClient.filter(d => d.statut === "soumise").length

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

      {/* Onglets */}
      <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
        {([
          { key: "age",     label: "Campagnes AGE",    icon: "ti-speakerphone", count: campagnes.length,      badgeBg: "#ECFDF5", badgeColor: "#065F46" },
          { key: "clients", label: "Demandes clients", icon: "ti-users",        count: demandesClient.length, badgeBg: demandesEnAttente > 0 ? "#FEF2F2" : "#ECFDF5", badgeColor: demandesEnAttente > 0 ? "#991B1B" : "#065F46" },
        ] as const).map(o => (
          <button key={o.key} onClick={() => { setOnglet(o.key); setSelected(null); setShowForm(false) }} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: onglet === o.key ? "2px solid #0F6E56" : "2px solid transparent",
            color: onglet === o.key ? "#0F6E56" : "#64748B",
            fontWeight: onglet === o.key ? 600 : 400,
            fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
            marginBottom: "-1px", transition: "color 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
            <span style={{ background: o.badgeBg, color: o.badgeColor, fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "10px", fontFamily: "'DM Mono', monospace" }}>
              {o.key === "clients" && demandesEnAttente > 0 ? demandesEnAttente : o.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── ONGLET CAMPAGNES AGE ── */}
      {onglet === "age" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", color: "#64748B" }}>
              <span style={{ fontWeight: 500, color: "#0F172A" }}>{campagnes.length}</span> campagne{campagnes.length > 1 ? "s" : ""}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
              Nouvelle campagne
            </button>
          </div>

          {/* Formulaire nouvelle campagne AGE */}
          {showForm && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>
                Nouvelle campagne AGE
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lStyle}>Nom de la campagne *</label>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Campagne prévention inondation 2026" style={iStyle} />
                </div>
                <div>
                  <label style={lStyle}>Type de campagne *</label>
                  <select value={form.type_campagne} onChange={e => setForm({ ...form, type_campagne: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                    <option value="">Choisir…</option>
                    <option value="sensibilisation">Sensibilisation</option>
                    <option value="scoring">Scoring</option>
                    <option value="pre_diagnostic">Pré-diagnostic</option>
                  </select>
                </div>
                <div>
                  <label style={lStyle}>Zone géographique</label>
                  <input value={form.zone_geo} onChange={e => setForm({ ...form, zone_geo: e.target.value })} placeholder="Ex : Nouvelle-Aquitaine" style={iStyle} />
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
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                <button onClick={handleCreerCampagne} disabled={!form.nom || !form.type_campagne || loadingForm} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: form.nom && form.type_campagne ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "13px", fontWeight: 500, cursor: form.nom && form.type_campagne ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  <i className="ti ti-rocket" style={{ fontSize: "14px" }} aria-hidden="true" />
                  {loadingForm ? "Création…" : "Lancer la campagne"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px", alignItems: "start" }}>

            {/* Liste campagnes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {campagnes.length === 0 ? (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                  Aucune campagne AGE
                </div>
              ) : campagnes.map(c => {
                const statut = STATUT_CONFIG[c.statut] || STATUT_CONFIG.en_cours
                const type   = TYPE_CONFIG[c.type_campagne]
                const tauxReponse = c.courriers_envoyes > 0 ? Math.round(c.reponses / c.courriers_envoyes * 100) : 0
                const isSelected = selected?.id === c.id
                return (
                  <div key={c.id} onClick={() => setSelected(c)} style={{ background: "#FFFFFF", border: `1px solid ${isSelected ? "#0F6E56" : "#E2E8F0"}`, borderRadius: "10px", padding: "14px 16px", cursor: "pointer", transition: "border-color 0.12s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", flex: 1, paddingRight: "8px" }}>{c.nom}</div>
                      <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, flexShrink: 0 }}>{statut.label}</span>
                    </div>
                    {type && <span style={{ background: type.bg, color: type.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                    <div style={{ fontSize: "12px", color: "#94A3B8", margin: "6px 0 8px" }}>{c.date_debut} → {c.date_fin || "—"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                        <div style={{ background: "#0F6E56", width: `${tauxReponse}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                      <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{tauxReponse} %</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Taux de réponse</div>
                  </div>
                )
              })}
            </div>

            {/* Détail campagne */}
            {selected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                  {[
                    { label: "Courriers envoyés", val: selected.courriers_envoyes, icon: "ti-mail" },
                    { label: "Réponses reçues",   val: selected.reponses,          icon: "ti-mail-opened" },
                    { label: "RDV pris",           val: selected.rdv_pris,          icon: "ti-calendar" },
                    { label: "Diagnostics",        val: selected.diagnostics,       icon: "ti-clipboard-list" },
                  ].map((k, i) => (
                    <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{k.val?.toLocaleString("fr-FR") ?? "—"}</div>
                    </div>
                  ))}
                </div>
                {selected.description && (
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Description</div>
                    <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
                  </div>
                )}
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Performance hebdomadaire</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={perfData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="semaine" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#0F172A", fontWeight: 500 }} />
                      <Area type="monotone" dataKey="reponses" stroke="#0F6E56" fill="#ECFDF5" strokeWidth={2} name="Réponses" />
                      <Area type="monotone" dataKey="rdv" stroke="#0369A1" fill="#EFF6FF" strokeWidth={2} name="RDV" />
                      <Area type="monotone" dataKey="diagnostics" stroke="#D97706" fill="#FFFBEB" strokeWidth={2} name="Diagnostics" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                    {[{ label: "Réponses", color: "#0F6E56" }, { label: "RDV", color: "#0369A1" }, { label: "Diagnostics", color: "#D97706" }].map((l, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                        <span style={{ fontSize: "12px", color: "#64748B" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-download" style={{ fontSize: "15px" }} aria-hidden="true" /> Exporter résultats
                  </button>
                  <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" /> Lancer relance
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                Sélectionnez une campagne pour voir le détail
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ONGLET DEMANDES CLIENTS ── */}
      {onglet === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {demandesEnAttente > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#D97706" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 500 }}>
                {demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente de qualification
              </span>
            </div>
          )}
          {demandesClient.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
              <i className="ti ti-inbox" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune demande client</div>
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>Les demandes de campagne client apparaîtront ici</div>
            </div>
          ) : demandesClient.map(d => {
            const statut = STATUT_CONFIG[d.statut] || STATUT_CONFIG.soumise
            const type   = TYPE_CONFIG[d.type_campagne]
            const estTraitee = ["validee", "en_cours", "terminee"].includes(d.statut)
            return (
              <div key={d.id} style={{ background: "#FFFFFF", border: `1px solid ${d.statut === "soumise" ? "#FDE68A" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", opacity: estTraitee ? 0.75 : 1 }}>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                      {type && <span style={{ background: type.bg, color: type.color, padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>{d.nom || "Campagne sans nom"}</div>
                    {d.zone_geo && <div style={{ fontSize: "12px", color: "#64748B" }}><i className="ti ti-map-pin" style={{ fontSize: "12px" }} aria-hidden="true" /> {d.zone_geo}</div>}
                    {d.description && <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{d.description}</div>}
                  </div>
                  {!estTraitee && (
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {d.statut === "soumise" && (
                        <button onClick={() => updateStatutDemande(d.id, "en_qualification")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-search" style={{ fontSize: "12px" }} aria-hidden="true" /> Qualifier
                        </button>
                      )}
                      <button onClick={() => updateStatutDemande(d.id, "validee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-check" style={{ fontSize: "12px" }} aria-hidden="true" /> Valider
                      </button>
                      <button onClick={() => updateStatutDemande(d.id, "en_cours")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-rocket" style={{ fontSize: "12px" }} aria-hidden="true" /> Lancer
                      </button>
                    </div>
                  )}
                  {estTraitee && <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#0F6E56", flexShrink: 0 }} aria-hidden="true" />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}