import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface DossierRGAResume {
  id: string
  type_mission: string
  statut: string
  statut_updated_at: string
}

interface AleaGeorisques {
  label: string
  present: boolean
  statutAdresse: string | null
  score: number
  icone: string
  poids: number
}

const EXPOSITION_STYLE: Record<string, { label: string; couleur: string; bg: string; icone: string }> = {
  forte:      { label: "Exposition forte",   couleur: "#B91C1C", bg: "#FEF2F2", icone: "ti-alert-octagon" },
  moyenne:    { label: "Exposition moyenne", couleur: "#D97706", bg: "#FFF7ED", icone: "ti-alert-triangle" },
  faible:     { label: "Exposition faible",  couleur: "#0369A1", bg: "#EFF6FF", icone: "ti-info-circle" },
  non_expose: { label: "Non exposé",         couleur: "#78716C", bg: "#F8F7F4", icone: "ti-circle-check" },
}

const STATUT_RGA_LABEL: Record<string, string> = {
  dossier_ouvert: "Dossier ouvert",
  eligibilite_en_cours: "Vérification d'éligibilité en cours",
  eligible_confirme: "Éligibilité confirmée",
  non_eligible: "Non éligible au dispositif",
  dossier_etudes_a_constituer: "Constitution du dossier Études",
  complement_demande: "Complément de pièces demandé",
  dossier_etudes_depose: "Dossier déposé en DDT",
  aide_etudes_accordee: "Aide Études accordée",
  diagnostic_en_cours: "Diagnostic de vulnérabilité en cours",
  diagnostic_valide: "Diagnostic validé",
  diagnostic_non_concluant: "Diagnostic non concluant",
  dossier_travaux_a_constituer: "Constitution du dossier Travaux",
  dossier_travaux_depose: "Dossier Travaux déposé en DDT",
  aide_travaux_accordee: "Aide Travaux accordée",
  travaux_en_cours: "Travaux en cours",
  reception_travaux: "Réception des travaux",
  dossier_cloture: "Dossier clôturé",
}

