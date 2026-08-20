import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ScoreGeorisques from "../../components/ScoreGeorisques"
import { calculerScoreGeorisques } from "../../lib/scoreGeorisques"
import { detecterAleas } from "../../lib/aleasGeorisques"
import ScoreHistorique from "../metier/ScoreHistorique"
import { fetchAndStoreGeorisques } from "../../lib/fetchGeorisques"
import { resolveAffectationClient } from "../../lib/resolveAffectationClient"

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

const REGL_DETAILS: Record<string, { objectif: string; sanctions: string }> = {
  tertiaire: {
    objectif: "Réduire les consommations d'énergie finale des bâtiments tertiaires d'au moins 1 000 m² : -40 % d'ici 2030, -50 % d'ici 2040, -60 % d'ici 2050, par rapport à une année de référence. Les consommations doivent être déclarées chaque année sur la plateforme OPERAT.",
    sanctions: "En l'absence de déclaration ou d'atteinte des objectifs, mise en demeure du préfet puis amende administrative pouvant atteindre 1 500 € pour une personne physique et 7 500 € pour une personne morale, avec publication du manquement (« name and shame »).",
  },
  bacs: {
    objectif: "Équiper les bâtiments tertiaires dont la puissance nominale de chauffage ou de climatisation dépasse 290 kW d'un système d'automatisation et de régulation du bâtiment (GTB), afin de piloter et d'optimiser les usages énergétiques.",
    sanctions: "Le décret ne prévoit pas de sanction financière directe, mais la non-conformité expose l'exploitant lors des contrôles et complique l'atteinte des objectifs du Décret Tertiaire, avec lequel BACS est étroitement lié.",
  },
  csrd: {
    objectif: "Imposer un reporting de durabilité standardisé (environnement, social, gouvernance) selon les normes ESRS, pour les entreprises dépassant certains seuils d'effectif, de chiffre d'affaires ou de total bilan.",
    sanctions: "Sanctions administratives et pénales fixées par chaque État membre lors de la transposition ; en France, elles peuvent inclure des amendes et un contrôle renforcé du commissaire aux comptes, avec un risque réputationnel significatif en cas de non-conformité.",
  },
  bilan_carbone: {
    objectif: "Quantifier les émissions de gaz à effet de serre directes et indirectes (scopes 1, 2 et 3) de l'organisation, afin de bâtir un plan de transition crédible.",
    sanctions: "Pour les entités soumises à l'obligation réglementaire (Bilan GES réglementaire), l'absence de publication peut entraîner une amende administrative pouvant atteindre 50 000 €.",
  },
  iso50001: {
    objectif: "Mettre en place un système de management de l'énergie structuré, visant l'amélioration continue de la performance énergétique de l'organisation.",
    sanctions: "Norme volontaire — aucune sanction associée. La certification peut néanmoins conditionner l'éligibilité à certains dispositifs d'aide (CEE, exonérations).",
  },
  audit_energetique: {
    objectif: "Réaliser un audit énergétique complet (bâtiments, procédés, transports) tous les 4 ans pour les grandes entreprises, afin d'identifier les gisements d'économies d'énergie.",
    sanctions: "Le non-respect de l'obligation expose à une amende administrative pouvant atteindre 4 % du chiffre d'affaires hors taxes (2 % en cas de première infraction), prononcée par la DGCCRF.",
  },
  eu_taxonomy: {
    objectif: "Classifier les activités économiques selon leur contribution aux objectifs environnementaux européens, et publier la part du chiffre d'affaires, des CapEx et OpEx alignée sur la taxonomie.",
    sanctions: "Aucune sanction financière directe, mais un risque réputationnel et un impact potentiel sur l'accès au financement durable en cas de non-conformité ou de « greenwashing » constaté.",
  },
  sfdr: {
    objectif: "Imposer aux acteurs des marchés financiers (sociétés de gestion, assureurs) une transparence sur l'intégration des risques de durabilité et les incidences négatives de leurs investissements.",
    sanctions: "Sanctions fixées par les autorités de supervision nationales (AMF en France), pouvant inclure des amendes administratives et des mesures correctives en cas de manquement à l'obligation de transparence.",
  },
  esrs: {
    objectif: "Fournir le référentiel technique détaillé de la CSRD : indicateurs, méthodologies et format de reporting attendus pour chaque thématique de durabilité.",
    sanctions: "Les manquements aux ESRS sont sanctionnés dans le cadre général de la CSRD (cf. ci-dessus).",
  },
  ifrs_s2: {
    objectif: "Standardiser la publication d'informations financières liées au climat (risques physiques, risques de transition, opportunités) à destination des investisseurs.",
    sanctions: "Norme dont le caractère obligatoire dépend de la juridiction d'adoption ; en l'absence de transposition contraignante en France, son application reste volontaire à ce jour.",
  },
  loi_climat: {
    objectif: "Renforcer les obligations climatiques des grandes entreprises sur un périmètre large (urbanisme, mobilité, consommation, publicité), en complément des dispositifs sectoriels existants.",
    sanctions: "Les sanctions varient selon le volet concerné de la loi ; certaines dispositions prévoient des amendes administratives spécifiques à chaque obligation sectorielle.",
  },
  bilan_ges: {
    objectif: "Établir et publier un bilan des émissions de gaz à effet de serre (scopes 1 et 2 obligatoires, scope 3 recommandé) pour les entreprises de plus de 500 salariés, tous les 4 ans.",
    sanctions: "Amende administrative pouvant atteindre 50 000 € en cas d'absence de publication du bilan dans les délais réglementaires.",
  },
}

