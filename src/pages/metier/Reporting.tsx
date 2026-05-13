import React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"

const roiData = [
  {mois:"Jan",cout:12000,pertes:45000},
  {mois:"Fev",cout:15000,pertes:62000},
  {mois:"Mar",cout:18000,pertes:78000},
  {mois:"Avr",cout:22000,pertes:95000},
  {mois:"Mai",cout:25000,pertes:120000}
]

const kpis = [
  {label:"Cout campagne",val:"65 000 €",icon:"💸",color:"#b91c1c",bg:"#fee2e2"},
  {label:"Travaux generes",val:"1 200 000 €",icon:"🔨",color:"#0369a1",bg:"#e0f2fe"},
  {label:"Subventions",val:"700 000 €",icon:"💰",color:"#2d6a4f",bg:"#dcfce7"},
  {label:"Pertes evitees",val:"1 800 000 €",icon:"💥",color:"#7c3aed",bg:"#ede9fe"}
]

export default function Reporting() {
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>📊 Reporting COMEX</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>Synthese strategique — Mai 2026</p>
        </div>
        <div style={{display:"flex",gap:"0.75rem"}}>
          <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>📄 Export PDF</button>
          <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>📊 Export Excel</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        {kpis.map((k,i) => (
          <div key={i} style={{background:k.bg,padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>{k.icon}</div>
            <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>{k.label}</div>
            <div style={{fontSize:"1.5rem",fontWeight:"800",color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1.5rem",marginBottom:"1.5rem"}}>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>ROI — Cout vs Pertes evitees</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{fontSize:12}} />
              <YAxis tick={{fontSize:12}} />
              <Tooltip formatter={(v) => v.toLocaleString()+" €"} />
              <Legend />
              <Bar dataKey="cout" name="Cout" fill="#b91c1c" radius={[4,4,0,0]} />
              <Bar dataKey="pertes" name="Pertes evitees" fill="#2d6a4f" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Evolution cumulative</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={roiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mois" tick={{fontSize:12}} />
              <YAxis tick={{fontSize:12}} />
              <Tooltip formatter={(v) => v.toLocaleString()+" €"} />
              <Legend />
              <Line type="monotone" dataKey="cout" name="Cout" stroke="#b91c1c" strokeWidth={2} dot={{fill:"#b91c1c"}} />
              <Line type="monotone" dataKey="pertes" name="Pertes evitees" stroke="#2d6a4f" strokeWidth={2} dot={{fill:"#2d6a4f"}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Synthese executive</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
          {[
            {label:"ROI campagne",val:"x27",desc:"1€ investi = 27€ de pertes evitees",color:"#7c3aed"},
            {label:"Taux transformation",val:"7%",desc:"Contact → Travaux realises",color:"#0369a1"},
            {label:"Cout par dossier",val:"203 €",desc:"Cout moyen par bien traite",color:"#d97706"}
          ].map((s,i) => (
            <div key={i} style={{background:"#f8f7f4",padding:"1.25rem",borderRadius:"8px",textAlign:"center"}}>
              <div style={{fontSize:"2.5rem",fontWeight:"800",color:s.color,marginBottom:"0.25rem"}}>{s.val}</div>
              <div style={{fontWeight:"600",color:"#1a3a2a",marginBottom:"0.25rem"}}>{s.label}</div>
              <div style={{fontSize:"0.8rem",color:"#666"}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
