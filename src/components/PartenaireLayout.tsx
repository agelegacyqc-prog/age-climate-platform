import React, { useEffect, useState } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function PartenaireLayout() {
  const navigate = useNavigate()
  const [partenaire, setPartenaire] = useState<any>(null)
  const [nbMessages, setNbMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate("/partenaire/login"); return }

    const { data } = await supabase
      .from("prestataires_pro")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!data || !data.actif) { navigate("/partenaire/login"); return }
    setPartenaire(data)

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("lu", false)
      .neq("expediteur_id", user.id)
    setNbMessages(count || 0)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/partenaire/login")
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  const navItems = [
    { to: "/partenaire/dashboard",  icon: "ti-layout-dashboard", label: "Dashboard",    badge: null },
    { to: "/partenaire/missions",   icon: "ti-briefcase",        label: "Mes missions", badge: null },
    { to: "/partenaire/messages",   icon: "ti-message-circle",   label: "Messages",     badge: nbMessages > 0 ? nbMessages : null },
    { to: "/partenaire/documents",  icon: "ti-file",             label: "Documents",    badge: null },
  ]

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F8FAFC", fontFamily: "inherit" }}>

      {/* Sidebar */}
      <aside style={{ width: "220px", background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: "16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-leaf" style={{ fontSize: "18px", color: "#0F6E56" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>AGE Climate</div>
            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Espace Partenaire</div>
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
                background: isActive ? "#ECFDF5" : "transparent",
                color: isActive ? "#065F46" : "#64748B",
                fontWeight: isActive ? 500 : 400,
              })}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: "16px" }} aria-hidden="true" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "10px", fontWeight: 600, padding: "1px 5px", borderRadius: "10px" }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profil */}
        <div style={{ padding: "12px", borderTop: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: "#065F46", flexShrink: 0 }}>
            {partenaire?.prenom?.[0]?.toUpperCase() || "P"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {partenaire?.societe || partenaire?.nom || "Partenaire"}
            </div>
            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Partenaire</div>
          </div>
          <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "4px" }} title="Déconnexion" aria-label="Déconnexion">
            <i className="ti ti-logout" style={{ fontSize: "15px" }} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A" }}>{partenaire?.societe || "Mon espace partenaire"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "#ECFDF5", color: "#065F46", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
              {partenaire?.type_structure || "Partenaire"}
            </span>
          </div>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}