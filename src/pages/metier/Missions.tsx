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

const ORIGINE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  marketplace: { label: "Marketplace", color: "#0369A1", bg: "#EFF6FF" },
  campagne:    { label: "Campagne",    color: "#D97706", bg: "#FFFBEB" },
  patrimoine:  { label: "Patrimoine",  color: "#5B21B6", bg: "#F5F3FF" },
  interne:     { label: "Interne",     color: "#065F46", bg: "#ECFDF5" },
}

const STATUT_MISSION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nouvelle: { label: "Nouvelle", color: "#0369A1", bg: "#EFF6FF" },
  en_cours: { label: "En cours", color: "#065F46", bg: "#ECFDF5" },
  terminee: { label: "Terminée", color: "#475569", bg: "#F1F5F9" },
  annulee:  { label: "Annulée",  color: "#991B1B", bg: "#FEF2F2" },
}

type Onglet = "missions" | "demandes"

export default function Missions() {
  const [onglet, setOnglet]             = useState<Onglet>("missions")
  const [missions, setMissions]         = useState<any[]>([])
  const [demandes, setDemandes]         = useState<any[]>([])
  const [consultants, setConsultants]   = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState<any>(null)
  const [notes, setNotes]               = useState<Record<string, string>>({})
  const [dateEntretien, setDateEntretien] = useState<Record<string, string>>({})
  const [filtreStatut, setFiltreStatut] = useState("tous")
  const [filtreOrigine, setFiltreOrigine] = useState("tous")
  const [userRole, setUserRole]         = useState<string>("")
  const [userId, setUserId]             = useState<string>("")

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single()
      if (profil) setUserRole(profil.role)
    }
    await Promise.all([loadMissions(user?.id), loadDemandes(), loadConsultants()])
    setLoading(false)
  }

  async function loadMissions(uid?: string) {
    const { data: profil } = uid ? await supabase.from("profils").select("role").eq("id", uid).single() : { data: null }
    const query = profil?.role === "admin"
      ? supabase.from("missions").select("*, consultant:consultant_id(prenom, nom)").order("created_at", { ascending: false })
      : supabase.from("missions").select("*, consultant:consultant_id(prenom, nom)").eq("consultant_id", uid).order("created_at", { ascending: false })
    const { data } = await query
    setMissions(data || [])
  }

  async function loadDemandes() {
    const { data } = await supabase
      .from("demandes_marketplace")
      .select("*, actif:actif_id(nom, adresse)")
      .order("created_at", { ascending: false })
    setDemandes(data || [])
  }

  async function loadConsultants() {
    const { data } = await supabase.from("profils").select("id, prenom, nom").eq("role", "consultant")
    setConsultants(data || [])
  }

  async function updatePhase(id: string, phase: number) {
    await supabase.from("missions").update({ phase, updated_at: new Date().toISOString() }).eq("id", id)
    setMissions(missions.map(m => m.id === id ? { ...m, phase } : m))
    if (selected?.id === id) setSelected({ ...selected, phase })
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from("missions").update({ statut, updated_at: new Date().toISOString() }).eq("id", id)
    setMissions(missions.map(m => m.id === id ? { ...m, statut } : m))
    if (selected?.id === id) setSelected({ ...selected, statut })
  }

  async function assignerConsultant(missionId: string, consultantId: string) {
    await supabase.from("missions").update({ consultant_id: consultantId || null }).eq("id", missionId)
    const consultant = consultants.find(c => c.id === consultantId)
    setMissions(missions.map(m => m.id === missionId ? { ...m, consultant_id: consultantId, consultant } : m))
    if (selected?.id === missionId) setSelected({ ...selected, consultant_id: consultantId, consultant })
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

  function estBloquee(m: any) {
    if (m.statut !== "en_cours") return false
    const diff = Date.now() - new Date(m.updated_at || m.created_at).getTime()
    return diff > 5 * 86400000
  }

  const missionsFiltrees = missions.filter(m => {
    if (filtreStatut !== "tous" && m.statut !== filtreStatut) return false
    if (filtreOrigine !== "tous" && (m.origine || "marketplace") !== filtreOrigine) return false
    return true
  })

  const demandesEnAttente = demandes.filter(d => d.statut === "soumise").length
  const missionsBloquees  = missions.filter(m => estBloquee(m)).length

  const iStyle: React.CSSProperties = {
    padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "6px",
    fontSize: "12px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "white",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
        {([
          { key: "missions", label: "Missions",             icon: "ti-briefcase", count: missions.length,  badgeBg: "#ECFDF5", badgeColor: "#065F46" },
          { key: "demandes", label: "Demandes Marketplace", icon: "ti-bell",      count: demandes.length,  badgeBg: demandesEnAttente > 0 ? "#FEF2F2" : "#ECFDF5", badgeColor: demandesEnAttente > 0 ? "#991B1B" : "#065F46" },
        ] as const).map(o => (
          <button key={o.key} onClick={() => { setOnglet(o.key); setSelected(null) }} style={{
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
          {/* Alertes */}
          {missionsBloquees > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#D97706" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 500 }}>
                {missionsBloquees} mission{missionsBloquees > 1 ? "s" : ""} sans activité depuis +5 jours
              </span>
            </div>
          )}

          {/* Filtres */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Statut</span>
              {["tous", "nouvelle", "en_cours", "terminee", "annulee"].map(s => (
                <button key={s} onClick={() => setFiltreStatut(s)} style={{
                  padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                  border: filtreStatut === s ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                  background: filtreStatut === s ? "#ECFDF5" : "white",
                  color: filtreStatut === s ? "#065F46" : "#64748B",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: filtreStatut === s ? 600 : 400,
                }}>
                  {s === "tous" ? "Tous" : STATUT_MISSION_CONFIG[s]?.label || s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Origine</span>
              {["tous", "marketplace", "campagne", "patrimoine", "interne"].map(o => (
                <button key={o} onClick={() => setFiltreOrigine(o)} style={{
                  padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                  border: filtreOrigine === o ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                  background: filtreOrigine === o ? "#ECFDF5" : "white",
                  color: filtreOrigine === o ? "#065F46" : "#64748B",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: filtreOrigine === o ? 600 : 400,
                }}>
                  {o === "tous" ? "Toutes" : ORIGINE_CONFIG[o]?.label || o}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: "auto", fontSize: "13px", color: "#64748B" }}>
              <span style={{ fontWeight: 500, color: "#0F172A" }}>{missionsFiltrees.length}</span> mission{missionsFiltrees.length > 1 ? "s" : ""}
            </div>
          </div>

          {missionsFiltrees.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
              <i className="ti ti-briefcase" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune mission</div>
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>Modifiez les filtres ou attendez de nouvelles demandes.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "320px 1fr" : "1fr", gap: "16px", alignItems: "start" }}>

              {/* Liste missions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {missionsFiltrees.map(m => {
                  const urgence    = URGENCE_CONFIG[m.urgence]
                  const origine    = ORIGINE_CONFIG[m.origine || "marketplace"]
                  const statutConf = STATUT_MISSION_CONFIG[m.statut]
                  const isSelected = selected?.id === m.id
                  const bloquee    = estBloquee(m)
                  const pct        = ((m.phase || 1) / 10) * 100
                  return (
                    <div key={m.id} onClick={() => setSelected(m)} style={{
                      background: "#FFFFFF",
                      border: `1px solid ${isSelected ? "#0F6E56" : bloquee ? "#FDE68A" : "#E2E8F0"}`,
                      borderRadius: "10px", padding: "14px 16px",
                      cursor: "pointer", transition: "border-color 0.12s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, paddingRight: "8px", flexWrap: "wrap" }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{m.societe || "Mission"}</div>
                          <span style={{ background: origine.bg, color: origine.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{origine.label}</span>
                          {bloquee && <span style={{ background: "#FEF2F2", color: "#991B1B", padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>Bloquée</span>}
                        </div>
                        {urgence && <span style={{ background: urgence.bg, color: urgence.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, flexShrink: 0 }}>{urgence.label}</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "2px" }}>{m.type_manager || "—"}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#94A3B8" }}>{m.format_mission || "—"} · {m.secteur || "—"}</div>
                        {statutConf && <span style={{ background: statutConf.bg, color: statutConf.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{statutConf.label}</span>}
                      </div>
                      {m.consultant && (
                        <div style={{ fontSize: "11px", color: "#0F6E56", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <i className="ti ti-user-check" style={{ fontSize: "12px" }} aria-hidden="true" />
                          {(m.consultant as any).prenom} {(m.consultant as any).nom}
                        </div>
                      )}
                      <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden", marginBottom: "4px" }}>
                        <div style={{ background: bloquee ? "#D97706" : "#0F6E56", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>Phase {m.phase || 1}/10 — {phases[(m.phase || 1) - 1]?.label}</div>
                    </div>
                  )
                })}
              </div>

              {/* Détail mission */}
              {selected && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A" }}>{selected.societe}</div>
                        {(() => {
                          const o = ORIGINE_CONFIG[selected.origine || "marketplace"]
                          return <span style={{ background: o.bg, color: o.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{o.label}</span>
                        })()}
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.contact_nom} · {selected.contact_email}</div>
                      {selected.contact_telephone && <div style={{ fontSize: "13px", color: "#64748B" }}>{selected.contact_telephone}</div>}
                    </div>
                    <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: "16px" }}>
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Infos */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                    {[
                      ["Manager", selected.type_manager],
                      ["Format",  selected.format_mission],
                      ["Secteur", selected.secteur],
                      ["Urgence", selected.urgence?.split(" ")[0] || "Standard"],
                    ].map(([k, v], i) => (
                      <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
                        <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{k}</div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {/* Assignation consultant */}
                  {userRole === "admin" && (
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Consultant assigné</div>
                      <select
                        value={selected.consultant_id || ""}
                        onChange={e => assignerConsultant(selected.id, e.target.value)}
                        style={{ ...iStyle, width: "100%" }}
                      >
                        <option value="">— Non assigné —</option>
                        {consultants.map(c => (
                          <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Description */}
                  {selected.description && (
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Description</div>
                      <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
                    </div>
                  )}

                  {/* Workflow */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "10px" }}>Workflow — 10 phases</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {phases.map(p => {
                        const isDone   = selected.phase > p.num
                        const isActive = selected.phase === p.num
                        return (
                          <div key={p.num} onClick={() => updatePhase(selected.id, p.num)} style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "8px 12px", borderRadius: "7px", cursor: "pointer",
                            background: isActive ? "#EFF6FF" : isDone ? "#ECFDF5" : "#F8FAFC",
                            border: isActive ? "1px solid #BFDBFE" : "1px solid transparent",
                            transition: "background 0.12s",
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

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <select value={selected.statut} onChange={e => updateStatut(selected.id, e.target.value)} style={{ flex: 1, ...iStyle }}>
                      {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-message-circle" style={{ fontSize: "15px" }} aria-hidden="true" />
                      Messagerie
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
          ) : demandes.map(d => {
            const statut    = STATUT_DEMANDE_CONFIG[d.statut] || STATUT_DEMANDE_CONFIG.soumise
            const estTraitee = ["validee", "dispatchee", "en_cours", "terminee", "refusee"].includes(d.statut)
            return (
              <div key={d.id} style={{ background: "#FFFFFF", border: `1px solid ${d.statut === "soumise" ? "#FDE68A" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", opacity: estTraitee ? 0.75 : 1 }}>
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
                    {d.description && <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{d.description}</div>}
                  </div>

                  {!estTraitee && (
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {d.statut === "soumise" && (
                        <>
                          <button onClick={() => updateStatutDemande(d.id, "en_qualification")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-search" style={{ fontSize: "13px" }} aria-hidden="true" /> Qualifier
                          </button>
                          <button onClick={() => updateStatutDemande(d.id, "validee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-check" style={{ fontSize: "13px" }} aria-hidden="true" /> Valider
                          </button>
                          <button onClick={() => updateStatutDemande(d.id, "refusee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-x" style={{ fontSize: "13px" }} aria-hidden="true" /> Refuser
                          </button>
                        </>
                      )}
                      {d.statut === "en_qualification" && (
                        <>
                          <button onClick={() => updateStatutDemande(d.id, "entretien_planifie", notes[d.id], dateEntretien[d.id])} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-calendar" style={{ fontSize: "13px" }} aria-hidden="true" /> Entretien
                          </button>
                          <button onClick={() => updateStatutDemande(d.id, "dispatchee", notes[d.id])} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" /> Dispatcher
                          </button>
                          <button onClick={() => updateStatutDemande(d.id, "refusee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-x" style={{ fontSize: "13px" }} aria-hidden="true" /> Refuser
                          </button>
                        </>
                      )}
                      {d.statut === "entretien_planifie" && (
                        <>
                          <button onClick={() => updateStatutDemande(d.id, "validee", notes[d.id])} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-check" style={{ fontSize: "13px" }} aria-hidden="true" /> Valider
                          </button>
                          <button onClick={() => updateStatutDemande(d.id, "refusee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                            <i className="ti ti-x" style={{ fontSize: "13px" }} aria-hidden="true" /> Refuser
                          </button>
                        </>
                      )}
                      {d.statut === "validee" && (
                        <button onClick={() => updateStatutDemande(d.id, "dispatchee", notes[d.id])} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" /> Dispatcher
                        </button>
                      )}
                    </div>
                  )}

                  {estTraitee && (
                    <i className={`ti ${d.statut === "refusee" ? "ti-x" : "ti-circle-check"}`} style={{ fontSize: "20px", color: d.statut === "refusee" ? "#991B1B" : "#0F6E56", flexShrink: 0 }} aria-hidden="true" />
                  )}
                </div>

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
                        <input type="date" value={dateEntretien[d.id] || ""} onChange={e => setDateEntretien({ ...dateEntretien, [d.id]: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "12px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "white" }} title="Date entretien" />
                      )}
                    </div>
                  </div>
                )}

                {d.statut === "entretien_planifie" && d.date_entretien && (
                  <div style={{ padding: "8px 18px", background: "#EFF6FF", borderTop: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="ti ti-calendar" style={{ fontSize: "14px", color: "#1E40AF" }} aria-hidden="true" />
                    <span style={{ fontSize: "12px", color: "#1E40AF", fontWeight: 500 }}>Entretien prévu le {formatDate(d.date_entretien)}</span>
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