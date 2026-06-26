import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import {
  Home, MapPin, Layers, Waves, ChevronRight,
  CheckCircle, AlertTriangle, OctagonX, Clock,
  Wrench, Phone, Search, Filter
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Statut = "a_contacter" | "diagnostic" | "travaux" | "termine"

interface DossierRow {
  id: string
  statut: Statut
  contact_date: string | null
  rdv_date: string | null
  diagnostic_date: string | null
  created_at: string
  bien: {
    id: string
    adresse: string | null
    ville: string | null
    code_postal: string | null
    type_bien: string | null
    score_risque: number | null
    niveau_risque: string | null
    zone_rga: boolean | null
    zone_ppri: boolean | null
    nom_client: string | null
  } | null
}

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<Statut, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  a_contacter: { label: "À contacter", color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE", icon: <Phone size={11} /> },
  diagnostic:  { label: "Diagnostic",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: <Layers size={11} /> },
  travaux:     { label: "Travaux",      color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: <Wrench size={11} /> },
  termine:     { label: "Terminé",      color: "#2F7D5C", bg: "#F0FDF4", border: "#BBF7D0", icon: <CheckCircle size={11} /> },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "#78716C"
  if (score >= 70) return "#2F7D5C"
  if (score >= 40) return "#D97706"
  return "#B91C1C"
}

function scoreIcon(score: number | null): React.ReactNode {
  if (score === null) return <AlertTriangle size={12} />
  if (score >= 70) return <CheckCircle size={12} />
  if (score >= 40) return <AlertTriangle size={12} />
  return <OctagonX size={12} />
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function DossiersRGA() {
  const navigate = useNavigate()
  const [dossiers, setDossiers] = useState<DossierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState("")
  const [filtreStatut, setFiltreStatut] = useState<string>("tous")

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from("dossiers")
      .select(`
        id, statut, contact_date, rdv_date, diagnostic_date, created_at,
        bien:bien_id (
          id, adresse, ville, code_postal, type_bien,
          score_risque, niveau_risque, zone_rga, zone_ppri, nom_client
        )
      `)
      .order("created_at", { ascending: false })

    if (!error && data) {
  const rows = data.map((d: any) => ({
    ...d,
    bien: Array.isArray(d.bien) ? d.bien[0] ?? null : d.bien ?? null,
  }))
  setDossiers(rows as DossierRow[])
}
    setLoading(false)
  }

  // ── Filtres ──
  const dossiersFiltres = dossiers.filter(d => {
    if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false
    if (recherche) {
      const q = recherche.toLowerCase()
      const adresse = d.bien?.adresse?.toLowerCase() || ""
      const ville = d.bien?.ville?.toLowerCase() || ""
      const client = d.bien?.nom_client?.toLowerCase() || ""
      if (!adresse.includes(q) && !ville.includes(q) && !client.includes(q)) return false
    }
    return true
  })

  // ── Stats ──
  const stats = {
    total: dossiers.length,
    a_contacter: dossiers.filter(d => d.statut === "a_contacter").length,
    diagnostic:  dossiers.filter(d => d.statut === "diagnostic").length,
    travaux:     dossiers.filter(d => d.statut === "travaux").length,
    termine:     dossiers.filter(d => d.statut === "termine").length,
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1F2937" }}>Dossiers RGA</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78716C" }}>
            {stats.total} dossier{stats.total > 1 ? "s" : ""} · suivi retrait-gonflement des argiles
          </p>
        </div>
      </div>

      {/* ── KPIs statuts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {(Object.entries(STATUT_CONFIG) as [Statut, typeof STATUT_CONFIG[Statut]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFiltreStatut(filtreStatut === key ? "tous" : key)}
            style={{
              background: filtreStatut === key ? cfg.bg : "#fff",
              border: `1px solid ${filtreStatut === key ? cfg.color : "#E5E1DA"}`,
              borderRadius: 10, padding: "14px 16px", cursor: "pointer",
              textAlign: "left", transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize: 11, color: "#78716C", fontWeight: 500 }}>{cfg.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: cfg.color, fontFamily: "JetBrains Mono, monospace" }}>
              {stats[key]}
            </p>
          </button>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par adresse, ville, propriétaire…"
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select
          value={filtreStatut}
          onChange={e => setFiltreStatut(e.target.value)}
          style={{ ...inputStyle, width: 180 }}
        >
          <option value="tous">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#78716C", fontSize: 14 }}>
          Chargement…
        </div>
      ) : dossiersFiltres.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#78716C" }}>
          <Home size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Aucun dossier</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Modifiez vos filtres ou créez un dossier depuis un bien.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E1DA", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F7F4", borderBottom: "1px solid #E5E1DA" }}>
                {["Bien", "Propriétaire", "Score", "Zones", "Statut", "Créé le", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dossiersFiltres.map(d => {
                const bien = d.bien
                const cfg = STATUT_CONFIG[d.statut]
                const sc = scoreColor(bien?.score_risque ?? null)
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/metier/dossiers/${d.id}`)}
                    style={{ borderBottom: "1px solid #F4F3F0", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8F7F4")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Bien */}
                    <td style={{ ...tdStyle, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Home size={16} color="#1D9E75" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1F2937" }}>
                            {bien?.adresse || "Adresse inconnue"}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: "#78716C" }}>
                            {[bien?.code_postal, bien?.ville].filter(Boolean).join(" ")}
                            {bien?.type_bien ? ` · ${bien.type_bien}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Propriétaire */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: "#1F2937" }}>
                        {bien?.nom_client || "—"}
                      </span>
                    </td>

                    {/* Score */}
                    <td style={tdStyle}>
                      {bien?.score_risque !== null && bien?.score_risque !== undefined ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: sc }}>
                          {scoreIcon(bien.score_risque)}
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 600 }}>
                            {bien.score_risque}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "#78716C", fontSize: 13 }}>—</span>
                      )}
                    </td>

                    {/* Zones */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {bien?.zone_rga && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" }}>
                            <Layers size={9} /> RGA
                          </span>
                        )}
                        {bien?.zone_ppri && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#EFF6FF", color: "#0369A1", border: "1px solid #BFDBFE" }}>
                            <Waves size={9} /> PPRI
                          </span>
                        )}
                        {!bien?.zone_rga && !bien?.zone_ppri && (
                          <span style={{ fontSize: 12, color: "#78716C" }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Statut */}
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ ...tdStyle, color: "#78716C", fontSize: 12 }}>
                      {fmtDate(d.created_at)}
                    </td>

                    {/* Action */}
                    <td style={{ ...tdStyle, textAlign: "right", paddingRight: 16 }}>
                      <ChevronRight size={16} color="#C9C3BB" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E5E1DA" }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              {dossiersFiltres.length} dossier{dossiersFiltres.length > 1 ? "s" : ""}
              {filtreStatut !== "tous" || recherche ? ` (filtrés sur ${dossiers.length})` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid #E5E1DA", fontSize: 14, color: "#1F2937",
  background: "#fff", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px", fontSize: 11, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.05em",
  color: "#78716C", textAlign: "left", whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 14, color: "#1F2937", verticalAlign: "middle",
}
