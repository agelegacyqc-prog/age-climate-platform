import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import CartePortefeuille from "../components/CartePortefeuille"

type Profil = "banque" | "assurance" | "particulier" | "collectivite" | "entreprise" | "expert" | null

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
  assurance: {
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
      { label: "Mon bien",            route: "/client/actifs", icon: "ti-home" },
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
      { label: "Mon territoire", route: "/metier/portefeuille", icon: "ti-map" },
      { label: "Reporting",      route: "/metier/reporting",    icon: "ti-file-analytics" },
    ],
    afficherCarte: true, afficherRoadmap: true,
    kpis: [
      { val: "47",     label: "Sites analysés",         tendance: "+5 ce mois",      tendanceColor: "#0F6E56" },
      { val: "62/100", label: "Score résilience moyen", tendance: "En amélioration", tendanceColor: "#0F6E56" },
      { val: "3",      label: "Rapports produits",       tendance: "Ce trimestre",    tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/metier/portefeuille", icon: "ti-map",            titre: "Mon territoire",             desc: "Vue géographique de vos sites et bâtiments" },
      { route: "/client/reporting",    icon: "ti-file-analytics", titre: "Reporting & Suivi",          desc: "Conformité et suivi des prestations commandées" },
      { route: "/marketplace",         icon: "ti-building-store", titre: "Marketplace",                desc: "Experts en énergie, carbone et prévention climatique" },
      { route: "/client/demandes",     icon: "ti-clipboard-list", titre: "Mes demandes",               desc: "Suivez vos demandes passées sur la marketplace" },
      { route: "/sensibilisation",     icon: "ti-shield",         titre: "Obligations réglementaires", desc: "Décret tertiaire, CSRD, risques climatiques" },
    ],
  },
  defaut: {
    sousTitre: "Comprendre, agir et collaborer pour un avenir climatique durable",
    boutons: [
      { label: "Voir le Dashboard", route: "/dashboard", icon: "ti-chart-bar" },
    ],
    afficherCarte: false, afficherRoadmap: false,
    kpis: [
      { val: "+1.4°C",  label: "Réchauffement actuel", tendance: "Depuis l'ère préindustrielle", tendanceColor: "#94A3B8" },
      { val: "421 ppm", label: "CO₂ atmosphérique",    tendance: "Record historique",             tendanceColor: "#B91C1C" },
      { val: "5",       label: "Projets actifs",         tendance: "Sur votre territoire",          tendanceColor: "#94A3B8" },
    ],
    raccourcis: [
      { route: "/dashboard",       icon: "ti-chart-bar",      titre: "Dashboard",       desc: "Visualisez les données climatiques" },
      { route: "/marketplace",     icon: "ti-building-store", titre: "Marketplace",     desc: "Prestations énergie, carbone et prévention" },
      { route: "/sensibilisation", icon: "ti-plant-2",        titre: "Sensibilisation", desc: "Découvrez les enjeux et obligations climatiques" },
      { route: "/projets",         icon: "ti-clipboard-list", titre: "Projets",         desc: "Participez aux initiatives locales" },
    ],
  },
}

