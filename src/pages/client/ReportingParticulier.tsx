import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Aléas Géorisques (mêmes clés que FicheActifParticulier.tsx) ──────────────
const ALEAS_CONFIG = [
  { key: "retraitGonflementArgile", label: "Retrait-gonflement des argiles", poids: 35 },
  { key: "inondation",              label: "Inondation",                    poids: 20 },
  { key: "remonteeNappe",           label: "Remontée de nappe",             poids: 15 },
  { key: "feuForet",                label: "Feux de forêt",                 poids: 15 },
  { key: "mouvementTerrain",        label: "Mouvements de terrain",         poids: 10 },
  { key: "seisme",                  label: "Séisme",                        poids: 5  },
]

// ─── Classes de risque (convention couleurs déjà utilisée sur la plateforme) ──
interface ClasseInfo { label: string; hex: string; seuil: number }
const CLASSES: ClasseInfo[] = [
  { label: "Faible",   hex: "#0F6E56", seuil: 25 },
  { label: "Modéré",   hex: "#D97706", seuil: 50 },
  { label: "Élevé",    hex: "#B91C1C", seuil: 75 },
  { label: "Critique", hex: "#7C3AED", seuil: 100 },
]

function classeDeScore(score: number): ClasseInfo {
  return CLASSES.find(c => score <= c.seuil) || CLASSES[CLASSES.length - 1]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function recommandations(score: number, expositionRga: string | null): string[] {
  const classe = classeDeScore(score)
  const reco: string[] = []

  if (classe.label === "Faible") {
    reco.push("Aucune action corrective immédiate n'est requise au regard des données disponibles.")
    reco.push("Maintenez une vigilance de routine : entretien courant du bâti, contrôle visuel après un épisode climatique marqué.")
  } else if (classe.label === "Modéré") {
    reco.push("Une vigilance accrue est recommandée sur ce bien.")
    reco.push("Un diagnostic de vulnérabilité permettrait d'objectiver précisément les points de fragilité et d'anticiper d'éventuels travaux préventifs.")
  } else if (classe.label === "Élevé") {
    reco.push("Un diagnostic de vulnérabilité approfondi est recommandé à court terme.")
    reco.push("Certains travaux de prévention ciblés peuvent réduire significativement le risque de sinistre sur ce bien.")
  } else {
    reco.push("Une action est recommandée en priorité au regard du niveau d'exposition constaté.")
    reco.push("Un diagnostic de vulnérabilité et la mise en œuvre de mesures de prévention adaptées sont fortement conseillés, idéalement avec l'appui d'un professionnel qualifié.")
  }

  if (expositionRga === "moyenne" || expositionRga === "forte") {
    reco.push("Ce bien se situe en zone d'exposition RGA — vérifiez votre éligibilité au Fonds de Prévention Argile (diagnostic et travaux préventifs pris en charge sous conditions).")
  }

  return reco
}

// ─── Échelle graphique — choisit une distance ronde adaptée à la largeur dispo
function choisirEchelle(totalMetres: number, largeurCarteMm: number): { metres: number; largeurMm: number } {
  const paliers = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]
  const metresParMm = totalMetres / largeurCarteMm
  const largeurCibleMm = largeurCarteMm * 0.3

  let meilleur = paliers[0]
  let meilleurEcart = Infinity
  for (const p of paliers) {
    const largeurMm = p / metresParMm
    const ecart = Math.abs(largeurMm - largeurCibleMm)
    if (ecart < meilleurEcart) { meilleurEcart = ecart; meilleur = p }
  }
  return { metres: meilleur, largeurMm: meilleur / metresParMm }
}

interface Actif {
  id: string
  nom: string
  adresse: string | null
  ville: string | null
  code_postal: string | null
  score_climatique: number | null
  exposition_rga: string | null
  georisques_data: any
  latitude: number | null
  longitude: number | null
}

interface DossierRGA {
  id: string
  statut: string
  updated_at: string
}

