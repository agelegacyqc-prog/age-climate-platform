import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const alertes = [
  {icon:"⚠️",texte:"Dossiers sans contact",color:"#d97706"},
  {icon:"⚠️",texte:"Diagnostics en attente",color:"#d97706"},
  {icon:"🔴",texte:"Financement bloqué",color:"#b91c1c"}
]

export default function DashboardMetier() {
  const [stats, setStats] = useState({biens:0,diagnostics:0,travaux:0,campagnes:0})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [biensRes, diagRes, travauxRes, campRes] = await Promise.all([
      supabase.from("biens").select("id", {count:"exact"}),
      supabase.from("biens").select("id", {count:"exact"}).eq("statut","diagnostic"),
      supabase.from("biens").select("id", {count:"exact"}).eq("statut","travaux"),
      supabase.from("campagnes").select("id", {count:"exact"})
    ])
    setStats({
      biens: biensRes.count||0,
      diagnostics: diagRes.count||0,
      travaux: travauxRes.count||0,
      campagnes: campRes.count||0
    })
    setLoading(false)
  }

  const kpis = [
    {label:"Adresses",valeur:stats.biens.toLocaleString(),icon:"📍",color:"#1a3a2a"},
    {label:"Diagnostics",valeur:stats.diagnostics.toLocaleString(),icon:"📋",color:"#2d6a4f"},
    {label:"Travaux",valeur:stats.travaux.toLocaleString(),icon:"🔨",color:"#d97706"},
    {label:"Campagnes",valeur:stats.campagnes.toLocaleString(),icon:"📢",color:"#0369a1"}
  ]

  const funnel = [
    {name:"Contact",valeur:stats.biens,fill:"#1a3a2a"},
    {name:"RDV",valeur:Math.round(stats.biens*0.45),fill:"#2d6a4f"},
    {name:"Diagnostic",valeur:stats.diagnostics,fill:"#d97706"},
    {name:"Travaux",valeur:stats.travaux,fill:"#b91c1c"}
  ]

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>

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
                <div style={{fontSize:"0.8rem",fontWeight:"700",color:f.fill}}>{stats.biens>0?Math.round(f.valeur/stats.biens*100):0}%</div>
                <div style={{width:"100%",background:f.fill,borderRadius:"6px 6px 0 0",height:`${stats.biens>0?Math.round(f.valeur/stats.biens*100):0}%`,minHeight:"20px"}}></div>
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
                <span style={{fontWeight:"700",color:a.color}}>{i===0?stats.biens-stats.diagnostics-stats.travaux:i===1?stats.diagnostics:0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}