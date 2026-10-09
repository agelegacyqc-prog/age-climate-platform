import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { resolveAffectationClient } from "../lib/resolveAffectationClient"

// -- Types rôle / statut partenaire
type UserRole = "admin" | "client" | "partenaire" | "consultant"
interface UserContext {
  role: UserRole | null
}

const partenaires = [
  { id: 1, nom: "BatExpert Sud-Ouest",          type: "diagnostiqueur", ville: "Dax",            note: 4.8, avis: 124, familles: ["prevention"], specialites: ["RGA", "PPRI", "Feux"],                        disponible: true  },
  { id: 2, nom: "Cabinet Risques & Patrimoine", type: "bureau_etudes",  ville: "Pau",            note: 4.6, avis: 89,  familles: ["prevention","environnement"], specialites: ["RGA", "Submersion", "Bilan GES"], disponible: true  },
  { id: 3, nom: "Rénov Climat 40",              type: "artisan",        ville: "Mont-de-Marsan", note: 4.9, avis: 203, familles: ["energie"],     specialites: ["Travaux RGA", "Isolation"],                   disponible: false },
  { id: 4, nom: "Fonds Barnier Conseil",        type: "financeur",      ville: "Bordeaux",       note: 4.7, avis: 56,  familles: ["energie","prevention"], specialites: ["Fonds Barnier", "CEE", "Subventions"],  disponible: true  },
  { id: 5, nom: "GéoRisk Expertise",            type: "diagnostiqueur", ville: "Bayonne",        note: 4.5, avis: 78,  familles: ["prevention"], specialites: ["PPRI", "Tempête", "Brown Value"],              disponible: true  },
  { id: 6, nom: "Sud Bâtiment Résilience",      type: "artisan",        ville: "Tarbes",         note: 4.8, avis: 167, familles: ["energie"],    specialites: ["Isolation", "Surélévation"],                   disponible: true  },
  { id: 7, nom: "EcoAudit Conseil",             type: "bureau_etudes",  ville: "Bordeaux",       note: 4.7, avis: 94,  familles: ["environnement"], specialites: ["Bilan GES", "CSRD", "EU Taxonomy"],         disponible: true  },
  { id: 8, nom: "EnergiePerf Sud",              type: "consultant",     ville: "Toulouse",       note: 4.6, avis: 112, familles: ["energie"],    specialites: ["Décret Tertiaire", "BACS", "ISO 50001"],        disponible: true  },
  { id: 9, nom: "Adapt Territoire",             type: "consultant",     ville: "Montpellier",    note: 4.8, avis: 67,  familles: ["prevention","environnement"], specialites: ["Plan adaptation", "Score risque", "PPRI"], disponible: true },
]

const CONSULTANT_COLORS: Record<number, { color: string; bg: string }> = {
  1: { color: "#993C1D", bg: "#FAECE7" }, // coral
  2: { color: "#185FA5", bg: "#E6F1FB" }, // blue
  3: { color: "#0F6E56", bg: "#E1F5EE" }, // teal
  4: { color: "#534AB7", bg: "#EEEDFE" }, // purple
  5: { color: "#993556", bg: "#FBEAF0" }, // pink
  6: { color: "#993C1D", bg: "#FAECE7" }, // coral
  7: { color: "#185FA5", bg: "#E6F1FB" }, // blue
  8: { color: "#0F6E56", bg: "#E1F5EE" }, // teal
  9: { color: "#534AB7", bg: "#EEEDFE" }, // purple
}

// -- Domaines d'expertise (blocs cliquables de l'onglet Consultants AGE)
type DomaineId = "climat" | "energie" | "reglementation" | "it"

interface ConsultantAGE {
  id: number
  domaine: DomaineId
  type: string
  desc: string
  icon: string
  competences: string[]
  disponible: boolean
}

const DOMAINES: { id: DomaineId; label: string; icon: string; color: string; bg: string }[] = [
  { id: "climat",         label: "Climat",         icon: "ti-thermometer", color: "#0F6E56", bg: "#E6F4EF" },
  { id: "energie",        label: "Energie",        icon: "ti-bolt",        color: "#9A5B0A", bg: "#FBF1DC" },
  { id: "reglementation", label: "Réglementation", icon: "ti-scale",       color: "#2F5D8A", bg: "#E4EEF7" },
  { id: "it",             label: "IT",             icon: "ti-code",        color: "#5B4B9A", bg: "#ECE8F6" },
]

