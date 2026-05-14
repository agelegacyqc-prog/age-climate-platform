import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type ProfilType = "banque" | "assurance" | "particulier" | "collectivite" | null

const PROFILS = [
  { id: "banque", label: "Banque", icone: "🏦", desc: "Financement immobilier, crédit, analyse du risque de portefeuille" },
  { id: "assurance", label: "Assurance", icone: "🛡️", desc: "Souscription, sinistres, exposition climatique des assurés" },
  { id: "particulier", label: "Particulier", icone: "🏠", desc: "Évaluation du risque climatique de votre bien immobilier" },
  { id: "collectivite", label: "Collectivité", icone: "🏛️", desc: "Adaptation territoriale et conformité réglementaire" },
]

const RACCOURCIS: Record<string, { label: string; route: string; icone: string }[]> = {
  banque: [
    { label: "Mes campagnes", route: "/metier/campagnes", icone: "📋" },
    { label: "Portefeuille", route: "/metier/portefeuille", icone: "🏢" },
  ],
  assurance: [
    { label: "Mes campagnes", route: "/metier/campagnes", icone: "📋" },
    { label: "Portefeuille", route: "/metier/portefeuille", icone: "🏢" },
  ],
  particulier: [
    { label: "Mon bien", route: "/client/actifs", icone: "🏠" },
    { label: "Aides & Subventions", route: "/client/aides", icone: "💶" },
  ],
  collectivite: [
    { label: "Mon territoire", route: "/metier/portefeuille", icone: "🗺️" },
    { label: "Reporting", route: "/metier/reporting", icone: "📊" },
  ],
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

      const { data } = await supabase
        .from("profils")
        .select("*")
        .eq("id", user.id)
        .single()

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

    await supabase.from("profils").upsert({
      id: user.id,
      prenom,
      nom,
      profil: profilSelectionne,
    })

    setProfilActuel(profilSelectionne)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const aChange = profilSelectionne !== profilActuel || false

  if (loading) return <div style={{ padding: "2rem", color: "#666" }}>Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => navigate("/client")}
          style={{ background: "white", border: "1px solid #e5e1da", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", color: "#666" }}>
          ← Retour
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "#1a3a2a", marginBottom: "0.1rem" }}>Mon profil</h2>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>Modifiez vos informations et votre type de compte</p>
        </div>
        {saved && (
          <div style={{ background: "#dcfce7", color: "#2d6a4f", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
            ✓ Modifications sauvegardées
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Informations personnelles */}
        <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ color: "#1a3a2a", marginBottom: "1.25rem" }}>👤 Informations personnelles</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#78716C", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Prénom</label>
                <input
                  type="text" value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "14px", color: "#1F2937", boxSizing: "border-box" as const }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#78716C", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Nom</label>
                <input
                  type="text" value={nom}
                  onChange={e => setNom(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "14px", color: "#1F2937", boxSizing: "border-box" as const }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#78716C", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Email</label>
              <input
                type="email" value={email} disabled
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "14px", color: "#78716C", background: "#F8F7F4", boxSizing: "border-box" as const }}
              />
              <div style={{ fontSize: "11px", color: "#78716C", marginTop: 4 }}>L'email ne peut pas être modifié ici</div>
            </div>
          </div>
        </div>

        {/* Aperçu raccourcis */}
        <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ color: "#1a3a2a", marginBottom: "1.25rem" }}>🏠 Raccourcis dans l'accueil</h3>
          {profilSelectionne ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                Avec le profil <strong>{PROFILS.find(p => p.id === profilSelectionne)?.label}</strong>, votre bandeau d'accueil affichera :
              </p>
              {RACCOURCIS[profilSelectionne]?.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", borderRadius: "8px", background: i === 0 ? "#f0f4f0" : "#f8f7f4", border: "1px solid #e5e1da" }}>
                  <span style={{ fontSize: "1.25rem" }}>{r.icone}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1a3a2a", fontSize: "0.9rem" }}>{r.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>{r.route}</div>
                  </div>
                  {i === 0 && <span style={{ marginLeft: "auto", background: "#7ec87e", color: "#1a3a2a", padding: "2px 8px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>Principal</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👆</div>
              <p style={{ fontSize: "0.9rem" }}>Sélectionnez un profil pour voir vos raccourcis</p>
            </div>
          )}
        </div>
      </div>

      {/* Choix du profil */}
      <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginTop: "1.5rem" }}>
        <h3 style={{ color: "#1a3a2a", marginBottom: "0.5rem" }}>🏷️ Type de compte</h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          Ce choix détermine les raccourcis affichés dans votre bandeau d'accueil.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {PROFILS.map(p => (
            <div key={p.id}
              onClick={() => setProfilSelectionne(p.id as ProfilType)}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "1.25rem", borderRadius: "12px", cursor: "pointer",
                border: `2px solid ${profilSelectionne === p.id ? "#1a3a2a" : "#e5e1da"}`,
                background: profilSelectionne === p.id ? "#f0f4f0" : "white",
                transition: "all 0.2s",
              }}>
              <span style={{ fontSize: "2rem", flexShrink: 0 }}>{p.icone}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1a3a2a", marginBottom: "0.2rem" }}>{p.label}</div>
                <div style={{ fontSize: "0.8rem", color: "#666" }}>{p.desc}</div>
              </div>
              {profilSelectionne === p.id && (
                <span style={{ color: "#2d6a4f", fontWeight: 700, fontSize: "1.25rem" }}>✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Bouton sauvegarder */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button onClick={() => navigate("/client")}
            style={{ background: "white", color: "#1a3a2a", border: "1px solid #e5e1da", padding: "0.75rem 1.5rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
            Annuler
          </button>
          <button onClick={sauvegarder} disabled={saving}
            style={{ background: "#1a3a2a", color: "white", border: "none", padding: "0.75rem 2rem", borderRadius: "8px", cursor: saving ? "wait" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Sauvegarde…" : "💾 Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  )
}