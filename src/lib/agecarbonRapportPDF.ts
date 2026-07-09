import jsPDF from 'jspdf'
import type { RapportStructureAGEcarbon } from './agecarbonRapportIA'

// ─── Constantes charte AGEcarbon ───────────────────────────────────────────
const FOREST: [number, number, number] = [47, 125, 92]      // #2F7D5C
const ACCENT: [number, number, number] = [29, 158, 117]     // #1D9E75
const SLATE: [number, number, number] = [31, 41, 55]        // #1F2937
const STONE: [number, number, number] = [120, 113, 108]     // #78716C
const OFFWHITE: [number, number, number] = [248, 247, 244]  // #F8F7F4
const AMBER: [number, number, number] = [217, 119, 6]       // #D97706
const SKY: [number, number, number] = [3, 105, 161]         // #0369A1
const WHITE: [number, number, number] = [255, 255, 255]

const SECTIONS = ['INTRODUCTION', 'SYNTHÈSE', 'RÉSULTATS', 'AGIR', 'ANNEXES'] as const
type Section = typeof SECTIONS[number]

function formatFr(v: number, decimales = 2): string {
  return v.toFixed(decimales).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// jsPDF (polices Helvetica standard) n'encode pas les subscripts Unicode (₂, ₃...) —
// leur présence corrompt le calcul de largeur de splitTextToSize et fait disparaître
// des morceaux de texte adjacents. On les normalise en chiffres classiques avant rendu.
function nettoyerTexteJsPDF(texte: string): string {
  const SUBSCRIPTS: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  }
  return texte.replace(/[₀-₉]/g, (c) => SUBSCRIPTS[c] ?? c)
}

export interface BilanPourPDF {
  raison_sociale: string
  siren: string
  secteur_naf: string
  annee_reporting: number
}

export interface AgregesPourPDF {
  scope1: number
  scope2: number
  scope3: number
  total: number
  parPosteDetail?: { poste: string; tco2e: number }[]
}

export interface BarometrePourPDF {
  taux_teletravail_moyen_pct: number | null
  jours_teletravail_total: number | null
  empreinte_energie_teletravail_tco2e: number | null
  emissions_evitees_teletravail_tco2e: number | null
  distance_domicile_travail_km: number | null
  emissions_domicile_travail_tco2e: number | null
  mode_voiture_pct: number | null
  mode_covoiturage_pct: number | null
  mode_transports_commun_pct: number | null
  mode_velo_pct: number | null
  mode_marche_pct: number | null
  collaborateurs_covoiturage_pct: number | null
  sensibilisation_climat_pct: number | null
  collaborateurs_formes_climat_pct: number | null
  satisfaction_politique_climat_pct: number | null
}

export interface ImagesGraphiques {
  donutScopes: string | null
  barresPostes: string | null
  repartitionModes: string | null
}

// ─── En-tête / pied de page ────────────────────────────────────────────────

function dessinerEnTete(doc: jsPDF, sectionActive: Section, bilan: BilanPourPDF) {
  doc.setFillColor(...FOREST)
  doc.rect(0, 0, 210, 24, 'F')
  let x = 15
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  SECTIONS.forEach((s) => {
    const actif = s === sectionActive
    doc.setTextColor(actif ? 255 : 190, actif ? 255 : 214, actif ? 255 : 202)
    doc.text(s, x, 9)
    x += doc.getTextWidth(s) + 9
  })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`${nettoyerTexteJsPDF(bilan.raison_sociale)} · ${bilan.annee_reporting}`, 15, 18)
}

function dessinerPiedDePage(doc: jsPDF, numeroPage: number) {
  doc.setDrawColor(...OFFWHITE)
  doc.setTextColor(...STONE)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Bilan Carbone® — AGE Climate Platform', 15, 290)
  doc.text(`Page ${numeroPage}`, 195, 290, { align: 'right' })
}

function nouvellePage(doc: jsPDF, section: Section, bilan: BilanPourPDF, numeroPage: number) {
  doc.addPage()
  dessinerEnTete(doc, section, bilan)
  dessinerPiedDePage(doc, numeroPage)
}

