import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const enjeuxMap:any = {
  energie:{label:"Énergie",icone:"⚡",color:"#d97706"},
  environnement:{label:"Carbone",icone:"🌱",color:"#2d6a4f"},
  prevention:{label:"Risques",icone:"🌡️",color:"#b91c1c"},
  resilience:{label:"Résilience",icone:"🛡️",color:"#0369a1"},
  financement:{label:"Aides",icone:"💰",color:"#7c3aed"},
  reporting:{label:"Reporting",icone:"📊",color:"#1a3a2a"}
}

const profilsMap:any = {
  entreprise:{label:"Entreprise",icone:"🏢"},
  banque_assurance:{label:"Banque / Assurance",icone:"🏦"},
  proprietaire:{label:"Propriétaire",icone:"🏠"},
  collectivite:{label:"Collectivité",icone:"🏛️"},
  expert:{label:"Expert",icone:"🔍"}
}

const niveauxMap:any = {
  debutant:{label:"Débutant",color:"#b91c1c"},
  en_cours:{label:"En cours",color:"#d97706"},
  avance:{label:"Avancé",color:"#2d6a4f"}
}

const alertes = [
  {icone:"⚠️",texte:"Décret Tertiaire — Rapport 2025 à déposer",echeance:"30/09/2025",color:"#d97706"},
  {icone:"🔴",texte:"Décret BACS — Mise en conformité requise",echeance:"01/01/2025",color:"#b91c1c"},
  {icone:"📋",texte:"Audit énergétique — Renouvellement dans 6 mois",echeance:"01/11/2025",color:"#0369a1"}
]

