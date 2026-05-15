import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type ProfilType = "banque" | "assurance" | "particulier" | "collectivite" | null

const PROFILS = [
  { id: "banque",      label: "Banque",       icon: "ti-building-bank",      desc: "Financement immobilier, crédit, analyse du risque de portefeuille" },
  { id: "assurance",   label: "Assurance",    icon: "ti-shield-check",       desc: "Souscription, sinistres, exposition climatique des assurés" },
  { id: "particulier", label: "Particulier",  icon: "ti-home",               desc: "Évaluation du risque climatique de votre bien immobilier" },
  { id: "collectivite",label: "Collectivité", icon: "ti-building-community", desc: "Adaptation territoriale et conformité réglementaire" },
]

const RACCOURCIS: Record<string, { label: string; route: string; icon: string }[]> = {
  banque:      [{ label: "Mes campagnes", route: "/metier/campagnes",    icon: "ti-speakerphone" }, { label: "Portefeuille", route: "/metier/portefeuille", icon: "ti-building-bank" }],
  assurance:   [{ label: "Mes campagnes", route: "/metier/campagnes",    icon: "ti-speakerphone" }, { label: "Portefeuille", route: "/metier/portefeuille", icon: "ti-building-bank" }],
  particulier: [{ label: "Mon bien",      route: "/client/actifs",       icon: "ti-home"         }, { label: "Aides & Subventions", route: "/client/aides", icon: "ti-coin" }],
  collectivite:[{ label: "Mon territoire",route: "/metier/portefeuille", icon: "ti-map"          }, { label: "Reporting", route: "/metier/reporting", icon: "ti-file-analytics" }],
}

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

export default function MonProfil() {
  const navigate = useNavigate()
  const [profilActuel, setProfilActuel] = useState<ProfilType>(null)
  const [profilSelectionne, setProfilSelectionne] = useState<ProfilType>(null)
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || "")
      const { data } = await supabase.from("profils").select("*").eq("id", user.id).single()
      if (data) {
        setProfilActuel(data.profil as ProfilType)
        setProfilSelectionne(data.profil as ProfilType)
        setPrenom(data.prenom || "")
        setNom(data.nom || "")
      }
      setLoading(false)
    }
    charger()
  }, [])

  async function sauvegarder() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profils").upsert({ id: user.id, prenom, nom, profil: profilSelectionne })
    setProfilActuel(profilSelectionne)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => navigate("/client")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "15px" }} aria-hidden="true" />
          Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", color: "#64748B" }}>Modifiez vos informations et votre type de compte</div>
        </div>
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ECFDF5", color: "#065F46", padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, border: "1px solid #A7F3D0" }}>
            <i className="ti ti-circle-check" style={{ fontSize: "15px" }} aria-hidden="true" />
            Modifications sauvegardées
          </div>
        )}
      </div>

      {/* Informations + Aperçu */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Informations personnelles */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>
            <i className="ti ti-user" style={{ fontSize: "15px", color: "#94A3B8", marginRight: "8px" }} aria-hidden="true" />
            Informations personnelles
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle()}>Prénom</label>
                <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Nom</label>
                <input type="text" value={nom} onChange={e => setNom(e.target.value)} style={inputStyle()} />
              </div>
            </div>
            <div>
              <label style={labelStyle()}>Email</label>
              <input type="email" value={email} disabled style={inputStyle(true)} />
              <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>L'email ne peut pas être modifié ici</div>
            </div>
          </div>
        </div>

        {/* Aperçu raccourcis */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>
            <i className="ti ti-layout-grid" style={{ fontSize: "15px", color: "#94A3B8", marginRight: "8px" }} aria-hidden="true" />
            Raccourcis dans l'accueil
          </div>
          {profilSelectionne ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "4px" }}>
                Avec le profil <strong style={{ color: "#0F172A" }}>{PROFILS.find(p => p.id === profilSelectionne)?.label}</strong>, votre accueil affichera :
              </div>
              {RACCOURCIS[profilSelectionne]?.map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 14px", borderRadius: "8px",
                  background: i === 0 ? "#ECFDF5" : "#F8FAFC",
                  border: `1px solid ${i === 0 ? "#A7F3D0" : "#E2E8F0"}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: "7px", background: i === 0 ? "#DCFCE7" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${r.icon}`} style={{ fontSize: "16px", color: i === 0 ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{r.label}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "'DM Mono', monospace" }}>{r.route}</div>
                  </div>
                  {i === 0 && (
                    <span style={{ background: "#0F6E56", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>Principal</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8" }}>
              <i className="ti ti-hand-click" style={{ fontSize: "32px", display: "block", marginBottom: "10px" }} aria-hidden="true" />
              <div style={{ fontSize: "13px" }}>Sélectionnez un profil pour voir vos raccourcis</div>
            </div>
          )}
        </div>
      </div>

      {/* Choix du profil */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Type de compte</div>
        <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "16px" }}>
          Ce choix détermine les raccourcis affichés dans votre bandeau d'accueil.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "20px" }}>
          {PROFILS.map(p => (
            <div key={p.id} onClick={() => setProfilSelectionne(p.id as ProfilType)} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "14px 16px", borderRadius: "9px", cursor: "pointer",
              border: `1px solid ${profilSelectionne === p.id ? "#0F6E56" : "#E2E8F0"}`,
              background: profilSelectionne === p.id ? "#ECFDF5" : "white",
              transition: "all 0.12s",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: "9px", background: profilSelectionne === p.id ? "#DCFCE7" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${p.icon}`} style={{ fontSize: "20px", color: profilSelectionne === p.id ? "#0F6E56" : "#94A3B8" }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>{p.label}</div>
                <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>{p.desc}</div>
              </div>
              {profilSelectionne === p.id && (
                <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#0F6E56", flexShrink: 0 }} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => navigate("/client")} style={{ background: "white", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 18px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={sauvegarder} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "8px 20px", borderRadius: "7px",
            cursor: saving ? "wait" : "pointer", fontWeight: 500,
            fontSize: "13px", fontFamily: "inherit", opacity: saving ? 0.7 : 1,
          }}>
            <i className="ti ti-device-floppy" style={{ fontSize: "15px" }} aria-hidden="true" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  )
}