import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const phases = [
  {num:1,label:"Initialisation",icone:"🚀"},
  {num:2,label:"Qualification",icone:"🔍"},
  {num:3,label:"Sélection managers",icone:"👥"},
  {num:4,label:"Proposition",icone:"📄"},
  {num:5,label:"Onboarding",icone:"🎯"},
  {num:6,label:"Exécution",icone:"⚙️"},
  {num:7,label:"Suivi & pilotage",icone:"📊"},
  {num:8,label:"Livrables",icone:"📦"},
  {num:9,label:"Facturation",icone:"💰"},
  {num:10,label:"Capitalisation",icone:"🧠"}
]

const urgenceColor:any = {
  "Standard (4-6 semaines)":{bg:"#dcfce7",color:"#2d6a4f"},
  "Urgent (2-3 semaines)":{bg:"#fef3c7",color:"#d97706"},
  "Très urgent (< 1 semaine)":{bg:"#fee2e2",color:"#b91c1c"}
}

export default function Missions() {
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    loadMissions()
  }, [])

  async function loadMissions() {
    const { data } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", {ascending: false})
    setMissions(data || [])
    setLoading(false)
  }

  async function updatePhase(id: string, phase: number) {
    await supabase.from("missions").update({phase}).eq("id", id)
    setMissions(missions.map(m => m.id === id ? {...m, phase} : m))
    if (selected?.id === id) setSelected({...selected, phase})
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from("missions").update({statut}).eq("id", id)
    setMissions(missions.map(m => m.id === id ? {...m, statut} : m))
    if (selected?.id === id) setSelected({...selected, statut})
  }

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>🎯 Missions Consulting</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>{missions.length} mission{missions.length > 1 ? "s" : ""} reçue{missions.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {missions.length === 0 ? (
        <div style={{background:"white",padding:"3rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🎯</div>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>Aucune mission pour l'instant</h3>
          <p style={{color:"#666"}}>Les demandes de la Marketplace apparaîtront ici.</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:selected?"1fr 1.5fr":"1fr",gap:"1.5rem"}}>
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {missions.map(m => (
              <div key={m.id} onClick={() => setSelected(m)} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",borderLeft:selected?.id===m.id?"4px solid #1a3a2a":"4px solid transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div style={{fontWeight:"700",color:"#1a3a2a",fontSize:"0.95rem"}}>{m.societe}</div>
                  <span style={{background:urgenceColor[m.urgence]?.bg||"#f0f0f0",color:urgenceColor[m.urgence]?.color||"#666",padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.7rem",fontWeight:"600"}}>{m.urgence?.split(" ")[0]||"Standard"}</span>
                </div>
                <div style={{fontSize:"0.85rem",color:"#666",marginBottom:"0.5rem"}}>{m.type_manager}</div>
                <div style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.75rem"}}>{m.format_mission} • {m.secteur}</div>
                <div style={{background:"#f0f4f0",borderRadius:"999px",height:"6px",overflow:"hidden"}}>
                  <div style={{background:"#2d6a4f",width:`${((m.phase||1)/10)*100}%`,height:"100%",borderRadius:"999px"}}></div>
                </div>
                <div style={{fontSize:"0.75rem",color:"#666",marginTop:"0.25rem"}}>Phase {m.phase||1}/10 — {phases[(m.phase||1)-1]?.label}</div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
                <div>
                  <h3 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>{selected.societe}</h3>
                  <p style={{color:"#666",fontSize:"0.85rem"}}>{selected.contact_nom} • {selected.contact_email}</p>
                  {selected.contact_telephone && <p style={{color:"#666",fontSize:"0.85rem"}}>{selected.contact_telephone}</p>}
                </div>
                <button onClick={() => setSelected(null)} style={{background:"#f0f4f0",border:"none",padding:"0.4rem 0.75rem",borderRadius:"6px",cursor:"pointer",color:"#666"}}>✕</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1.5rem"}}>
                {[["Manager",selected.type_manager],["Format",selected.format_mission],["Secteur",selected.secteur],["Urgence",selected.urgence]].map(([k,v],i) => (
                  <div key={i} style={{background:"#f8f7f4",padding:"0.75rem",borderRadius:"8px"}}>
                    <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.25rem"}}>{k}</div>
                    <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.85rem"}}>{v||"—"}</div>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div style={{background:"#f8f7f4",padding:"1rem",borderRadius:"8px",marginBottom:"1.5rem"}}>
                  <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.5rem",fontWeight:"600"}}>DESCRIPTION</div>
                  <p style={{color:"#444",fontSize:"0.9rem",lineHeight:"1.6"}}>{selected.description}</p>
                </div>
              )}

              <div style={{marginBottom:"1.5rem"}}>
                <div style={{fontWeight:"600",color:"#1a3a2a",marginBottom:"1rem"}}>Workflow 10 phases</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {phases.map(p => (
                    <div key={p.num} onClick={() => updatePhase(selected.id, p.num)} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem",borderRadius:"8px",cursor:"pointer",background:selected.phase===p.num?"#e0f2fe":selected.phase>p.num?"#dcfce7":"#f8f7f4",border:selected.phase===p.num?"1px solid #0369a1":"1px solid transparent"}}>
                      <div style={{width:"28px",height:"28px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:selected.phase>p.num?"#2d6a4f":selected.phase===p.num?"#0369a1":"#e5e1da",color:"white",fontWeight:"700",fontSize:"0.75rem",flexShrink:0}}>
                        {selected.phase>p.num?"✓":p.num}
                      </div>
                      <span style={{fontSize:"0.85rem",fontWeight:"500",color:"#1a3a2a"}}>{p.icone} {p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:"flex",gap:"0.75rem"}}>
                <select onChange={e => updateStatut(selected.id, e.target.value)} value={selected.statut} style={{flex:1,padding:"0.6rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.85rem",outline:"none"}}>
                  <option value="nouvelle">Nouvelle</option>
                  <option value="en_cours">En cours</option>
                  <option value="terminee">Terminée</option>
                  <option value="annulee">Annulée</option>
                </select>
                <button style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"0.85rem"}}>📧 Contacter</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}