import React, { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const campagnes = [
  {id:1,nom:"Campagne RGA Mai 2026",statut:"en_cours",courriers:4500,reponses:1890,rdv:1200,diagnostics:800,debut:"01/05/2026",fin:"31/05/2026"},
  {id:2,nom:"Campagne PPRI Avril 2026",statut:"termine",courriers:2200,reponses:880,rdv:540,diagnostics:320,debut:"01/04/2026",fin:"30/04/2026"},
  {id:3,nom:"Campagne RGA Mars 2026",statut:"termine",courriers:3100,reponses:1085,rdv:720,diagnostics:410,debut:"01/03/2026",fin:"31/03/2026"}
]

const perfData = [
  {semaine:"S1",reponses:120,rdv:80,diagnostics:45},
  {semaine:"S2",reponses:340,rdv:210,diagnostics:120},
  {semaine:"S3",reponses:520,rdv:380,diagnostics:240},
  {semaine:"S4",reponses:890,rdv:530,diagnostics:395}
]

const statutColor = (s) => s==="en_cours" ? "#2d6a4f" : "#666"
const statutBg = (s) => s==="en_cours" ? "#dcfce7" : "#f0f0f0"
const statutLabel = (s) => s==="en_cours" ? "En cours" : "Termine"

export default function Campagnes() {
  const [selected, setSelected] = useState(campagnes[0])

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>📢 Campagnes</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>{campagnes.length} campagnes</p>
        </div>
        <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Nouvelle campagne</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"1.5rem"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          {campagnes.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",borderLeft:selected.id===c.id?"4px solid #1a3a2a":"4px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
                <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem"}}>{c.nom}</div>
                <span style={{background:statutBg(c.statut),color:statutColor(c.statut),padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"600"}}>{statutLabel(c.statut)}</span>
              </div>
              <div style={{fontSize:"0.8rem",color:"#666"}}>{c.debut} → {c.fin}</div>
              <div style={{fontSize:"0.8rem",color:"#666",marginTop:"0.25rem"}}>{c.courriers} courriers • {Math.round(c.reponses/c.courriers*100)}% reponse</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem"}}>
            {[
              {label:"Courriers",val:selected.courriers,color:"#1a3a2a"},
              {label:"Reponses",val:selected.reponses,color:"#2d6a4f"},
              {label:"RDV pris",val:selected.rdv,color:"#0369a1"},
              {label:"Diagnostics",val:selected.diagnostics,color:"#d97706"}
            ].map((k,i) => (
              <div key={i} style={{background:"white",padding:"1rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
                <div style={{fontSize:"1.5rem",fontWeight:"800",color:k.color}}>{k.val.toLocaleString()}</div>
                <div style={{fontSize:"0.8rem",color:"#666",marginTop:"0.25rem"}}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Performance hebdomadaire</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={perfData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semaine" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Area type="monotone" dataKey="reponses" stroke="#2d6a4f" fill="#dcfce7" strokeWidth={2} name="Reponses" />
                <Area type="monotone" dataKey="rdv" stroke="#0369a1" fill="#e0f2fe" strokeWidth={2} name="RDV" />
                <Area type="monotone" dataKey="diagnostics" stroke="#d97706" fill="#fef3c7" strokeWidth={2} name="Diagnostics" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"flex",gap:"1rem"}}>
            <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>📤 Exporter resultats</button>
            <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>📧 Lancer relance</button>
          </div>
        </div>
      </div>
    </div>
  )
}
