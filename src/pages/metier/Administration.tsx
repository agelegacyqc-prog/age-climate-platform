import React, { useState } from "react"

const utilisateurs = [
  {id:1,nom:"Khouader",prenom:"Adi",email:"akhouader@juperolab.com",role:"admin",statut:"actif"},
  {id:2,nom:"Dupont",prenom:"Marie",email:"mdupont@age.fr",role:"operateur",statut:"actif"},
  {id:3,nom:"Martin",prenom:"Paul",email:"pmartin@assurance.fr",role:"client",statut:"actif"},
  {id:4,nom:"Bernard",prenom:"Sophie",email:"sbernard@banque.fr",role:"client",statut:"inactif"}
]

const roleColor:any = {admin:"#7c3aed",operateur:"#0369a1",client:"#2d6a4f"}
const roleBg:any = {admin:"#ede9fe",operateur:"#e0f2fe",client:"#dcfce7"}
const statutColor:any = {actif:"#2d6a4f",inactif:"#b91c1c"}
const statutBg:any = {actif:"#dcfce7",inactif:"#fee2e2"}

export default function Administration() {
  const [onglet, setOnglet] = useState("utilisateurs")
  return (
    <div>
      <h2 style={{color:"#1a3a2a",marginBottom:"1.5rem"}}>⚙️ Administration</h2>
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
        {[{id:"utilisateurs",label:"👥 Utilisateurs"},{id:"parametres",label:"⚙️ Parametres"},{id:"workflows",label:"🔄 Workflows"},{id:"documents",label:"📄 Modeles"}].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.9rem",background:onglet===o.id?"#1a3a2a":"white",color:onglet===o.id?"white":"#666",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>{o.label}</button>
        ))}
      </div>
      {onglet==="utilisateurs" && (
        <div style={{background:"white",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden"}}>
          <div style={{padding:"1rem 1.5rem",borderBottom:"1px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{color:"#1a3a2a"}}>Utilisateurs ({utilisateurs.length})</h3>
            <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Ajouter</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8f7f4"}}>
                {["NOM","EMAIL","ROLE","STATUT","ACTION"].map(h => (
                  <th key={h} style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u,i) => (
                <tr key={u.id} style={{borderBottom:"1px solid #f0f0f0",background:i%2===0?"white":"#fafafa"}}>
                  <td style={{padding:"0.875rem 1rem",fontWeight:"600",color:"#1a3a2a"}}>{u.prenom} {u.nom}</td>
                  <td style={{padding:"0.875rem 1rem",fontSize:"0.9rem",color:"#666"}}>{u.email}</td>
                  <td style={{padding:"0.875rem 1rem"}}>
                    <span style={{background:roleBg[u.role],color:roleColor[u.role],padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>{u.role}</span>
                  </td>
                  <td style={{padding:"0.875rem 1rem"}}>
                    <span style={{background:statutBg[u.statut],color:statutColor[u.statut],padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>{u.statut}</span>
                  </td>
                  <td style={{padding:"0.875rem 1rem"}}>
                    <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.35rem 0.75rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem",fontWeight:"600"}}>Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onglet==="parametres" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Types de risques</h3>
            {["RGA","PPRI","Feux de foret","Submersion","Tempete"].map((r,i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.75rem",background:"#f8f7f4",borderRadius:"8px",marginBottom:"0.5rem"}}>
                <span style={{fontWeight:"500",color:"#1a3a2a"}}>{r}</span>
                <button style={{background:"white",color:"#666",border:"1px solid #e5e1da",padding:"0.25rem 0.75rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem"}}>Modifier</button>
              </div>
            ))}
          </div>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Parametres generaux</h3>
            {[["Conservation donnees","5 ans"],["Export par defaut","PDF"],["Langue","Francais"],["Fuseau horaire","Europe/Paris"]].map(([k,v],i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.75rem",background:"#f8f7f4",borderRadius:"8px",marginBottom:"0.5rem"}}>
                <span style={{color:"#666"}}>{k}</span>
                <span style={{fontWeight:"600",color:"#1a3a2a"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {onglet==="workflows" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1.5rem"}}>Workflows configures</h3>
          {["Integration donnees","Campagne contact","Diagnostic","Financement","Travaux","Reporting"].map((w,i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem",background:"#f8f7f4",borderRadius:"8px",marginBottom:"0.75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <span style={{background:"#1a3a2a",color:"white",width:"28px",height:"28px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",fontWeight:"700",flexShrink:0}}>{i+1}</span>
                <span style={{fontWeight:"500",color:"#1a3a2a"}}>Workflow {i+1} — {w}</span>
              </div>
              <span style={{background:"#dcfce7",color:"#2d6a4f",padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>Actif</span>
            </div>
          ))}
        </div>
      )}
      {onglet==="documents" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
            <h3 style={{color:"#1a3a2a"}}>Modeles de documents</h3>
            <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Ajouter</button>
          </div>
          {[["Mandat client","Administratif"],["Consentement RGPD","Administratif"],["Rapport diagnostic","Diagnostic"],["Dossier subvention","Financement"],["Attestation travaux","Travaux"],["Rapport COMEX","Reporting"]].map(([n,t],i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem",background:"#f8f7f4",borderRadius:"8px",marginBottom:"0.5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <span style={{fontSize:"1.25rem"}}>📄</span>
                <div>
                  <div style={{fontWeight:"500",color:"#1a3a2a"}}>{n}</div>
                  <div style={{fontSize:"0.8rem",color:"#666"}}>{t}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.35rem 0.75rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem"}}>Voir</button>
                <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.35rem 0.75rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem"}}>Modifier</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}