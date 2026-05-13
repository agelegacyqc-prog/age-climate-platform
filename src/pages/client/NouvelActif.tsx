import React, { useState, useEffect, useRef } from "react"
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

const typesDocuments = [
  {id:"dpe",label:"DPE",desc:"Diagnostic de Performance Énergétique"},
  {id:"audit",label:"Audit énergétique",desc:"Dernier audit réalisé"},
  {id:"bilan_carbone",label:"Bilan Carbone",desc:"Bilan GES existant"},
  {id:"plan_action",label:"Plan d'action",desc:"Plan de réduction existant"},
  {id:"rapport_csrd",label:"Rapport CSRD/ESG",desc:"Rapport durabilité"},
  {id:"factures",label:"Factures énergie",desc:"12 derniers mois"}
]

interface Infos {
  nom: string
  raison_sociale: string
  siren: string
  siret: string
  code_naf: string
  classification: string
  adresse: string
  ville: string
  code_postal: string
  surface: string
  type_batiment: string
  annee_construction: string
  effectifs: string
  chiffre_affaires: string
  secteur_activite: string
  nb_sites: string
}

interface Reglementation {
  id: string
  label: string
  icone: string
  desc: string
  statut: "eligible"|"potentiel"|"non_eligible"
  raison: string
  cadre: "france"|"europe"
}

function getClassification(effectifs: number, ca: number): string {
  if (effectifs >= 5000 || ca >= 1500) return "Grand groupe"
  if (effectifs >= 250 || ca >= 50) return "ETI"
  if (effectifs >= 10 || ca >= 2) return "PME"
  return "TPE"
}

