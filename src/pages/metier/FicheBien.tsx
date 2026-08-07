import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { genererRecommandationsAuto } from "../../lib/genererRecommandationsAuto"
import ScoreGeorisques from "../../components/ScoreGeorisques"
import { calculerScoreGeorisques } from "../../lib/scoreGeorisques"
import { detecterAleas } from "../../lib/aleasGeorisques"
import PreDiagDrawer from "./PreDiagDrawer"
import ScoreHistorique from "./ScoreHistorique"
import { fetchAndStoreGeorisques } from "../../lib/fetchGeorisques"
const ONGLETS = [
  { id: "synthese",    label: "Synthèse",    icon: "ti-clipboard-list" },
  { id: "climatique",  label: "Climatique",  icon: "ti-leaf" },
  { id: "mission",     label: "Mission climatique", icon: "ti-target-arrow" },
  { id: "actions",     label: "Actions d'adaptation", icon: "ti-list-check" },
  { id: "historique",  label: "Historique scores", icon: "ti-chart-line" },
]

const NIVEAU_REDUCTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  faible: { label: "Faible",  color: "#0369A1", bg: "#EFF6FF" },
  moyen:  { label: "Moyen",   color: "#D97706", bg: "#FFFBEB" },
  fort:   { label: "Fort",    color: "#065F46", bg: "#ECFDF5" },
}

const STATUT_ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planifiee:  { label: "Planifiée",  color: "#64748B", bg: "#F1F5F9" },
  en_cours:   { label: "En cours",   color: "#92400E", bg: "#FFFBEB" },
  realisee:   { label: "Réalisée",   color: "#065F46", bg: "#ECFDF5" },
  abandonnee: { label: "Abandonnée", color: "#991B1B", bg: "#FEF2F2" },
}

const ALEAS_AVEC_CATALOGUE = ["chaleur", "inondation", "submersion", "feux_foret", "tempetes"] as const


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
const ALEA_KEYS = Object.keys(ALEA_LABELS)

function classeRisqueFromScore(score: number): string {
  if (score >= 75) return "critique"
  if (score >= 50) return "eleve"
  if (score >= 25) return "modere"
  return "faible"
}