const typesDocuments = [
  { id:"dpe",          label:"DPE",              desc:"Diagnostic de Performance Énergétique" },
  { id:"audit",        label:"Audit énergétique", desc:"Dernier audit réalisé" },
  { id:"bilan_carbone",label:"Bilan Carbone",     desc:"Bilan GES existant" },
  { id:"plan_action",  label:"Plan d'action",     desc:"Plan de réduction existant" },
  { id:"rapport_csrd", label:"Rapport CSRD/ESG",  desc:"Rapport durabilité" },
  { id:"factures",     label:"Factures énergie",  desc:"12 derniers mois" },
]
const ALEA_LABELS: Record<string, string> = {
  inondation: "Inondation",
  chaleur: "Vagues de chaleur",
  secheresse: "Sécheresse",
  feux_foret: "Feux de forêt",
  tempetes: "Tempêtes",
  rga: "RGA",
  submersion: "Submersion",
  episodes_froids: "Épisodes froids",
}

const ALEA_ICONE_PRINCIPALE: Record<string, string> = {
  inondation: "ti-droplet", chaleur: "ti-temperature", secheresse: "ti-droplet-off",
  feux_foret: "ti-flame", tempetes: "ti-wind", rga: "ti-layers-difference",
  submersion: "ti-waves", episodes_froids: "ti-snowflake",
}

const ALEA_COULEUR_PRINCIPALE: Record<string, string> = {
  inondation: "#0369A1", chaleur: "#D97706", secheresse: "#BA7517",
  feux_foret: "#B91C1C", tempetes: "#5F5E5A", rga: "#993C1D",
  submersion: "#0369A1", episodes_froids: "#0369A1",
}

const ALEA_SOLUTIONS: Record<string, { icon: string; titre: string; desc: string }[]> = {
  inondation: [
    { icon: "ti-shield", titre: "Batardeaux amovibles", desc: "Protection des accès rez-de-chaussée en cas de crue" },
    { icon: "ti-tool", titre: "Pompe de relevage", desc: "Évacuation rapide des eaux infiltrées" },
    { icon: "ti-arrow-up", titre: "Surélévation des réseaux", desc: "Mise hors d'eau des équipements électriques sensibles" },
  ],
  chaleur: [
    { icon: "ti-sun", titre: "Brise-soleil et protections solaires", desc: "Réduction des apports thermiques en façade" },
    { icon: "ti-plant-2", titre: "Toiture ou façade végétalisée", desc: "Effet rafraîchissant naturel du bâtiment" },
    { icon: "ti-color-swatch", titre: "Revêtement réfléchissant", desc: "Limitation de l'absorption de chaleur en toiture" },
  ],
  secheresse: [
    { icon: "ti-droplet", titre: "Irrigation goutte-à-goutte", desc: "Optimisation de la consommation d'eau des espaces verts" },
    { icon: "ti-container", titre: "Récupération des eaux pluviales", desc: "Cuve de stockage pour les usages non potables" },
    { icon: "ti-plant-2", titre: "Végétation résistante au stress hydrique", desc: "Adaptation des plantations aux périodes sèches" },
  ],
  feux_foret: [
    { icon: "ti-scissors", titre: "Débroussaillage réglementaire", desc: "Réduction de la charge combustible aux abords du bâtiment" },
    { icon: "ti-shield", titre: "Écran pare-feu", desc: "Zone tampon entre végétation et bâti" },
    { icon: "ti-brick", titre: "Matériaux de construction M0", desc: "Résistance renforcée au feu en façade" },
  ],
  tempetes: [
    { icon: "ti-tool", titre: "Fixation renforcée de toiture", desc: "Résistance accrue aux vents violents" },
    { icon: "ti-door", titre: "Volets et fermetures renforcés", desc: "Protection des ouvertures en cas de tempête" },
    { icon: "ti-tree", titre: "Élagage des arbres à proximité", desc: "Réduction du risque de chute sur le bâtiment" },
  ],
  rga: [
    { icon: "ti-ruler-2", titre: "Renforcement des fondations", desc: "Adaptation aux mouvements du sol argileux" },
    { icon: "ti-layers-difference", titre: "Joints de dilatation", desc: "Absorption des mouvements différentiels du bâti" },
    { icon: "ti-droplet-off", titre: "Drainage périphérique", desc: "Régulation de l'humidité autour des fondations" },
  ],
  submersion: [
    { icon: "ti-shield", titre: "Digue ou batardeaux", desc: "Barrière physique contre la montée des eaux" },
    { icon: "ti-arrow-up", titre: "Zone refuge en étage", desc: "Mise en sécurité des occupants et biens sensibles" },
    { icon: "ti-tool", titre: "Réseaux techniques hors d'eau", desc: "Protection des installations électriques et techniques" },
  ],
  episodes_froids: [
    { icon: "ti-snowflake", titre: "Isolation thermique renforcée", desc: "Réduction des déperditions de chaleur" },
    { icon: "ti-thermometer", titre: "Calorifugeage des réseaux", desc: "Protection des canalisations contre le gel" },
    { icon: "ti-bolt", titre: "Groupe électrogène de secours", desc: "Continuité de chauffage en cas de coupure" },
  ],
}
// Même conversion markdown → HTML que PreDiagDrawer.tsx, pour un rendu
// identique du rapport IA côté client.
function markdownPrediagToHtml(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#1F2937;margin:20px 0 8px;">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:600;color:#1F2937;margin:16px 0 6px;">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+)\. \*\*(.+?)\*\*(.*)$/gm, '<div style="margin:12px 0 4px;"><span style="font-weight:700;color:#1D9E75;">$1.</span> <strong>$2</strong>$3</div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:#1D9E75;flex-shrink:0;">•</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div style="margin:8px 0;"></div>')
}

