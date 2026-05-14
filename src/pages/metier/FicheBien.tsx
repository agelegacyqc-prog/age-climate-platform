import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ScoreGeorisques from "../../components/ScoreGeorisques"
import BrownValueWizard from "../../components/BrownValueWizard"

const ONGLETS = [
  {id:"synthese",    label:"📋 Synthèse"},
  {id:"climatique",  label:"🌡️ Climatique"},
  {id:"brown_value", label:"🏠 Brown Value"},
]

export default function FicheBien() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bien, setBien] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState("synthese")

  useEffect(() => { loadBien() }, [id])

  async function loadBien() {
    const { data, error } = await supabase
      .from("biens")
      .select("*")
      .eq("id", id)
      .single()
    setBien(data)
    setLoading(false)
  }

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>
  if (!bien) return <div style={{padding:"2rem",color:"#666"}}>Bien introuvable</div>

  const scoreColor = (bien.score_risque||0) >= 70 ? "#b91c1c"
    : (bien.score_risque||0) >= 40 ? "#d97706"
    : "#2d6a4f"

  const niveauLabel: any = {
    eleve: "Risque élevé",
    moyen: "Risque moyen",
    faible: "Risque faible"
  }

  const niveauColor: any = {
    eleve: {bg:"#fee2e2", color:"#b91c1c"},
    moyen: {bg:"#fef3c7", color:"#d97706"},
    faible: {bg:"#dcfce7", color:"#2d6a4f"},
  }

  const nc = niveauColor[bien.niveau_risque] || {bg:"#f0f0f0", color:"#666"}

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
        <button onClick={() => navigate(-1)} style={{background:"white",border:"1px solid #e5e1da",padding:"0.5rem 1rem",borderRadius:"8px",cursor:"pointer",color:"#666"}}>
          ← Retour
        </button>
        <div style={{flex:1}}>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.1rem"}}>
            {bien.adresse}
          </h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>
            📍 {bien.ville} {bien.code_postal} — {bien.type_bien}
          </p>
        </div>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
          <span style={{background:nc.bg,color:nc.color,padding:"0.5rem 1rem",borderRadius:"999px",fontWeight:"700",fontSize:"0.9rem"}}>
            {niveauLabel[bien.niveau_risque] || bien.niveau_risque}
          </span>
          <span style={{background:"#fee2e2",color:"#b91c1c",padding:"0.5rem 1rem",borderRadius:"999px",fontWeight:"700",fontSize:"1.1rem"}}>
            {bien.score_risque||0}/100
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        {[
          {label:"Type de bien",   val: bien.type_bien || "—",        icone:"🏠"},
          {label:"Score risque",   val: (bien.score_risque||0)+"/100", icone:"🌡️"},
          {label:"Zone PPRI",      val: bien.zone_ppri ? "Oui" : "Non", icone:"💧"},
          {label:"Zone RGA",       val: bien.zone_rga  ? "Oui" : "Non", icone:"🏔️"},
        ].map((k,i) => (
          <div key={i} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:"1.5rem",marginBottom:"0.25rem"}}>{k.icone}</div>
            <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.25rem"}}>{k.label}</div>
            <div style={{fontSize:"1.25rem",fontWeight:"800",color:"#1a3a2a"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        {ONGLETS.map(o => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            style={{
              padding:"0.6rem 1.25rem",
              borderRadius:"8px",
              border: o.id === "brown_value" && onglet !== o.id ? "1px solid #E8C9B0" : "none",
              cursor:"pointer",
              fontWeight:"600",
              fontSize:"0.9rem",
              background: onglet === o.id
                ? (o.id === "brown_value" ? "#B25C2A" : "#1a3a2a")
                : "white",
              color: onglet === o.id ? "white" : (o.id === "brown_value" ? "#B25C2A" : "#666"),
              boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Synthèse */}
      {onglet==="synthese" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Informations du bien</h3>
            {[
              ["Adresse",      bien.adresse],
              ["Ville",        bien.ville],
              ["Code postal",  bien.code_postal],
              ["Type",         bien.type_bien || "—"],
              ["Statut",       bien.statut || "—"],
              ["Priorité",     bien.priorite?.toString() || "—"],
              ["Zone PPRI",    bien.zone_ppri ? "Oui" : "Non"],
              ["Zone RGA",     bien.zone_rga  ? "Oui" : "Non"],
            ].map(([k,v],i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                <span style={{color:"#666",fontSize:"0.9rem"}}>{k}</span>
                <span style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem"}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Score de risque climatique</h3>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"3.5rem",fontWeight:"800",color:scoreColor}}>
                {bien.score_risque||0}
              </div>
              <div style={{background:"#f0f0f0",borderRadius:"999px",height:"10px",overflow:"hidden",margin:"0.75rem 0"}}>
                <div style={{background:"linear-gradient(90deg,#2d6a4f,#d97706,#b91c1c)",width:(bien.score_risque||0)+"%",height:"100%",borderRadius:"999px"}}></div>
              </div>
              <span style={{background:nc.bg,color:nc.color,padding:"0.4rem 1rem",borderRadius:"999px",fontWeight:"700",fontSize:"0.9rem"}}>
                {niveauLabel[bien.niveau_risque] || bien.niveau_risque}
              </span>
            </div>
            <div style={{marginTop:"1.5rem",background:"#e0f2fe",padding:"1rem",borderRadius:"8px",fontSize:"0.85rem",color:"#0369a1"}}>
              💡 Calculez la décote climatique précise via l'onglet <strong>🏠 Brown Value</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Climatique */}
      {onglet==="climatique" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <ScoreGeorisques
            zone_rga={bien.zone_rga || false}
            zone_ppri={bien.zone_ppri || false}
            score_risque={bien.score_risque || 0}
            niveau_risque={bien.niveau_risque || "faible"}
          />
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Exposition aux aléas</h3>
            {[
              {label:"Inondation / PPRI", actif: bien.zone_ppri, color:"#0369a1"},
              {label:"Retrait-gonflement des argiles (RGA)", actif: bien.zone_rga, color:"#d97706"},
            ].map((s,i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.75rem 0",borderBottom:"1px solid #f0f0f0"}}>
                <span style={{fontSize:"0.9rem",color:"#1a3a2a"}}>{s.label}</span>
                <span style={{
                  background: s.actif ? "#fee2e2" : "#dcfce7",
                  color: s.actif ? "#b91c1c" : "#2d6a4f",
                  padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"700"
                }}>
                  {s.actif ? "Zone exposée" : "Hors zone"}
                </span>
              </div>
            ))}
            <div style={{background:"#fef3c7",padding:"1rem",borderRadius:"8px",marginTop:"1rem",fontSize:"0.85rem",color:"#d97706"}}>
              ⚠ Données issues de Géorisques. Affinez l'analyse via <strong>🏠 Brown Value</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Brown Value */}
      {onglet==="brown_value" && (
        <BrownValueWizard
          actifId={id}
          valeurMarcheInitiale={undefined}
          onClose={() => setOnglet("synthese")}
        />
      )}
    </div>
  )
}