export default function ReportingParticulier() {
  const navigate = useNavigate()
  const [actifs, setActifs] = useState<Actif[]>([])
  const [actifSelectionne, setActifSelectionne] = useState("")
  const [dossierRga, setDossierRga] = useState<DossierRGA | null>(null)
  const [carnetExiste, setCarnetExiste] = useState(false)
  const [loading, setLoading] = useState(true)
  const [exportEnCours, setExportEnCours] = useState(false)

  useEffect(() => { chargerActifs() }, [])
  useEffect(() => { if (actifSelectionne) chargerDetail(actifSelectionne) }, [actifSelectionne])

  async function chargerActifs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("actifs")
      .select("id, nom, adresse, ville, code_postal, score_climatique, exposition_rga, georisques_data, latitude, longitude")
      .eq("user_id", user.id)
      .eq("categorie", "patrimoine_propre")

    setActifs(data || [])
    if (data && data.length > 0) setActifSelectionne(data[0].id)
    setLoading(false)
  }

  async function chargerDetail(actifId: string) {
    const { data: dossier } = await supabase
      .from("dossiers_rga")
      .select("id, statut, updated_at")
      .eq("actif_id", actifId)
      .maybeSingle()
    setDossierRga(dossier)

    const { data: carnet } = await supabase
      .from("carnet_logement_infos")
      .select("id")
      .eq("actif_id", actifId)
      .maybeSingle()
    setCarnetExiste(!!carnet)
  }

  // ── Récupération du plan de situation (IGN Géoplateforme, best-effort) ────
  // Format carré, corrigé de la distorsion longitude/latitude selon la latitude réelle
  async function recupererPlanSituation(lat: number, lon: number): Promise<string | null> {
    try {
      const latDelta = 0.0025
      const lonDelta = latDelta / Math.cos((lat * Math.PI) / 180)
      const bbox = `${(lat - latDelta).toFixed(6)},${(lon - lonDelta).toFixed(6)},${(lat + latDelta).toFixed(6)},${(lon + lonDelta).toFixed(6)}`
      const url = `https://data.geopf.fr/wms-r?LAYERS=HR.ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=900&HEIGHT=900`

      const res = await fetch(url)
      if (!res.ok) return null
      const blob = await res.blob()
      if (!blob.type.startsWith("image/")) return null

      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  // ── Export PDF enrichi ──────────────────────────────────────────────────
  async function exporterDiagnostic(actif: Actif) {
    setExportEnCours(true)
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    const pageWidth = 210
    const marge = 14
    const largeurUtile = pageWidth - marge * 2

    function piedDePage() {
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text("AGE Climate Platform — Diagnostic climatique généré automatiquement à partir de données publiques (Géorisques).", marge, 287)
      doc.text("Ce document est informatif et ne remplace pas une expertise technique réalisée sur site.", marge, 291)
    }

    // ── Bandeau d'en-tête ──
    doc.setFillColor(15, 110, 86) // #0F6E56
    doc.rect(0, 0, pageWidth, 32, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text("Diagnostic climatique du bien", marge, 18)
    doc.setFontSize(10)
    doc.text("AGE Climate Platform", marge, 26)

    let y = 42

    // ── Identité du bien ──
    doc.setTextColor(31, 41, 55)
    doc.setFontSize(13)
    doc.text(actif.nom, marge, y)
    y += 6
    doc.setFontSize(10)
    doc.setTextColor(120, 113, 108)
    if (actif.adresse) {
      doc.text(`${actif.adresse} — ${actif.code_postal || ""} ${actif.ville || ""}`, marge, y)
      y += 5
    }
    doc.text(`Rapport généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, marge, y)
    y += 12

    // ── Plan de situation (format carré, centré, résolution accrue) ──
    if (actif.latitude && actif.longitude) {
      const latDelta = 0.0025
      const mapDataUrl = await recupererPlanSituation(actif.latitude, actif.longitude)
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(12)
      doc.text("Plan de situation", marge, y)
      y += 6

      if (mapDataUrl) {
        const cotéCarte = 110 // mm — carré, plus compact que la pleine largeur
        const xCarte = marge + (largeurUtile - cotéCarte) / 2
        const yCarte = y

        doc.addImage(mapDataUrl, "JPEG", xCarte, yCarte, cotéCarte, cotéCarte)
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.rect(xCarte, yCarte, cotéCarte, cotéCarte, "S")

        // Marqueur au centre (le bien est centré sur la carte par construction)
        const xCentre = xCarte + cotéCarte / 2
        const yCentre = yCarte + cotéCarte / 2
        doc.setFillColor(185, 28, 28)
        doc.circle(xCentre, yCentre, 2.2, "F")
        doc.setDrawColor(255, 255, 255)
        doc.setLineWidth(0.6)
        doc.circle(xCentre, yCentre, 2.2, "S")

        // ── Rose des vents (coin haut droit de la carte) ──
        const xNord = xCarte + cotéCarte - 12
        const yNord = yCarte + 12
        doc.setFillColor(255, 255, 255)
        doc.circle(xNord, yNord, 7, "F")
        doc.setDrawColor(31, 41, 55)
        doc.setLineWidth(0.3)
        doc.circle(xNord, yNord, 7, "S")
        doc.setFillColor(31, 41, 55)
        doc.triangle(xNord, yNord - 5, xNord - 1.9, yNord + 0.8, xNord + 1.9, yNord + 0.8, "F")
        doc.setDrawColor(31, 41, 55)
        doc.setLineWidth(0.5)
        doc.line(xNord, yNord + 0.8, xNord, yNord + 4)
        doc.setFontSize(6.5)
        doc.setTextColor(31, 41, 55)
        doc.text("N", xNord - 1.1, yNord - 5.8)

        // ── Échelle graphique (coin bas gauche de la carte) ──
        const largeurTotaleMetres = 2 * latDelta * 111320
        const echelle = choisirEchelle(largeurTotaleMetres, cotéCarte)
        const xEchelleDebut = xCarte + 6
        const yEchelle = yCarte + cotéCarte - 8

        doc.setFillColor(255, 255, 255)
        doc.roundedRect(xCarte + 3, yEchelle - 6, echelle.largeurMm + 10, 12, 1, 1, "F")

        doc.setDrawColor(31, 41, 55)
        doc.setLineWidth(0.6)
        doc.line(xEchelleDebut, yEchelle, xEchelleDebut + echelle.largeurMm, yEchelle)
        doc.line(xEchelleDebut, yEchelle - 1.5, xEchelleDebut, yEchelle + 1.5)
        doc.line(xEchelleDebut + echelle.largeurMm, yEchelle - 1.5, xEchelleDebut + echelle.largeurMm, yEchelle + 1.5)
        doc.setFontSize(7)
        doc.setTextColor(31, 41, 55)
        const labelEchelle = echelle.metres >= 1000 ? `${echelle.metres / 1000} km` : `${echelle.metres} m`
        doc.text(labelEchelle, xEchelleDebut, yEchelle + 5)

        y += cotéCarte + 10
      } else {
        doc.setFontSize(9)
        doc.setTextColor(148, 163, 184)
        doc.text("Plan de situation non disponible pour ce bien.", marge, y)
        y += 10
      }
    }

    if (y > 240) { piedDePage(); doc.addPage(); y = 20 }

    // ── Score climatique global (jauge) ──
    doc.setTextColor(31, 41, 55)
    doc.setFontSize(12)
    doc.text("Score climatique global", marge, y)
    y += 8

    if (actif.score_climatique != null) {
      const score = actif.score_climatique
      const classe = classeDeScore(score)
      const largeurJauge = largeurUtile
      const hauteurJauge = 7

      let xSeg = marge
      let seuilPrec = 0
      for (const c of CLASSES) {
        const largeurSeg = ((c.seuil - seuilPrec) / 100) * largeurJauge
        const [r, g, b] = hexToRgb(c.hex)
        doc.setFillColor(r, g, b)
        doc.rect(xSeg, y, largeurSeg, hauteurJauge, "F")
        xSeg += largeurSeg
        seuilPrec = c.seuil
      }

      // Marqueur de position
      const xMarqueur = marge + (score / 100) * largeurJauge
      doc.setFillColor(31, 41, 55)
      doc.triangle(xMarqueur - 2.5, y - 3, xMarqueur + 2.5, y - 3, xMarqueur, y + 1, "F")

      y += hauteurJauge + 10
      doc.setFontSize(22)
      const [rc, gc, bc] = hexToRgb(classe.hex)
      doc.setTextColor(rc, gc, bc)
      doc.text(`${score} / 100`, marge, y)
      doc.setFontSize(11)
      doc.text(`— ${classe.label}`, marge + 32, y)
      y += 12
    } else {
      doc.setFontSize(10)
      doc.setTextColor(148, 163, 184)
      doc.text("Score non disponible.", marge, y)
      y += 10
    }

    // ── Exposition RGA ──
    if (actif.exposition_rga) {
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(12)
      doc.text("Exposition RGA (retrait-gonflement des argiles)", marge, y)
      y += 7
      doc.setFontSize(10)
      doc.setTextColor(120, 113, 108)
      doc.text(`Niveau d'exposition : ${actif.exposition_rga}`, marge, y)
      y += 10
    }

    // ── Détail par aléa (source : georisques_data.risquesNaturels) ──
    const risquesNaturels = actif.georisques_data?.risquesNaturels
    if (risquesNaturels) {
      if (y > 250) { piedDePage(); doc.addPage(); y = 20 }
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(12)
      doc.text("Détail par aléa", marge, y)
      y += 8
      doc.setFontSize(10)
      ALEAS_CONFIG.forEach(cfg => {
        if (y > 270) { piedDePage(); doc.addPage(); y = 20 }
        const alea = risquesNaturels[cfg.key]
        const present = alea?.present || false
        const statut = alea?.libelleStatutAdresse || null
        const val = present ? (statut || "Présent") : "Non concerné"
        const [r, g, b] = present ? hexToRgb("#B91C1C") : hexToRgb("#0F6E56")

        doc.setTextColor(31, 41, 55)
        doc.text(cfg.label, marge, y)
        doc.setTextColor(r, g, b)
        doc.text(val, marge + 90, y)
        y += 6
      })
      y += 6
    }

    // ── Recommandations ──
    if (actif.score_climatique != null) {
      if (y > 240) { piedDePage(); doc.addPage(); y = 20 }
      doc.setFillColor(240, 249, 255)
      const reco = recommandations(actif.score_climatique, actif.exposition_rga)
      const hauteurBloc = 10 + reco.length * 10
      doc.roundedRect(marge, y, largeurUtile, hauteurBloc, 2, 2, "F")
      doc.setTextColor(3, 105, 161)
      doc.setFontSize(11)
      doc.text("Recommandations", marge + 6, y + 8)
      let yReco = y + 15
      doc.setFontSize(9)
      doc.setTextColor(31, 41, 55)
      reco.forEach(r => {
        const lignes = doc.splitTextToSize(`•  ${r}`, largeurUtile - 12)
        doc.text(lignes, marge + 6, yReco)
        yReco += lignes.length * 5 + 3
      })
      y = yReco + 4
    }

    piedDePage()
    doc.save(`diagnostic-climatique-${actif.nom}.pdf`)
    setExportEnCours(false)
  }

  const styleCarte: React.CSSProperties = {
    background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px",
    padding: "20px", display: "flex", flexDirection: "column", gap: "12px",
  }

  const styleBouton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "#0F6E56", color: "white", border: "none",
    padding: "8px 16px", borderRadius: "7px", fontSize: "13px",
    fontWeight: 500, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start",
  }

  const styleBoutonSecondaire: React.CSSProperties = {
    ...styleBouton, background: "white", color: "#0F6E56", border: "1px solid #0F6E56",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  if (actifs.length === 0) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
        <i className="ti ti-file-analytics" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} />
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Aucun bien enregistré</div>
      </div>
    )
  }

  const actif = actifs.find(a => a.id === actifSelectionne)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {actifs.length > 1 && (
        <select
          value={actifSelectionne}
          onChange={e => setActifSelectionne(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", maxWidth: "320px" }}
        >
          {actifs.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
      )}

      {actif && (
        <div style={{ display: "grid", gap: "14px" }}>

          {/* Diagnostic climatique */}
          <div style={styleCarte}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-chart-radar" style={{ fontSize: "20px", color: "#1E40AF" }} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Diagnostic climatique du bien</div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  {actif.score_climatique != null ? `Score : ${actif.score_climatique} / 100` : "Score non disponible"}
                </div>
              </div>
            </div>
            {actif.score_climatique != null ? (
              <button onClick={() => exporterDiagnostic(actif)} disabled={exportEnCours} style={{ ...styleBouton, opacity: exportEnCours ? 0.6 : 1 }}>
                <i className="ti ti-download" style={{ fontSize: "14px" }} />
                {exportEnCours ? "Génération…" : "Télécharger le diagnostic (PDF)"}
              </button>
            ) : (
              <div style={{ fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>
                Diagnostic non disponible — contactez votre consultant AGE.
              </div>
            )}
          </div>

          {/* Dossier RGA */}
          <div style={styleCarte}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-home-search" style={{ fontSize: "20px", color: "#991B1B" }} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Dossier RGA — Fonds de Prévention</div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  {dossierRga ? `Statut actuel : ${dossierRga.statut}` : "Aucun dossier en cours"}
                </div>
              </div>
            </div>
            {dossierRga ? (
              <button onClick={() => navigate(`/client/dossier-rga/${actif.id}`)} style={styleBoutonSecondaire}>
                <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
                Voir le suivi complet
              </button>
            ) : (
              <a
                href="https://fonds-prevention-argile.beta.gouv.fr/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0F6E56", fontWeight: 500 }}
              >
                Vérifier mon éligibilité au Fonds de Prévention Argile
              </a>
            )}
          </div>

          {/* Carnet du logement */}
          <div style={styleCarte}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-notebook" style={{ fontSize: "20px", color: "#0F6E56" }} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Carnet d'Information du Logement</div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  {carnetExiste ? "Fiche technique complétée" : "À compléter"}
                </div>
              </div>
            </div>
            <button onClick={() => navigate("/client/carnet-logement")} style={styleBoutonSecondaire}>
              <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
              Accéder au carnet
            </button>
          </div>

        </div>
      )}
    </div>
  )
}