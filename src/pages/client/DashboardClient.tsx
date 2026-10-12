import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ConsultantsRecommandes from "../../components/ConsultantsRecommandes"

const enjeuxMap: Record<string, { label: string; icon: string; color: string }> = {
  energie:       { label: "Énergie",    icon: "ti-bolt",          color: "#D97706" },
  environnement: { label: "Carbone",    icon: "ti-plant-2",       color: "#065F46" },
  prevention:    { label: "Risques",    icon: "ti-shield",        color: "#991B1B" },
  resilience:    { label: "Résilience", icon: "ti-refresh",       color: "#1E40AF" },
  financement:   { label: "Aides",      icon: "ti-coin",          color: "#5B21B6" },
  reporting:     { label: "Reporting",  icon: "ti-file-analytics", color: "#0F172A" },
}

const profilsMap: Record<string, { label: string; icon: string }> = {
  entreprise:       { label: "Entreprise",        icon: "ti-building" },
  banque_assurance: { label: "Banque / Assurance", icon: "ti-building-bank" },
  banque:           { label: "Banque",             icon: "ti-building-bank" },
  assurance:        { label: "Assurance",          icon: "ti-shield" },
  proprietaire:     { label: "Propriétaire",       icon: "ti-home" },
  collectivite:     { label: "Collectivité",       icon: "ti-building-community" },
  expert:           { label: "Expert",             icon: "ti-search" },
}

const niveauxMap: Record<string, { label: string; color: string }> = {
  debutant: { label: "Débutant", color: "#991B1B" },
  en_cours: { label: "En cours", color: "#D97706" },
  avance:   { label: "Avancé",   color: "#065F46" },
}

const actionsRapides = [
  { label: "Mes actifs",          icon: "ti-building",       path: "/client/actifs" },
  { label: "Nouvelle campagne",   icon: "ti-speakerphone",   path: "/client/campagnes" },
  { label: "Marketplace",         icon: "ti-building-store", path: "/marketplace" },
  { label: "Modifier mon profil", icon: "ti-settings",       path: "/client/profil" },
]

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

const NBSP = "\u00a0"

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

// ─── Bloc KPI réutilisable ────────────────────────────────────────────────────
interface KpiBloc {
  titre: string
  accentColor: string
  accentBg: string
  kpis: { label: string; val: string | number; icon: string; color: string }[]
}

