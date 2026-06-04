import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormEtape1 {
  prenom: string
  nom: string
  email: string
  password: string
  telephone: string
  societe: string
  siret: string
  site_web: string
  type_structure: string
  nb_collaborateurs: string
  annees_experience: string
  disponibilite: string
  zones_intervention: string[]
  tarif_journalier: string
}

interface FormEtape2 {
  specialites: string[]
  certifications: string[]
  description: string
  motivation: string
  linkedin_url: string
  kbis_file: File | null
  assurance_file: File | null
  references_file: File | null
}

const TYPE_STRUCTURES = [
  { value: "diagnostiqueur", label: "Diagnostiqueur" },
  { value: "bureau_etudes",  label: "Bureau d'études" },
  { value: "artisan",        label: "Artisan" },
  { value: "financeur",      label: "Financeur" },
  { value: "consultant",     label: "Consultant" },
  { value: "autre",          label: "Autre" },
]

const ZONES = [
  "Nord", "Nord-Est", "Nord-Ouest", "Ile-de-France",
  "Centre", "Sud-Est", "Sud-Ouest", "National",
]

const SPECIALITES = [
  "DPE / Audit énergétique",
  "Bilan GES / Bilan Carbone",
  "CSRD / ESRS",
  "Décret Tertiaire",
  "Décret BACS",
  "ISO 50001",
  "EU Taxonomy / SFDR",
  "Brown Value",
  "Prévention climatique",
  "Rénovation énergétique",
  "Financement / CEE",
]

const CERTIFICATIONS = [
  "RGE", "OPQIBI", "ISO 9001", "ISO 14001",
  "Qualibat", "Qualifelec", "COFRAC", "Autre",
]

const DISPONIBILITES = [
  { value: "immediate",    label: "Immédiate" },
  { value: "1_mois",       label: "Sous 1 mois" },
  { value: "3_mois",       label: "Sous 3 mois" },
  { value: "a_definir",    label: "À définir" },
]

const FORM1_INITIAL: FormEtape1 = {
  prenom: "", nom: "", email: "", password: "", telephone: "",
  societe: "", siret: "", site_web: "", type_structure: "",
  nb_collaborateurs: "", annees_experience: "", disponibilite: "",
  zones_intervention: [], tarif_journalier: "",
}

