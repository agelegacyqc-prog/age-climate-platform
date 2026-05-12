import React from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "../styles/Layout.css"

export default function Layout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🌍</span>
          <span className="logo-text">AGE Climate</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">PLATEFORME</div>
          <NavLink to="/" end className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">🏠</span>
            <span>Accueil</span>
          </NavLink>
          <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/sensibilisation" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">🌱</span>
            <span>Sensibilisation</span>
          </NavLink>
          <NavLink to="/projets" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">📋</span>
            <span>Projets</span>
          </NavLink>
          <NavLink to="/marketplace" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">🛒</span>
            <span>Marketplace</span>
          </NavLink>
          <div className="nav-section">ESPACE METIER</div>
          <NavLink to="/metier" end className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">🏢</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/metier/portefeuille" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">📍</span>
            <span>Portefeuille</span>
          </NavLink>
          <NavLink to="/metier/campagnes" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">📢</span>
            <span>Campagnes</span>
          </NavLink>
          <NavLink to="/metier/financement" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">💰</span>
            <span>Financement</span>
          </NavLink>
          <NavLink to="/metier/reporting" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">📊</span>
            <span>Reporting</span>
          </NavLink>
          <NavLink to="/metier/admin" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-icon">⚙️</span>
            <span>Administration</span>
          </NavLink>
        </nav>
        <button onClick={handleLogout} style={{margin:"1rem",padding:"0.75rem",background:"rgba(255,255,255,0.1)",color:"white",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"0.9rem"}}>Déconnexion</button>
      </aside>
      <main className="main-content">
        <header className="header">
          <h1 className="header-title">AGE Climate Platform</h1>
          <div className="header-badge">🌿 Ensemble pour le climat</div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