const consultantsAGE: ConsultantAGE[] = [
  { id: 1, domaine: "climat", type: "Expert Risques Climatiques",       desc: "Analyse et gestion des risques climatiques physiques et de transition", icon: "ti-shield",         competences: ["Score risque climatique", "Brown Value", "Analyse PPRI / RGA", "Plan d'adaptation"],                                                                               disponible: true  },
  { id: 2, domaine: "it", type: "Expert Geodata climatique",       desc: "Collecte, traitement et valorisation des données climatiques",          icon: "ti-database",       competences: ["Intégration API climat", "Traitement données satellite", "Analyse géospatiale", "Enrichissement bases immobilières"],                                    disponible: true  },
  { id: 3, domaine: "climat", type: "Expert Prévention Climatique",     desc: "Prévention des risques naturels et adaptation des actifs",              icon: "ti-refresh-alert",  competences: ["Organisation des campagnes", "Accompagnement aides et subventions", "Coordination interventions sur sites", "Fonds Barnier", "Fonds prévention RGA"],  disponible: true },
  { id: 4, domaine: "climat", type: "Expert Adaptation Climatique",     desc: "Stratégies d'adaptation au changement climatique",                     icon: "ti-plant-2",        competences: ["Diagnostic de vulnérabilité climatique", "Stratégie d'adaptation climatique", "Organisation des interventions travaux"],                                disponible: true  },
  { id: 5, domaine: "climat", type: "Expert Ingénierie Climatique",     desc: "Solutions techniques d'adaptation et de résilience",                   icon: "ti-tool",           competences: ["Mise en œuvre stratégie climatique", "Expertise aléas climatiques", "Coordination travaux"],                                                           disponible: true  },
  { id: 6, domaine: "reglementation", type: "Expert ESG / Conformité",          desc: "Conformité réglementaire et reporting ESG/CSRD",                       icon: "ti-file-analytics", competences: ["Stratégie RSE", "CSRD", "Taxonomie EU"],                                                                                                             disponible: true  },
  { id: 7, domaine: "energie", type: "Expert Performance Énergétique",   desc: "Optimisation énergétique et conformité réglementaire bâtiment",       icon: "ti-bolt",           competences: ["Décret Tertiaire", "BACS", "ISO 50001"],                                                                                                             disponible: true  },
  { id: 8, domaine: "energie", type: "Expert Carbone",                   desc: "Pilotage de la trajectoire carbone et neutralité",                     icon: "ti-leaf",           competences: ["BEGES", "Bilan GES"],                                                                                                                                disponible: true  },
  { id: 9, domaine: "it", type: "Expert Technologie Delphi", desc: "Maintenance, modernisation et intégration d'IA sur applications Delphi", icon: "ti-code", competences: ["Régie Delphi, Oracle ou .NET", "Pilote IA et audit", "Modernisation ciblée", "Intégration IA métier", "TMA au forfait", "Formation Delphi moderne et IA"], disponible: true },
]

const FAMILLES = [
  { id: "tous",          label: "Toutes prestations",      icon: "ti-layout-grid" },
  { id: "energie",       label: "Énergie",                 icon: "ti-bolt" },
  { id: "environnement", label: "Environnement & Carbone", icon: "ti-leaf" },
  { id: "prevention",    label: "Prévention climatique",   icon: "ti-shield" },
  { id: "autre",         label: "Audit & Subventions",     icon: "ti-coin" },
]

