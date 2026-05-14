import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import CartePortefeuille from "../components/CartePortefeuille"

type Profil = "banque" | "assurance" | "particulier" | "collectivite" | null

interface ProfilConfig {
  titre: string
  sousTitre: string
  boutons: { label: string; route: string; icone: string }[]
  afficherCarte: boolean
}

const PROFIL_CONFIG: Record<string, ProfilConfig> = {
  banque: {
    titre: "Bienvenue sur AGE Climate Platform",
    sousTitre: "Gérez le risque climatique de vos financements immobiliers",
    boutons: [
      { label: "Mes campagnes", route: "/metier/campagnes", icone: "📋" },
      { label: "Portefeuille", route: "/metier/portefeuille", icone: "🏢" },
    ],
    afficherCarte: true,
  },
  assurance: {
    titre: "Bienvenue sur AGE Climate Platform",
    sousTitre: "Analysez l'exposition climatique de vos assurés",
    boutons: [
      { label: "Mes campagnes", route: "/metier/campagnes", icone: "📋" },
      { label: "Portefeuille", route: "/metier/portefeuille", icone: "🏢" },
    ],
    afficherCarte: true,
  },
  particulier: {
    titre: "Bienvenue sur AGE Climate Platform",
    sousTitre: "Évaluez le risque climatique de votre bien immobilier",
    boutons: [
      { label: "Mon bien", route: "/client/actifs", icone: "🏠" },
      { label: "Aides & Subventions", route: "/client/aides", icone: "💶" },
    ],
    afficherCarte: false,
  },
  collectivite: {
    titre: "Bienvenue sur AGE Climate Platform",
    sousTitre: "Pilotez la résilience climatique de votre territoire",
    boutons: [
      { label: "Mon territoire", route: "/metier/portefeuille", icone: "🗺️" },
      { label: "Reporting", route: "/metier/reporting", icone: "📊" },
    ],
    afficherCarte: true,
  },
  defaut: {
    titre: "AGE Climate Platform",
    sousTitre: "Comprendre, agir et collaborer pour un avenir climatique durable",
    boutons: [
      { label: "Voir le Dashboard", route: "/dashboard", icone: "📊" },
    ],
    afficherCarte: false,
  },
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

  const labelProfil: Record<string, string> = {
    banque: "Banque",
    assurance: "Assurance",
    particulier: "Particulier",
    collectivite: "Collectivité",
  }

  return (
    <div>
      {/* Bandeau hero */}
      <div style={{
        background: "linear-gradient(135deg,#1a3a2a,#2d6a4f)",
        borderRadius: "16px", padding: "3rem", color: "white",
        marginBottom: "2rem", textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌍</div>

        {profil && (
          <div style={{ marginBottom: "1rem" }}>
            <span style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "4px 14px", borderRadius: "999px",
              fontSize: "0.8rem", fontWeight: 700,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              {labelProfil[profil]}
            </span>
          </div>
        )}

        <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "0.75rem" }}>
          {prenom ? `Bonjour ${prenom} 👋` : config.titre}
        </h1>

        <p style={{
          fontSize: "1.1rem", opacity: 0.85,
          maxWidth: "520px", margin: "0 auto 2rem", lineHeight: 1.6,
        }}>
          {config.sousTitre}
        </p>

        {loading ? (
          <div style={{ opacity: 0.6, fontSize: "0.9rem" }}>Chargement…</div>
        ) : (
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {config.boutons.map((b, i) => (
              <button
                key={i}
                onClick={() => navigate(b.route)}
                style={{
                  background: i === 0 ? "#7ec87e" : "rgba(255,255,255,0.15)",
                  color: i === 0 ? "#1a3a2a" : "white",
                  border: i === 0 ? "none" : "1px solid rgba(255,255,255,0.4)",
                  padding: "0.75rem 2rem", borderRadius: "999px",
                  fontSize: "1rem", fontWeight: "700", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                {b.icone} {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
        {[
          { val: "+1.4°C", label: "Réchauffement actuel", color: "#e63946" },
          { val: "421 ppm", label: "CO2 atmosphérique", color: "#e63946" },
          { val: "5", label: "Projets actifs", color: "#2d6a4f" },
        ].map((k, i) => (
          <div key={i} style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "800", color: k.color }}>{k.val}</div>
            <div style={{ color: "#666", marginTop: "0.5rem" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Carte portefeuille — uniquement pour banque, assurance, collectivité */}
      {!loading && config.afficherCarte && (
        <div style={{ marginBottom: "2rem" }}>
          <CartePortefeuille />
        </div>
      )}

      {/* Raccourcis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
        {[
          { route: "/dashboard", icone: "📊", titre: "Dashboard", desc: "Visualisez les données climatiques en temps réel", couleur: "#e63946" },
          { route: "/sensibilisation", icone: "🌱", titre: "Sensibilisation", desc: "Découvrez les enjeux et les gestes qui comptent", couleur: "#2d6a4f" },
          { route: "/projets", icone: "📋", titre: "Projets", desc: "Suivez et participez aux initiatives locales", couleur: "#1565c0" },
        ].map((c, i) => (
          <div key={i} onClick={() => navigate(c.route)} style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: "pointer", borderLeft: `4px solid ${c.couleur}` }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{c.icone}</div>
            <h3 style={{ color: "#1a3a2a", marginBottom: "0.5rem" }}>{c.titre}</h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}