import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ScoreGeorisques from "../../components/ScoreGeorisques"

const statutReglColor:any = {
  eligible:    { bg:"#F0FDF4", color:"#2F7D5C", label:"Obligatoire",  icone:"ti-circle-check" },
  potentiel:   { bg:"#FFFBEB", color:"#D97706", label:"Potentiel",    icone:"ti-alert-triangle" },
  non_eligible:{ bg:"#F4F3F0", color:"#6B7280", label:"Non éligible", icone:"ti-circle-x" },
  a_evaluer:   { bg:"#F0F9FF", color:"#0369A1", label:"À évaluer",    icone:"ti-search" },
}

const reglLabels:any = {
  tertiaire:"Décret Tertiaire", bacs:"Décret BACS", csrd:"CSRD",
  bilan_carbone:"Bilan Carbone GES", iso50001:"ISO 50001",
  audit_energetique:"Audit Énergétique", eu_taxonomy:"EU Taxonomy",
  sfdr:"SFDR", esrs:"ESRS", ifrs_s2:"IFRS S2",
  loi_climat:"Loi Climat Résilience", bilan_ges:"Bilan GES",
}

const reglIcones:any = {
  tertiaire:"ti-bolt", bacs:"ti-tool", csrd:"ti-chart-bar",
  bilan_carbone:"ti-leaf", iso50001:"ti-award", audit_energetique:"ti-search",
  eu_taxonomy:"ti-globe", sfdr:"ti-trending-up", esrs:"ti-clipboard-list",
  ifrs_s2:"ti-world", loi_climat:"ti-thermometer", bilan_ges:"ti-plant-2",
}

const typesDocuments = [
  { id:"dpe",          label:"DPE",              desc:"Diagnostic de Performance Énergétique" },
  { id:"audit",        label:"Audit énergétique", desc:"Dernier audit réalisé" },
  { id:"bilan_carbone",label:"Bilan Carbone",     desc:"Bilan GES existant" },
  { id:"plan_action",  label:"Plan d'action",     desc:"Plan de réduction existant" },
  { id:"rapport_csrd", label:"Rapport CSRD/ESG",  desc:"Rapport durabilité" },
  { id:"factures",     label:"Factures énergie",  desc:"12 derniers mois" },
]

