import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const profils = [
  {id:"entreprise",label:"Entreprise / Grand groupe",icone:"🏢",desc:"PME, ETI, Grand groupe — obligations réglementaires et transition énergétique"},
  {id:"banque_assurance",label:"Banque / Assurance / Investisseur",icone:"🏦",desc:"Gestion du risque climatique du portefeuille d'actifs"},
  {id:"proprietaire",label:"Propriétaire immobilier / Foncière",icone:"🏠",desc:"Valorisation et résilience de votre patrimoine immobilier"},
  {id:"collectivite",label:"Collectivité / Institution publique",icone:"🏛️",desc:"Adaptation territoriale et conformité réglementaire"},
  {id:"expert",label:"Expert / Consultant / Bureau d'études",icone:"🔍",desc:"Accès aux outils métier et gestion de missions"}
]

const enjeux = [
  {id:"energie",label:"Énergie & Performance énergétique",icone:"⚡",desc:"Décret tertiaire, BACS, ISO 50001, OPERAT",color:"#d97706"},
  {id:"environnement",label:"Environnement & Carbone",icone:"🌱",desc:"Bilan GES, CSRD, EU Taxonomy, Base Carbone ADEME",color:"#2d6a4f"},
  {id:"prevention",label:"Prévention & Risques climatiques",icone:"🌡️",desc:"Score climatique, Géorisques, Brown Value, 8 aléas",color:"#b91c1c"},
  {id:"resilience",label:"Accompagnement à la résilience climatique",icone:"🛡️",desc:"Plan adaptation, continuité activité, solutions techniques",color:"#0369a1"},
  {id:"financement",label:"Financement & Aides",icone:"💰",desc:"Fonds Vert, Barnier, CEE, ADEME, FEDER, aides-entreprises.fr",color:"#7c3aed"},
  {id:"reporting",label:"Reporting & Conformité",icone:"📊",desc:"CSRD, ESRS, SFDR, IFRS S2, EU Taxonomy",color:"#1a3a2a"}
]

const niveaux = [
  {id:"debutant",label:"Débutant",icone:"🔴",desc:"Je découvre mes obligations et je cherche à comprendre"},
  {id:"en_cours",label:"En cours",icone:"🟠",desc:"J'ai commencé ma démarche mais j'ai besoin d'accompagnement"},
  {id:"avance",label:"Avancé",icone:"🟢",desc:"Je cherche à optimiser et structurer ma démarche"}
]

