import React, { useEffect, useState } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

interface Prescripteur {
  id: string
  identifiant_prescripteur: string
  raison_sociale: string
  segment_prescripteur: string
  statut_compte: "actif" | "suspendu"
}

export default function PrescripteurLayout() {
  const navigate = useNavigate()
  const [prescripteur, setPrescripteur] = useState<Prescripteur | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/prescripteur/login"); return }

    const { data } = await supabase
      .from("prescripteurs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!data) { navigate("/prescripteur/login"); return }
    setPrescripteur(data)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/prescripteur/login")
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  const navItems = [
    { to: "/prescripteur/nouvelle-demande", icon: "ti-file-plus",  label: "Nouvelle demande" },
    { to: "/prescripteur/mes-demandes",     icon: "ti-list-check", label: "Mes demandes" },
  ]

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC", fontFamily: "inherit" }}>

      {/* Sidebar */}
      <aside style={{ width: "220px", background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: "16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#F5ECE1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-handshake" style={{ fontSize: "18px", color: "#A9713F" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>AGE-QC</div>
            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Portail Prescripteur</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 8px", marginBottom: "6px" }}>Mon espace</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px", borderRadius: "7px", marginBottom: "2px",
                textDecoration: "none", fontSize: "13px",
                background: isActive ? "#F5ECE1" : "transparent",
                color: isActive ? "#8B5E34" : "#64748B",
                fontWeight: isActive ? 500 : 400,
              })}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: "16px" }} aria-hidden="true" />
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Profil */}
        <div style={{ padding: "12px", borderTop: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F5ECE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: "#8B5E34", flexShrink: 0 }}>
            {prescripteur?.raison_sociale?.[0]?.toUpperCase() || "P"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prescripteur?.raison_sociale || "Prescripteur"}
            </div>
            <div style={{ fontSize: "10px", color: "#94A3B8" }}>{prescripteur?.identifiant_prescripteur}</div>
          </div>
          <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "4px" }} title="Déconnexion" aria-label="Déconnexion">
            <i className="ti ti-logout" style={{ fontSize: "15px" }} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A" }}>{prescripteur?.raison_sociale || "Mon espace prescripteur"}</div>
          <span style={{ background: "#F5ECE1", color: "#8B5E34", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
            Partenaire Global Expertises
          </span>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}