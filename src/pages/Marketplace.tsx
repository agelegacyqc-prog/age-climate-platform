import React, { useState } from "react"
import { supabase } from "../lib/supabase"

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

const consultantsAGE = [
  { id: 1, type: "Climate Risk Manager",        desc: "Analyse et gestion des risques climatiques physiques et de transition", icon: "ti-shield",         competences: ["Score risque climatique", "Brown Value", "Analyse PPRI / RGA", "Plan d'adaptation"],                                                                               disponible: true  },
  { id: 2, type: "Climate Data Manager",        desc: "Collecte, traitement et valorisation des données climatiques",          icon: "ti-database",       competences: ["Intégration API climat", "Traitement données satellite", "Analyse géospatiale", "Enrichissement bases immobilières"],                                    disponible: true  },
  { id: 3, type: "Climate Prevention Manager",  desc: "Prévention des risques naturels et adaptation des actifs",              icon: "ti-refresh-alert",  competences: ["Organisation des campagnes", "Accompagnement aides et subventions", "Coordination interventions sur sites", "Fonds Barnier", "Fonds prévention RGA"],  disponible: true },
  { id: 4, type: "Climate Adaptation Manager",  desc: "Stratégies d'adaptation au changement climatique",                     icon: "ti-plant-2",        competences: ["Diagnostic de vulnérabilité climatique", "Stratégie d'adaptation climatique", "Organisation des interventions travaux"],                                disponible: true  },
  { id: 5, type: "Climate Engineering Manager", desc: "Solutions techniques d'adaptation et de résilience",                   icon: "ti-tool",           competences: ["Mise en œuvre stratégie climatique", "Expertise aléas climatiques", "Coordination travaux"],                                                           disponible: true  },
  { id: 6, type: "ESG / Compliance Manager",    desc: "Conformité réglementaire et reporting ESG/CSRD",                       icon: "ti-file-analytics", competences: ["Stratégie RSE", "CSRD", "Taxonomie EU"],                                                                                                             disponible: true  },
  { id: 7, type: "Energy Performance Manager",  desc: "Optimisation énergétique et conformité réglementaire bâtiment",       icon: "ti-bolt",           competences: ["Décret Tertiaire", "BACS", "ISO 50001"],                                                                                                             disponible: true  },
  { id: 8, type: "Carbon Manager",              desc: "Pilotage de la trajectoire carbone et neutralité",                     icon: "ti-leaf",           competences: ["BEGES", "Bilan GES"],                                                                                                                                disponible: true  },
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

const typeStructures    = ["diagnostiqueur", "bureau_etudes", "artisan", "financeur", "consultant", "autre"]
const zonesIntervention = ["Île-de-France", "Nouvelle-Aquitaine", "Occitanie", "PACA", "Bretagne", "Auvergne-Rhône-Alpes", "National", "International"]

function iStyle(disabled = false): React.CSSProperties {
  return { width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", color: disabled ? "#94A3B8" : "#0F172A", background: disabled ? "#F8FAFC" : "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }
}

function lStyle(): React.CSSProperties {
  return { display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.07em" }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", padding: "14px 0 8px", borderBottom: "1px solid #E2E8F0", marginBottom: "12px" }}>{children}</div>
}

interface DemandeForm {
  type_prestation: string
  actif_id: string
  description: string
}

export default function Marketplace() {
  const [onglet, setOnglet]               = useState("partenaires")
  const [filtreFamille, setFiltreFamille] = useState("tous")
  const [filtreType, setFiltreType]       = useState("tous")
  const [recherche, setRecherche]         = useState("")

  const [demandeOuverte, setDemandeOuverte] = useState<number | null>(null)
  const [sourceType, setSourceType]         = useState<"partenaire" | "consultant">("partenaire")
  const [formDemande, setFormDemande]       = useState<DemandeForm>({ type_prestation: "", actif_id: "", description: "" })
  const [loadingDemande, setLoadingDemande] = useState(false)
  const [succesDemande, setSuccesDemande]   = useState<number | null>(null)
  const [consultantActif, setConsultantActif] = useState<typeof consultantsAGE[0] | null>(null)

  const [demandes, setDemandes]     = useState<any[]>([])
  const [loadingDem, setLoadingDem] = useState(false)
  const [demLoaded, setDemLoaded]   = useState(false)

  const [formPro, setFormPro]   = useState({ nom: "", prenom: "", societe: "", email: "", telephone: "", site_web: "", type_structure: "", familles: [] as string[], zones_intervention: [] as string[], tarif_journalier: "", description: "" })
  const [loadingPro, setLoadingPro] = useState(false)
  const [succesPro, setSuccesPro]   = useState(false)
  const [erreurPro, setErreurPro]   = useState("")

  function toggleArray(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  async function loadDemandes() {
    if (demLoaded) return
    setLoadingDem(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from("demandes_marketplace").select("*").order("created_at", { ascending: false })
      setDemandes(data || [])
    }
    setLoadingDem(false)
    setDemLoaded(true)
  }

  async function handleSwitchOnglet(o: string) {
    setOnglet(o)
    if (o === "demandes") await loadDemandes()
  }

  async function handleEnvoyerDemande(partenaire: any) {
    if (!formDemande.type_prestation) return
    setLoadingDemande(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("demandes_marketplace").insert({
      type_prestation: formDemande.type_prestation,
      description: formDemande.description,
      actif_id: formDemande.actif_id || null,
      statut: "soumise",
      client_id: user?.id || null,
      note_age: `Partenaire demandé : ${partenaire.nom}`,
    })
    setSuccesDemande(partenaire.id)
    setLoadingDemande(false)
    setDemLoaded(false)
    setTimeout(() => { setSuccesDemande(null); setDemandeOuverte(null); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }, 3000)
  }

  async function handleEnvoyerDemandeConsultant(consultant: typeof consultantsAGE[0]) {
    if (!formDemande.type_prestation) return
    setLoadingDemande(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("demandes_marketplace").insert({
      type_prestation: formDemande.type_prestation,
      description: formDemande.description,
      statut: "soumise",
      client_id: user?.id || null,
      note_age: `Consultant AGE demandé : ${consultant.type}`,
    })
    setSuccesDemande(consultant.id)
    setLoadingDemande(false)
    setDemLoaded(false)
    setTimeout(() => { setSuccesDemande(null); setDemandeOuverte(null); setConsultantActif(null); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }, 3000)
  }

  async function handleSubmitPro() {
    if (!formPro.nom || !formPro.societe || !formPro.email || !formPro.type_structure) { setErreurPro("Champs obligatoires manquants."); return }
    setLoadingPro(true); setErreurPro("")
    const { error } = await supabase.from("prestataires_pro").insert([{ ...formPro, tarif_journalier: formPro.tarif_journalier ? parseFloat(formPro.tarif_journalier) : null, statut: "en_attente" }])
    if (error) setErreurPro("Erreur lors de l'envoi. Veuillez réessayer.")
    else setSuccesPro(true)
    setLoadingPro(false)
  }

  const partenairesAffiches = partenaires.filter(p => {
    if (filtreFamille !== "tous" && !p.familles.includes(filtreFamille)) return false
    if (filtreType !== "tous" && p.type !== filtreType) return false
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase()) && !p.ville.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const nbDemandes = demandes.filter(d => ["soumise", "en_qualification", "entretien_planifie"].includes(d.statut)).length

  const onglets = [
    { id: "partenaires", label: "Partenaires",     icon: "ti-building-store" },
    { id: "consultants", label: "Consultants AGE", icon: "ti-users" },
    { id: "demandes",    label: "Mes demandes",    icon: "ti-clipboard-list", badge: nbDemandes > 0 ? nbDemandes : null },
    { id: "pro",         label: "Espace Pro",      icon: "ti-briefcase" },
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
            {o.badge && (
              <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "10px" }}>{o.badge}</span>
            )}
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
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Sur devis</span>
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
          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="ti ti-users" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#065F46" }}>Consultants AGE mis à disposition — expertise climatique certifiée</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {consultantsAGE.map(c => {
              const ouvert = demandeOuverte === c.id && sourceType === "consultant"
              const succes = succesDemande === c.id && sourceType === "consultant"
              return (
                <div key={c.id} style={{ background: "#FFFFFF", border: `1px solid ${ouvert ? "#0F6E56" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", opacity: c.disponible ? 1 : 0.65, transition: "border-color 0.12s" }}>
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "8px", background: ouvert ? "#ECFDF5" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={`ti ${c.icon}`} style={{ fontSize: "18px", color: ouvert ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
                      </div>
                      {!c.disponible && <span style={{ background: "#F1F5F9", color: "#94A3B8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>Indisponible</span>}
                      {ouvert && <span style={{ background: "#ECFDF5", color: "#065F46", fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px" }}>Sélectionné</span>}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "5px", lineHeight: 1.3 }}>{c.type}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px", lineHeight: 1.5 }}>{c.desc}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {c.competences.map((k, i) => (
                        <span key={i} style={{ background: "#F1F5F9", color: "#475569", padding: "2px 7px", borderRadius: "3px", fontSize: "10px" }}>{k}</span>
                      ))}
                    </div>
                  </div>

                  {/* Formulaire inline consultant */}
                  {ouvert && !succes && (
                    <div style={{ padding: "14px 18px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
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
                    <div style={{ padding: "14px 18px", background: "#ECFDF5", borderBottom: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 500 }}>Demande envoyée — AGE vous recontacte sous 48h</span>
                    </div>
                  )}

                  <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Sur devis</span>
                    {!ouvert && (
                      <button
                        disabled={!c.disponible}
                        onClick={() => { setDemandeOuverte(c.id); setSourceType("consultant"); setConsultantActif(c); setFormDemande({ type_prestation: "", actif_id: "", description: "" }) }}
                        style={{ display: "flex", alignItems: "center", gap: "5px", background: c.disponible ? "#0F6E56" : "#E2E8F0", color: c.disponible ? "white" : "#94A3B8", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: c.disponible ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: 500, fontFamily: "inherit" }}>
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

      {/* ── MES DEMANDES ── */}
      {onglet === "demandes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loadingDem ? (
            <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
          ) : demandes.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
              <i className="ti ti-clipboard-list" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune demande</div>
              <div style={{ fontSize: "13px", color: "#64748B" }}>Déposez une demande depuis les onglets Partenaires ou Consultants AGE</div>
            </div>
          ) : (
            demandes.map(d => {
              const statut = STATUT_CONFIG[d.statut] || STATUT_CONFIG.soumise
              return (
                <div key={d.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{d.type_prestation || "Demande de prestation"}</div>
                    <span style={{ background: statut.bg, color: statut.color, padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                  </div>
                  {d.description && <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "8px" }}>{d.description}</div>}
                  {d.note_age && (
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "#64748B" }}>
                      <strong style={{ color: "#0F172A" }}>Note AGE :</strong> {d.note_age}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "8px" }}>
                    {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── ESPACE PRO ── */}
      {onglet === "pro" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="ti ti-briefcase" style={{ fontSize: "24px", color: "#0F6E56" }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Rejoignez le réseau AGE Climate</div>
              <div style={{ fontSize: "13px", color: "#64748B" }}>Référencez vos prestations et accédez aux missions de nos clients. Dossier examiné sous 5 jours ouvrés.</div>
            </div>
          </div>

          {succesPro ? (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "40px", textAlign: "center" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "40px", color: "#0F6E56", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Dossier envoyé !</div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Notre équipe examine votre candidature sous 5 jours ouvrés.</div>
              <button onClick={() => setSuccesPro(false)} style={{ background: "#0F6E56", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>Nouveau dossier</button>
            </div>
          ) : (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px" }}>
              {erreurPro && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />{erreurPro}
                </div>
              )}
              <SectionTitle>Identité</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div><label style={lStyle()}>Prénom *</label><input value={formPro.prenom} onChange={e => setFormPro({ ...formPro, prenom: e.target.value })} style={iStyle()} placeholder="Votre prénom" /></div>
                <div><label style={lStyle()}>Nom *</label><input value={formPro.nom} onChange={e => setFormPro({ ...formPro, nom: e.target.value })} style={iStyle()} placeholder="Votre nom" /></div>
                <div><label style={lStyle()}>Société *</label><input value={formPro.societe} onChange={e => setFormPro({ ...formPro, societe: e.target.value })} style={iStyle()} placeholder="Raison sociale" /></div>
                <div><label style={lStyle()}>Email professionnel *</label><input type="email" value={formPro.email} onChange={e => setFormPro({ ...formPro, email: e.target.value })} style={iStyle()} placeholder="contact@societe.fr" /></div>
                <div><label style={lStyle()}>Téléphone</label><input value={formPro.telephone} onChange={e => setFormPro({ ...formPro, telephone: e.target.value })} style={iStyle()} placeholder="06 XX XX XX XX" /></div>
                <div><label style={lStyle()}>Site web</label><input value={formPro.site_web} onChange={e => setFormPro({ ...formPro, site_web: e.target.value })} style={iStyle()} placeholder="https://www.societe.fr" /></div>
              </div>
              <SectionTitle>Profil métier</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={lStyle()}>Type de structure *</label>
                  <select value={formPro.type_structure} onChange={e => setFormPro({ ...formPro, type_structure: e.target.value })} style={{ ...iStyle(), cursor: "pointer" }}>
                    <option value="">Choisir…</option>
                    {typeStructures.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>)}
                  </select>
                </div>
                <div><label style={lStyle()}>Tarif journalier (€/j)</label><input type="number" value={formPro.tarif_journalier} onChange={e => setFormPro({ ...formPro, tarif_journalier: e.target.value })} style={iStyle()} placeholder="Ex : 800" /></div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={lStyle()}>Familles de prestations proposées</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {FAMILLES.filter(f => f.id !== "tous").map(f => (
                    <button key={f.id} onClick={() => setFormPro({ ...formPro, familles: toggleArray(formPro.familles, f.id) })} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", border: formPro.familles.includes(f.id) ? "1px solid #0F6E56" : "1px solid #E2E8F0", background: formPro.familles.includes(f.id) ? "#ECFDF5" : "white", color: formPro.familles.includes(f.id) ? "#065F46" : "#64748B", fontSize: "12px", fontWeight: formPro.familles.includes(f.id) ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                      <i className={`ti ${f.icon}`} style={{ fontSize: "14px" }} aria-hidden="true" />{f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={lStyle()}>Zones d'intervention</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {zonesIntervention.map(z => (
                    <button key={z} onClick={() => setFormPro({ ...formPro, zones_intervention: toggleArray(formPro.zones_intervention, z) })} style={{ padding: "5px 12px", borderRadius: "6px", border: formPro.zones_intervention.includes(z) ? "1px solid #0F6E56" : "1px solid #E2E8F0", background: formPro.zones_intervention.includes(z) ? "#ECFDF5" : "white", color: formPro.zones_intervention.includes(z) ? "#065F46" : "#64748B", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>{z}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={lStyle()}>Présentation de vos prestations</label>
                <textarea value={formPro.description} onChange={e => setFormPro({ ...formPro, description: e.target.value })} rows={4} placeholder="Décrivez vos expertises, références, méthodes de travail…" style={{ ...iStyle(), resize: "vertical" as const }} />
              </div>
              <button onClick={handleSubmitPro} disabled={loadingPro} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#0F6E56", color: "white", border: "none", padding: "10px 24px", borderRadius: "7px", cursor: loadingPro ? "wait" : "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit", width: "100%", opacity: loadingPro ? 0.7 : 1 }}>
                <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                {loadingPro ? "Envoi en cours…" : "Envoyer mon dossier de candidature"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}