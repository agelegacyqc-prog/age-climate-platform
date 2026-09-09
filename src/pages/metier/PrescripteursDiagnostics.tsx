// src/pages/metier/PrescripteursDiagnostics.tsx
import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { REGIONS_FRANCE } from "../../lib/ageadaptRegions"
import CommissionnementSection from "./CommissionnementSection"

const STATUTS = [
  { id: "contact_identifie",   label: "Contact identifié",   color: "#6B7280", bg: "#F3F4F6" },
  { id: "rdv_visio_programme", label: "RDV visio programmé", color: "#0369A1", bg: "#EFF6FF" },
  { id: "rdv_realise",         label: "RDV réalisé",         color: "#0369A1", bg: "#DBEAFE" },
  { id: "contrat_envoye",      label: "Contrat envoyé",      color: "#8B5E34", bg: "#F5ECE1" },
  { id: "contrat_signe",       label: "Contrat signé",       color: "#2F7D5C", bg: "#F0FDF4" },
  { id: "diagnostic_realise",  label: "Diagnostic réalisé",  color: "#0F6E56", bg: "#E1F5EE" },
  { id: "sans_suite",          label: "Sans suite",          color: "#B91C1C", bg: "#FEF2F2" },
] as const

type StatutId = typeof STATUTS[number]["id"]

interface Demande {
  id: string
  reference: string
  prescripteur_id: string
  nom_client: string
  telephone_client: string
  email_client: string | null
  ville_bien: string
  adresse_bien: string
  notes: string | null
  type_demande: "preventif" | "post_desordre"
  statut: StatutId
  commission_due: number | null
  region_code: string | null
  created_at: string
}

interface Prescripteur { id: string; raison_sociale: string; identifiant_prescripteur: string; segment_prescripteur: string }
interface HistoriqueLigne { id: string; statut_precedent: string | null; statut_nouveau: string; origine: string; changed_at: string }

function statutInfo(id: string) {
  return STATUTS.find(s => s.id === id) || STATUTS[0]
}
function regionNom(code: string | null) {
  return REGIONS_FRANCE.find(r => r.code === code)?.nom || "—"
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function formatEur(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v)
}

const iStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "7px", fontSize: "13px", color: "#111827", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }

