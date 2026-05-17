import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

export default function PartenaireDocuments() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
    setDocuments(data || [])
    setLoading(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  function formatTaille(octets: number) {
    if (!octets) return "—"
    if (octets < 1024) return `${octets} o`
    if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
  }

  if (loading) return <div style={{ color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "13px", color: "#64748B" }}>
        <span style={{ fontWeight: 500, color: "#0F172A" }}>{documents.length}</span> document{documents.length > 1 ? "s" : ""} partagé{documents.length > 1 ? "s" : ""}
      </div>

      {documents.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-file" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucun document</div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>AGE partagera des documents avec vous prochainement</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["Nom", "Catégorie", "Taille", "Date", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < documents.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="ti ti-file" style={{ fontSize: "16px", color: "#0369A1" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{d.nom_fichier || d.nom || "Document"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>{d.categorie || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B", fontFamily: "'DM Mono', monospace" }}>{formatTaille(d.taille_octets)}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#94A3B8" }}>{formatDate(d.created_at)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {d.storage_path && (
                      <button style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#0F6E56", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-download" style={{ fontSize: "13px" }} aria-hidden="true" /> Télécharger
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}