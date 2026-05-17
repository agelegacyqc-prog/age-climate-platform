import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import CartePortefeuille from "../components/CartePortefeuille"

type Profil = "banque" | "assurance" | "particulier" | "collectivite" | null

interface ProfilConfig {
  sousTitre: string
  boutons: { label: string; route: string; icon: string }[]
  afficherCarte: boolean
  kpis: { val: string; label: string; tendance?: string; tendanceColor?: string }[]
  raccourcis: { route: string; icon: string; titre: string; desc: string }[]
}

const PROFIL_CONFIG: Record<string, ProfilConfig> = {
  banque: {
    sousTitre: "Gérez le risque climatique de vos financements immobiliers",
   boutons: [
  { label: "Mes campagnes", route: "/metier/campagnes",       icon: "ti-speakerphone" },
  { label: "Créer un actif", route: "/client/actifs/nouveau", icon: "ti-plus" },
],
    afficherCarte: true,
    kpis: [
      { val: "247",    label: "Actifs analysés",         tendance: "+12 ce mois",   tendanceColor: "#0F6E56" },
      { val: "−6,4 %", label: "Décote moy. Brown Value", tendance: "Sur 180 biens", tendanceColor: "#94A3B8" },
      { val: "8",      label: "Campagnes actives",        tendance: "3 en attente",  tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/metier/campagnes",    icon: "ti-speakerphone",   titre: "Campagnes",                  desc: "Gérez vos campagnes d'analyse climatique" },
      { route: "/client/actifs", icon: "ti-building", titre: "Mon Patrimoine", desc: "Vue consolidée de vos actifs financés" },
      { route: "/metier/reporting",    icon: "ti-file-analytics", titre: "Reporting & Suivi",          desc: "Rapports CSRD, SFDR et suivi des prestations commandées" },
      { route: "/marketplace",         icon: "ti-building-store", titre: "Marketplace",                desc: "Accédez aux prestations énergie, carbone et prévention" },
      { route: "/client/demandes", icon: "ti-clipboard-list", titre: "Mes demandes", desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",     icon: "ti-leaf",           titre: "Obligations réglementaires", desc: "CSRD, Décret tertiaire, BACS, Bilan GES et Brown Value" },
    ],
  },
  assurance: {
    sousTitre: "Analysez l'exposition climatique de vos assurés",

   boutons: [
  { label: "Mes campagnes",  route: "/metier/campagnes",       icon: "ti-speakerphone" },
  { label: "Créer un actif", route: "/client/actifs/nouveau",  icon: "ti-plus" },
],
    afficherCarte: true,
    kpis: [
      { val: "312",    label: "Biens assurés analysés", tendance: "+24 ce mois",   tendanceColor: "#0F6E56" },
      { val: "58/100", label: "Score risque moyen",     tendance: "Risque modéré", tendanceColor: "#D97706" },
      { val: "5",      label: "Campagnes actives",       tendance: "2 en attente", tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/metier/campagnes",    icon: "ti-speakerphone",   titre: "Campagnes",                desc: "Gérez vos campagnes d'analyse climatique" },
      { route: "/client/actifs", icon: "ti-building", titre: "Mon Patrimoine", desc: "Vue consolidée de l'exposition climatique" },
      { route: "/metier/reporting",    icon: "ti-file-analytics", titre: "Reporting & Suivi",        desc: "Rapports SFDR, CSRD et suivi des prestations commandées" },
      { route: "/marketplace",         icon: "ti-building-store", titre: "Marketplace",              desc: "Prestations prévention, audit et accompagnement" },
      { route: "/client/demandes", icon: "ti-clipboard-list", titre: "Mes demandes", desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",     icon: "ti-shield",         titre: "Risques & Réglementation", desc: "TCFD, SFDR, CSRD, Brown Value et prévention climatique" },
    ],
  },
  particulier: {
    sousTitre: "Évaluez le risque climatique de votre bien immobilier",
    boutons: [
      { label: "Mon bien",            route: "/client/actifs", icon: "ti-home" },
      { label: "Aides & Subventions", route: "/client/aides",  icon: "ti-coin" },
    ],
    afficherCarte: false,
    kpis: [
      { val: "+1.4°C",  label: "Réchauffement actuel", tendance: "Depuis l'ère préindustrielle", tendanceColor: "#94A3B8" },
      { val: "421 ppm", label: "CO₂ atmosphérique",    tendance: "Record historique",             tendanceColor: "#B91C1C" },
      { val: "5",       label: "Projets actifs",         tendance: "Sur votre territoire",          tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/client/actifs",   icon: "ti-home",           titre: "Mon bien",            desc: "Analysez le risque climatique de votre bien" },
      { route: "/client/aides",    icon: "ti-coin",            titre: "Aides & Subventions", desc: "CEE, Fonds Barnier, ADEME — financements disponibles" },
      { route: "/marketplace",     icon: "ti-building-store",  titre: "Trouver un expert",   desc: "Diagnostiqueurs, artisans et consultants certifiés" },
      { route: "/sensibilisation", icon: "ti-leaf",            titre: "S'informer",          desc: "Comprendre vos obligations et les enjeux climatiques" },
    ],
  },
  collectivite: {
    sousTitre: "Pilotez la résilience climatique de votre territoire",
    boutons: [
      { label: "Mon territoire", route: "/metier/portefeuille", icon: "ti-map" },
      { label: "Reporting",      route: "/metier/reporting",     icon: "ti-file-analytics" },
    ],
    afficherCarte: true,
    kpis: [
      { val: "47",     label: "Sites analysés",         tendance: "+5 ce mois",      tendanceColor: "#0F6E56" },
      { val: "62/100", label: "Score résilience moyen", tendance: "En amélioration", tendanceColor: "#0F6E56" },
      { val: "3",      label: "Rapports produits",       tendance: "Ce trimestre",    tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/metier/portefeuille", icon: "ti-map",            titre: "Mon territoire",             desc: "Vue géographique de vos sites et bâtiments" },
      { route: "/metier/reporting",    icon: "ti-file-analytics", titre: "Reporting & Suivi",          desc: "Conformité et suivi des prestations commandées" },
      { route: "/marketplace",         icon: "ti-building-store", titre: "Marketplace",                desc: "Experts en énergie, carbone et prévention climatique" },
      { route: "/client/demandes", icon: "ti-clipboard-list", titre: "Mes demandes", desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",     icon: "ti-shield",         titre: "Obligations réglementaires", desc: "Décret tertiaire, CSRD, risques climatiques" },
    ],
  },
  defaut: {
    sousTitre: "Comprendre, agir et collaborer pour un avenir climatique durable",
    boutons: [
      { label: "Voir le Dashboard", route: "/dashboard", icon: "ti-chart-bar" },
    ],
    afficherCarte: false,
    kpis: [
      { val: "+1.4°C",  label: "Réchauffement actuel", tendance: "Depuis l'ère préindustrielle", tendanceColor: "#94A3B8" },
      { val: "421 ppm", label: "CO₂ atmosphérique",    tendance: "Record historique",             tendanceColor: "#B91C1C" },
      { val: "5",       label: "Projets actifs",         tendance: "Sur votre territoire",          tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/dashboard",       icon: "ti-chart-bar",      titre: "Dashboard",     desc: "Visualisez les données climatiques" },
      { route: "/marketplace",     icon: "ti-building-store", titre: "Marketplace",   desc: "Prestations énergie, carbone et prévention" },
      { route: "/sensibilisation", icon: "ti-plant-2",        titre: "Sensibilisation",desc: "Découvrez les enjeux et obligations climatiques" },
      { route: "/projets",         icon: "ti-clipboard-list", titre: "Projets",        desc: "Participez aux initiatives locales" },
    ],
  },
}

const LABEL_PROFIL: Record<string, string> = {
  banque: "Banque", assurance: "Assurance",
  particulier: "Particulier", collectivite: "Collectivité",
}

export default function Accueil() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState<Profil>(null)
  const [prenom, setPrenom] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function chargerProfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from("profils")
        .select("profil, prenom")
        .eq("id", user.id)
        .single()
      if (data) {
        setProfil(data.profil as Profil)
        setPrenom(data.prenom || null)
      }
      setLoading(false)
    }
    chargerProfil()
  }, [])

  const config = PROFIL_CONFIG[profil || "defaut"] || PROFIL_CONFIG.defaut
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {config.kpis.map((k, i) => (
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

      {/* Accès rapides ← déplacé AVANT la cartographie */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
          Accès rapides
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {config.raccourcis.map((c, i) => (
            <div key={i} onClick={() => navigate(c.route)} style={{
              background: "#FFFFFF", border: "1px solid #E2E8F0",
              borderRadius: "10px", padding: "16px 18px",
              cursor: "pointer", transition: "border-color 0.12s, background 0.12s",
              display: "flex", alignItems: "flex-start", gap: "12px",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#A7F3D0"; (e.currentTarget as HTMLDivElement).style.background = "#FAFFFE" }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLDivElement).style.background = "#FFFFFF" }}
            >
              <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontWeight: 500, color: "#0F172A", fontSize: "13px", marginBottom: "3px" }}>{c.titre}</div>
                <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartographie du portefeuille ← déplacée APRÈS les accès rapides */}
      {!loading && config.afficherCarte && <CartePortefeuille />}

    </div>
  )
}