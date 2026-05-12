import React, { useState } from "react"

const biens = [
  {id:1,adresse:"12 rue des Lilas",ville:"Dax",score:87,risque:"eleve",statut:"a_contacter",priorite:3,zone_rga:true,zone_ppri:false},
  {id:2,adresse:"45 avenue de la Gare",ville:"Pau",score:65,risque:"moyen",statut:"diagnostic",priorite:2,zone_rga:false,zone_ppri:true},
  {id:3,adresse:"8 rue du Moulin",ville:"Bayonne",score:32,risque:"faible",statut:"termine",priorite:1,zone_rga:false,zone_ppri:false},
  {id:4,adresse:"23 chemin des Pins",ville:"Mont-de-Marsan",score:91,risque:"eleve",statut:"a_contacter",priorite:3,zone_rga:true,zone_ppri:true},
  {id:5,adresse:"67 rue Gambetta",ville:"Dax",score:74,risque:"moyen",statut:"travaux",priorite:2,zone_rga:true,zone_ppri:false},
  {id:6,adresse:"3 impasse des Roses",ville:"Tarbes",score:45,risque:"moyen",statut:"diagnostic",priorite:2,zone_rga:false,zone_ppri:false}
]

const scoreColor = (r) => r==="eleve" ? "#b91c1c" : r==="moyen" ? "#d97706" : "#2d6a4f"
const scoreBg = (r) => r==="eleve" ? "#fee2e2" : r==="moyen" ? "#fef3c7" : "#dcfce7"
const statutLabel = (s) => ({a_contacter:"A contacter",diagnostic:"Diagnostic",travaux:"Travaux",termine:"Terminé"}[s]||s)
const statutColor = (s) => ({a_contacter:"#d97706",diagnostic:"#0369a1",travaux:"#7c3aed",termine:"#2d6a4f"}[s]||"#666")
const statutBg = (s) => ({a_contacter:"#fef3c7",diagnostic:"#e0f2fe",travaux:"#ede9fe",termine:"#dcfce7"}[s]||"#f0f0f0")

export default function Portefeuille() {
  const [filtreRisque, setFiltreRisque] = useState("tous")
  const [filtreStatut, setFiltreStatut] = useState("tous")
  const [filtreZone, setFiltreZone] = useState("tous")

  const biensFiltres = biens.filter(b => {
    if (filtreRisque !== "tous" && b.risque !== filtreRisque) return false
    if (filtreStatut !== "tous" && b.statut !== filtreStatut) return false
    if (filtreZone === "rga" && !b.zone_rga) return false
    if (filtreZone === "ppri" && !b.zone_ppri) return false
    return true
  })

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>📍 Portefeuille</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>{biensFiltres.length} biens affichés</p>
        </div>
        <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Importer CSV</button>
      </div>
      <div style={{background:"white",padding:"1rem 1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:"1.5rem",display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.5rem",fontWeight:"600"}}>RISQUE</div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {["tous","eleve","moyen","faible"].map(r => (
              <button key={r} onClick={() => setFiltreRisque(r)} style={{padding:"0.35rem 0.75rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.8rem",background:filtreRisque===r ? "#1a3a2a" : "#f0f4f0",color:filtreRisque===r ? "white" : "#666"}}>{r=="tous"?"Tous":r=="eleve"?"🔴 Elevé":r=="moyen"?"🟠 Moyen":"🟢 Faible"}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.5rem",fontWeight:"600"}}>STATUT</div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {["tous","a_contacter","diagnostic","travaux","termine"].map(s => (
              <button key={s} onClick={() => setFiltreStatut(s)} style={{padding:"0.35rem 0.75rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.8rem",background:filtreStatut===s ? "#1a3a2a" : "#f0f4f0",color:filtreStatut===s ? "white" : "#666"}}>{statutLabel(s)==="a_contacter"?"A contacter":statutLabel(s)}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.5rem",fontWeight:"600"}}>ZONE</div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {["tous","rga","ppri"].map(z => (
              <button key={z} onClick={() => setFiltreZone(z)} style={{padding:"0.35rem 0.75rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.8rem",background:filtreZone===z ? "#1a3a2a" : "#f0f4f0",color:filtreZone===z ? "white" : "#666"}}>{z==="tous"?"Tous":z.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"white",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f8f7f4",borderBottom:"1px solid #e5e1da"}}>
              <th style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>ADRESSE</th>
              <th style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>VILLE</th>
              <th style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>SCORE</th>
              <th style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>STATUT</th>
              <th style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>ZONES</th>
              <th style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {biensFiltres.map((b,i) => (
              <tr key={b.id} style={{borderBottom:"1px solid #f0f0f0",background:i%2===0?"white":"#fafafa"}}>
                <td style={{padding:"0.875rem 1rem",fontSize:"0.9rem",color:"#1a3a2a",fontWeight:"500"}}>{b.adresse}</td>
                <td style={{padding:"0.875rem 1rem",fontSize:"0.9rem",color:"#444"}}>{b.ville}</td>
                <td style={{padding:"0.875rem 1rem"}}>
                  <span style={{background:scoreBg(b.risque),color:scoreColor(b.risque),padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.85rem",fontWeight:"700"}}>{b.score}</span>
                </td>
                <td style={{padding:"0.875rem 1rem"}}>
                  <span style={{background:statutBg(b.statut),color:statutColor(b.statut),padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>{statutLabel(b.statut)}</span>
                </td>
                <td style={{padding:"0.875rem 1rem",fontSize:"0.85rem",color:"#666"}}>
                  {b.zone_rga && <span style={{marginRight:"0.5rem"}}>🔴 RGA</span>}
                  {b.zone_ppri && <span>🌊 PPRI</span>}
                  {!b.zone_rga && !b.zone_ppri && <span style={{color:"#ccc"}}>—</span>}
                </td>
                <td style={{padding:"0.875rem 1rem"}}>
                  <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.4rem 1rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem",fontWeight:"600"}}>Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
