import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:  { label: "Soumise",  color: "#0369A1", bg: "#EFF6FF" },
  validee:  { label: "Validée",  color: "#D97706", bg: "#FFFBEB" },
  payee:    { label: "Payée",    color: "#2F7D5C", bg: "#F0FDF4" },
  refusee:  { label: "Refusée", color: "#B91C1C", bg: "#FEF2F2" },
}

export default function PartenaireFactures() {
  const navigate = useNavigate()
  const [factures, setFactures]         = useState<any[]>([])
  const [missions, setMissions]         = useState<any[]>([])
  const [partenaireId, setPartenaireId] = useState<string>("")
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [uploadingId, setUploadingId]   = useState<string | null>(null)

  // Formulaire
  const [form, setForm] = useState({
    mission_id: "",
    numero: "",
    montant_ht: "",
    tva: "20",
    date_emission: "",
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [formError, setFormError]     = useState("")

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: partenaire } = await supabase
      .from("prestataires_pro")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!partenaire) return
    setPartenaireId(partenaire.id)

    const [{ data: facturesData }, { data: missionsData }] = await Promise.all([
      supabase
        .from("factures_partenaires")
        .select("*, mission:mission_id(societe)")
        .eq("partenaire_id", partenaire.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("missions")
        .select("id, societe")
        .eq("consultant_id", user.id),
    ])

    setFactures(facturesData || [])
    setMissions(missionsData || [])
    setLoading(false)
  }

  async function handleSoumettre() {
    if (!form.mission_id || !form.montant_ht || !form.date_emission) {
      setFormError("Mission, montant et date d'émission sont obligatoires.")
      return
    }
    setFormLoading(true)
    setFormError("")
    try {
      const { error } = await supabase.from("factures_partenaires").insert({
        mission_id:    form.mission_id,
        partenaire_id: partenaireId,
        numero:        form.numero || null,
        montant_ht:    parseFloat(form.montant_ht.replace(",", ".")),
        tva:           parseFloat(form.tva),
        date_emission: form.date_emission,
        statut:        "soumise",
      })
      if (error) throw error
      setFormSuccess(true)
      setForm({ mission_id: "", numero: "", montant_ht: "", tva: "20", date_emission: "" })
      setTimeout(() => {
        setFormSuccess(false)
        setShowForm(false)
        init()
      }, 1500)
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la soumission.")
    } finally {
      setFormLoading(false)
    }
  }

  async function uploadFacture(factureId: string, file: File) {
    setUploadingId(factureId)
    try {
      const path = `factures/${factureId}/${file.name}`
      const { error } = await supabase.storage
        .from("documents-clients")
        .upload(path, file, { upsert: true })
      if (error) throw error

      const { data: urlData } = supabase.storage
        .from("documents-clients")
        .getPublicUrl(path)

      await supabase
        .from("factures_partenaires")
        .update({ fichier_url: urlData.publicUrl, storage_path: path })
        .eq("id", factureId)

      setFactures(prev => prev.map(f =>
        f.id === factureId ? { ...f, fichier_url: urlData.publicUrl } : f
      ))
    } finally {
      setUploadingId(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function formatMontant(ht: number, tva: number) {
    const ttc = ht * (1 + tva / 100)
    return {
      ht: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(ht),
      ttc: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(ttc),
    }
  }

  // KPIs
  const totalHT = factures.filter(f => f.statut !== "refusee").reduce((acc, f) => acc + (f.montant_ht || 0), 0)
  const totalPaye = factures.filter(f => f.statut === "payee").reduce((acc, f) => acc + (f.montant_ht || 0), 0)
  const enAttente = factures.filter(f => f.statut === "soumise" || f.statut === "validee").length

  if (loading) return <div style={{ color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => navigate("/partenaire/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2DDD8", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#6B7280", fontSize: "13px", fontFamily: "inherit" }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          <i className="ti ti-plus" style={{ fontSize: "14px" }} />
          Déposer une facture
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Total facturé HT",   value: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totalHT),   color: "#111827" },
          { label: "Total encaissé HT",  value: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totalPaye), color: "#2F7D5C" },
          { label: "En attente paiement",value: enAttente.toString(),                                                                        color: enAttente > 0 ? "#D97706" : "#6B7280" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "16px" }}>
            Déposer une facture
          </div>

          {formError && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "14px" }} />
              {formError}
            </div>
          )}

          {formSuccess && (
            <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", fontSize: "13px", color: "#2F7D5C", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "14px" }} />
              Facture soumise avec succès
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Mission <span style={{ color: "#B91C1C" }}>*</span></label>
              <select className="input" value={form.mission_id} onChange={e => setForm({ ...form, mission_id: e.target.value })}>
                <option value="">Choisir une mission…</option>
                {missions.map(m => <option key={m.id} value={m.id}>{m.societe || "Mission"}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Numéro de facture</label>
              <input className="input" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Ex : FA-2026-001" />
            </div>
            <div>
              <label style={labelStyle}>Montant HT (€) <span style={{ color: "#B91C1C" }}>*</span></label>
              <input className="input" value={form.montant_ht} onChange={e => setForm({ ...form, montant_ht: e.target.value })} placeholder="Ex : 1500" />
            </div>
            <div>
              <label style={labelStyle}>TVA (%)</label>
              <input className="input" value={form.tva} onChange={e => setForm({ ...form, tva: e.target.value })} placeholder="20" />
            </div>
            <div>
              <label style={labelStyle}>Date d'émission <span style={{ color: "#B91C1C" }}>*</span></label>
              <input type="date" className="input" value={form.date_emission} onChange={e => setForm({ ...form, date_emission: e.target.value })} />
            </div>
            {form.montant_ht && (
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                <div style={{ padding: "10px 12px", background: "#F9F0EA", borderRadius: "8px", fontSize: "12px", color: "#B25C2A", fontWeight: 500 }}>
                  TTC : {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                    parseFloat(form.montant_ht.replace(",", ".") || "0") * (1 + parseFloat(form.tva || "20") / 100)
                  )}
                </div>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowForm(false); setFormError("") }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={handleSoumettre} disabled={formLoading} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#B25C2A", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-send" style={{ fontSize: "14px" }} />
                {formLoading ? "Soumission…" : "Soumettre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {factures.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-coin" style={{ fontSize: "32px", color: "#9CA3AF", display: "block", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "6px" }}>Aucune facture</div>
          <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Déposez votre première facture via le bouton ci-dessus</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                {["Facture", "Mission", "Montant HT", "TTC", "Date", "Statut", ""].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {factures.map((f, i) => {
                const statut = STATUT_CONFIG[f.statut] || STATUT_CONFIG.soumise
                const montants = formatMontant(f.montant_ht || 0, f.tva || 20)
                return (
                  <tr
                    key={f.id}
                    style={{ borderBottom: i < factures.length - 1 ? "1px solid #E2DDD8" : "none", height: "52px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>
                        {f.numero || <span style={{ color: "#9CA3AF" }}>—</span>}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                      {(f.mission as any)?.societe || "—"}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                      {montants.ht}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#6B7280" }}>
                      {montants.ttc}
                    </td>
                    <td style={{ ...tdStyle, color: "#9CA3AF", fontSize: "12px" }}>
                      {f.date_emission ? formatDate(f.date_emission) : "—"}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: statut.bg, color: statut.color, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                        {statut.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                        {f.fichier_url ? (
                          <a
                            href={f.fichier_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "5px", background: "#F0FDF4", color: "#2F7D5C", fontSize: "11px", fontWeight: 500, textDecoration: "none" }}
                          >
                            <i className="ti ti-download" style={{ fontSize: "12px" }} />
                            PDF
                          </a>
                        ) : (
                          <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "5px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "11px", cursor: "pointer" }}>
                            <i className="ti ti-upload" style={{ fontSize: "12px" }} />
                            {uploadingId === f.id ? "Upload…" : "PDF"}
                            <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadFacture(f.id, e.target.files[0]) }} />
                          </label>
                        )}
                        {f.statut === "payee" && (
                          <span style={{ fontSize: "11px", color: "#2F7D5C", display: "flex", alignItems: "center", gap: "3px" }}>
                            <i className="ti ti-circle-check" style={{ fontSize: "12px" }} />
                            {f.date_paiement ? formatDate(f.date_paiement) : "Payée"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6B7280",
  textAlign: "left",
  whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "0 16px",
  fontSize: "14px",
  color: "#111827",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
}