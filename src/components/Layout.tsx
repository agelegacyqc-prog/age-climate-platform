import React from "react"
import { Outlet, NavLink } from "react-router-dom"
import "../styles/Layout.css"

export default function Layout() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🌍</span>
          <span className="logo-text">AGE Climate</span>
        </div>
        <nav className="sidebar-nav">
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
        </nav>
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
