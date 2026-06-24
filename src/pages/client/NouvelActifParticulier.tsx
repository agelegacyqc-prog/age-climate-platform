import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfosBien {
  nom: string
  adresse: string
  ville: string
  code_postal: string
  type_bien: "maison" | "appartement" | ""
  surface: string
  annee_construction: string
  statut_occupation: "proprietaire_occupant" | "bailleur" | ""
  valeur_estimee: string
  nb_logements: string
}

interface AleaGeorisques {
  label: string
  present: boolean
  statutAdresse: string | null
  score: number
  icone: string
}

interface AnalyseRGA {
  exposition: "forte" | "moyenne" | "faible" | "non_expose" | null
  score_eligibilite: number
  score_climatique: number
  aleas: AleaGeorisques[]
  detail_criteres: CritereEligibilite[]
  badge: "eligible" | "probable" | "non_eligible"
  loading: boolean
  erreur: string | null
}

interface CritereEligibilite {
  label: string
  rempli: boolean
  poids: number
  detail: string
}

// ─── Référentiels ─────────────────────────────────────────────────────────────

// 11 départements expérimentaux (arrêté 6 sept. 2025, élargi 23 avril 2026)
const DEPTS_EXPERIMENTAUX = ["03","04","24","32","36","47","54","59","63","81","82"]

const EXPOSITION_STYLE: Record<string, { label: string; couleur: string; bg: string; icone: string }> = {
  forte:      { label: "Exposition forte",   couleur: "#B91C1C", bg: "#FEF2F2", icone: "ti-alert-octagon" },
  moyenne:    { label: "Exposition moyenne", couleur: "#D97706", bg: "#FFF7ED", icone: "ti-alert-triangle" },
  faible:     { label: "Exposition faible",  couleur: "#0369A1", bg: "#EFF6FF", icone: "ti-info-circle" },
  non_expose: { label: "Non exposé",         couleur: "#78716C", bg: "#F8F7F4", icone: "ti-circle-check" },
}