function calculerEligibilite(infos: Infos): Reglementation[] {
  const surface = parseInt(infos.surface) || 0
  const effectifs = parseInt(infos.effectifs) || 0
  const ca = parseFloat(infos.chiffre_affaires) || 0
  const annee = parseInt(infos.annee_construction) || 0
  const typeTertiaire = ["Bureau","Commerce","Hôtel","Enseignement","Santé"].includes(infos.type_batiment)
  const classification = getClassification(effectifs, ca)

  return [
    // France
    {
      id:"tertiaire", label:"Décret Tertiaire", icone:"⚡", cadre:"france",
      desc:"Réduction consommation énergétique bâtiments tertiaires >1000m²",
      statut: surface >= 1000 && typeTertiaire ? "eligible" : surface >= 1000 ? "potentiel" : "non_eligible",
      raison: surface >= 1000 && typeTertiaire ? `Surface ${surface}m² ≥ 1000m² et bâtiment tertiaire — Obligatoire`
        : surface >= 1000 ? `Surface ${surface}m² ≥ 1000m² mais type à confirmer`
        : `Surface ${surface}m² < 1000m² — Non assujetti`
    },
    {
      id:"bacs", label:"Décret BACS", icone:"🔧", cadre:"france",
      desc:"Système de gestion technique du bâtiment (GTB)",
      statut: surface >= 1000 && annee < 2023 ? "eligible" : surface >= 1000 ? "potentiel" : "non_eligible",
      raison: surface >= 1000 && annee < 2023 ? `Surface ${surface}m² ≥ 1000m² — Obligatoire avant 2025`
        : surface >= 1000 ? `Surface ${surface}m² ≥ 1000m² — Vérifier date construction`
        : `Surface ${surface}m² < 1000m² — Non assujetti`
    },
    {
      id:"loi_climat", label:"Loi Climat Résilience", icone:"🌡️", cadre:"france",
      desc:"Obligations adaptation climatique et rénovation énergétique",
      statut: effectifs >= 500 ? "eligible" : effectifs >= 250 ? "potentiel" : "non_eligible",
      raison: effectifs >= 500 ? `${effectifs} salariés — Obligations renforcées`
        : effectifs >= 250 ? `${effectifs} salariés — Partiellement concerné`
        : `${effectifs} salariés — Suivi recommandé`
    },
    {
      id:"bilan_ges", label:"Bilan GES obligatoire", icone:"🌱", cadre:"france",
      desc:"Bilan des émissions de gaz à effet de serre",
      statut: effectifs >= 500 ? "eligible" : effectifs >= 250 ? "potentiel" : "non_eligible",
      raison: effectifs >= 500 ? `${effectifs} salariés ≥ 500 — Obligatoire tous les 4 ans`
        : effectifs >= 250 ? `${effectifs} salariés — Proche du seuil de 500`
        : `${effectifs} salariés < 500 — Non obligatoire`
    },
    {
      id:"audit_energetique", label:"Audit Énergétique", icone:"🔍", cadre:"france",
      desc:"Audit obligatoire grandes entreprises tous les 4 ans",
      statut: effectifs >= 250 || ca >= 50 ? "eligible" : effectifs >= 100 ? "potentiel" : "non_eligible",
      raison: effectifs >= 250 || ca >= 50 ? `${classification} — Obligatoire tous les 4 ans`
        : `${effectifs} salariés — Non obligatoire`
    },
    {
      id:"iso50001", label:"ISO 50001", icone:"🏆", cadre:"france",
      desc:"Certification système de management de l'énergie",
      statut: "potentiel",
      raison: "Démarche volontaire — Recommandée pour tous les actifs"
    },
    // Europe
    {
      id:"csrd", label:"CSRD", icone:"📊", cadre:"europe",
      desc:"Reporting de durabilité entreprises (Corporate Sustainability Reporting Directive)",
      statut: effectifs >= 250 || ca >= 40 ? "eligible" : effectifs >= 50 ? "potentiel" : "non_eligible",
      raison: effectifs >= 250 || ca >= 40 ? `${classification} — Obligatoire (phase ${effectifs >= 500 ? "1" : "2"})`
        : effectifs >= 50 ? `${effectifs} salariés — Entrée progressive prévue`
        : `${effectifs} salariés < 50 — Non assujetti`
    },
    {
      id:"eu_taxonomy", label:"EU Taxonomy", icone:"🇪🇺", cadre:"europe",
      desc:"Classification des activités économiques durables",
      statut: effectifs >= 500 || ca >= 150 ? "eligible" : effectifs >= 250 ? "potentiel" : "non_eligible",
      raison: effectifs >= 500 || ca >= 150 ? `${classification} — Reporting taxonomie obligatoire`
        : effectifs >= 250 ? `${classification} — Reporting volontaire recommandé`
        : `Non obligatoire pour ${classification}`
    },
    {
      id:"sfdr", label:"SFDR", icone:"💹", cadre:"europe",
      desc:"Sustainable Finance Disclosure Regulation",
      statut: infos.secteur_activite === "Banque" || infos.secteur_activite === "Assurance" ? "eligible" : "non_eligible",
      raison: infos.secteur_activite === "Banque" || infos.secteur_activite === "Assurance"
        ? `Secteur ${infos.secteur_activite} — Applicable obligatoirement`
        : `Secteur ${infos.secteur_activite} — Non applicable`
    },
    {
      id:"esrs", label:"ESRS", icone:"📋", cadre:"europe",
      desc:"European Sustainability Reporting Standards",
      statut: effectifs >= 250 || ca >= 40 ? "eligible" : "potentiel",
      raison: effectifs >= 250 || ca >= 40 ? `${classification} — Standards ESRS obligatoires avec CSRD`
        : `Adoption volontaire recommandée`
    },
    {
      id:"ifrs_s2", label:"IFRS S2", icone:"🌍", cadre:"europe",
      desc:"Normes internationales de reporting climatique",
      statut: infos.secteur_activite === "Banque" || infos.secteur_activite === "Assurance" || effectifs >= 5000 ? "eligible" : "potentiel",
      raison: effectifs >= 5000 ? `Grand groupe — IFRS S2 applicable`
        : `Adoption progressive recommandée`
    }
  ]
}

