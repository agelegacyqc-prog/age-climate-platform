import React, { useState } from "react"
import { supabase } from "../lib/supabase"

// ─── Données ──────────────────────────────────────────────────────────────────

const partenaires = [
  { id: 1, nom: "BatExpert Sud-Ouest",          type: "diagnostiqueur", ville: "Dax",            note: 4.8, avis: 124, familles: ["prevention"], specialites: ["RGA", "PPRI", "Feux"],         disponible: true,  prix: "À partir de 350 €" },
  { id: 2, nom: "Cabinet Risques & Patrimoine", type: "bureau_etudes",  ville: "Pau",            note: 4.6, avis: 89,  familles: ["prevention","environnement"], specialites: ["RGA", "Submersion", "Bilan GES"], disponible: true,  prix: "À partir de 800 €" },
  { id: 3, nom: "Rénov Climat 40",              type: "artisan",        ville: "Mont-de-Marsan", note: 4.9, avis: 203, familles: ["energie"],     specialites: ["Travaux RGA", "Isolation"],    disponible: false, prix: "Sur devis" },
  { id: 4, nom: "Fonds Barnier Conseil",        type: "financeur",      ville: "Bordeaux",       note: 4.7, avis: 56,  familles: ["energie","prevention"], specialites: ["Fonds Barnier", "CEE", "Subventions"], disponible: true, prix: "Gratuit" },
  { id: 5, nom: "GéoRisk Expertise",            type: "diagnostiqueur", ville: "Bayonne",        note: 4.5, avis: 78,  familles: ["prevention"], specialites: ["PPRI", "Tempête", "Brown Value"], disponible: true, prix: "À partir de 280 €" },
  { id: 6, nom: "Sud Bâtiment Résilience",      type: "artisan",        ville: "Tarbes",         note: 4.8, avis: 167, familles: ["energie"],    specialites: ["Isolation", "Surélévation"],   disponible: true,  prix: "Sur devis" },
  { id: 7, nom: "EcoAudit Conseil",             type: "bureau_etudes",  ville: "Bordeaux",       note: 4.7, avis: 94,  familles: ["environnement"], specialites: ["Bilan GES", "CSRD", "EU Taxonomy"], disponible: true, prix: "À partir de 1 200 €" },
  { id: 8, nom: "EnergiePerf Sud",              type: "consultant",     ville: "Toulouse",       note: 4.6, avis: 112, familles: ["energie"],    specialites: ["Décret Tertiaire", "BACS", "ISO 50001"], disponible: true, prix: "À partir de 600 €" },
  { id: 9, nom: "Adapt Territoire",             type: "consultant",     ville: "Montpellier",    note: 4.8, avis: 67,  familles: ["prevention","environnement"], specialites: ["Plan adaptation", "Score risque", "PPRI"], disponible: true, prix: "Sur devis" },
]

const FAMILLES = [
  { id: "tous",          label: "Toutes prestations",       icon: "ti-layout-grid" },
  { id: "energie",       label: "Énergie",                  icon: "ti-bolt" },
  { id: "environnement", label: "Environnement & Carbone",  icon: "ti-leaf" },
  { id: "prevention",    label: "Prévention climatique",    icon: "ti-shield" },
  { id: "autre",         label: "Audit & Subventions",      icon: "ti-coin" },
]