export default function PrescripteursDiagnostics() {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([])
  const [loading, setLoading] = useState(true)

  const [filtreStatut, setFiltreStatut] = useState("")
  const [filtrePrescripteur, setFiltrePrescripteur] = useState("")
  const [filtreRegion, setFiltreRegion] = useState("")
  const [recherche, setRecherche] = useState("")

  const [ficheOuverte, setFicheOuverte] = useState<Demande | null>(null)
  const [vue, setVue] = useState<"diagnostics" | "commissionnement">("diagnostics")
  const [tauxActuel, setTauxActuel] = useState<number | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const [demRes, presRes, tauxRes] = await Promise.all([
      supabase.from("demandes_diagnostic").select("*").order("created_at", { ascending: false }),
      supabase.from("prescripteurs").select("id, raison_sociale, identifiant_prescripteur, segment_prescripteur"),
      supabase.from("commissionnement_config").select("taux_eur").is("date_fin", null).maybeSingle(),
    ])
    setDemandes(demRes.data || [])
    setPrescripteurs(presRes.data || [])
    setTauxActuel(tauxRes.data?.taux_eur ?? null)
    setLoading(false)
  }

  function nomPrescripteur(id: string) {
    const p = prescripteurs.find(p => p.id === id)
    return p ? p.raison_sociale : "—"
  }

  const filtres = demandes.filter(d => {
    if (filtreStatut && d.statut !== filtreStatut) return false
    if (filtrePrescripteur && d.prescripteur_id !== filtrePrescripteur) return false
    if (filtreRegion && d.region_code !== filtreRegion) return false
    if (recherche && !`${d.nom_client} ${d.reference} ${d.ville_bien}`.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const kpisParStatut = STATUTS.map(s => ({ ...s, count: demandes.filter(d => d.statut === s.id).length }))

  async function changerStatut(d: Demande, nouveauStatut: StatutId) {
    const { error } = await supabase.from("demandes_diagnostic").update({ statut: nouveauStatut }).eq("id", d.id)
    if (!error) {
      init()
      setFicheOuverte(prev => prev ? { ...prev, statut: nouveauStatut } : null)
    }
    return error
  }

  if (loading) return <div style={{ color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Suivi diagnostics — Prescripteurs RGA</div>
        <div style={{ fontSize: "13px", color: "#6B7280" }}>Demandes de diagnostic soumises par les prescripteurs partenaires.</div>
      </div>

            <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid #E2DDD8" }}>
        {[
          { id: "diagnostics" as const, label: "Suivi diagnostics" },
          { id: "commissionnement" as const, label: "Commissionnement" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setVue(t.id)}
            style={{
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 500,
              background: "none",
              border: "none",
              borderBottom: vue === t.id ? "2px solid #A9713F" : "2px solid transparent",
              color: vue === t.id ? "#A9713F" : "#6B7280",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {vue === "diagnostics" && (
      <>
      {/* KPIs par statut */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px" }}>
        {kpisParStatut.map(s => (
          <div
            key={s.id}
            onClick={() => setFiltreStatut(prev => prev === s.id ? "" : s.id)}
            style={{ background: filtreStatut === s.id ? s.bg : "#FFFFFF", border: `1px solid ${filtreStatut === s.id ? s.color : "#E2DDD8"}`, borderRadius: "10px", padding: "12px 14px", cursor: "pointer" }}
          >
            <div style={{ fontSize: "10px", fontWeight: 500, color: s.color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px", lineHeight: 1.3 }}>{s.label}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "18px", fontWeight: 600, color: "#111827" }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Rechercher par client, référence, ville…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{ ...iStyle, maxWidth: "260px" }}
        />
        <select value={filtrePrescripteur} onChange={e => setFiltrePrescripteur(e.target.value)} style={{ ...iStyle, maxWidth: "220px" }}>
          <option value="">Tous les prescripteurs</option>
          {prescripteurs.map(p => <option key={p.id} value={p.id}>{p.raison_sociale}</option>)}
        </select>
        <select value={filtreRegion} onChange={e => setFiltreRegion(e.target.value)} style={{ ...iStyle, maxWidth: "200px" }}>
          <option value="">Toutes les régions</option>
          {REGIONS_FRANCE.map(r => <option key={r.code} value={r.code}>{r.nom}</option>)}
        </select>
        {filtreStatut && (
          <button onClick={() => setFiltreStatut("")} style={{ fontSize: "12px", color: "#A9713F", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-x" style={{ fontSize: "12px" }} /> Filtre statut : {statutInfo(filtreStatut).label}
          </button>
        )}
      </div>

      {/* Tableau */}
      {filtres.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-inbox" style={{ fontSize: "32px", color: "#9CA3AF", display: "block", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Aucune demande</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                {["Référence", "Client", "Ville", "Région", "Prescripteur", "Statut", "Date", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtres.map((d, i) => {
                const s = statutInfo(d.statut)
                return (
                  <tr
                    key={d.id}
                    onClick={() => setFicheOuverte(d)}
                    style={{ borderBottom: i < filtres.length - 1 ? "1px solid #E2DDD8" : "none", height: "52px", cursor: "pointer" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0 16px", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: "#8B5E34" }}>{d.reference}</td>
                    <td style={{ padding: "0 16px", fontSize: "14px", color: "#111827", fontWeight: 500 }}>{d.nom_client}</td>
                    <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{d.ville_bien}</td>
                    <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{regionNom(d.region_code)}</td>
                    <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{nomPrescripteur(d.prescripteur_id)}</td>
                    <td style={{ padding: "0 16px" }}>
                      <span style={{ background: s.bg, color: s.color, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: "0 16px", fontSize: "12px", color: "#9CA3AF" }}>{formatDate(d.created_at)}</td>
                    <td style={{ padding: "0 16px", textAlign: "right" }}>
                      <i className="ti ti-chevron-right" style={{ fontSize: "14px", color: "#9CA3AF" }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {ficheOuverte && (
        <FicheDemande
          demande={ficheOuverte}
          nomPrescripteur={nomPrescripteur(ficheOuverte.prescripteur_id)}
          onFermer={() => setFicheOuverte(null)}
          onChangerStatut={changerStatut}
        />
      )}
      </>
      )}

      {vue === "commissionnement" && (
        <CommissionnementSection
          demandes={demandes}
          prescripteurs={prescripteurs}
          tauxActuel={tauxActuel}
        />
      )}
    </div>
  )
}

function FicheDemande({ demande, nomPrescripteur, onFermer, onChangerStatut }: {
  demande: Demande
  nomPrescripteur: string
  onFermer: () => void
  onChangerStatut: (d: Demande, s: StatutId) => Promise<any>
}) {
  const [historique, setHistorique] = useState<HistoriqueLigne[]>([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [nouveauStatut, setNouveauStatut] = useState<StatutId>(demande.statut)
  const [erreur, setErreur] = useState("")

  useEffect(() => { chargerHistorique() }, [demande.id])

  async function chargerHistorique() {
    setLoadingHist(true)
    const { data } = await supabase
      .from("historique_statuts")
      .select("*")
      .eq("demande_id", demande.id)
      .order("changed_at", { ascending: false })
    setHistorique(data || [])
    setLoadingHist(false)
  }

  async function appliquer() {
    if (nouveauStatut === demande.statut) return
    setErreur("")
    const error = await onChangerStatut(demande, nouveauStatut)
    if (error) setErreur(error.message)
    else chargerHistorique()
  }

  const s = statutInfo(demande.statut)

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#FFFFFF", borderRadius: "12px", width: "560px", maxWidth: "92vw", maxHeight: "88vh", overflowY: "auto", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: "#8B5E34", marginBottom: "4px" }}>{demande.reference}</div>
            <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827" }}>{demande.nom_client}</div>
          </div>
          <button onClick={onFermer} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><i className="ti ti-x" style={{ fontSize: "18px" }} /></button>
        </div>

        <span style={{ background: s.bg, color: s.color, fontSize: "12px", padding: "3px 10px", borderRadius: "5px", fontWeight: 500, display: "inline-block", marginBottom: "18px" }}>{s.label}</span>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: "13px", marginBottom: "18px" }}>
          <div><span style={{ color: "#9CA3AF" }}>Téléphone</span><div style={{ color: "#111827" }}>{demande.telephone_client}</div></div>
          <div><span style={{ color: "#9CA3AF" }}>Email</span><div style={{ color: "#111827" }}>{demande.email_client || "—"}</div></div>
          <div><span style={{ color: "#9CA3AF" }}>Type</span><div style={{ color: "#111827" }}>{demande.type_demande === "preventif" ? "Préventif" : "Post-désordre"}</div></div>
          <div><span style={{ color: "#9CA3AF" }}>Région</span><div style={{ color: "#111827" }}>{regionNom(demande.region_code)}</div></div>
          <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#9CA3AF" }}>Adresse du bien</span><div style={{ color: "#111827" }}>{demande.adresse_bien}, {demande.ville_bien}</div></div>
          <div><span style={{ color: "#9CA3AF" }}>Prescripteur</span><div style={{ color: "#111827" }}>{nomPrescripteur}</div></div>
          <div>
            <span style={{ color: "#9CA3AF" }}>Commission due</span>
            <div style={{ color: demande.commission_due !== null ? "#2F7D5C" : "#9CA3AF", fontFamily: "JetBrains Mono, monospace" }}>
              {demande.commission_due !== null ? formatEur(demande.commission_due) : "En attente de grille"}
            </div>
          </div>
          {demande.notes && (
            <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#9CA3AF" }}>Notes</span><div style={{ color: "#111827" }}>{demande.notes}</div></div>
          )}
        </div>

        {/* Changement de statut */}
        <div style={{ background: "#F8F7F4", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" }}>
          <label style={labelStyle}>Changer le statut</label>
          {erreur && <div style={{ fontSize: "12px", color: "#B91C1C", marginBottom: "8px" }}>{erreur}</div>}
          <div style={{ display: "flex", gap: "8px" }}>
            <select style={{ ...iStyle, flex: 1 }} value={nouveauStatut} onChange={e => setNouveauStatut(e.target.value as StatutId)}>
              {STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button
              onClick={appliquer}
              disabled={nouveauStatut === demande.statut}
              style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: nouveauStatut === demande.statut ? "#E2DDD8" : "#A9713F", color: "white", fontSize: "13px", fontWeight: 500, cursor: nouveauStatut === demande.statut ? "default" : "pointer", fontFamily: "inherit" }}
            >
              Appliquer
            </button>
          </div>
        </div>

        {/* Historique */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Historique</div>
          {loadingHist ? (
            <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Chargement…</div>
          ) : historique.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Aucun historique</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {historique.map(h => (
                <div key={h.id} style={{ fontSize: "12px", color: "#6B7280", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F4F3F0", paddingBottom: "6px" }}>
                  <span>
                    {h.statut_precedent ? `${statutInfo(h.statut_precedent).label} → ` : "Création — "}
                    <strong style={{ color: "#111827" }}>{statutInfo(h.statut_nouveau).label}</strong>
                  </span>
                  <span>{formatDate(h.changed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}