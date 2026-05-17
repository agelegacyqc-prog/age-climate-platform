import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const phases = [
  { num: 1,  label: "Initialisation",    icon: "ti-rocket" },
  { num: 2,  label: "Qualification",      icon: "ti-search" },
  { num: 3,  label: "Sélection managers", icon: "ti-users" },
  { num: 4,  label: "Proposition",        icon: "ti-file-text" },
  { num: 5,  label: "Onboarding",         icon: "ti-briefcase" },
  { num: 6,  label: "Exécution",          icon: "ti-tool" },
  { num: 7,  label: "Suivi & pilotage",   icon: "ti-chart-bar" },
  { num: 8,  label: "Livrables",          icon: "ti-package" },
  { num: 9,  label: "Facturation",        icon: "ti-coin" },
  { num: 10, label: "Capitalisation",     icon: "ti-star" },
]

const URGENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Standard (4-6 semaines)":   { label: "Standard",    color: "#065F46", bg: "#ECFDF5" },
  "Urgent (2-3 semaines)":     { label: "Urgent",      color: "#92400E", bg: "#FFFBEB" },
  "Très urgent (< 1 semaine)": { label: "Très urgent", color: "#991B1B", bg: "#FEF2F2" },
}

const STATUT_OPTIONS = [
  { value: "nouvelle", label: "Nouvelle" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee",  label: "Annulée" },
]

const STATUT_DEMANDE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:            { label: "Soumise",            color: "#64748B", bg: "#F1F5F9" },
  en_qualification:   { label: "En qualification",   color: "#92400E", bg: "#FFFBEB" },
  entretien_planifie: { label: "Entretien planifié",  color: "#1E40AF", bg: "#EFF6FF" },
  validee:            { label: "Validée",             color: "#065F46", bg: "#ECFDF5" },
  dispatchee:         { label: "Dispatchée",          color: "#0369A1", bg: "#EFF6FF" },
  en_cours:           { label: "En cours",            color: "#5B21B6", bg: "#F5F3FF" },
  terminee:           { label: "Terminée",            color: "#065F46", bg: "#ECFDF5" },
  refusee:            { label: "Refusée",             color: "#991B1B", bg: "#FEF2F2" },
}

type Onglet = "missions" | "demandes"