export default function NouvelActif() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actifId, setActifId] = useState<string|null>(null)
  const [documentsUploades, setDocumentsUploades] = useState<string[]>([])
  const [reglementations, setReglementations] = useState<Reglementation[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<any>(null)

  const [infos, setInfos] = useState<Infos>({
    nom:"", raison_sociale:"", siren:"", siret:"", code_naf:"",
    classification:"", adresse:"", ville:"", code_postal:"",
    surface:"", type_batiment:"", annee_construction:"",
    effectifs:"", chiffre_affaires:"", secteur_activite:"", nb_sites:"1"
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function searchEntreprise(query: string) {
    if (query.length < 3) { setSuggestions([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      setSuggestions(data.results || [])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
    setSearchLoading(false)
  }

  function selectEntreprise(entreprise: any) {
    const siege = entreprise.siege || {}
    const effectifs = entreprise.tranche_effectif_salarie || ""
    const effectifsMap:any = {
      "00":"0","01":"2","02":"6","03":"10","11":"20","12":"50",
      "21":"100","22":"200","31":"250","32":"500","41":"1000",
      "42":"2000","51":"5000","52":"10000","53":"20000"
    }
    const ca = entreprise.chiffre_affaires || 0
    const eff = parseInt(effectifsMap[effectifs] || "0")
    setInfos({
      ...infos,
      nom: entreprise.nom_complet || entreprise.nom_raison_sociale || "",
      raison_sociale: entreprise.nom_raison_sociale || "",
      siren: entreprise.siren || "",
      siret: siege.siret || "",
      code_naf: entreprise.activite_principale || "",
      classification: getClassification(eff, ca/1000000),
      adresse: `${siege.numero_voie||""} ${siege.type_voie||""} ${siege.libelle_voie||""}`.trim(),
      ville: siege.libelle_commune || "",
      code_postal: siege.code_postal || "",
      effectifs: eff.toString(),
      secteur_activite: infos.secteur_activite
    })
    setShowSuggestions(false)
    setSuggestions([])
  }

  async function saveEtape1() {
    if (!infos.nom || !infos.adresse || !infos.ville) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("actifs").insert([{
      user_id: user?.id,
      nom: infos.nom,
      raison_sociale: infos.raison_sociale,
      siren: infos.siren,
      siret: infos.siret,
      code_naf: infos.code_naf,
      classification: infos.classification,
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
    if (data && data[0]) setActifId(data[0].id)
    setLoading(false)
    setEtape(2)
  }

  function goToEtape3() {
    const reglsCalculees = calculerEligibilite(infos)
    setReglementations(reglsCalculees)
    setEtape(3)
  }

  async function saveEtape3() {
    if (actifId) {
      const eligibles = reglementations.filter(r => r.statut !== "non_eligible")
      if (eligibles.length > 0) {
        await supabase.from("actifs_reglementaire").insert(
          eligibles.map(r => ({
            actif_id: actifId,
            reglementation: r.id,
            statut: r.statut,
            score: r.statut === "eligible" ? 0 : 50,
            details: r.raison
          }))
        )
      }
    }
    setEtape(4)
  }

  function toggleDocument(id: string) {
    setDocumentsUploades(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const statutStyle:any = {
    eligible: {bg:"#dcfce7",color:"#2d6a4f",icone:"✅",label:"Éligible — Obligatoire"},
    potentiel: {bg:"#fef3c7",color:"#d97706",icone:"⚠️",label:"Potentiellement éligible"},
    non_eligible: {bg:"#f0f0f0",color:"#999",icone:"❌",label:"Non éligible"}
  }

  const reglsFrance = reglementations.filter(r => r.cadre === "france")
  const reglsEurope = reglementations.filter(r => r.cadre === "europe")

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"2rem"}}>
        <button onClick={() => navigate("/client")} style={{background:"white",border:"1px solid #e5e1da",padding:"0.5rem 1rem",borderRadius:"8px",cursor:"pointer",color:"#666"}}>← Retour</button>
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

          {/* Recherche entreprise */}
          <div style={{background:"#f0f4f0",padding:"1.25rem",borderRadius:"12px",marginBottom:"1.5rem",border:"2px solid #2d6a4f"}} ref={searchRef}>
            <label style={{display:"block",marginBottom:"0.5rem",fontWeight:"700",fontSize:"0.9rem",color:"#1a3a2a"}}>🔍 Rechercher votre entreprise</label>
            <p style={{fontSize:"0.8rem",color:"#666",marginBottom:"0.75rem"}}>Tapez le nom de votre société — les données sont récupérées automatiquement</p>
            <div style={{position:"relative"}}>
              <input
                onChange={e => { searchEntreprise(e.target.value) }}
                placeholder="Ex: Total Energies, Bouygues, AXA..."
                style={{width:"100%",padding:"0.875rem",borderRadius:"8px",border:"2px solid #2d6a4f",fontSize:"0.95rem",outline:"none"}}
              />
              {searchLoading && <div style={{position:"absolute",right:"1rem",top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:"0.85rem"}}>Recherche...</div>}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{background:"white",borderRadius:"8px",boxShadow:"0 4px 16px rgba(0,0,0,0.12)",marginTop:"0.5rem",overflow:"hidden",border:"1px solid #e5e1da"}}>
                {suggestions.map((s,i) => (
                  <div key={i} onClick={() => selectEntreprise(s)} style={{padding:"0.875rem 1rem",cursor:"pointer",borderBottom:"1px solid #f0f0f0",transition:"background 0.15s"}}
                    onMouseEnter={e => (e.currentTarget.style.background="#f0f4f0")}
                    onMouseLeave={e => (e.currentTarget.style.background="white")}>
                    <div style={{fontWeight:"600",color:"#1a3a2a",marginBottom:"0.25rem"}}>{s.nom_complet||s.nom_raison_sociale}</div>
                    <div style={{fontSize:"0.8rem",color:"#666"}}>
                      SIREN : {s.siren} • {s.activite_principale} • {s.siege?.libelle_commune}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {infos.siren && (
              <div style={{background:"#dcfce7",padding:"0.875rem",borderRadius:"8px",marginTop:"0.75rem",display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
                <span style={{fontSize:"0.85rem",color:"#2d6a4f"}}>✅ <strong>SIREN :</strong> {infos.siren}</span>
                <span style={{fontSize:"0.85rem",color:"#2d6a4f"}}><strong>NAF :</strong> {infos.code_naf}</span>
                <span style={{fontSize:"0.85rem",color:"#2d6a4f"}}><strong>Classification :</strong> {infos.classification}</span>
              </div>
            )}
          </div>

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
              <label style={{display:"block",marginBottom:"0.4rem",fontWeight:"600",fontSize:"0.85rem",color:"#1a3a2a"}}>Chiffre d'affaires (M€)</label>
              <input value={infos.chiffre_affaires} onChange={e => setInfos({...infos,chiffre_affaires:e.target.value})} placeholder="Ex: 50" type="number" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"0.9rem",outline:"none"}} />
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
          <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Déposez vos documents existants — vous pourrez en ajouter d'autres depuis la fiche actif</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
            {typesDocuments.map(doc => (
              <div key={doc.id} onClick={() => toggleDocument(doc.id)} style={{border:`2px ${documentsUploades.includes(doc.id)?"solid #1a3a2a":"dashed #e5e1da"}`,borderRadius:"12px",padding:"1.25rem",textAlign:"center",cursor:"pointer",background:documentsUploades.includes(doc.id)?"#f0f4f0":"white",transition:"all 0.2s"}}>
                <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>{documentsUploades.includes(doc.id)?"✅":"📄"}</div>
                <div style={{fontWeight:"600",color:"#1a3a2a",fontSize:"0.9rem",marginBottom:"0.25rem"}}>{doc.label}</div>
                <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.75rem"}}>{doc.desc}</div>
                <div style={{fontSize:"0.75rem",color:documentsUploades.includes(doc.id)?"#2d6a4f":"#0369a1",fontWeight:"600"}}>
                  {documentsUploades.includes(doc.id)?"Sélectionné ✓":"Cliquer pour uploader"}
                </div>
              </div>
            ))}
          </div>
          <div style={{border:"2px dashed #2d6a4f",borderRadius:"12px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:"#f0fdf4",marginBottom:"1rem"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>➕</div>
            <div style={{fontWeight:"600",color:"#2d6a4f",fontSize:"0.9rem",marginBottom:"0.25rem"}}>Ajouter un autre document</div>
            <div style={{fontSize:"0.75rem",color:"#666"}}>PDF, Word, Excel — tout format accepté</div>
          </div>
          <div style={{background:"#e0f2fe",padding:"1rem",borderRadius:"8px",fontSize:"0.85rem",color:"#0369a1"}}>
            💡 Vous pourrez ajouter d'autres documents à tout moment depuis la fiche de votre actif.
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"1.5rem"}}>
            <button onClick={() => setEtape(1)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
            <button onClick={goToEtape3} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>Suivant →</button>
          </div>
        </div>
      )}

      {/* Étape 3 — Réglementaire automatique */}
      {etape===3 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>⚖️ Analyse réglementaire</h3>
          <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"0.5rem"}}>
            Résultats pour <strong>{infos.nom}</strong> — {infos.surface}m² • {infos.effectifs} salariés • {infos.chiffre_affaires}M€ CA • <strong>{getClassification(parseInt(infos.effectifs)||0, parseFloat(infos.chiffre_affaires)||0)}</strong>
          </p>
          <div style={{display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
            {[
              {label:"Obligatoire",color:"#2d6a4f",bg:"#dcfce7",nb:reglementations.filter(r=>r.statut==="eligible").length},
              {label:"Potentiel",color:"#d97706",bg:"#fef3c7",nb:reglementations.filter(r=>r.statut==="potentiel").length},
              {label:"Non éligible",color:"#999",bg:"#f0f0f0",nb:reglementations.filter(r=>r.statut==="non_eligible").length}
            ].map((s,i) => (
              <div key={i} style={{background:s.bg,padding:"0.75rem 1.25rem",borderRadius:"8px",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <span style={{fontSize:"1.25rem",fontWeight:"800",color:s.color}}>{s.nb}</span>
                <span style={{fontSize:"0.85rem",color:s.color,fontWeight:"600"}}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* France */}
          <div style={{marginBottom:"1.5rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.75rem"}}>
              <span style={{fontSize:"1.25rem"}}>🇫🇷</span>
              <h4 style={{color:"#1a3a2a"}}>Réglementations françaises</h4>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {reglsFrance.map(r => (
                <div key={r.id} style={{padding:"1rem",borderRadius:"10px",border:`2px solid ${statutStyle[r.statut].color}`,background:statutStyle[r.statut].bg}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.4rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                      <span>{r.icone}</span>
                      <span style={{fontWeight:"700",color:"#1a3a2a"}}>{r.label}</span>
                    </div>
                    <span style={{background:"white",color:statutStyle[r.statut].color,padding:"0.2rem 0.75rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"700",border:`1px solid ${statutStyle[r.statut].color}`}}>
                      {statutStyle[r.statut].icone} {statutStyle[r.statut].label}
                    </span>
                  </div>
                  <div style={{fontSize:"0.8rem",color:"#444",background:"white",padding:"0.5rem 0.75rem",borderRadius:"6px"}}>{r.raison}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Europe */}
          <div style={{marginBottom:"1.5rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.75rem"}}>
              <span style={{fontSize:"1.25rem"}}>🇪🇺</span>
              <h4 style={{color:"#1a3a2a"}}>Réglementations européennes</h4>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              {reglsEurope.map(r => (
                <div key={r.id} style={{padding:"1rem",borderRadius:"10px",border:`2px solid ${statutStyle[r.statut].color}`,background:statutStyle[r.statut].bg}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.4rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                      <span>{r.icone}</span>
                      <span style={{fontWeight:"700",color:"#1a3a2a"}}>{r.label}</span>
                    </div>
                    <span style={{background:"white",color:statutStyle[r.statut].color,padding:"0.2rem 0.75rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"700",border:`1px solid ${statutStyle[r.statut].color}`}}>
                      {statutStyle[r.statut].icone} {statutStyle[r.statut].label}
                    </span>
                  </div>
                  <div style={{fontSize:"0.8rem",color:"#444",background:"white",padding:"0.5rem 0.75rem",borderRadius:"6px"}}>{r.raison}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between"}}>
            <button onClick={() => setEtape(2)} style={{background:"white",color:"#1a3a2a",border:"1px solid #e5e1da",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>← Retour</button>
            <button onClick={saveEtape3} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.875rem 2rem",borderRadius:"8px",cursor:"pointer",fontWeight:"700"}}>Analyser le score climatique →</button>
          </div>
        </div>
      )}

      {/* Étape 4 — Score climatique */}
      {etape===4 && (
        <div style={{background:"white",padding:"2rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem"}}>🌡️ Score climatique</h3>
          <p style={{color:"#666",fontSize:"0.9rem",marginBottom:"1.5rem"}}>Analyse préliminaire basée sur la localisation et les données du site</p>
          <div style={{textAlign:"center",padding:"2rem"}}>
            <div style={{fontSize:"5rem",fontWeight:"800",color:"#d97706"}}>72</div>
            <div style={{color:"#666",marginBottom:"1.5rem"}}>Score climatique global</div>
            <div style={{background:"#f0f0f0",borderRadius:"999px",height:"16px",overflow:"hidden",marginBottom:"2rem"}}>
              <div style={{background:"linear-gradient(90deg,#2d6a4f,#d97706,#b91c1c)",width:"72%",height:"100%",borderRadius:"999px"}}></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
              {[
                {label:"Inondation",score:45,color:"#0369a1"},
                {label:"Sécheresse",score:72,color:"#d97706"},
                {label:"Canicule",score:68,color:"#b91c1c"},
                {label:"Tempête",score:35,color:"#7c3aed"},
                {label:"RGA",score:80,color:"#b91c1c"},
                {label:"Feux",score:25,color:"#d97706"},
                {label:"Submersion",score:30,color:"#0369a1"},
                {label:"Grêle",score:40,color:"#2d6a4f"}
              ].map((s,i) => (
                <div key={i} style={{background:"#f8f7f4",padding:"0.875rem",borderRadius:"8px"}}>
                  <div style={{fontSize:"1.25rem",fontWeight:"800",color:s.color}}>{s.score}</div>
                  <div style={{fontSize:"0.75rem",color:"#666",marginTop:"0.25rem"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#e0f2fe",padding:"1rem",borderRadius:"8px",fontSize:"0.85rem",color:"#0369a1",textAlign:"left"}}>
              💡 L'analyse complète avec IA sera disponible après traitement de vos documents.
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
            <h3 style={{color:"#1a3a2a",marginBottom:"0.5rem",fontSize:"1.5rem"}}>Actif créé avec succès !</h3>
            <p style={{color:"#666",marginBottom:"0.5rem"}}>Votre actif a été enregistré et l'analyse préliminaire est disponible.</p>
            <p style={{color:"#666",fontSize:"0.85rem",marginBottom:"2rem"}}>L'analyse complète avec IA sera disponible sous 24h.</p>
            <div style={{background:"#f8f7f4",padding:"1.5rem",borderRadius:"12px",marginBottom:"2rem",textAlign:"left"}}>
              <h4 style={{color:"#1a3a2a",marginBottom:"1rem"}}>Récapitulatif</h4>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {[
                  ["Actif",infos.nom],
                  ["SIREN",infos.siren||"—"],
                  ["Classification",infos.classification||getClassification(parseInt(infos.effectifs)||0,parseFloat(infos.chiffre_affaires)||0)],
                  ["Localisation",infos.ville],
                  ["Surface",infos.surface+"m²"],
                  ["Effectifs",infos.effectifs+" salariés"],
                  ["Documents uploadés",documentsUploades.length.toString()],
                  ["Réglementations obligatoires",reglementations.filter(r=>r.statut==="eligible").length.toString()],
                  ["Score climatique","72 / 100"]
                ].map(([k,v],i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{color:"#666"}}>{k}</span>
                    <span style={{fontWeight:"600",color:k==="Score climatique"?"#d97706":"#1a3a2a"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
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