import React, { useMemo, useState } from "react"
import { REGIONS_FRANCE } from "../../lib/ageadaptRegions"

interface Demande {
  id: string
  prescripteur_id: string
  statut: string
  commission_due: number | null
  region_code: string | null
  created_at: string
}

interface Prescripteur {
  id: string
  raison_sociale: string
  identifiant_prescripteur: string
  segment_prescripteur: string
}

const SEGMENTS = [
  { value: "courtiers_assurance",     label: "Courtiers assurance" },
  { value: "avocats_catnat",          label: "Avocats CatNat" },
  { value: "associations_sinistres",  label: "Associations sinistrés" },
  { value: "courtiers_travaux",       label: "Courtiers travaux" },
  { value: "notaires",                label: "Notaires" },
  { value: "agents_immo",             label: "Agents immobiliers" },
  { value: "diagnostiqueurs",         label: "Diagnostiqueurs" },
  { value: "courtiers_credit",        label: "Courtiers crédit" },
]

type Periode = "mois" | "trimestre" | "annee" | "tout"

function formatEur(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v)
}
function formatPct(v: number | null) {
  if (v === null || Number.isNaN(v)) return "—"
  return `${v.toFixed(1).replace(".", ",")}\u00A0%`
}
function plageDates(periode: Periode): { debut: Date | null } {
  const auj = new Date()
  if (periode === "tout") return { debut: null }
  const debut = new Date(auj)
  if (periode === "mois") debut.setDate(1)
  if (periode === "trimestre") debut.setMonth(Math.floor(debut.getMonth() / 3) * 3, 1)
  if (periode === "annee") debut.setMonth(0, 1)
  return { debut }
}

const iStyle: React.CSSProperties = { padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "7px", fontSize: "13px", color: "#111827", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }

export default function CommissionnementSection({
  demandes,
  prescripteurs,
  tauxActuel,
}: {
  demandes: Demande[]
  prescripteurs: Prescripteur[]
  tauxActuel: number | null
}) {
  const [periode, setPeriode] = useState<Periode>("mois")
  const [segment, setSegment] = useState("")
  const [region, setRegion] = useState("")
  const [recherche, setRecherche] = useState("")

  const lignes = useMemo(() => {
    const { debut } = plageDates(periode)

    const demandesFiltrees = demandes.filter(d => {
      if (region && d.region_code !== region) return false
      return true
    })

    return prescripteurs
      .filter(p => !segment || p.segment_prescripteur === segment)
      .filter(p => !recherche || p.raison_sociale.toLowerCase().includes(recherche.toLowerCase()))
      .map(p => {
        const demandesPrescripteur = demandesFiltrees.filter(d => d.prescripteur_id === p.id)
        const enPeriode = demandesPrescripteur.filter(d => !debut || new Date(d.created_at) >= debut)
        const realisesEnPeriode = enPeriode.filter(d => d.statut === "diagnostic_realise")
        const realisesTotal = demandesPrescripteur.filter(d => d.statut === "diagnostic_realise")

        return {
          prescripteur: p,
          demandesEnvoyees: enPeriode.length,
          diagnosticsRealises: realisesEnPeriode.length,
          tauxConversion: enPeriode.length > 0 ? (realisesEnPeriode.length / enPeriode.length) * 100 : null,
          commissionPeriode: realisesEnPeriode.reduce((s, d) => s + (d.commission_due ?? 0), 0),
          cumul: realisesTotal.reduce((s, d) => s + (d.commission_due ?? 0), 0),
        }
      })
  }, [demandes, prescripteurs, periode, segment, region, recherche])

  const totaux = lignes.reduce(
    (acc, l) => ({
      demandes: acc.demandes + l.demandesEnvoyees,
      diagnostics: acc.diagnostics + l.diagnosticsRealises,
      commissionPeriode: acc.commissionPeriode + l.commissionPeriode,
      cumul: acc.cumul + l.cumul,
    }),
    { demandes: 0, diagnostics: 0, commissionPeriode: 0, cumul: 0 }
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {tauxActuel !== null && (
        <div style={{ fontSize: "12px", color: "#6B7280" }}>
          Taux appliqué : <strong style={{ color: "#111827", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(tauxActuel)}</strong> / diagnostic réalisé — non modifiable, évolution uniquement par avenant
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select value={periode} onChange={e => setPeriode(e.target.value as Periode)} style={iStyle}>
          <option value="mois">Ce mois</option>
          <option value="trimestre">Ce trimestre</option>
          <option value="annee">Cette année</option>
          <option value="tout">Depuis le début</option>
        </select>
        <select value={segment} onChange={e => setSegment(e.target.value)} style={iStyle}>
          <option value="">Tous les segments</option>
          {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={region} onChange={e => setRegion(e.target.value)} style={iStyle}>
          <option value="">Toutes les régions</option>
          {REGIONS_FRANCE.map(r => <option key={r.code} value={r.code}>{r.nom}</option>)}
        </select>
        <input
          placeholder="Rechercher un prescripteur…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{ ...iStyle, maxWidth: "220px" }}
        />
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
              {["Prescripteur", "Segment", "Demandes envoyées", "Diagnostics réalisés", "Taux conversion", "Commission (période)", "Cumul"].map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", textAlign: i > 1 ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>Aucun prescripteur pour ces filtres.</td></tr>
            )}
            {lignes.map(l => (
              <tr key={l.prescripteur.id} style={{ borderBottom: "1px solid #E2DDD8", height: "48px" }}>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#111827", fontWeight: 500 }}>{l.prescripteur.raison_sociale}</td>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{SEGMENTS.find(s => s.value === l.prescripteur.segment_prescripteur)?.label || "—"}</td>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#111827", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{l.demandesEnvoyees}</td>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#111827", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{l.diagnosticsRealises}</td>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#111827", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatPct(l.tauxConversion)}</td>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#2F7D5C", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(l.commissionPeriode)}</td>
                <td style={{ padding: "0 16px", fontSize: "13px", color: "#111827", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(l.cumul)}</td>
              </tr>
            ))}
          </tbody>
          {lignes.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid #E2DDD8", fontWeight: 600, height: "48px" }}>
                <td style={{ padding: "0 16px", fontSize: "13px" }} colSpan={2}>Total</td>
                <td style={{ padding: "0 16px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{totaux.demandes}</td>
                <td style={{ padding: "0 16px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{totaux.diagnostics}</td>
                <td />
                <td style={{ padding: "0 16px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(totaux.commissionPeriode)}</td>
                <td style={{ padding: "0 16px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(totaux.cumul)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}