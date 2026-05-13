import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ScoreGeorisques from "../../components/ScoreGeorisques"

const statutReglColor:any = {
  eligible:{bg:"#dcfce7",color:"#2d6a4f",label:"Obligatoire",icone:"✅"},
  potentiel:{bg:"#fef3c7",color:"#d97706",label:"Potentiel",icone:"⚠️"},
  non_eligible:{bg:"#f0f0f0",color:"#999",label:"Non éligible",icone:"❌"},
  a_evaluer:{bg:"#e0f2fe",color:"#0369a1",label:"À évaluer",icone:"🔍"}
}

const reglLabels:any = {
  tertiaire:"Décret Tertiaire",
  bacs:"Décret BACS",
  csrd:"CSRD",
  bilan_carbone:"Bilan Carbone GES",
  iso50001:"ISO 50001",
  audit_energetique:"Audit Énergétique"
}

const reglIcones:any = {
  tertiaire:"⚡",bacs:"🔧",csrd:"📊",
  bilan_carbone:"🌱",iso50001:"🏆",audit_energetique:"🔍"
}

const typesDocuments = [
  {id:"dpe",label:"DPE",desc:"Diagnostic de Performance Énergétique"},
  {id:"audit",label:"Audit énergétique",desc:"Dernier audit réalisé"},
  {id:"bilan_carbone",label:"Bilan Carbone",desc:"Bilan GES existant"},
  {id:"plan_action",label:"Plan d'action",desc:"Plan de réduction existant"},
  {id:"rapport_csrd",label:"Rapport CSRD/ESG",desc:"Rapport durabilité"},
  {id:"factures",label:"Factures énergie",desc:"12 derniers mois"}
]

