import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const PROFILS = [
  { id: "banque",       label: "Banque",       icon: "ti-building-bank",      desc: "Financement immobilier, crédit, analyse du risque de portefeuille" },
  { id: "assureur",     label: "Assurance",    icon: "ti-shield-check",       desc: "Souscription, sinistres, exposition climatique des assurés" },
  { id: "particulier",  label: "Particulier",  icon: "ti-home",               desc: "Évaluation du risque climatique de votre bien immobilier" },
  { id: "collectivite", label: "Collectivité", icon: "ti-building-community", desc: "Adaptation territoriale et conformité réglementaire" },
  { id: "entreprise",   label: "Entreprise",   icon: "ti-building-factory",   desc: "PME, ETI, Grand groupe — obligations réglementaires et transition énergétique" },
  { id: "foncieres",    label: "Foncière",     icon: "ti-building-estate",    desc: "Valorisation et résilience de votre patrimoine immobilier" },
]

const ENJEUX_LABELS: Record<string, string> = {
  energie:       "Énergie & Performance énergétique",
  environnement: "Environnement & Carbone",
  prevention:    "Prévention & Risques climatiques",
  resilience:    "Accompagnement à la résilience",
  financement:   "Financement & Aides",
  reporting:     "Reporting & Conformité",
}

const NIVEAUX_LABELS: Record<string, string> = {
  debutant: "Débutant — découverte des obligations",
  en_cours: "En cours — accompagnement en démarche",
  avance:   "Avancé — optimisation et structuration",
}

function iStyle(disabled = false): React.CSSProperties {
  return {
    width: "100%", padding: "8px 10px",
    border: "1px solid #E2E8F0", borderRadius: "7px",
    fontSize: "13px", color: disabled ? "#94A3B8" : "#0F172A",
    background: disabled ? "#F8FAFC" : "white",
    fontFamily: "inherit", outline: "none",
    boxSizing: "border-box" as const,
  }
}

function lStyle(): React.CSSProperties {
  return {
    display: "block", fontSize: "11px", fontWeight: 600,
    color: "#94A3B8", marginBottom: "5px",
    textTransform: "uppercase" as const, letterSpacing: "0.07em",
  }
}

