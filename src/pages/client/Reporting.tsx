import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  bilan_ges:     { label: "Bilan GES — Scope 1, 2, 3", icon: "ti-leaf",           color: "#065F46", bg: "#ECFDF5" },
  csrd:          { label: "CSRD / ESRS",                icon: "ti-file-analytics", color: "#92400E", bg: "#FFFBEB" },
  bilan_carbone: { label: "Bilan Carbone",              icon: "ti-chart-pie",      color: "#1E40AF", bg: "#EFF6FF" },
  brown_value:   { label: "Brown Value",                icon: "ti-home",           color: "#B25C2A", bg: "#FDF4EF" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  demande:    { label: "Demandé",    color: "#64748B", bg: "#F1F5F9" },
  en_cours:   { label: "En cours",   color: "#92400E", bg: "#FFFBEB" },
  disponible: { label: "Disponible", color: "#065F46", bg: "#ECFDF5" },
}

export default function ClientReporting() {
  const navigate = useNavigate()
  const [rapports, setRapports]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [formType, setFormType]         = useState("")
  const [formPeriode, setFormPeriode]   = useState("")
  const [formActifId, setFormActifId]   = useState("")
  const [actifs, setActifs]             = useState<any[]>([])
  const [loadingForm, setLoadingForm]   = useState(false)
  const [succesForm, setSuccesForm]     = useState(false)
  const [erreurForm, setErreurForm]     = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: raps }, { data: acts }] = await Promise.all([
      supabase
        .from("rapports_client")
        .select("*, actif:actif_id(nom)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("actifs")
        .select("id, nom")
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
    ])
    setRapports(raps || [])
    setActifs(acts || [])
    setLoading(false)
  }

  async function handleDemander() {
    if (!formType) { setErreurForm("Veuillez choisir un type de rapport."); return }
    setLoadingForm(true); setErreurForm("")
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("rapports_client").insert({
      client_id:    user!.id,
      type_rapport: formType,
      periode:      formPeriode || null,
      actif_id:     formActifId || null,
      statut:       "demande",
    })
    if (error) { setErreurForm("Erreur lors de la demande."); setLoadingForm(false); return }
    setSuccesForm(true)
    setLoadingForm(false)
    setTimeout(() => {
      setSuccesForm(false); setShowForm(false)
      setFormType(""); setFormPeriode(""); setFormActifId("")
      load()
    }, 2500)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const nbDisponibles = rapports.filter(r => r.statut === "disponible").length
  const nbEnCours     = rapports.filter(r => r.statut === "en_cours").length
  const nbDemandes    = rapports.filter(r => r.statut === "demande").length

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour
        </button>
        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Demander un rapport
        </button>
      </div>

      {/* KPIs globaux */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        {[
          { label: "Rapports disponibles",    val: nbDisponibles, color: "#065F46" },
          { label: "En cours de génération",  val: nbEnCours,     color: "#D97706" },
          { label: "Demandes en attente",     val: nbDemandes,    color: "#64748B" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>{k.label}</div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Formulaire de demande */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Nouvelle demande de rapport</div>
          {erreurForm && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#991B1B" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />{erreurForm}
            </div>
          )}
          {succesForm ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px", padding: "14px 16px" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#0F6E56" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 500 }}>Demande enregistrée — AGE Climate vous recontacte sous 48h.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>Type de rapport *</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}>
                  <option value="">Choisir…</option>
                  {Object.entries(TYPE_CONFIG).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>Période</label>
                <input value={formPeriode} onChange={e => setFormPeriode(e.target.value)} placeholder="Ex : 2024, Q1 2025" style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              {actifs.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>Actif concerné</label>
                  <select value={formActifId} onChange={e => setFormActifId(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}>
                    <option value="">Transverse (tous les actifs)</option>
                    {actifs.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => { setShowForm(false); setErreurForm("") }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Annuler</button>
                <button onClick={handleDemander} disabled={loadingForm} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: loadingForm ? "wait" : "pointer", fontFamily: "inherit", opacity: loadingForm ? 0.7 : 1 }}>
                  <i className="ti ti-send" style={{ fontSize: "14px" }} aria-hidden="true" />
                  {loadingForm ? "Envoi…" : "Envoyer la demande"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste rapports */}
      {rapports.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-file-analytics" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucun rapport</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Demandez votre premier rapport réglementaire</div>
          <button onClick={() => setShowForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
            Demander un rapport
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rapports.map(r => {
            const type   = TYPE_CONFIG[r.type_rapport]   || { label: r.type_rapport, icon: "ti-file", color: "#64748B", bg: "#F1F5F9" }
            const statut = STATUT_CONFIG[r.statut]       || STATUT_CONFIG.demande
            const kpis   = r.kpis || {}

            return (
              <div key={r.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "8px", background: type.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${type.icon}`} style={{ fontSize: "20px", color: type.color }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{type.label}</span>
                        <span style={{ background: statut.bg, color: statut.color, fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "4px" }}>{statut.label}</span>
                        {r.periode && <span style={{ background: "#F1F5F9", color: "#64748B", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>{r.periode}</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: r.statut === "disponible" && Object.keys(kpis).length > 0 ? "10px" : "0" }}>
                        {r.statut === "disponible" ? `Généré le ${formatDate(r.updated_at)}` : `Demandé le ${formatDate(r.created_at)}`}
                        {(r.actif as any)?.nom && ` · Actif : ${(r.actif as any).nom}`}
                      </div>

                      {/* KPIs si disponible */}
                      {r.statut === "disponible" && Object.keys(kpis).length > 0 && (
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                          {Object.entries(kpis).map(([k, v]: [string, any]) => (
                            <div key={k} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{v}</div>
                              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Barre de progression si en cours */}
                      {r.statut === "en_cours" && kpis.progression && (
                        <div style={{ marginTop: "8px" }}>
                          <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden", width: "260px", maxWidth: "100%" }}>
                            <div style={{ background: "#D97706", width: `${kpis.progression}%`, height: "100%", borderRadius: "3px" }} />
                          </div>
                          <p style={{ fontSize: "11px", color: "#94A3B8", margin: "4px 0 0" }}>{kpis.progression} % — {kpis.etape || "en cours"}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {r.statut === "disponible" && r.fichier_url && (
                      <a href={r.fichier_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none", background: type.color, color: "white", fontSize: "12px", fontWeight: 500, textDecoration: "none" }}>
                        <i className="ti ti-download" style={{ fontSize: "14px" }} aria-hidden="true" /> PDF
                      </a>
                    )}
                    {r.statut !== "disponible" && (
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#94A3B8", fontSize: "12px", opacity: 0.6 }}>
                        <i className="ti ti-download" style={{ fontSize: "14px" }} aria-hidden="true" /> PDF
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}