const PRESTATIONS = [
  { famille: "energie",       label: "Décret Tertiaire",        desc: "Obligation de réduction des consommations énergétiques" },
  { famille: "energie",       label: "Décret BACS",             desc: "Systèmes de régulation et automatisation du bâtiment" },
  { famille: "energie",       label: "ISO 50001",                desc: "Système de management de l'énergie" },
  { famille: "energie",       label: "CEE",                      desc: "Certificats d'économies d'énergie" },
  { famille: "energie",       label: "Audit énergétique",       desc: "Diagnostic complet des consommations énergétiques" },
  { famille: "environnement", label: "Bilan GES",                desc: "Bilan des émissions de gaz à effet de serre" },
  { famille: "environnement", label: "CSRD / ESRS",              desc: "Reporting de durabilité obligatoire" },
  { famille: "environnement", label: "EU Taxonomy",              desc: "Alignement avec la taxonomie européenne" },
  { famille: "environnement", label: "Plan de transition",      desc: "Stratégie de décarbonation à horizon 2030/2050" },
  { famille: "prevention",    label: "Score risque climatique", desc: "Évaluation de l'exposition aux aléas climatiques" },
  { famille: "prevention",    label: "Brown Value",             desc: "Décote climatique sur actifs immobiliers" },
  { famille: "prevention",    label: "Plan d'adaptation",      desc: "Stratégie de résilience face aux risques physiques" },
  { famille: "prevention",    label: "Analyse PPRI / RGA",     desc: "Étude d'exposition aux risques naturels" },
  { famille: "autre",         label: "Subventions & Aides",    desc: "Identification et montage des dossiers de financement" },
  { famille: "autre",         label: "Fonds Barnier",          desc: "Accompagnement au fonds de prévention des risques" },
]

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  diagnostiqueur: { label: "Diagnostiqueur",  color: "#1E40AF", bg: "#EFF6FF" },
  bureau_etudes:  { label: "Bureau d'études", color: "#5B21B6", bg: "#F5F3FF" },
  artisan:        { label: "Artisan",          color: "#92400E", bg: "#FFFBEB" },
  financeur:      { label: "Financeur",        color: "#065F46", bg: "#ECFDF5" },
  consultant:     { label: "Consultant",       color: "#0369A1", bg: "#E0F2FE" },
  autre:          { label: "Autre",            color: "#475569", bg: "#F1F5F9" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:            { label: "Soumise",            color: "#64748B", bg: "#F1F5F9" },
  en_qualification:   { label: "En qualification",   color: "#92400E", bg: "#FFFBEB" },
  entretien_planifie: { label: "Entretien planifié",  color: "#1E40AF", bg: "#EFF6FF" },
  validee:            { label: "Validée",             color: "#065F46", bg: "#ECFDF5" },
  dispatchee:         { label: "Dispatchée",          color: "#0369A1", bg: "#EFF6FF" },
  en_cours:           { label: "En cours",            color: "#5B21B6", bg: "#F5F3FF" },
  terminee:           { label: "Terminée",            color: "#065F46", bg: "#ECFDF5" },
  refusee:            { label: "Refusée",             color: "#991B1B", bg: "#FEF2F2" },
}

function iStyle(disabled = false): React.CSSProperties {
  return { width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", color: disabled ? "#94A3B8" : "#0F172A", background: disabled ? "#F8FAFC" : "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }
}

interface DemandeForm {
  type_prestation: string
  actif_id: string
  description: string
}

export default function Marketplace() {
  const navigate = useNavigate()
  const [consultantRegional, setConsultantRegional] = useState<{ id: string; prenom: string; nom: string; titre: string; region: string | null } | null>(null)
  const [onglet, setOnglet]               = useState("")
  const [filtreFamille, setFiltreFamille] = useState("tous")
  const [filtreType, setFiltreType]       = useState("tous")
  const [recherche, setRecherche]         = useState("")
  // Recherche d'expert en 2 étapes : null = étape 1 (choix du domaine), sinon étape 2 (choix de l'expert)
  const [filtreDomaine, setFiltreDomaine] = useState<DomaineId | null>(null)
  const consultantsFiltres = consultantsAGE.filter(c => filtreDomaine !== null && c.domaine === filtreDomaine)
  const domaineActif = DOMAINES.find(d => d.id === filtreDomaine)

  const [demandeOuverte, setDemandeOuverte] = useState<number | null>(null)
  const [sourceType, setSourceType]         = useState<"partenaire" | "consultant">("partenaire")
  const [formDemande, setFormDemande]       = useState<DemandeForm>({ type_prestation: "", actif_id: "", description: "" })
  const [loadingDemande, setLoadingDemande] = useState(false)
  const [succesDemande, setSuccesDemande]   = useState<number | null>(null)
  const [consultantActif, setConsultantActif] = useState<typeof consultantsAGE[0] | null>(null)

  // -- Contexte utilisateur
  const [userCtx, setUserCtx] = useState<UserContext>({ role: null })

  useEffect(() => {
    async function loadUserContext() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

const { data: profilAGE } = await supabase
  .from("profils")
  .select("role")
  .eq("id", user.id)
  .maybeSingle()

const { data: profilClient } = await supabase
  .from("profils_client")
  .select("type_client")
  .eq("id", user.id)
  .maybeSingle()

const role: UserRole | null = profilAGE?.role
  ? (profilAGE.role as UserRole)
  : profilClient
  ? "client"
  : null

      setUserCtx({ role })
    }
    loadUserContext()
  }, [])
  useEffect(() => {
  if (!userCtx.role) return
  if (userCtx.role === "admin") setOnglet("partenaires")
  else if (userCtx.role === "partenaire") navigate("/partenaire/dashboard", { replace: true })
  else setOnglet("consultants")
}, [userCtx.role])

  useEffect(() => {
    if (userCtx.role !== "client") return
    async function loadConsultantRegional() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const affectation = await resolveAffectationClient(user.id)
      if (!affectation?.consultant_id) { setConsultantRegional(null); return }

      const { data: profil } = await supabase
        .from("profils")
        .select("id, prenom, nom, region")
        .eq("id", affectation.consultant_id)
        .maybeSingle()

      if (!profil) { setConsultantRegional(null); return }

      setConsultantRegional({
        id: affectation.consultant_id,
        prenom: profil.prenom,
        nom: profil.nom,
        titre: "Votre consultant régional",
        region: profil.region || null,
      })
    }
    loadConsultantRegional()
  }, [userCtx.role])

 