const BADGE_STYLE: Record<string, { label: string; couleur: string; bg: string; border: string; icone: string }> = {
  eligible:     { label: "Éligible",              couleur: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", icone: "ti-circle-check" },
  probable:     { label: "Probablement éligible", couleur: "#92400E", bg: "#FFF7ED", border: "#FCD34D", icone: "ti-alert-triangle" },
  non_eligible: { label: "Non éligible",          couleur: "#7F1D1D", bg: "#FEF2F2", border: "#FECACA", icone: "ti-circle-x" },
}

// ─── Calcul éligibilité (côté client) ────────────────────────────────────────

function calculerEligibilite(infos: InfosBien, exposition: string | null): CritereEligibilite[] {
  const dept = infos.code_postal.slice(0, 2)
  const annee = parseInt(infos.annee_construction) || 0
  const surface = parseInt(infos.surface) || 0
  const nbLogements = parseInt(infos.nb_logements) || 1

  return [
    {
      label:  "Département expérimental (11 depts)",
      rempli: DEPTS_EXPERIMENTAUX.includes(dept),
      poids:  30,
      detail: DEPTS_EXPERIMENTAUX.includes(dept)
        ? `Département ${dept} — inclus dans l'expérimentation`
        : `Département ${dept} — hors périmètre expérimental actuel`,
    },
    {
      label:  "Zone d'exposition RGA forte",
      rempli: exposition === "forte",
      poids:  25,
      detail: exposition === "forte"
        ? "Site en zone d'exposition forte — critère rempli"
        : exposition === "moyenne"
        ? "Site en zone d'exposition moyenne — critère partiellement rempli"
        : "Exposition insuffisante pour le dispositif",
    },
    {
      label:  "Construction avant 2010",
      rempli: annee > 0 && annee < 2010,
      poids:  20,
      detail: annee > 0 && annee < 2010
        ? `Construite en ${annee} — critère rempli`
        : annee >= 2010
        ? `Construite en ${annee} — trop récente (seuil 2010)`
        : "Année de construction non renseignée",
    },
    {
      label:  "Maison individuelle ≤ 2 logements",
      rempli: infos.type_bien === "maison" && nbLogements <= 2,
      poids:  15,
      detail: infos.type_bien === "maison" && nbLogements <= 2
        ? "Maison individuelle avec ≤ 2 logements — critère rempli"
        : infos.type_bien === "appartement"
        ? "Les appartements ne sont pas éligibles au dispositif"
        : `${nbLogements} logement(s) — vérifier le nombre`,
    },
    {
      label:  "Surface habitable ≤ 350 m²",
      rempli: surface > 0 && surface <= 350,
      poids:  10,
      detail: surface > 0 && surface <= 350
        ? `${surface} m² — critère rempli`
        : surface > 350
        ? `${surface} m² — dépasse le seuil de 350 m²`
        : "Surface non renseignée",
    },
  ]
}

function calculerScore(criteres: CritereEligibilite[]): number {
  // Exposition moyenne : compte pour moitié du critère exposition
  let total = 0
  for (const c of criteres) {
    if (c.rempli) total += c.poids
  }
  return Math.round(total)
}

function getBadge(score: number, exposition: string | null): "eligible" | "probable" | "non_eligible" {
  if (score >= 70 && exposition === "forte") return "eligible"
  if (score >= 45) return "probable"
  return "non_eligible"
}

// ─── Appel Géorisques ─────────────────────────────────────────────────────────

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

    // Appel unique Géorisques — tous aléas
    const [rgaRes, risquesRes] = await Promise.all([
      fetch(`https://georisques.gouv.fr/api/v1/rga?latlon=${lon},${lat}`),
      fetch(`https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${lon},${lat}`),
    ])

    // Exposition RGA
    let exposition: "forte" | "moyenne" | "faible" | "non_expose" = "non_expose"
    if (rgaRes.ok) {
      const rgaData = await rgaRes.json()
      const code = rgaData?.codeExposition
      if (code === "3") exposition = "forte"
      else if (code === "2") exposition = "moyenne"
      else if (code === "1") exposition = "faible"
    }

    // Score par aléa
    function scoreStatut(statut: string | null): number {
      if (!statut) return 0
      const s = statut.toLowerCase()
      if (s.includes("important") || s.includes("fort") || s.includes("existant - imp")) return 100
      if (s.includes("modéré") || s.includes("moyen") || s.includes("existant - mod")) return 65
      if (s.includes("faible") || s.includes("existant - fai")) return 35
      if (s.includes("existant") && !s.includes("non connu") && !s.includes("inconnu")) return 50
      return 0
    }

    let aleas: AleaGeorisques[] = []
    let score_climatique = 0

    if (risquesRes.ok) {
      const risquesData = await risquesRes.json()
      const rn = risquesData.risquesNaturels || {}

      const ALEAS_CONFIG = [
        { key: "retraitGonflementArgile", label: "Retrait-gonflement des argiles", icone: "ti-layers",        poids: 35 },
        { key: "inondation",              label: "Inondation",                     icone: "ti-waves",         poids: 20 },
        { key: "remonteeNappe",           label: "Remontée de nappe",              icone: "ti-droplet",       poids: 15 },
        { key: "feuForet",                label: "Feux de forêt",                  icone: "ti-flame",         poids: 15 },
        { key: "mouvementTerrain",        label: "Mouvements de terrain",          icone: "ti-mountain",      poids: 10 },
        { key: "seisme",                  label: "Séisme",                         icone: "ti-wave-sine",     poids: 5  },
      ]

      let scoreTotal = 0
      for (const cfg of ALEAS_CONFIG) {
        const alea = rn[cfg.key]
        const present = alea?.present || false
        const statut  = alea?.libelleStatutAdresse || null
        const score   = present ? scoreStatut(statut) : 0
        scoreTotal   += (score * cfg.poids) / 100
        aleas.push({ label: cfg.label, present, statutAdresse: statut, score, icone: cfg.icone })
      }
      score_climatique = Math.round(scoreTotal)
    }

    return { exposition, score_climatique, aleas }
  } catch {
    return { exposition: "non_expose", score_climatique: 0, aleas: [] }
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NouvelActifParticulier() {
  const navigate = useNavigate()
  const [etape, setEtape]   = useState(1)
  const [saving, setSaving] = useState(false)

  const [infos, setInfos] = useState<InfosBien>({
    nom: "", adresse: "", ville: "", code_postal: "",
    type_bien: "", surface: "", annee_construction: "",
    statut_occupation: "", valeur_estimee: "", nb_logements: "1",
  })

const [analyse, setAnalyse] = useState<AnalyseRGA>({
    exposition: null, score_eligibilite: 0, score_climatique: 0,
    aleas: [], detail_criteres: [], badge: "non_eligible",
    loading: false, erreur: null,
  })

  // ─── Validation étape 1 ─────────────────────────────────────────────────────

  const etape1Valide = infos.nom && infos.adresse && infos.ville &&
    infos.code_postal && infos.type_bien && infos.surface && infos.annee_construction

  // ─── Passage étape 2 : lancer l'analyse ─────────────────────────────────────

  async function allerEtape2() {
    setEtape(2)
    setAnalyse(a => ({ ...a, loading: true, erreur: null }))

    const { exposition, score_climatique, aleas } = await fetchGeorisques(infos.adresse, infos.code_postal, infos.ville)
    const criteres = calculerEligibilite(infos, exposition)
    const score    = calculerScore(criteres)
    const badge    = getBadge(score, exposition)

    setAnalyse({
      exposition, score_eligibilite: score, score_climatique,
      aleas, detail_criteres: criteres, badge,
      loading: false, erreur: null,
    })
  }

  // ─── Création de l'actif ─────────────────────────────────────────────────────

  async function creerBien() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Appel Géorisques depuis le navigateur (fonctionne en HTTP/1.1)
    let georisques_data = {}
    try {
      const geoRes  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(infos.adresse + " " + infos.code_postal + " " + infos.ville)}&limit=1`)
      const geoData = await geoRes.json()
      const feature = geoData.features?.[0]
      if (feature) {
        const [lon, lat] = feature.geometry.coordinates
        const risquesRes = await fetch(`https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${lon},${lat}`)
        if (risquesRes.ok) georisques_data = await risquesRes.json()
      }
    } catch { /* silencieux */ }

    const { error } = await supabase.from("actifs").insert({
      user_id:            user.id,
      client_id:          user.id,
      nom:                infos.nom,
      adresse:            infos.adresse,
      ville:              infos.ville,
      code_postal:        infos.code_postal,
      type_bien:          infos.type_bien,
      surface:            parseInt(infos.surface) || 0,
      annee_construction: parseInt(infos.annee_construction) || 0,
      type_batiment:      "Maison individuelle",
      valeur_marche:      infos.valeur_estimee ? parseFloat(infos.valeur_estimee) : null,
      exposition_rga:     analyse.exposition || "non_expose",
      type_client:        "assure",
      statut_analyse:     "en_attente",
      categorie:          "patrimoine_propre",
      score_climatique:   analyse.score_climatique || 0,
      georisques_data:    georisques_data,
    })

    setSaving(false)
    if (!error) navigate("/client/actifs")
  }

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "680px", margin: "0 auto" }}>

      {/* Bouton retour */}
      <button
        onClick={() => etape === 1 ? navigate("/client/actifs") : setEtape(1)}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748B", fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "inherit", width: "fit-content" }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: "15px" }} aria-hidden="true" />
        {etape === 1 ? "Retour à mes biens" : "Modifier les informations"}
      </button>

      {/* En-tête */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-home-plus" style={{ fontSize: "22px", color: "#B25C2A" }} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0F172A", margin: 0, marginBottom: "3px" }}>Ajouter un bien immobilier</h2>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Résidence principale, secondaire ou bien locatif</div>
          </div>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "20px" }}>
          {[
            { num: 1, label: "Informations du bien" },
            { num: 2, label: "Analyse & Confirmation" },
          ].map((e, i) => (
            <React.Fragment key={e.num}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700,
                  background: etape > e.num ? "#1D9E75" : etape === e.num ? "#B25C2A" : "#E5E1DA",
                  color: etape >= e.num ? "white" : "#94A3B8",
                }}>
                  {etape > e.num ? <i className="ti ti-check" style={{ fontSize: "12px" }} /> : e.num}
                </div>
                <span style={{ fontSize: "12px", fontWeight: etape === e.num ? 600 : 400, color: etape === e.num ? "#B25C2A" : etape > e.num ? "#1D9E75" : "#94A3B8" }}>
                  {e.label}
                </span>
              </div>
              {i < 1 && (
                <div style={{ flex: 1, height: 2, background: etape > 1 ? "#1D9E75" : "#E5E1DA", borderRadius: 1 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── ÉTAPE 1 — Informations ── */}
      {etape === 1 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px 28px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "20px" }}>
            Informations du bien
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Nom */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                Nom du bien <span style={{ color: "#B91C1C" }}>*</span>
              </label>
              <input
                value={infos.nom}
                onChange={e => setInfos({ ...infos, nom: e.target.value })}
                placeholder="Ex : Ma résidence principale, Maison de vacances..."
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
              />
            </div>

            {/* Adresse */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                Adresse <span style={{ color: "#B91C1C" }}>*</span>
              </label>
              <input
                value={infos.adresse}
                onChange={e => setInfos({ ...infos, adresse: e.target.value })}
                placeholder="Numéro et nom de la rue"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
              />
            </div>

            {/* Ville + CP */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                  Code postal <span style={{ color: "#B91C1C" }}>*</span>
                </label>
                <input
                  value={infos.code_postal}
                  onChange={e => setInfos({ ...infos, code_postal: e.target.value })}
                  placeholder="Ex : 33000"
                  maxLength={5}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                  onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                  Ville <span style={{ color: "#B91C1C" }}>*</span>
                </label>
                <input
                  value={infos.ville}
                  onChange={e => setInfos({ ...infos, ville: e.target.value })}
                  placeholder="Ex : Bordeaux"
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                  onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
                />
              </div>
            </div>

            {/* Type de bien */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "8px" }}>
                Type de bien <span style={{ color: "#B91C1C" }}>*</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { val: "maison", label: "Maison individuelle", icone: "ti-home" },
                  { val: "appartement", label: "Appartement", icone: "ti-building" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setInfos({ ...infos, type_bien: opt.val as "maison" | "appartement" })}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "12px 16px", borderRadius: "8px", cursor: "pointer",
                      fontFamily: "inherit", fontSize: "13px", fontWeight: 500,
                      border: infos.type_bien === opt.val ? "2px solid #B25C2A" : "1px solid #E5E1DA",
                      background: infos.type_bien === opt.val ? "#FFF7ED" : "#FFFFFF",
                      color: infos.type_bien === opt.val ? "#B25C2A" : "#44403C",
                      transition: "all 0.15s",
                    }}
                  >
                    <i className={`ti ${opt.icone}`} style={{ fontSize: "18px" }} aria-hidden="true" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Surface + Année */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                  Surface habitable (m²) <span style={{ color: "#B91C1C" }}>*</span>
                </label>
                <input
                  value={infos.surface}
                  onChange={e => setInfos({ ...infos, surface: e.target.value })}
                  placeholder="Ex : 120"
                  type="number"
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                  onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                  Année de construction <span style={{ color: "#B91C1C" }}>*</span>
                </label>
                <input
                  value={infos.annee_construction}
                  onChange={e => setInfos({ ...infos, annee_construction: e.target.value })}
                  placeholder="Ex : 1985"
                  type="number"
                  min="1800" max="2024"
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                  onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
                />
              </div>
            </div>

            {/* Nombre de logements (si maison) */}
            {infos.type_bien === "maison" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                  Nombre de logements dans le bâtiment
                </label>
                <select
                  value={infos.nb_logements}
                  onChange={e => setInfos({ ...infos, nb_logements: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", background: "white", boxSizing: "border-box" as const }}
                >
                  <option value="1">1 logement</option>
                  <option value="2">2 logements</option>
                  <option value="3">3 logements ou plus</option>
                </select>
              </div>
            )}

            {/* Statut occupation */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "8px" }}>
                Vous êtes
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { val: "proprietaire_occupant", label: "Propriétaire occupant", icone: "ti-user-check" },
                  { val: "bailleur",              label: "Bailleur / Investisseur", icone: "ti-key" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setInfos({ ...infos, statut_occupation: opt.val as "proprietaire_occupant" | "bailleur" })}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "12px 16px", borderRadius: "8px", cursor: "pointer",
                      fontFamily: "inherit", fontSize: "13px", fontWeight: 500,
                      border: infos.statut_occupation === opt.val ? "2px solid #B25C2A" : "1px solid #E5E1DA",
                      background: infos.statut_occupation === opt.val ? "#FFF7ED" : "#FFFFFF",
                      color: infos.statut_occupation === opt.val ? "#B25C2A" : "#44403C",
                      transition: "all 0.15s",
                    }}
                  >
                    <i className={`ti ${opt.icone}`} style={{ fontSize: "18px" }} aria-hidden="true" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Valeur estimée (optionnel) */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                Valeur estimée du bien (€) <span style={{ color: "#94A3B8", fontWeight: 400 }}>— optionnel</span>
              </label>
              <input
                value={infos.valeur_estimee}
                onChange={e => setInfos({ ...infos, valeur_estimee: e.target.value })}
                placeholder="Ex : 280000"
                type="number"
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#B25C2A")}
                onBlur={e => (e.target.style.borderColor = "#E5E1DA")}
              />
            </div>

          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <button
              onClick={allerEtape2}
              disabled={!etape1Valide}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: etape1Valide ? "#B25C2A" : "#E5E1DA",
                color: etape1Valide ? "white" : "#94A3B8",
                border: "none", padding: "10px 22px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 600, cursor: etape1Valide ? "pointer" : "not-allowed",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              Analyser mon bien
              <i className="ti ti-arrow-right" style={{ fontSize: "15px" }} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 — Analyse & Confirmation ── */}
      {etape === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Chargement */}
          {analyse.loading && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "40px 24px", textAlign: "center" }}>
              <i className="ti ti-loader-2" style={{ fontSize: "28px", color: "#B25C2A", marginBottom: "12px", display: "block" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Analyse en cours…</div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>Vérification de l'exposition RGA et calcul d'éligibilité</div>
            </div>
          )}

          {!analyse.loading && (
            <>
              {/* Score climatique RGA */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
                  Score climatique — Exposition RGA à l'adresse
                </div>

                {analyse.exposition && (() => {
                  const style = EXPOSITION_STYLE[analyse.exposition]
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 18px", background: style.bg, borderRadius: "10px", border: `1px solid ${style.couleur}30`, marginBottom: "16px" }}>
                      <i className={`ti ${style.icone}`} style={{ fontSize: "28px", color: style.couleur, flexShrink: 0 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: style.couleur, marginBottom: "2px" }}>{style.label}</div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>
                          {infos.adresse}, {infos.code_postal} {infos.ville} — Source : Géorisques
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Jauge exposition */}
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8", marginBottom: "6px" }}>
                    <span>Non exposé</span><span>Exposition forte</span>
                  </div>
                  <div style={{ height: 8, borderRadius: "4px", background: "#E5E1DA", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: "4px", transition: "width 0.6s ease",
                      background: analyse.exposition === "forte" ? "#B91C1C"
                        : analyse.exposition === "moyenne" ? "#D97706"
                        : analyse.exposition === "faible" ? "#0369A1" : "#E5E1DA",
                      width: analyse.exposition === "forte" ? "100%"
                        : analyse.exposition === "moyenne" ? "65%"
                        : analyse.exposition === "faible" ? "33%" : "5%",
                    }} />
                  </div>
                </div>
              </div>

              {/* Éligibilité Fonds Prévention Argile */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
                  Éligibilité — Fonds de Prévention Argile
                </div>

                {/* Badge + score */}
                {(() => {
                  const badgeStyle = BADGE_STYLE[analyse.badge]
                  return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: badgeStyle.bg, borderRadius: "10px", border: `1px solid ${badgeStyle.border}`, marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <i className={`ti ${badgeStyle.icone}`} style={{ fontSize: "22px", color: badgeStyle.couleur }} aria-hidden="true" />
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: badgeStyle.couleur }}>{badgeStyle.label}</div>
                          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Arrêté du 23 avril 2026 — Expérimentation 11 depts</div>
                        </div>
                      </div>
                      {/* Score en % */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "28px", fontWeight: 700, color: badgeStyle.couleur, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                          {analyse.score_eligibilite} %
                        </div>
                        <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Score d'éligibilité</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Jauge score */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ height: 8, borderRadius: "4px", background: "#E5E1DA", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: "4px", transition: "width 0.8s ease",
                      background: analyse.score_eligibilite >= 70 ? "#1D9E75"
                        : analyse.score_eligibilite >= 45 ? "#D97706" : "#B91C1C",
                      width: `${analyse.score_eligibilite}%`,
                    }} />
                  </div>
                </div>

                {/* Détail critères */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {analyse.detail_criteres.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "8px", background: c.rempli ? "#F0FDF4" : "#F8F7F4", border: `1px solid ${c.rempli ? "#BBF7D0" : "#E5E1DA"}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.rempli ? "#1D9E75" : "#E5E1DA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                        <i className={`ti ${c.rempli ? "ti-check" : "ti-x"}`} style={{ fontSize: "11px", color: c.rempli ? "white" : "#94A3B8" }} aria-hidden="true" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: c.rempli ? "#065F46" : "#44403C" }}>{c.label}</span>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: c.rempli ? "#1D9E75" : "#94A3B8" }}>+{c.poids} %</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#78716C", marginTop: "2px" }}>{c.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
{/* Score climatique multi-aléas */}
                {analyse.aleas.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "10px" }}>
                      Score climatique par aléa
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {analyse.aleas.map((alea, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", background: alea.score >= 70 ? "#FEF2F2" : alea.score >= 35 ? "#FFF7ED" : "#F8F7F4", border: "1px solid #E5E1DA" }}>
                          <i className={`ti ${alea.icone}`} style={{ fontSize: "16px", color: alea.score >= 70 ? "#B91C1C" : alea.score >= 35 ? "#D97706" : "#94A3B8", flexShrink: 0 }} aria-hidden="true" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A" }}>{alea.label}</div>
                            {alea.statutAdresse && (
                              <div style={{ fontSize: "11px", color: "#78716C", marginTop: "1px" }}>{alea.statutAdresse}</div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: alea.score >= 70 ? "#B91C1C" : alea.score >= 35 ? "#D97706" : "#78716C", fontFamily: "'JetBrains Mono', monospace" }}>
                              {alea.score}
                            </div>
                            <div style={{ fontSize: "10px", color: "#94A3B8" }}>/ 100</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#0F172A", borderRadius: "8px", marginTop: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Score climatique global</span>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "white", fontFamily: "'JetBrains Mono', monospace" }}>{analyse.score_climatique} / 100</span>
                    </div>
                  </div>
                )}
                {/* Note ressources */}
                <div style={{ display: "flex", gap: "8px", padding: "10px 14px", background: "#EFF6FF", borderRadius: "8px", marginTop: "12px" }}>
                  <i className="ti ti-info-circle" style={{ fontSize: "15px", color: "#0369A1", flexShrink: 0, marginTop: "1px" }} aria-hidden="true" />
                  <div style={{ fontSize: "12px", color: "#1E3A5F", lineHeight: 1.5 }}>
                    Les conditions de ressources (plafonds ANAH) ne sont pas vérifiées ici. Votre consultant AGE vous accompagnera pour cette vérification.
                  </div>
                </div>
              </div>

              {/* Récapitulatif bien */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
                  Récapitulatif du bien
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "Nom",            val: infos.nom },
                    { label: "Adresse",        val: `${infos.adresse}, ${infos.code_postal} ${infos.ville}` },
                    { label: "Type",           val: infos.type_bien === "maison" ? "Maison individuelle" : "Appartement" },
                    { label: "Surface",        val: `${infos.surface} m²` },
                    { label: "Construction",   val: infos.annee_construction },
                    { label: "Occupation",     val: infos.statut_occupation === "proprietaire_occupant" ? "Propriétaire occupant" : infos.statut_occupation === "bailleur" ? "Bailleur" : "—" },
                    ...(infos.valeur_estimee ? [{ label: "Valeur estimée", val: `${parseInt(infos.valeur_estimee).toLocaleString("fr-FR")} €` }] : []),
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                      <span style={{ fontSize: "12px", color: "#78716C" }}>{row.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setEtape(1)}
                  style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Modifier
                </button>
                <button
                  onClick={creerBien}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: saving ? "#94A3B8" : "#B25C2A", color: "white",
                    border: "none", padding: "10px 22px", borderRadius: "8px",
                    fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {saving
                    ? <><i className="ti ti-loader-2" style={{ fontSize: "14px" }} aria-hidden="true" /> Enregistrement…</>
                    : <><i className="ti ti-home-check" style={{ fontSize: "14px" }} aria-hidden="true" /> Créer mon bien</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}