const PRESTATIONS = [
  { famille: "energie",       label: "Décret Tertiaire",          desc: "Obligation de réduction des consommations énergétiques" },
  { famille: "energie",       label: "Décret BACS",               desc: "Systèmes de régulation et automatisation du bâtiment" },
  { famille: "energie",       label: "ISO 50001",                  desc: "Système de management de l'énergie" },
  { famille: "energie",       label: "CEE",                        desc: "Certificats d'économies d'énergie" },
  { famille: "energie",       label: "Audit énergétique",         desc: "Diagnostic complet des consommations énergétiques" },
  { famille: "environnement", label: "Bilan GES",                  desc: "Bilan des émissions de gaz à effet de serre" },
  { famille: "environnement", label: "CSRD / ESRS",                desc: "Reporting de durabilité obligatoire" },
  { famille: "environnement", label: "EU Taxonomy",                desc: "Alignement avec la taxonomie européenne" },
  { famille: "environnement", label: "Plan de transition",        desc: "Stratégie de décarbonation à horizon 2030/2050" },
  { famille: "prevention",    label: "Score risque climatique",   desc: "Évaluation de l'exposition aux aléas climatiques" },
  { famille: "prevention",    label: "Brown Value",               desc: "Décote climatique sur actifs immobiliers" },
  { famille: "prevention",    label: "Plan d'adaptation",        desc: "Stratégie de résilience face aux risques physiques" },
  { famille: "prevention",    label: "Analyse PPRI / RGA",       desc: "Étude d'exposition aux risques naturels" },
  { famille: "autre",         label: "Subventions & Aides",       desc: "Identification et montage des dossiers de financement" },
  { famille: "autre",         label: "Fonds Barnier",             desc: "Accompagnement au fonds de prévention des risques" },
]

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  diagnostiqueur: { label: "Diagnostiqueur", color: "#1E40AF", bg: "#EFF6FF" },
  bureau_etudes:  { label: "Bureau d'études", color: "#5B21B6", bg: "#F5F3FF" },
  artisan:        { label: "Artisan",         color: "#92400E", bg: "#FFFBEB" },
  financeur:      { label: "Financeur",       color: "#065F46", bg: "#ECFDF5" },
  consultant:     { label: "Consultant",      color: "#0369A1", bg: "#E0F2FE" },
  autre:          { label: "Autre",           color: "#475569", bg: "#F1F5F9" },
}

const managers = [
  { type: "Climate Risk Manager",        desc: "Analyse et gestion des risques climatiques physiques et de transition", icon: "ti-shield",         competences: ["RCP scenarios", "VaR climatique", "TCFD"] },
  { type: "Climate Data Manager",        desc: "Collecte, traitement et valorisation des données climatiques",          icon: "ti-database",       competences: ["Data climate", "ESG metrics", "Reporting"] },
  { type: "Climate Prevention Manager",  desc: "Prévention des risques naturels et adaptation des actifs",              icon: "ti-refresh-alert",  competences: ["RGA", "PPRI", "Plan adaptation"] },
  { type: "Climate Adaptation Manager",  desc: "Stratégies d'adaptation au changement climatique",                     icon: "ti-plant-2",        competences: ["Stratégie climat", "Résilience", "Territoire"] },
  { type: "Climate Engineering Manager", desc: "Solutions techniques d'adaptation et de résilience",                   icon: "ti-tool",           competences: ["Génie civil", "Travaux adaptation", "Diagnostic"] },
  { type: "ESG / Compliance Manager",    desc: "Conformité réglementaire et reporting ESG/CSRD",                       icon: "ti-file-analytics", competences: ["CSRD", "ESRS", "Taxonomie UE"] },
  { type: "Energy Performance Manager",  desc: "Optimisation énergétique et conformité réglementaire bâtiment",       icon: "ti-bolt",           competences: ["Décret Tertiaire", "BACS", "ISO 50001"] },
  { type: "Carbon Manager",              desc: "Pilotage de la trajectoire carbone et neutralité",                     icon: "ti-leaf",           competences: ["Bilan GES", "BEGES", "Net Zero"] },
]