const STATUT_RGA_COULEUR: Record<string, { bg: string; border: string; texte: string; icone: string }> = {
  dossier_ouvert: { bg: "#F8F7F4", border: "#E5E1DA", texte: "#78716C", icone: "ti-folder" },
  eligibilite_en_cours: { bg: "#FFF7ED", border: "#D97706", texte: "#92400E", icone: "ti-hourglass" },
  eligible_confirme: { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  non_eligible: { bg: "#FEF2F2", border: "#B91C1C", texte: "#7F1D1D", icone: "ti-circle-x" },
  complement_demande: { bg: "#FFF7ED", border: "#D97706", texte: "#92400E", icone: "ti-alert-triangle" },
  dossier_etudes_a_constituer: { bg: "#F8F7F4", border: "#78716C", texte: "#44403C", icone: "ti-clipboard-list" },
  dossier_etudes_depose: { bg: "#EFF6FF", border: "#0369A1", texte: "#1E3A5F", icone: "ti-send" },
  aide_etudes_accordee: { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  diagnostic_en_cours: { bg: "#EFF6FF", border: "#0369A1", texte: "#1E3A5F", icone: "ti-search" },
  diagnostic_valide: { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  diagnostic_non_concluant: { bg: "#FEF2F2", border: "#B91C1C", texte: "#7F1D1D", icone: "ti-circle-x" },
  dossier_travaux_a_constituer: { bg: "#F8F7F4", border: "#78716C", texte: "#44403C", icone: "ti-clipboard-list" },
  dossier_travaux_depose: { bg: "#EFF6FF", border: "#0369A1", texte: "#1E3A5F", icone: "ti-send" },
  aide_travaux_accordee: { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-circle-check" },
  travaux_en_cours: { bg: "#FFF7ED", border: "#D97706", texte: "#92400E", icone: "ti-tools" },
  reception_travaux: { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-home-check" },
  dossier_cloture: { bg: "#ECFDF5", border: "#1D9E75", texte: "#065F46", icone: "ti-archive" },
}

const MISSION_LABEL: Record<string, string> = {
  amo: "AMO Études", moe: "MOE Travaux", amo_moe: "AMO + MOE",
}

const ALEAS_CONFIG = [
  { key: "retraitGonflementArgile", label: "Retrait-gonflement des argiles", icone: "ti-layers",    poids: 35 },
  { key: "inondation",              label: "Inondation",                     icone: "ti-waves",     poids: 20 },
  { key: "remonteeNappe",           label: "Remontée de nappe",              icone: "ti-droplet",   poids: 15 },
  { key: "feuForet",                label: "Feux de forêt",                  icone: "ti-flame",     poids: 15 },
  { key: "mouvementTerrain",        label: "Mouvements de terrain",          icone: "ti-mountain",  poids: 10 },
  { key: "seisme",                  label: "Séisme",                         icone: "ti-wave-sine", poids: 5  },
]

function scoreStatut(statut: string | null): number {
  if (!statut) return 0
  const s = statut.toLowerCase()
  if (s.includes("important") || s.includes("fort")) return 100
  if (s.includes("modéré") || s.includes("moyen"))   return 65
  if (s.includes("faible"))                           return 35
  if (s.includes("existant") && !s.includes("non connu") && !s.includes("inconnu")) return 50
  return 0
}

async function fetchGeorisques(adresse: string, codePostal: string, ville: string): Promise<{
  exposition: "forte" | "moyenne" | "faible" | "non_expose"
  score_climatique: number
  aleas: AleaGeorisques[]
}> {
  try {
    // Géocodage
    const geoRes  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse + " " + codePostal + " " + ville)}&limit=1`)
    const geoData = await geoRes.json()
    const feature = geoData.features?.[0]
    if (!feature) return { exposition: "non_expose", score_climatique: 0, aleas: [] }
    const [lon, lat] = feature.geometry.coordinates

    // Appel via Edge Function (évite CORS/HTTP2)
    const { data: { session } } = await supabase.auth.getSession()
    const proxyRes = await fetch(
      "https://vkclvfsblsjpuycjfiso.supabase.co/functions/v1/georisques-proxy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ lon, lat }),
      }
    )

    if (!proxyRes.ok) return { exposition: "non_expose", score_climatique: 0, aleas: [] }
    const proxyData = await proxyRes.json()

    // Exposition RGA
    let exposition: "forte" | "moyenne" | "faible" | "non_expose" = "non_expose"
    const code = proxyData?.rga?.codeExposition
    if (code === "3")      exposition = "forte"
    else if (code === "2") exposition = "moyenne"
    else if (code === "1") exposition = "faible"

    // Aléas
    let aleas: AleaGeorisques[] = []
    let score_climatique = 0
    const rn = proxyData?.risques?.risquesNaturels || {}
    let scoreTotal = 0

    for (const cfg of ALEAS_CONFIG) {
      const alea    = rn[cfg.key]
      const present = alea?.present || false
      const statut  = alea?.libelleStatutAdresse || null
      const score   = present ? scoreStatut(statut) : 0
      scoreTotal   += (score * cfg.poids) / 100
      aleas.push({ label: cfg.label, present, statutAdresse: statut, score, icone: cfg.icone, poids: cfg.poids })
    }
    score_climatique = Math.round(scoreTotal)

    return { exposition, score_climatique, aleas }
  } catch {
    return { exposition: "non_expose", score_climatique: 0, aleas: [] }
  }
}

export default function FicheActifParticulier() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const from     = (location.state as { from?: string } | null)?.from ?? "/client/actifs"

  const [actif, setActif]       = useState<any>(null)
  const [dossiers, setDossiers] = useState<DossierRGAResume[]>([])
  const [nbDocs, setNbDocs]     = useState(0)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [onglet, setOnglet]     = useState("synthese")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [erreurPhoto, setErreurPhoto]       = useState("")

  const [aleas, setAleas]                     = useState<AleaGeorisques[]>([])
  const [scoreClimatique, setScoreClimatique] = useState(0)
  const [expositionRGA, setExpositionRGA]     = useState<string | null>(null)
  const [loadingGeo, setLoadingGeo]           = useState(false)

  useEffect(() => { if (id) charger(id) }, [id])

  async function charger(actifId: string) {
    const { data: actifData } = await supabase.from("actifs").select("*").eq("id", actifId).single()
    if (!actifData) { setLoading(false); return }
    setActif(actifData)

    if (actifData.photo_batiment) {
      const { data: urlData } = await supabase.storage.from("documents-clients").createSignedUrl(actifData.photo_batiment, 86400)
      if (urlData?.signedUrl) setPhotoUrl(urlData.signedUrl)
    }

    const { data: dossiersData } = await supabase
      .from("dossiers_rga").select("id, type_mission, statut, statut_updated_at")
      .eq("actif_id", actifId).is("archived_at", null).order("created_at", { ascending: false })
    setDossiers((dossiersData || []) as DossierRGAResume[])

    if (dossiersData && dossiersData.length > 0) {
      const { count } = await supabase.from("documents_rga").select("id", { count: "exact", head: true }).in("dossier_id", dossiersData.map(d => d.id))
      setNbDocs(count || 0)
    }

  setLoading(false)

    // Lire georisques_data depuis la base
    if (actifData.georisques_data && Object.keys(actifData.georisques_data).length > 0) {
      const rn = actifData.georisques_data?.risquesNaturels || {}
      const aleasCalcules: AleaGeorisques[] = []
      let scoreTotal = 0

      for (const cfg of ALEAS_CONFIG) {
        const alea    = rn[cfg.key]
        const present = alea?.present || false
        const statut  = alea?.libelleStatutAdresse || null
        const score   = present ? scoreStatut(statut) : 0
        scoreTotal   += (score * cfg.poids) / 100
        aleasCalcules.push({ label: cfg.label, present, statutAdresse: statut, score, icone: cfg.icone, poids: cfg.poids })
      }

      setAleas(aleasCalcules)
      setScoreClimatique(Math.round(scoreTotal))
      setExpositionRGA(actifData.exposition_rga || "non_expose")
    } else if (actifData.adresse && actifData.code_postal && actifData.ville) {
      // Fallback : appel direct navigateur si pas de données stockées
      setLoadingGeo(true)
      const result = await fetchGeorisques(actifData.adresse, actifData.code_postal, actifData.ville)
      setAleas(result.aleas)
      setScoreClimatique(result.score_climatique)
      setExpositionRGA(result.exposition)
      await supabase.from("actifs").update({
        exposition_rga:   result.exposition,
        score_climatique: result.score_climatique,
        georisques_data:  { risquesNaturels: {} },
      }).eq("id", actifId)
      setLoadingGeo(false)
    }
  }

  async function uploadPhoto(file: File) {
    if (!actif) return
    if (file.size > 5 * 1024 * 1024) { setErreurPhoto("La photo ne doit pas dépasser 5 Mo."); return }
    setUploadingPhoto(true); setErreurPhoto("")
    try {
      const path = `actifs/${actif.id}/photo_batiment.${file.name.split(".").pop()}`
      const { error } = await supabase.storage.from("documents-clients").upload(path, file, { upsert: true })
      if (error) throw error
      await supabase.from("actifs").update({ photo_batiment: path }).eq("id", actif.id)
      const { data: urlData } = await supabase.storage.from("documents-clients").createSignedUrl(path, 86400)
      if (urlData?.signedUrl) setPhotoUrl(urlData.signedUrl)
    } catch (err: any) {
      setErreurPhoto(err.message || "Erreur lors de l'upload.")
    } finally { setUploadingPhoto(false) }
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  if (!actif)  return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Actif introuvable.</div>

  const expoAffichee = expositionRGA || actif.exposition_rga || "non_expose"
  const scoreAffiche = scoreClimatique || actif.score_climatique || 0
  const expo         = EXPOSITION_STYLE[expoAffichee]
  const scoreColor   = scoreAffiche >= 70 ? "#B91C1C" : scoreAffiche >= 45 ? "#D97706" : "#1D9E75"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* En-tête */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "stretch" }}>

          {/* Photo */}
          <div style={{ position: "relative", width: "260px", minHeight: "180px", flexShrink: 0, background: "#F8F7F4" }}>
            {photoUrl
              ? <img src={photoUrl} alt={actif.nom} style={{ width: "260px", height: "180px", objectFit: "cover", display: "block" }} />
              : <div style={{ width: "260px", height: "180px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#C4BDB6" }}>
                  <i className="ti ti-home" style={{ fontSize: "40px" }} aria-hidden="true" />
                  <span style={{ fontSize: "12px" }}>Aucune photo</span>
                </div>
            }
            <label style={{ position: "absolute", bottom: "8px", right: "8px", display: "flex", alignItems: "center", gap: "5px", background: "rgba(0,0,0,0.55)", color: "white", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 500, cursor: "pointer" }}>
              <i className="ti ti-camera" style={{ fontSize: "12px" }} aria-hidden="true" />
              {uploadingPhoto ? "Upload…" : photoUrl ? "Modifier" : "Ajouter"}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]) }} />
            </label>
          </div>

          {/* Infos */}
          <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <button onClick={() => navigate(from)} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "#94A3B8", fontSize: "12px", cursor: "pointer", padding: 0, marginBottom: "8px", fontFamily: "inherit" }}>
                <i className="ti ti-arrow-left" style={{ fontSize: "12px" }} aria-hidden="true" /> Retour
              </button>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", margin: 0, marginBottom: "4px", letterSpacing: "-0.02em" }}>{actif.nom}</h2>
              <div style={{ fontSize: "13px", color: "#64748B", display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
                <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true" />
                {actif.adresse} — {actif.code_postal} {actif.ville}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {expo && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: expo.couleur, background: expo.bg, padding: "3px 10px", borderRadius: "4px", border: `1px solid ${expo.couleur}30`, display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className={`ti ${expo.icone}`} style={{ fontSize: "12px" }} aria-hidden="true" />{expo.label}
                  </span>
                )}
                {actif.type_bien && (
                  <span style={{ fontSize: "11px", color: "#78716C", background: "#F8F7F4", padding: "3px 10px", borderRadius: "4px", border: "1px solid #E5E1DA" }}>
                    {actif.type_bien === "maison" ? "Maison individuelle" : "Appartement"}
                  </span>
                )}
                {loadingGeo && (
                  <span style={{ fontSize: "11px", color: "#0369A1", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className="ti ti-loader-2" style={{ fontSize: "12px" }} aria-hidden="true" />Analyse Géorisques…
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
              {[
                { icone: "ti-ruler-2",  val: actif.surface ? `${actif.surface} m²` : "—" },
                { icone: "ti-calendar", val: actif.annee_construction || "—" },
                { icone: "ti-files",    val: `${nbDocs} document${nbDocs > 1 ? "s" : ""}` },
                ...(actif.valeur_marche ? [{ icone: "ti-coin", val: `${parseInt(actif.valeur_marche).toLocaleString("fr-FR")} €` }] : []),
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#64748B" }}>
                  <i className={`ti ${m.icone}`} style={{ fontSize: "13px" }} aria-hidden="true" />{m.val}
                </div>
              ))}
            </div>
            {erreurPhoto && <div style={{ fontSize: "12px", color: "#B91C1C", marginTop: "8px" }}>{erreurPhoto}</div>}
          </div>

          {/* Score */}
          <div style={{ width: "100px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #E2E8F0", padding: "16px", flexShrink: 0 }}>
            {loadingGeo
              ? <i className="ti ti-loader-2" style={{ fontSize: "22px", color: "#94A3B8" }} aria-hidden="true" />
              : <>
                  <div style={{ fontSize: "32px", fontWeight: 700, color: scoreColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{scoreAffiche || "—"}</div>
                  <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px", textAlign: "center" }}>Score<br />climatique</div>
                  {scoreAffiche > 0 && (
                    <div style={{ width: "60px", height: "6px", background: "#E5E1DA", borderRadius: "3px", overflow: "hidden", marginTop: "8px" }}>
                      <div style={{ height: "100%", borderRadius: "3px", background: scoreColor, width: `${scoreAffiche}%` }} />
                    </div>
                  )}
                </>
            }
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[
          { id: "synthese",   label: "Synthèse",    icone: "ti-layout-list" },
          { id: "rga",        label: "Dossier RGA", icone: "ti-layers" },
          { id: "documents",  label: "Documents",   icone: "ti-files" },
          { id: "climatique", label: "Climatique",  icone: "ti-thermometer" },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit", transition: "all 0.12s", background: onglet === o.id ? "#B25C2A" : "#FFFFFF", color: onglet === o.id ? "white" : "#64748B", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <i className={`ti ${o.icone}`} style={{ fontSize: "14px" }} aria-hidden="true" />
            {o.label}
            {o.id === "rga" && dossiers.length > 0 && (
              <span style={{ background: onglet === o.id ? "rgba(255,255,255,0.25)" : "#FFF7ED", color: onglet === o.id ? "white" : "#B25C2A", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px" }}>{dossiers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── SYNTHÈSE ── */}
      {onglet === "synthese" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Informations du bien</div>
            {[
              { label: "Adresse",        val: `${actif.adresse}, ${actif.code_postal} ${actif.ville}` },
              { label: "Type",           val: actif.type_bien === "maison" ? "Maison individuelle" : actif.type_bien === "appartement" ? "Appartement" : actif.type_batiment || "—" },
              { label: "Surface",        val: actif.surface ? `${actif.surface} m²` : "—" },
              { label: "Construction",   val: actif.annee_construction || "—" },
              { label: "Valeur estimée", val: actif.valeur_marche ? `${parseInt(actif.valeur_marche).toLocaleString("fr-FR")} €` : "—" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "12px", color: "#78716C" }}>{row.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{row.val}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Exposition RGA</div>
              {loadingGeo
                ? <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "13px" }}><i className="ti ti-loader-2" style={{ fontSize: "15px" }} aria-hidden="true" />Analyse en cours…</div>
                : expo && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: expo.bg, borderRadius: "8px", border: `1px solid ${expo.couleur}25` }}>
                    <i className={`ti ${expo.icone}`} style={{ fontSize: "22px", color: expo.couleur }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: expo.couleur }}>{expo.label}</div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Source : Géorisques — {actif.code_postal} {actif.ville}</div>
                    </div>
                  </div>
                )
              }
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Score climatique global</div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ fontSize: "36px", fontWeight: 700, color: scoreColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                  {loadingGeo ? "…" : scoreAffiche || "—"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 8, borderRadius: "4px", background: "#E5E1DA", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "4px", background: scoreColor, width: `${scoreAffiche}%`, transition: "width 0.6s" }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
                    {scoreAffiche >= 70 ? "Risque élevé" : scoreAffiche >= 45 ? "Risque modéré" : "Risque faible"}
                  </div>
                </div>
              </div>
              <button onClick={() => setOnglet("climatique")} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "14px", background: "none", border: "none", color: "#B25C2A", fontSize: "12px", fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                Voir le détail par aléa <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOSSIER RGA ── */}
      {onglet === "rga" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {dossiers.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "40px 24px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="ti ti-layers" style={{ fontSize: "24px", color: "#B25C2A" }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucun dossier RGA en cours</div>
              <div style={{ fontSize: "13px", color: "#64748B" }}>Votre consultant AGE ouvrira votre dossier Fonds de Prévention Argile dès le démarrage de la mission.</div>
            </div>
          ) : dossiers.map(d => {
            const couleur = STATUT_RGA_COULEUR[d.statut] || STATUT_RGA_COULEUR["dossier_ouvert"]
            return (
              <div key={d.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#B25C2A", background: "#FFF7ED", padding: "3px 10px", borderRadius: "4px", border: "1px solid #F5D0B0" }}>{MISSION_LABEL[d.type_mission] || d.type_mission}</span>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>Mis à jour le {new Date(d.statut_updated_at).toLocaleDateString("fr-FR")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: couleur.bg, borderRadius: "8px", borderLeft: `3px solid ${couleur.border}`, marginBottom: "14px" }}>
                  <i className={`ti ${couleur.icone}`} style={{ fontSize: "18px", color: couleur.border }} aria-hidden="true" />
                  <div style={{ fontSize: "13px", fontWeight: 500, color: couleur.texte }}>{STATUT_RGA_LABEL[d.statut] || d.statut}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => navigate(`/client/dossier-rga/${d.id}`)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-eye" style={{ fontSize: "13px" }} aria-hidden="true" />Voir le dossier
                  </button>
                  <button onClick={() => navigate(`/client/documents-rga/${d.id}`)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-paperclip" style={{ fontSize: "13px" }} aria-hidden="true" />Documents
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {onglet === "documents" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {dossiers.length === 0
            ? <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#78716C" }}>Aucun dossier RGA — les documents seront disponibles après ouverture du dossier par votre consultant.</div>
              </div>
            : dossiers.map(d => (
              <div key={d.id} onClick={() => navigate(`/client/documents-rga/${d.id}`)} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color 0.12s" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#F5D0B0")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "10px", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-files" style={{ fontSize: "20px", color: "#B25C2A" }} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>Documents — {MISSION_LABEL[d.type_mission] || d.type_mission}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{STATUT_RGA_LABEL[d.statut] || d.statut}</div>
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: "18px", color: "#C4BDB6" }} aria-hidden="true" />
              </div>
            ))
          }
        </div>
      )}

      {/* ── CLIMATIQUE ── */}
      {onglet === "climatique" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {loadingGeo ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "40px 24px", textAlign: "center" }}>
              <i className="ti ti-loader-2" style={{ fontSize: "28px", color: "#B25C2A", marginBottom: "12px", display: "block" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", color: "#64748B" }}>Analyse Géorisques en cours…</div>
            </div>
          ) : (
            <>
              {/* Score global */}
              <div style={{ background: "#0F172A", borderRadius: "12px", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>Score climatique global</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>Moyenne pondérée — 6 aléas naturels — Source : Géorisques BRGM</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "48px", fontWeight: 700, color: scoreAffiche >= 70 ? "#F87171" : scoreAffiche >= 45 ? "#FCD34D" : "#6EE7B7", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{scoreAffiche}</div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>/ 100</div>
                </div>
              </div>

              {/* Détail aléas */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Détail par aléa</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {aleas.map((alea, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", background: alea.score >= 70 ? "#FEF2F2" : alea.score >= 35 ? "#FFF7ED" : "#F8F7F4", border: `1px solid ${alea.score >= 70 ? "#FECACA" : alea.score >= 35 ? "#FDE68A" : "#E5E1DA"}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: "8px", background: alea.score >= 70 ? "#FEE2E2" : alea.score >= 35 ? "#FEF3C7" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`ti ${alea.icone}`} style={{ fontSize: "18px", color: alea.score >= 70 ? "#B91C1C" : alea.score >= 35 ? "#D97706" : "#94A3B8" }} aria-hidden="true" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{alea.label}</div>
                        <div style={{ fontSize: "11px", color: "#78716C", marginTop: "2px" }}>
                          {alea.present ? alea.statutAdresse || "Risque présent" : "Risque non identifié à cette adresse"}
                        </div>
                        <div style={{ height: 4, borderRadius: "2px", background: "#E5E1DA", overflow: "hidden", marginTop: "6px" }}>
                          <div style={{ height: "100%", borderRadius: "2px", background: alea.score >= 70 ? "#B91C1C" : alea.score >= 35 ? "#D97706" : "#94A3B8", width: `${alea.score}%`, transition: "width 0.6s" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: alea.score >= 70 ? "#B91C1C" : alea.score >= 35 ? "#D97706" : "#78716C", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{alea.score}</div>
                        <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>poids {alea.poids} %</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exposition RGA */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Exposition RGA — Fonds de Prévention Argile</div>
                {expo && (
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: expo.bg, borderRadius: "10px", border: `1px solid ${expo.couleur}30` }}>
                    <i className={`ti ${expo.icone}`} style={{ fontSize: "26px", color: expo.couleur }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: expo.couleur, marginBottom: "4px" }}>{expo.label}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>Données BRGM — arrêté du 9 janvier 2026 — {actif.code_postal} {actif.ville}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lien Géorisques */}
              <div style={{ display: "flex", gap: "8px", padding: "12px 16px", background: "#EFF6FF", borderRadius: "10px", border: "1px solid #BAD5F5", alignItems: "center" }}>
                <i className="ti ti-external-link" style={{ fontSize: "15px", color: "#0369A1", flexShrink: 0 }} aria-hidden="true" />
                <div style={{ fontSize: "12px", color: "#1E3A5F" }}>
                  Consultez le rapport complet sur{" "}
                  <a href={`https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi?form-adresse=true&adresse=${encodeURIComponent(actif.adresse + " " + actif.code_postal + " " + actif.ville)}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0369A1", fontWeight: 600 }}>georisques.gouv.fr</a>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}