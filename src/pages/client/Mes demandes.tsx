import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  soumise:            { label: "Soumise",            color: "#64748B", bg: "#F1F5F9", icon: "ti-clock" },
  en_qualification:   { label: "En qualification",   color: "#92400E", bg: "#FFFBEB", icon: "ti-search" },
  entretien_planifie: { label: "Entretien planifié",  color: "#1E40AF", bg: "#EFF6FF", icon: "ti-calendar" },
  validee:            { label: "Validée",             color: "#065F46", bg: "#ECFDF5", icon: "ti-circle-check" },
  dispatchee:         { label: "Dispatchée",          color: "#0369A1", bg: "#EFF6FF", icon: "ti-send" },
  en_cours:           { label: "En cours",            color: "#5B21B6", bg: "#F5F3FF", icon: "ti-loader" },
  terminee:           { label: "Terminée",            color: "#065F46", bg: "#ECFDF5", icon: "ti-check" },
  refusee:            { label: "Refusée",             color: "#991B1B", bg: "#FEF2F2", icon: "ti-x" },
}

const ETAPES = ["Soumise", "En qualification", "Validée", "En cours", "Terminée"]

export default function ClientDemandes() {
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("demandes_marketplace")
      .select("*, actif:actif_id(nom, adresse)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
    setDemandes(data || [])
    setLoading(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function etapeIndex(statut: string): number {
    const map: Record<string, number> = {
      soumise: 0, en_qualification: 1, entretien_planifie: 1,
      validee: 2, dispatchee: 2, en_cours: 3, terminee: 4, refusee: -1,
    }
    return map[statut] ?? 0
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{demandes.length}</span> demande{demandes.length > 1 ? "s" : ""}
        </div>
        <button
          onClick={() => navigate("/marketplace")}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "8px 16px", borderRadius: "7px",
            fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle demande
        </button>
      </div>

      {/* Vide */}
      {demandes.length === 0 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune demande</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Déposez une demande de prestation sur la Marketplace</div>
          <button
            onClick={() => navigate("/marketplace")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-building-store" style={{ fontSize: "14px" }} />
            Accéder à la Marketplace
          </button>
        </div>
      )}

      {/* Liste */}
      {demandes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {demandes.map(d => {
            const statut = STATUT_CONFIG[d.statut] || STATUT_CONFIG.soumise
            const etape = etapeIndex(d.statut)
            const isSelected = selected?.id === d.id
            return (
              <div key={d.id} style={{ background: "#FFFFFF", border: `1px solid ${isSelected ? "#A7F3D0" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.12s" }}>

                {/* En-tête carte */}
                <div
                  onClick={() => setSelected(isSelected ? null : d)}
                  style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "8px", background: statut.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${statut.icon}`} style={{ fontSize: "17px", color: statut.color }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{d.type_prestation || "Demande de prestation"}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        {(d.actif as any)?.nom || (d.actif as any)?.adresse || "Actif non spécifié"} · {d.created_at ? formatDate(d.created_at) : "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ background: statut.bg, color: statut.color, padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                    <i className={`ti ${isSelected ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
                  </div>
                </div>

                {/* Détail dépliable */}
                {isSelected && (
                  <div style={{ borderTop: "1px solid #E2E8F0", padding: "20px" }}>

                    {/* Stepper */}
                    {d.statut !== "refusee" && (
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Progression</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                          {ETAPES.map((e, i) => {
                            const done = i < etape
                            const active = i === etape
                            return (
                              <React.Fragment key={i}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: "50%",
                                    background: done ? "#0F6E56" : active ? "#ECFDF5" : "#F1F5F9",
                                    border: `2px solid ${done ? "#0F6E56" : active ? "#0F6E56" : "#E2E8F0"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    {done
                                      ? <i className="ti ti-check" style={{ fontSize: "13px", color: "white" }} />
                                      : <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#0F6E56" : "#CBD5E1" }} />
                                    }
                                  </div>
                                  <span style={{ fontSize: "10px", color: done || active ? "#0F6E56" : "#94A3B8", fontWeight: done || active ? 600 : 400, whiteSpace: "nowrap" }}>{e}</span>
                                </div>
                                {i < ETAPES.length - 1 && (
                                  <div style={{ flex: 1, height: "2px", background: done ? "#0F6E56" : "#E2E8F0", marginBottom: "16px" }} />
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Refusée */}
                    {d.statut === "refusee" && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <i className="ti ti-x" style={{ fontSize: "16px", color: "#991B1B" }} />
                        <span style={{ fontSize: "13px", color: "#991B1B", fontWeight: 500 }}>Demande refusée</span>
                      </div>
                    )}

                    {/* Infos */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Type de prestation</div>
                        <div style={{ fontSize: "13px", color: "#0F172A" }}>{d.type_prestation || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Actif concerné</div>
                        <div style={{ fontSize: "13px", color: "#0F172A" }}>{(d.actif as any)?.nom || (d.actif as any)?.adresse || "—"}</div>
                      </div>
                      {d.description && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Description</div>
                          <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>{d.description}</div>
                        </div>
                      )}
                      {d.note_age && (
                        <div style={{ gridColumn: "1 / -1", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px", padding: "12px 16px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#065F46", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Note AGE</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{d.note_age}</div>
                        </div>
                      )}
                      {d.date_entretien && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Entretien prévu</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{formatDate(d.date_entretien)}</div>
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