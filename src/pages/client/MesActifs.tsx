import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const statutColor:any = {
  en_attente:{bg:"#fef3c7",color:"#d97706",label:"En attente"},
  en_cours:{bg:"#e0f2fe",color:"#0369a1",label:"En cours"},
  complete:{bg:"#dcfce7",color:"#2d6a4f",label:"Analysé"}
}

export default function MesActifs() {
  const navigate = useNavigate()
  const [actifs, setActifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState("tous")

  useEffect(() => {
    loadActifs()
  }, [])

  async function loadActifs() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("actifs")
      .select("*, actifs_reglementaire(id, statut)")
      .eq("user_id", user?.id)
      .order("created_at", {ascending: false})
    setActifs(data || [])
    setLoading(false)
  }

  const actifsFiltres = filtre === "tous" ? actifs : actifs.filter(a => a.statut_analyse === filtre)

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
        <div>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>🏢 Mes actifs</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>{actifs.length} actif{actifs.length > 1 ? "s" : ""} enregistré{actifs.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => navigate("/client/actifs/nouveau")} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 1.75rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"1rem"}}>
          + Créer un actif
        </button>
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
        {[{id:"tous",label:"Tous"},
          {id:"en_attente",label:"En attente"},
          {id:"en_cours",label:"En cours"},
          {id:"complete",label:"Analysés"}
        ].map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)} style={{padding:"0.4rem 0.875rem",borderRadius:"999px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.85rem",background:filtre===f.id?"#1a3a2a":"white",color:filtre===f.id?"white":"#666",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>{f.label}</button>
        ))}
      </div>

      {actifsFiltres.length === 0 ? (
        <div style={{background:"white",padding:"3rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center"}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🏢</div>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>Aucun actif trouvé</h3>
          <p style={{color:"#666",marginBottom:"1.5rem"}}>Créez votre premier actif pour démarrer l'analyse.</p>
          <button onClick={() => navigate("/client/actifs/nouveau")} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>+ Créer un actif</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.5rem"}}>
          {actifsFiltres.map((a,i) => {
            const nbObligatoires = a.actifs_reglementaire?.filter((r:any) => r.statut === "eligible").length || 0
            const nbTotal = a.actifs_reglementaire?.length || 0
            return (
              <div key={i} style={{background:"white",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden",cursor:"pointer"}}
                onClick={() => navigate("/client/actifs/"+a.id)}>
                <div style={{background:"linear-gradient(135deg,#1a3a2a,#2d6a4f)",padding:"1.5rem",color:"white"}}>
                  <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🏢</div>
                  <h3 style={{marginBottom:"0.25rem",fontSize:"1rem"}}>{a.nom}</h3>
                  <p style={{opacity:0.8,fontSize:"0.85rem"}}>📍 {a.ville}</p>
                </div>
                <div style={{padding:"1.25rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"1rem"}}>
                    <span style={{background:statutColor[a.statut_analyse||"en_attente"].bg,color:statutColor[a.statut_analyse||"en_attente"].color,padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"600"}}>
                      {statutColor[a.statut_analyse||"en_attente"].label}
                    </span>
                    {a.score_climatique && (
                      <span style={{fontWeight:"800",color:"#d97706",fontSize:"1.1rem"}}>{a.score_climatique}/100</span>
                    )}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginBottom:"1rem"}}>
                    {[
                      ["Surface",a.surface?""+a.surface+" m²":"—"],
                      ["Type",a.type_batiment||"—"],
                      ["Effectifs",a.effectifs?a.effectifs+" salariés":"—"],
                      ["Réglementations",nbTotal>0?`${nbObligatoires} obligatoire${nbObligatoires>1?"s":""} / ${nbTotal} total`:"—"]
                    ].map(([k,v],j) => (
                      <div key={j} style={{display:"flex",justifyContent:"space-between",fontSize:"0.85rem"}}>
                        <span style={{color:"#666"}}>{k}</span>
                        <span style={{fontWeight:"600",color:"#1a3a2a"}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button style={{width:"100%",background:"#f0f4f0",color:"#1a3a2a",border:"none",padding:"0.6rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"0.85rem"}}>
                    Voir la fiche →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}