function texteMultiligne(doc: jsPDF, texte: string, x: number, y: number, largeurMax: number, interligne = 5.8): number {
  const lignes = doc.splitTextToSize(nettoyerTexteJsPDF(texte), largeurMax)
  doc.text(lignes, x, y)
  return y + lignes.length * interligne
}

// ─── Composants visuels réutilisables ──────────────────────────────────────

/** Grand bloc statistique coloré (chiffre clé mis en avant) */
function blocStatistique(
  doc: jsPDF, x: number, y: number, largeur: number, hauteur: number,
  label: string, valeur: string, couleur: [number, number, number], couleurTexte: [number, number, number] = WHITE,
) {
  doc.setFillColor(...couleur)
  doc.roundedRect(x, y, largeur, hauteur, 3, 3, 'F')
  doc.setTextColor(...couleurTexte)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(label.toUpperCase(), x + 8, y + 12)
  doc.setFontSize(22)
  doc.text(valeur, x + 8, y + hauteur - 10)
}

/** Petite carte KPI (utilisée en grille sur les pages télétravail/baromètre) */
function carteKpi(doc: jsPDF, x: number, y: number, largeur: number, label: string, valeur: string, couleur: [number, number, number]) {
  const hauteur = 24
  doc.setFillColor(...OFFWHITE)
  doc.roundedRect(x, y, largeur, hauteur, 2, 2, 'F')
  doc.setFillColor(...couleur)
  doc.rect(x, y, 2.5, hauteur, 'F')
  doc.setTextColor(...STONE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const lignesLabel = doc.splitTextToSize(label, largeur - 12)
  doc.text(lignesLabel, x + 8, y + 8)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(valeur, x + 8, y + hauteur - 6)
  return hauteur
}

/** Barre de progression horizontale (% d'un poste sur le total) */
function barreProgression(doc: jsPDF, x: number, y: number, largeur: number, pct: number, couleur: [number, number, number]) {
  doc.setFillColor(...OFFWHITE)
  doc.roundedRect(x, y, largeur, 6, 3, 3, 'F')
  doc.setFillColor(...couleur)
  doc.roundedRect(x, y, largeur * Math.min(pct, 100) / 100, 6, 3, 3, 'F')
}

/** Badge circulaire numéroté (utilisé pour le plan d'actions) */
function badgeNumero(doc: jsPDF, x: number, y: number, numero: number, couleur: [number, number, number]) {
  doc.setFillColor(...couleur)
  doc.circle(x, y, 4.5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(String(numero), x, y + 1.3, { align: 'center' })
}

/** Cercle décoratif (remplissage visuel des pages peu denses) */
function cercleDecoratif(doc: jsPDF, x: number, y: number, rayon: number, couleur: [number, number, number], opaciteApprox: 'clair' | 'fonce' = 'clair') {
  if (opaciteApprox === 'clair') {
    doc.setFillColor(couleur[0] + (255 - couleur[0]) * 0.85, couleur[1] + (255 - couleur[1]) * 0.85, couleur[2] + (255 - couleur[2]) * 0.85)
  } else {
    doc.setFillColor(...couleur)
  }
  doc.circle(x, y, rayon, 'F')
}

// ─── Construction principale ────────────────────────────────────────────────

export function construirePdfRapportIA(
  rapport: RapportStructureAGEcarbon,
  bilan: BilanPourPDF,
  agreges: AgregesPourPDF,
  barometre: BarometrePourPDF | null,
  images: ImagesGraphiques,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let page = 1

  // ── Page 1 — Couverture ──
  doc.setFillColor(...FOREST)
  doc.rect(0, 0, 210, 297, 'F')
  cercleDecoratif(doc, 195, 30, 45, ACCENT, 'fonce')
  cercleDecoratif(doc, 10, 230, 60, ACCENT, 'fonce')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text('RAPPORT DE', 15, 118)
  doc.text('BILAN CARBONE®', 15, 132)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1.2)
  doc.line(15, 142, 65, 142)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(15)
  doc.text(nettoyerTexteJsPDF(bilan.raison_sociale), 15, 158)
  doc.setFontSize(11)
  doc.setTextColor(220, 235, 228)
  doc.text(`Année de reporting ${bilan.annee_reporting}`, 15, 167)
  if (bilan.siren) doc.text(`SIREN ${bilan.siren}`, 15, 174)

  doc.setFillColor(...ACCENT)
  doc.roundedRect(15, 190, 90, 22, 3, 3, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL ÉMISSIONS', 21, 199)
  doc.setFontSize(16)
  doc.text(`${formatFr(agreges.total)} tCO2e`, 21, 208)

  doc.setFontSize(9)
  doc.setTextColor(200, 220, 210)
  doc.setFont('helvetica', 'normal')
  doc.text('Généré avec assistance IA — AGE Climate Platform', 15, 275)
  doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, 15, 281)

  // ── Page 2 — Introduction : pourquoi agir ──
  nouvellePage(doc, 'INTRODUCTION', bilan, ++page)
  cercleDecoratif(doc, 190, 260, 35, FOREST)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Pourquoi agir ?', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.8)
  doc.line(15, 47, 40, 47)

  blocStatistique(doc, 15, 56, 85, 30, 'Total émissions', `${formatFr(agreges.total)} tCO2e`, FOREST)
  const pctScope1Intro = agreges.total > 0 ? (agreges.scope1 / agreges.total * 100) : 0
  blocStatistique(doc, 108, 56, 87, 30, 'Part Scope 1 (direct)', `${pctScope1Intro.toFixed(1)} %`, ACCENT)

  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  let y = texteMultiligne(doc, rapport.synthese.phrase_accroche, 15, 100, 180)
  y = texteMultiligne(doc, rapport.synthese.pourquoi_agir, 15, y + 8, 180)

  // ── Page 3 — Introduction : budget carbone ──
  nouvellePage(doc, 'INTRODUCTION', bilan, ++page)
  cercleDecoratif(doc, 15, 265, 30, ACCENT)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Le budget carbone', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y = texteMultiligne(doc, rapport.synthese.budget_carbone_contexte, 15, 58, 180)

  doc.setFillColor(...OFFWHITE)
  doc.roundedRect(15, y + 10, 180, 45, 3, 3, 'F')
  doc.setFillColor(...ACCENT)
  doc.rect(15, y + 10, 2.5, 45, 'F')
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('-45 %', 26, y + 30)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text("Réduction mondiale d'émissions requise d'ici 2030", 26, y + 40)
  doc.text('pour rester compatible avec une trajectoire 1,5°C (GIEC)', 26, y + 46)

  // ── Page 4 — Synthèse : total + donut scopes ──
  nouvellePage(doc, 'SYNTHÈSE', bilan, ++page)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text("Vue d'ensemble", 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)

  blocStatistique(doc, 15, 55, 180, 26, 'Total émissions', `${formatFr(agreges.total)} tCO2e`, ACCENT)

  if (images.donutScopes) {
    doc.addImage(images.donutScopes, 'PNG', 20, 90, 85, 65)
  }

  const scopesDetail: { label: string; val: number; couleur: [number, number, number] }[] = [
    { label: 'Scope 1 — Émissions directes', val: agreges.scope1, couleur: FOREST },
    { label: 'Scope 2 — Indirectes énergie', val: agreges.scope2, couleur: SKY },
    { label: 'Scope 3 — Autres indirectes', val: agreges.scope3, couleur: AMBER },
  ]
  let yScope = 95
  scopesDetail.forEach((s) => {
    const pct = agreges.total > 0 ? (s.val / agreges.total * 100) : 0
    doc.setFillColor(...s.couleur)
    doc.circle(115, yScope - 1.5, 2, 'F')
    doc.setTextColor(...SLATE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(s.label, 121, yScope)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...STONE)
    doc.text(`${formatFr(s.val)} tCO2e · ${pct.toFixed(1)} %`, 121, yScope + 5)
    barreProgression(doc, 121, yScope + 8, 68, pct, s.couleur)
    yScope += 22
  })

  // ── Page 5 — Résultats : vue d'ensemble par poste (barres) ──
  nouvellePage(doc, 'RÉSULTATS', bilan, ++page)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Résultats détaillés par poste', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  if (images.barresPostes) {
    doc.addImage(images.barresPostes, 'PNG', 15, 55, 180, 105)
  }
  y = 168
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...STONE)
  texteMultiligne(doc, "Répartition des émissions par poste d'activité, tous scopes confondus. Le détail de chaque poste est présenté dans les pages suivantes.", 15, y, 180)

  // ── Une page par poste réellement présent (dynamique) ──
  rapport.resultats_par_poste.forEach((p) => {
    nouvellePage(doc, 'RÉSULTATS', bilan, ++page)
    doc.setTextColor(...FOREST)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(nettoyerTexteJsPDF(p.libelle), 15, 42)
    doc.setDrawColor(...ACCENT)
    doc.line(15, 47, 40, 47)

    // Bandeau stat + barre de progression pour ce poste (données réelles)
    const posteReel = agreges.parPosteDetail?.find(d => d.poste === p.poste)
    if (posteReel) {
      blocStatistique(doc, 15, 55, 85, 28, 'Émissions du poste', `${formatFr(posteReel.tco2e)} tCO2e`, FOREST)
      const pctPoste = agreges.total > 0 ? (posteReel.tco2e / agreges.total * 100) : 0
      doc.setFillColor(...OFFWHITE)
      doc.roundedRect(108, 55, 87, 28, 3, 3, 'F')
      doc.setTextColor(...SLATE)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('PART DU BILAN TOTAL', 116, 65)
      doc.setFontSize(20)
      doc.setTextColor(...ACCENT)
      doc.text(`${pctPoste.toFixed(1)} %`, 116, 76)
      barreProgression(doc, 116, 79, 71, pctPoste, ACCENT)
      y = 95
    } else {
      y = 58
    }

    doc.setTextColor(...SLATE)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    texteMultiligne(doc, p.commentaire, 15, y + 10, 180)
  })

  // ── Page — Télétravail (grille de KPIs) ──
  nouvellePage(doc, 'RÉSULTATS', bilan, ++page)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Télétravail', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y = texteMultiligne(doc, rapport.teletravail, 15, 58, 180)

  if (barometre?.taux_teletravail_moyen_pct !== null && barometre?.taux_teletravail_moyen_pct !== undefined) {
    y += 8
    const kpisTeletravail: { label: string; valeur: string }[] = [
      { label: 'Taux moyen de télétravail', valeur: `${formatFr(barometre.taux_teletravail_moyen_pct, 1)} %` },
    ]
    if (barometre.jours_teletravail_total !== null) kpisTeletravail.push({ label: 'Jours télétravaillés (total)', valeur: String(barometre.jours_teletravail_total) })
    if (barometre.empreinte_energie_teletravail_tco2e !== null) kpisTeletravail.push({ label: 'Empreinte énergie télétravail', valeur: `${formatFr(barometre.empreinte_energie_teletravail_tco2e)} tCO2e` })
    if (barometre.emissions_evitees_teletravail_tco2e !== null) kpisTeletravail.push({ label: 'Émissions évitées', valeur: `${formatFr(barometre.emissions_evitees_teletravail_tco2e)} tCO2e` })

    let xk = 15
    let yk = y
    kpisTeletravail.forEach((kpi, i) => {
      if (i > 0 && i % 2 === 0) { yk += 30; xk = 15 }
      carteKpi(doc, xk, yk, 87, kpi.label, kpi.valeur, ACCENT)
      xk = xk === 15 ? 108 : 15
    })
  }

  // ── Page — Baromètre employés ──
  nouvellePage(doc, 'RÉSULTATS', bilan, ++page)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Baromètre employés', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y = texteMultiligne(doc, rapport.barometre_employes, 15, 58, 180)

  if (images.repartitionModes) {
    doc.addImage(images.repartitionModes, 'PNG', 30, y + 12, 150, 90)
  } else if (barometre?.sensibilisation_climat_pct !== null && barometre?.sensibilisation_climat_pct !== undefined) {
    const kpisSensi = [
      { label: 'Sensibilisation climat', valeur: `${formatFr(barometre.sensibilisation_climat_pct, 1)} %` },
      { label: 'Collaborateurs formés', valeur: barometre.collaborateurs_formes_climat_pct !== null ? `${formatFr(barometre.collaborateurs_formes_climat_pct, 1)} %` : '—' },
      { label: 'Satisfaction politique climat', valeur: barometre.satisfaction_politique_climat_pct !== null ? `${formatFr(barometre.satisfaction_politique_climat_pct, 1)} %` : '—' },
    ]
    let xk = 15
    kpisSensi.forEach((kpi) => {
      carteKpi(doc, xk, y + 10, 57, kpi.label, kpi.valeur, SKY)
      xk += 60
    })
  }

  // ── Page — Agir : typologie des actions ──
  nouvellePage(doc, 'AGIR', bilan, ++page)
  cercleDecoratif(doc, 195, 250, 40, ACCENT)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Typologie des actions climat', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y = texteMultiligne(doc, rapport.agir.typologie_intro, 15, 58, 180)

  const leviers = [
    { titre: 'Réduction', desc: 'Diminuer les émissions à la source', couleur: FOREST },
    { titre: 'Contribution', desc: 'Financer des projets de compensation certifiés', couleur: ACCENT },
    { titre: 'Sensibilisation', desc: 'Engager collaborateurs et parties prenantes', couleur: SKY },
  ]
  let xl = 15
  leviers.forEach((l) => {
    doc.setFillColor(...l.couleur)
    doc.roundedRect(xl, y + 10, 57, 34, 3, 3, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(l.titre, xl + 6, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lignes = doc.splitTextToSize(l.desc, 46)
    doc.text(lignes, xl + 6, y + 30)
    xl += 60
  })

  doc.setFontSize(8)
  doc.setTextColor(...STONE)
  doc.text('Typologie inspirée de la Net Zero Initiative (By Carbone 4)', 15, 280)

  // ── Page(s) — Plan d'actions (badges numérotés) ──
  nouvellePage(doc, 'AGIR', bilan, ++page)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text("Plan d'actions proposé", 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  y = 58
  rapport.agir.plan_actions.forEach((action, i) => {
    if (y > 262) {
      nouvellePage(doc, 'AGIR', bilan, ++page)
      y = 42
    }
    badgeNumero(doc, 19, y, i + 1, ACCENT)
    doc.setTextColor(...SLATE)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    y = texteMultiligne(doc, action, 28, y + 1.5, 167) + 5
  })

  // ── Page — Annexes ──
  nouvellePage(doc, 'ANNEXES', bilan, ++page)
  cercleDecoratif(doc, 15, 260, 25, FOREST)
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Annexes', 15, 42)
  doc.setDrawColor(...ACCENT)
  doc.line(15, 47, 40, 47)
  doc.setTextColor(...SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  texteMultiligne(doc, rapport.annexes, 15, 58, 180)

  // ── Page finale — CTA ──
  nouvellePage(doc, 'ANNEXES', bilan, ++page)
  doc.setFillColor(...FOREST)
  doc.rect(0, 24, 210, 273, 'F')
  cercleDecoratif(doc, 30, 100, 35, ACCENT, 'fonce')
  cercleDecoratif(doc, 180, 200, 45, ACCENT, 'fonce')
  doc.setFillColor(...WHITE)
  doc.roundedRect(30, 130, 150, 55, 4, 4, 'F')
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Pour aller plus loin,', 45, 155)
  doc.text('contactez votre consultant AGE Climate', 45, 165, { maxWidth: 120 })

  return doc
}