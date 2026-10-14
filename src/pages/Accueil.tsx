import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import CartePortefeuille from "../components/CartePortefeuille"
import ConsultantsRecommandes from "../components/ConsultantsRecommandes"

type Profil = "banque" | "assureur" | "particulier" | "collectivite" | "entreprise" | "expert" | null
interface DossierRGA {
  id: string
  type_mission: 'amo' | 'moe' | 'amo_moe'
  statut: string
  statut_updated_at: string
  actif: {
    nom: string
    adresse: string
    ville: string
    code_postal: string
    exposition_rga: string | null
  }
}

const STATUT_RGA_LABEL: Record<string, string> = {
  dossier_ouvert:               'Dossier ouvert',
  eligibilite_en_cours:         'Vérification d\'éligibilité en cours',
  eligible_confirme:            'Éligibilité confirmée',
  non_eligible:                 'Non éligible au dispositif',
  dossier_etudes_a_constituer:  'Constitution du dossier Études',
  complement_demande:           'Complément de pièces demandé',
  dossier_etudes_depose:        'Dossier déposé en DDT',
  aide_etudes_accordee:         'Aide Études accordée',
  diagnostic_en_cours:          'Diagnostic de vulnérabilité en cours',
  diagnostic_valide:            'Diagnostic validé',
  diagnostic_non_concluant:     'Diagnostic non concluant',
  dossier_travaux_a_constituer: 'Constitution du dossier Travaux',
  dossier_travaux_depose:       'Dossier Travaux déposé en DDT',
  aide_travaux_accordee:        'Aide Travaux accordée',
  travaux_en_cours:             'Travaux en cours',
  reception_travaux:            'Réception des travaux',
  dossier_cloture:              'Dossier clôturé',
}

const STATUT_RGA_COULEUR: Record<string, { bg: string; border: string; texte: string; icone: string }> = {
  dossier_ouvert:               { bg: '#F8F7F4', border: '#E5E1DA', texte: '#78716C', icone: 'ti-folder' },
  eligibilite_en_cours:         { bg: '#FFF7ED', border: '#D97706', texte: '#92400E', icone: 'ti-hourglass' },
  eligible_confirme:            { bg: '#ECFDF5', border: '#1D9E75', texte: '#065F46', icone: 'ti-circle-check' },
  non_eligible:                 { bg: '#FEF2F2', border: '#B91C1C', texte: '#7F1D1D', icone: 'ti-circle-x' },
  complement_demande:           { bg: '#FFF7ED', border: '#D97706', texte: '#92400E', icone: 'ti-alert-triangle' },
  dossier_etudes_depose:        { bg: '#EFF6FF', border: '#0369A1', texte: '#1E3A5F', icone: 'ti-send' },
  dossier_etudes_a_constituer:  { bg: '#F8F7F4', border: '#78716C', texte: '#44403C', icone: 'ti-clipboard-list' },
  aide_etudes_accordee:         { bg: '#ECFDF5', border: '#1D9E75', texte: '#065F46', icone: 'ti-circle-check' },
  diagnostic_en_cours:          { bg: '#EFF6FF', border: '#0369A1', texte: '#1E3A5F', icone: 'ti-search' },
  diagnostic_valide:            { bg: '#ECFDF5', border: '#1D9E75', texte: '#065F46', icone: 'ti-circle-check' },
  diagnostic_non_concluant:     { bg: '#FEF2F2', border: '#B91C1C', texte: '#7F1D1D', icone: 'ti-circle-x' },
  dossier_travaux_a_constituer: { bg: '#F8F7F4', border: '#78716C', texte: '#44403C', icone: 'ti-clipboard-list' },
  dossier_travaux_depose:       { bg: '#EFF6FF', border: '#0369A1', texte: '#1E3A5F', icone: 'ti-send' },
  aide_travaux_accordee:        { bg: '#ECFDF5', border: '#1D9E75', texte: '#065F46', icone: 'ti-circle-check' },
  travaux_en_cours:             { bg: '#FFF7ED', border: '#D97706', texte: '#92400E', icone: 'ti-tools' },
  reception_travaux:            { bg: '#ECFDF5', border: '#1D9E75', texte: '#065F46', icone: 'ti-home-check' },
  dossier_cloture:              { bg: '#ECFDF5', border: '#1D9E75', texte: '#065F46', icone: 'ti-archive' },
}

const MISSION_LABEL: Record<string, string> = {
  amo:     'AMO Études',
  moe:     'MOE Travaux',
  amo_moe: 'AMO + MOE',
}

const EXPOSITION_RGA: Record<string, { label: string; couleur: string }> = {
  forte:      { label: 'Zone exposition forte',   couleur: '#B91C1C' },
  moyenne:    { label: 'Zone exposition moyenne', couleur: '#D97706' },
  faible:     { label: 'Zone exposition faible',  couleur: '#0369A1' },
  non_expose: { label: 'Non exposé',              couleur: '#78716C' },
}
interface ProfilConfig {
  sousTitre: string
  boutons: { label: string; route: string; icon: string }[]
  afficherCarte: boolean
  afficherRoadmap: boolean
  kpis: { val: string; label: string; tendance?: string; tendanceColor?: string }[]
  raccourcis: { route: string; icon: string; titre: string; desc: string }[]
}

