import React, { useState } from "react"
import { supabase } from "../lib/supabase"

const partenaires = [
  { id: 1, nom: "BatExpert Sud-Ouest",           type: "diagnostiqueur", ville: "Dax",            note: 4.8, avis: 124, specialites: ["RGA", "PPRI", "Feux"],        disponible: true,  prix: "À partir de 350 €" },
  { id: 2, nom: "Cabinet Risques & Patrimoine",  type: "bureau_etudes",  ville: "Pau",            note: 4.6, avis: 89,  specialites: ["RGA", "Submersion"],           disponible: true,  prix: "À partir de 800 €" },
  { id: 3, nom: "Rénov Climat 40",               type: "artisan",        ville: "Mont-de-Marsan", note: 4.9, avis: 203, specialites: ["Travaux RGA", "Drainage"],     disponible: false, prix: "Sur devis" },
  { id: 4, nom: "Fonds Barnier Conseil",         type: "financeur",      ville: "Bordeaux",       note: 4.7, avis: 56,  specialites: ["Fonds Barnier", "Subventions"],disponible: true,  prix: "Gratuit" },
  { id: 5, nom: "GéoRisk Expertise",             type: "diagnostiqueur", ville: "Bayonne",        note: 4.5, avis: 78,  specialites: ["PPRI", "Tempête"],              disponible: true,  prix: "À partir de 280 €" },
  { id: 6, nom: "Sud Bâtiment Résilience",       type: "artisan",        ville: "Tarbes",         note: 4.8, avis: 167, specialites: ["Isolation", "Surélévation"],   disponible: true,  prix: "Sur devis" },
]

const managers = [
  { type: "Climate Risk Manager",        desc: "Analyse et gestion des risques climatiques physiques et de transition", icon: "ti-shield",           competences: ["RCP scenarios", "VaR climatique", "TCFD"] },
  { type: "Climate Data Manager",        desc: "Collecte, traitement et valorisation des données climatiques",          icon: "ti-database",         competences: ["Data climate", "ESG metrics", "Reporting"] },
  { type: "Climate Prevention Manager",  desc: "Prévention des risques naturels et adaptation des actifs",              icon: "ti-refresh-alert",    competences: ["RGA", "PPRI", "Plan adaptation"] },
  { type: "Climate Adaptation Manager",  desc: "Stratégies d'adaptation au changement climatique",                     icon: "ti-plant-2",          competences: ["Stratégie climat", "Résilience", "Territoire"] },
  { type: "Climate Engineering Manager", desc: "Solutions techniques d'adaptation et de résilience",                   icon: "ti-tool",             competences: ["Génie civil", "Travaux adaptation", "Diagnostic"] },
  { type: "ESG / Compliance Manager",    desc: "Conformité réglementaire et reporting ESG/CSRD",                       icon: "ti-file-analytics",   competences: ["CSRD", "ESRS", "Taxonomie UE"] },
]

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  diagnostiqueur: { label: "Diagnostiqueur", color: "#1E40AF", bg: "#EFF6FF" },
  bureau_etudes:  { label: "Bureau d'études", color: "#5B21B6", bg: "#F5F3FF" },
  artisan:        { label: "Artisan",         color: "#92400E", bg: "#FFFBEB" },
  financeur:      { label: "Financeur",       color: "#065F46", bg: "#ECFDF5" },
}

const formats  = ["Mission ponctuelle", "Assistance technique", "Régie long terme", "Programme multi-sites"]
const urgences = ["Standard (4-6 semaines)", "Urgent (2-3 semaines)", "Très urgent (< 1 semaine)"]
const secteurs = ["Assurance", "Banque", "Immobilier", "Collectivité", "Industrie", "Autre"]

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const, background: "white" }
}

