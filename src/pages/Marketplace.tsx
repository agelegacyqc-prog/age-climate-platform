import React, { useState } from "react"
import { supabase } from "../lib/supabase"

const partenaires = [
  {id:1,nom:"BatExpert Sud-Ouest",type:"diagnostiqueur",ville:"Dax",note:4.8,avis:124,specialites:["RGA","PPRI","Feux"],disponible:true,prix:"À partir de 350€"},
  {id:2,nom:"Cabinet Risques & Patrimoine",type:"bureau_etudes",ville:"Pau",note:4.6,avis:89,specialites:["RGA","Submersion"],disponible:true,prix:"À partir de 800€"},
  {id:3,nom:"Rénov Climat 40",type:"artisan",ville:"Mont-de-Marsan",note:4.9,avis:203,specialites:["Travaux RGA","Drainage"],disponible:false,prix:"Sur devis"},
  {id:4,nom:"Fonds Barnier Conseil",type:"financeur",ville:"Bordeaux",note:4.7,avis:56,specialites:["Fonds Barnier","Subventions"],disponible:true,prix:"Gratuit"},
  {id:5,nom:"GéoRisk Expertise",type:"diagnostiqueur",ville:"Bayonne",note:4.5,avis:78,specialites:["PPRI","Tempête"],disponible:true,prix:"À partir de 280€"},
  {id:6,nom:"Sud Bâtiment Résilience",type:"artisan",ville:"Tarbes",note:4.8,avis:167,specialites:["Isolation","Surélévation"],disponible:true,prix:"Sur devis"}
]

const managers = [
  {type:"Climate Risk Manager",desc:"Analyse et gestion des risques climatiques physiques et de transition",icone:"🌡️",competences:["RCP scenarios","VaR climatique","TCFD"]},
  {type:"Climate Data Manager",desc:"Collecte, traitement et valorisation des données climatiques",icone:"📊",competences:["Data climate","ESG metrics","Reporting"]},
  {type:"Climate Prevention Manager",desc:"Prévention des risques naturels et adaptation des actifs",icone:"🛡️",competences:["RGA","PPRI","Plan adaptation"]},
  {type:"Climate Adaptation Manager",desc:"Stratégies d'adaptation au changement climatique",icone:"🌱",competences:["Stratégie climat","Résilience","Territoire"]},
  {type:"Climate Engineering Manager",desc:"Solutions techniques d'adaptation et de résilience",icone:"⚙️",competences:["Génie civil","Travaux adaptation","Diagnostic"]},
  {type:"ESG / Compliance Manager",desc:"Conformité réglementaire et reporting ESG/CSRD",icone:"📋",competences:["CSRD","ESRS","Taxonomie UE"]}
]

const typeColor:any = {
  diagnostiqueur:{bg:"#e0f2fe",color:"#0369a1",label:"Diagnostiqueur"},
  bureau_etudes:{bg:"#ede9fe",color:"#7c3aed",label:"Bureau études"},
  artisan:{bg:"#fef3c7",color:"#d97706",label:"Artisan"},
  financeur:{bg:"#dcfce7",color:"#2d6a4f",label:"Financeur"}
}

const formats = ["Mission ponctuelle","Assistance technique","Régie long terme","Programme multi-sites"]
const urgences = ["Standard (4-6 semaines)","Urgent (2-3 semaines)","Très urgent (< 1 semaine)"]
const secteurs = ["Assurance","Banque","Immobilier","Collectivité","Industrie","Autre"]

