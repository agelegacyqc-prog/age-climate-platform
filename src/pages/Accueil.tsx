import React from "react"
import { useNavigate } from "react-router-dom"

export default function Accueil() {
  const navigate = useNavigate()
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1a3a2a,#2d6a4f)",borderRadius:"16px",padding:"3rem",color:"white",marginBottom:"2rem",textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🌍</div>
        <h1 style={{fontSize:"2rem",fontWeight:"800",marginBottom:"1rem"}}>AGE Climate Platform</h1>
        <p style={{fontSize:"1.1rem",opacity:"0.85",maxWidth:"500px",margin:"0 auto 2rem",lineHeight:"1.6"}}>Comprendre, agir et collaborer pour un avenir climatique durable</p>
        <button onClick={() => navigate("/dashboard")} style={{background:"#7ec87e",color:"#1a3a2a",border:"none",padding:"0.75rem 2rem",borderRadius:"999px",fontSize:"1rem",fontWeight:"700",cursor:"pointer"}}>Voir le Dashboard</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.5rem",marginBottom:"2rem"}}>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:"800",color:"#e63946"}}>+1.4°C</div>
          <div style={{color:"#666",marginTop:"0.5rem"}}>Réchauffement actuel</div>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:"800",color:"#e63946"}}>421 ppm</div>
          <div style={{color:"#666",marginTop:"0.5rem"}}>CO2 atmosphérique</div>
        </div>
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
          <div style={{fontSize:"2.5rem",fontWeight:"800",color:"#2d6a4f"}}>5</div>
          <div style={{color:"#666",marginTop:"0.5rem"}}>Projets actifs</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.5rem"}}>
        <div onClick={() => navigate("/dashboard")} style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",borderLeft:"4px solid #e63946"}}>
          <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>📊</div>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>Dashboard</h3>
          <p style={{color:"#666",fontSize:"0.9rem"}}>Visualisez les données climatiques en temps réel</p>
        </div>
        <div onClick={() => navigate("/sensibilisation")} style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",borderLeft:"4px solid #2d6a4f"}}>
          <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>🌱</div>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>Sensibilisation</h3>
          <p style={{color:"#666",fontSize:"0.9rem"}}>Découvrez les enjeux et les gestes qui comptent</p>
        </div>
        <div onClick={() => navigate("/projets")} style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",borderLeft:"4px solid #1565c0"}}>
          <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>📋</div>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>Projets</h3>
          <p style={{color:"#666",fontSize:"0.9rem"}}>Suivez et participez aux initiatives locales</p>
        </div>
      </div>
    </div>
  )
}
