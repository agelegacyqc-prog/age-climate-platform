import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ScoreGeorisques from "../../components/ScoreGeorisques"
import BrownValueWizard from "../../components/BrownValueWizard"

const ONGLETS = [
  { id: "synthese",    label: "Synthèse",    icon: "ti-clipboard-list" },
  { id: "climatique",  label: "Climatique",  icon: "ti-leaf" },
  { id: "brown_value", label: "Brown Value", icon: "ti-home" },
]

export default function FicheBien() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [actif, setActif]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet]   = useState("synthese")

  useEffect(() => { loadActif() }, [id])

  async function loadActif() {
    const { data } = await supabase.from("actifs").select("*").eq("id", id).single()
    setActif(data)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  if (!actif)  return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Actif introuvable</div>

  const score      = Number(actif.score_climatique) || 0
  const scoreColor = score >= 70 ? "#991B1B" : score >= 40 ? "#D97706" : "#065F46"
  const scoreBg    = score >= 70 ? "#FEF2F2" : score >= 40 ? "#FFFBEB" : "#ECFDF5"
  const scoreLabel = score >= 70 ? "Risque élevé" : score >= 40 ? "Risque modéré" : "Risque faible"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "15px" }} aria-hidden="true" />
          Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>
            {actif.nom || actif.raison_sociale || actif.adresse || "—"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            {actif.adresse && <span>{actif.adresse} — </span>}
            {actif.code_postal} {actif.ville}
            {actif.type_batiment && <span> · {actif.type_batiment}</span>}
          </div>
        </div>
        <span style={{ background: scoreBg, color: scoreColor, padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
          {scoreLabel}
        </span>
        <span style={{ background: "#F8FAFC", color: scoreColor, padding: "5px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, fontFamily: "'DM Mono', monospace", border: "1px solid #E2E8F0" }}>
          {score} / 100
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Surface",      val: actif.surface ? `${actif.surface} m²` : "—",             icon: "ti-ruler-2" },
          { label: "Effectifs",    val: actif.effectifs ? `${actif.effectifs} salariés` : "—",   icon: "ti-users" },
          { label: "Type",         val: actif.type_batiment || actif.type_bien || "—",            icon: "ti-building" },
          { label: "Statut",       val: actif.statut_analyse || "—",                              icon: "ti-chart-bar" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: "#CBD5E1" }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px" }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 16px", borderRadius: "7px", border: "none", cursor: "pointer",
            fontSize: "13px", fontWeight: onglet === o.id ? 500 : 400, fontFamily: "inherit",
            background: onglet === o.id ? (o.id === "brown_value" ? "#FDF3EC" : "#ECFDF5") : "transparent",
            color: onglet === o.id ? (o.id === "brown_value" ? "#B25C2A" : "#065F46") : "#64748B",
            transition: "all 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>

      {/* Synthèse */}
      {onglet === "synthese" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Informations du site</div>
            {[
              ["Nom",               actif.nom || actif.raison_sociale || "—"],
              ["Type",              actif.type_batiment || actif.type_bien || "—"],
              ["Surface",           actif.surface ? `${actif.surface} m²` : "—"],
              ["Année construction",actif.annee_construction?.toString() || "—"],
              ["Secteur",           actif.secteur_activite || "—"],
              ["Effectifs",         actif.effectifs ? `${actif.effectifs} salariés` : "—"],
              ["Nb sites",          actif.nb_sites?.toString() || "—"],
              ["SIREN",             actif.siren || "—"],
              ["Code NAF",          actif.code_naf || "—"],
              ["Valeur marché",     actif.valeur_marche ? `${Number(actif.valeur_marche).toLocaleString("fr-FR")} €` : "—"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "13px", color: "#64748B" }}>{k}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Score climatique</div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "52px", fontWeight: 500, color: scoreColor, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>
                {score}
              </div>
              <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "16px" }}>/ 100</div>
              <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "8px", overflow: "hidden", marginBottom: "12px" }}>
                <div style={{ background: scoreColor, width: `${score}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
              </div>
              <span style={{ background: scoreBg, color: scoreColor, padding: "5px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500 }}>
                {scoreLabel}
              </span>
            </div>
            {actif.score_reglementaire !== null && actif.score_reglementaire !== undefined && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px" }}>Score réglementaire</div>
                <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "8px", overflow: "hidden", marginBottom: "6px" }}>
                  <div style={{ background: "#0369A1", width: `${actif.score_reglementaire}%`, height: "100%", borderRadius: "4px" }} />
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0369A1", fontFamily: "'DM Mono', monospace" }}>{actif.score_reglementaire} / 100</div>
              </div>
            )}
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#1E40AF", display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
              <i className="ti ti-info-circle" style={{ fontSize: "16px", flexShrink: 0 }} aria-hidden="true" />
              Calculez la décote précise via l'onglet <strong>Brown Value</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Climatique */}
      {onglet === "climatique" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <ScoreGeorisques
            zone_rga={actif.zone_rga || false}
            zone_ppri={actif.zone_ppri || false}
            score_risque={score}
            niveau_risque={score >= 70 ? "eleve" : score >= 40 ? "moyen" : "faible"}
          />
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Exposition aux aléas</div>
            {[
              { label: "Inondation / PPRI",                   actif: actif.zone_ppri, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Retrait-gonflement des argiles (RGA)", actif: actif.zone_rga,  color: "#92400E", bg: "#FFFBEB" },
              { label: "RDC vulnérable",                       actif: actif.rdc_vulnerable, color: "#991B1B", bg: "#FEF2F2" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "13px", color: "#0F172A" }}>{s.label}</span>
                <span style={{ background: s.actif ? s.bg : "#ECFDF5", color: s.actif ? s.color : "#065F46", padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                  {s.actif ? "Exposé" : "Hors zone"}
                </span>
              </div>
            ))}
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", flexShrink: 0 }} aria-hidden="true" />
              Données issues de Géorisques. Affinez via <strong>Brown Value</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Brown Value */}
      {onglet === "brown_value" && (
        <BrownValueWizard
          actifId={id}
          valeurMarcheInitiale={actif.valeur_marche ? Number(actif.valeur_marche) : undefined}
          onClose={() => setOnglet("synthese")}
        />
      )}
    </div>
  )
}