export default function FicheActif() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [actif, setActif] = useState<any>(null)
  const [reglementations, setReglementations] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState("synthese")
  const [ajoutDoc, setAjoutDoc] = useState(false)

  useEffect(() => {
    loadActif()
  }, [id])

  async function loadActif() {
    const { data: actifData } = await supabase
      .from("actifs")
      .select("*")
      .eq("id", id)
      .single()

    const { data: reglData } = await supabase
      .from("actifs_reglementaire")
      .select("*")
      .eq("actif_id", id)

    const { data: docData } = await supabase
      .from("actifs_documents")
      .select("*")
      .eq("actif_id", id)

    setActif(actifData)
    setReglementations(reglData || [])
    setDocuments(docData || [])
    setLoading(false)
  }

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>
  if (!actif) return <div style={{padding:"2rem",color:"#666"}}>Actif introuvable</div>

  const nbObligatoires = reglementations.filter(r => r.statut==="eligible").length
  const scoreColor = (actif.score_climatique||72) >= 70 ? "#b91c1c" : (actif.score_climatique||72) >= 40 ? "#d97706" : "#2d6a4f"

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
        <button onClick={() => navigate("/client/actifs")} style={{background:"white",border:"1px solid #e5e1da",padding:"0.5rem 1rem",borderRadius:"8px",cursor:"pointer",color:"#666"}}>← Retour</button>
        <div style={{flex:1}}>
          <h2 style={{color:"#1a3a2a",marginBottom:"0.1rem"}}>{actif.nom}</h2>
          <p style={{color:"#666",fontSize:"0.9rem"}}>📍 {actif.adresse} — {actif.ville} {actif.code_postal}</p>
        </div>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
          <span style={{background:"#fee2e2",color:"#b91c1c",padding:"0.5rem 1rem",borderRadius:"999px",fontWeight:"700",fontSize:"1.1rem"}}>{actif.score_climatique||72}/100</span>
          <span style={{background:"#fef3c7",color:"#d97706",padding:"0.5rem 1rem",borderRadius:"999px",fontWeight:"600",fontSize:"0.9rem"}}>En attente d'analyse</span>
        </div>
      </div>

      {/* KPIs rapides */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        {[
          {label:"Surface",val:actif.surface+"m²",icone:"📐"},
          {label:"Effectifs",val:actif.effectifs+" salariés",icone:"👥"},
          {label:"Réglementations obligatoires",val:nbObligatoires.toString(),icone:"⚖️"},
          {label:"Documents",val:documents.length.toString(),icone:"📄"}
        ].map((k,i) => (
          <div key={i} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:"1.5rem",marginBottom:"0.25rem"}}>{k.icone}</div>
            <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.25rem"}}>{k.label}</div>
            <div style={{fontSize:"1.5rem",fontWeight:"800",color:"#1a3a2a"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
        {[
          {id:"synthese",label:"📋 Synthèse"},
          {id:"reglementaire",label:"⚖️ Réglementaire"},
          {id:"climatique",label:"🌡️ Climatique"},
          {id:"documents",label:"📄 Documents"}
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.9rem",background:onglet===o.id?"#1a3a2a":"white",color:onglet===o.id?"white":"#666",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>{o.label}</button>
        ))}
      </div>

      {/* Onglet Synthèse */}
      {onglet==="synthese" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Informations du site</h3>
            {[
              ["Nom",actif.nom],
              ["Type",actif.type_batiment||"—"],
              ["Surface",actif.surface+"m²"],
              ["Année construction",actif.annee_construction||"—"],
              ["Secteur",actif.secteur_activite||"—"],
              ["Effectifs",actif.effectifs+" salariés"],
              ["Nb sites",actif.nb_sites||1]
            ].map(([k,v],i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                <span style={{color:"#666",fontSize:"0.9rem"}}>{k}</span>
                <span style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Réglementations</h3>
              {reglementations.length === 0 ? (
                <p style={{color:"#666",fontSize:"0.9rem"}}>Aucune réglementation analysée</p>
              ) : (
                reglementations.map((r,i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:"0.9rem",color:"#1a3a2a"}}>{reglIcones[r.reglementation]} {reglLabels[r.reglementation]||r.reglementation}</span>
                    <span style={{background:statutReglColor[r.statut]?.bg||"#f0f0f0",color:statutReglColor[r.statut]?.color||"#666",padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"600"}}>
                      {statutReglColor[r.statut]?.icone} {statutReglColor[r.statut]?.label||r.statut}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Score climatique</h3>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"3.5rem",fontWeight:"800",color:scoreColor}}>{actif.score_climatique||72}</div>
                <div style={{background:"#f0f0f0",borderRadius:"999px",height:"10px",overflow:"hidden",margin:"0.75rem 0"}}>
                  <div style={{background:"linear-gradient(90deg,#2d6a4f,#d97706,#b91c1c)",width:(actif.score_climatique||72)+"%",height:"100%",borderRadius:"999px"}}></div>
                </div>
                <div style={{fontSize:"0.85rem",color:"#666"}}>Analyse préliminaire</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Réglementaire */}
      {onglet==="reglementaire" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1.5rem"}}>⚖️ Analyse réglementaire détaillée</h3>
          {reglementations.length === 0 ? (
            <div style={{textAlign:"center",padding:"2rem",color:"#666"}}>
              <p>Aucune réglementation analysée pour cet actif.</p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {reglementations.map((r,i) => (
                <div key={i} style={{padding:"1.25rem",borderRadius:"12px",border:`2px solid ${statutReglColor[r.statut]?.color||"#e5e1da"}`,background:statutReglColor[r.statut]?.bg||"#f0f0f0"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <span style={{fontSize:"1.5rem"}}>{reglIcones[r.reglementation]}</span>
                      <div style={{fontWeight:"700",color:"#1a3a2a",fontSize:"1rem"}}>{reglLabels[r.reglementation]||r.reglementation}</div>
                    </div>
                    <span style={{background:"white",color:statutReglColor[r.statut]?.color||"#666",padding:"0.3rem 0.875rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"700",border:`1px solid ${statutReglColor[r.statut]?.color||"#e5e1da"}`}}>
                      {statutReglColor[r.statut]?.icone} {statutReglColor[r.statut]?.label||r.statut}
                    </span>
                  </div>
                  {r.details && (
                    <div style={{fontSize:"0.85rem",color:"#444",background:"white",padding:"0.75rem",borderRadius:"8px"}}>
                      {r.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Climatique */}
      {onglet==="climatique" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <ScoreGeorisques
            zone_rga={false}
            zone_ppri={false}
            score_risque={actif.score_climatique||72}
            niveau_risque={actif.score_climatique>=70?"eleve":actif.score_climatique>=40?"moyen":"faible"}
          />
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Détail des risques</h3>
            {[
              {label:"Risque physique",score:65,color:"#d97706",desc:"Exposition aux aléas climatiques"},
              {label:"Risque transition",score:80,color:"#b91c1c",desc:"Impact de la transition énergétique"},
              {label:"Résilience",score:72,color:"#2d6a4f",desc:"Capacité d'adaptation du site"}
            ].map((s,i) => (
              <div key={i} style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.25rem"}}>
                  <span style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem"}}>{s.label}</span>
                  <span style={{fontWeight:"800",color:s.color}}>{s.score}/100</span>
                </div>
                <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.4rem"}}>{s.desc}</div>
                <div style={{background:"#f0f0f0",borderRadius:"999px",height:"8px",overflow:"hidden"}}>
                  <div style={{background:s.color,width:s.score+"%",height:"100%",borderRadius:"999px"}}></div>
                </div>
              </div>
            ))}
            <div style={{background:"#e0f2fe",padding:"1rem",borderRadius:"8px",marginTop:"1rem",fontSize:"0.85rem",color:"#0369a1"}}>
              💡 Analyse complète disponible après traitement des documents uploadés.
            </div>
          </div>
        </div>
      )}

      {/* Onglet Documents */}
      {onglet==="documents" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
            <h3 style={{color:"#1a3a2a"}}>📄 Documents ({documents.length})</h3>
            <button onClick={() => setAjoutDoc(!ajoutDoc)} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>
              {ajoutDoc?"Annuler":"+ Ajouter un document"}
            </button>
          </div>

          {ajoutDoc && (
            <div style={{background:"#f8f7f4",padding:"1.5rem",borderRadius:"12px",marginBottom:"1.5rem",border:"1px solid #e5e1da"}}>
              <h4 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Sélectionner un type de document</h4>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
                {typesDocuments.map(doc => (
                  <div key={doc.id} style={{border:"2px dashed #e5e1da",borderRadius:"8px",padding:"1rem",textAlign:"center",cursor:"pointer",background:"white"}}
                    onMouseEnter={e => (e.currentTarget.style.borderColor="#1a3a2a")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor="#e5e1da")}>
                    <div style={{fontSize:"1.25rem",marginBottom:"0.25rem"}}>📄</div>
                    <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.8rem",marginBottom:"0.25rem"}}>{doc.label}</div>
                    <div style={{fontSize:"0.7rem",color:"#666"}}>{doc.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{border:"2px dashed #2d6a4f",borderRadius:"8px",padding:"1rem",textAlign:"center",cursor:"pointer",background:"#f0fdf4"}}>
                <div style={{fontSize:"1.5rem",marginBottom:"0.25rem"}}>➕</div>
                <div style={{fontWeight:"600",color:"#2d6a4f",fontSize:"0.85rem"}}>Autre document</div>
                <div style={{fontSize:"0.75rem",color:"#666"}}>PDF, Word, Excel</div>
              </div>
            </div>
          )}

          {documents.length === 0 ? (
            <div style={{textAlign:"center",padding:"2rem",color:"#666"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>📄</div>
              <p>Aucun document uploadé</p>
              <p style={{fontSize:"0.85rem",marginTop:"0.5rem"}}>Ajoutez vos documents pour enrichir l'analyse IA</p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {documents.map((d,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem",background:"#f8f7f4",borderRadius:"8px",border:"1px solid #e5e1da"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                    <span style={{fontSize:"1.5rem"}}>📄</span>
                    <div>
                      <div style={{fontWeight:"600",color:"#1a3a2a"}}>{d.nom}</div>
                      <div style={{fontSize:"0.8rem",color:"#666"}}>{d.type_document}</div>
                    </div>
                  </div>
                  <button style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.4rem 1rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem",fontWeight:"600"}}>Voir</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}