const ICONE_ALEA: Record<string, string> = {
  chaleur: "ti-temperature", pluie: "ti-droplet", rga: "ti-layers-difference",
  feu: "ti-flame", inondation: "ti-droplet", submersion: "ti-waves",
  tempete: "ti-wind", froid: "ti-snowflake",
}
const COULEUR_ALEA: Record<string, string> = {
  chaleur: "#BA7517", pluie: "#185FA5", rga: "#993C1D", feu: "#A32D2D",
  inondation: "#185FA5", submersion: "#185FA5", tempete: "#5F5E5A", froid: "#185FA5",
}
const COULEUR_URGENCE: Record<string, string> = {
  immediate: "#A32D2D", court_terme: "#BA7517", moyen_terme: "#854F0B", preventif: "#3B6D11",
}
const LABEL_URGENCE: Record<string, string> = {
  immediate: "Urgence immédiate", court_terme: "Court terme", moyen_terme: "Moyen terme", preventif: "Préventif",
}
const LABEL_RISQUE: Record<string, { label: string; bg: string; color: string }> = {
  faible:   { label: "Risque faible",   bg: "#FAEEDA", color: "#633806" },
  modere:   { label: "Risque modéré",   bg: "#FFFBEB", color: "#D97706" },
  eleve:    { label: "Risque élevé",    bg: "#FEF2F2", color: "#B91C1C" },
  critique: { label: "Risque critique", bg: "#FEF2F2", color: "#991B1B" },
}

