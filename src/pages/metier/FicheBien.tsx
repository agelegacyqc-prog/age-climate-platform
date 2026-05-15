import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ScoreGeorisques from "../../components/ScoreGeorisques"
import BrownValueWizard from "../../components/BrownValueWizard"

const RISQUE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  eleve:  { label: "Risque élevé",  color: "#991B1B", bg: "#FEF2F2" },
  moyen:  { label: "Risque modéré", color: "#92400E", bg: "#FFFBEB" },
  faible: { label: "Risque faible", color: "#065F46", bg: "#ECFDF5" },
}

const ONGLETS = [
  { id: "synthese",   label: "Synthèse",    icon: "ti-clipboard-list" },
  { id: "climatique", label: "Climatique",  icon: "ti-leaf" },
  { id: "brown_value",label: "Brown Value", icon: "ti-home" },
]

export default function FicheBien() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bien, setBien] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState("synthese")

  useEffect(() => { loadBien() }, [id])

  async function loadBien() {
    const { data } = await supabase.from("biens").select("*").eq("id", id).single()
    setBien(data)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  if (!bien) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Bien introuvable</div>

  const risque = RISQUE_CONFIG[bien.niveau_risque] || { label: bien.niveau_risque, color: "#64748B", bg: "#F1F5F9" }
  const scoreColor = (bien.score_risque || 0) >= 70 ? "#991B1B" : (bien.score_risque || 0) >= 40 ? "#D97706" : "#065F46"

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
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{bien.adresse}</div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>{bien.ville} {bien.code_postal} · {bien.type_bien}</div>
        </div>
        <span style={{ background: risque.bg, color: risque.color, padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, border: `1px solid ${risque.color}20` }}>
          {risque.label}
        </span>
        <span style={{ background: "#F8FAFC", color: scoreColor, padding: "5px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, fontFamily: "'DM Mono', monospace", border: "1px solid #E2E8F0" }}>
          {bien.score_risque || 0} / 100
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Type de bien", val: bien.type_bien || "—",          icon: "ti-home" },
          { label: "Score risque", val: `${bien.score_risque || 0}/100`, icon: "ti-shield" },
          { label: "Zone PPRI",    val: bien.zone_ppri ? "Exposé" : "Hors zone", icon: "ti-droplet" },
          { label: "Zone RGA",     val: bien.zone_rga  ? "Exposé" : "Hors zone", icon: "ti-layers-difference" },
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
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "8px 16px", borderRadius: "7px",
              border: "none", cursor: "pointer",
              fontSize: "13px", fontWeight: onglet === o.id ? 500 : 400,
              fontFamily: "inherit",
              background: onglet === o.id
                ? (o.id === "brown_value" ? "#FDF3EC" : "#ECFDF5")
                : "transparent",
              color: onglet === o.id
                ? (o.id === "brown_value" ? "#B25C2A" : "#065F46")
                : "#64748B",
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
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Informations du bien</div>
            {[
              ["Adresse",     bien.adresse],
              ["Ville",       bien.ville],
              ["Code postal", bien.code_postal],
              ["Type",        bien.type_bien || "—"],
              ["Statut",      bien.statut || "—"],
              ["Priorité",    bien.priorite?.toString() || "—"],
              ["Zone PPRI",   bien.zone_ppri ? "Exposé" : "Hors zone"],
              ["Zone RGA",    bien.zone_rga  ? "Exposé" : "Hors zone"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "13px", color: "#64748B" }}>{k}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Score de risque climatique</div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "52px", fontWeight: 500, color: scoreColor, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>
                {bien.score_risque || 0}
              </div>
              <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "16px" }}>/ 100</div>
              <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "8px", overflow: "hidden", marginBottom: "12px" }}>
                <div style={{ background: scoreColor, width: `${bien.score_risque || 0}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
              </div>
              <span style={{ background: risque.bg, color: risque.color, padding: "5px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500 }}>
                {risque.label}
              </span>
            </div>
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#1E40AF", display: "flex", alignItems: "center", gap: "8px" }}>
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
            zone_rga={bien.zone_rga || false}
            zone_ppri={bien.zone_ppri || false}
            score_risque={bien.score_risque || 0}
            niveau_risque={bien.niveau_risque || "faible"}
          />
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Exposition aux aléas</div>
            {[
              { label: "Inondation / PPRI",               actif: bien.zone_ppri, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Retrait-gonflement des argiles (RGA)", actif: bien.zone_rga,  color: "#92400E", bg: "#FFFBEB" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "13px", color: "#0F172A" }}>{s.label}</span>
                <span style={{
                  background: s.actif ? s.bg : "#ECFDF5",
                  color: s.actif ? s.color : "#065F46",
                  padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500,
                }}>
                  {s.actif ? "Zone exposée" : "Hors zone"}
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
          valeurMarcheInitiale={undefined}
          onClose={() => setOnglet("synthese")}
        />
      )}
    </div>
  )
}