export default function FicheActif() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Récupération de la route d'origine transmise via state (React Router v6)
  const from = (location.state as { from?: string } | null)?.from ?? "/client/accueil"

  const [actif, setActif]                       = useState<any>(null)
  const [reglementations, setReglementations]   = useState<any[]>([])
  const [documents, setDocuments]               = useState<any[]>([])
  const [rapports, setRapports]                 = useState<any[]>([])
  const [demandes, setDemandes]                 = useState<any[]>([])
  const [loading, setLoading]                   = useState(true)
  const [onglet, setOnglet]                     = useState("synthese")
  const [ajoutDoc, setAjoutDoc]                 = useState(false)
  const [typeDocSelectionne, setTypeDocSelectionne] = useState("")
  const [uploadingDoc, setUploadingDoc]         = useState(false)
  const [erreurUpload, setErreurUpload]         = useState("")
  const [photoUrl, setPhotoUrl]                 = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto]     = useState(false)
  const [erreurPhoto, setErreurPhoto]           = useState("")

  useEffect(() => { loadActif() }, [id])

  async function loadActif() {
    const { data: actifData } = await supabase.from("actifs").select("*").eq("id", id).single()
    const { data: reglData }  = await supabase.from("actifs_reglementaire").select("*").eq("actif_id", id)
    const { data: docData }   = await supabase.from("actifs_documents").select("*").eq("actif_id", id)
    const { data: { user } }  = await supabase.auth.getUser()

    const [{ data: rapportsData }, { data: demandesData }] = await Promise.all([
      supabase.from("rapports_client").select("id, statut, type_rapport").eq("actif_id", id).eq("statut", "disponible"),
      supabase.from("demandes_marketplace").select("id").eq("actif_id", id).eq("client_id", user?.id || ""),
    ])

    setActif(actifData)

    // Charger la photo du bâtiment
    if (actifData?.photo_batiment) {
      const { data: urlData } = await supabase.storage
        .from("documents-clients")
        .createSignedUrl(actifData.photo_batiment, 60 * 60 * 24)
      if (urlData?.signedUrl) setPhotoUrl(urlData.signedUrl)
    }

    setReglementations(reglData || [])
    setDocuments(docData || [])
    setRapports(rapportsData || [])
    setDemandes(demandesData || [])
    setLoading(false)
  }

  async function lancerAnalyseReglementaire() {
    if (!actif) return

    const echeancesMap: Record<string, string> = {
      tertiaire:"2026-09-30", bacs:"2026-01-01", audit_energetique:"2026-11-01",
      csrd:"2026-12-31", eu_taxonomy:"2026-12-31", sfdr:"2026-06-30",
      esrs:"2026-12-31", ifrs_s2:"2026-12-31", iso50001:"2026-12-31",
      loi_climat:"2026-12-31", bilan_ges:"2026-12-31",
    }

    const surface   = actif.surface || 0
    const effectifs = actif.effectifs || 0
    const ca        = actif.chiffre_affaires || 0
    const annee     = actif.annee_construction || 0
    const typeTertiaire = ["Bureau","Commerce","Hôtel","Enseignement","Santé"].includes(actif.type_batiment)
    const secteur   = actif.secteur_activite || ""

    const reglsCalculees = [
      { id:"tertiaire",         statut: surface >= 1000 && typeTertiaire ? "eligible" : surface >= 1000 ? "potentiel" : "non_eligible" },
      { id:"bacs",              statut: surface >= 1000 && annee < 2023 ? "eligible" : surface >= 1000 ? "potentiel" : "non_eligible" },
      { id:"loi_climat",        statut: effectifs >= 500 ? "eligible" : effectifs >= 250 ? "potentiel" : "non_eligible" },
      { id:"bilan_ges",         statut: effectifs >= 500 ? "eligible" : effectifs >= 250 ? "potentiel" : "non_eligible" },
      { id:"audit_energetique", statut: effectifs >= 250 || ca >= 50 ? "eligible" : effectifs >= 100 ? "potentiel" : "non_eligible" },
      { id:"iso50001",          statut: "potentiel" },
      { id:"csrd",              statut: effectifs >= 250 || ca >= 40 ? "eligible" : effectifs >= 50 ? "potentiel" : "non_eligible" },
      { id:"eu_taxonomy",       statut: effectifs >= 500 || ca >= 150 ? "eligible" : effectifs >= 250 ? "potentiel" : "non_eligible" },
      { id:"sfdr",              statut: secteur === "Banque" || secteur === "Assurance" ? "eligible" : "non_eligible" },
      { id:"esrs",              statut: effectifs >= 250 || ca >= 40 ? "eligible" : "potentiel" },
      { id:"ifrs_s2",           statut: secteur === "Banque" || secteur === "Assurance" || effectifs >= 5000 ? "eligible" : "potentiel" },
    ]

    const eligibles = reglsCalculees.filter(r => r.statut !== "non_eligible")
    await supabase.from("actifs_reglementaire").delete().eq("actif_id", actif.id)

    if (eligibles.length > 0) {
      await supabase.from("actifs_reglementaire").insert(
        eligibles.map(r => ({
          actif_id:       actif.id,
          reglementation: r.id,
          statut:         r.statut,
          echeance:       echeancesMap[r.id] || null,
        }))
      )
    }

    await loadActif()
  }

  async function uploadPhoto(file: File) {
    if (!actif) return
    const maxSize = 5 * 1024 * 1024
    const formats = ["image/jpeg", "image/png", "image/webp", "image/heic"]

    if (file.size > maxSize) { setErreurPhoto("La photo ne doit pas dépasser 5 Mo."); return }
    if (!formats.includes(file.type)) { setErreurPhoto("Format accepté : jpg, png, webp, heic."); return }

    setUploadingPhoto(true)
    setErreurPhoto("")

    try {
      const ext  = file.name.split(".").pop()
      const path = `actifs/${actif.id}/photo_batiment.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("documents-clients")
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      await supabase.from("actifs").update({ photo_batiment: path }).eq("id", actif.id)

      const { data: urlData } = await supabase.storage
        .from("documents-clients")
        .createSignedUrl(path, 60 * 60 * 24)
      if (urlData?.signedUrl) setPhotoUrl(urlData.signedUrl)
    } catch (err: any) {
      setErreurPhoto(err.message || "Erreur lors de l'upload.")
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function uploadDocument(file: File, typeDocument: string) {
    if (!actif || !typeDocument) return
    setUploadingDoc(true)
    setErreurUpload("")
    const path = `actifs/${actif.id}/${typeDocument}/${file.name}`
    const { error: uploadError } = await supabase.storage.from("documents-clients").upload(path, file, { upsert: true })
    if (uploadError) {
      console.error("Upload error:", uploadError)
      setErreurUpload("Erreur lors de l'upload. Veuillez réessayer.")
      setUploadingDoc(false)
      return
    }
    await supabase.from("actifs_documents").insert({
      actif_id:      actif.id,
      nom:           file.name,
      type_document: typeDocument,
      url:           path,
    })
    await loadActif()
    setUploadingDoc(false)
    setAjoutDoc(false)
    setTypeDocSelectionne("")
  }

  if (loading) return <div style={{padding:"2rem",color:"#666"}}>Chargement...</div>
  if (!actif)  return <div style={{padding:"2rem",color:"#666"}}>Actif introuvable</div>

  const nbObligatoires = reglementations.filter(r => r.statut==="eligible").length
  const scoreColor = (actif.score_climatique||0) >= 70 ? "#b91c1c" : (actif.score_climatique||0) >= 40 ? "#d97706" : "#2d6a4f"

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>

        {/* Photo + infos */}
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", background: "white", borderRadius: "12px", border: "1px solid #E2DDD8", overflow: "hidden", marginBottom: "16px" }}>

          {/* Zone photo */}
          <div style={{ position: "relative", width: "280px", minHeight: "180px", flexShrink: 0, background: "#F4F3F0" }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={actif.nom}
                style={{ width: "280px", height: "180px", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "280px", height: "180px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#9CA3AF" }}>
                <i className="ti ti-building" style={{ fontSize: "36px" }} />
                <span style={{ fontSize: "12px" }}>Aucune photo</span>
              </div>
            )}

            {/* Bouton upload photo */}
            <label style={{
              position: "absolute", bottom: "8px", right: "8px",
              display: "flex", alignItems: "center", gap: "5px",
              background: "rgba(0,0,0,0.6)", color: "white",
              padding: "5px 10px", borderRadius: "6px",
              fontSize: "11px", fontWeight: 500, cursor: "pointer",
              backdropFilter: "blur(4px)",
            }}>
              <i className="ti ti-camera" style={{ fontSize: "13px" }} />
              {uploadingPhoto ? "Upload…" : photoUrl ? "Modifier" : "Ajouter une photo"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]) }}
              />
            </label>
          </div>

          {/* Infos principales */}
          <div style={{ flex: 1, padding: "20px 20px 20px 0", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  {/* ── Bouton Retour corrigé ── */}
                  <button
                    onClick={() => navigate(from)}
                    style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: "12px", cursor: "pointer", padding: 0, marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}
                  >
                    <i className="ti ti-arrow-left" style={{ fontSize: "12px" }} />
                    Retour
                  </button>
                  <h2 style={{ color: "#111827", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>{actif.nom}</h2>
                  <p style={{ color: "#6B7280", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className="ti ti-map-pin" style={{ fontSize: "13px" }} />
                    {actif.adresse} — {actif.ville} {actif.code_postal}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ background: "#FEF2F2", color: "#B91C1C", padding: "6px 14px", borderRadius: "999px", fontWeight: 700, fontSize: "15px", fontFamily: "JetBrains Mono, monospace" }}>
                    {actif.score_climatique || "—"}/100
                  </span>
                  <span style={{ background: "#FFFBEB", color: "#D97706", padding: "6px 12px", borderRadius: "999px", fontWeight: 500, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: "12px" }} />
                    En attente d'analyse
                  </span>
                </div>
              </div>
            </div>

            {/* Infos rapides */}
            <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
              {[
                { icon: "ti-ruler-2", label: actif.surface + " m²" },
                { icon: "ti-users",   label: actif.effectifs + " salariés" },
                { icon: "ti-building",label: actif.type_batiment || "—" },
                { icon: "ti-calendar",label: actif.annee_construction || "—" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6B7280" }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: "13px" }} />
                  {item.label}
                </div>
              ))}
            </div>

            {/* Erreur photo */}
            {erreurPhoto && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#B91C1C", display: "flex", alignItems: "center", gap: "4px" }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: "12px" }} />
                {erreurPhoto}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs rapides */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
        {[
          { label:"Surface",                     val: actif.surface+"m²",         icone:"ti-ruler-2" },
          { label:"Effectifs",                   val: actif.effectifs+" salariés", icone:"ti-users" },
          { label:"Réglementations obligatoires",val: nbObligatoires.toString(),   icone:"ti-scale" },
          { label:"Documents",                   val: documents.length.toString(), icone:"ti-file-text" },
        ].map((k,i) => (
          <div key={i} style={{background:"white",padding:"1.25rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <i className={`ti ${k.icone}`} style={{fontSize:"20px",color:"#B25C2A",marginBottom:"0.25rem",display:"block"}} />
            <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.25rem"}}>{k.label}</div>
            <div style={{fontSize:"1.5rem",fontWeight:"800",color:"#111827"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem"}}>
        {[
          { id:"synthese",      label:"Synthèse",      icon:"ti-layout-list" },
          { id:"reglementaire", label:"Réglementaire", icon:"ti-scale" },
          { id:"climatique",    label:"Climatique",    icon:"ti-thermometer" },
          { id:"documents",     label:"Documents",     icon:"ti-file-text" },
          { id:"roadmap",       label:"Roadmap",       icon:"ti-map-2" },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:500,fontSize:"13px",background:onglet===o.id?"#B25C2A":"white",color:onglet===o.id?"white":"#6B7280",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
            <i className={`ti ${o.icon}`} style={{fontSize:"14px"}} />
            {o.label}
          </button>
        ))}
      </div>

      {/* Onglet Synthèse */}
      {onglet==="synthese" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#111827",marginBottom:"1rem"}}>Informations du site</h3>
            {[
              ["Nom",actif.nom],
              ["Type",actif.type_batiment||"—"],
              ["Surface",actif.surface+"m²"],
              ["Année construction",actif.annee_construction||"—"],
              ["Secteur",actif.secteur_activite||"—"],
              ["Effectifs",actif.effectifs+" salariés"],
              ["Nb sites",actif.nb_sites||1],
            ].map(([k,v],i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                <span style={{color:"#666",fontSize:"0.9rem"}}>{k}</span>
                <span style={{fontWeight:"600",color:"#111827",fontSize:"0.9rem"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{color:"#111827",marginBottom:"1rem"}}>Réglementations</h3>
              {reglementations.length === 0 ? (
                <p style={{color:"#666",fontSize:"0.9rem"}}>Aucune réglementation analysée</p>
              ) : (
                reglementations.map((r,i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:"0.9rem",color:"#111827",display:"flex",alignItems:"center",gap:"6px"}}>
                      <i className={`ti ${reglIcones[r.reglementation]}`} style={{fontSize:"15px",color:statutReglColor[r.statut]?.color||"#6B7280"}} />
                      {reglLabels[r.reglementation]||r.reglementation}
                    </span>
                    <span style={{background:statutReglColor[r.statut]?.bg||"#f0f0f0",color:statutReglColor[r.statut]?.color||"#666",padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.75rem",fontWeight:"600"}}>
                      <i className={`ti ${statutReglColor[r.statut]?.icone}`} style={{fontSize:"11px"}} />
                      {statutReglColor[r.statut]?.label||r.statut}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{color:"#111827",marginBottom:"1rem"}}>Score climatique</h3>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"3.5rem",fontWeight:"800",color:scoreColor}}>{actif.score_climatique||"—"}</div>
                {actif.score_climatique && (
                  <div style={{background:"#f0f0f0",borderRadius:"999px",height:"10px",overflow:"hidden",margin:"0.75rem 0"}}>
                    <div style={{background:scoreColor,width:actif.score_climatique+"%",height:"100%",borderRadius:"999px"}}></div>
                  </div>
                )}
                <div style={{fontSize:"0.85rem",color:"#666"}}>Analyse préliminaire</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Réglementaire */}
      {onglet==="reglementaire" && (
        <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
            <h3 style={{color:"#111827",margin:0}}>⚖️ Analyse réglementaire détaillée</h3>
            <button onClick={lancerAnalyseReglementaire} style={{display:"flex",alignItems:"center",gap:"6px",background:"#B25C2A",color:"white",border:"none",padding:"7px 14px",borderRadius:"7px",cursor:"pointer",fontSize:"13px",fontFamily:"inherit"}}>
              <i className="ti ti-refresh" style={{fontSize:"14px"}} aria-hidden="true" />
              {reglementations.length === 0 ? "Lancer l'analyse" : "Relancer l'analyse"}
            </button>
          </div>
          {reglementations.length === 0 ? (
            <div style={{textAlign:"center",padding:"2rem",color:"#666"}}>
              <p>Aucune réglementation analysée pour cet actif.</p>
              <p style={{fontSize:"0.85rem"}}>Cliquez sur "Lancer l'analyse" pour démarrer.</p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {reglementations.map((r,i) => (
                <div key={i} style={{padding:"1.25rem",borderRadius:"12px",border:`2px solid ${statutReglColor[r.statut]?.color||"#e5e1da"}`,background:statutReglColor[r.statut]?.bg||"#f0f0f0"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <i className={`ti ${reglIcones[r.reglementation]}`} style={{fontSize:"20px",color:statutReglColor[r.statut]?.color||"#6B7280"}} />
                      <div style={{fontWeight:"700",color:"#111827",fontSize:"1rem"}}>{reglLabels[r.reglementation]||r.reglementation}</div>
                    </div>
                    <span style={{background:"white",color:statutReglColor[r.statut]?.color||"#666",padding:"0.3rem 0.875rem",borderRadius:"999px",fontSize:"0.8rem",fontWeight:"700",border:`1px solid ${statutReglColor[r.statut]?.color||"#e5e1da"}`}}>
                      <i className={`ti ${statutReglColor[r.statut]?.icone}`} style={{fontSize:"11px"}} />
                      {statutReglColor[r.statut]?.label||r.statut}
                    </span>
                  </div>
                  {r.details && (
                    <div style={{fontSize:"0.85rem",color:"#444",background:"white",padding:"0.75rem",borderRadius:"8px"}}>{r.details}</div>
                  )}
                  {r.echeance && (
                    <div style={{fontSize:"0.8rem",color:"#666",marginTop:"0.5rem"}}>
                      <i className="ti ti-calendar" style={{fontSize:"13px"}} /> Échéance : {new Date(r.echeance).toLocaleDateString("fr-FR")}
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
            score_risque={actif.score_climatique||0}
            niveau_risque={actif.score_climatique>=70?"eleve":actif.score_climatique>=40?"moyen":"faible"}
          />
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <h3 style={{color:"#111827",marginBottom:"1rem"}}>Détail des risques</h3>
            {[
              { label:"Risque physique",   score:65, color:"#d97706", desc:"Exposition aux aléas climatiques" },
              { label:"Risque transition", score:80, color:"#b91c1c", desc:"Impact de la transition énergétique" },
              { label:"Résilience",        score:72, color:"#2d6a4f", desc:"Capacité d'adaptation du site" },
            ].map((s,i) => (
              <div key={i} style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.25rem"}}>
                  <span style={{fontWeight:"600",color:"#111827",fontSize:"0.9rem"}}>{s.label}</span>
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
            <h3 style={{color:"#111827"}}>📄 Documents ({documents.length})</h3>
            <button onClick={() => setAjoutDoc(!ajoutDoc)} style={{background:"#1a3a2a",color:"white",border:"none",padding:"0.6rem 1.25rem",borderRadius:"8px",cursor:"pointer",fontWeight:"600"}}>
              {ajoutDoc ? "Annuler" : "+ Ajouter un document"}
            </button>
          </div>

          {ajoutDoc && (
            <div style={{background:"#f8f7f4",padding:"1.5rem",borderRadius:"12px",marginBottom:"1.5rem",border:"1px solid #e5e1da"}}>
              <h4 style={{color:"#111827",marginBottom:"1rem"}}>Ajouter un document</h4>

              {erreurUpload && (
                <div style={{display:"flex",alignItems:"center",gap:"8px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",fontSize:"13px",color:"#991B1B"}}>
                  <i className="ti ti-alert-triangle" style={{fontSize:"15px"}} aria-hidden="true" />{erreurUpload}
                </div>
              )}

              <div style={{marginBottom:"12px"}}>
                <label style={{display:"block",fontSize:"11px",fontWeight:600,color:"#94A3B8",textTransform:"uppercase" as const,letterSpacing:"0.07em",marginBottom:"6px"}}>Type de document *</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginBottom:"1rem"}}>
                  {typesDocuments.map(doc => (
                    <div key={doc.id} onClick={() => setTypeDocSelectionne(doc.id)}
                      style={{border:`2px solid ${typeDocSelectionne === doc.id ? "#0F6E56" : "#e5e1da"}`,borderRadius:"8px",padding:"1rem",textAlign:"center",cursor:"pointer",background:typeDocSelectionne === doc.id ? "#ECFDF5" : "white",transition:"all 0.12s"}}>
                      <i className="ti ti-file" style={{fontSize:"20px",color:typeDocSelectionne === doc.id ? "#0F6E56" : "#94A3B8",display:"block",marginBottom:"6px"}} aria-hidden="true" />
                      <div style={{fontWeight:600,color:typeDocSelectionne === doc.id ? "#065F46" : "#1a3a2a",fontSize:"12px",marginBottom:"3px"}}>{doc.label}</div>
                      <div style={{fontSize:"11px",color:"#64748B"}}>{doc.desc}</div>
                    </div>
                  ))}
                </div>
                <div onClick={() => setTypeDocSelectionne("autre")}
                  style={{border:`2px solid ${typeDocSelectionne === "autre" ? "#0F6E56" : "#e5e1da"}`,borderRadius:"8px",padding:"1rem",textAlign:"center",cursor:"pointer",background:typeDocSelectionne === "autre" ? "#ECFDF5" : "white",transition:"all 0.12s",marginTop:"8px"}}>
                  <i className="ti ti-plus" style={{fontSize:"20px",color:typeDocSelectionne === "autre" ? "#0F6E56" : "#94A3B8",display:"block",marginBottom:"6px"}} aria-hidden="true" />
                  <div style={{fontWeight:600,color:typeDocSelectionne === "autre" ? "#065F46" : "#1a3a2a",fontSize:"12px",marginBottom:"3px"}}>Autre document</div>
                  <div style={{fontSize:"11px",color:"#64748B"}}>PDF, Word, Excel</div>
                </div>
              </div>

              {typeDocSelectionne && (
                <label style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 16px",borderRadius:"8px",border:"none",background:"#0F6E56",color:"white",fontSize:"13px",fontWeight:500,cursor:"pointer",width:"fit-content"}}>
                  <i className="ti ti-upload" style={{fontSize:"15px"}} aria-hidden="true" />
                  {uploadingDoc ? "Upload en cours…" : "Choisir un fichier"}
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg"
                    onChange={e => { if (e.target.files?.[0]) uploadDocument(e.target.files[0], typeDocSelectionne) }} />
                </label>
              )}

              <button onClick={() => { setAjoutDoc(false); setTypeDocSelectionne(""); setErreurUpload("") }}
                style={{display:"block",marginTop:"10px",background:"none",border:"none",color:"#64748B",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
                Annuler
              </button>
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
                      <div style={{fontWeight:"600",color:"#111827"}}>{d.nom}</div>
                      <div style={{fontSize:"0.8rem",color:"#666"}}>{d.type_document}</div>
                    </div>
                  </div>
                  {d.url && (
                    <button onClick={async () => {
                      const { data } = await supabase.storage.from("documents-clients").createSignedUrl(d.url, 3600)
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank")
                    }} style={{background:"white",color:"#111827",border:"1px solid #e5e1da",padding:"0.4rem 1rem",borderRadius:"6px",cursor:"pointer",fontSize:"0.8rem",fontWeight:"600"}}>
                      Voir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Roadmap */}
      {onglet==="roadmap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(() => {
            const etapes = [
              { id: "enregistrement", label: "Enregistrement de l'actif", done: true },
              { id: "reglementaire",  label: "Analyse réglementaire",     done: reglementations.length > 0 },
              { id: "scoring",        label: "Score climatique",           done: (actif.score_climatique || 0) > 0 },
            ]
            const nbDone = etapes.filter(e => e.done).length
            const pct    = Math.round((nbDone / etapes.length) * 100)

            const onglets: Record<string, string> = {
              reglementaire: "reglementaire",
              scoring:       "climatique",
            }

            return (
              <>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Progression de l'actif</div>
                    <span style={{ fontSize: "12px", color: "#64748B" }}>{nbDone} / {etapes.length} étapes</span>
                  </div>
                  <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "8px", overflow: "hidden", marginBottom: "4px" }}>
                    <div style={{ background: "#B25C2A", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>{pct} % complété</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {etapes.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: e.done ? "#ECFDF5" : "#F8FAFC", borderRadius: "8px", border: `1px solid ${e.done ? "#A7F3D0" : "#E2E8F0"}` }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: e.done ? "#0F6E56" : "#E2E8F0" }}>
                        {e.done
                          ? <i className="ti ti-check" style={{ fontSize: "12px", color: "white" }} aria-hidden="true" />
                          : <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8" }}>{i + 1}</span>
                        }
                      </div>
                      <span style={{ flex: 1, fontSize: "13px", color: e.done ? "#065F46" : "#0F172A", fontWeight: e.done ? 500 : 400 }}>{e.label}</span>
                      {e.done
                        ? <span style={{ fontSize: "11px", color: "#065F46" }}>Complété</span>
                        : (onglets[e.id]) && (
                          <button onClick={() => setOnglet(onglets[e.id])} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", border: "none", background: "#B25C2A", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
                            Démarrer
                          </button>
                        )
                      }
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      )}

    </div>
  )
}