const FORM2_INITIAL: FormEtape2 = {
  specialites: [], certifications: [], description: "",
  motivation: "", linkedin_url: "",
  kbis_file: null, assurance_file: null, references_file: null,
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function PartenaireInscription() {
  const navigate = useNavigate()
  const [etape, setEtape]       = useState(1)
  const [form1, setForm1]       = useState<FormEtape1>(FORM1_INITIAL)
  const [form2, setForm2]       = useState<FormEtape2>(FORM2_INITIAL)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState(false)

  function toggleZone(zone: string) {
    setForm1(prev => ({
      ...prev,
      zones_intervention: prev.zones_intervention.includes(zone)
        ? prev.zones_intervention.filter(z => z !== zone)
        : [...prev.zones_intervention, zone],
    }))
  }

  function toggleSpecialite(s: string) {
    setForm2(prev => ({
      ...prev,
      specialites: prev.specialites.includes(s)
        ? prev.specialites.filter(x => x !== s)
        : [...prev.specialites, s],
    }))
  }

  function toggleCertification(c: string) {
    setForm2(prev => ({
      ...prev,
      certifications: prev.certifications.includes(c)
        ? prev.certifications.filter(x => x !== c)
        : [...prev.certifications, c],
    }))
  }

  function validerEtape1() {
    if (!form1.prenom || !form1.nom || !form1.email || !form1.password) {
      setError("Prénom, nom, email et mot de passe sont obligatoires.")
      return false
    }
    if (!form1.societe || !form1.type_structure) {
      setError("Société et type de structure sont obligatoires.")
      return false
    }
    if (form1.zones_intervention.length === 0) {
      setError("Sélectionnez au moins une zone d'intervention.")
      return false
    }
    if (form1.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return false
    }
    setError("")
    return true
  }

  function handleEtapeSuivante() {
    if (validerEtape1()) setEtape(2)
  }

  async function uploadDoc(file: File, folder: string, userId: string): Promise<string | null> {
    const path = `partenaires/${userId}/${folder}/${file.name}`
    const { error } = await supabase.storage
      .from("documents-clients")
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from("documents-clients").getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSoumettre() {
    if (form2.specialites.length === 0) {
      setError("Sélectionnez au moins une spécialité.")
      return
    }
    if (!form2.kbis_file || !form2.assurance_file) {
      setError("Le Kbis et l'attestation d'assurance sont obligatoires.")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 1. Créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form1.email,
        password: form1.password,
      })
      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error("Erreur lors de la création du compte.")

      // 2. Créer le profil AGE
      await supabase.from("profils").insert({
        id:     userId,
        prenom: form1.prenom,
        nom:    form1.nom,
        role:   "partenaire",
        profil: "age",
      })

      // 3. Upload documents
      const kbisUrl      = await uploadDoc(form2.kbis_file!, "kbis", userId)
      const assuranceUrl = await uploadDoc(form2.assurance_file!, "assurance", userId)
      const referencesUrl = form2.references_file
        ? await uploadDoc(form2.references_file, "references", userId)
        : null

      // 4. Créer le profil prestataire
      const { error: prestaError } = await supabase.from("prestataires_pro").insert({
        user_id:            userId,
        prenom:             form1.prenom,
        nom:                form1.nom,
        email:              form1.email,
        telephone:          form1.telephone || null,
        societe:            form1.societe,
        siret:              form1.siret || null,
        site_web:           form1.site_web || null,
        type_structure:     form1.type_structure,
        nb_collaborateurs:  form1.nb_collaborateurs ? parseInt(form1.nb_collaborateurs) : null,
        annees_experience:  form1.annees_experience ? parseInt(form1.annees_experience) : null,
        disponibilite:      form1.disponibilite || null,
        zones_intervention: form1.zones_intervention,
        tarif_journalier:   form1.tarif_journalier ? parseFloat(form1.tarif_journalier.replace(",", ".")) : null,
        specialites:        form2.specialites,
        certifications:     form2.certifications,
        description:        form2.description || null,
        motivation:         form2.motivation || null,
        linkedin_url:       form2.linkedin_url || null,
        kbis_url:           kbisUrl,
        assurance_url:      assuranceUrl,
        references_url:     referencesUrl,
        actif:              false,   // en attente de validation admin
        statut:             "en_attente",
      })
      if (prestaError) throw prestaError

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  // ─── Succès ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "28px", color: "#2F7D5C" }} />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
              Candidature soumise
            </h2>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.6, marginBottom: "24px" }}>
              Votre dossier a été transmis à l'équipe AGE Climate.<br />
              Vous serez contacté sous 48h pour confirmation.
            </p>
            <button
              onClick={() => navigate("/partenaire/login")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px", background: "#B25C2A", color: "white", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-login" style={{ fontSize: "14px" }} />
              Aller à la connexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-leaf" style={{ fontSize: "18px", color: "white" }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>AGE Climate</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", marginBottom: "6px", letterSpacing: "-0.02em" }}>
            Rejoindre le réseau partenaire
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280" }}>
            Votre candidature sera examinée par notre équipe
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "32px" }}>
          {[
            { num: 1, label: "Informations" },
            { num: 2, label: "Compétences & Documents" },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: etape === s.num ? "#B25C2A" : etape > s.num ? "#2F7D5C" : "#E2DDD8", color: etape >= s.num ? "white" : "#9CA3AF" }}>
                  {etape > s.num ? <i className="ti ti-check" style={{ fontSize: "12px" }} /> : s.num}
                </div>
                <span style={{ fontSize: "12px", fontWeight: etape === s.num ? 600 : 400, color: etape === s.num ? "#B25C2A" : etape > s.num ? "#2F7D5C" : "#9CA3AF" }}>
                  {s.label}
                </span>
              </div>
              {i < 1 && <div style={{ flex: 1, height: "1px", background: etape > 1 ? "#2F7D5C" : "#E2DDD8", margin: "0 8px" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Erreur */}
        {error && (
          <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", marginBottom: "20px", display: "flex", gap: "8px", alignItems: "center" }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: "14px", flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── ÉTAPE 1 ── */}
        {etape === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div>
              <div style={sectionTitleStyle}>Identité</div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Prénom <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={form1.prenom} onChange={e => setForm1({ ...form1, prenom: e.target.value })} placeholder="Prénom" />
                </div>
                <div>
                  <label style={labelStyle}>Nom <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={form1.nom} onChange={e => setForm1({ ...form1, nom: e.target.value })} placeholder="Nom" />
                </div>
                <div>
                  <label style={labelStyle}>Email professionnel <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" type="email" value={form1.email} onChange={e => setForm1({ ...form1, email: e.target.value })} placeholder="email@societe.fr" />
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input className="input" value={form1.telephone} onChange={e => setForm1({ ...form1, telephone: e.target.value })} placeholder="06 XX XX XX XX" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Mot de passe <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" type="password" value={form1.password} onChange={e => setForm1({ ...form1, password: e.target.value })} placeholder="Min. 8 caractères" />
                </div>
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Structure</div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Raison sociale <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={form1.societe} onChange={e => setForm1({ ...form1, societe: e.target.value })} placeholder="Nom de la société" />
                </div>
                <div>
                  <label style={labelStyle}>SIRET</label>
                  <input className="input" value={form1.siret} onChange={e => setForm1({ ...form1, siret: e.target.value })} placeholder="14 chiffres" />
                </div>
                <div>
                  <label style={labelStyle}>Type de structure <span style={{ color: "#B91C1C" }}>*</span></label>
                  <select className="input" value={form1.type_structure} onChange={e => setForm1({ ...form1, type_structure: e.target.value })}>
                    <option value="">Choisir…</option>
                    {TYPE_STRUCTURES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Site web</label>
                  <input className="input" value={form1.site_web} onChange={e => setForm1({ ...form1, site_web: e.target.value })} placeholder="https://…" />
                </div>
                <div>
                  <label style={labelStyle}>Nb de collaborateurs</label>
                  <input className="input" type="number" value={form1.nb_collaborateurs} onChange={e => setForm1({ ...form1, nb_collaborateurs: e.target.value })} placeholder="Ex : 5" />
                </div>
                <div>
                  <label style={labelStyle}>Années d'expérience</label>
                  <input className="input" type="number" value={form1.annees_experience} onChange={e => setForm1({ ...form1, annees_experience: e.target.value })} placeholder="Ex : 10" />
                </div>
                <div>
                  <label style={labelStyle}>Tarif journalier (€ HT)</label>
                  <input className="input" value={form1.tarif_journalier} onChange={e => setForm1({ ...form1, tarif_journalier: e.target.value })} placeholder="Ex : 800" />
                </div>
                <div>
                  <label style={labelStyle}>Disponibilité</label>
                  <select className="input" value={form1.disponibilite} onChange={e => setForm1({ ...form1, disponibilite: e.target.value })}>
                    <option value="">Choisir…</option>
                    {DISPONIBILITES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Zones d'intervention <span style={{ color: "#B91C1C" }}>*</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {ZONES.map(z => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => toggleZone(z)}
                    style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${form1.zones_intervention.includes(z) ? "#B25C2A" : "#E2DDD8"}`, background: form1.zones_intervention.includes(z) ? "#F9F0EA" : "white", color: form1.zones_intervention.includes(z) ? "#B25C2A" : "#6B7280" }}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
              <button
                onClick={handleEtapeSuivante}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 24px", borderRadius: "8px", background: "#B25C2A", color: "white", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                Étape suivante
                <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 ── */}
        {etape === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div>
              <div style={sectionTitleStyle}>Spécialités <span style={{ color: "#B91C1C" }}>*</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {SPECIALITES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialite(s)}
                    style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${form2.specialites.includes(s) ? "#B25C2A" : "#E2DDD8"}`, background: form2.specialites.includes(s) ? "#F9F0EA" : "white", color: form2.specialites.includes(s) ? "#B25C2A" : "#6B7280" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Certifications</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {CERTIFICATIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCertification(c)}
                    style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${form2.certifications.includes(c) ? "#0369A1" : "#E2DDD8"}`, background: form2.certifications.includes(c) ? "#F0F9FF" : "white", color: form2.certifications.includes(c) ? "#0369A1" : "#6B7280" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={gridStyle}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Présentation</label>
                <textarea
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "14px", fontFamily: "Inter, sans-serif", color: "#111827", background: "white", outline: "none", resize: "none", height: "80px", boxSizing: "border-box" as const }}
                  placeholder="Décrivez votre expertise et vos réalisations…"
                  value={form2.description}
                  onChange={e => setForm2({ ...form2, description: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Pourquoi rejoindre le réseau AGE ?</label>
                <textarea
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "14px", fontFamily: "Inter, sans-serif", color: "#111827", background: "white", outline: "none", resize: "none", height: "80px", boxSizing: "border-box" as const }}
                  placeholder="Votre motivation…"
                  value={form2.motivation}
                  onChange={e => setForm2({ ...form2, motivation: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn</label>
                <input className="input" value={form2.linkedin_url} onChange={e => setForm2({ ...form2, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" />
              </div>
            </div>

            <div>
              <div style={sectionTitleStyle}>Documents obligatoires</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { key: "kbis_file",       label: "Kbis (moins de 3 mois)",         required: true },
                  { key: "assurance_file",  label: "Attestation d'assurance RC Pro",  required: true },
                  { key: "references_file", label: "Références clients (optionnel)",  required: false },
                ].map(doc => (
                  <div key={doc.key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#F4F3F0", borderRadius: "8px", border: "1px solid #E2DDD8" }}>
                    <i className={`ti ${(form2 as any)[doc.key] ? "ti-file-check" : "ti-file-upload"}`} style={{ fontSize: "18px", color: (form2 as any)[doc.key] ? "#2F7D5C" : "#9CA3AF" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                        {doc.label}
                        {doc.required && <span style={{ color: "#B91C1C", marginLeft: "4px" }}>*</span>}
                      </div>
                      {(form2 as any)[doc.key] && (
                        <div style={{ fontSize: "11px", color: "#2F7D5C", marginTop: "2px" }}>
                          {((form2 as any)[doc.key] as File).name}
                        </div>
                      )}
                    </div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
                      <i className="ti ti-upload" style={{ fontSize: "13px" }} />
                      {(form2 as any)[doc.key] ? "Modifier" : "Choisir"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setForm2({ ...form2, [doc.key]: e.target.files[0] })
                          }
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", paddingTop: "8px" }}>
              <button
                onClick={() => { setEtape(1); setError("") }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px", background: "white", color: "#6B7280", border: "1px solid #E2DDD8", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} />
                Retour
              </button>
              <button
                onClick={handleSoumettre}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 24px", borderRadius: "8px", background: "#B25C2A", color: "white", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                {loading
                  ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Soumission…</>
                  : <><i className="ti ti-send" style={{ fontSize: "14px" }} /> Soumettre ma candidature</>
                }
              </button>
            </div>

          </div>
        )}

        {/* Lien connexion */}
        <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #E2DDD8" }}>
          <span style={{ fontSize: "13px", color: "#6B7280" }}>Déjà partenaire ? </span>
          <button onClick={() => navigate("/partenaire/login")} style={{ fontSize: "13px", color: "#B25C2A", fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Se connecter
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4F3F0",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "40px 16px",
}

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #E2DDD8",
  padding: "40px",
  width: "100%",
  maxWidth: "640px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "12px",
  paddingBottom: "8px",
  borderBottom: "1px solid #F4F3F0",
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
}