import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const etapes = [
  {num:1,label:"Informations"},
  {num:2,label:"Documents"},
  {num:3,label:"Réglementaire"},
  {num:4,label:"Climatique"},
  {num:5,label:"Rapport"}
]

const typesBatiments = ["Bureau","Entrepôt","Commerce","Industrie","Hôtel","Enseignement","Santé","Autre"]
const secteurs = ["Assurance","Banque","Immobilier","Industrie","Retail","Santé","Éducation","Autre"]

const reglementations = [
  {id:"tertiaire",label:"Décret Tertiaire",icone:"⚡",desc:"Réduction consommation énergétique bâtiments >1000m²"},
  {id:"bacs",label:"Décret BACS",icone:"🔧",desc:"Système de GTB pour bâtiments tertiaires"},
  {id:"csrd",label:"CSRD",icone:"📊",desc:"Reporting durabilité entreprises >250 salariés"},
  {id:"bilan_carbone",label:"Bilan Carbone",icone:"🌱",desc:"Bilan GES obligatoire entreprises >500 salariés"},
  {id:"iso50001",label:"ISO 50001",icone:"🏆",desc:"Certification système de management de l'énergie"},
  {id:"audit_energetique",label:"Audit Énergétique",icone:"🔍",desc:"Audit obligatoire grandes entreprises tous les 4 ans"}
]