export default function MonProfil() {
  const navigate = useNavigate()

  // Identité
  const [prenom, setPrenom]       = useState("")
  const [nom, setNom]             = useState("")
  const [email, setEmail]         = useState("")
  const [telephone, setTelephone] = useState("")
  const [poste, setPoste]         = useState("")

  // Organisation
  const [societe, setSociete]   = useState("")
  const [adresse, setAdresse]   = useState("")
  const [profil, setProfil]     = useState("")

  // Parcours (lecture seule sauf si on clique Modifier)
  const [enjeux, setEnjeux]     = useState<string[]>([])
  const [niveau, setNiveau]     = useState("")
  const [editParcours, setEditParcours] = useState(false)

  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || "")

    const { data: p } = await supabase.from("profils").select("*").eq("id", user.id).single()
    if (p) {
      setPrenom(p.prenom || "")
      setNom(p.nom || "")
      setTelephone(p.telephone || "")
      setPoste(p.poste || "")
      setSociete(p.societe || "")
      setAdresse(p.adresse || "")
      setProfil(p.profil || "")
    }

    const { data: pc } = await supabase.from("profils_client").select("enjeux, niveau").eq("id", user.id).single()
    if (pc) {
      setEnjeux(pc.enjeux || [])
      setNiveau(pc.niveau || "")
    }

    setLoading(false)
  }

  async function sauvegarder() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("profils").upsert({
      id: user.id, prenom, nom, telephone, poste, societe, adresse, profil,
    })

    if (editParcours) {
      await supabase.from("profils_client").upsert({
        id: user.id, enjeux, niveau,
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const initiales = `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase() || "?"
  const pctComplet = [prenom, nom, telephone, poste, societe, adresse, profil].filter(Boolean).length
  const pctLabel = Math.round((pctComplet / 7) * 100)

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour
        </button>
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ECFDF5", color: "#065F46", padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, border: "1px solid #A7F3D0" }}>
            <i className="ti ti-circle-check" style={{ fontSize: "15px" }} aria-hidden="true" />
            Modifications sauvegardées
          </div>
        )}
      </div>

      {/* Avatar + résumé */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "22px", fontWeight: 500, color: "#0F6E56" }}>
          {initiales}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>
            {prenom || nom ? `${prenom} ${nom}`.trim() : "Mon profil"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            {email}{profil ? ` · ${PROFILS.find(p => p.id === profil)?.label}` : ""}{niveau ? ` · Niveau : ${NIVEAUX_LABELS[niveau]?.split(" — ")[0]}` : ""}
          </div>
        </div>
        <div style={{ background: pctLabel >= 80 ? "#ECFDF5" : "#FFFBEB", color: pctLabel >= 80 ? "#065F46" : "#92400E", fontSize: "12px", fontWeight: 500, padding: "4px 12px", borderRadius: "6px" }}>
          Profil complété à {pctLabel} %
        </div>
      </div>

      {/* Identité */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <i className="ti ti-user" style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Identité</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div><label style={lStyle()}>Prénom</label><input value={prenom} onChange={e => setPrenom(e.target.value)} style={iStyle()} placeholder="Votre prénom" /></div>
          <div><label style={lStyle()}>Nom</label><input value={nom} onChange={e => setNom(e.target.value)} style={iStyle()} placeholder="Votre nom" /></div>
          <div><label style={lStyle()}>Téléphone</label><input value={telephone} onChange={e => setTelephone(e.target.value)} style={iStyle()} placeholder="06 XX XX XX XX" /></div>
          <div><label style={lStyle()}>Poste / Fonction</label><input value={poste} onChange={e => setPoste(e.target.value)} style={iStyle()} placeholder="Ex : Directeur des risques" /></div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lStyle()}>Email</label>
            <input value={email} disabled style={iStyle(true)} />
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>L'email ne peut pas être modifié ici</div>
          </div>
        </div>
      </div>

      {/* Organisation */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <i className="ti ti-building" style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Organisation</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div><label style={lStyle()}>Société</label><input value={societe} onChange={e => setSociete(e.target.value)} style={iStyle()} placeholder="Raison sociale" /></div>
          <div>
            <label style={lStyle()}>Type de structure</label>
            <select value={profil} onChange={e => setProfil(e.target.value)} style={{ ...iStyle(), cursor: "pointer" }}>
              <option value="">Choisir…</option>
              {PROFILS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lStyle()}>Adresse</label>
            <input value={adresse} onChange={e => setAdresse(e.target.value)} style={iStyle()} placeholder="Adresse complète" />
          </div>
        </div>
      </div>

      {/* Mon parcours */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="ti ti-route" style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Mon parcours</div>
          </div>
          <button onClick={() => setEditParcours(!editParcours)} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#0369A1", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-edit" style={{ fontSize: "14px" }} aria-hidden="true" />
            {editParcours ? "Fermer" : "Modifier"}
          </button>
        </div>

        {!editParcours ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={lStyle()}>Enjeux prioritaires</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {enjeux.length > 0
                  ? enjeux.map(e => <span key={e} style={{ background: "#ECFDF5", color: "#065F46", fontSize: "12px", padding: "3px 10px", borderRadius: "4px" }}>{ENJEUX_LABELS[e] || e}</span>)
                  : <span style={{ fontSize: "13px", color: "#94A3B8" }}>Non défini</span>
                }
              </div>
            </div>
            <div>
              <label style={lStyle()}>Niveau</label>
              <span style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: "12px", padding: "3px 10px", borderRadius: "4px" }}>
                {niveau ? NIVEAUX_LABELS[niveau] : "Non défini"}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={lStyle()}>Enjeux prioritaires</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {Object.entries(ENJEUX_LABELS).map(([id, label]) => (
                  <button key={id} onClick={() => setEnjeux(enjeux.includes(id) ? enjeux.filter(e => e !== id) : [...enjeux, id])} style={{ padding: "5px 12px", borderRadius: "6px", border: enjeux.includes(id) ? "1px solid #0F6E56" : "1px solid #E2E8F0", background: enjeux.includes(id) ? "#ECFDF5" : "white", color: enjeux.includes(id) ? "#065F46" : "#64748B", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lStyle()}>Niveau</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {Object.entries(NIVEAUX_LABELS).map(([id, label]) => (
                  <button key={id} onClick={() => setNiveau(id)} style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: niveau === id ? "1px solid #0F6E56" : "1px solid #E2E8F0", background: niveau === id ? "#ECFDF5" : "white", color: niveau === id ? "#065F46" : "#64748B", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sécurité */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <i className="ti ti-lock" style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Sécurité</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8FAFC", borderRadius: "8px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>Mot de passe</div>
            <div style={{ fontSize: "12px", color: "#94A3B8" }}>Modifiez votre mot de passe via l'email de réinitialisation</div>
          </div>
          <button
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (user?.email) await supabase.auth.resetPasswordForEmail(user.email)
              alert("Un email de réinitialisation vous a été envoyé.")
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-mail" style={{ fontSize: "14px" }} aria-hidden="true" />
            Envoyer le lien
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button onClick={() => navigate("/")} style={{ background: "white", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 18px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
          Annuler
        </button>
        <button onClick={sauvegarder} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", cursor: saving ? "wait" : "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          <i className="ti ti-device-floppy" style={{ fontSize: "15px" }} aria-hidden="true" />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

    </div>
  )
}