const LABEL_PROFIL: Record<string, string> = {
  banque: "Banque", assurance: "Assurance", particulier: "Particulier",
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

const ALERTES_PAR_PROFIL: Record<string, AlerteRegl[]> = {
  entreprise: [
    { label: "Décret Tertiaire — rapport 2025",    echeance: "30/09/2025",      niveau: "orange" },
    { label: "Décret BACS — mise en conformité",   echeance: "01/01/2025",      niveau: "rouge"  },
    { label: "Audit énergétique — renouvellement", echeance: "01/11/2025",      niveau: "bleu"   },
  ],
  banque: [
    { label: "CSRD — reporting durabilité 2024",   echeance: "30/06/2025",      niveau: "rouge"  },
    { label: "SFDR — classification portefeuille", echeance: "31/12/2025",      niveau: "orange" },
    { label: "Brown Value — mise à jour actifs",   echeance: "01/10/2025",      niveau: "bleu"   },
  ],
  assurance: [
    { label: "SFDR — reporting durabilité",        echeance: "30/06/2025",      niveau: "rouge"  },
    { label: "CSRD — obligations 2025",            echeance: "31/12/2025",      niveau: "orange" },
    { label: "Score risque — révision annuelle",   echeance: "01/10/2025",      niveau: "bleu"   },
  ],
  collectivite: [
    { label: "Décret Tertiaire — rapport annuel",  echeance: "30/09/2025",      niveau: "orange" },
    { label: "Plan adaptation climatique",         echeance: "31/12/2025",      niveau: "bleu"   },
    { label: "Bilan GES territorial",              echeance: "01/06/2025",      niveau: "rouge"  },
  ],
  particulier: [
    { label: "DPE — validité 10 ans",              echeance: "Variable",         niveau: "orange" },
    { label: "Audit énergétique recommandé",       echeance: "Dès que possible", niveau: "bleu"   },
  ],
}

export default function Accueil() {
  const navigate = useNavigate()
  const [profil, setProfil]   = useState<Profil>(null)
  const [prenom, setPrenom]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [roadmap, setRoadmap] = useState<RoadmapEtape[]>([])

  useEffect(() => { chargerProfil() }, [])

  async function chargerProfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profilAGE } = await supabase
      .from("profils")
      .select("profil, prenom")
      .eq("id", user.id)
      .single()
  if (profilAGE) {
  setProfil(profilAGE.profil as Profil)
  setPrenom(profilAGE.prenom || null)

  // Charger la roadmap depuis profils_client
  const { data: clientData } = await supabase
    .from("profils_client")
    .select("roadmap")
    .eq("id", user.id)
    .single()
  if (clientData?.roadmap) setRoadmap(clientData.roadmap)

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
        banque: "banque", assurance: "assurance",
      }
      setProfil((mapping[profilClient.type_client] || profilClient.type_client) as Profil)
      if (profilClient.roadmap) setRoadmap(profilClient.roadmap)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  const config  = PROFIL_CONFIG[profil || "defaut"] || PROFIL_CONFIG.defaut
  const alertes = ALERTES_PAR_PROFIL[profil || ""] || []
  const today   = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const niveauStyle = {
    rouge:  { bg: "#FEF2F2", border: "#E24B4A", titre: "#501313", sous: "#A32D2D" },
    orange: { bg: "#FFFBEB", border: "#D97706", titre: "#412402", sous: "#854F0B" },
    bleu:   { bg: "#EFF6FF", border: "#378ADD", titre: "#042C53", sous: "#185FA5" },
  }

  const etapesDone  = roadmap.filter(e => e.statut === "complete").length
  const etapesTotal = roadmap.length
  const pctRoadmap  = etapesTotal > 0 ? Math.round(etapesDone / etapesTotal * 100) : 0

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
      {config.kpis.length > 0 && (
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
      )}

      {/* Accès rapides */}
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

      {/* Roadmap + Alertes */}
      {!loading && config.afficherRoadmap && (roadmap.length > 0 || alertes.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* Roadmap */}
          {roadmap.length > 0 && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Votre roadmap</div>
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>{etapesDone}/{etapesTotal} étapes</span>
              </div>
              <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden", marginBottom: "16px" }}>
                <div style={{ background: "#0F6E56", width: `${pctRoadmap}%`, height: "100%", borderRadius: "3px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {roadmap.map((e, i) => {
                  const done = e.statut === "complete"
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 12px", background: done ? "#ECFDF5" : "#F8FAFC", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#0F6E56" : "#E2E8F0", color: done ? "white" : "#94A3B8", fontSize: "11px", fontWeight: 600 }}>
                          {done ? <i className="ti ti-check" style={{ fontSize: "12px" }} aria-hidden="true" /> : i + 1}
                        </div>
                        <span style={{ fontSize: "13px", color: done ? "#065F46" : "#0F172A", fontWeight: done ? 500 : 400 }}>{e.label}</span>
                      </div>
                      {!done && e.route && (
                        <button onClick={() => navigate(e.route!)} style={{ background: "#0F6E56", color: "white", border: "none", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                          Démarrer
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Alertes réglementaires */}
          {alertes.length > 0 && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>Alertes réglementaires</div>
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
            </div>
          )}
        </div>
      )}

      {/* Cartographie */}
      {!loading && config.afficherCarte && <CartePortefeuille />}

    </div>
  )
}