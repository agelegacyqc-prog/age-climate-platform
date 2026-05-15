import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:            { label: "Soumise",            color: "#64748B", bg: "#F1F5F9" },
  en_qualification:   { label: "En qualification",   color: "#92400E", bg: "#FFFBEB" },
  entretien_planifie: { label: "Entretien planifié",  color: "#1E40AF", bg: "#EFF6FF" },
  validee:            { label: "Validée",             color: "#065F46", bg: "#ECFDF5" },
  en_cours:           { label: "En cours",            color: "#5B21B6", bg: "#F5F3FF" },
  terminee:           { label: "Terminée",            color: "#065F46", bg: "#ECFDF5" },
}

export default function ClientCampagnes() {
  const navigate = useNavigate()
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from("campagnes")
      .select("*")
      .order("created_at", { ascending: false })
    setCampagnes(data || [])
    setLoading(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
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
          onClick={() => navigate("/marketplace")}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "8px 16px", borderRadius: "7px",
            fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle campagne
        </button>
      </div>

      {/* Statuts */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {Object.entries(STATUT_CONFIG).map(([k, v]) => {
          const nb = campagnes.filter(c => c.statut === k).length
          if (nb === 0) return null
          return (
            <span key={k} style={{ background: v.bg, color: v.color, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
              {v.label} · {nb}
            </span>
          )
        })}
      </div>

      {/* Liste */}
      {campagnes.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-speakerphone" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune campagne</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Lancez votre première campagne de prévention climatique</div>
          <button
            onClick={() => navigate("/marketplace")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "14px" }} />
            Nouvelle campagne
          </button>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["Campagne", "Type", "Statut", "Date", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campagnes.map(c => {
                const statut = STATUT_CONFIG[c.statut] || { label: c.statut || "—", color: "#64748B", bg: "#F1F5F9" }
                return (
                  <tr key={c.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{c.nom || c.titre || `Campagne #${c.id.slice(0, 6)}`}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>{c.type || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: statut.bg, color: statut.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#94A3B8" }}>{c.created_at ? formatDate(c.created_at) : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", color: "#0F6E56", border: "1px solid #A7F3D0", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500, fontFamily: "inherit" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#ECFDF5")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        Voir <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
                      </button>
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