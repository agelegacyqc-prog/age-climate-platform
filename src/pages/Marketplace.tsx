import React, { useState } from "react"

const partenaires = [
  {id:1,nom:"BatExpert Sud-Ouest",type:"diagnostiqueur",ville:"Dax",note:4.8,avis:124,specialites:["RGA","PPRI","Feux"],disponible:true,prix:"À partir de 350€"},
  {id:2,nom:"Cabinet Risques & Patrimoine",type:"bureau_etudes",ville:"Pau",note:4.6,avis:89,specialites:["RGA","Submersion"],disponible:true,prix:"À partir de 800€"},
  {id:3,nom:"Rénov Climat 40",type:"artisan",ville:"Mont-de-Marsan",note:4.9,avis:203,specialites:["Travaux RGA","Drainage"],disponible:false,prix:"Sur devis"},
  {id:4,nom:"Fonds Barnier Conseil",type:"financeur",ville:"Bordeaux",note:4.7,avis:56,specialites:["Fonds Barnier","Subventions"],disponible:true,prix:"Gratuit"},
  {id:5,nom:"GéoRisk Expertise",type:"diagnostiqueur",ville:"Bayonne",note:4.5,avis:78,specialites:["PPRI","Tempête"],disponible:true,prix:"À partir de 280€"},
  {id:6,nom:"Sud Bâtiment Résilience",type:"artisan",ville:"Tarbes",note:4.8,avis:167,specialites:["Isolation","Surélévation"],disponible:true,prix:"Sur devis"}
]

const types = [
  {id:"tous",label:"Tous"},
  {id:"diagnostiqueur",label:"🔍 Diagnostiqueurs"},
  {id:"bureau_etudes",label:"📐 Bureaux études"},
  {id:"artisan",label:"🔨 Artisans"},
  {id:"financeur",label:"💰 Financeurs"}
]

const typeColor:any = {
  diagnostiqueur:{bg:"#e0f2fe",color:"#0369a1",label:"Diagnostiqueur"},
  bureau_etudes:{bg:"#ede9fe",color:"#7c3aed",label:"Bureau études"},
  artisan:{bg:"#fef3c7",color:"#d97706",label:"Artisan"},
  financeur:{bg:"#dcfce7",color:"#2d6a4f",label:"Financeur"}
}

export default function Marketplace() {
  const [filtre, setFiltre] = useState("tous")
  const [recherche, setRecherche] = useState("")

  const partenairesAffiches = partenaires.filter(p => {
    if (filtre !== "tous" && p.type !== filtre) return false
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase()) && !p.ville.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>🛒 Marketplace</h2>
        <p style={{color:"#666",fontSize:"0.9rem"}}>Experts, artisans et financeurs partenaires</p>
      </div>
      <div style={{background:"white",padding:"1rem 1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:"1.5rem",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
        <input
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher un partenaire ou une ville..."
          style={{flex:1,padding:"0.6rem 1rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",minWidth:"200px"}}
        />
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {types.map(t => (
            <button key={t.id} onClick={() => setFiltre(t.id)} style={{padding:"0.4rem 0.875rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.8rem",background:filtre===t.id?"#1a3a2a":"#f0f4f0",color:filtre===t.id?"white":"#666"}}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.5rem"}}>
        {partenairesAffiches.map(p => (
          <div key={p.id} style={{background:"white",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden",opacity:p.disponible?1:0.7}}>
            <div style={{padding:"1.5rem",borderBottom:"1px solid #f0f0f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.75rem"}}>
                <span style={{background:typeColor[p.type].bg,color:typeColor[p.type].color,padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"600"}}>{typeColor[p.type].label}</span>
                {!p.disponible && <span style={{background:"#f0f0f0",color:"#999",padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"600"}}>Indisponible</span>}
              </div>
              <h3 style={{color:"#1a3a2a",marginBottom:"0.25rem",fontSize:"1rem"}}>{p.nom}</h3>
              <p style={{color:"#666",fontSize:"0.85rem",marginBottom:"0.75rem"}}>📍 {p.ville}</p>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.75rem"}}>
                <span style={{color:"#d97706",fontWeight:"700"}}>★ {p.note}</span>
                <span style={{color:"#999",fontSize:"0.8rem"}}>({p.avis} avis)</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
                {p.specialites.map((s,i) => (
                  <span key={i} style={{background:"#f8f7f4",color:"#666",padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.75rem"}}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{padding:"1rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:"700",color:"#1a3a2a",fontSize:"0.9rem"}}>{p.prix}</span>
              <button disabled={!p.disponible} style={{background:p.disponible?"#1a3a2a":"#ccc",color:"white",border:"none",padding:"0.5rem 1.25rem",borderRadius:"8px",cursor:p.disponible?"pointer":"not-allowed",fontWeight:"600",fontSize:"0.85rem"}}>Contacter</button>
            </div>
          </div>
        ))}
      </div>
      {partenairesAffiches.length === 0 && (
        <div style={{textAlign:"center",padding:"3rem",color:"#666"}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🔍</div>
          <p>Aucun partenaire trouvé</p>
        </div>
      )}
    </div>
  )
}