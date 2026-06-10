import React, { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

interface Consultant {
  id: string
  prenom: string
  nom: string
  titre: string
  region: string
  bio: string
  competences: string[]
  methodologies: Record<string, { etape: number; titre: string; desc: string }[]>
  disponibilite: string
  missions_actives: number
  photo_url: string | null
}

const COMPETENCE_LABELS: Record<string, string> = {
  csrd: "CSRD", tertiaire: "Décret Tertiaire", bilan_ges: "Bilan GES",
  audit_energetique: "Audit Énergétique", sfdr: "SFDR",
  eu_taxonomy: "EU Taxonomy", bacs: "Décret BACS",
  iso50001: "ISO 50001", ifrs_s2: "IFRS S2", esrs: "ESRS",
}

interface Props {
  alertesRegl: { reglementation: string }[]
}

export default function ConsultantsRecommandes({ alertesRegl }: Props) {
  const [consultants, setConsultants]       = useState<Consultant[]>([])
  const [loading, setLoading]               = useState(true)
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [selected, setSelected]             = useState<Consultant | null>(null)
  const [ongletMethodo, setOngletMethodo]   = useState("")

  // Formulaire RDV
  const [rdvOpen, setRdvOpen]               = useState(false)
  const [rdvMission, setRdvMission]         = useState("")
  const [rdvDate, setRdvDate]               = useState("")
  const [rdvCreneau, setRdvCreneau]         = useState("indifferent")
  const [rdvMessage, setRdvMessage]         = useState("")
  const [rdvLoading, setRdvLoading]         = useState(false)
  const [rdvSuccess, setRdvSuccess]         = useState(false)
  const [rdvError, setRdvError]             = useState("")

  useEffect(() => { chargerConsultants() }, [alertesRegl])

  async function chargerConsultants() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("marketplace_consultants")
        .select("*")
        .eq("is_active", true)
      if (error) throw error

      const competencesRecherchees = alertesRegl.map(a => a.reglementation)
      const sorted = (data || [])
        .map((c: Consultant) => ({
          ...c,
          score: c.competences.filter(comp => competencesRecherchees.includes(comp)).length,
        }))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6)

      setConsultants(sorted)
    } finally {
      setLoading(false)
    }
  }

  function ouvrirDrawer(c: Consultant) {
    setSelected(c)
    const premiereCompetence = c.competences.find(
      comp => alertesRegl.some(a => a.reglementation === comp)
    ) || c.competences[0] || ""
    setOngletMethodo(premiereCompetence)
    setRdvOpen(false)
    setRdvSuccess(false)
    setRdvError("")
    setDrawerOpen(true)
  }

  async function handleDemanderRDV() {
    if (!selected) return
    if (!rdvMission) { setRdvError("Veuillez choisir un type de mission."); return }
    if (!rdvDate)    { setRdvError("Veuillez choisir une date souhaitée."); return }

    setRdvLoading(true)
    setRdvError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const { error } = await supabase.from("demandes_rdv").insert({
        client_id:     user.id,
        consultant_id: selected.id,
        type_mission:  rdvMission,
        date_souhaitee: rdvDate,
        creneau:       rdvCreneau,
        message:       rdvMessage || null,
        statut:        "en_attente",
        lu_admin:      false,
      })
      if (error) throw error

      setRdvSuccess(true)
      setTimeout(() => {
        setDrawerOpen(false)
        setRdvSuccess(false)
        setRdvOpen(false)
        setRdvMission("")
        setRdvDate("")
        setRdvCreneau("indifferent")
        setRdvMessage("")
      }, 2000)
    } catch (err: any) {
      setRdvError(err.message || "Erreur lors de la demande.")
    } finally {
      setRdvLoading(false)
    }
  }

  if (loading) return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "20px" }}>
      <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Chargement des consultants…</div>
    </div>
  )

   
 if (consultants.length === 0) return null

  return (
    <>
      <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>Consultants recommandés</div>
        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "16px" }}>Sélectionnés selon vos alertes réglementaires</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {consultants.map((c) => {
            const matchingComps = c.competences.filter(comp =>
              alertesRegl.some(a => a.reglementation === comp)
            )
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: "white", flexShrink: 0 }}>
                  {c.prenom[0]}{c.nom[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{c.prenom} {c.nom}</div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "4px" }}>{c.titre}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {(matchingComps.length > 0 ? matchingComps : c.competences).slice(0, 6).map(comp => (
                      <span key={comp} style={{ background: "#B25C2A", color: "white", fontSize: "10px", padding: "2px 6px", borderRadius: "3px", fontWeight: 500 }}>
                        {COMPETENCE_LABELS[comp] || comp}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => ouvrirDrawer(c)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "#FFFFFF", color: "#B25C2A", border: "1px solid #B25C2A", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                >
                  <i className="ti ti-eye" style={{ fontSize: "13px" }} />
                  Voir
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && selected && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9998 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", maxWidth: "100vw", background: "#FFFFFF", zIndex: 9999, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>

            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Fiche consultant</div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            {/* Corps */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Profil */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 600, color: "white", flexShrink: 0 }}>
                  {selected.prenom[0]}{selected.nom[0]}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>{selected.prenom} {selected.nom}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>{selected.titre}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                    <i className="ti ti-map-pin" style={{ fontSize: "12px" }} /> {selected.region}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, margin: 0 }}>{selected.bio}</p>

              {/* Compétences */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Compétences</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selected.competences.map(comp => {
                    const isMatch = alertesRegl.some(a => a.reglementation === comp)
                    return (
                      <span key={comp} style={{ background: isMatch ? "#B25C2A" : "#F4F3F0", color: isMatch ? "white" : "#6B7280", fontSize: "11px", padding: "3px 8px", borderRadius: "4px", fontWeight: 500 }}>
                        {COMPETENCE_LABELS[comp] || comp}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Méthodologie */}
              {selected.methodologies && Object.keys(selected.methodologies).length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Méthodologie</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {Object.keys(selected.methodologies).map(comp => (
                      <button key={comp} onClick={() => setOngletMethodo(comp)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${ongletMethodo === comp ? "#B25C2A" : "#E2DDD8"}`, background: ongletMethodo === comp ? "#F9F0EA" : "white", color: ongletMethodo === comp ? "#B25C2A" : "#6B7280" }}>
                        {COMPETENCE_LABELS[comp] || comp}
                      </button>
                    ))}
                  </div>
                  {ongletMethodo && selected.methodologies[ongletMethodo] && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selected.methodologies[ongletMethodo].map((step) => (
                        <div key={step.etape} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0" }}>
                          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "white", fontWeight: 600, flexShrink: 0, marginTop: "1px" }}>
                            {step.etape}
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 500, color: "#111827", marginBottom: "2px" }}>{step.titre}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Disponibilité */}
              <div style={{ padding: "12px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0" }}>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#B25C2A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Disponibilité</div>
                <div style={{ fontSize: "13px", color: "#111827" }}>
                  {selected.disponibilite} · {selected.missions_actives} mission{selected.missions_actives > 1 ? "s" : ""} active{selected.missions_actives > 1 ? "s" : ""}
                </div>
              </div>

              {/* Formulaire RDV */}
              {rdvOpen && !rdvSuccess && (
                <div style={{ borderTop: "1px solid #E2DDD8", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>Demande de rendez-vous</div>

                  {rdvError && (
                    <div style={{ padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "6px", fontSize: "12px", color: "#B91C1C", display: "flex", gap: "6px", alignItems: "center" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: "13px" }} />
                      {rdvError}
                    </div>
                  )}

                  {/* Type de mission */}
                  <div>
                    <label style={labelStyle}>Type de mission <span style={{ color: "#B91C1C" }}>*</span></label>
                    <select className="input" value={rdvMission} onChange={e => setRdvMission(e.target.value)}>
                      <option value="">Choisir…</option>
                      {selected.competences.map(comp => (
                        <option key={comp} value={comp}>{COMPETENCE_LABELS[comp] || comp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date souhaitée */}
                  <div>
                    <label style={labelStyle}>Date souhaitée <span style={{ color: "#B91C1C" }}>*</span></label>
                    <input
                      type="date"
                      className="input"
                      value={rdvDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => setRdvDate(e.target.value)}
                    />
                  </div>

                  {/* Créneau */}
                  <div>
                    <label style={labelStyle}>Créneau préféré</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {[
                        { value: "matin", label: "Matin" },
                        { value: "apres_midi", label: "Après-midi" },
                        { value: "indifferent", label: "Indifférent" },
                      ].map(cr => (
                        <label key={cr.value} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", border: `1px solid ${rdvCreneau === cr.value ? "#B25C2A" : "#E2DDD8"}`, background: rdvCreneau === cr.value ? "#F9F0EA" : "white", fontSize: "12px", color: rdvCreneau === cr.value ? "#B25C2A" : "#374151" }}>
                          <input type="radio" name="creneau" value={cr.value} checked={rdvCreneau === cr.value} onChange={() => setRdvCreneau(cr.value)} style={{ accentColor: "#B25C2A" }} />
                          {cr.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Message (optionnel)</label>
                    <textarea
  style={{ height: "80px", resize: "none", paddingTop: "8px", width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "14px", fontFamily: "Inter, sans-serif", color: "#111827", background: "white", outline: "none", boxSizing: "border-box" as const }}
                      placeholder="Décrivez brièvement votre besoin…"
                      value={rdvMessage}
                      onChange={e => setRdvMessage(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Succès */}
              {rdvSuccess && (
                <div style={{ padding: "14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#2F7D5C" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#2F7D5C" }}>Demande envoyée</div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>L'équipe AGE vous recontacte sous 48h.</div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              {!rdvOpen && !rdvSuccess && (
                <button
                  onClick={() => setRdvOpen(true)}
                  style={{ flex: 1, padding: "10px", background: "#B25C2A", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <i className="ti ti-calendar-plus" style={{ fontSize: "14px" }} />
                  Demander un RDV
                </button>
              )}
              {rdvOpen && !rdvSuccess && (
                <>
                  <button
                    onClick={() => { setRdvOpen(false); setRdvError("") }}
                    style={{ flex: 1, padding: "10px", background: "transparent", color: "#6B7280", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDemanderRDV}
                    disabled={rdvLoading}
                    style={{ flex: 2, padding: "10px", background: "#B25C2A", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    {rdvLoading
                      ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Envoi…</>
                      : <><i className="ti ti-send" style={{ fontSize: "14px" }} /> Confirmer la demande</>
                    }
                  </button>
                </>
              )}
            </div>

          </div>
        </>
      )}
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
}