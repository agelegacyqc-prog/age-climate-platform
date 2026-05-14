import React, { useEffect, useState } from "react"
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "../styles/Layout.css"

const PAGE_TITLES: Record<string, string> = {
  "/":                    "Accueil",
  "/dashboard":           "Dashboard",
  "/sensibilisation":     "Sensibilisation",
  "/projets":             "Projets",
  "/marketplace":         "Marketplace",
  "/client":              "Mon compte",
  "/client/actifs":       "Mes actifs",
  "/client/profil":       "Mon profil",
  "/metier":              "Dashboard métier",
  "/metier/portefeuille": "Portefeuille",
  "/metier/campagnes":    "Campagnes",
  "/metier/missions":     "Missions",
  "/metier/financement":  "Financement",
  "/metier/reporting":    "Reporting",
  "/metier/admin":        "Administration",
}

interface NavItemProps {
  to: string
  icon: string
  label: string
  end?: boolean
}

function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => isActive ? "nav-item nav-item--active" : "nav-item"}
    >
      <i className={`ti ${icon} nav-item__icon`} aria-hidden="true" />
      <span className="nav-item__label">{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [initiales, setInitiales] = useState("--")
  const [prenom, setPrenom] = useState("")
  const [labelProfil, setLabelProfil] = useState("")

  useEffect(() => {
    async function chargerProfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("profils")
        .select("prenom, nom, profil")
        .eq("id", user.id)
        .single()
      if (data) {
        const p = data.prenom || ""
        const n = data.nom || ""
        setPrenom(p)
        setInitiales(`${p[0] || ""}${n[0] || ""}`.toUpperCase() || user.email![0].toUpperCase())
        const labels: Record<string, string> = {
          banque: "Banque", assurance: "Assurance",
          particulier: "Particulier", collectivite: "Collectivité",
        }
        setLabelProfil(labels[data.profil] || "")
      }
    }
    chargerProfil()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const pageTitle = PAGE_TITLES[location.pathname] || "AGE Climate"

  return (
    <div className="app-container">

      {/* ── Sidebar ── */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo__mark">
            <i className="ti ti-leaf" aria-hidden="true" />
          </div>
          <div className="sidebar-logo__text">
            <span className="sidebar-logo__name">AGE Climate</span>
            <span className="sidebar-logo__sub">Platform</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">

          <div className="nav-section">Plateforme</div>
          <NavItem to="/" icon="ti-home" label="Accueil" end />
          <NavItem to="/dashboard" icon="ti-chart-bar" label="Dashboard" />
          <NavItem to="/sensibilisation" icon="ti-plant-2" label="Sensibilisation" />
          <NavItem to="/projets" icon="ti-clipboard-list" label="Projets" />
          <NavItem to="/marketplace" icon="ti-building-store" label="Marketplace" />

          <div className="nav-section">Espace client</div>
          <NavItem to="/client" icon="ti-user" label="Mon compte" end />
          <NavItem to="/client/actifs" icon="ti-building" label="Mes actifs" />
          <NavItem to="/client/profil" icon="ti-settings" label="Mon profil" />

          <div className="nav-section">Espace métier</div>
          <NavItem to="/metier" icon="ti-layout-dashboard" label="Dashboard" end />
          <NavItem to="/metier/portefeuille" icon="ti-building-bank" label="Portefeuille" />
          <NavItem to="/metier/campagnes" icon="ti-speakerphone" label="Campagnes" />
          <NavItem to="/metier/missions" icon="ti-briefcase" label="Missions" />
          <NavItem to="/metier/financement" icon="ti-coin" label="Financement" />
          <NavItem to="/metier/reporting" icon="ti-file-analytics" label="Reporting" />
          <NavItem to="/metier/admin" icon="ti-adjustments-horizontal" label="Administration" />

        </nav>

        {/* Profil utilisateur */}
        <div className="sidebar-user">
          <div className="sidebar-user__avatar">{initiales}</div>
          <div className="sidebar-user__info">
            <span className="sidebar-user__name">{prenom || "Mon compte"}</span>
            {labelProfil && <span className="sidebar-user__profil">{labelProfil}</span>}
          </div>
          <button
            className="sidebar-user__logout"
            onClick={handleLogout}
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <i className="ti ti-logout" aria-hidden="true" />
          </button>
        </div>

      </aside>

      {/* ── Main ── */}
      <main className="main-content">

        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">{pageTitle}</h1>
          </div>
          <div className="header-right">
            <div className="header-badge">
              <i className="ti ti-leaf" aria-hidden="true" />
              Ensemble pour le climat
            </div>
          </div>
        </header>

        {/* Contenu */}
        <div className="page-content">
          <Outlet />
        </div>

      </main>
    </div>
  )
}