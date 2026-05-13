import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const pipeline = ["depose","instruction","valide","paye"]
const pipelineLabel:any = {depose:"Déposé",instruction:"Instruction",valide:"Validé",paye:"Payé",en_cours:"En cours"}
const statutColor:any = {depose:"#d97706",instruction:"#0369a1",valide:"#2d6a4f",paye:"#1a3a2a",en_cours:"#d97706"}
const statutBg:any = {depose:"#fef3c7",instruction:"#e0f2fe",valide:"#dcfce7",paye:"#f0fdf4",en_cours:"#fef3c7"}

const subventions:any = {eleve:12000,moyen:8000,faible:5000}
const restes:any = {eleve:3000,moyen:2000,faible:1500}

export default function Financement() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState("tous")

  useEffect(() => {
    loadDossiers()
  }, [])

  async function loadDossiers() {
    const { data } = await supabase
      .from("dossiers")
      .select("*, biens(adresse, ville, niveau_risque, type_bien)")
      .order("created_at", {ascending: false})
    setDossiers(data || [])
    setLoading(false)
  }

  const totalSubventions = dossiers.reduce((a,d) => a + (subventions[d.biens?.niveau_risque]||0), 0)
  const totalReste = dossiers.reduce((a,d) => a + (restes[d.biens?.niveau_risque]||0), 0)
  const dossiersValides = dossiers.filter(d => d.financement_statut==="valide"||d.financement_statut==="paye").length

  const dossiersFiltres = filtre==="tous" ? dossiers : dossiers.filter(d => d.financement_statut===filtre)

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>💰 Financement</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>{dossiers.length} dossiers</p>
        </div>
        <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>+ Nouveau dossier</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        <div style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid #2d6a4f"}}>
          <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>Subventions mobilisées</div>
          <div style={{fontSize:"1.75rem",fontWeight:"800",color:"#2d6a4f"}}>{totalSubventions.toLocaleString()} €</div>
        </div>
        <div style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid #b91c1c"}}>
          <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>Reste à charge total</div>
          <div style={{fontSize:"1.75rem",fontWeight:"800",color:"#b91c1c"}}>{totalReste.toLocaleString()} €</div>
        </div>
        <div style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:"4px solid #0369a1"}}>
          <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.25rem"}}>Dossiers validés</div>
          <div style={{fontSize:"1.75rem",fontWeight:"800",color:"#0369a1"}}>{dossiersValides} / {dossiers.length}</div>
        </div>
      </div>
      <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:"1.5rem"}}>
        <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Pipeline</h3>
        <div style={{display:"flex",gap:"0",borderRadius:"8px",overflow:"hidden"}}>
          {pipeline.map((p,i) => {
            const nb = dossiers.filter(d => d.financement_statut===p).length
            return (
              <div key={p} style={{flex:1,padding:"1rem",background:i%2===0?"#f8f7f4":"#f0f4f0",textAlign:"center",position:"relative"}}>
                <div style={{fontSize:"1.5rem",fontWeight:"800",color:statutColor[p]}}>{nb}</div>
                <div style={{fontSize:"0.8rem",color:"#666",marginTop:"0.25rem"}}>{pipelineLabel[p]}</div>
                {i<pipeline.length-1 && <div style={{position:"absolute",right:"-12px",top:"50%",transform:"translateY(-50%)",fontSize:"1.5rem",color:"#ccc",zIndex:1}}>→</div>}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{background:"white",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden"}}>
        <div style={{padding:"1rem 1.5rem",borderBottom:"1px solid #f0f0f0",display:"flex",gap:"0.5rem"}}>
          {["tous",...pipeline].map(f => (
            <button key={f} onClick={() => setFiltre(f)} style={{padding:"0.35rem 0.75rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.8rem",background:filtre===f?"#1a3a2a":"#f0f4f0",color:filtre===f?"white":"#666"}}>{f==="tous"?"Tous":pipelineLabel[f]}</button>
          ))}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f8f7f4"}}>
              {["BIEN","TYPE","SUBVENTION","RESTE","STATUT"].map(h => (
                <th key={h} style={{padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.8rem",color:"#666",fontWeight:"600"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dossiersFiltres.map((d,i) => (
              <tr key={d.id} style={{borderBottom:"1px solid #f0f0f0",background:i%2===0?"white":"#fafafa"}}>
                <td style={{padding:"0.875rem 1rem"}}>
                  <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem"}}>{d.biens?.adresse}</div>
                  <div style={{fontSize:"0.8rem",color:"#666"}}>{d.biens?.ville}</div>
                </td>
                <td style={{padding:"0.875rem 1rem",fontSize:"0.85rem",color:"#444"}}>{d.biens?.type_bien}</td>
                <td style={{padding:"0.875rem 1rem",fontWeight:"700",color:"#2d6a4f"}}>{(subventions[d.biens?.niveau_risque]||0).toLocaleString()} €</td>
                <td style={{padding:"0.875rem 1rem",fontWeight:"700",color:"#b91c1c"}}>{(restes[d.biens?.niveau_risque]||0).toLocaleString()} €</td>
                <td style={{padding:"0.875rem 1rem"}}>
                  <span style={{background:statutBg[d.financement_statut]||"#f0f0f0",color:statutColor[d.financement_statut]||"#666",padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>{pipelineLabel[d.financement_statut]||d.financement_statut}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}