function buildRoadmap(typeClient: string, enjeux: string[], niveau: string) {
  const etapesBase = [
    {id:"profil",label:"Créer votre profil",statut:"complete",icone:"✅"},
    {id:"actif",label:"Enregistrer votre premier actif",statut:"a_faire",icone:"🏢"},
  ]

  const etapesEnjeux: any[] = []

  if (enjeux.includes("energie")) {
    etapesEnjeux.push({id:"energie",label:"Analyse énergétique et décret tertiaire",statut:"a_faire",icone:"⚡"})
  }
  if (enjeux.includes("environnement")) {
    etapesEnjeux.push({id:"bilan_carbone",label:"Réaliser votre bilan carbone",statut:"a_faire",icone:"🌱"})
  }
  if (enjeux.includes("prevention")) {
    etapesEnjeux.push({id:"score_climatique",label:"Obtenir votre score climatique",statut:"a_faire",icone:"🌡️"})
  }
  if (enjeux.includes("resilience")) {
    etapesEnjeux.push({id:"plan_adaptation",label:"Construire votre plan d'adaptation",statut:"a_faire",icone:"🛡️"})
  }
  if (enjeux.includes("financement")) {
    etapesEnjeux.push({id:"aides",label:"Identifier vos aides et subventions",statut:"a_faire",icone:"💰"})
  }
  if (enjeux.includes("reporting")) {
    etapesEnjeux.push({id:"reporting",label:"Mettre en place votre reporting CSRD",statut:"a_faire",icone:"📊"})
  }

  etapesEnjeux.push({id:"marketplace",label:"Trouver vos experts partenaires",statut:"a_faire",icone:"🛒"})

  return [...etapesBase, ...etapesEnjeux]
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState(1)
  const [loading, setLoading] = useState(false)
  const [typeClient, setTypeClient] = useState("")
  const [enjeuxSelectionnes, setEnjeuxSelectionnes] = useState<string[]>([])
  const [niveau, setNiveau] = useState("")

  function toggleEnjeu(id: string) {
    setEnjeuxSelectionnes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function saveOnboarding() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const roadmap = buildRoadmap(typeClient, enjeuxSelectionnes, niveau)
    await supabase.from("profils_client").upsert({
      id: user?.id,
      type_client: typeClient,
      enjeux: enjeuxSelectionnes,
      niveau,
      onboarding_complete: true,
      roadmap,
      updated_at: new Date().toISOString()
    })
    setLoading(false)
    navigate("/client")
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a3a2a,#2d6a4f)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{background:"white",borderRadius:"20px",padding:"3rem",maxWidth:"800px",width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{fontSize:"3rem",marginBottom:"0.75rem"}}>🌍</div>
          <h1 style={{color:"#1a3a2a",fontSize:"1.75rem",fontWeight:"800",marginBottom:"0.5rem"}}>Bienvenue sur AGE Climate</h1>
          <p style={{color:"#666",fontSize:"1rem"}}>Répondez à 3 questions pour personnaliser votre expérience</p>
        </div>

        {/* Progress */}
        <div style={{display:"flex",alignItems:"center",marginBottom:"2.5rem"}}>
          {[1,2,3].map((e,i) => (
            <React.Fragment key={e}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem"}}>
                <div style={{width:"36px",height:"36px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",background:etape>e?"#2d6a4f":etape===e?"#1a3a2a":"#e5e1da",color:etape>=e?"white":"#999"}}>
                  {etape>e?"✓":e}
                </div>
                <div style={{fontSize:"0.7rem",color:etape===e?"#1a3a2a":"#999",fontWeight:etape===e?"700":"400"}}>
                  {e===1?"Profil":e===2?"Enjeux":"Niveau"}
                </div>
              </div>
              {i<2 && <div style={{flex:1,height:"2px",background:etape>e?"#2d6a4f":"#e5e1da",margin:"0 0.5rem",marginBottom:"1.25rem"}}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Étape 1 — Profil */}
        {etape===1 && (
          <div>
            <h2 style={{color:"#1a3a2a",marginBottom:"0.5rem",fontSize:"1.25rem"}}>Qui êtes-vous ?</h2>
            <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Sélectionnez votre profil pour un parcours adapté</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",marginBottom:"2rem"}}>
              {profils.map(p => (
                <div key={p.id} onClick={() => setTypeClient(p.id)} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"1.25rem",borderRadius:"12px",border:`2px solid ${typeClient===p.id?"#1a3a2a":"#e5e1da"}`,cursor:"pointer",background:typeClient===p.id?"#f0f4f0":"white",transition:"all 0.2s"}}>
                  <span style={{fontSize:"2rem",flexShrink:0}}>{p.icone}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"700",color:"#1a3a2a",marginBottom:"0.2rem"}}>{p.label}</div>
                    <div style={{fontSize:"0.8rem",color:"#666"}}>{p.desc}</div>
                  </div>
                  {typeClient===p.id && <span style={{color:"#2d6a4f",fontWeight:"700",fontSize:"1.25rem"}}>✓</span>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button onClick={() => setEtape(2)} disabled={!typeClient} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",opacity:!typeClient?0.5:1}}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 — Enjeux */}
        {etape===2 && (
          <div>
            <h2 style={{color:"#1a3a2a",marginBottom:"0.5rem",fontSize:"1.25rem"}}>Vos enjeux prioritaires</h2>
            <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Sélectionnez un ou plusieurs enjeux — votre roadmap sera construite en conséquence</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"2rem"}}>
              {enjeux.map(e => (
                <div key={e.id} onClick={() => toggleEnjeu(e.id)} style={{padding:"1.25rem",borderRadius:"12px",border:`2px solid ${enjeuxSelectionnes.includes(e.id)?e.color:"#e5e1da"}`,cursor:"pointer",background:enjeuxSelectionnes.includes(e.id)?"#f8f7f4":"white",transition:"all 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                      <span style={{fontSize:"1.5rem"}}>{e.icone}</span>
                      <span style={{fontWeight:"700",color:"#1a3a2a",fontSize:"0.9rem"}}>{e.label}</span>
                    </div>
                    {enjeuxSelectionnes.includes(e.id) && <span style={{color:e.color,fontWeight:"700"}}>✓</span>}
                  </div>
                  <div style={{fontSize:"0.75rem",color:"#666"}}>{e.desc}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <button onClick={() => setEtape(1)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
              <button onClick={() => setEtape(3)} disabled={enjeuxSelectionnes.length===0} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",opacity:enjeuxSelectionnes.length===0?0.5:1}}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 — Niveau */}
        {etape===3 && (
          <div>
            <h2 style={{color:"#1a3a2a",marginBottom:"0.5rem",fontSize:"1.25rem"}}>Où en êtes-vous ?</h2>
            <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Votre niveau nous aide à calibrer votre accompagnement</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",marginBottom:"2rem"}}>
              {niveaux.map(n => (
                <div key={n.id} onClick={() => setNiveau(n.id)} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"1.25rem",borderRadius:"12px",border:`2px solid ${niveau===n.id?"#1a3a2a":"#e5e1da"}`,cursor:"pointer",background:niveau===n.id?"#f0f4f0":"white",transition:"all 0.2s"}}>
                  <span style={{fontSize:"1.75rem",flexShrink:0}}>{n.icone}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"700",color:"#1a3a2a",marginBottom:"0.2rem"}}>{n.label}</div>
                    <div style={{fontSize:"0.85rem",color:"#666"}}>{n.desc}</div>
                  </div>
                  {niveau===n.id && <span style={{color:"#2d6a4f",fontWeight:"700",fontSize:"1.25rem"}}>✓</span>}
                </div>
              ))}
            </div>

            {/* Récap */}
            {niveau && (
              <div style={{background:"#f0f4f0",padding:"1.25rem",borderRadius:"12px",marginBottom:"1.5rem",border:"1px solid #e5e1da"}}>
                <div style={{fontWeight:"700",color:"#1a3a2a",marginBottom:"0.75rem"}}>📋 Récapitulatif de votre profil</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",fontSize:"0.9rem"}}>
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    <span style={{color:"#666"}}>Profil :</span>
                    <span style={{fontWeight:"600",color:"#1a3a2a"}}>{profils.find(p=>p.id===typeClient)?.icone} {profils.find(p=>p.id===typeClient)?.label}</span>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                    <span style={{color:"#666"}}>Enjeux :</span>
                    <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                      {enjeuxSelectionnes.map(e => (
                        <span key={e} style={{background:"#1a3a2a",color:"white",padding:"0.15rem 0.6rem",borderRadius:"999px",fontSize:"0.8rem"}}>
                          {enjeux.find(x=>x.id===e)?.icone} {enjeux.find(x=>x.id===e)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    <span style={{color:"#666"}}>Niveau :</span>
                    <span style={{fontWeight:"600",color:"#1a3a2a"}}>{niveaux.find(n=>n.id===niveau)?.icone} {niveaux.find(n=>n.id===niveau)?.label}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"flex",justifyContent:"space-between"}}>
              <button onClick={() => setEtape(2)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
              <button onClick={saveOnboarding} disabled={!niveau||loading} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",opacity:!niveau?0.5:1}}>
                {loading?"Création de votre parcours...":"🚀 Accéder à ma plateforme"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}