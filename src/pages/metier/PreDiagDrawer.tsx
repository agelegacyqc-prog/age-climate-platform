import React, { useState } from "react"
import { supabase } from "../../lib/supabase"
import {
  X, Sparkles, Download, AlertTriangle, CheckCircle,
  OctagonX, Loader, FileText, Home, Layers, Waves
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BienData {
  id: string
  adresse: string | null
  ville: string | null
  type_bien: string | null
  score_risque: number | null
  niveau_risque: string | null
  zone_rga: boolean | null
  zone_ppri: boolean | null
  categorie: string | null
  nom_client: string | null
}

interface ActifData {
  id: string
  nom: string | null
  adresse: string | null
  ville: string | null
  type_bien: string | null
  score_climatique: number | null
  georisques_data: any
}

interface Props {
  open: boolean
  onClose: () => void
  source: "bien" | "actif"
  bien?: BienData
  actif?: ActifData
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "#78716C"
  if (score >= 70) return "#2F7D5C"
  if (score >= 40) return "#D97706"
  return "#B91C1C"
}

function scoreIcon(score: number | null): React.ReactNode {
  if (score === null) return <AlertTriangle size={14} />
  if (score >= 70) return <CheckCircle size={14} />
  if (score >= 40) return <AlertTriangle size={14} />
  return <OctagonX size={14} />
}

/** Convertit le markdown basique (**, ##, -) en HTML pour l'affichage */
function markdownToHtml(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#1F2937;margin:20px 0 8px;">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:600;color:#1F2937;margin:16px 0 6px;">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+)\. \*\*(.+?)\*\*(.*)$/gm, '<div style="margin:12px 0 4px;"><span style="font-weight:700;color:#1D9E75;">$1.</span> <strong>$2</strong>$3</div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:#1D9E75;flex-shrink:0;">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div style="margin:8px 0;"></div>')
}

/** Export PDF — HTML → nouvelle fenêtre → impression */
function exportPDF(rapport: string, titre: string) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Pré-diagnostic — ${titre}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 48px; color: #111827; font-size: 13px; line-height: 1.7; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #B25C2A; }
    .header-left h1 { font-size: 20px; font-weight: 700; color: #B25C2A; margin-bottom: 4px; }
    .header-left p { font-size: 12px; color: #6B7280; }
    .header-right { text-align: right; font-size: 11px; color: #6B7280; }
    .badge { display: inline-block; background: #FDF0E8; color: #B25C2A; border: 1px solid #F0DDD0; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
    .content h3 { font-size: 14px; font-weight: 700; color: #111827; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #E2DDD8; }
    .content h4 { font-size: 13px; font-weight: 600; color: #374151; margin: 16px 0 6px; }
    .content strong { font-weight: 600; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E2DDD8; font-size: 11px; color: #9CA3AF; display: flex; justify-content: space-between; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="badge">Pré-diagnostic climatique</div>
      <h1>${titre}</h1>
      <p>Généré par AGE Climate Platform · ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
    <div class="header-right">
      <strong>AGE Climate</strong><br>
      Document confidentiel<br>
      Réservé au consultant
    </div>
  </div>
  <div class="content">
    ${rapport
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^(\d+)\. \*\*(.+?)\*\*(.*)$/gm, '<p style="margin:10px 0 4px;"><strong style="color:#B25C2A;">$1. $2</strong>$3</p>')
      .replace(/^- (.+)$/gm, '<p style="margin:3px 0 3px 16px;">• $1</p>')
      .replace(/\n\n/g, '<br>')
    }
  </div>
  <div class="footer">
    <span>AGE Climate Platform — Pré-diagnostic automatique IA</span>
    <span>Document non contractuel · À compléter par un diagnostic terrain</span>
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.onload = () => { win.print(); URL.revokeObjectURL(url) }
  }
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function PreDiagDrawer({ open, onClose, source, bien, actif }: Props) {
  const [rapport, setRapport] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  // ── Infos affichées dans le header du drawer ──
  const titre = source === "bien"
    ? `${bien?.adresse || "Bien"}, ${bien?.ville || ""}`
    : `${actif?.nom || actif?.adresse || "Actif"}, ${actif?.ville || ""}`

  const score = source === "bien" ? bien?.score_risque ?? null : actif?.score_climatique ?? null
  const sc = scoreColor(score)

  // ── Génération ──
  async function generer() {
    setLoading(true)
    setError(null)
    setRapport(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `https://vkclvfsblsjpuycjfiso.supabase.co/functions/v1/generate-rapport`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            module: "prediag",
            data: { source, bien, actif },
          }),
        }
      )
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setRapport(json.rapport)
    } catch (e: any) {
      setError(e.message || "Erreur lors de la génération.")
    }
    setLoading(false)
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 400 }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh",
        width: 520, maxWidth: "100vw",
        background: "#FFFFFF", zIndex: 500,
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        fontFamily: "DM Sans, sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E1DA", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Sparkles size={16} color="#1D9E75" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#1D9E75", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Pré-diagnostic IA
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1F2937", lineHeight: 1.3 }}>
                {titre}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                {score !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: sc }}>
                    {scoreIcon(score)}
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700 }}>
                      {score} / 100
                    </span>
                  </div>
                )}
                {source === "bien" && bien?.zone_rga && (
                  <span style={zoneBadge("#D97706")}><Layers size={10} /> RGA</span>
                )}
                {source === "bien" && bien?.zone_ppri && (
                  <span style={zoneBadge("#0369A1")}><Waves size={10} /> PPRI</span>
                )}
                {source === "actif" && actif?.georisques_data?.data?.[0]?.risques_detail?.length > 0 && (
                  <span style={zoneBadge("#7C3AED")}>
                    {actif.georisques_data.data[0].risques_detail.length} risques Géorisques
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, border: "none", background: "#F4F3F0",
              borderRadius: 6, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", color: "#78716C", flexShrink: 0,
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Corps ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* État initial */}
          {!rapport && !loading && !error && (
            <div style={{ textAlign: "center", paddingTop: 48 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Sparkles size={28} color="#1D9E75" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1F2937", marginBottom: 8 }}>
                Générer le pré-diagnostic
              </h3>
              <p style={{ fontSize: 13, color: "#78716C", lineHeight: 1.6, maxWidth: 340, margin: "0 auto 24px" }}>
                L'IA analyse les données du bien et génère un rapport structuré avec recommandations d'actions et estimation budgétaire.
              </p>
              <button onClick={generer} style={btnPrimary}>
                <Sparkles size={14} /> Lancer l'analyse IA
              </button>
            </div>
          )}

          {/* Chargement */}
          {loading && (
            <div style={{ textAlign: "center", paddingTop: 64 }}>
              <Loader size={32} color="#1D9E75" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
              <p style={{ fontSize: 13, color: "#78716C" }}>Analyse en cours…</p>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Génération du rapport (10–20 s)</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#B91C1C", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                <OctagonX size={14} /> Erreur
              </div>
              <p style={{ fontSize: 12, color: "#991B1B", margin: 0 }}>{error}</p>
              <button onClick={generer} style={{ ...btnPrimary, marginTop: 12, fontSize: 12 }}>
                Réessayer
              </button>
            </div>
          )}

          {/* Rapport */}
          {rapport && !loading && (
            <div>
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={14} color="#2F7D5C" />
                <span style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>Rapport généré avec succès</span>
              </div>
              <div
                style={{ fontSize: 13, color: "#1F2937", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(rapport) }}
              />
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        {rapport && !loading && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #E5E1DA", flexShrink: 0, display: "flex", gap: 8 }}>
            <button onClick={() => { setRapport(null); setError(null) }} style={btnSecondary}>
              Régénérer
            </button>
            <button onClick={() => exportPDF(rapport, titre)} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>
              <Download size={14} /> Exporter PDF
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function zoneBadge(color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
    background: color + "18", color, border: `1px solid ${color}30`,
  }
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 16px", borderRadius: 8, border: "none",
  background: "#1D9E75", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
}

const btnSecondary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 16px", borderRadius: 8,
  border: "1px solid #E5E1DA", background: "#fff",
  color: "#1F2937", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
}