export default function FicheActif() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Récupération de la route d'origine transmise via state (React Router v6)
      const from = (location.state as { from?: string } | null)?.from ?? "/"

  const [actif, setActif]                       = useState<any>(null)
  const [reglementations, setReglementations]   = useState<any[]>([])
  const [documents, setDocuments]               = useState<any[]>([])
  const [rapports, setRapports]                 = useState<any[]>([])
  const [demandes, setDemandes]                 = useState<any[]>([])
  const [prediagnostic, setPrediagnostic]       = useState<any>(null)
  const [demandeAnalyse, setDemandeAnalyse]     = useState<any>(null)
  const [envoiDemandeAnalyse, setEnvoiDemandeAnalyse] = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [onglet, setOnglet]                     = useState((location.state as any)?.ongletInitial || "synthese")
  const [ajoutDoc, setAjoutDoc]                 = useState(false)
  const [typeDocSelectionne, setTypeDocSelectionne] = useState("")
  const [uploadingDoc, setUploadingDoc]         = useState(false)
  const [erreurUpload, setErreurUpload]         = useState("")
  const [photoUrl, setPhotoUrl]                 = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto]     = useState(false)
    const [erreurPhoto, setErreurPhoto]           = useState("")
    const [infosSiteDeplie, setInfosSiteDeplie]   = useState(false)
  const [reglementationsDeplie, setReglementationsDeplie] = useState(false)
    const [prediagIa, setPrediagIa]               = useState<any>(null)
  const [prediagDetailOuvert, setPrediagDetailOuvert] = useState(false)
     const [reglementationDetailOuverte, setReglementationDetailOuverte] = useState<any>(null)
  const [consultantRegionalId, setConsultantRegionalId] = useState<string | null>(null)
  const [aleaDetailOuvert, setAleaDetailOuvert] = useState<{ alea: string; score: number } | null>(null)

  useEffect(() => { loadActif() }, [id])

  useEffect(() => {
    async function chargerConsultantRegional() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const affectation = await resolveAffectationClient(user.id)
      setConsultantRegionalId(affectation?.consultant_id ?? null)
    }
    chargerConsultantRegional()
  }, [])

  async function loadActif() {
    const { data: actifData } = await supabase.from("actifs").select("*").eq("id", id).single()
    const { data: reglData }  = await supabase.from("actifs_reglementaire").select("*").eq("actif_id", id)
    const { data: docData }   = await supabase.from("actifs_documents").select("*").eq("actif_id", id)
    const { data: gedData }   = await supabase.from("documents")
      .select("id, nom, categorie, storage_path")
      .eq("actif_id", id).eq("visible_client", true).eq("est_version_courante", true)
    const { data: { user } }  = await supabase.auth.getUser()

    const [{ data: rapportsData }, { data: demandesData }, { data: prediagData }, { data: demandeAnalyseData }, { data: prediagIaData }] = await Promise.all([
      supabase.from("rapports_client").select("id, statut, type_rapport").eq("actif_id", id).eq("statut", "disponible"),
      supabase.from("demandes_marketplace").select("id").eq("actif_id", id).eq("client_id", user?.id || ""),
      supabase.from("prediagnostics")
        .select("id, statut, recommandations, priorite, generated_at, risk_score:risk_score_id(score_global, classe_risque, scores_aleas)")
        .eq("actif_id", id).eq("statut", "generated")
        .order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("rapports_client")
        .select("id, statut").eq("actif_id", id).eq("type_rapport", "analyse_climatique")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("pre_diagnostics_ia")
        .select("id, rapport, structure, created_at")
        .eq("source", "actif").eq("actif_id", id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ])

  setActif(actifData)

    if (actifData && !actifData.georisques_data) {
      const georisquesData = await fetchAndStoreGeorisques(actifData)
      if (georisquesData) setActif((prev: any) => ({ ...prev, georisques_data: georisquesData }))
    }

    // Charger la photo du bâtiment
    if (actifData?.photo_batiment) {
      const { data: urlData } = await supabase.storage
        .from("documents-clients")
        .createSignedUrl(actifData.photo_batiment, 60 * 60 * 24)
      if (urlData?.signedUrl) setPhotoUrl(urlData.signedUrl)
    }

    setReglementations(reglData || [])
     const docsGedFormates = (gedData || []).map((g:any) => ({
      id: g.id, nom: g.nom, type_document: "Envoyé par AGE", url: g.storage_path, source: "ged", categorie: g.categorie
    }))
    setDocuments([...(docData || []), ...docsGedFormates])
 setRapports(rapportsData || [])
    setDemandes(demandesData || [])
    setPrediagnostic(prediagData || null)
    setDemandeAnalyse(demandeAnalyseData || null)
    setPrediagIa(prediagIaData || null)
    setLoading(false)
  }

async function demanderAnalyseClimatique() {
    if (!actif) return
    setEnvoiDemandeAnalyse(true)
    try {
    const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Session expirée")
      const affectation = await resolveAffectationClient(user.id)
      const { data, error } = await supabase.from("rapports_client").insert({
        client_id: user.id,
        actif_id: actif.id,
        type_rapport: "analyse_climatique",
        statut: "demande",
        responsable_id: affectation.responsable_region_id,
        consultant_id: affectation.consultant_id,
      }).select("id, statut").single()
      if (error) throw error
      setDemandeAnalyse(data)
    } catch (err: any) {
      console.error("Erreur demande analyse climatique:", err)
      alert("Erreur lors de l'envoi de la demande : " + (err.message || "inconnue"))
    } finally {
      setEnvoiDemandeAnalyse(false)
    }
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
  const scoreGeorisques = calculerScoreGeorisques(actif.exposition_rga, actif.georisques_data)
  const aleasDetectes = detecterAleas(actif.georisques_data, actif.exposition_rga)
  const nbEligibleScore = reglementations.filter(r => r.statut === "eligible").length
  const scoreReglementaire = reglementations.length > 0
    ? Math.round((nbEligibleScore / reglementations.length) * 100)
    : 0
  const scoreClimatiqueAge = prediagnostic?.risk_score?.score_global ?? null

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
                    style={{ background: "none", border: "none", color: "#6B7280", fontSize: "12px", fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}
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
                  {prediagnostic ? (
                    <span style={{ background: "#F0FDF4", color: "#2F7D5C", padding: "6px 12px", borderRadius: "999px", fontWeight: 500, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: "12px" }} />
                      Analyse disponible
                    </span>
                  ) : demandeAnalyse?.statut === "demande" ? (
                    <span style={{ background: "#FFFBEB", color: "#D97706", padding: "6px 12px", borderRadius: "999px", fontWeight: 500, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: "12px" }} />
                      En attente d'analyse
                    </span>
                  ) : null}
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
              <div
            key={i}
            style={{ background: "#111C2E", borderLeft: "3px solid #1D9E75", borderRadius: "12px", padding: "20px", transition: "background 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = "#16233A"
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = "inset 0 0 0 1px #1D9E7560, 0 0 24px #1D9E7525"
              const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
              if (halo) halo.style.background = "#1D9E7555"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = "#111C2E"
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
              const halo = (e.currentTarget as HTMLDivElement).querySelector<HTMLDivElement>("[data-halo]")
              if (halo) halo.style.background = "#1D9E752A"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div data-halo style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#1D9E752A", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                <i className={`ti ${k.icone}`} style={{ fontSize: "16px", color: "#1D9E75" }} />
              </div>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "28px", fontWeight: 700, color: "#FFFFFF", marginBottom: "4px" }}>
              {k.val}
            </div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div
              onClick={() => setInfosSiteDeplie(d => !d)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setInfosSiteDeplie(d => !d) } }}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",marginBottom: infosSiteDeplie ? "1rem" : 0,fontFamily:"inherit"}}
            >
              <h3 style={{color:"#111827",margin:0}}>Informations du site</h3>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <button
                  onClick={e => { e.stopPropagation(); setInfosSiteDeplie(d => !d) }}
                  style={{display:"flex",alignItems:"center",gap:"6px",background:"#0F6E56",color:"white",border:"none",padding:"6px 14px",borderRadius:"6px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}
                >
                  <i className="ti ti-eye" style={{fontSize:"14px"}} />
                  Voir
                </button>
                <i className={`ti ti-chevron-${infosSiteDeplie ? "up" : "down"}`} style={{fontSize:"16px",color:"#9CA3AF"}} />
              </div>
            </div>
            {infosSiteDeplie && (
              <>
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
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", marginBottom: "0.75rem" }}>Aléas climatiques identifiés</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
                    {aleasDetectes.map((a,i) => {
                      let badge: { label: string; bg: string; color: string }
                      if (a.alea === "rga") {
                        badge = a.niveau
                          ? { label: `RGA ${a.niveau}`, bg: a.niveau==="forte"?"#FEF2F2":a.niveau==="moyenne"?"#FFFBEB":"#F0FDF4", color: a.niveau==="forte"?"#B91C1C":a.niveau==="moyenne"?"#D97706":"#2F7D5C" }
                          : { label: "Non renseigné", bg: "#F4F3F0", color: "#78716C" }
                      } else if (!a.automatise) {
                        badge = { label: "À évaluer", bg: "#F4F3F0", color: "#78716C" }
                      } else if (a.present === null) {
                        badge = { label: "Non disponible", bg: "#F4F3F0", color: "#78716C" }
                      } else if (a.present) {
                        badge = { label: "Présent", bg: "#FEF2F2", color: "#B91C1C" }
                      } else {
                        badge = { label: "Non détecté", bg: "#F0FDF4", color: "#2F7D5C" }
                      }
                      return (
                        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0.75rem",background:"#f8f7f4",borderRadius:"8px"}}>
                          <span style={{fontSize:"0.85rem",color:"#111827"}}>{a.label}</span>
                          <span style={{fontSize:"0.7rem",fontWeight:700,padding:"3px 8px",borderRadius:"6px",background:badge.bg,color:badge.color}}>
                            {badge.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{fontSize:"0.75rem",color:"#94A3B8",marginTop:"0.75rem"}}>Détection basée sur la localisation — score climatique définitif établi lors d'une mission AGE.</p>
                </div>
              </>
            )}
          </div>
                   <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div
                onClick={() => setReglementationsDeplie(d => !d)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReglementationsDeplie(d => !d) } }}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",marginBottom: reglementationsDeplie ? "1rem" : 0,fontFamily:"inherit"}}
              >
                <h3 style={{color:"#111827",margin:0}}>Réglementations</h3>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <button
                    onClick={e => { e.stopPropagation(); setReglementationsDeplie(d => !d) }}
                    style={{display:"flex",alignItems:"center",gap:"6px",background:"#0F6E56",color:"white",border:"none",padding:"6px 14px",borderRadius:"6px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}
                  >
                    <i className="ti ti-eye" style={{fontSize:"14px"}} />
                    Voir
                  </button>
                  <i className={`ti ti-chevron-${reglementationsDeplie ? "up" : "down"}`} style={{fontSize:"16px",color:"#9CA3AF"}} />
                </div>
              </div>
              {reglementationsDeplie && (
                reglementations.length === 0 ? (
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
                )
              )}
                 </div>
      <div style={{background:"white",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{color:"#111827",marginBottom:"1rem"}}>Score climatique</h3>
              <ScoreHistorique
                actifId={actif.id}
                modeClient={true}
              />
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          {prediagIa && (() => {
            const s = prediagIa.structure
            const risqueCfg = s?.synthese?.niveau_risque ? LABEL_RISQUE[s.synthese.niveau_risque] : null
            return (
              <div style={{background:"#111C2E",borderLeft:"3px solid #1D9E75",borderRadius:"12px",padding:"20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"#1D9E752A",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <i className="ti ti-home" style={{fontSize:"16px",color:"#1D9E75"}} />
                  </div>
                  <span style={{fontSize:"14px",fontWeight:700,color:"#FFFFFF"}}>Pré-diagnostic</span>
                </div>

                {s ? (
                  <>
                    {risqueCfg && (
                      <div style={{display:"inline-block",fontSize:"11px",fontWeight:500,padding:"3px 10px",borderRadius:"20px",background:risqueCfg.bg,color:risqueCfg.color,marginBottom:"10px"}}>
                        {risqueCfg.label}
                      </div>
                    )}
                    {s.synthese?.resume && (
                      <p style={{fontSize:"13px",color:"#E2E8F0",lineHeight:1.6,margin:"0 0 12px"}}>{s.synthese.resume}</p>
                    )}
                    {s.aleas?.length > 0 && (
                      <div style={{display:"flex",gap:"6px",flexWrap:"wrap" as const,marginBottom:"14px"}}>
                                         {s.aleas.map((a: any, i: number) => (
                          <span key={i} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11px",padding:"3px 8px",borderRadius:"6px",background:"#16233A",color:"#FFFFFF"}}>
                            <i className={`ti ${ICONE_ALEA[a.type] || "ti-alert-triangle"}`} style={{fontSize:"12px",color:COULEUR_ALEA[a.type] || "#94A3B8"}} />
                            {a.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.recommandations?.[0] && (
                      <div style={{background:"#16233A",borderRadius:"8px",padding:"10px 12px",marginBottom:"14px"}}>
                        <div style={{fontSize:"10px",color:"#94A3B8",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"4px"}}>Action prioritaire</div>
                        <div style={{fontSize:"12px",color:"#E2E8F0"}}>{s.recommandations[0].titre} — {LABEL_URGENCE[s.recommandations[0].urgence] || s.recommandations[0].urgence}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{fontSize:"12px",color:"#94A3B8",marginBottom:"14px",lineHeight:1.5}}>
                    Analyse climatique préliminaire réalisée par votre consultant AGE Climate.
                  </p>
                )}

                     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
                  <button
                    onClick={() => setPrediagDetailOuvert(true)}
                    style={{display:"flex",alignItems:"center",gap:"6px",background:"#1D9E75",color:"white",border:"none",padding:"8px 16px",borderRadius:"8px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}
                  >
                    <i className="ti ti-eye" style={{fontSize:"14px"}} />
                    Voir le détail
                  </button>
                  {s?.budget && (
                    <div style={{textAlign:"right" as const}}>
                      <div style={{fontSize:"10px",color:"#94A3B8",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Investissement estimé</div>
                      <div style={{fontSize:"13px",fontWeight:700,color:"#FFFFFF",fontFamily:"JetBrains Mono, monospace"}}>
                        {s.budget.montant_bas?.toLocaleString("fr-FR")} € — {s.budget.montant_haut?.toLocaleString("fr-FR")} €
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
               </div>
        </div>
      )}

      {/* Modale détail pré-diagnostic */}
      {prediagDetailOuvert && prediagIa && (
        <>
          <div onClick={() => setPrediagDetailOuvert(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300}} />
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"560px",maxWidth:"90vw",maxHeight:"85vh",overflowY:"auto",background:"#FFFFFF",borderRadius:"16px",zIndex:301,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",padding:"28px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
              <div>
                <h3 style={{margin:0,fontSize:"16px",fontWeight:700,color:"#111827"}}>{actif.nom}</h3>
                <p style={{margin:"2px 0 0",fontSize:"12px",color:"#6B7280"}}>Pré-diagnostic · {new Date(prediagIa.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => setPrediagDetailOuvert(false)} style={{border:"none",background:"#F4F3F0",width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}}>
                <i className="ti ti-x" style={{fontSize:"14px"}} />
              </button>
            </div>

            {prediagIa.structure ? (() => {
              const s = prediagIa.structure
              return (
                <>
                  <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"10px"}}>Synthèse</div>
                  <p style={{fontSize:"13px",color:"#111827",lineHeight:1.6,margin:"0 0 20px"}}>{s.synthese?.resume}</p>

                  {s.aleas?.length > 0 && (
                    <>
                      <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"10px"}}>Aléas identifiés</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"20px"}}>
                        {s.aleas.map((a: any, i: number) => (
                          <div key={i} style={{background:"#F8F7F4",borderRadius:"8px",padding:"12px",display:"flex",gap:"10px",alignItems:"flex-start"}}>
                            <i className={`ti ${ICONE_ALEA[a.type] || "ti-alert-triangle"}`} style={{fontSize:"18px",color:COULEUR_ALEA[a.type] || "#78716C"}} />
                            <div>
                              <div style={{fontSize:"12px",fontWeight:600,color:"#111827"}}>{a.label}</div>
                              <div style={{fontSize:"11px",color:"#6B7280"}}>{a.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {s.recommandations?.length > 0 && (
                    <>
                      <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"10px"}}>Recommandations prioritaires</div>
                      <div style={{display:"flex",flexDirection:"column" as const,gap:"8px",marginBottom:"20px"}}>
                        {s.recommandations.map((r: any, i: number) => (
                          <div key={i} style={{display:"flex",gap:"12px",alignItems:"flex-start",padding:"10px 12px",background:"#F8F7F4",borderRadius:"8px"}}>
                            <div style={{width:"20px",height:"20px",borderRadius:"50%",background:COULEUR_URGENCE[r.urgence] || "#78716C",color:"#fff",fontSize:"11px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i + 1}</div>
                            <div>
                              <div style={{fontSize:"12px",fontWeight:600,color:"#111827"}}>{r.titre}</div>
                              <div style={{fontSize:"11px",color:"#6B7280"}}>{LABEL_URGENCE[r.urgence] || r.urgence} — {r.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {s.budget && (
                    <>
                      <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"10px"}}>Investissement d'adaptation estimé</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"4px"}}>
                        <span style={{fontSize:"22px",fontWeight:700,color:"#111827",fontFamily:"JetBrains Mono, monospace"}}>
                          {s.budget.montant_bas?.toLocaleString("fr-FR")} € — {s.budget.montant_haut?.toLocaleString("fr-FR")} €
                        </span>
                      </div>
                      {s.budget.commentaire && <p style={{fontSize:"12px",color:"#6B7280",margin:0}}>{s.budget.commentaire}</p>}
                    </>
                  )}
                </>
              )
            })() : (
              <div dangerouslySetInnerHTML={{ __html: markdownPrediagToHtml(prediagIa.rapport).replace(/color:#[0-9A-Fa-f]{6};?/g, "") }} style={{fontSize:"13px",color:"#111827",lineHeight:1.7}} />
            )}
          </div>
        </>
      )}

      {/* Modale détail aléa climatique — croquis de solutions */}
      {aleaDetailOuvert && (() => {
        const { alea, score } = aleaDetailOuvert
        const couleur = ALEA_COULEUR_PRINCIPALE[alea] || "#6B7280"
        const solutions = ALEA_SOLUTIONS[alea] || []
        const recoAssociees = prediagnostic?.recommandations?.find((r: any) => r.alea === alea)
        return (
          <>
            <div onClick={() => setAleaDetailOuvert(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300}} />
            <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"560px",maxWidth:"90vw",maxHeight:"85vh",overflowY:"auto",background:"#FFFFFF",borderRadius:"16px",zIndex:301,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

              <div style={{background:couleur+"14",padding:"28px 28px 20px",textAlign:"center" as const,position:"relative"}}>
                <button onClick={() => setAleaDetailOuvert(null)} style={{position:"absolute",top:"14px",right:"14px",border:"none",background:"rgba(255,255,255,0.7)",width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}}>
                  <i className="ti ti-x" style={{fontSize:"14px"}} />
                </button>
                <div style={{width:"60px",height:"60px",borderRadius:"50%",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
                  <i className={`ti ${ALEA_ICONE_PRINCIPALE[alea] || "ti-alert-triangle"}`} style={{fontSize:"28px",color:couleur}} />
                </div>
                <h3 style={{margin:0,fontSize:"16px",fontWeight:700,color:"#111827"}}>{ALEA_LABELS[alea] || alea}</h3>
                <div style={{fontSize:"12px",color:"#6B7280",marginTop:"4px"}}>Score d'exposition : {score}/100</div>
              </div>

              <div style={{padding:"22px 28px"}}>
                <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"12px"}}>Solutions d'adaptation</div>

                {/* Croquis */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:"#F8FAFC",borderRadius:"10px",padding:"20px 16px 14px",marginBottom:"18px",borderBottom:"2px solid #CBD5E1"}}>
                  {solutions.map((s, i) => (
                    <div key={i} style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:"8px",flex:1,padding:"0 6px"}}>
                      <div style={{width:"44px",height:"44px",borderRadius:"50%",border:`2px solid ${couleur}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <i className={`ti ${s.icon}`} style={{fontSize:"20px",color:couleur}} />
                      </div>
                      <span style={{fontSize:"10px",color:couleur,textAlign:"center" as const,fontWeight:500,lineHeight:1.3}}>{s.titre}</span>
                    </div>
                  ))}
                </div>

                {/* Détail des solutions */}
                <div style={{display:"flex",flexDirection:"column" as const,gap:"8px",marginBottom:"20px"}}>
                  {solutions.map((s, i) => (
                    <div key={i} style={{display:"flex",gap:"10px",alignItems:"flex-start",padding:"10px 12px",background:"#F8F7F4",borderRadius:"8px"}}>
                      <div style={{width:"22px",height:"22px",borderRadius:"50%",background:couleur,color:"#fff",fontSize:"11px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i + 1}</div>
                      <div>
                        <div style={{fontSize:"12px",fontWeight:600,color:"#111827"}}>{s.titre}</div>
                        <div style={{fontSize:"11px",color:"#6B7280"}}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {recoAssociees?.actions?.length > 0 && (
                  <>
                    <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"8px"}}>Recommandations de votre consultant</div>
                    <ul style={{margin:"0 0 20px",paddingLeft:"18px"}}>
                      {recoAssociees.actions.map((a: string, i: number) => (
                        <li key={i} style={{fontSize:"13px",color:"#374151",marginBottom:"4px"}}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}

                {consultantRegionalId && (
                  <button
                    onClick={() => navigate(`/client/prise-rdv/${consultantRegionalId}?mode=coordination`)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#111C2E",color:"#FFFFFF",border:"none",padding:"12px 16px",borderRadius:"8px",fontSize:"13px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}
                  >
                    <i className="ti ti-calendar-plus" style={{fontSize:"15px"}} />
                    Prendre RDV avec mon consultant régional
                  </button>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* Onglet Réglementaire */}
      {onglet==="reglementaire" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <i className="ti ti-scale" style={{fontSize:"18px",color:"#B25C2A"}} aria-hidden="true" />
              <h3 style={{color:"#111827",margin:0}}>Analyse réglementaire détaillée</h3>
            </div>
            <button onClick={lancerAnalyseReglementaire} style={{display:"flex",alignItems:"center",gap:"6px",background:"#B25C2A",color:"white",border:"none",padding:"8px 16px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:500,fontFamily:"inherit"}}>
              <i className="ti ti-refresh" style={{fontSize:"14px"}} aria-hidden="true" />
              {reglementations.length === 0 ? "Lancer l'analyse" : "Relancer l'analyse"}
            </button>
          </div>
          {reglementations.length === 0 ? (
            <div style={{background:"white",borderRadius:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",textAlign:"center",padding:"2rem",color:"#666"}}>
              <p>Aucune réglementation analysée pour cet actif.</p>
              <p style={{fontSize:"0.85rem"}}>Cliquez sur "Lancer l'analyse" pour démarrer.</p>
            </div>
          ) : (
            <div style={{background:"white",borderRadius:"10px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden"}}>
              {reglementations.map((r,i) => (
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:"14px",padding:"12px 18px",
                  borderBottom: i < reglementations.length - 1 ? "1px solid #F0EFEA" : "none",
                  borderLeft:`3px solid ${statutReglColor[r.statut]?.color||"#78716C"}`,
                }}>
                  <i className={`ti ${reglIcones[r.reglementation]}`} style={{fontSize:"16px",color:statutReglColor[r.statut]?.color||"#6B7280",flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",fontWeight:500,color:"#111827"}}>{reglLabels[r.reglementation]||r.reglementation}</div>
                    {r.details && (
                      <div style={{fontSize:"11px",color:"#6B7280",marginTop:"1px"}}>{r.details}</div>
                    )}
                  </div>
                   {r.echeance && (
                    <span style={{fontSize:"11px",color:"#6B7280",whiteSpace:"nowrap"}}>
                      Éch. {new Date(r.echeance).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  <span style={{background:statutReglColor[r.statut]?.bg||"#f0f0f0",color:statutReglColor[r.statut]?.color||"#666",padding:"3px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:500,whiteSpace:"nowrap"}}>
                    {statutReglColor[r.statut]?.label||r.statut}
                  </span>
                            <button
                    onClick={() => setReglementationDetailOuverte(r)}
                    style={{display:"flex",alignItems:"center",gap:"6px",background:"#0F6E56",color:"white",border:"none",padding:"6px 14px",borderRadius:"6px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}
                  >
                    <i className="ti ti-eye" style={{fontSize:"14px"}} />
                    Voir plus
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modale détail réglementation */}
      {reglementationDetailOuverte && (() => {
        const r = reglementationDetailOuverte
        const cfg = statutReglColor[r.statut]
        const details = REGL_DETAILS[r.reglementation]
        return (
          <>
            <div onClick={() => setReglementationDetailOuverte(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300}} />
            <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"560px",maxWidth:"90vw",maxHeight:"85vh",overflowY:"auto",background:"#FFFFFF",borderRadius:"16px",zIndex:301,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

              {/* Illustration */}
              <div style={{background:cfg?.bg||"#F4F3F0",padding:"36px 28px 24px",textAlign:"center" as const,position:"relative"}}>
                <button onClick={() => setReglementationDetailOuverte(null)} style={{position:"absolute",top:"16px",right:"16px",border:"none",background:"rgba(255,255,255,0.7)",width:"28px",height:"28px",borderRadius:"6px",cursor:"pointer"}}>
                  <i className="ti ti-x" style={{fontSize:"14px"}} />
                </button>
                <div style={{width:"72px",height:"72px",borderRadius:"50%",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
                  <i className={`ti ${reglIcones[r.reglementation]}`} style={{fontSize:"34px",color:cfg?.color||"#6B7280"}} />
                </div>
                <h3 style={{margin:0,fontSize:"17px",fontWeight:700,color:"#111827"}}>{reglLabels[r.reglementation]||r.reglementation}</h3>
                <span style={{display:"inline-block",marginTop:"8px",background:"#FFFFFF",color:cfg?.color||"#666",padding:"3px 10px",borderRadius:"999px",fontSize:"11px",fontWeight:700}}>
                  {cfg?.label||r.statut}
                </span>
              </div>

              <div style={{padding:"24px 28px"}}>
                {details ? (
                  <>
                    <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"8px"}}>Objectif</div>
                    <p style={{fontSize:"13px",color:"#111827",lineHeight:1.6,margin:"0 0 20px"}}>{details.objectif}</p>

                    <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"8px"}}>Sanctions et contraintes</div>
                    <p style={{fontSize:"13px",color:"#111827",lineHeight:1.6,margin:"0 0 20px"}}>{details.sanctions}</p>
                  </>
                ) : (
                  <p style={{fontSize:"13px",color:"#6B7280",margin:"0 0 20px"}}>Détails non renseignés pour cette réglementation.</p>
                )}

                {r.details && (
                  <>
                    <div style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",marginBottom:"8px"}}>Situation de votre actif</div>
                    <p style={{fontSize:"13px",color:"#111827",lineHeight:1.6,margin:"0 0 20px"}}>{r.details}</p>
                  </>
                )}

                 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#F9F0EA",border:"1px solid #F0DDD0",borderRadius:"8px",padding:"12px 14px",marginBottom:"18px"}}>
                  <span style={{fontSize:"12px",color:"#6B7280"}}>Accompagnement AGE Climate</span>
                  <span style={{fontSize:"13px",fontWeight:500,color:"#B25C2A"}}>Sur devis</span>
                </div>

                {r.echeance && (
                  <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:"#6B7280",marginBottom:"18px"}}>
                    <i className="ti ti-calendar" style={{fontSize:"14px"}} />
                    Échéance : {new Date(r.echeance).toLocaleDateString("fr-FR")}
                  </div>
                )}

                {consultantRegionalId && (
                  <button
                    onClick={() => navigate(`/client/prise-rdv/${consultantRegionalId}?mode=coordination`)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"#111C2E",color:"#FFFFFF",border:"none",padding:"12px 16px",borderRadius:"8px",fontSize:"13px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}
                  >
                    <i className="ti ti-calendar-plus" style={{fontSize:"15px"}} />
                    Prendre RDV avec mon consultant régional
                  </button>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* Onglet Climatique */}
      {onglet==="climatique" && (
        prediagnostic ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "1rem" }}>
              <div>
                <h3 style={{ color: "#111827", margin: 0 }}>Analyse climatique</h3>
                <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                  Réalisée le {new Date(prediagnostic.generated_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#B91C1C" }}>
                  {prediagnostic.risk_score?.score_global ?? "—"}/100
                </span>
                {prediagnostic.priorite && (
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: prediagnostic.priorite === "urgence" ? "#FEF2F2" : prediagnostic.priorite === "surveillance" ? "#FFFBEB" : "#F0FDF4",
                    color: prediagnostic.priorite === "urgence" ? "#B91C1C" : prediagnostic.priorite === "surveillance" ? "#D97706" : "#2F7D5C",
                  }}>
                    {prediagnostic.priorite === "urgence" ? "Urgence" : prediagnostic.priorite === "surveillance" ? "Surveillance" : "Veille"}
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ color: "#111827", marginBottom: "1rem" }}>Exposition par aléa</h3>
              {Object.keys(prediagnostic.risk_score?.scores_aleas || {}).length === 0 ? (
                <p style={{ color: "#6B7280", fontSize: 13 }}>Aucune décomposition par aléa disponible.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 160, flexShrink: 0 }} />
                    <span style={{ flex: 1 }} />
                    <span style={{ width: 36, flexShrink: 0 }} />
                    <span style={{ width: 64, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const }}>Solutions d'adaptation</span>
                  </div>
                           {Object.entries(prediagnostic.risk_score.scores_aleas as Record<string, number>).map(([alea, score]) => (
                    <div key={alea} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 160, fontSize: 13, color: "#111827" }}>{ALEA_LABELS[alea] || alea}</span>
                      <div style={{ flex: 1, background: "#F1F5F9", borderRadius: 4, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${score}%`, height: "100%", background: score >= 70 ? "#B91C1C" : score >= 40 ? "#D97706" : "#2F7D5C", borderRadius: 4 }} />
                      </div>
                                           <span style={{ width: 36, textAlign: "right" as const, fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#6B7280" }}>{score}</span>
                      <span style={{
                        width: 64, flexShrink: 0, textAlign: "center" as const,
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                        background: (score as number) >= 70 ? "#FEF2F2" : (score as number) >= 40 ? "#FFFBEB" : "#F0FDF4",
                        color: (score as number) >= 70 ? "#B91C1C" : (score as number) >= 40 ? "#D97706" : "#2F7D5C",
                      }}>
                        {(score as number) >= 70 ? "Élevé" : (score as number) >= 40 ? "Modéré" : "Faible"}
                      </span>
                      <button
                        onClick={() => setAleaDetailOuvert({ alea, score: score as number })}
                        style={{display:"flex",alignItems:"center",gap:"6px",background:"#0F6E56",color:"white",border:"none",padding:"6px 14px",borderRadius:"6px",fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}
                      >
                        <i className="ti ti-eye" style={{fontSize:"14px"}} />
                        Voir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FDF0E8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <i className="ti ti-lock" style={{ fontSize: 28, color: "#B25C2A" }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
              Analyse climatique réservée aux missions AGE
            </h3>
            <p style={{ fontSize: 14, color: "#6B7280", maxWidth: 420, lineHeight: 1.7, marginBottom: 24 }}>
              L'exposition aux aléas climatiques, le score de risque physique et les recommandations d'adaptation de votre bien sont réalisés par nos consultants dans le cadre d'une mission dédiée.
            </p>
            {demandeAnalyse ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#2F7D5C", fontSize: 13, fontWeight: 600 }}>
                <i className="ti ti-clock" style={{ fontSize: 14 }} />
                {demandeAnalyse.statut === "demande" ? "Demande envoyée — en attente de traitement" : "Analyse en cours de réalisation"}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={demanderAnalyseClimatique}
                  disabled={envoiDemandeAnalyse}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "none", background: envoiDemandeAnalyse ? "#D6B199" : "#B25C2A", color: "white", fontSize: 13, fontWeight: 600, cursor: envoiDemandeAnalyse ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-send" style={{ fontSize: 14 }} />
                  {envoiDemandeAnalyse ? "Envoi…" : "Demander une analyse"}
                </button>
                <button
                  onClick={() => navigate("/marketplace")}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, border: "1px solid #E2DDD8", background: "white", color: "#111827", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <i className="ti ti-building-store" style={{ fontSize: 14 }} />
                  Voir nos offres
                </button>
              </div>
            )}
          </div>
        )
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
                      if (d.source === "ged" && d.id) {
                        await supabase.from("documents")
                          .update({ vu_client: true, vu_client_at: new Date().toISOString() })
                          .eq("id", d.id)
                      }
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
              { id: "scoring",        label: "Score climatique",           done: !!prediagnostic },
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