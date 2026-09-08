import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  contact_identifie:   { label: "Contact identifié",   color: "#6B7280", bg: "#F3F4F6" },
  rdv_visio_programme: { label: "RDV visio programmé", color: "#0369A1", bg: "#EFF6FF" },
  rdv_realise:         { label: "RDV réalisé",         color: "#0369A1", bg: "#DBEAFE" },
  contrat_envoye:      { label: "Contrat envoyé",      color: "#8B5E34", bg: "#F5ECE1" },
  contrat_signe:       { label: "Contrat signé",       color: "#2F7D5C", bg: "#F0FDF4" },
  sans_suite:          { label: "Sans suite",          color: "#B91C1C", bg: "#FEF2F2" },
}

interface DemandeDiagnostic {
  id: string
  reference: string
  nom_client: string
  ville_bien: string
  type_demande: "preventif" | "post_desordre"
  statut: string
  commission_due: number | null
  created_at: string
}

export default function PrescripteurMesDemandes() {
  const [demandes, setDemandes] = useState<DemandeDiagnostic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data } = await supabase
      .from("demandes_diagnostic")
      .select("*")
      .order("created_at", { ascending: false })
    setDemandes(data || [])
    setLoading(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function formatEur(v: number) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v)
  }

  if (loading) return <div style={{ color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  const total = demandes.length
  const terminees = demandes.filter(d => d.statut === "contrat_signe" || d.statut === "sans_suite").length
  const gagnees = demandes.filter(d => d.statut === "contrat_signe").length
  const tauxConversion = terminees > 0 ? (gagnees / terminees) * 100 : 0
  const commissionDue = demandes.reduce((s, d) => s + (d.commission_due || 0), 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Mes demandes</div>
        <div style={{ fontSize: "13px", color: "#6B7280" }}>Suivi en temps réel, commission calculée à chaque diagnostic réalisé.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Demandes envoyées", value: total.toString(), color: "#111827" },
          { label: "Taux de conversion", value: `${tauxConversion.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %`, color: "#111827" },
          { label: "Commission due", value: formatEur(commissionDue), color: "#2F7D5C" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {demandes.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-inbox" style={{ fontSize: "32px", color: "#9CA3AF", display: "block", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "6px" }}>Aucune demande</div>
          <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Envoyez votre première demande via l'onglet "Nouvelle demande"</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                {["Client", "Ville", "Type", "Statut", "Date", "Commission"].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demandes.map((d, i) => {
                const statut = STATUT_CONFIG[d.statut] || STATUT_CONFIG.contact_identifie
                return (
                  <tr
                    key={d.id}
                    style={{ borderBottom: i < demandes.length - 1 ? "1px solid #E2DDD8" : "none", height: "52px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>{d.nom_client}</td>
                    <td style={{ ...tdStyle, color: "#6B7280" }}>{d.ville_bien}</td>
                    <td style={{ ...tdStyle, color: "#6B7280" }}>{d.type_demande === "preventif" ? "Préventif" : "Post-désordre"}</td>
                    <td style={tdStyle}>
                      <span style={{ background: statut.bg, color: statut.color, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                        {statut.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#9CA3AF", fontSize: "12px" }}>{formatDate(d.created_at)}</td>
                    <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
                      {d.commission_due !== null ? formatEur(d.commission_due) : "—"}
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

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", textAlign: "left", whiteSpace: "nowrap" }
const tdStyle: React.CSSProperties = { padding: "0 16px", fontSize: "14px", color: "#111827" }