function handleSwitchOnglet(o: string) {
    setOnglet(o)
  }

 async function handleEnvoyerDemande(partenaire: any) {
    if (!formDemande.type_prestation) return
    setLoadingDemande(true)
    const { data: { user } } = await supabase.auth.getUser()
    const affectation = user ? await resolveAffectationClient(user.id) : null
    await supabase.from("demandes_marketplace").insert({
      type_prestation: formDemande.type_prestation,
      description: formDemande.description,
      actif_id: formDemande.actif_id || null,
      statut: "soumise",
      client_id: user?.id || null,
      note_age: `Partenaire demandé : ${partenaire.nom}`,
      responsable_id: affectation?.responsable_region_id ?? null,
      consultant_id: affectation?.consultant_id ?? null,
    })
setSuccesDemande(partenaire.id)
    setLoadingDemande(false)
    setTimeout(() => { setSuccesDemande(null); setDemandeOuverte(null); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }, 3000)
  }

 async function handleEnvoyerDemandeConsultant(consultant: typeof consultantsAGE[0]) {
    if (!formDemande.type_prestation) return
    setLoadingDemande(true)
    const { data: { user } } = await supabase.auth.getUser()
    const affectation = user ? await resolveAffectationClient(user.id) : null
    await supabase.from("demandes_marketplace").insert({
      type_prestation: formDemande.type_prestation,
      description: formDemande.description,
      statut: "soumise",
      client_id: user?.id || null,
      note_age: `Consultant AGE demandé : ${consultant.type}`,
      responsable_id: affectation?.responsable_region_id ?? null,
      consultant_id: affectation?.consultant_id ?? null,
    })
setSuccesDemande(consultant.id)
    setLoadingDemande(false)
    setTimeout(() => { setSuccesDemande(null); setDemandeOuverte(null); setConsultantActif(null); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }, 3000)
  }

  const partenairesAffiches = partenaires.filter(p => {
    if (filtreFamille !== "tous" && !p.familles.includes(filtreFamille)) return false
    if (filtreType !== "tous" && p.type !== filtreType) return false
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase()) && !p.ville.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  
const onglets = !userCtx.role ? [] : [
  ...(userCtx.role === "admin"
    ? [{ id: "partenaires", label: "Partenaires", icon: "ti-building-store" }]
    : []),
  ...(userCtx.role !== "partenaire"
    ? [{ id: "consultants", label: "Consultants AGE", icon: "ti-users" }]
    : []),
]


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {onglets.map(o => (
          <button key={o.id} onClick={() => handleSwitchOnglet(o.id)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 16px", borderRadius: "7px", border: "none",
            cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
            fontWeight: onglet === o.id ? 500 : 400,
            background: onglet === o.id ? "#ECFDF5" : "transparent",
            color: onglet === o.id ? "#065F46" : "#64748B",
            transition: "all 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
         
          </button>
        ))}
      </div>

      {/* ── PARTENAIRES ── */}
      {onglet === "partenaires" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
            {FAMILLES.map(f => (
              <button key={f.id} onClick={() => setFiltreFamille(f.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                padding: "12px 8px", borderRadius: "9px",
                border: `1px solid ${filtreFamille === f.id ? "#0F6E56" : "#E2E8F0"}`,
                background: filtreFamille === f.id ? "#ECFDF5" : "#FFFFFF",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: "20px", color: filtreFamille === f.id ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
                <span style={{ fontSize: "11px", fontWeight: filtreFamille === f.id ? 600 : 400, color: filtreFamille === f.id ? "#065F46" : "#64748B", textAlign: "center", lineHeight: 1.3 }}>{f.label}</span>
              </button>
            ))}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un partenaire ou une ville…" style={{ ...iStyle(), paddingLeft: "32px" }} />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[{ id: "tous", label: "Tous types" }, ...Object.entries(TYPE_CONFIG).map(([id, v]) => ({ id, label: v.label }))].map(t => (
                <button key={t.id} onClick={() => setFiltreType(t.id)} style={{
                  padding: "5px 12px", borderRadius: "6px",
                  border: filtreType === t.id ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                  background: filtreType === t.id ? "#ECFDF5" : "white",
                  color: filtreType === t.id ? "#065F46" : "#64748B",
                  fontSize: "12px", fontWeight: filtreType === t.id ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {filtreFamille !== "tous" && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "12px" }}>
                Prestations disponibles — {FAMILLES.find(f => f.id === filtreFamille)?.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {PRESTATIONS.filter(p => p.famille === filtreFamille).map((p, i) => (
                  <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>{p.label}</div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {partenairesAffiches.length === 0 ? (
              <div style={{ gridColumn: "1/-1", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                Aucun partenaire pour ces filtres
              </div>
            ) : partenairesAffiches.map(p => {
              const type = TYPE_CONFIG[p.type]
              const ouvert = demandeOuverte === p.id && sourceType === "partenaire"
              const succes = succesDemande === p.id && sourceType === "partenaire"
              return (
                <div key={p.id} style={{ background: "#FFFFFF", border: `1px solid ${ouvert ? "#0F6E56" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", opacity: p.disponible ? 1 : 0.65, transition: "border-color 0.12s" }}>
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <span style={{ background: type.bg, color: type.color, padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{type.label}</span>
                      {ouvert && <span style={{ background: "#ECFDF5", color: "#065F46", fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px" }}>Sélectionné</span>}
                      {!p.disponible && <span style={{ background: "#F1F5F9", color: "#94A3B8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>Indisponible</span>}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{p.nom}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true" />{p.ville}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <i className="ti ti-star-filled" style={{ fontSize: "13px", color: "#F59E0B" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{p.note}</span>
                      <span style={{ fontSize: "12px", color: "#94A3B8" }}>({p.avis} avis)</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {p.specialites.map((s, i) => (
                        <span key={i} style={{ background: "#F1F5F9", color: "#64748B", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {ouvert && !succes && (
                    <div style={{ padding: "14px 18px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Votre demande</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <select value={formDemande.type_prestation} onChange={e => setFormDemande({ ...formDemande, type_prestation: e.target.value })} style={iStyle()}>
                          <option value="">Type de prestation *</option>
                          {p.specialites.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <textarea rows={2} placeholder="Description du besoin…" value={formDemande.description} onChange={e => setFormDemande({ ...formDemande, description: e.target.value })} style={{ ...iStyle(), resize: "vertical" as const }} />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => { setDemandeOuverte(null); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }} style={{ flex: 1, padding: "7px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Annuler</button>
                          <button onClick={() => handleEnvoyerDemande(p)} disabled={!formDemande.type_prestation || loadingDemande} style={{ flex: 1, padding: "7px", borderRadius: "6px", border: "none", background: formDemande.type_prestation ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "12px", fontWeight: 500, cursor: formDemande.type_prestation ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                            {loadingDemande ? "Envoi…" : "Envoyer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {succes && (
                    <div style={{ padding: "14px 18px", background: "#ECFDF5", borderBottom: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 500 }}>Demande envoyée — AGE vous recontacte sous 48h</span>
                    </div>
                  )}

                  <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#0F172A", fontWeight: 600 }}>Sur devis</span>
                    {!ouvert && (
                      <button
                        disabled={!p.disponible}
                        onClick={() => { setDemandeOuverte(p.id); setSourceType("partenaire"); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }}
                        style={{ display: "flex", alignItems: "center", gap: "5px", background: p.disponible ? "#0F6E56" : "#E2E8F0", color: p.disponible ? "white" : "#94A3B8", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: p.disponible ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: 500, fontFamily: "inherit" }}>
                        <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" />
                        Demande
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CONSULTANTS AGE ── */}
      {onglet === "consultants" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {consultantRegional && (
            <div style={{ background: "#111C2E", border: "none", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", flexShrink: 0 }}>
                {consultantRegional.prenom[0]}{consultantRegional.nom[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#5DCAA5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Votre consultant régional</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>{consultantRegional.prenom} {consultantRegional.nom}</div>
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>{consultantRegional.titre}{consultantRegional.region ? ` · ${consultantRegional.region}` : ""}</div>
              </div>
                            <button
                onClick={() => navigate(`/client/prise-rdv/${consultantRegional.id}?mode=coordination`)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#111827", border: "none", padding: "9px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
              >
                <i className="ti ti-calendar-plus" style={{ fontSize: "14px" }} aria-hidden="true" />
                Voir l'agenda et réserver
              </button>
            </div>
          )}
          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="ti ti-users" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#065F46" }}>Consultants AGE mis à disposition — expertise climatique certifiée</span>
          </div>

          {/* Indicateur d'étapes : 1 Domaine → 2 Expert */}
          <nav aria-label="Progression de la recherche" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ boxSizing: "border-box", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, flexShrink: 0, background: filtreDomaine ? "#2F7D5C" : "#0F6E56", color: "#FFFFFF" }}>
                {filtreDomaine ? <i className="ti ti-check" style={{ fontSize: "14px" }} aria-hidden="true" /> : "1"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filtreDomaine ? "#2F7D5C" : "#0F172A" }}>Domaine</span>
            </div>
            <span style={{ flex: "0 0 40px", height: 2, borderRadius: 2, background: filtreDomaine ? "#2F7D5C" : "#E2DDD8" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ boxSizing: "border-box", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, flexShrink: 0, background: filtreDomaine ? "#0F6E56" : "#FFFFFF", color: filtreDomaine ? "#FFFFFF" : "#78716C", border: filtreDomaine ? "none" : "1px solid #78716C" }}>2</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: filtreDomaine ? "#0F172A" : "#78716C" }}>Expert</span>
            </div>
          </nav>

          {/* Étape 1 : choix du domaine (blocs fond bleu du sidebar #0F172A) */}
          {filtreDomaine === null && (
            <>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "#0F172A" }}>Dans quel domaine cherchez-vous un expert ?</div>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "6px" }}>Choisissez un domaine pour voir les experts disponibles.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px" }}>
                {DOMAINES.map(d => {
                  const experts = consultantsAGE.filter(c => c.domaine === d.id)
                  const libelleCount = `${experts.length} expert${experts.length > 1 ? "s" : ""}`
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setFiltreDomaine(d.id)}
                      aria-label={`Domaine ${d.label}, ${libelleCount}`}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = d.bg; e.currentTarget.style.transform = "translateY(-2px)" }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E293B"; e.currentTarget.style.transform = "none" }}
                      style={{ boxSizing: "border-box", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "20px 20px 18px", borderRadius: "12px", fontFamily: "inherit", background: "#0F172A", border: "1px solid #1E293B", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "transform 0.15s ease, border-color 0.15s ease" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "10px", background: d.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className={`ti ${d.icon}`} style={{ fontSize: "24px", color: d.color }} aria-hidden="true" />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, color: "#FFFFFF", background: "rgba(255,255,255,0.14)", padding: "4px 10px", borderRadius: "999px" }}>
                          {libelleCount}
                        </span>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 600, color: "#FFFFFF", marginTop: "18px" }}>{d.label}</div>
                      <div style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5, marginTop: "6px", minHeight: 36 }}>
                        {experts.map(c => c.type.replace("Expert ", "")).join(", ")}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "16px", fontSize: "12px", fontWeight: 500, color: "#FFFFFF" }}>
                        Choisir ce domaine
                        <i className="ti ti-chevron-right" style={{ fontSize: "14px" }} aria-hidden="true" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Étape 2 : choix de l'expert du domaine retenu */}
          {filtreDomaine !== null && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "#0F172A" }}>Choisissez votre expert</div>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#FFFFFF", background: "#0F172A", padding: "4px 12px", borderRadius: "999px" }}>{domaineActif?.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setFiltreDomaine(null); setDemandeOuverte(null); setConsultantActif(null) }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "inherit" }}
                >
                  <i className="ti ti-chevron-left" style={{ fontSize: "14px" }} aria-hidden="true" />
                  Changer de domaine
                </button>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
                {consultantsFiltres.length} expert{consultantsFiltres.length > 1 ? "s" : ""} disponible{consultantsFiltres.length > 1 ? "s" : ""} en {domaineActif?.label}
              </div>
            </>
          )}
          <div style={{ display: filtreDomaine === null ? "none" : "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          
       {consultantsFiltres.map(c => {
              const ouvert = demandeOuverte === c.id && sourceType === "consultant"
              const succes = succesDemande === c.id && sourceType === "consultant"
              const couleur = CONSULTANT_COLORS[c.id] || CONSULTANT_COLORS[1]
              const tagsVisibles = c.competences.slice(0, 2)
              const tagsRestants = c.competences.length - tagsVisibles.length
              return (
                <div key={c.id} style={{ background: "#FFFFFF", border: `1px solid ${ouvert ? "#0F6E56" : "#E2E8F0"}`, borderRadius: "12px", overflow: "hidden", opacity: c.disponible ? 1 : 0.6, transition: "border-color 0.12s", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "20px 20px 0", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "10px", background: c.disponible ? couleur.bg : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`ti ${c.icon}`} style={{ fontSize: "20px", color: c.disponible ? couleur.color : "#94A3B8" }} aria-hidden="true" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", lineHeight: 1.3 }}>{c.type}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.disponible ? "#639922" : "#94A3B8", display: "inline-block" }} />
                          <span style={{ fontSize: "11px", color: "#64748B" }}>{c.disponible ? "Disponible" : "Indisponible"}</span>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.5, margin: "0 0 14px" }}>{c.desc}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                      {tagsVisibles.map((k, i) => (
                        <span key={i} style={{ background: "#F8FAFC", color: "#64748B", padding: "4px 9px", borderRadius: "6px", fontSize: "11px" }}>{k}</span>
                      ))}
                      {tagsRestants > 0 && (
                        <span style={{ background: "#F8FAFC", color: "#64748B", padding: "4px 9px", borderRadius: "6px", fontSize: "11px" }}>+{tagsRestants}</span>
                      )}
                    </div>
                  </div>

                  {ouvert && !succes && (
                    <div style={{ padding: "14px 20px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Votre demande</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <select value={formDemande.type_prestation} onChange={e => setFormDemande({ ...formDemande, type_prestation: e.target.value })} style={iStyle()}>
                          <option value="">Type de prestation *</option>
                          {c.competences.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <textarea rows={2} placeholder="Description du besoin…" value={formDemande.description} onChange={e => setFormDemande({ ...formDemande, description: e.target.value })} style={{ ...iStyle(), resize: "vertical" as const }} />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => { setDemandeOuverte(null); setConsultantActif(null); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }} style={{ flex: 1, padding: "7px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Annuler</button>
                          <button onClick={() => handleEnvoyerDemandeConsultant(c)} disabled={!formDemande.type_prestation || loadingDemande} style={{ flex: 1, padding: "7px", borderRadius: "6px", border: "none", background: formDemande.type_prestation ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "12px", fontWeight: 500, cursor: formDemande.type_prestation ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                            {loadingDemande ? "Envoi…" : "Envoyer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {succes && (
                    <div style={{ padding: "14px 20px", background: "#ECFDF5", borderTop: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 500 }}>Demande envoyée — AGE vous recontacte sous 48h</span>
                    </div>
                  )}

                  <div style={{ padding: "12px 20px", marginTop: succes || ouvert ? 0 : "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Sur devis</span>
                    {!ouvert && (
                      <button
                        disabled={!c.disponible}
                        onClick={() => { setDemandeOuverte(c.id); setSourceType("consultant"); setConsultantActif(c); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }}
                        style={{ display: "flex", alignItems: "center", gap: "5px", background: c.disponible ? "#0F6E56" : "#F1F5F9", color: c.disponible ? "white" : "#94A3B8", border: "none", padding: "7px 14px", borderRadius: "6px", cursor: c.disponible ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: 500, fontFamily: "inherit" }}>
                        {c.disponible ? (
                          <>
                            <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" />
                            Demande
                          </>
                        ) : "Indisponible"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

          


          
          </div>
        </div>
      )}

    </div>
  )
}