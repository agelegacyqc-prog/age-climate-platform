import React from "react"

const articles = [
  {icon:"🌳",titre:"Pourquoi agir maintenant ?",texte:"Le changement climatique est une urgence mondiale. Chaque action compte pour limiter le réchauffement à 1.5°C."},
  {icon:"♻️",titre:"Gestes du quotidien",texte:"Réduire sa consommation, trier ses déchets, privilégier les transports doux font une vraie différence."},
  {icon:"⚡",titre:"Energies renouvelables",texte:"Le solaire et léolien représentent aujourdéhui plus de 30% de la production mondiale délectricíté."},
  {icon:"🌊",titre:"Préserver les océans",texte:"Les océans absorbent 30% du CO2 mondial. Les protéger est essentiel pour réguler le climat."},
  {icon:"🏙️",titre:"Villes durables",texte:"Léurbanisme vert, les toits végétalisés et les transports en commun réduisent léempreinte carbone."},
  {icon:"🤝",titre:"Agir ensemble",texte:"La transition écologique est léaffaire de tous. Entreprises, citoyens et institutions doivent collaborer."}
]

export default function Sensibilisation() {
  return (
    <div>
      <h2 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>🌱 Sensibilisation</h2>
      <p style={{color:"#666",marginBottom:"1.5rem"}}>Comprendre les enjeux climatiques pour mieux agir</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.5rem"}}>
        {articles.map((a,i) => (
          <div key={i} style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.75rem"}}>{a.icon}</div>
            <h3 style={{color:"#2d6a4f",marginBottom:"0.5rem",fontSize:"1rem"}}>{a.titre}</h3>
            <p style={{color:"#444",lineHeight:"1.6",fontSize:"0.9rem"}}>{a.texte}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