export default function DashboardClient() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [profil, setProfil] = useState<any>(null)
  const [actifs, setActifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data: profilData } = await supabase
      .from("profils_client")
      .select("*")
      .eq("id", user?.id)
      .single()

    if (!profilData?.onboarding_complete) {
      navigate("/onboarding")
      return
    }

    setProfil(profilData)

    const { data: actifsData } = await supabase
      .from("actifs")
      .select("*")
      .eq("user_id", user?.id)

    setActifs(actifsData || [])
    setLoading(false)
  }

  function getRoadmapWithProgress(roadmap: any[]) {
    return roadmap.map(etape => {
      if (etape.id === "profil") return {...etape, statut:"complete"}
      if (etape.id === "actif" && actifs.length > 0) return {...etape, statut:"complete"}
      return etape
    })
  }

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>

  const roadmap = profil?.roadmap ? getRoadmapWithProgress(profil.roadmap) : []
  const roadmapComplete = roadmap.filter((e:any) => e.statut === "complete").length
  const roadmapTotal = roadmap.length
  const progression = roadmapTotal > 0 ? Math.round((roadmapComplete / roadmapTotal) * 100) : 0

  return (
    <div>
      {/* Header personnalisé */}
      <div style={{background:"linear-gradient(135deg,#1a3a2a,#2d6a4f)",borderRadius:"16px",padding:"2rem",color:"white",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <h2 style={{fontSize:"1.5rem",fontWeight:"800",marginBottom:"0.25rem"}}>Bonjour 👋</h2>
            <p style={{opacity:0.85,fontSize:"0.9rem",marginBottom:"0.75rem"}}>{user?.email}</p>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
              <span style={{background:"rgba(255,255,255,0.2)",padding:"0.35rem 0.875rem",borderRadius:"999px",fontSize:"0.85rem",fontWeight:"600"}}>
                {profilsMap[profil?.type_client]?.icone} {profilsMap[profil?.type_client]?.label}
              </span>
              <span style={{background:"rgba(255,255,255,0.2)",padding:"0.35rem 0.875rem",borderRadius:"999px",fontSize:"0.85rem",fontWeight:"600"}}>
                {niveauxMap[profil?.niveau]?.label}
              </span>
              {profil?.enjeux?.map((e:string) => (
                <span key={e} style={{background:"rgba(255,255,255,0.15)",padding:"0.35rem 0.875rem",borderRadius:"999px",fontSize:"0.8rem"}}>
                  {enjeuxMap[e]?.icone} {enjeuxMap[e]?.label}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => navigate("/client/actifs/nouveau")} style={{background:"#7ec87e",color:"#1a3a2a",border:"none",padding:"0.875rem 1.75rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"0.95rem",whiteSpace:"nowrap"}}>
            + Créer un actif
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        {[
          {label:"Actifs enregistrés",val:actifs.length,icone:"🏢",color:"#1a3a2a"},
          {label:"Alertes réglementaires",val:alertes.length,icone:"⚠️",color:"#d97706"},
          {label:"Analyses complétées",val:actifs.filter((a:any)=>a.statut_analyse==="complete").length,icone:"✅",color:"#2d6a4f"},
          {label:"Progression roadmap",val:progression+"%",icone:"🗺️",color:"#0369a1"}
        ].map((k,i) => (
          <div key={i} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${k.color}`}}>
            <div style={{fontSize:"1.5rem",marginBottom:"0.25rem"}}>{k.icone}</div>
            <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.25rem"}}>{k.label}</div>
            <div style={{fontSize:"1.75rem",fontWeight:"800",color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"1.5rem"}}>
        {/* Roadmap */}
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <h3 style={{color:"#1a3a2a"}}>🗺️ Votre roadmap personnalisée</h3>
            <span style={{fontSize:"0.85rem",color:"#666"}}>{roadmapComplete}/{roadmapTotal} étapes</span>
          </div>
          <div style={{background:"#f0f0f0",borderRadius:"999px",height:"8px",overflow:"hidden",marginBottom:"1.5rem"}}>
            <div style={{background:"#2d6a4f",width:progression+"%",height:"100%",borderRadius:"999px",transition:"width 0.5s"}}></div>
          </div>
          {roadmap.length === 0 ? (
            <div style={{textAlign:"center",padding:"2rem",color:"#666"}}>
              <p>Aucune roadmap — <button onClick={() => navigate("/onboarding")} style={{color:"#0369a1",background:"none",border:"none",cursor:"pointer",fontWeight:"600"}}>Compléter votre profil</button></p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {roadmap.map((etape:any,i:number) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.875rem",borderRadius:"8px",background:etape.statut==="complete"?"#dcfce7":etape.statut==="en_cours"?"#e0f2fe":"#f8f7f4"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:etape.statut==="complete"?"#2d6a4f":etape.statut==="en_cours"?"#0369a1":"#e5e1da",color:"white",fontWeight:"700",fontSize:"0.8rem",flexShrink:0}}>
                    {etape.statut==="complete"?"✓":i+1}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem"}}>{etape.icone} {etape.label}</div>
                  </div>
                  {etape.statut==="a_faire" && (
                    <button onClick={() => {
                      if (etape.id==="actif") navigate("/client/actifs/nouveau")
                      else if (etape.id==="aides") navigate("/client/aides")
                      else if (etape.id==="marketplace") navigate("/marketplace")
                      else navigate("/client/actifs")
                    }} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.35rem 0.875rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem",fontWeight:"600",whiteSpace:"nowrap"}}>
                      Démarrer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes + Actions rapides */}
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>⚠️ Alertes réglementaires</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {alertes.map((a,i) => (
                <div key={i} style={{padding:"0.875rem",borderRadius:"8px",background:"#fff8f0",borderLeft:`3px solid ${a.color}`}}>
                  <div style={{fontSize:"0.85rem",fontWeight:"600",color:"#1a3a2a",marginBottom:"0.25rem"}}>{a.icone} {a.texte}</div>
                  <div style={{fontSize:"0.75rem",color:"#666"}}>Échéance : {a.echeance}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>🚀 Actions rapides</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {[
                {label:"Mes actifs",icone:"🏢",path:"/client/actifs"},
                {label:"Marketplace",icone:"🛒",path:"/marketplace"},
                {label:"Consulting Climat",icone:"🌍",path:"/marketplace"},
                {label:"Modifier mon profil",icone:"⚙️",path:"/onboarding"}
              ].map((a,i) => (
                <button key={i} onClick={() => navigate(a.path)} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",background:"white",cursor:"pointer",textAlign:"left",width:"100%",fontSize:"0.9rem",color:"#1a3a2a",fontWeight:"500"}}>
                  <span>{a.icone}</span>
                  <span>{a.label}</span>
                  <span style={{marginLeft:"auto",color:"#999"}}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}