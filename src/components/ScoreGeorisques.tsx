import React, { useEffect, useState } from "react"

interface Props {
  zone_rga: boolean
  zone_ppri: boolean
  score_risque: number
  niveau_risque: string
}

export default function ScoreGeorisques({ zone_rga, zone_ppri, score_risque, niveau_risque }: Props) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 800)
  }, [])

  const scoreColor = niveau_risque==="eleve" ? "#b91c1c" : niveau_risque==="moyen" ? "#d97706" : "#2d6a4f"
  const scoreLabel = niveau_risque==="eleve" ? "Risque élevé" : niveau_risque==="moyen" ? "Risque moyen" : "Risque faible"

  if (!loaded) return (
    <div style={{background:"#f8f7f4",padding:"1.5rem",borderRadius:"12px",textAlign:"center",color:"#666",fontSize:"0.85rem"}}>
      Chargement Géorisques...
    </div>
  )

  return (
    <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
      <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>🗺️ Score Géorisques</h3>
      <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
        <div style={{fontSize:"3.5rem",fontWeight:"800",color:scoreColor,lineHeight:1}}>{score_risque}</div>
        <div style={{color:"#666",marginTop:"0.5rem"}}>{scoreLabel}</div>
        <div style={{background:"#f0f0f0",borderRadius:"999px",height:"12px",overflow:"hidden",marginTop:"1rem"}}>
          <div style={{background:"linear-gradient(90deg,#2d6a4f,#d97706,#b91c1c)",width:score_risque+"%",height:"100%",borderRadius:"999px"}}></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
        {[
          {label:"Zone RGA",val:zone_rga,icon:zone_rga?"🔴":"🟢"},
          {label:"Zone PPRI",val:zone_ppri,icon:zone_ppri?"🌊":"🟢"},
          {label:"Feux de forêt",val:false,icon:"🟢"},
          {label:"Zone sismique",val:false,icon:"🟢"}
        ].map((r,i) => (
          <div key={i} style={{padding:"0.75rem",borderRadius:"8px",background:r.val?"#fee2e2":"#dcfce7",display:"flex",alignItems:"center",gap:"0.5rem"}}>
            <span>{r.icon}</span>
            <div>
              <div style={{fontSize:"0.75rem",color:"#666"}}>{r.label}</div>
              <div style={{fontWeight:"700",color:r.val?"#b91c1c":"#2d6a4f",fontSize:"0.85rem"}}>{r.val?"Oui":"Non"}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:"1rem",fontSize:"0.75rem",color:"#999",textAlign:"center"}}>Source : Géorisques BRGM</div>
    </div>
  )
}