const formats  = ["Mission ponctuelle", "Assistance technique", "Régie long terme", "Programme multi-sites"]
const urgences = ["Standard (4-6 semaines)", "Urgent (2-3 semaines)", "Très urgent (< 1 semaine)"]
const secteurs = ["Assurance", "Banque", "Immobilier", "Collectivité", "Industrie", "Autre"]
const typeStructures = ["diagnostiqueur", "bureau_etudes", "artisan", "financeur", "consultant", "autre"]
const zonesIntervention = ["Île-de-France", "Nouvelle-Aquitaine", "Occitanie", "PACA", "Bretagne", "Auvergne-Rhône-Alpes", "National", "International"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputStyle(disabled = false): React.CSSProperties {
  return {
    width: "100%", padding: "9px 12px",
    border: "1px solid #E2E8F0", borderRadius: "7px",
    fontSize: "13px", color: disabled ? "#94A3B8" : "#0F172A",
    background: disabled ? "#F8FAFC" : "white",
    fontFamily: "inherit", outline: "none",
    boxSizing: "border-box" as const,
  }
}

function labelStyle(): React.CSSProperties {
  return {
    display: "block", fontSize: "11px", fontWeight: 600,
    color: "#94A3B8", marginBottom: "6px",
    textTransform: "uppercase" as const, letterSpacing: "0.07em",
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", padding: "16px 0 8px", borderBottom: "1px solid #E2E8F0", marginBottom: "12px" }}>
      {children}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Marketplace() {
  const [onglet, setOnglet] = useState("partenaires")
  const [filtreFamille, setFiltreFamille] = useState("tous")
  const [filtreType, setFiltreType] = useState("tous")
  const [recherche, setRecherche] = useState("")
  const [managerSelectionne, setManagerSelectionne] = useState("")

  // État formulaire consulting
  const [formConsulting, setFormConsulting] = useState({
    societe: "", secteur: "", type_manager: "", format_mission: "",
    urgence: "", description: "", contact_nom: "", contact_email: "", contact_telephone: "",
  })
  const [loadingConsulting, setLoadingConsulting] = useState(false)
  const [succesConsulting, setSuccesConsulting] = useState(false)
  const [erreurConsulting, setErreurConsulting] = useState("")

  // État formulaire Pro
  const [formPro, setFormPro] = useState({
    nom: "", prenom: "", societe: "", email: "", telephone: "", site_web: "",
    type_structure: "", familles: [] as string[], specialites: [] as string[],
    zones_intervention: [] as string[], tarif_journalier: "",
    description: "", kbis: null as File | null, assurance: null as File | null, references: null as File | null,
  })
  const [loadingPro, setLoadingPro] = useState(false)
  const [succesPro, setSuccesPro] = useState(false)
  const [erreurPro, setErreurPro] = useState("")

  const partenairesAffiches = partenaires.filter(p => {
    if (filtreFamille !== "tous" && !p.familles.includes(filtreFamille)) return false
    if (filtreType !== "tous" && p.type !== filtreType) return false
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase()) && !p.ville.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  function toggleArray(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  async function handleSubmitConsulting() {
    if (!formConsulting.societe || !formConsulting.contact_email || !formConsulting.type_manager) {
      setErreurConsulting("Veuillez remplir les champs obligatoires : société, type de manager et email.")
      return
    }
    setLoadingConsulting(true)
    setErreurConsulting("")
    const { error } = await supabase.from("missions").insert([{ ...formConsulting, statut: "nouvelle", phase: 1 }])
    if (error) {
      setErreurConsulting("Erreur lors de l'envoi. Veuillez réessayer.")
    } else {
      setSuccesConsulting(true)
      setFormConsulting({ societe: "", secteur: "", type_manager: "", format_mission: "", urgence: "", description: "", contact_nom: "", contact_email: "", contact_telephone: "" })
    }
    setLoadingConsulting(false)
  }

  async function handleSubmitPro() {
    if (!formPro.nom || !formPro.societe || !formPro.email || !formPro.type_structure) {
      setErreurPro("Veuillez remplir les champs obligatoires : nom, société, email et type de structure.")
      return
    }
    setLoadingPro(true)
    setErreurPro("")
    const { error } = await supabase.from("prestataires_pro").insert([{
      nom: formPro.nom, prenom: formPro.prenom, societe: formPro.societe,
      email: formPro.email, telephone: formPro.telephone, site_web: formPro.site_web,
      type_structure: formPro.type_structure, familles: formPro.familles,
      specialites: formPro.specialites, zones_intervention: formPro.zones_intervention,
      tarif_journalier: formPro.tarif_journalier ? parseFloat(formPro.tarif_journalier) : null,
      description: formPro.description, statut: "en_attente",
    }])
    if (error) {
      setErreurPro("Erreur lors de l'envoi. Veuillez réessayer.")
    } else {
      setSuccesPro(true)
    }
    setLoadingPro(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {[
          { id: "partenaires", label: "Partenaires",      icon: "ti-building-store" },
          { id: "pro",         label: "Espace Pro",       icon: "ti-briefcase" },
          { id: "consulting",  label: "Consulting Climat", icon: "ti-leaf" },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
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

          {/* Familles de prestations */}
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

          {/* Barre recherche + filtre type */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un partenaire ou une ville…" style={{ ...inputStyle(), paddingLeft: "32px" }} />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[{ id: "tous", label: "Tous types" }, ...Object.entries(TYPE_CONFIG).map(([id, v]) => ({ id, label: v.label }))].map(t => (
                <button key={t.id} onClick={() => setFiltreType(t.id)} style={{
                  padding: "5px 12px", borderRadius: "6px",
                  border: filtreType === t.id ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                  background: filtreType === t.id ? "#ECFDF5" : "white",
                  color: filtreType === t.id ? "#065F46" : "#64748B",
                  fontSize: "12px", fontWeight: filtreType === t.id ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catalogue prestations */}
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

          {/* Grille partenaires */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {partenairesAffiches.length === 0 ? (
              <div style={{ gridColumn: "1/-1", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                Aucun partenaire pour ces filtres
              </div>
            ) : partenairesAffiches.map(p => {
              const type = TYPE_CONFIG[p.type]
              return (
                <div key={p.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden", opacity: p.disponible ? 1 : 0.65 }}>
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <span style={{ background: type.bg, color: type.color, padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{type.label}</span>
                      {!p.disponible && <span style={{ background: "#F1F5F9", color: "#94A3B8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>Indisponible</span>}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{p.nom}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true" />
                      {p.ville}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
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
                  <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{p.prix}</span>
                    <button disabled={!p.disponible} style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      background: p.disponible ? "#0F6E56" : "#E2E8F0",
                      color: p.disponible ? "white" : "#94A3B8",
                      border: "none", padding: "6px 14px", borderRadius: "6px",
                      cursor: p.disponible ? "pointer" : "not-allowed",
                      fontSize: "12px", fontWeight: 500, fontFamily: "inherit",
                    }}>
                      <i className="ti ti-send" style={{ fontSize: "13px" }} aria-hidden="true" />
                      Contacter
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ESPACE PRO ── */}
      {onglet === "pro" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Bandeau */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="ti ti-briefcase" style={{ fontSize: "24px", color: "#0F6E56" }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Rejoignez le réseau AGE Climate</div>
              <div style={{ fontSize: "13px", color: "#64748B" }}>Référencez vos prestations et accédez aux missions de nos clients banques, assureurs et collectivités. Votre dossier est examiné sous 5 jours ouvrés.</div>
            </div>
          </div>

          {succesPro ? (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "40px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "14px", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "32px", color: "#0F6E56" }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Dossier envoyé !</div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Notre équipe examine votre candidature sous 5 jours ouvrés. Vous recevrez une réponse par email.</div>
              <button onClick={() => setSuccesPro(false)} style={{ background: "#0F6E56", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
                Nouveau dossier
              </button>
            </div>
          ) : (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px" }}>

              {erreurPro && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />
                  {erreurPro}
                </div>
              )}

              {/* Identité */}
              <SectionTitle>Identité</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div><label style={labelStyle()}>Prénom *</label><input value={formPro.prenom} onChange={e => setFormPro({ ...formPro, prenom: e.target.value })} style={inputStyle()} placeholder="Votre prénom" /></div>
                <div><label style={labelStyle()}>Nom *</label><input value={formPro.nom} onChange={e => setFormPro({ ...formPro, nom: e.target.value })} style={inputStyle()} placeholder="Votre nom" /></div>
                <div><label style={labelStyle()}>Société *</label><input value={formPro.societe} onChange={e => setFormPro({ ...formPro, societe: e.target.value })} style={inputStyle()} placeholder="Raison sociale" /></div>
                <div><label style={labelStyle()}>Email professionnel *</label><input type="email" value={formPro.email} onChange={e => setFormPro({ ...formPro, email: e.target.value })} style={inputStyle()} placeholder="contact@societe.fr" /></div>
                <div><label style={labelStyle()}>Téléphone</label><input value={formPro.telephone} onChange={e => setFormPro({ ...formPro, telephone: e.target.value })} style={inputStyle()} placeholder="06 XX XX XX XX" /></div>
                <div><label style={labelStyle()}>Site web</label><input value={formPro.site_web} onChange={e => setFormPro({ ...formPro, site_web: e.target.value })} style={inputStyle()} placeholder="https://www.societe.fr" /></div>
              </div>

              {/* Profil métier */}
              <SectionTitle>Profil métier</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={labelStyle()}>Type de structure *</label>
                  <select value={formPro.type_structure} onChange={e => setFormPro({ ...formPro, type_structure: e.target.value })} style={{ ...inputStyle(), cursor: "pointer" }}>
                    <option value="">Choisir…</option>
                    {typeStructures.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle()}>Tarif journalier (€/j)</label>
                  <input type="number" value={formPro.tarif_journalier} onChange={e => setFormPro({ ...formPro, tarif_journalier: e.target.value })} style={inputStyle()} placeholder="Ex : 800" />
                </div>
              </div>

              {/* Familles de prestations */}
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle()}>Familles de prestations proposées</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {FAMILLES.filter(f => f.id !== "tous").map(f => (
                    <button key={f.id} onClick={() => setFormPro({ ...formPro, familles: toggleArray(formPro.familles, f.id) })} style={{
                      display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px",
                      border: formPro.familles.includes(f.id) ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                      background: formPro.familles.includes(f.id) ? "#ECFDF5" : "white",
                      color: formPro.familles.includes(f.id) ? "#065F46" : "#64748B",
                      fontSize: "12px", fontWeight: formPro.familles.includes(f.id) ? 600 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <i className={`ti ${f.icon}`} style={{ fontSize: "14px" }} aria-hidden="true" />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zones d'intervention */}
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle()}>Zones d'intervention</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {zonesIntervention.map(z => (
                    <button key={z} onClick={() => setFormPro({ ...formPro, zones_intervention: toggleArray(formPro.zones_intervention, z) })} style={{
                      padding: "5px 12px", borderRadius: "6px",
                      border: formPro.zones_intervention.includes(z) ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                      background: formPro.zones_intervention.includes(z) ? "#ECFDF5" : "white",
                      color: formPro.zones_intervention.includes(z) ? "#065F46" : "#64748B",
                      fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle()}>Présentation de vos prestations</label>
                <textarea value={formPro.description} onChange={e => setFormPro({ ...formPro, description: e.target.value })} rows={4} placeholder="Décrivez vos expertises, références, méthodes de travail…" style={{ ...inputStyle(), resize: "vertical" as const }} />
              </div>

              {/* Documents */}
              <SectionTitle>Documents requis</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                  { label: "Kbis (moins de 3 mois) *", key: "kbis", desc: "Extrait Kbis ou équivalent" },
                  { label: "Attestation assurance RC Pro *", key: "assurance", desc: "En cours de validité" },
                  { label: "Références clients", key: "references", desc: "Exemples de missions réalisées" },
                ].map((doc, i) => (
                  <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{doc.label}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "10px" }}>{doc.desc}</div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", color: "#64748B" }}>
                      <i className="ti ti-upload" style={{ fontSize: "14px" }} aria-hidden="true" />
                      {(formPro as any)[doc.key] ? (formPro as any)[doc.key].name : "Choisir un fichier"}
                      <input type="file" accept=".pdf,.jpg,.png" onChange={e => setFormPro({ ...formPro, [doc.key]: e.target.files?.[0] || null })} style={{ display: "none" }} />
                    </label>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmitPro} disabled={loadingPro} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: "#0F6E56", color: "white", border: "none",
                padding: "10px 24px", borderRadius: "7px",
                cursor: loadingPro ? "wait" : "pointer", fontWeight: 500,
                fontSize: "13px", fontFamily: "inherit", width: "100%",
                opacity: loadingPro ? 0.7 : 1,
              }}>
                <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                {loadingPro ? "Envoi en cours…" : "Envoyer mon dossier de candidature"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CONSULTING ── */}
      {onglet === "consulting" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Grille managers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {managers.map((m, i) => (
              <div key={i} onClick={() => setManagerSelectionne(m.type)} style={{
                background: managerSelectionne === m.type ? "#FAFFFE" : "#FFFFFF",
                border: `1px solid ${managerSelectionne === m.type ? "#0F6E56" : "#E2E8F0"}`,
                borderRadius: "10px", padding: "14px",
                cursor: "pointer", transition: "border-color 0.12s",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "8px", background: managerSelectionne === m.type ? "#ECFDF5" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                  <i className={`ti ${m.icon}`} style={{ fontSize: "18px", color: managerSelectionne === m.type ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
                </div>
                <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", marginBottom: "5px", lineHeight: 1.3 }}>{m.type}</div>
                <p style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px", lineHeight: 1.4 }}>{m.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                  {m.competences.map((c, j) => (
                    <span key={j} style={{ background: "#F1F5F9", color: "#475569", padding: "2px 6px", borderRadius: "3px", fontSize: "10px" }}>{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire consulting */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Demande de mission</div>
            <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Décrivez votre besoin — notre équipe vous recontacte sous 48h</div>

            {succesConsulting ? (
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "32px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "28px", color: "#0F6E56" }} aria-hidden="true" />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Demande envoyée !</div>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Notre équipe vous recontacte sous 48h ouvrées.</div>
                <button onClick={() => setSuccesConsulting(false)} style={{ background: "#0F6E56", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
                  Nouvelle demande
                </button>
              </div>
            ) : (
              <div>
                {erreurConsulting && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B" }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />
                    {erreurConsulting}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  {[
                    { label: "Société *", key: "societe", type: "input", placeholder: "Nom de votre société" },
                    { label: "Secteur", key: "secteur", type: "select", options: secteurs },
                    { label: "Type de manager *", key: "type_manager", type: "select", options: managers.map(m => m.type) },
                    { label: "Format mission", key: "format_mission", type: "select", options: formats },
                    { label: "Niveau urgence", key: "urgence", type: "select", options: urgences },
                    { label: "Contact nom", key: "contact_nom", type: "input", placeholder: "Votre nom" },
                    { label: "Email *", key: "contact_email", type: "input", placeholder: "votre@email.com" },
                    { label: "Téléphone", key: "contact_telephone", type: "input", placeholder: "06 XX XX XX XX" },
                  ].map((f, i) => (
                    <div key={i}>
                      <label style={labelStyle()}>{f.label}</label>
                      {f.type === "input" ? (
                        <input value={(formConsulting as any)[f.key]} onChange={e => setFormConsulting({ ...formConsulting, [f.key]: e.target.value })} placeholder={f.placeholder} style={inputStyle()} />
                      ) : (
                        <select value={(formConsulting as any)[f.key] || (f.key === "type_manager" ? managerSelectionne : "")} onChange={e => setFormConsulting({ ...formConsulting, [f.key]: e.target.value })} style={{ ...inputStyle(), cursor: "pointer" }}>
                          <option value="">Choisir…</option>
                          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle()}>Description du besoin</label>
                  <textarea value={formConsulting.description} onChange={e => setFormConsulting({ ...formConsulting, description: e.target.value })} placeholder="Décrivez votre projet, vos objectifs, le contexte…" rows={4} style={{ ...inputStyle(), resize: "vertical" as const }} />
                </div>
                <button onClick={handleSubmitConsulting} disabled={loadingConsulting} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  background: "#0F6E56", color: "white", border: "none",
                  padding: "10px 24px", borderRadius: "7px", cursor: loadingConsulting ? "wait" : "pointer",
                  fontWeight: 500, fontSize: "13px", fontFamily: "inherit", width: "100%", opacity: loadingConsulting ? 0.7 : 1,
                }}>
                  <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                  {loadingConsulting ? "Envoi en cours…" : "Envoyer ma demande"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}