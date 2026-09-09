import React, { useEffect, useMemo, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface Prescripteur {
  id: string
  identifiant_prescripteur: string
  raison_sociale: string
  segment_prescripteur: string
  statut_compte: "actif" | "suspendu"
}

interface Demande {
  id: string
  statut: string
  commission_due: number | null
  created_at: string
}

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

const iStyle: React.CSSProperties = { padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "7px", fontSize: "13px", color: "#111827", fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 44 }

export default function PrescripteurCommission() {
  const prescripteur = useOutletContext<Prescripteur>()
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [tauxActuel, setTauxActuel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<Periode>("mois")

  useEffect(() => { init() }, [prescripteur?.id])

  async function init() {
    if (!prescripteur?.id) return
    setLoading(true)
    const [demRes, tauxRes] = await Promise.all([
      supabase.from("demandes_diagnostic").select("id, statut, commission_due, created_at").eq("prescripteur_id", prescripteur.id),
      supabase.from("commissionnement_config").select("taux_eur").is("date_fin", null).maybeSingle(),
    ])
    setDemandes(demRes.data || [])
    setTauxActuel(tauxRes.data?.taux_eur ?? null)
    setLoading(false)
  }

  const kpis = useMemo(() => {
    const { debut } = plageDates(periode)
    const enPeriode = demandes.filter(d => !debut || new Date(d.created_at) >= debut)
    const realisesEnPeriode = enPeriode.filter(d => d.statut === "diagnostic_realise")
    const realisesTotal = demandes.filter(d => d.statut === "diagnostic_realise")

    return {
      demandesEnvoyees: enPeriode.length,
      diagnosticsRealises: realisesEnPeriode.length,
      tauxConversion: enPeriode.length > 0 ? (realisesEnPeriode.length / enPeriode.length) * 100 : null,
      commissionPeriode: realisesEnPeriode.reduce((s, d) => s + (d.commission_due ?? 0), 0),
      cumul: realisesTotal.reduce((s, d) => s + (d.commission_due ?? 0), 0),
    }
  }, [demandes, periode])

  if (loading) return <div style={{ color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Ma commission</div>
          <div style={{ fontSize: "13px", color: "#6B7280" }}>Suivi de vos commissions sur diagnostics réalisés.</div>
        </div>
        <select value={periode} onChange={e => setPeriode(e.target.value as Periode)} style={iStyle}>
          <option value="mois">Ce mois</option>
          <option value="trimestre">Ce trimestre</option>
          <option value="annee">Cette année</option>
          <option value="tout">Depuis le début</option>
        </select>
      </div>

      {tauxActuel !== null && (
        <div style={{ fontSize: "12px", color: "#6B7280", background: "#F5ECE1", border: "1px solid #E9D9C5", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="ti ti-lock" style={{ fontSize: "14px", color: "#8B5E34" }} aria-hidden="true" />
          Taux appliqué : <strong style={{ color: "#111827", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(tauxActuel)}</strong> / diagnostic réalisé — non modifiable, toute évolution passe par avenant
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        <CarteKpi icon="ti-send" label="Demandes envoyées" value={String(kpis.demandesEnvoyees)} />
        <CarteKpi icon="ti-percentage" label="Taux de conversion" value={formatPct(kpis.tauxConversion)} sub="diagnostics réalisés / demandes" />
        <CarteKpi icon="ti-coin" label="Commission due (période)" value={formatEur(kpis.commissionPeriode)} accent />
        <CarteKpi icon="ti-trending-up" label="Cumul depuis le début" value={formatEur(kpis.cumul)} accent />
      </div>
    </div>
  )
}

function CarteKpi({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <i className={`ti ${icon}`} style={{ fontSize: "16px", color: "#A9713F" }} aria-hidden="true" />
        <span style={{ fontSize: "12px", color: "#6B7280" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 600, color: accent ? "#2F7D5C" : "#111827" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{sub}</div>}
    </div>
  )
}