export default function NouvelActif() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actifId, setActifId] = useState<string|null>(null)

  const [infos, setInfos] = useState({
    nom:"", adresse:"", ville:"", code_postal:"",
    surface:"", type_batiment:"", annee_construction:"",
    effectifs:"", secteur_activite:"", nb_sites:"1"
  })

  const [documents, setDocuments] = useState<any[]>([])
  const [reglementationsSelectionnees, setReglementationsSelectionnees] = useState<string[]>([])

  async function saveEtape1() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from("actifs").insert([{
      user_id: user?.id,
      nom: infos.nom,
      adresse: infos.adresse,
      ville: infos.ville,
      code_postal: infos.code_postal,
      surface: parseInt(infos.surface)||0,
      type_batiment: infos.type_batiment,
      annee_construction: parseInt(infos.annee_construction)||0,
      effectifs: parseInt(infos.effectifs)||0,
      secteur_activite: infos.secteur_activite,
      nb_sites: parseInt(infos.nb_sites)||1,
      statut_analyse: "en_attente"
    }]).select()
    if (data && data[0]) {
      setActifId(data[0].id)
      setEtape(2)
    }
    setLoading(false)
  }

  async function saveEtape2() {
    setEtape(3)
  }

  async function saveEtape3() {
    if (actifId) {
      const inserts = reglementationsSelectionnees.map(r => ({
        actif_id: actifId,
        reglementation: r,
        statut: "a_evaluer",
        score: 0
      }))
      if (inserts.length > 0) {
        await supabase.from("actifs_reglementaire").insert(inserts)
      }
    }
    setEtape(4)
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"2rem"}}>
        <button onClick={() => navigate("/client/actifs")} style={{background:"white",border:"1px solid #e5e1da",padding:"0.5rem 1rem",borderRadius:"8px",cursor:"pointer",color:"#666"}}>← Retour</button>
        <h2 style={{color:"#1a3a2a"}}>Créer un actif</h2>
      </div>

      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",marginBottom:"2rem",background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        {etapes.map((e,i) => (
          <React.Fragment key={e.num}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"0.9rem",background:etape>e.num?"#2d6a4f":etape===e.num?"#1a3a2a":"#e5e1da",color:etape>=e.num?"white":"#999"}}>
                {etape>e.num?"✓":e.num}
              </div>
              <div style={{fontSize:"0.75rem",color:etape===e.num?"#1a3a2a":"#999",fontWeight:etape===e.num?"700":"400"}}>{e.label}</div>
            </div>
            {i<etapes.length-1 && <div style={{flex:1,height:"2px",background:etape>e.num?"#2d6a4f":"#e5e1da",margin:"0 0.5rem",marginBottom:"1.25rem"}}></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Étape 1 — Informations */}
      {etape===1 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"1.5rem"}}>📋 Informations du site</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Nom de l'actif *</label>
              <input value={infos.nom} onChange={e => setInfos({...infos,nom:e.target.value})} placeholder="Ex: Siège social Paris" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Adresse *</label>
              <input value={infos.adresse} onChange={e => setInfos({...infos,adresse:e.target.value})} placeholder="Adresse complète" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Ville *</label>
              <input value={infos.ville} onChange={e => setInfos({...infos,ville:e.target.value})} placeholder="Ville" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Code postal</label>
              <input value={infos.code_postal} onChange={e => setInfos({...infos,code_postal:e.target.value})} placeholder="75000" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Surface (m²) *</label>
              <input value={infos.surface} onChange={e => setInfos({...infos,surface:e.target.value})} placeholder="Ex: 2500" type="number" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Type de bâtiment *</label>
              <select value={infos.type_batiment} onChange={e => setInfos({...infos,type_batiment:e.target.value})} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",background:"white"}}>
                <option value="">Choisir...</option>
                {typesBatiments.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Année de construction</label>
              <input value={infos.annee_construction} onChange={e => setInfos({...infos,annee_construction:e.target.value})} placeholder="Ex: 1985" type="number" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Effectifs</label>
              <input value={infos.effectifs} onChange={e => setInfos({...infos,effectifs:e.target.value})} placeholder="Nombre de salariés" type="number" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Secteur d'activité</label>
              <select value={infos.secteur_activite} onChange={e => setInfos({...infos,secteur_activite:e.target.value})} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",background:"white"}}>
                <option value="">Choisir...</option>
                {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Nombre de sites</label>
              <input value={infos.nb_sites} onChange={e => setInfos({...infos,nb_sites:e.target.value})} placeholder="1" type="number" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"1.5rem"}}>
            <button onClick={saveEtape1} disabled={!infos.nom||!infos.adresse||!infos.ville||loading} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",opacity:(!infos.nom||!infos.adresse||!infos.ville)?0.5:1}}>
              {loading?"Enregistrement...":"Suivant →"}
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 — Documents */}
      {etape===2 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>📄 Upload de documents</h3>
          <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Déposez vos documents existants pour enrichir l'analyse</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
            {[
              {id:"dpe",label:"DPE",desc:"Diagnostic de Performance Énergétique"},
              {id:"audit",label:"Audit énergétique",desc:"Dernier audit réalisé"},
              {id:"bilan_carbone",label:"Bilan Carbone",desc:"Bilan GES existant"},
              {id:"plan_action",label:"Plan d'action",desc:"Plan de réduction existant"},
              {id:"rapport_csrd",label:"Rapport CSRD/ESG",desc:"Rapport durabilité"},
              {id:"factures",label:"Factures énergie",desc:"12 derniers mois"}
            ].map(doc => (
              <div key={doc.id} style={{border:"2px dashed #e5e1da",borderRadius:"12px",padding:"1.25rem",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e => (e.currentTarget.style.borderColor="#1a3a2a")}
                onMouseLeave={e => (e.currentTarget.style.borderColor="#e5e1da")}>
                <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>📄</div>
                <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem",marginBottom:"0.25rem"}}>{doc.label}</div>
                <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.75rem"}}>{doc.desc}</div>
                <div style={{fontSize:"0.75rem",color:"#0369a1"}}>Cliquer pour uploader</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"1.5rem"}}>
            <button onClick={() => setEtape(1)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
            <button onClick={saveEtape2} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>Suivant →</button>
          </div>
        </div>
      )}

      {/* Étape 3 — Réglementaire */}
      {etape===3 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>⚖️ Périmètre réglementaire</h3>
          <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Sélectionnez les réglementations applicables à votre actif</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
            {reglementations.map(r => (
              <div key={r.id} onClick={() => setReglementationsSelectionnees(prev => prev.includes(r.id) ? prev.filter(x => x!==r.id) : [...prev,r.id])}
                style={{padding:"1.25rem",borderRadius:"12px",border:`2px solid ${reglementationsSelectionnees.includes(r.id)?"#1a3a2a":"#e5e1da"}`,cursor:"pointer",background:reglementationsSelectionnees.includes(r.id)?"#f0f4f0":"white",transition:"all 0.2s"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.5rem"}}>
                  <span style={{fontSize:"1.5rem"}}>{r.icone}</span>
                  <div style={{fontWeight:"700",color:"#1a3a2a"}}>{r.label}</div>
                  {reglementationsSelectionnees.includes(r.id) && <span style={{marginLeft:"auto",color:"#2d6a4f",fontWeight:"700"}}>✓</span>}
                </div>
                <div style={{fontSize:"0.8rem",color:"#666"}}>{r.desc}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"1.5rem"}}>
            <button onClick={() => setEtape(2)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
            <button onClick={saveEtape3} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>Analyser →</button>
          </div>
        </div>
      )}

      {/* Étape 4 — Score climatique */}
      {etape===4 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>🌡️ Score climatique</h3>
          <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Analyse en cours...</p>
          <div style={{textAlign:"center",padding:"2rem"}}>
            <div style={{fontSize:"5rem",fontWeight:"800",color:"#d97706"}}>72</div>
            <div style={{color:"#666",marginBottom:"1.5rem"}}>Score climatique global</div>
            <div style={{background:"#f0f0f0",borderRadius:"999px",height:"16px",overflow:"hidden",marginBottom:"2rem"}}>
              <div style={{background:"linear-gradient(90deg,#2d6a4f,#d97706,#b91c1c)",width:"72%",height:"100%",borderRadius:"999px"}}></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
              {[
                {label:"Risque physique",score:65,color:"#d97706"},
                {label:"Risque transition",score:80,color:"#b91c1c"},
                {label:"Résilience",score:72,color:"#2d6a4f"}
              ].map((s,i) => (
                <div key={i} style={{background:"#f8f7f4",padding:"1rem",borderRadius:"8px"}}>
                  <div style={{fontSize:"1.75rem",fontWeight:"800",color:s.color}}>{s.score}</div>
                  <div style={{fontSize:"0.8rem",color:"#666",marginTop:"0.25rem"}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"1.5rem"}}>
            <button onClick={() => setEtape(3)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
            <button onClick={() => setEtape(5)} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>Voir le rapport →</button>
          </div>
        </div>
      )}

      {/* Étape 5 — Rapport */}
      {etape===5 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{textAlign:"center",padding:"2rem"}}>
            <div style={{fontSize:"4rem",marginBottom:"1rem"}}>✅</div>
            <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>Analyse complétée !</h3>
            <p style={{color:"#666",marginBottom:"2rem"}}>Votre actif a été créé et analysé avec succès.</p>
            <div style={{display:"flex",gap:"1rem",justifyContent:"center"}}>
              <button onClick={() => navigate("/client/actifs")} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>Voir mes actifs</button>
              <button onClick={() => navigate("/client")} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>Mon compte</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}