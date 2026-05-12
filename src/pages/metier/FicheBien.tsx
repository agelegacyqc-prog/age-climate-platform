import React, { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

const workflow = [
  {label:"Contact client",statut:"done",date:"12/04/2026"},
  {label:"RDV pris",statut:"done",date:"18/04/2026"},
  {label:"Diagnostic en cours",statut:"active",date:"En cours"},
  {label:"Financement",statut:"pending",date:""},
  {label:"Travaux",statut:"pending",date:""}
]

const docs = [
  {nom:"Diagnostic.pdf",type:"Diagnostic",date:"20/04/2026"},
  {nom:"Devis travaux.pdf",type:"Devis",date:"22/04/2026"},
  {nom:"Dossier subvention.pdf",type:"Financement",date:"25/04/2026"}
]

export default function FicheBien() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState("synthese")

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
        <button onClick={() => navigate("/metier/portefeuille")} style={{background:"white",border:"1px solid #e5e1da",padding:"0.5rem 1rem",borderRadius:"8px",cursor:"pointer",color:"#666"}}>← Retour</button>
        <div style={{flex:1}}>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.1rem"}}>12 rue des Lilas — Dax</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>Maison individuelle • 40100</p>
        </div>
        <span style={{background:"#fee2e2",color:"#b91c1c",padding:"0.5rem 1rem",borderRadius:"999px",fontWeight:"700"}}>🔴 87</span>
        <span style={{background:"#e0f2fe",color:"#0369a1",padding:"0.5rem 1rem",borderRadius:"999px",fontWeight:"600",fontSize:"0.9rem"}}>Diagnostic en cours</span>
      </div>
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
        {[{id:"synthese",label:"Synthese"},{id:"workflow",label:"Workflow"},{id:"documents",label:"Documents"},{id:"financement",label:"Financement"}].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.9rem",background:onglet===o.id?"#1a3a2a":"white",color:onglet===o.id?"white":"#666",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>{o.label}</button>
        ))}
      </div>
      {onglet==="synthese" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Informations</h3>
            {[["Adresse","12 rue des Lilas"],["Ville","Dax"],["Type","Maison individuelle"],["Zone RGA","Oui"],["Zone PPRI","Non"]].map(([k,v],i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                <span style={{color:"#666"}}>{k}</span>
                <span style={{fontWeight:"600",color:k==="Zone RGA"?"#b91c1c":"#1a3a2a"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Score climatique</h3>
            <div style={{fontSize:"5rem",fontWeight:"800",color:"#b91c1c",lineHeight:1}}>87</div>
            <div style={{color:"#666",margin:"0.5rem 0 1.5rem"}}>Risque eleve</div>
            <div style={{background:"#f0f0f0",borderRadius:"999px",height:"16px",overflow:"hidden"}}>
              <div style={{background:"linear-gradient(90deg,#2d6a4f,#d97706,#b91c1c)",width:"87%",height:"100%",borderRadius:"999px"}}></div>
            </div>
          </div>
        </div>
      )}
      {onglet==="workflow" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1.5rem"}}>Workflow du dossier</h3>
          {workflow.map((w,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"1rem",borderRadius:"8px",marginBottom:"0.75rem",background:w.statut==="active"?"#e0f2fe":w.statut==="done"?"#dcfce7":"#f8f7f4"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:w.statut==="done"?"#2d6a4f":w.statut==="active"?"#0369a1":"#e5e1da",color:"white",fontWeight:"700",flexShrink:0}}>
                {w.statut==="done"?"✓":w.statut==="active"?"→":"○"}
              </div>
              <div>
                <div style={{fontWeight:"600",color:"#1a3a2a"}}>{w.label}</div>
                {w.date && <div style={{fontSize:"0.8rem",color:"#666"}}>{w.date}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {onglet==="documents" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
            <h3 style={{color:"#1a3a2a"}}>Documents</h3>
            <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Ajouter</button>
          </div>
          {docs.map((d,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem",borderRadius:"8px",background:"#f8f7f4",border:"1px solid #e5e1da",marginBottom:"0.75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <span style={{fontSize:"1.5rem"}}>📄</span>
                <div>
                  <div style={{fontWeight:"600",color:"#1a3a2a"}}>{d.nom}</div>
                  <div style={{fontSize:"0.8rem",color:"#666"}}>{d.type} • {d.date}</div>
                </div>
              </div>
              <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.4rem 1rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem",fontWeight:"600"}}>Voir</button>
            </div>
          ))}
        </div>
      )}
      {onglet==="financement" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Financement</h3>
            {[["Subvention RGA","12 000 €","#2d6a4f"],["Fonds Barnier","5 000 €","#2d6a4f"],["Reste a charge","3 000 €","#b91c1c"],["Statut","En cours","#d97706"]].map(([k,v,c],i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.75rem",background:"#f8f7f4",borderRadius:"8px",marginBottom:"0.5rem"}}>
                <span style={{color:"#666"}}>{k}</span>
                <span style={{fontWeight:"700",color:c}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>🏠 Brown Value</h3>
            <div style={{fontSize:"0.85rem",color:"#666"}}>Valeur de marche</div>
            <div style={{fontSize:"2rem",fontWeight:"800",color:"#1a3a2a",margin:"0.5rem 0"}}>280 000 €</div>
            <div style={{background:"#fee2e2",padding:"1rem",borderRadius:"8px",marginBottom:"0.75rem"}}>
              <div style={{fontSize:"0.85rem",color:"#666"}}>Decote climatique</div>
              <div style={{fontSize:"1.5rem",fontWeight:"700",color:"#b91c1c"}}>-18 500 €</div>
            </div>
            <div style={{background:"#dcfce7",padding:"1rem",borderRadius:"8px"}}>
              <div style={{fontSize:"0.85rem",color:"#666"}}>Valeur ajustee</div>
              <div style={{fontSize:"1.75rem",fontWeight:"800",color:"#2d6a4f"}}>261 500 €</div>
              <div style={{fontSize:"0.8rem",color:"#b91c1c",marginTop:"0.25rem"}}>Impact net : -6.6%</div>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:"1rem",marginTop:"1.5rem",flexWrap:"wrap"}}>
        <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>📞 Lancer contact</button>
        <button style={{background:"#0369a1",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>📋 Planifier diagnostic</button>
        <button style={{background:"#d97706",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>💰 Lancer financement</button>
        <button style={{background:"#7c3aed",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>🔨 Valider travaux</button>
      </div>
    </div>
  )
}