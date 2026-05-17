import React, { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

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

const NIVEAUX_ENGAGEMENT = [
  { value: "observateur",  label: "Observateur",  desc: "Suivre l'avancement du projet" },
  { value: "contributeur", label: "Contributeur", desc: "Apporter des données ou une expertise" },
  { value: "co_porteur",   label: "Co-porteur",   desc: "Participer activement au pilotage" },
]

const TYPES_CONTRIBUTION = [
  { value: "donnees",       label: "Données",       icon: "ti-database" },
  { value: "financement",   label: "Financement",   icon: "ti-coin" },
  { value: "expertise",     label: "Expertise",     icon: "ti-bulb" },
  { value: "communication", label: "Communication", icon: "ti-speakerphone" },
]

const FILTRES_THEMATIQUE = [
  { id: "tous",                  label: "Tous",                   icon: "ti-layout-grid" },
  { id: "prevention_inondation", label: "Prévention inondation",  icon: "ti-ripple" },
  { id: "resilience_batiments",  label: "Résilience bâtiments",   icon: "ti-building" },
  { id: "decarbonation",         label: "Décarbonation",          icon: "ti-leaf" },
  { id: "sensibilisation",       label: "Sensibilisation",        icon: "ti-school" },
  { id: "adaptation_urbaine",    label: "Adaptation urbaine",     icon: "ti-map-pin" },
]

interface Participation {
  projet_id: string
  niveau_engagement: string
  types_contribution: string[]
  message: string
}

export default function Projets() {
  const [projets, setProjets]               = useState<any[]>([])
  const [participations, setParticipations] = useState<Record<string, any>>({})
  const [loading, setLoading]               = useState(true)
  const [userId, setUserId]                 = useState<string | null>(null)
  const [filtreThematique, setFiltreThematique] = useState("tous")
  const [filtreStatut, setFiltreStatut]     = useState("tous")
  const [recherche, setRecherche]           = useState("")
  const [formOuvert, setFormOuvert]         = useState<string | null>(null)
  const [loadingPart, setLoadingPart]       = useState(false)
  const [form, setForm]                     = useState<Participation>({ projet_id: "", niveau_engagement: "observateur", types_contribution: [], message: "" })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
    await Promise.all([loadProjets(), user ? loadParticipations(user.id) : Promise.resolve()])
    setLoading(false)
  }

  async function loadProjets() {
    const { data } = await supabase.from("projets").select("*").eq("publie", true).order("created_at", { ascending: false })
    setProjets(data || [])
  }

  async function loadParticipations(uid: string) {
    const { data } = await supabase.from("participations").select("*").eq("client_id", uid)
    const map: Record<string, any> = {}
    data?.forEach(p => { map[p.projet_id] = p })
    setParticipations(map)
  }

  async function handleParticiper(projetId: string) {
    if (!userId) return
    if (participations[projetId]) {
      await supabase.from("participations").delete().eq("projet_id", projetId).eq("client_id", userId)
      const updated = { ...participations }
      delete updated[projetId]
      setParticipations(updated)
      return
    }
    setForm({ projet_id: projetId, niveau_engagement: "observateur", types_contribution: [], message: "" })
    setFormOuvert(projetId)
  }

  async function handleSoumettre() {
    if (!userId || !form.projet_id) return
    setLoadingPart(true)
    const { data } = await supabase.from("participations").insert({
      projet_id:          form.projet_id,
      client_id:          userId,
      niveau_engagement:  form.niveau_engagement,
      types_contribution: form.types_contribution,
      message:            form.message || null,
    }).select().single()
    if (data) setParticipations({ ...participations, [form.projet_id]: data })
    setFormOuvert(null)
    setLoadingPart(false)
  }

  function toggleContribution(val: string) {
    const arr = form.types_contribution
    setForm({ ...form, types_contribution: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] })
  }

  const projetsFiltres = projets.filter(p => {
    if (filtreThematique !== "tous" && p.thematique !== filtreThematique) return false
    if (filtreStatut !== "tous" && p.statut !== filtreStatut) return false
    if (recherche && !p.titre?.toLowerCase().includes(recherche.toLowerCase()) && !p.zone_geo?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const nbParticipations = Object.keys(participations).length
  const impactTotal = projets
    .filter(p => participations[p.id])
    .reduce((s: number, p: any) => s + (Number(p.impact_co2) || 0), 0)

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0",
    borderRadius: "7px", fontSize: "12px", color: "#0F172A",
    background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Projets actifs",     val: projets.filter(p => p.statut === "en_cours").length, sub: "Sur votre territoire",      icon: "ti-clipboard-list", color: "#0F6E56" },
          { label: "Mes participations", val: nbParticipations,                                     sub: "Intérêts manifestés",       icon: "ti-heart",          color: "#5B21B6" },
          { label: "Impact CO₂",         val: `${impactTotal.toFixed(0)} t`,                       sub: "CO₂ évité sur vos projets", icon: "ti-leaf",           color: "#0369A1" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 30, height: 30, borderRadius: "7px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>{k.val}</div>
            <div style={{ fontSize: "12px", color: "#94A3B8" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtres thématiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
        {FILTRES_THEMATIQUE.map(f => (
          <button key={f.id} onClick={() => setFiltreThematique(f.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
            padding: "10px 6px", borderRadius: "9px",
            border: `1px solid ${filtreThematique === f.id ? "#0F6E56" : "#E2E8F0"}`,
            background: filtreThematique === f.id ? "#ECFDF5" : "#FFFFFF",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
          }}>
            <i className={`ti ${f.icon}`} style={{ fontSize: "18px", color: filtreThematique === f.id ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
            <span style={{ fontSize: "10px", fontWeight: filtreThematique === f.id ? 600 : 400, color: filtreThematique === f.id ? "#065F46" : "#64748B", textAlign: "center", lineHeight: 1.3 }}>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Barre recherche + filtres statut */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un projet ou une zone…" style={{ ...iStyle, paddingLeft: "32px" }} />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["tous", "en_cours", "planifie", "termine"].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)} style={{
              padding: "5px 12px", borderRadius: "6px",
              border: filtreStatut === s ? "1px solid #0F6E56" : "1px solid #E2E8F0",
              background: filtreStatut === s ? "#ECFDF5" : "white",
              color: filtreStatut === s ? "#065F46" : "#64748B",
              fontSize: "12px", fontWeight: filtreStatut === s ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {s === "tous" ? "Tous" : STATUT_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Grille projets */}
      {projetsFiltres.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucun projet trouvé</div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>Modifiez les filtres pour voir plus de projets</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          {projetsFiltres.map(p => {
            const thematique  = THEMATIQUE_CONFIG[p.thematique] || { label: p.thematique, color: "#64748B", bg: "#F1F5F9", icon: "ti-clipboard-list" }
            const statut      = STATUT_CONFIG[p.statut] || STATUT_CONFIG.planifie
            const participe   = !!participations[p.id]
            const formVisible = formOuvert === p.id
            const progColor   = Number(p.progression) >= 80 ? "#0F6E56" : Number(p.progression) >= 40 ? "#D97706" : "#94A3B8"

            return (
              <div key={p.id} style={{ background: "#FFFFFF", border: `1px solid ${participe ? "#A7F3D0" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", opacity: p.statut === "termine" ? 0.75 : 1, transition: "border-color 0.12s" }}>

                <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "8px", background: thematique.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`ti ${thematique.icon}`} style={{ fontSize: "18px", color: thematique.color }} aria-hidden="true" />
                      </div>
                      <span style={{ background: thematique.bg, color: thematique.color, padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 500 }}>{thematique.label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                      {participe && (
                        <span style={{ background: "#ECFDF5", color: "#065F46", fontSize: "10px", fontWeight: 500, padding: "1px 6px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
                          <i className="ti ti-check" style={{ fontSize: "11px" }} aria-hidden="true" /> Je participe
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{p.titre}</div>
                  {p.description && <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", lineHeight: 1.5 }}>{p.description}</div>}
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className="ti ti-map-pin" style={{ fontSize: "12px" }} aria-hidden="true" /> {p.zone_geo || "—"} · {p.porteur || "AGE Climate"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>Progression</span>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: progColor, fontFamily: "'DM Mono', monospace" }}>{p.progression} %</span>
                  </div>
                  <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                    <div style={{ background: progColor, width: `${p.progression}%`, height: "100%", borderRadius: "3px", transition: "width 0.5s" }} />
                  </div>
                </div>

                {/* Mini-formulaire participation */}
                {formVisible && (
                  <div style={{ padding: "16px 18px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Votre participation</div>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "7px" }}>Niveau d'engagement</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {NIVEAUX_ENGAGEMENT.map(n => (
                          <div key={n.value} onClick={() => setForm({ ...form, niveau_engagement: n.value })} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "7px", border: `1px solid ${form.niveau_engagement === n.value ? "#0F6E56" : "#E2E8F0"}`, background: form.niveau_engagement === n.value ? "#ECFDF5" : "white", cursor: "pointer", transition: "all 0.12s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.niveau_engagement === n.value ? "#0F6E56" : "#E2E8F0"}`, background: form.niveau_engagement === n.value ? "#0F6E56" : "white", flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: "12px", fontWeight: 500, color: form.niveau_engagement === n.value ? "#065F46" : "#0F172A" }}>{n.label}</div>
                              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{n.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "7px" }}>Type de contribution</div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {TYPES_CONTRIBUTION.map(t => {
                          const selected = form.types_contribution.includes(t.value)
                          return (
                            <button key={t.value} onClick={() => toggleContribution(t.value)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "6px", border: `1px solid ${selected ? "#0F6E56" : "#E2E8F0"}`, background: selected ? "#ECFDF5" : "white", color: selected ? "#065F46" : "#64748B", fontSize: "12px", fontWeight: selected ? 500 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                              <i className={`ti ${t.icon}`} style={{ fontSize: "13px" }} aria-hidden="true" />
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Message (optionnel)</div>
                      <textarea rows={2} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Précisez votre intérêt ou votre contribution…" style={{ ...iStyle, resize: "vertical" as const }} />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setFormOuvert(null)} style={{ flex: 1, padding: "7px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Annuler</button>
                      <button onClick={handleSoumettre} disabled={loadingPart} style={{ flex: 2, padding: "7px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "12px", fontWeight: 500, cursor: loadingPart ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", opacity: loadingPart ? 0.7 : 1 }}>
                        <i className="ti ti-heart" style={{ fontSize: "13px" }} aria-hidden="true" />
                        {loadingPart ? "Envoi…" : "Confirmer ma participation"}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                    {p.impact_co2 ? `Impact : ${p.impact_co2} t CO₂ évité` : "Impact en cours d'évaluation"}
                  </span>
                  {p.statut !== "termine" && !formVisible && (
                    <button
                      onClick={() => handleParticiper(p.id)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "6px", border: participe ? "1px solid #A7F3D0" : "1px solid #E2E8F0", background: participe ? "#ECFDF5" : "white", color: participe ? "#065F46" : "#64748B", fontSize: "12px", fontWeight: participe ? 500 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}>
                      <i className={`ti ${participe ? "ti-check" : "ti-heart"}`} style={{ fontSize: "13px" }} aria-hidden="true" />
                      {participe ? "Je participe" : "Manifester mon intérêt"}
                    </button>
                  )}
                  {p.statut === "termine" && (
                    <span style={{ fontSize: "12px", color: "#1E40AF", display: "flex", alignItems: "center", gap: "4px" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: "14px" }} aria-hidden="true" /> Projet clôturé
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}