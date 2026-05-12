import React from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts"

const kpis = [
  {label:"Adresses",valeur:"4 520",icon:"📍",color:"#1a3a2a"},
  {label:"Diagnostics",valeur:"1 120",icon:"📋",color:"#2d6a4f"},
  {label:"Travaux",valeur:"320",icon:"🔨",color:"#d97706"},
  {label:"ROI",valeur:"1,4 M€",icon:"💥",color:"#b91c1c"}
]

const funnel = [
  {name:"Contact",valeur:4520,fill:"#1a3a2a"},
  {name:"RDV",valeur:2034,fill:"#2d6a4f"},
  {name:"Diagnostic",valeur:1120,fill:"#d97706"},
  {name:"Travaux",valeur:320,fill:"#b91c1c"}
]

const alertes = [
  {icon:"⚠️",texte:"Dossiers sans contact",nb:320,color:"#d97706"},
  {icon:"⚠️",texte:"Diagnostics en attente",nb:120,color:"#d97706"},
  {icon:"🔴",texte:"Financement bloqué",nb:45,color:"#b91c1c"}
]

export default function DashboardMetier() {
  return (
    <div>
      <h2 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>🏢 Dashboard Métier</h2>
      <p style={{color:"#666",marginBottom:"1.5rem"}}>Vue détaillée</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        {kpis.map((k,i) => (
          <div key={i} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${k.color}`}}>
            <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>{k.icon}</div>
            <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>{k.label}</div>
            <div style={{fontSize:"1.75rem",fontWeight:"800",color:k.color}}>{k.valeur}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"1.5rem",marginBottom:"1.5rem"}}>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Funnel de transformation</h3>
          <div style={{display:"flex",alignItems:"flex-end",gap:"0.5rem",height:"150px"}}>
            {funnel.map((f,i) => (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem"}}>
                <div style={{fontSize:"0.8rem",fontWeight:"700",color:f.fill}}>{Math.round(f.valeur/4520*100)}%</div>
                <div style={{width:"100%",background:f.fill,borderRadius:"6px 6px 0 0",height:`${Math.round(f.valeur/4520*100)}%`,minHeight:"20px"}}></div>
                <div style={{fontSize:"0.75rem",color:"#666",textAlign:"center"}}>{f.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>⚠️ Alertes</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {alertes.map((a,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.75rem",background:"#fff8f0",borderRadius:"8px",borderLeft:`3px solid ${a.color}`}}>
                <span style={{fontSize:"0.85rem",color:"#444"}}>{a.icon} {a.texte}</span>
                <span style={{fontWeight:"700",color:a.color}}>{a.nb}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