export default function FicheBien() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [actif, setActif]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet]   = useState((location.state as { ongletInitial?: string } | null)?.ongletInitial || "synthese")
  const [prediagOpen, setPrediagOpen] = useState(false)

  const [userRegion, setUserRegion]   = useState<string | null>(null)
  const [demandeAnalyse, setDemandeAnalyse] = useState<any>(null)
  const [scoreClimatiqueAge, setScoreClimatiqueAge] = useState<number | null>(null)
  const [scoreReglementaire, setScoreReglementaire] = useState(0)
  const [missionForm, setMissionForm] = useState({
    scoreGlobal: "",
    priorite: "surveillance",
    aleaScores: Object.fromEntries(ALEA_KEYS.map(k => [k, ""])) as Record<string, string>,
    aleaActions: Object.fromEntries(ALEA_KEYS.map(k => [k, ""])) as Record<string, string>,
  })
  const [savingMission, setSavingMission] = useState(false)
  const [erreurMission, setErreurMission]  = useState("")
  const [missionSauvegardee, setMissionSauvegardee] = useState(false)
  const [genererAuto, setGenererAuto] = useState(false)

  const [catalogueActions, setCatalogueActions] = useState<any[]>([])
  const [choixActions, setChoixActions] = useState<Record<string, any>>({})
  const [loadingActions, setLoadingActions] = useState(false)
  const [savingActionKey, setSavingActionKey] = useState<string | null>(null)
  const [actionOuverte, setActionOuverte] = useState<string | null>(null)

  useEffect(() => { loadActif() }, [id])
  useEffect(() => { if (onglet === "actions" && catalogueActions.length === 0) loadActionsAdaptation() }, [onglet])

  async function loadActionsAdaptation() {
    setLoadingActions(true)
    const { data: catalogue } = await supabase
      .from("bat_adapt_actions")
      .select("id, intitule, aleas, niveau_competence")
      .order("intitule")
    setCatalogueActions(catalogue || [])

    const { data: choix } = await supabase
      .from("actions_adaptation_choisies")
      .select("*")
      .eq("actif_id", id)
    const map: Record<string, any> = {}
    ;(choix || []).forEach((c: any) => { map[`${c.alea}__${c.action_id}`] = c })
    setChoixActions(map)
    setLoadingActions(false)
  }

  async function upsertActionAdaptation(actionId: string, alea: string, champ: "niveau_reduction" | "statut", valeur: string) {
    if (!id) return
    const key = `${alea}__${actionId}`
    const existant = choixActions[key]
    setSavingActionKey(key)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (champ === "niveau_reduction" && valeur === "") {
        if (existant?.id) {
          await supabase.from("actions_adaptation_choisies").delete().eq("id", existant.id)
        }
        setChoixActions(prev => { const n = { ...prev }; delete n[key]; return n })
        return
      }

      const payload: any = {
        actif_id: id,
        action_id: actionId,
        alea,
        niveau_reduction: champ === "niveau_reduction" ? valeur : (existant?.niveau_reduction ?? "faible"),
        statut: champ === "statut" ? valeur : (existant?.statut ?? "planifiee"),
      }

      if (existant?.id) {
        const { data } = await supabase.from("actions_adaptation_choisies")
          .update({ [champ]: valeur, updated_at: new Date().toISOString() })
          .eq("id", existant.id).select().single()
        setChoixActions(prev => ({ ...prev, [key]: data }))
      } else {
        const { data } = await supabase.from("actions_adaptation_choisies")
          .insert({ ...payload, created_by: user?.id }).select().single()
        setChoixActions(prev => ({ ...prev, [key]: data }))
      }
    } catch (err) {
      console.error("Erreur sauvegarde action adaptation:", err)
    } finally {
      setSavingActionKey(null)
    }
  }

  async function loadActif() {
    const { data } = await supabase.from("actifs").select("*").eq("id", id).single()
    setActif(data)

    if (data && !data.georisques_data) {
      const georisquesData = await fetchAndStoreGeorisques(data)
      if (georisquesData) setActif((prev: any) => ({ ...prev, georisques_data: georisquesData }))
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profil } = await supabase.from("profils").select("region").eq("id", user.id).maybeSingle()
      setUserRegion(profil?.region ?? null)
    }

   const { data: reglementations } = await supabase
      .from("actifs_reglementaire")
      .select("statut")
      .eq("actif_id", id)
    const nbEligible = (reglementations || []).filter(r => r.statut === "eligible").length
    const scoreReglementaireCalcule = (reglementations || []).length > 0
      ? Math.round((nbEligible / reglementations!.length) * 100)
      : 0
    setScoreReglementaire(scoreReglementaireCalcule)

    const { data: demande } = await supabase
      .from("rapports_client")
      .select("id, statut, client_id")
      .eq("actif_id", id).eq("type_rapport", "analyse_climatique")
      .in("statut", ["demande", "en_cours"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
    setDemandeAnalyse(demande || null)

    const { data: prediagAge } = await supabase
      .from("prediagnostics")
      .select("risk_score:risk_score_id(score_global)")
      .eq("actif_id", id).eq("statut", "generated")
      .order("generated_at", { ascending: false }).limit(1).maybeSingle()
    setScoreClimatiqueAge((prediagAge?.risk_score as any)?.score_global ?? null)

    setLoading(false)
  }

  async function enregistrerMissionClimatique() {
    if (!actif) return
    const scoreGlobal = parseInt(missionForm.scoreGlobal, 10)
    if (isNaN(scoreGlobal) || scoreGlobal < 0 || scoreGlobal > 100) {
      setErreurMission("Le score global doit être un nombre entre 0 et 100.")
      return
    }
    setSavingMission(true)
    setErreurMission("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Session expirée")

    const scoresAleas: Record<string, number> = {}
      ALEA_KEYS.forEach(k => {
        const v = parseInt(missionForm.aleaScores[k], 10)
        if (!isNaN(v)) scoresAleas[k] = v
      })
      const aleaPrincipal = Object.entries(scoresAleas).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      const { count: nbScoresExistants } = await supabase
        .from("risk_scores").select("id", { count: "exact", head: true }).eq("actif_id", actif.id)
      const contexte = (nbScoresExistants ?? 0) === 0 ? "initial" : "suivi"

      const { data: riskScore, error: rsError } = await supabase.from("risk_scores").insert({
        actif_id: actif.id,
        score_global: scoreGlobal,
        classe_risque: classeRisqueFromScore(scoreGlobal),
        alea_principal: aleaPrincipal,
        scores_aleas: scoresAleas,
        calcule_par: user.id,
        region_code: userRegion,
        source: "manuel",
        contexte,
      }).select("id").single()
      if (rsError) throw rsError

      const recommandations = ALEA_KEYS
        .filter(k => missionForm.aleaActions[k].trim() !== "")
        .map(k => ({
          alea: k,
          actions: missionForm.aleaActions[k].split("\n").map(a => a.trim()).filter(Boolean),
        }))

      const { error: prediagError } = await supabase.from("prediagnostics").insert({
        actif_id: actif.id,
        risk_score_id: riskScore.id,
        rapport_client_id: demandeAnalyse?.id ?? null,
        statut: "generated",
        recommandations,
        priorite: missionForm.priorite,
        generated_by: user.id,
      })
      if (prediagError) throw prediagError

      if (demandeAnalyse) {
        const { error: majError } = await supabase.from("rapports_client")
          .update({ statut: "disponible" })
          .eq("id", demandeAnalyse.id)
        if (majError) throw majError
      }

      setMissionSauvegardee(true)
      await loadActif()
    } catch (err: any) {
      console.error("Erreur enregistrement mission climatique:", err)
      setErreurMission(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setSavingMission(false)
    }
  }

  async function appliquerRecommandationsAuto() {
    setGenererAuto(true)
    try {
      const scoresAleas: Record<string, number> = {}
      ALEA_KEYS.forEach(k => {
        const v = parseInt(missionForm.aleaScores[k], 10)
        if (!isNaN(v)) scoresAleas[k] = v
      })
      const recos = await genererRecommandationsAuto(scoresAleas)
      setMissionForm(f => ({
        ...f,
        aleaActions: {
          ...f.aleaActions,
          ...Object.fromEntries(recos.map(r => [r.alea, r.actions.join("\n")])),
        },
      }))
    } catch (err: any) {
      console.error("Erreur génération recommandations auto:", err)
      setErreurMission("Erreur lors de la génération automatique : " + (err.message || "inconnue"))
    } finally {
      setGenererAuto(false)
    }
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  if (!actif)  return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Actif introuvable</div>

  const score      = scoreClimatiqueAge ?? (Number(actif.score_climatique) || 0)
  const scoreGeorisques = calculerScoreGeorisques(actif.exposition_rga, actif.georisques_data)
  const aleasDetectes = detecterAleas(actif.georisques_data, actif.exposition_rga)

  const scoreColor = score >= 70 ? "#991B1B" : score >= 40 ? "#D97706" : "#065F46"
  const scoreBg    = score >= 70 ? "#FEF2F2" : score >= 40 ? "#FFFBEB" : "#ECFDF5"
  const scoreLabel = score >= 70 ? "Risque élevé" : score >= 40 ? "Risque modéré" : "Risque faible"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "15px" }} aria-hidden="true" />
          Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>
            {actif.nom || actif.raison_sociale || actif.adresse || "—"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            {actif.adresse && <span>{actif.adresse} — </span>}
            {actif.code_postal} {actif.ville}
            {actif.type_batiment && <span> · {actif.type_batiment}</span>}
          </div>
        </div>
        <button
          onClick={() => setPrediagOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#7C3AED", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#fff", fontSize: "13px", fontFamily: "inherit", fontWeight: 500 }}>
          <i className="ti ti-sparkles" style={{ fontSize: "15px" }} />
          Pré-diagnostic IA
        </button>
        <button
          onClick={() => navigate("/metier/mandats", { state: { actifPourMandat: actif } })}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#fff", fontSize: "13px", fontFamily: "inherit", fontWeight: 500 }}>
          <i className="ti ti-file-text" style={{ fontSize: "15px" }} />
          Créer un mandat
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Surface",      val: actif.surface ? `${actif.surface} m²` : "—",             icon: "ti-ruler-2" },
          { label: "Effectifs",    val: actif.effectifs ? `${actif.effectifs} salariés` : "—",   icon: "ti-users" },
          { label: "Type",         val: actif.type_batiment || actif.type_bien || "—",            icon: "ti-building" },
          { label: "Statut",       val: actif.statut_analyse || "—",                              icon: "ti-chart-bar" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: "#CBD5E1" }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px" }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 16px", borderRadius: "7px", border: "none", cursor: "pointer",
            fontSize: "13px", fontWeight: onglet === o.id ? 500 : 400, fontFamily: "inherit",
            background: onglet === o.id ? (o.id === "brown_value" ? "#FDF3EC" : "#ECFDF5") : "transparent",
            color: onglet === o.id ? (o.id === "brown_value" ? "#B25C2A" : "#065F46") : "#64748B",
            transition: "all 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>

      {/* Synthèse */}
      {onglet === "synthese" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Informations du site</div>
            {[
              ["Nom",               actif.nom || actif.raison_sociale || "—"],
              ["Type",              actif.type_batiment || actif.type_bien || "—"],
              ["Surface",           actif.surface ? `${actif.surface} m²` : "—"],
              ["Année construction",actif.annee_construction?.toString() || "—"],
              ["Secteur",           actif.secteur_activite || "—"],
              ["Effectifs",         actif.effectifs ? `${actif.effectifs} salariés` : "—"],
              ["Nb sites",          actif.nb_sites?.toString() || "—"],
              ["SIREN",             actif.siren || "—"],
              ["Code NAF",          actif.code_naf || "—"],
          ["Valeur marché",     actif.valeur_marche ? `${Number(actif.valeur_marche).toLocaleString("fr-FR")} €` : "—"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "13px", color: "#64748B" }}>{k}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 10 }}>Aléas climatiques identifiés</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {aleasDetectes.map((a, i) => {
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
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#F8FAFC", borderRadius: "7px" }}>
                      <span style={{ fontSize: "12px", color: "#0F172A" }}>{ALEA_LABELS[a.alea] || a.label}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 10 }}>Détection basée sur la localisation — présence/absence uniquement, hors gravité.</p>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Score climatique</div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "52px", fontWeight: 500, color: scoreColor, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>
                {score}
              </div>
              <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "16px" }}>/ 100</div>
              <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "8px", overflow: "hidden", marginBottom: "12px" }}>
                <div style={{ background: scoreColor, width: `${score}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
              </div>
              <span style={{ background: scoreBg, color: scoreColor, padding: "5px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500 }}>
                {scoreLabel}
              </span>
            </div>
            {actif.score_reglementaire !== null && actif.score_reglementaire !== undefined && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px" }}>Score réglementaire</div>
                <div style={{ background: "#F1F5F9", borderRadius: "4px", height: "8px", overflow: "hidden", marginBottom: "6px" }}>
                  <div style={{ background: "#0369A1", width: `${actif.score_reglementaire}%`, height: "100%", borderRadius: "4px" }} />
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0369A1", fontFamily: "'DM Mono', monospace" }}>{actif.score_reglementaire} / 100</div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Climatique */}
      {onglet === "climatique" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <ScoreGeorisques
            zone_rga={actif.zone_rga || false}
            zone_ppri={actif.zone_ppri || false}
            score_risque={score}
            niveau_risque={score >= 70 ? "eleve" : score >= 40 ? "moyen" : "faible"}
          />
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Exposition aux aléas</div>
            {[
              { label: "Inondation / PPRI",                   actif: actif.zone_ppri, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Retrait-gonflement des argiles (RGA)", actif: actif.zone_rga,  color: "#92400E", bg: "#FFFBEB" },
              { label: "RDC vulnérable",                       actif: actif.rdc_vulnerable, color: "#991B1B", bg: "#FEF2F2" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: "13px", color: "#0F172A" }}>{s.label}</span>
                <span style={{ background: s.actif ? s.bg : "#ECFDF5", color: s.actif ? s.color : "#065F46", padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                  {s.actif ? "Exposé" : "Hors zone"}
                </span>
              </div>
            ))}
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", flexShrink: 0 }} aria-hidden="true" />
              Données issues de Géorisques. Affinez via <strong>Brown Value</strong>.
            </div>
          </div>
        </div>
      )}
{/* Mission climatique */}
      {onglet === "mission" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {demandeAnalyse && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1E40AF" }}>
              <i className="ti ti-bell" style={{ fontSize: 15 }} />
              Demande client en attente (statut : {demandeAnalyse.statut}) — l'enregistrement ci-dessous la clôturera automatiquement.
            </div>
          )}

          {missionSauvegardee && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#166534" }}>
              <i className="ti ti-circle-check" style={{ fontSize: 15 }} />
              Analyse enregistrée et transmise au client.
            </div>
          )}

          {erreurMission && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#B91C1C" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 15, marginRight: 6 }} />
              {erreurMission}
            </div>
          )}

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 16 }}>Score global de la mission</div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Score global (0-100) *</label>
                <input type="number" min={0} max={100} value={missionForm.scoreGlobal}
                  onChange={e => setMissionForm(f => ({ ...f, scoreGlobal: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontFamily: "'DM Mono', monospace" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Priorité</label>
                <select value={missionForm.priorite} onChange={e => setMissionForm(f => ({ ...f, priorite: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13 }}>
                  <option value="urgence">Urgence</option>
                  <option value="surveillance">Surveillance</option>
                  <option value="veille">Veille</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20 }}>
           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A" }}>Décomposition par aléa et recommandations</div>
              <button onClick={appliquerRecommandationsAuto} disabled={genererAuto} title="Génère des recommandations pour les aléas Inondation, Chaleur, Feux de forêt, Tempêtes, Submersion (score ≥ 40). RGA, Sécheresse et Épisodes froids restent en saisie manuelle." style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#F5F3FF", border: "1px solid #DDD6FE", padding: "6px 12px", borderRadius: 7,
                cursor: genererAuto ? "not-allowed" : "pointer", color: "#7C3AED", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
              }}>
                <i className={`ti ${genererAuto ? "ti-loader-2" : "ti-wand"}`} style={{ fontSize: 14 }} />
                {genererAuto ? "Génération…" : "Générer automatiquement"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ALEA_KEYS.map(k => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "160px 100px 1fr", gap: 12, alignItems: "start" }}>
                  <span style={{ fontSize: 13, color: "#0F172A", paddingTop: 8 }}>{ALEA_LABELS[k]}</span>
                  <input type="number" min={0} max={100} placeholder="Score" value={missionForm.aleaScores[k]}
                    onChange={e => setMissionForm(f => ({ ...f, aleaScores: { ...f.aleaScores, [k]: e.target.value } }))}
                    style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "'DM Mono', monospace" }} />
                  <textarea placeholder="Recommandations (une action par ligne)" rows={2} value={missionForm.aleaActions[k]}
                    onChange={e => setMissionForm(f => ({ ...f, aleaActions: { ...f.aleaActions, [k]: e.target.value } }))}
                    style={{ padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" as const }} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={enregistrerMissionClimatique} disabled={savingMission || !missionForm.scoreGlobal} style={{
            display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
            background: savingMission || !missionForm.scoreGlobal ? "#94A3B8" : "#7C3AED", border: "none",
            padding: "10px 20px", borderRadius: 8, cursor: savingMission || !missionForm.scoreGlobal ? "not-allowed" : "pointer",
            color: "#fff", fontSize: 13, fontFamily: "inherit", fontWeight: 500,
          }}>
            <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />
            {savingMission ? "Enregistrement…" : "Enregistrer et transmettre au client"}
          </button>
        </div>
      )}
      {/* Actions d'adaptation */}
      {onglet === "actions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#0369A1", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 15, flexShrink: 0 }} />
            Catalogue d'actions issu du guide OID Bat-ADAPT. Le niveau de réduction est une estimation qualitative du consultant, à titre indicatif — sans impact sur le score officiel de mission.
          </div>

          {loadingActions ? (
            <div style={{ padding: 24, color: "#64748B", fontSize: 13 }}>Chargement…</div>
          ) : (
            ALEAS_AVEC_CATALOGUE.map(alea => {
              const actionsAlea = catalogueActions.filter(a => (a.aleas || []).includes(alea))
              if (actionsAlea.length === 0) return null
              return (
                <div key={alea} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#0F172A", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="ti ti-leaf" style={{ fontSize: 16, color: "#7C3AED" }} />
                    {ALEA_LABELS[alea]}
                    <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>({actionsAlea.length} action{actionsAlea.length > 1 ? "s" : ""})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
       {actionsAlea.map(action => {
                      const key = `${alea}__${action.id}`
                      const choix = choixActions[key]
                      const saving = savingActionKey === key
                      const ouverte = actionOuverte === key
                      return (
                        <div key={action.id} style={{ border: `1px solid ${choix ? "#E2E8F0" : "#F1F5F9"}`, borderRadius: 8, overflow: "hidden", background: choix ? "#F8FAFC" : "transparent" }}>
                          <button
                            onClick={() => setActionOuverte(ouverte ? null : key)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          >
                            <i className={`ti ${ouverte ? "ti-chevron-down" : "ti-chevron-right"}`} style={{ fontSize: 14, color: "#94A3B8", flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, color: "#0F172A" }}>{action.intitule}</span>
                            {choix?.niveau_reduction && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: NIVEAU_REDUCTION_CONFIG[choix.niveau_reduction]?.bg, color: NIVEAU_REDUCTION_CONFIG[choix.niveau_reduction]?.color }}>
                                {NIVEAU_REDUCTION_CONFIG[choix.niveau_reduction]?.label}
                              </span>
                            )}
                            {choix && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: STATUT_ACTION_CONFIG[choix.statut]?.bg, color: STATUT_ACTION_CONFIG[choix.statut]?.color }}>
                                {STATUT_ACTION_CONFIG[choix.statut]?.label}
                              </span>
                            )}
                          </button>

                          {ouverte && (
                            <div style={{ padding: "0 12px 14px 36px", display: "flex", flexDirection: "column", gap: 10 }}>
                              {action.niveau_competence && (
                                <div style={{ fontSize: 11, color: "#94A3B8" }}>Compétence requise : {action.niveau_competence}</div>
                              )}
                              <div style={{ display: "flex", gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Niveau de réduction estimé</label>
                                  <select
                                    value={choix?.niveau_reduction || ""}
                                    disabled={saving}
                                    onChange={e => upsertActionAdaptation(action.id, alea, "niveau_reduction", e.target.value)}
                                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, background: choix ? NIVEAU_REDUCTION_CONFIG[choix.niveau_reduction]?.bg : "white", color: choix ? NIVEAU_REDUCTION_CONFIG[choix.niveau_reduction]?.color : "#64748B" }}
                                  >
                                    <option value="">— Non retenue —</option>
                                    <option value="faible">Faible</option>
                                    <option value="moyen">Moyen</option>
                                    <option value="fort">Fort</option>
                                  </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Statut</label>
                                  <select
                                    value={choix?.statut || "planifiee"}
                                    disabled={saving || !choix}
                                    onChange={e => upsertActionAdaptation(action.id, alea, "statut", e.target.value)}
                                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12, background: choix ? STATUT_ACTION_CONFIG[choix.statut]?.bg : "#F8FAFC", color: choix ? STATUT_ACTION_CONFIG[choix.statut]?.color : "#94A3B8", opacity: choix ? 1 : 0.6 }}
                                  >
                                    <option value="planifiee">Planifiée</option>
                                    <option value="en_cours">En cours</option>
                                    <option value="realisee">Réalisée</option>
                                    <option value="abandonnee">Abandonnée</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}


      {/* Historique scores */}
 {onglet === "historique" && (
       <ScoreHistorique
           actifId={actif.id}
          scoreActuel={score}
          classeActuelle={score >= 75 ? 'critique' : score >= 50 ? 'eleve' : score >= 25 ? 'modere' : 'faible'}
          aleaPrincipal={actif.alea_principal ?? undefined}
          scoresAleas={actif.scores_aleas ?? {}}
        />
      )}
<PreDiagDrawer
        open={prediagOpen}
        onClose={() => setPrediagOpen(false)}
        source="bien"
        bien={{
          id: actif.id,
          adresse: actif.adresse,
          ville: actif.ville,
          type_bien: actif.type_batiment || actif.type_bien,
          score_risque: actif.score_climatique || actif.score_risque,
          niveau_risque: score >= 70 ? "eleve" : score >= 40 ? "moyen" : "faible",
          zone_rga: actif.zone_rga,
          zone_ppri: actif.zone_ppri,
          categorie: actif.categorie,
          nom_client: actif.nom_client || actif.raison_sociale,
        }}
      />
    </div>
  )
}