const PROFIL_CONFIG: Record<string, ProfilConfig> = {
  banque: {
    sousTitre: "Gérez le risque climatique de vos financements immobiliers",
    boutons: [
      { label: "Mes campagnes",  route: "/client/campagnes",      icon: "ti-speakerphone" },
      { label: "Créer un actif", route: "/client/actifs/nouveau", icon: "ti-plus" },
    ],
    afficherCarte: true, afficherRoadmap: true,
    kpis: [],
    raccourcis: [
      { route: "/client/campagnes",  icon: "ti-speakerphone",   titre: "Campagnes",                  desc: "Gérez vos campagnes d'analyse climatique" },
      { route: "/client/actifs",     icon: "ti-building",       titre: "Mon Patrimoine",             desc: "Vue consolidée de vos actifs financés" },
      { route: "/client/reporting",  icon: "ti-file-analytics", titre: "Reporting & Suivi",          desc: "Rapports CSRD, SFDR et suivi des prestations commandées" },
      { route: "/marketplace",       icon: "ti-building-store", titre: "Marketplace",                desc: "Accédez aux prestations énergie, carbone et prévention" },
      { route: "/client/demandes",   icon: "ti-clipboard-list", titre: "Mes demandes",               desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",   icon: "ti-leaf",           titre: "Obligations réglementaires", desc: "CSRD, Décret tertiaire, BACS, Bilan GES et Brown Value" },
    ],
  },
  assureur: {
    sousTitre: "Analysez l'exposition climatique de vos assurés",
    boutons: [
      { label: "Mes campagnes",  route: "/client/campagnes",      icon: "ti-speakerphone" },
      { label: "Créer un actif", route: "/client/actifs/nouveau", icon: "ti-plus" },
    ],
    afficherCarte: true, afficherRoadmap: true,
    kpis: [
      { val: "312",    label: "Biens assurés analysés", tendance: "+24 ce mois",   tendanceColor: "#0F6E56" },
      { val: "58/100", label: "Score risque moyen",     tendance: "Risque modéré", tendanceColor: "#D97706" },
      { val: "5",      label: "Campagnes actives",       tendance: "2 en attente", tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/client/campagnes",  icon: "ti-speakerphone",   titre: "Campagnes",                desc: "Gérez vos campagnes d'analyse climatique" },
      { route: "/client/actifs",     icon: "ti-building",       titre: "Mon Patrimoine",           desc: "Vue consolidée de l'exposition climatique" },
      { route: "/client/reporting",  icon: "ti-file-analytics", titre: "Reporting & Suivi",        desc: "Rapports SFDR, CSRD et suivi des prestations commandées" },
      { route: "/marketplace",       icon: "ti-building-store", titre: "Marketplace",              desc: "Prestations prévention, audit et accompagnement" },
      { route: "/client/demandes",   icon: "ti-clipboard-list", titre: "Mes demandes",             desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",   icon: "ti-shield",         titre: "Risques & Réglementation", desc: "TCFD, SFDR, CSRD, Brown Value et prévention climatique" },
    ],
  },
  particulier: {
    sousTitre: "Évaluez le risque climatique de votre bien immobilier",
    boutons: [
      { label: "Mon bien",            route: "/client/actifs/nouveau-particulier", icon: "ti-home" },
      { label: "Aides & Subventions", route: "/client/aides",  icon: "ti-coin" },
    ],
    afficherCarte: true, // <-- était false
    afficherRoadmap: true,
    kpis: [
      { val: "+1.4°C",  label: "Réchauffement actuel", tendance: "Depuis l'ère préindustrielle", tendanceColor: "#94A3B8" },
      { val: "421 ppm", label: "CO₂ atmosphérique",    tendance: "Record historique",             tendanceColor: "#B91C1C" },
      { val: "5",       label: "Projets actifs",         tendance: "Sur votre territoire",          tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/client/actifs",   icon: "ti-home",           titre: "Mon bien",            desc: "Analysez le risque climatique de votre bien" },
      { route: "/client/aides",    icon: "ti-coin",           titre: "Aides & Subventions", desc: "CEE, Fonds Barnier, ADEME — financements disponibles" },
      { route: "/marketplace",     icon: "ti-building-store", titre: "Trouver un expert",   desc: "Diagnostiqueurs, artisans et consultants certifiés" },
      { route: "/sensibilisation", icon: "ti-leaf",           titre: "S'informer",          desc: "Comprendre vos obligations et les enjeux climatiques" },
    ],
  },
  entreprise: {
    sousTitre: "Pilotez votre transition climatique et énergétique",
    boutons: [
      { label: "Mes campagnes",  route: "/client/campagnes",      icon: "ti-speakerphone" },
      { label: "Créer un actif", route: "/client/actifs/nouveau", icon: "ti-plus" },
    ],
    afficherCarte: true, afficherRoadmap: true,
    kpis: [],
    raccourcis: [
      { route: "/client/campagnes", icon: "ti-speakerphone",   titre: "Mes campagnes",              desc: "Gérez vos campagnes d'analyse climatique" },
      { route: "/client/actifs",    icon: "ti-building",       titre: "Mon Patrimoine",             desc: "Vue consolidée de vos actifs" },
      { route: "/client/reporting",  icon: "ti-file-analytics", titre: "Reporting & Suivi",          desc: "Rapports CSRD, SFDR et suivi des prestations commandées" },
      { route: "/marketplace",      icon: "ti-building-store", titre: "Marketplace",                desc: "Prestations énergie, carbone et prévention" },
      { route: "/client/demandes",  icon: "ti-clipboard-list", titre: "Mes demandes",               desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",  icon: "ti-leaf",           titre: "Obligations réglementaires", desc: "CSRD, Décret tertiaire, BACS, Bilan GES" },
    ],
  },
  expert: {
    sousTitre: "Accédez à vos outils métier et gérez vos missions",
    boutons: [
      { label: "Mes missions", route: "/metier/missions", icon: "ti-briefcase" },
    ],
    afficherCarte: false, afficherRoadmap: false,
    kpis: [],
    raccourcis: [
      { route: "/metier/missions",  icon: "ti-briefcase",      titre: "Mes missions",  desc: "Consultez et gérez vos missions AGE" },
      { route: "/marketplace",      icon: "ti-building-store", titre: "Marketplace",   desc: "Prestations et expertises disponibles" },
      { route: "/metier/reporting", icon: "ti-file-analytics", titre: "Reporting",     desc: "Rapports et suivi des prestations" },
      { route: "/sensibilisation",  icon: "ti-leaf",           titre: "Documentation", desc: "Ressources et obligations réglementaires" },
    ],
  },
  collectivite: {
    sousTitre: "Pilotez la résilience climatique de votre territoire",
    boutons: [
      { label: "Mon territoire", route: "/client/actifs",     icon: "ti-map" },
      { label: "Reporting",      route: "/client/reporting",  icon: "ti-file-analytics" },
    ],
    afficherCarte: true, afficherRoadmap: true,
    kpis: [
      { val: "47",     label: "Sites analysés",         tendance: "+5 ce mois",      tendanceColor: "#0F6E56" },
      { val: "62/100", label: "Score résilience moyen", tendance: "En amélioration", tendanceColor: "#0F6E56" },
      { val: "3",      label: "Rapports produits",       tendance: "Ce trimestre",    tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/client/actifs", icon: "ti-map", titre: "Mon territoire", desc: "Vue géographique de vos sites et bâtiments" },
      { route: "/client/reporting",    icon: "ti-file-analytics", titre: "Reporting & Suivi",          desc: "Conformité et suivi des prestations commandées" },
      { route: "/marketplace",         icon: "ti-building-store", titre: "Marketplace",                desc: "Experts en énergie, carbone et prévention climatique" },
      { route: "/client/demandes",     icon: "ti-clipboard-list", titre: "Mes demandes",               desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",     icon: "ti-shield",         titre: "Obligations réglementaires", desc: "Décret tertiaire, CSRD, risques climatiques" },
    ],
  },
  defaut: {
    sousTitre: "Comprendre, agir et collaborer pour un avenir climatique durable",
    boutons: [
      { label: "Découvrir la plateforme", route: "/sensibilisation", icon: "ti-leaf" },
    ],
    afficherCarte: false, afficherRoadmap: false,
    kpis: [
      { val: "+1.4°C",  label: "Réchauffement actuel", tendance: "Depuis l'ère préindustrielle", tendanceColor: "#94A3B8" },
      { val: "421 ppm", label: "CO₂ atmosphérique",    tendance: "Record historique",             tendanceColor: "#B91C1C" },
      { val: "5",       label: "Projets actifs",         tendance: "Sur votre territoire",          tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/marketplace", icon: "ti-building-store", titre: "Marketplace", desc: "Prestations énergie, carbone et prévention" },
      { route: "/marketplace",     icon: "ti-building-store", titre: "Marketplace",     desc: "Prestations énergie, carbone et prévention" },
      { route: "/sensibilisation", icon: "ti-plant-2",        titre: "Sensibilisation", desc: "Découvrez les enjeux et obligations climatiques" },
      { route: "/projets",         icon: "ti-clipboard-list", titre: "Projets",         desc: "Participez aux initiatives locales" },
    ],
  },
}

const LABEL_PROFIL: Record<string, string> = {
  banque: "Banque", assureur: "Assurance", particulier: "Particulier",
  collectivite: "Collectivité", entreprise: "Entreprise", expert: "Expert",
}

interface RoadmapEtape {
  id: string
  label: string
  statut: "complete" | "a_faire"
  route?: string
}

interface AlerteRegl {
  label: string
  echeance: string
  niveau: "rouge" | "orange" | "bleu"
}

// ─── État des lieux réglementaire : types et référentiel ─────────────────────
// Lignes de actifs_reglementaire (seules eligible + potentiel sont insérées à la création d'actif)
interface LigneRegl {
  id: string
  actif_id: string
  reglementation: string
  statut: string
  details: string | null
  echeance: string | null
  realise: boolean
  realise_le: string | null
}

interface ExpertLite {
  id: string
  user_id: string | null
  prenom: string
  nom: string
  competences: string[]
}

// Libellés et cadre : repris de calculerEligibilite() (NouvelActif.tsx)
const REGL_META: Record<string, { label: string; cadre: "france" | "europe" }> = {
  tertiaire:         { label: "Décret Tertiaire",       cadre: "france" },
  bacs:              { label: "Décret BACS",            cadre: "france" },
  loi_climat:        { label: "Loi Climat Résilience",  cadre: "france" },
  bilan_ges:         { label: "Bilan GES obligatoire",  cadre: "france" },
  audit_energetique: { label: "Audit Énergétique",      cadre: "france" },
  iso50001:          { label: "ISO 50001",              cadre: "france" },
  csrd:              { label: "CSRD",                   cadre: "europe" },
  eu_taxonomy:       { label: "EU Taxonomy",            cadre: "europe" },
  sfdr:              { label: "SFDR",                   cadre: "europe" },
  esrs:              { label: "ESRS",                   cadre: "europe" },
  ifrs_s2:           { label: "IFRS S2",                cadre: "europe" },
}

// Libellés des alertes (bloc « Alertes réglementaires »)
const ALERTE_LABELS: Record<string, string> = {
  tertiaire: "Décret Tertiaire — rapport annuel",
  bacs: "Décret BACS — mise en conformité",
  audit_energetique: "Audit énergétique — renouvellement",
  csrd: "CSRD — reporting durabilité",
  eu_taxonomy: "EU Taxonomy — alignement",
  sfdr: "SFDR — classification portefeuille",
  esrs: "ESRS — reporting durabilité",
  ifrs_s2: "IFRS S2 — reporting climatique",
  iso50001: "ISO 50001 — management énergie",
  bilan_ges: "Bilan GES — rapport annuel",
  loi_climat: "Loi Climat & Résilience",
}

const NBSP = "\u00A0"

function labelRegl(id: string): string {
  return REGL_META[id]?.label ?? id
}

// Date du jour au format AAAA-MM-JJ, en heure locale (comparaison lexicographique avec les dates SQL)
function aujourdhuiISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDateFR(iso: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

// score_reglementaire = réglementations réalisées / (éligibles + potentielles), en %
function scoreReglementaire(lignes: LigneRegl[]): number {
  const base = lignes.filter(l => l.statut === "eligible" || l.statut === "potentiel")
  if (base.length === 0) return 0
  return Math.round((base.filter(l => l.realise).length / base.length) * 100)
}

function estEnRetard(l: LigneRegl, aujourdhui: string): boolean {
  return l.statut === "eligible" && !l.realise && !!l.echeance && l.echeance.slice(0, 10) < aujourdhui
}

// Obligatoires d'abord, puis échéance croissante (sans échéance en dernier), puis libellé
function comparerActions(a: LigneRegl, b: LigneRegl): number {
  const rang = (l: LigneRegl) => (l.statut === "eligible" ? 0 : 1)
  if (rang(a) !== rang(b)) return rang(a) - rang(b)
  const ea = a.echeance ?? "9999-12-31"
  const eb = b.echeance ?? "9999-12-31"
  if (ea !== eb) return ea < eb ? -1 : 1
  return labelRegl(a.reglementation).localeCompare(labelRegl(b.reglementation), "fr")
}

function BlocDepliant({ titre, icon, dotColor, texte, children }: { titre: string; icon: string; dotColor: string; texte: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #111C2E", borderRadius: "10px", overflow: "hidden" }}>
      <div
        onClick={() => setOuvert(o => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOuvert(o => !o) } }}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        aria-expanded={ouvert}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <i className={`ti ${icon}`} style={{ fontSize: "16px", color: dotColor }} aria-hidden="true" />
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{titre}</span>
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>{texte}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={e => { e.stopPropagation(); setOuvert(o => !o) }}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-eye" style={{ fontSize: "14px" }} aria-hidden="true" />
            Voir
          </button>
          <i className={`ti ti-chevron-${ouvert ? "up" : "down"}`} style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
        </div>
      </div>
      {ouvert && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  )
}

// ─── Volet repliable (à l'intérieur de l'état des lieux) ─────────────────────
interface VoletProps {
  titre: string
  icone: string
  resume?: string
  ouvert: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Volet({ titre, icone, resume, ouvert, onToggle, children }: VoletProps) {
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        style={{
          boxSizing: "border-box", width: "100%", minHeight: "44px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          background: "transparent", border: "none", padding: 0,
          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <i className={`ti ${icone}`} style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A" }}>{titre}</span>
          {resume && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#475569" }}>{resume}</span>
          )}
        </span>
        <i
          className="ti ti-chevron-down"
          style={{ fontSize: "18px", color: "#475569", flexShrink: 0, transition: "transform 0.15s", transform: ouvert ? "rotate(180deg)" : "none" }}
          aria-hidden="true"
        />
      </button>
      {ouvert && children}
    </div>
  )
}

export default function Accueil() {
  const navigate = useNavigate()
  const [profil, setProfil]   = useState<Profil>(null)
  const [prenom, setPrenom]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpisReels, setKpisReels] = useState<{ val: string; label: string; tendance?: string; tendanceColor?: string }[] | null>(null)
  const [roadmap, setRoadmap] = useState<RoadmapEtape[]>([])
  const [dossiers, setDossiers] = useState<DossierRGA[]>([])

  // État des lieux réglementaire (source unique des alertes, des experts et des actions)
  const [actifsReg, setActifsReg]       = useState<{ id: string; nom: string }[]>([])
  const [lignes, setLignes]             = useState<LigneRegl[]>([])
  const [experts, setExperts]           = useState<ExpertLite[]>([])
  const [actifSelId, setActifSelId]     = useState<string | null>(null)
  const [enregistrement, setEnregistrement] = useState<string | null>(null) // id de la ligne en cours d'écriture
  const [erreurRegl, setErreurRegl]     = useState<string | null>(null)
  const [volets, setVolets]             = useState({ regl: true, actions: true })

  useEffect(() => { chargerProfil() }, [])

  // Charge les réglementations (éligibles + potentielles) de tous les actifs du client,
  // puis les experts de la marketplace (pour associer un expert à chaque action).
  async function chargerEtatReglementaire(liste: { id: string; nom: string | null }[]) {
    setActifsReg(liste.map(a => ({ id: a.id, nom: a.nom || "Actif sans nom" })))

    const { data: reglData, error } = await supabase
      .from("actifs_reglementaire")
      .select("id, actif_id, reglementation, statut, details, echeance, realise, realise_le")
      .in("actif_id", liste.map(a => a.id))
      .in("statut", ["eligible", "potentiel"])
    if (error) {
      console.error("Chargement des réglementations impossible", error)
      return
    }
    const rows = (reglData || []) as LigneRegl[]
    setLignes(rows)
    // Actif affiché par défaut : le premier qui a des réglementations enregistrées
    setActifSelId(prev => prev ?? (liste.find(a => rows.some(l => l.actif_id === a.id)) ?? liste[0]).id)

    const { data: expertsData } = await supabase
      .from("marketplace_consultants")
      .select("id, user_id, prenom, nom, competences")
      .eq("is_active", true)
    setExperts((expertsData || []) as ExpertLite[])
  }

  async function chargerProfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profilAGE } = await supabase
      .from("profils")
      .select("profil, prenom, role")
      .eq("id", user.id)
      .maybeSingle()

    if (profilAGE && profilAGE.role) {
      // Rediriger les admins vers l'espace métier
      if (profilAGE.role === 'partenaire') {
        navigate('/partenaire/dashboard')
        return
      }
      if (profilAGE.role === 'admin' || profilAGE.role === 'consultant' || profilAGE.role === 'admin_national' || profilAGE.role === 'responsable_regional') {
        navigate('/metier')
        return
      }
      setProfil(profilAGE.profil as Profil)
      setPrenom(profilAGE.prenom || null)

      // Charger la roadmap depuis profils_client
      const { data: clientData } = await supabase
        .from("profils_client")
        .select("roadmap")
        .eq("id", user.id)
        .single()
      if (clientData?.roadmap) setRoadmap(clientData.roadmap)

      // Charger l'état des lieux réglementaire (alertes, experts, actions)
      const { data: actifsData } = await supabase
        .from("actifs")
        .select("id, nom, score_climatique, created_at, categorie")
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .neq("categorie", "import_csv")

      if (actifsData && actifsData.length > 0) {
        await chargerEtatReglementaire(actifsData.map((a: any) => ({ id: a.id, nom: a.nom })))
      }

      setLoading(false)
      return
    }

    const { data: profilClient } = await supabase
      .from("profils_client")
      .select("type_client, sous_profil, roadmap")
      .eq("id", user.id)
      .single()

    if (profilClient) {
      const mapping: Record<string, string> = {
        banque_assurance: profilClient.sous_profil || "banque",
        proprietaire: "particulier", collectivite: "collectivite",
        entreprise: "entreprise", expert: "expert",
        banque: "banque", assurance: "assureur",
      }
      const profilResolu = (mapping[profilClient.type_client] || profilClient.type_client) as Profil
      setProfil(profilResolu)
      if (profilClient.roadmap) setRoadmap(profilClient.roadmap)

      // Charger l'état des lieux réglementaire (alertes, experts, actions)
      const { data: actifsData } = await supabase
        .from("actifs")
        .select("id, nom, score_climatique, created_at, categorie")
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .neq("categorie", "import_csv")

      if (actifsData && actifsData.length > 0) {
        await chargerEtatReglementaire(actifsData.map((a: any) => ({ id: a.id, nom: a.nom })))
      }

      // KPIs réels — remplace les valeurs figées de PROFIL_CONFIG pour
      // Assureur et Collectivité (P.O. 13/08/2026 : les chiffres codés en
      // dur induisaient le client en erreur sur son propre portefeuille)
      if (profilResolu === "assureur" || profilResolu === "collectivite") {
        // Assureur : uniquement les biens assurés (le patrimoine propre est exclu des KPI).
        // Collectivité : uniquement le patrimoine propre (décision P.O. 14/10/2026).
        const actifsKpi = (actifsData || []).filter((a: any) =>
          profilResolu === "assureur" ? a.categorie === "biens_assures" : a.categorie === "patrimoine_propre")
        const nbActifs = actifsKpi.length
        const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0)
        const nbActifsMois = actifsKpi.filter((a: any) => a.created_at && new Date(a.created_at) >= debutMois).length
        const scores = actifsKpi.map((a: any) => a.score_climatique).filter((s: any) => s != null).map(Number).filter(Number.isFinite)
        const scoreMoyen = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0

        if (profilResolu === "assureur") {
          const { data: campagnesData } = await supabase
            .from("campagnes")
            .select("id, statut")
            .eq("client_id", user.id)
            .eq("origine", "client")
            .eq("archivee", false)
          const nbCampagnesActives = (campagnesData || []).filter((c: any) => c.statut !== "termine" && c.statut !== "refusee").length
          const nbCampagnesAttente = (campagnesData || []).filter((c: any) => c.statut === "soumise").length

          setKpisReels([
            { val: String(nbActifs), label: "Biens assurés analysés", tendance: `+${nbActifsMois} ce mois`, tendanceColor: "#0F6E56" },
            { val: `${scoreMoyen}/100`, label: "Score risque moyen", tendance: scoreMoyen >= 70 ? "Risque élevé" : scoreMoyen >= 40 ? "Risque modéré" : "Risque faible", tendanceColor: scoreMoyen >= 70 ? "#B91C1C" : scoreMoyen >= 40 ? "#D97706" : "#0F6E56" },
            { val: String(nbCampagnesActives), label: "Campagnes actives", tendance: `${nbCampagnesAttente} en attente`, tendanceColor: "#94A3B8" },
          ])
        } else {
          const debutTrimestre = new Date()
          debutTrimestre.setMonth(Math.floor(debutTrimestre.getMonth() / 3) * 3, 1)
          debutTrimestre.setHours(0, 0, 0, 0)
          const { data: rapportsData } = await supabase
            .from("rapports_client")
            .select("id, created_at")
            .eq("client_id", user.id)
            .eq("statut", "disponible")
          const nbRapportsTrimestre = (rapportsData || []).filter((r: any) => new Date(r.created_at) >= debutTrimestre).length

          setKpisReels([
            { val: String(nbActifs), label: "Sites analysés", tendance: `+${nbActifsMois} ce mois`, tendanceColor: "#0F6E56" },
            { val: `${scoreMoyen}/100`, label: "Score résilience moyen", tendance: scoreMoyen >= 70 ? "Résilience élevée" : scoreMoyen >= 40 ? "En amélioration" : "À renforcer", tendanceColor: "#0F6E56" },
            { val: String(nbRapportsTrimestre), label: "Rapports produits", tendance: "Ce trimestre", tendanceColor: "#94A3B8" },
          ])
        }
      }

      // Chargement dossiers RGA si particulier
      if (profilClient.type_client === 'proprietaire') {
        const { data: dossiersData } = await supabase
          .from('dossiers_rga')
          .select(`
            id,
            type_mission,
            statut,
            statut_updated_at,
            actif:actif_id (
              nom,
              adresse,
              ville,
              code_postal,
              exposition_rga
            )
          `)
          .eq('client_id', user.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false })

        if (dossiersData) setDossiers(dossiersData as unknown as DossierRGA[])
      }

      setLoading(false)
      return
    }

    setLoading(false)
  }

  // Bascule Réalisé / Non réalisé : écriture optimiste, retour arrière en cas d'échec,
  // puis recalcul de actifs.score_reglementaire.
  async function basculerRealise(ligne: LigneRegl, realise: boolean) {
    if (ligne.realise === realise || enregistrement) return
    const realiseLe = realise ? aujourdhuiISO() : null
    const ligneApres: LigneRegl = { ...ligne, realise, realise_le: realiseLe }

    setLignes(prev => prev.map(l => (l.id === ligne.id ? ligneApres : l)))
    setErreurRegl(null)
    setEnregistrement(ligne.id)

    const { error } = await supabase
      .from("actifs_reglementaire")
      .update({ realise, realise_le: realiseLe })
      .eq("id", ligne.id)

    if (error) {
      console.error("Mise à jour du statut impossible", error)
      setLignes(prev => prev.map(l => (l.id === ligne.id ? ligne : l)))
      setErreurRegl("Le statut n'a pas pu être enregistré. Veuillez réessayer.")
      setEnregistrement(null)
      return
    }

    const lignesActif = lignes
      .filter(l => l.actif_id === ligne.actif_id)
      .map(l => (l.id === ligne.id ? ligneApres : l))
    const { error: errScore } = await supabase
      .from("actifs")
      .update({ score_reglementaire: scoreReglementaire(lignesActif) })
      .eq("id", ligne.actif_id)
    if (errScore) {
      console.error("Mise à jour du score réglementaire impossible", errScore)
      setErreurRegl("Statut enregistré, mais le score réglementaire n'a pas pu être mis à jour.")
    }
    setEnregistrement(null)
  }

  function basculerVolet(cle: "regl" | "actions") {
    setVolets(v => ({ ...v, [cle]: !v[cle] }))
  }

  const config  = loading ? PROFIL_CONFIG.defaut : (PROFIL_CONFIG[profil || "defaut"] || PROFIL_CONFIG.defaut)
  const kpisAffiches = kpisReels || config.kpis
  const aujourdhui = aujourdhuiISO()
  const today   = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  // ─── Alertes réglementaires : obligatoires non réalisées, dédupliquées par réglementation
  // (échéance la plus proche parmi les actifs) — mêmes seuils de couleur qu'avant.
  const alertes: AlerteRegl[] = (() => {
    const now = new Date()
    const vus = new Set<string>()
    const res: AlerteRegl[] = []
    lignes
      .filter(l => l.statut === "eligible" && !l.realise && !!l.echeance)
      .sort((a, b) => ((a.echeance as string) < (b.echeance as string) ? -1 : (a.echeance as string) > (b.echeance as string) ? 1 : 0))
      .forEach(l => {
        if (vus.has(l.reglementation)) return
        vus.add(l.reglementation)
        const echeance = new Date(l.echeance as string)
        const diffJours = Math.ceil((echeance.getTime() - now.getTime()) / 86400000)
        res.push({
          label: ALERTE_LABELS[l.reglementation] || labelRegl(l.reglementation),
          echeance: echeance.toLocaleDateString("fr-FR"),
          niveau: diffJours < 30 ? "rouge" : diffJours < 90 ? "orange" : "bleu",
        })
      })
    return res
  })()

  const niveauStyle = {
    rouge:  { bg: "#FEF2F2", border: "#E24B4A", titre: "#501313", sous: "#A32D2D" },
    orange: { bg: "#FFFBEB", border: "#D97706", titre: "#412402", sous: "#854F0B" },
    bleu:   { bg: "#EFF6FF", border: "#378ADD", titre: "#042C53", sous: "#185FA5" },
  }

  const etapesDone  = roadmap.filter(e => e.statut === "complete").length
  const etapesTotal = roadmap.length
  const pctRoadmap  = etapesTotal > 0 ? Math.round(etapesDone / etapesTotal * 100) : 0
  const nbRouge  = alertes.filter(a => a.niveau === "rouge").length
  const nbOrange = alertes.filter(a => a.niveau === "orange").length
  const alerteDot   = nbRouge > 0 ? "#B91C1C" : nbOrange > 0 ? "#D97706" : "#0369A1"
  const alerteTexte = nbRouge > 0 ? `· ${nbRouge} urgente${nbRouge > 1 ? "s" : ""} sur ${alertes.length}`
    : nbOrange > 0 ? `· ${nbOrange} à surveiller sur ${alertes.length}`
    : `· ${alertes.length} à venir`

  // ─── État des lieux : actif sélectionné ─────────────────────────────────────
  const actifsAvecRegl = actifsReg.filter(a => lignes.some(l => l.actif_id === a.id))
  const actifSel = actifsAvecRegl.find(a => a.id === actifSelId) ?? actifsAvecRegl[0] ?? null
  const lignesSel = actifSel ? lignes.filter(l => l.actif_id === actifSel.id) : []
  const nbObligatoire = lignesSel.filter(l => l.statut === "eligible").length
  const nbPotentiel   = lignesSel.filter(l => l.statut === "potentiel").length
  const nbRealisees   = lignesSel.filter(l => l.realise).length
  const scoreSel      = scoreReglementaire(lignesSel)
  const idsRealisees  = lignesSel.filter(l => l.realise).map(l => l.reglementation)
  const alertesRegl   = lignesSel.map(l => ({ reglementation: l.reglementation }))
  const lignesFrance  = lignesSel.filter(l => REGL_META[l.reglementation]?.cadre !== "europe")
  const lignesEurope  = lignesSel.filter(l => REGL_META[l.reglementation]?.cadre === "europe")
  const actionsAFaire = lignesSel.filter(l => !l.realise).sort(comparerActions)
  const nbRealiseesTotal = lignes.filter(l => l.realise).length
  const texteEtatDesLieux = `· ${nbRealiseesTotal} / ${lignes.length} réalisées`

  // ─── Ligne d'une réglementation ─────────────────────────────────────────────
  function renderLigneRegl(l: LigneRegl) {
    const faite = l.realise
    const obligatoire = l.statut === "eligible"
    const retard = estEnRetard(l, aujourdhui)
    const label = labelRegl(l.reglementation)
    const occupe = enregistrement === l.id
    const btnBase: React.CSSProperties = {
      boxSizing: "border-box", minHeight: "44px", padding: "8px 14px", border: "none",
      cursor: enregistrement ? "wait" : "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
    }
    return (
      <div
        key={l.id}
        style={{
          boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "16px", flexWrap: "wrap", padding: "14px 16px", borderRadius: "10px",
          border: `1px solid ${faite ? "#BFE3CC" : "#E2E8F0"}`,
          background: faite ? "#F0FAF4" : "#FFFFFF",
          opacity: occupe ? 0.7 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: "1 1 320px", minWidth: 0 }}>
          <i
            className={`ti ${faite ? "ti-circle-check" : "ti-circle"}`}
            style={{ fontSize: "22px", color: faite ? "#2F7D5C" : "#78716C", flexShrink: 0 }}
            aria-hidden="true"
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>{label}</span>
              <span style={{
                fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px",
                background: obligatoire ? "#DCFCE7" : "#FEF3C7",
                color: obligatoire ? "#2D6A4F" : "#92400E",
              }}>
                {obligatoire ? "Éligible — Obligatoire" : "Potentiellement éligible"}
              </span>
            </div>
            {l.details && (
              <div style={{ fontSize: "12px", color: "#57534E", marginTop: "6px", lineHeight: 1.5 }}>{l.details}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "4px", fontSize: "12px", color: "#57534E" }}>
              {l.echeance && (
                <span>
                  Échéance : <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>{formatDateFR(l.echeance)}</span>
                </span>
              )}
              {faite && l.realise_le && (
                <span style={{ color: "#2D6A4F", fontWeight: 500 }}>
                  Réalisé le <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatDateFR(l.realise_le)}</span>
                </span>
              )}
              {retard && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#B91C1C", fontWeight: 600 }}>
                  <i className="ti ti-circle-x" style={{ fontSize: "14px" }} aria-hidden="true" />
                  Échéance dépassée
                </span>
              )}
            </div>
          </div>
        </div>
        <div
          role="group"
          aria-label={`Statut de ${label}`}
          style={{ display: "flex", flexShrink: 0, border: "1px solid #D6D3D1", borderRadius: "8px", overflow: "hidden", background: "#FFFFFF" }}
        >
          <button
            type="button"
            aria-pressed={!faite}
            disabled={!!enregistrement}
            onClick={() => basculerRealise(l, false)}
            style={{ ...btnBase, background: faite ? "#FFFFFF" : "#57534E", color: faite ? "#57534E" : "#FFFFFF" }}
          >
            Non réalisé
          </button>
          <button
            type="button"
            aria-pressed={faite}
            disabled={!!enregistrement}
            onClick={() => basculerRealise(l, true)}
            style={{ ...btnBase, background: faite ? "#2D6A4F" : "#FFFFFF", color: faite ? "#FFFFFF" : "#57534E" }}
          >
            Réalisé
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Hero */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
        <div>
          {profil && (
            <div style={{ marginBottom: "8px" }}>
              <span style={{ background: "#ECFDF5", color: "#065F46", padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #A7F3D0" }}>
                {LABEL_PROFIL[profil]}
              </span>
            </div>
          )}
          <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#0F172A", marginBottom: "6px", letterSpacing: "-0.02em" }}>
            {loading ? "Chargement…" : prenom ? `Bonjour, ${prenom}` : "Bienvenue"}
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "0" }}>{config.sousTitre}</p>
          <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
        </div>
        {!loading && (
          <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
            {config.boutons.map((b, i) => (
              <button key={i} onClick={() => navigate(b.route)} style={{
                display: "flex", alignItems: "center", gap: "7px",
                background: i === 0 ? "#0F6E56" : "#FFFFFF",
                color: i === 0 ? "white" : "#0F172A",
                border: i === 0 ? "none" : "1px solid #E2E8F0",
                padding: "9px 18px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}>
                <i className={`ti ${b.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      {!loading && kpisAffiches.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {kpisAffiches.map((k, i) => (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>{k.label}</div>
              <div style={{ fontSize: "26px", fontWeight: 500, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: "6px", fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
              {k.tendance && (
                <div style={{ fontSize: "12px", color: k.tendanceColor || "#94A3B8", display: "flex", alignItems: "center", gap: "4px" }}>
                  {k.tendanceColor === "#0F6E56" && <i className="ti ti-trending-up" style={{ fontSize: "13px" }} aria-hidden="true" />}
                  {k.tendanceColor === "#B91C1C" && <i className="ti ti-alert-triangle" style={{ fontSize: "13px" }} aria-hidden="true" />}
                  {k.tendance}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dossiers RGA — particulier uniquement */}
      {profil === 'particulier' && !loading && dossiers.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Mes dossiers RGA — Fonds de Prévention Argile
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dossiers.map(d => {
              const couleur = STATUT_RGA_COULEUR[d.statut] || STATUT_RGA_COULEUR['dossier_ouvert']
              const expo    = d.actif?.exposition_rga ? EXPOSITION_RGA[d.actif.exposition_rga] : null
              return (
                <div key={d.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px 24px' }}>
                  {/* En-tête bien */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-home" style={{ fontSize: '20px', color: '#B25C2A' }} aria-hidden="true" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{d.actif?.nom || 'Bien immobilier'}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {d.actif?.adresse}, {d.actif?.code_postal} {d.actif?.ville}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {expo && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: expo.couleur, background: expo.couleur + '14', padding: '3px 8px', borderRadius: '4px', border: `1px solid ${expo.couleur}30` }}>
                          {expo.label}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#B25C2A', background: '#FFF7ED', padding: '3px 8px', borderRadius: '4px', border: '1px solid #F5D0B0' }}>
                        {MISSION_LABEL[d.type_mission] || d.type_mission}
                      </span>
                    </div>
                  </div>

                  {/* Statut courant */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: couleur.bg, borderRadius: '8px', borderLeft: `3px solid ${couleur.border}`, marginBottom: '16px' }}>
                    <i className={`ti ${couleur.icone}`} style={{ fontSize: '16px', color: couleur.border, flexShrink: 0 }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: couleur.texte }}>{STATUT_RGA_LABEL[d.statut] || d.statut}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        Mis à jour le {new Date(d.statut_updated_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/client/dossier-rga/${d.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#B25C2A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <i className="ti ti-eye" style={{ fontSize: '14px' }} aria-hidden="true" />
                      Voir le dossier
                    </button>
                    <button
                      onClick={() => navigate(`/client/documents-rga/${d.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <i className="ti ti-paperclip" style={{ fontSize: '14px' }} aria-hidden="true" />
                      Documents
                    </button>
                    <button
                      onClick={() => navigate('/client/messagerie')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <i className="ti ti-message" style={{ fontSize: '14px' }} aria-hidden="true" />
                      Messagerie
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Message si particulier sans dossier */}
      {profil === 'particulier' && !loading && dossiers.length === 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-layers" style={{ fontSize: '22px', color: '#B25C2A' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontWeight: 500, color: '#0F172A', fontSize: '14px', marginBottom: '4px' }}>Aucun dossier RGA en cours</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Votre consultant AGE ouvrira votre dossier Fonds de Prévention Argile dès le démarrage de la mission.</div>
          </div>
        </div>
      )}

      {/* Accès rapides */}
      {!loading && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
            Accès rapides
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {config.raccourcis.map((c, i) => (
              <div key={i} onClick={() => navigate(c.route)} style={{
                background: "#111C2E", borderLeft: "3px solid #1D9E75",
                borderRadius: "10px", padding: "16px 18px 16px 15px",
                cursor: "pointer", transition: "background 0.12s",
                display: "flex", alignItems: "flex-start", gap: "12px",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#16233A" }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "#111C2E" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "8px", background: "rgba(29,158,117,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: "18px", color: "#5DCAA5" }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "#FFFFFF", fontSize: "13px", marginBottom: "3px" }}>{c.titre}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État des lieux réglementaire : bascule Réalisé / Non réalisé, experts, actions (repliable) */}
      {!loading && actifSel && (
        <BlocDepliant titre="État des lieux réglementaire" icon="ti-checklist" dotColor="#0F6E56" texte={texteEtatDesLieux}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748B", lineHeight: 1.5, flex: "1 1 280px" }}>
                Indiquez, pour chaque réglementation, si elle est déjà réalisée. Vos experts et vos actions se mettent à jour.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="choix-actif-regl" style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Actif</label>
                <select
                  id="choix-actif-regl"
                  value={actifSel.id}
                  onChange={e => { setActifSelId(e.target.value); setErreurRegl(null) }}
                  style={{ boxSizing: "border-box", minHeight: "44px", minWidth: "240px", padding: "10px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", background: "#FFFFFF", fontSize: "14px", color: "#0F172A", fontFamily: "inherit" }}
                >
                  {actifsAvecRegl.map(a => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            {erreurRegl && (
              <div role="alert" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", fontWeight: 500 }}>
                <i className="ti ti-circle-x" style={{ fontSize: "16px" }} aria-hidden="true" />
                {erreurRegl}
              </div>
            )}

            {/* Compteurs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
              <div style={{ background: "#DCFCE7", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 500, color: "#2D6A4F" }}>{nbObligatoire}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#2D6A4F" }}>Obligatoire</span>
              </div>
              <div style={{ background: "#FEF3C7", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 500, color: "#92400E" }}>{nbPotentiel}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#92400E" }}>Potentiel</span>
              </div>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 500, color: "#0F172A" }}>{nbRealisees} / {lignesSel.length}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Réalisées</span>
              </div>
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 500, color: "#065F46" }}>{scoreSel}{NBSP}%</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#065F46" }}>Score réglementaire</span>
              </div>
            </div>

            {/* Réglementations */}
            <Volet
              titre="Réglementations"
              icone="ti-file-text"
              resume={`${nbRealisees} / ${lignesSel.length} réalisées`}
              ouvert={volets.regl}
              onToggle={() => basculerVolet("regl")}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {lignesFrance.length > 0 && (
                  <>
                    <h3 style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>Réglementations françaises</h3>
                    {lignesFrance.map(renderLigneRegl)}
                  </>
                )}
                {lignesEurope.length > 0 && (
                  <>
                    <h3 style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>Réglementations européennes</h3>
                    {lignesEurope.map(renderLigneRegl)}
                  </>
                )}
              </div>
            </Volet>

            {/* Experts : grisés quand toutes leurs réglementations sont réalisées */}
            <ConsultantsRecommandes
              alertesRegl={alertesRegl}
              realisees={idsRealisees}
              defaultOuvert
              seulementPertinents
            />

            {/* Actions à réaliser */}
            <Volet
              titre="Actions à réaliser"
              icone="ti-checklist"
              resume={`${actionsAFaire.length} action${actionsAFaire.length > 1 ? "s" : ""}`}
              ouvert={volets.actions}
              onToggle={() => basculerVolet("actions")}
            >
              {actionsAFaire.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px", background: "#F0FAF4", border: "1px solid #BFE3CC", borderRadius: "10px" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "24px", color: "#2F7D5C" }} aria-hidden="true" />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#2D6A4F" }}>Aucune action à réaliser</div>
                    <div style={{ fontSize: "12px", color: "#57534E", marginTop: "2px" }}>
                      Toutes les réglementations obligatoires et potentielles de cet actif sont marquées comme réalisées.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {actionsAFaire.map(l => {
                    const expertsRegl = experts.filter(e => e.competences.includes(l.reglementation))
                    const retard = estEnRetard(l, aujourdhui)
                    const obligatoire = l.statut === "eligible"
                    return (
                      <div
                        key={l.id}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", padding: "14px 16px", border: "1px solid #E2E8F0", borderRadius: "10px", background: "#FFFFFF" }}
                      >
                        <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>Réaliser : {labelRegl(l.reglementation)}</span>
                            <span style={{
                              fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px",
                              background: obligatoire ? "#DCFCE7" : "#FEF3C7",
                              color: obligatoire ? "#2D6A4F" : "#92400E",
                            }}>
                              {obligatoire ? "Obligatoire" : "Potentielle"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#57534E" }}>
                            <span>
                              Échéance : <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>{formatDateFR(l.echeance)}</span>
                            </span>
                            {retard && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#B91C1C", fontWeight: 600 }}>
                                <i className="ti ti-circle-x" style={{ fontSize: "14px" }} aria-hidden="true" />
                                Échéance dépassée
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          {expertsRegl.length === 0 ? (
                            <span style={{ fontSize: "12px", color: "#57534E" }}>Aucun expert associé pour l'instant</span>
                          ) : (
                            expertsRegl.map(e => (
                              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px", color: "#57534E" }}>
                                  Expert : <span style={{ fontWeight: 600, color: "#B25C2A" }}>{e.prenom} {e.nom}</span>
                                </span>
                                {e.user_id && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/client/prise-rdv/${e.user_id}`)}
                                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "#FFFFFF", border: "none", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 500, minHeight: "44px", fontFamily: "inherit" }}
                                  >
                                    <i className="ti ti-calendar-plus" style={{ fontSize: "14px" }} aria-hidden="true" />
                                    Voir l'agenda et réserver
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Volet>
          </div>
        </BlocDepliant>
      )}

      {/* Alertes réglementaires (obligatoires non réalisées, tous actifs) */}
      {!loading && alertes.length > 0 && (
        <BlocDepliant titre="Alertes réglementaires" icon="ti-alert-triangle" dotColor={alerteDot} texte={alerteTexte}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {alertes.map((a, i) => {
              const s = niveauStyle[a.niveau]
              return (
                <div key={i} style={{ padding: "10px 12px", background: s.bg, borderRadius: "0 8px 8px 0", borderLeft: `3px solid ${s.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: s.titre, marginBottom: "2px" }}>{a.label}</div>
                  <div style={{ fontSize: "11px", color: s.sous }}>Échéance : {a.echeance}</div>
                </div>
              )
            })}
          </div>
        </BlocDepliant>
      )}

      {/* Cartographie */}
      {!loading && config.afficherCarte && <CartePortefeuille />}

    </div>
  )
}