function labelStyle(): React.CSSProperties {
  return { display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.07em" }
}

export default function Marketplace() {
  const [onglet, setOnglet] = useState("partenaires")
  const [filtre, setFiltre] = useState("tous")
  const [recherche, setRecherche] = useState("")
  const [managerSelectionne, setManagerSelectionne] = useState("")
  const [formData, setFormData] = useState({
    societe: "", secteur: "", type_manager: "", format_mission: "",
    urgence: "", description: "", contact_nom: "", contact_email: "", contact_telephone: "",
  })
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState("")

  const partenairesAffiches = partenaires.filter(p => {
    if (filtre !== "tous" && p.type !== filtre) return false
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase()) && !p.ville.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  async function handleSubmit() {
    if (!formData.societe || !formData.contact_email || !formData.type_manager) {
      setErreur("Veuillez remplir les champs obligatoires : société, type de manager et email.")
      return
    }
    setLoading(true)
    setErreur("")
    const { error } = await supabase.from("missions").insert([{ ...formData, statut: "nouvelle", phase: 1 }])
    if (error) {
      setErreur("Erreur lors de l'envoi. Veuillez réessayer.")
    } else {
      setSucces(true)
      setFormData({ societe: "", secteur: "", type_manager: "", format_mission: "", urgence: "", description: "", contact_nom: "", contact_email: "", contact_telephone: "" })
    }
    setLoading(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {[{ id: "partenaires", label: "Partenaires", icon: "ti-building-store" }, { id: "consulting", label: "Consulting Climat", icon: "ti-leaf" }].map(o => (
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

      {/* Partenaires */}
      {onglet === "partenaires" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Barre recherche + filtres */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un partenaire ou une ville…" style={{ ...inputStyle(), paddingLeft: "32px" }} />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[{ id: "tous", label: "Tous" }, { id: "diagnostiqueur", label: "Diagnostiqueurs" }, { id: "bureau_etudes", label: "Bureaux d'études" }, { id: "artisan", label: "Artisans" }, { id: "financeur", label: "Financeurs" }].map(t => (
                <button key={t.id} onClick={() => setFiltre(t.id)} style={{
                  padding: "5px 12px", borderRadius: "6px",
                  border: filtre === t.id ? "1px solid #0F6E56" : "1px solid #E2E8F0",
                  background: filtre === t.id ? "#ECFDF5" : "white",
                  color: filtre === t.id ? "#065F46" : "#64748B",
                  fontSize: "12px", fontWeight: filtre === t.id ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille partenaires */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {partenairesAffiches.map(p => {
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

      {/* Consulting */}
      {onglet === "consulting" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Grille managers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {managers.map((m, i) => (
              <div key={i} onClick={() => setManagerSelectionne(m.type)} style={{
  background: managerSelectionne === m.type ? "#FAFFFE" : "#FFFFFF",
  border: `1px solid ${managerSelectionne === m.type ? "#0F6E56" : "#E2E8F0"}`,
  borderRadius: "10px", padding: "16px",
  cursor: "pointer", transition: "border-color 0.12s",
}}>
                <div style={{ width: 36, height: 36, borderRadius: "8px", background: managerSelectionne === m.type ? "#ECFDF5" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                  <i className={`ti ${m.icon}`} style={{ fontSize: "18px", color: managerSelectionne === m.type ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>{m.type}</div>
                <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "10px", lineHeight: 1.5 }}>{m.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {m.competences.map((c, j) => (
                    <span key={j} style={{ background: "#F1F5F9", color: "#475569", padding: "2px 7px", borderRadius: "4px", fontSize: "11px" }}>{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Demande de mission</div>
            <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Décrivez votre besoin — notre équipe vous recontacte sous 48h</div>

            {succes ? (
              <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "32px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "28px", color: "#0F6E56" }} aria-hidden="true" />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Demande envoyée !</div>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Notre équipe vous recontacte sous 48h ouvrées.</div>
                <button onClick={() => setSucces(false)} style={{ background: "#0F6E56", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
                  Nouvelle demande
                </button>
              </div>
            ) : (
              <div>
                {erreur && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B" }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: "15px", flexShrink: 0 }} aria-hidden="true" />
                    {erreur}
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
                        <input
                          value={(formData as any)[f.key]}
                          onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          style={inputStyle()}
                        />
                      ) : (
                        <select
                          value={(formData as any)[f.key] || (f.key === "type_manager" ? managerSelectionne : "")}
                          onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                          style={{ ...inputStyle(), cursor: "pointer" }}
                        >
                          <option value="">Choisir…</option>
                          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle()}>Description du besoin</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre projet, vos objectifs, le contexte…"
                    rows={4}
                    style={{ ...inputStyle(), resize: "vertical" as const }}
                  />
                </div>
                <button onClick={handleSubmit} disabled={loading} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  background: "#0F6E56", color: "white", border: "none",
                  padding: "10px 24px", borderRadius: "7px",
                  cursor: loading ? "wait" : "pointer", fontWeight: 500,
                  fontSize: "13px", fontFamily: "inherit", width: "100%",
                  opacity: loading ? 0.7 : 1,
                }}>
                  <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                  {loading ? "Envoi en cours…" : "Envoyer ma demande"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}