export default function Missions() {
  const [onglet, setOnglet]       = useState<Onglet>("missions")
  const [missions, setMissions]   = useState<any[]>([])
  const [demandes, setDemandes]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<any>(null)
  const [notes, setNotes]         = useState<Record<string, string>>({})
  const [dateEntretien, setDateEntretien] = useState<Record<string, string>>({})

  useEffect(() => { init() }, [])

  async function init() {
    await Promise.all([loadMissions(), loadDemandes()])
    setLoading(false)
  }

  async function loadMissions() {
    const { data } = await supabase.from("missions").select("*").order("created_at", { ascending: false })
    setMissions(data || [])
  }

  async function loadDemandes() {
    const { data } = await supabase
      .from("demandes_marketplace")
      .select("*, actif:actif_id(nom, adresse)")
      .order("created_at", { ascending: false })
    setDemandes(data || [])
  }

  async function updatePhase(id: string, phase: number) {
    await supabase.from("missions").update({ phase }).eq("id", id)
    setMissions(missions.map(m => m.id === id ? { ...m, phase } : m))
    if (selected?.id === id) setSelected({ ...selected, phase })
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from("missions").update({ statut }).eq("id", id)
    setMissions(missions.map(m => m.id === id ? { ...m, statut } : m))
    if (selected?.id === id) setSelected({ ...selected, statut })
  }

  async function updateStatutDemande(id: string, statut: string, note?: string, date?: string) {
    const update: any = { statut }
    if (note) update.note_age = note
    if (date) update.date_entretien = date
    await supabase.from("demandes_marketplace").update(update).eq("id", id)
    setDemandes(demandes.map(d => d.id === id ? { ...d, ...update } : d))
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function tempsEcoule(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return "il y a moins d'1h"
    if (h < 24) return `il y a ${h}h`
    const j = Math.floor(h / 24)
    if (j === 1) return "hier"
    return `il y a ${j} jours`
  }

  const demandesEnAttente = demandes.filter(d => d.statut === "soumise").length

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
        {([
          { key: "missions", label: "Missions",             icon: "ti-briefcase",      count: missions.length,      badgeBg: "#ECFDF5", badgeColor: "#065F46" },
          { key: "demandes", label: "Demandes Marketplace", icon: "ti-bell",            count: demandes.length,      badgeBg: demandesEnAttente > 0 ? "#FEF2F2" : "#ECFDF5", badgeColor: demandesEnAttente > 0 ? "#991B1B" : "#065F46" },
        ] as const).map(o => (
          <button
            key={o.key}
            onClick={() => { setOnglet(o.key); setSelected(null) }}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "10px 20px", background: "transparent", border: "none",
              borderBottom: onglet === o.key ? "2px solid #0F6E56" : "2px solid transparent",
              color: onglet === o.key ? "#0F6E56" : "#64748B",
              fontWeight: onglet === o.key ? 600 : 400,
              fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
              marginBottom: "-1px", transition: "color 0.12s",
            }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px", color: o.key === "demandes" && demandesEnAttente > 0 ? "#D97706" : "inherit" }} aria-hidden="true" />
            {o.label}
            <span style={{ background: o.badgeBg, color: o.badgeColor, fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "10px", fontFamily: "'DM Mono', monospace" }}>
              {o.key === "demandes" && demandesEnAttente > 0 ? demandesEnAttente : o.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── ONGLET MISSIONS ── */}
      {onglet === "missions" && (
        <>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            <span style={{ fontWeight: 500, color: "#0F172A" }}>{missions.length}</span> mission{missions.length > 1 ? "s" : ""} reçue{missions.length > 1 ? "s" : ""}
          </div>

          {missions.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <i className="ti ti-briefcase" style={{ fontSize: "24px", color: "#0F6E56" }} aria-hidden="true" />
              </div>
              <div style={{ fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune mission</div>
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>Les demandes de la Marketplace apparaîtront ici.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "320px 1fr" : "1fr", gap: "16px", alignItems: "start" }}>

              {/* Liste missions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {missions.map(m => {
                  const urgence = URGENCE_CONFIG[m.urgence]
                  const isSelected = selected?.id === m.id
                  const pct = ((m.phase || 1) / 10) * 100
                  return (
                    <div key={m.id} onClick={() => setSelected(m)} style={{
                      background: "#FFFFFF", border: `1px solid ${isSelected ? "#0F6E56" : "#E2E8F0"}`,
                      borderRadius: "10px", padding: "14px 16px", cursor: "pointer", transition: "border-color 0.12s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", flex: 1, paddingRight: "8px" }}>{m.societe}</div>
                        {urgence && <span style={{ background: urgence.bg, color: urgence.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, flexShrink: 0 }}>{urgence.label}</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>{m.type_manager}</div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "10px" }}>{m.format_mission} · {m.secteur}</div>
                      <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden", marginBottom: "4px" }}>
                        <div style={{ background: "#0F6E56", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>Phase {m.phase || 1}/10 — {phases[(m.phase || 1) - 1]?.label}</div>
                    </div>
                  )
                })}
              </div>

              {/* Détail mission */}
              {selected && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{selected.societe}</div>
                      <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.contact_nom} · {selected.contact_email}</div>
                      {selected.contact_telephone && <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.contact_telephone}</div>}
                    </div>
                    <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: "16px" }}>
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                    {[["Manager", selected.type_manager], ["Format", selected.format_mission], ["Secteur", selected.secteur], ["Urgence", selected.urgence?.split(" ")[0] || "Standard"]].map(([k, v], i) => (
                      <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
                        <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{k}</div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v || "—"}</div>
                      </div>
                    ))}
                  </div>
                  {selected.description && (
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px" }}>
                      <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Description</div>
                      <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
                    </div>
                  )}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>Workflow — 10 phases</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {phases.map(p => {
                        const isDone = selected.phase > p.num
                        const isActive = selected.phase === p.num
                        return (
                          <div key={p.num} onClick={() => updatePhase(selected.id, p.num)} style={{
                            display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "7px", cursor: "pointer",
                            background: isActive ? "#EFF6FF" : isDone ? "#ECFDF5" : "#F8FAFC",
                            border: isActive ? "1px solid #BFDBFE" : "1px solid transparent", transition: "background 0.12s",
                          }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#E2E8F0", color: isDone || isActive ? "white" : "#94A3B8", fontSize: isDone ? "12px" : "11px", fontWeight: 700 }}>
                              {isDone ? <i className="ti ti-check" aria-hidden="true" /> : p.num}
                            </div>
                            <i className={`ti ${p.icon}`} style={{ fontSize: "14px", color: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#94A3B8" }} aria-hidden="true" />
                            <span style={{ fontSize: "13px", color: isDone ? "#065F46" : isActive ? "#1E40AF" : "#64748B", fontWeight: isActive ? 500 : 400 }}>{p.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <select value={selected.statut} onChange={e => updateStatut(selected.id, e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "white" }}>
                      {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                      Contacter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── ONGLET DEMANDES MARKETPLACE ── */}
      {onglet === "demandes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Bandeau alerte */}
          {demandesEnAttente > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#D97706" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 500 }}>
                {demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente de qualification — action requise
              </span>
            </div>
          )}

          {demandes.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
              <i className="ti ti-inbox" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune demande</div>
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>Les demandes Marketplace apparaîtront ici</div>
            </div>
          ) : (
            demandes.map(d => {
              const statut = STATUT_DEMANDE_CONFIG[d.statut] || STATUT_DEMANDE_CONFIG.soumise
              const estTraitee = ["validee", "dispatchee", "en_cours", "terminee", "refusee"].includes(d.statut)
              return (
                <div key={d.id} style={{ background: "#FFFFFF", border: `1px solid ${d.statut === "soumise" ? "#FDE68A" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", opacity: estTraitee ? 0.75 : 1, transition: "opacity 0.12s" }}>

                  {/* En-tête carte */}
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{d.created_at ? tempsEcoule(d.created_at) : "—"}</span>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>{d.type_prestation || "Demande de prestation"}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        {d.note_age && <span>{d.note_age}</span>}
                        {(d.actif as any)?.nom && <span> · {(d.actif as any).nom}</span>}
                      </div>
                      {d.description && (
                        <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{d.description}</div>
                      )}
                    </div>

                    {/* Actions selon statut */}
                    {!estTraitee && (
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {d.statut === "soumise" && (
                          <>
                            <button
                              onClick={() => updateStatutDemande(d.id, "en_qualification")}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-search" style={{ fontSize: "13px" }} aria-hidden="true" /> Qualifier
                            </button>
                            <button
                              onClick={() => updateStatutDemande(d.id, "validee")}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-check" style={{ fontSize: "13px" }} aria-hidden="true" /> Valider
                            </button>
                            <button
                              onClick={() => updateStatutDemande(d.id, "refusee")}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-x" style={{ fontSize: "13px" }} aria-hidden="true" /> Refuser
                            </button>
                          </>
                        )}
                        {d.statut === "en_qualification" && (
                          <>
                            <button
                              onClick={() => updateStatutDemande(d.id, "entretien_planifie", notes[d.id], dateEntretien[d.id])}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-calendar" style={{ fontSize: "13px" }} aria-hidden="true" /> Entretien
                            </button>
                            <button
                              onClick={() => updateStatutDemande(d.id, "dispatchee", notes[d.id])}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" /> Dispatcher
                            </button>
                            <button
                              onClick={() => updateStatutDemande(d.id, "refusee")}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-x" style={{ fontSize: "13px" }} aria-hidden="true" /> Refuser
                            </button>
                          </>
                        )}
                        {d.statut === "entretien_planifie" && (
                          <>
                            <button
                              onClick={() => updateStatutDemande(d.id, "validee", notes[d.id])}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-check" style={{ fontSize: "13px" }} aria-hidden="true" /> Valider
                            </button>
                            <button
                              onClick={() => updateStatutDemande(d.id, "refusee")}
                              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className="ti ti-x" style={{ fontSize: "13px" }} aria-hidden="true" /> Refuser
                            </button>
                          </>
                        )}
                        {d.statut === "validee" && (
                          <button
                            onClick={() => updateStatutDemande(d.id, "dispatchee", notes[d.id])}
                            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" /> Dispatcher
                          </button>
                        )}
                      </div>
                    )}

                    {/* Icône terminée */}
                    {estTraitee && (
                      <i className={`ti ${d.statut === "refusee" ? "ti-x" : "ti-circle-check"}`} style={{ fontSize: "20px", color: d.statut === "refusee" ? "#991B1B" : "#0F6E56", flexShrink: 0 }} aria-hidden="true" />
                    )}
                  </div>

                  {/* Zone note AGE — uniquement si en qualification ou entretien */}
                  {["en_qualification", "entretien_planifie"].includes(d.statut) && (
                    <div style={{ padding: "10px 18px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Note AGE</div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          placeholder="Ajouter une note de qualification…"
                          value={notes[d.id] || d.note_age || ""}
                          onChange={e => setNotes({ ...notes, [d.id]: e.target.value })}
                          style={{ flex: 1, padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "12px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "white" }}
                        />
                        {d.statut === "en_qualification" && (
                          <input
                            type="date"
                            value={dateEntretien[d.id] || ""}
                            onChange={e => setDateEntretien({ ...dateEntretien, [d.id]: e.target.value })}
                            style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "12px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "white" }}
                            title="Date entretien"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date entretien planifié */}
                  {d.statut === "entretien_planifie" && d.date_entretien && (
                    <div style={{ padding: "8px 18px", background: "#EFF6FF", borderTop: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="ti ti-calendar" style={{ fontSize: "14px", color: "#1E40AF" }} aria-hidden="true" />
                      <span style={{ fontSize: "12px", color: "#1E40AF", fontWeight: 500 }}>Entretien prévu le {formatDate(d.date_entretien)}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}