function BlocKPI({ titre, accentColor, accentBg, kpis }: KpiBloc) {
  return (
    <div style={{ marginBottom: "4px" }}>
      {/* Titre de section */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        marginBottom: "10px",
      }}>
        <div style={{
          width: "3px", height: "16px", borderRadius: "2px",
          background: accentColor, flexShrink: 0,
        }} />
        <span style={{
          fontSize: "11px", fontWeight: 600, color: "#94A3B8",
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          {titre}
        </span>
      </div>

      {/* Grille KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "10px", padding: "18px 20px",
            borderTop: `2px solid ${accentColor}`,
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: "12px",
            }}>
              <div style={{
                fontSize: "11px", fontWeight: 600, color: "#94A3B8",
                textTransform: "uppercase", letterSpacing: "0.07em",
              }}>
                {k.label}
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: "8px",
                background: accentBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: accentColor }} aria-hidden="true" />
              </div>
            </div>
            <div style={{
              fontSize: "26px", fontWeight: 500,
              color: k.color, fontFamily: "'DM Mono', monospace",
            }}>
              {k.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Volet repliable ──────────────────────────────────────────────────────────
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

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function DashboardClient() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser]     = useState<any>(null)
  const [profil, setProfil] = useState<any>(null)
  const [actifs, setActifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // État des lieux réglementaire
  const [reglParActif, setReglParActif] = useState<Record<string, LigneRegl[]>>({})
  const [experts, setExperts]           = useState<ExpertLite[]>([])
  const [actifSelId, setActifSelId]     = useState<string | null>(null)
  const [enregistrement, setEnregistrement] = useState<string | null>(null) // id de la ligne en cours d'écriture
  const [erreurRegl, setErreurRegl]     = useState<string | null>(null)
  const [volets, setVolets] = useState({ carte: true, regl: true, actions: true })

  useEffect(() => { loadData() }, [location.pathname])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data: profilData } = await supabase
      .from("profils_client")
      .select("*")
      .eq("id", user?.id)
      .single()

    if (!profilData?.onboarding_complete) {
      navigate("/onboarding")
      return
    }

    setProfil(profilData)

    const { data: actifsData } = await supabase
      .from("actifs")
      .select("*")
      .eq("user_id", user?.id)

    const liste: any[] = actifsData || []
    setActifs(liste)

    if (liste.length > 0) {
      // Réglementations de tous les actifs du client (une seule requête)
      const { data: reglData, error: reglErr } = await supabase
        .from("actifs_reglementaire")
        .select("id, actif_id, reglementation, statut, details, echeance, realise, realise_le")
        .in("actif_id", liste.map(a => a.id))
        .in("statut", ["eligible", "potentiel"])
      if (reglErr) console.error("Chargement des réglementations impossible", reglErr)

      const groupes: Record<string, LigneRegl[]> = {}
      ;((reglData || []) as LigneRegl[]).forEach(l => {
        if (!groupes[l.actif_id]) groupes[l.actif_id] = []
        groupes[l.actif_id].push(l)
      })
      setReglParActif(groupes)
      // Actif affiché par défaut : le premier qui a des réglementations enregistrées
      setActifSelId(prev => prev ?? (liste.find(a => (groupes[a.id] ?? []).length > 0) ?? liste[0]).id)

      // Experts (pour associer un expert à chaque action)
      const { data: expertsData } = await supabase
        .from("marketplace_consultants")
        .select("id, user_id, prenom, nom, competences")
        .eq("is_active", true)
      setExperts((expertsData || []) as ExpertLite[])
    }

    setLoading(false)
  }

  // Bascule Réalisé / Non réalisé : écriture optimiste, retour arrière en cas d'échec,
  // puis recalcul de actifs.score_reglementaire.
  async function basculerRealise(ligne: LigneRegl, realise: boolean) {
    if (ligne.realise === realise || enregistrement) return
    const realiseLe = realise ? aujourdhuiISO() : null
    const avant = reglParActif[ligne.actif_id] ?? []
    const apres = avant.map(l => (l.id === ligne.id ? { ...l, realise, realise_le: realiseLe } : l))

    setReglParActif(prev => ({ ...prev, [ligne.actif_id]: apres }))
    setErreurRegl(null)
    setEnregistrement(ligne.id)

    const { error } = await supabase
      .from("actifs_reglementaire")
      .update({ realise, realise_le: realiseLe })
      .eq("id", ligne.id)

    if (error) {
      console.error("Mise à jour du statut impossible", error)
      setReglParActif(prev => ({ ...prev, [ligne.actif_id]: avant }))
      setErreurRegl("Le statut n'a pas pu être enregistré. Veuillez réessayer.")
      setEnregistrement(null)
      return
    }

    const score = scoreReglementaire(apres)
    const { error: errScore } = await supabase
      .from("actifs")
      .update({ score_reglementaire: score })
      .eq("id", ligne.actif_id)

    if (errScore) {
      console.error("Mise à jour du score réglementaire impossible", errScore)
      setErreurRegl("Statut enregistré, mais le score réglementaire n'a pas pu être mis à jour.")
    } else {
      setActifs(prev => prev.map(a => (a.id === ligne.actif_id ? { ...a, score_reglementaire: score } : a)))
    }
    setEnregistrement(null)
  }

  function basculerVolet(cle: "carte" | "regl" | "actions") {
    setVolets(v => ({ ...v, [cle]: !v[cle] }))
  }

  function getRoadmapWithProgress(roadmap: any[]) {
    return roadmap.map(etape => {
      if (etape.id === "profil") return { ...etape, statut: "complete" }
      if (etape.id === "actif" && actifs.length > 0) return { ...etape, statut: "complete" }
      return etape
    })
  }

  if (loading) return (
    <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>
      Chargement…
    </div>
  )

  const typeClient = profil?.type_client as string
  const aujourdhui = aujourdhuiISO()

  // ─── Segmentation actifs par catégorie ──────────────────────────────────────
  const actifsPropres   = actifs.filter((a: any) => a.categorie === "patrimoine_propre")
  const actifsAssures   = actifs.filter((a: any) => a.categorie === "biens_assures")
  const actifsFinances  = actifs.filter((a: any) => a.categorie === "biens_finances")

  // ─── Roadmap ────────────────────────────────────────────────────────────────
  const roadmap = profil?.roadmap ? getRoadmapWithProgress(profil.roadmap) : []
  const roadmapComplete = roadmap.filter((e: any) => e.statut === "complete").length
  const roadmapTotal    = roadmap.length
  const progression     = roadmapTotal > 0 ? Math.round((roadmapComplete / roadmapTotal) * 100) : 0

  // ─── État des lieux réglementaire : actif sélectionné ───────────────────────
  const actifSel: any = actifs.find(a => a.id === actifSelId) ?? actifs[0] ?? null
  const lignesSel: LigneRegl[] = actifSel ? (reglParActif[actifSel.id] ?? []) : []
  const nbObligatoire = lignesSel.filter(l => l.statut === "eligible").length
  const nbPotentiel   = lignesSel.filter(l => l.statut === "potentiel").length
  const nbRealisees   = lignesSel.filter(l => l.realise).length
  const scoreSel      = scoreReglementaire(lignesSel)
  const idsRealisees  = lignesSel.filter(l => l.realise).map(l => l.reglementation)
  const alertesRegl   = lignesSel.map(l => ({ reglementation: l.reglementation }))
  const lignesFrance  = lignesSel.filter(l => REGL_META[l.reglementation]?.cadre !== "europe")
  const lignesEurope  = lignesSel.filter(l => REGL_META[l.reglementation]?.cadre === "europe")
  const actionsAFaire = lignesSel.filter(l => !l.realise).sort(comparerActions)

  // Alertes (colonne droite) : obligatoires non réalisées de l'actif, échéances les plus proches
  const alertesActif = lignesSel
    .filter(l => l.statut === "eligible" && !l.realise)
    .sort(comparerActions)
    .slice(0, 3)

  // KPI : obligatoires non réalisées sur le segment d'actifs
  function nbAlertesSegment(segment: any[]): number {
    return segment.reduce(
      (n, a) => n + (reglParActif[a.id] ?? []).filter(l => l.statut === "eligible" && !l.realise).length,
      0,
    )
  }

  // ─── KPI helpers ────────────────────────────────────────────────────────────
  function kpisForSegment(segment: any[]) {
    return [
      {
        label: "Actifs enregistrés",
        val: segment.length,
        icon: "ti-building",
        color: "#0F172A",
      },
      {
        label: "Alertes réglementaires",
        val: nbAlertesSegment(segment),
        icon: "ti-alert-triangle",
        color: "#D97706",
      },
      {
        label: "Analyses complétées",
        val: segment.filter((a: any) => a.statut_analyse === "complete").length,
        icon: "ti-circle-check",
        color: "#065F46",
      },
      {
        label: "Progression roadmap",
        val: `${progression} %`,
        icon: "ti-map",
        color: "#1E40AF",
      },
    ]
  }

  // ─── Rendu des KPI selon profil ──────────────────────────────────────────────
  function renderKPIs() {
    // Banque : 2 blocs — Mon Patrimoine + Biens financés
    if (typeClient === "banque") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <BlocKPI
            titre="Mon Patrimoine"
            accentColor="#0F6E56"
            accentBg="#ECFDF5"
            kpis={kpisForSegment(actifsPropres)}
          />
          <BlocKPI
            titre="Biens financés"
            accentColor="#0369A1"
            accentBg="#EFF6FF"
            kpis={kpisForSegment(actifsFinances)}
          />
        </div>
      )
    }

    // Assurance : 2 blocs — Mon Patrimoine + Biens assurés
    if (typeClient === "assurance") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <BlocKPI
            titre="Mon Patrimoine"
            accentColor="#0F6E56"
            accentBg="#ECFDF5"
            kpis={kpisForSegment(actifsPropres)}
          />
          <BlocKPI
            titre="Biens assurés"
            accentColor="#7C3AED"
            accentBg="#F5F3FF"
            kpis={kpisForSegment(actifsAssures)}
          />
        </div>
      )
    }

    // Tous les autres profils : 1 bloc générique
    return (
      <BlocKPI
        titre="Mon Patrimoine"
        accentColor="#0F6E56"
        accentBg="#ECFDF5"
        kpis={kpisForSegment(actifsPropres.length > 0 ? actifsPropres : actifs)}
      />
    )
  }

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

  // ─── Cartographie de l'actif ────────────────────────────────────────────────
  // Carte OpenStreetMap intégrée (iframe, sans dépendance). La cartographie SIG des aléas
  // (couches Géorisques) relève de la roadmap v1.2.
  function renderCarte() {
    const lat = Number(actifSel?.latitude)
    const lon = Number(actifSel?.longitude)
    const coordsOk = actifSel?.latitude != null && actifSel?.longitude != null && Number.isFinite(lat) && Number.isFinite(lon)
    if (!coordsOk) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", color: "#57534E" }}>
          <i className="ti ti-map-pin-off" style={{ fontSize: "18px", color: "#78716C" }} aria-hidden="true" />
          Coordonnées de l'actif non renseignées : la carte ne peut pas être affichée.
        </div>
      )
    }
    const dLon = 0.01
    const dLat = 0.006
    const src =
      "https://www.openstreetmap.org/export/embed.html" +
      `?bbox=${lon - dLon}%2C${lat - dLat}%2C${lon + dLon}%2C${lat + dLat}` +
      `&layer=mapnik&marker=${lat}%2C${lon}`
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <iframe
            title={`Carte de l'actif ${actifSel?.nom ?? ""}`}
            src={src}
            loading="lazy"
            style={{ display: "block", width: "100%", height: "280px", border: "none" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#57534E" }}>
          {actifSel?.adresse && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <i className="ti ti-map-pin" style={{ fontSize: "14px" }} aria-hidden="true" />
              {actifSel.adresse}{actifSel.code_postal ? `, ${actifSel.code_postal}` : ""}{actifSel.ville ? ` ${actifSel.ville}` : ""}
            </span>
          )}
          {actifSel?.exposition_rga && (
            <span>Exposition RGA : <b style={{ color: "#0F172A" }}>{actifSel.exposition_rga}</b></span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: "#FFFFFF", border: "1px solid #E2E8F0",
        borderRadius: "12px", padding: "20px 24px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "16px",
      }}>
        <div>
          <div style={{
            fontSize: "18px", fontWeight: 500, color: "#0F172A",
            marginBottom: "6px", letterSpacing: "-0.01em",
          }}>
            Bonjour{user?.email ? ` — ${user.email}` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {profil?.type_client && (
              <span style={{
                display: "flex", alignItems: "center", gap: "5px",
                background: "#ECFDF5", color: "#065F46",
                padding: "3px 10px", borderRadius: "4px",
                fontSize: "12px", fontWeight: 500,
                border: "1px solid #A7F3D0",
              }}>
                <i className={`ti ${profilsMap[profil.type_client]?.icon}`} style={{ fontSize: "13px" }} aria-hidden="true" />
                {profilsMap[profil.type_client]?.label}
              </span>
            )}
            {profil?.niveau && (
              <span style={{
                background: "#F1F5F9",
                color: niveauxMap[profil.niveau]?.color || "#64748B",
                padding: "3px 10px", borderRadius: "4px",
                fontSize: "12px", fontWeight: 500,
              }}>
                {niveauxMap[profil.niveau]?.label}
              </span>
            )}
            {profil?.enjeux?.map((e: string) => (
              <span key={e} style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "#F8FAFC", color: "#64748B",
                padding: "3px 10px", borderRadius: "4px",
                fontSize: "12px", border: "1px solid #E2E8F0",
              }}>
                <i className={`ti ${enjeuxMap[e]?.icon}`} style={{ fontSize: "12px" }} aria-hidden="true" />
                {enjeuxMap[e]?.label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate("/client/actifs/nouveau", { state: { from: "/client/accueil" } })}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "9px 18px", borderRadius: "8px", cursor: "pointer",
            fontWeight: 500, fontSize: "13px", fontFamily: "inherit",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Créer un actif
        </button>
      </div>

      {/* ── KPIs (1 ou 2 blocs selon profil) ─────────────────────────────── */}
      {renderKPIs()}

      {/* ── État des lieux réglementaire ──────────────────────────────────── */}
      {actifSel && (
        <section
          aria-labelledby="titre-etat-reglementaire"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h2 id="titre-etat-reglementaire" style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0F172A" }}>
                État des lieux réglementaire
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748B", lineHeight: 1.5 }}>
                Indiquez, pour chaque réglementation, si elle est déjà réalisée. Vos experts et vos actions se mettent à jour.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="choix-actif-regl" style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Actif</label>
              <select
                id="choix-actif-regl"
                value={actifSel.id}
                onChange={e => { setActifSelId(e.target.value); setErreurRegl(null) }}
                style={{ boxSizing: "border-box", minHeight: "44px", minWidth: "240px", padding: "10px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", background: "#FFFFFF", fontSize: "14px", color: "#0F172A", fontFamily: "inherit" }}
              >
                {actifs.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nom || a.raison_sociale || a.adresse || "Actif sans nom"}</option>
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

          {lignesSel.length === 0 ? (
            <div style={{ padding: "20px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: "13px", color: "#57534E" }}>
              Aucune réglementation enregistrée pour cet actif.
            </div>
          ) : (
            <>
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

              {/* Cartographie */}
              <Volet titre="Cartographie de l'actif" icone="ti-map-pin" ouvert={volets.carte} onToggle={() => basculerVolet("carte")}>
                {renderCarte()}
              </Volet>

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
            </>
          )}
        </section>
      )}

      {/* ── Corps principal ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        {/* Roadmap */}
        <div style={{
          background: "#FFFFFF", border: "1px solid #E2E8F0",
          borderRadius: "10px", padding: "20px",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px",
          }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>
              Votre roadmap personnalisée
            </div>
            <span style={{
              fontSize: "12px", color: "#94A3B8",
              fontFamily: "'DM Mono', monospace",
            }}>
              {roadmapComplete}/{roadmapTotal} étapes
            </span>
          </div>

          <div style={{
            background: "#F1F5F9", borderRadius: "4px",
            height: "6px", overflow: "hidden", marginBottom: "16px",
          }}>
            <div style={{
              background: "#0F6E56", width: `${progression}%`,
              height: "100%", borderRadius: "4px", transition: "width 0.5s",
            }} />
          </div>

          {roadmap.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "24px",
              color: "#94A3B8", fontSize: "13px",
            }}>
              Aucune roadmap —{" "}
              <button
                onClick={() => navigate("/onboarding")}
                style={{
                  color: "#0F6E56", background: "none", border: "none",
                  cursor: "pointer", fontWeight: 500, fontSize: "13px",
                  fontFamily: "inherit",
                }}
              >
                Compléter votre profil
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {roadmap.map((etape: any, i: number) => {
                const isDone   = etape.statut === "complete"
                const isActive = etape.statut === "en_cours"
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", borderRadius: "8px",
                    background: isDone ? "#ECFDF5" : isActive ? "#EFF6FF" : "#F8FAFC",
                    border: isActive ? "1px solid #BFDBFE" : "1px solid transparent",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isDone ? "#0F6E56" : isActive ? "#1D4ED8" : "#E2E8F0",
                      color: isDone || isActive ? "white" : "#94A3B8",
                      fontSize: "12px", fontWeight: 700,
                    }}>
                      {isDone ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
                    </div>
                    <div style={{
                      flex: 1, fontSize: "13px",
                      fontWeight: isDone ? 400 : 500,
                      color: isDone ? "#065F46" : "#0F172A",
                    }}>
                      {etape.label}
                    </div>
                    {etape.statut === "a_faire" && (
                      <button
                        onClick={() => {
                          // Roadmap étape "actif"
                          if (etape.id === "actif") navigate("/client/actifs/nouveau", { state: { from: "/client/accueil" } })
                          else if (etape.id === "aides")  navigate("/client/aides")
                          else if (etape.id === "marketplace") navigate("/marketplace")
                          else navigate("/client/actifs")
                        }}
                        style={{
                          background: "#0F6E56", color: "white", border: "none",
                          padding: "5px 12px", borderRadius: "6px", cursor: "pointer",
                          fontSize: "12px", fontWeight: 500, fontFamily: "inherit",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Démarrer
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Alertes réglementaires : obligatoires non réalisées de l'actif sélectionné */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "10px", padding: "16px 20px",
          }}>
            <div style={{
              fontSize: "14px", fontWeight: 500,
              color: "#0F172A", marginBottom: "12px",
            }}>
              Alertes réglementaires
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {alertesActif.map(l => {
                const retard = estEnRetard(l, aujourdhui)
                const couleur = retard ? "#B91C1C" : "#D97706"
                return (
                  <div key={l.id} style={{
                    display: "flex", gap: "10px",
                    padding: "10px 12px", background: retard ? "#FEF2F2" : "#FFFBEB",
                    borderRadius: "0 7px 7px 0",
                    borderLeft: `3px solid ${couleur}`,
                  }}>
                    <i className={`ti ${retard ? "ti-circle-x" : "ti-alert-triangle"}`} style={{
                      fontSize: "15px", color: couleur,
                      flexShrink: 0, marginTop: "1px",
                    }} aria-hidden="true" />
                    <div>
                      <div style={{
                        fontSize: "12px", fontWeight: 500,
                        color: "#0F172A", marginBottom: "2px",
                      }}>
                        {labelRegl(l.reglementation)} — à réaliser
                      </div>
                      <div style={{ fontSize: "11px", color: "#57534E" }}>
                        Échéance : {formatDateFR(l.echeance)}
                      </div>
                    </div>
                  </div>
                )
              })}
              {alertesActif.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#2D6A4F", fontWeight: 500 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "15px", color: "#2F7D5C" }} aria-hidden="true" />
                  Aucune réglementation obligatoire en attente
                </div>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "10px", padding: "16px 20px",
          }}>
            <div style={{
              fontSize: "14px", fontWeight: 500,
              color: "#0F172A", marginBottom: "12px",
            }}>
              Actions rapides
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {actionsRapides.map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 12px", borderRadius: "7px",
                    border: "1px solid #E2E8F0", background: "white",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    fontSize: "13px", color: "#0F172A", fontFamily: "inherit",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                >
                  <i className={`ti ${a.icon}`} style={{ fontSize: "16px", color: "#64748B" }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{a.label}</span>
                  <i className="ti ti-arrow-right" style={{ fontSize: "14px", color: "#CBD5E1" }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}