export default function Marketplace() {
  const [onglet, setOnglet] = useState("partenaires")
  const [filtre, setFiltre] = useState("tous")
  const [recherche, setRecherche] = useState("")
  const [managerSelectionne, setManagerSelectionne] = useState("")
  const [formData, setFormData] = useState({
    societe:"", secteur:"", type_manager:"", format_mission:"",
    urgence:"", description:"", contact_nom:"", contact_email:"", contact_telephone:""
  })
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState("")

  const partenairesAffiches = partenaires.filter(p => {
    if (filtre !== "tous" && p.type !== filtre) return false
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase()) && !p.ville.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  async function handleSubmit() {
    if (!formData.societe || !formData.contact_email || !formData.type_manager) {
      setErreur("Veuillez remplir les champs obligatoires : société, type de manager et email.")
      return
    }
    setLoading(true)
    setErreur("")
    const { error } = await supabase.from("missions").insert([{...formData, statut:"nouvelle", phase:1}])
    if (error) {
      setErreur("Erreur lors de l'envoi. Veuillez réessayer.")
    } else {
      setSucces(true)
      setFormData({societe:"",secteur:"",type_manager:"",format_mission:"",urgence:"",description:"",contact_nom:"",contact_email:"",contact_telephone:""})
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{color:"#1a3a2a",marginBottom:"0.25rem"}}>🛒 Marketplace</h2>
        <p style={{color:"#666",fontSize:"0.9rem"}}>Partenaires et consulting climat</p>
      </div>
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
        {[{id:"partenaires",label:"🔧 Partenaires"},{id:"consulting",label:"🌍 Consulting Climat"}].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{padding:"0.6rem 1.5rem",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"0.95rem",background:onglet===o.id?"#1a3a2a":"white",color:onglet===o.id?"white":"#666",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>{o.label}</button>
        ))}
      </div>

      {onglet==="partenaires" && (
        <div>
          <div style={{background:"white",padding:"1rem 1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:"1.5rem",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un partenaire ou une ville..." style={{flex:1,padding:"0.6rem 1rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",minWidth:"200px"}} />
            <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
              {[{id:"tous",label:"Tous"},{id:"diagnostiqueur",label:"🔍 Diagnostiqueurs"},{id:"bureau_etudes",label:"📐 Bureaux études"},{id:"artisan",label:"🔨 Artisans"},{id:"financeur",label:"💰 Financeurs"}].map(t => (
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
        </div>
      )}

      {onglet==="consulting" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"}}>
            {managers.map((m,i) => (
              <div key={i} onClick={() => setManagerSelectionne(m.type)} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",border:managerSelectionne===m.type?"2px solid #1a3a2a":"2px solid transparent",transition:"all 0.2s"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.75rem"}}>{m.icone}</div>
                <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem",fontSize:"0.95rem"}}>{m.type}</h3>
                <p style={{color:"#666",fontSize:"0.8rem",marginBottom:"0.75rem",lineHeight:"1.5"}}>{m.desc}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
                  {m.competences.map((c,j) => (
                    <span key={j} style={{background:"#f0f4f0",color:"#2d6a4f",padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.7rem",fontWeight:"600"}}>{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>📋 Demande de mission</h3>
            <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Décrivez votre besoin — notre équipe vous recontacte sous 48h</p>

            {succes ? (
              <div style={{background:"#dcfce7",padding:"2rem",borderRadius:"12px",textAlign:"center"}}>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>✅</div>
                <h3 style={{color:"#2d6a4f",marginBottom:"0.5rem"}}>Demande envoyée !</h3>
                <p style={{color:"#666"}}>Notre équipe vous recontacte sous 48h ouvrées.</p>
                <button onClick={() => setSucces(false)} style={{marginTop:"1rem",background:"#1a3a2a",color:"white",border:"none",padding:"0.75rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>Nouvelle demande</button>
              </div>
            ) : (
              <div>
                {erreur && <div style={{background:"#fee2e2",color:"#b91c1c",padding:"0.75rem",borderRadius:"8px",marginBottom:"1rem",fontSize:"0.9rem"}}>{erreur}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Société *</label>
                    <input value={formData.societe} onChange={e => setFormData({...formData,societe:e.target.value})} placeholder="Nom de votre société" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Secteur</label>
                    <select value={formData.secteur} onChange={e => setFormData({...formData,secteur:e.target.value})} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",background:"white"}}>
                      <option value="">Choisir...</option>
                      {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Type de manager *</label>
                    <select value={formData.type_manager||managerSelectionne} onChange={e => setFormData({...formData,type_manager:e.target.value})} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",background:"white"}}>
                      <option value="">Choisir...</option>
                      {managers.map(m => <option key={m.type} value={m.type}>{m.icone} {m.type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Format mission</label>
                    <select value={formData.format_mission} onChange={e => setFormData({...formData,format_mission:e.target.value})} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",background:"white"}}>
                      <option value="">Choisir...</option>
                      {formats.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Niveau urgence</label>
                    <select value={formData.urgence} onChange={e => setFormData({...formData,urgence:e.target.value})} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",background:"white"}}>
                      <option value="">Choisir...</option>
                      {urgences.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Contact nom</label>
                    <input value={formData.contact_nom} onChange={e => setFormData({...formData,contact_nom:e.target.value})} placeholder="Votre nom" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Email *</label>
                    <input value={formData.contact_email} onChange={e => setFormData({...formData,contact_email:e.target.value})} placeholder="votre@email.com" type="email" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
                  </div>
                  <div>
                    <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Téléphone</label>
                    <input value={formData.contact_telephone} onChange={e => setFormData({...formData,contact_telephone:e.target.value})} placeholder="06 XX XX XX XX" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
                  </div>
                </div>
                <div style={{marginBottom:"1.5rem"}}>
                  <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Description du besoin</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData,description:e.target.value})} placeholder="Décrivez votre projet, vos objectifs, le contexte..." rows={4} style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none",resize:"vertical"}} />
                </div>
                <button onClick={handleSubmit} disabled={loading} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"1rem",width:"100%"}}>
                  {loading ? "Envoi en cours..." : "Envoyer ma demande →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}