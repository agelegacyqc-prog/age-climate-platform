import React, { useState } from "react"

const projets = [
  {titre:"Reforestation Landes",desc:"Plantation de 10 000 arbres",statut:"En cours",progression:65,bg:"#e8f5e9",color:"#2d6a4f",icon:"🌿"},
  {titre:"Panneaux solaires ecoles",desc:"Installation sur 5 etablissements",statut:"Planifie",progression:20,bg:"#fff3e0",color:"#e65100",icon:"☀️"},
  {titre:"Pistes cyclables Dax",desc:"Extension du reseau de 15 km",statut:"Termine",progression:100,bg:"#e3f2fd",color:"#1565c0",icon:"🚲"},
  {titre:"Compostage collectif",desc:"Installation de 20 points de compost",statut:"En cours",progression:45,bg:"#e8f5e9",color:"#2d6a4f",icon:"🌱"},
  {titre:"Toits vegetalises",desc:"Verdissement de 5 batiments publics",statut:"Planifie",progression:10,bg:"#fff3e0",color:"#e65100",icon:"🏙️"}
]

const filtres = ["Tous","En cours","Planifie","Termine"]

export default function Projets() {
  const [filtre, setFiltre] = useState("Tous")
  const projetsAffiches = filtre === "Tous" ? projets : projets.filter(p => p.statut === filtre)
  return (
    <div>
      <h2 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>📋 Gestion de Projets</h2>
      <p style={{color:"#666",marginBottom:"1.5rem"}}>Suivi des initiatives environnementales</p>
      <div style={{display:"flex",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {filtres.map(f => (
          <button key={f} onClick={() => setFiltre(f)} style={{padding:"0.5rem 1.25rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.9rem",background:filtre===f ? "#2d6a4f" : "white",color:filtre===f ? "white" : "#666",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",transition:"all 0.2s"}}>{f}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
        {projetsAffiches.map((p,i) => (
          <div key={i} style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <span style={{fontSize:"1.5rem"}}>{p.icon}</span>
                <div>
                  <h3 style={{color:"#1a3a2a",marginBottom:"0.15rem"}}>{p.titre}</h3>
                  <p style={{color:"#666",fontSize:"0.85rem"}}>{p.desc}</p>
                </div>
              </div>
              <span style={{background:p.bg,color:p.color,padding:"0.4rem 1rem",borderRadius:"20px",fontSize:"0.85rem",fontWeight:"600",whiteSpace:"nowrap"}}>{p.statut}</span>
            </div>
            <div style={{background:"#f0f4f0",borderRadius:"999px",height:"8px",overflow:"hidden"}}>
              <div style={{background:p.color,width:p.progression+"%",height:"100%",borderRadius:"999px",transition:"width 0.5s ease"}}></div>
            </div>
            <div style={{textAlign:"right",fontSize:"0.8rem",color:"#666",marginTop:"0.25rem"}}>{p.progression}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
