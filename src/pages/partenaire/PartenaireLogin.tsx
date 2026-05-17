import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function PartenaireLogin() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [erreur, setErreur]     = useState("")

  async function handleLogin() {
    if (!email || !password) { setErreur("Veuillez remplir tous les champs."); return }
    setLoading(true); setErreur("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErreur("Email ou mot de passe incorrect."); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErreur("Erreur d'authentification."); setLoading(false); return }
    const { data: partenaire } = await supabase.from("prestataires_pro").select("id, actif").eq("user_id", user.id).single()
    if (!partenaire || !partenaire.actif) {
      await supabase.auth.signOut()
      setErreur("Votre compte partenaire n'est pas encore activé.")
      setLoading(false); return
    }
    navigate("/partenaire/dashboard")
  }

  const iStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
      <div style={{ width: "100%", maxWidth: "400px", padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <i className="ti ti-leaf" style={{ fontSize: "26px", color: "#0F6E56" }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Espace Partenaire</div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>AGE Climate Platform</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "28px" }}>
          {erreur && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />{erreur}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Email professionnel</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@partenaire.fr" style={iStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={iStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: "10px", background: "#0F6E56", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1, marginTop: "4px" }}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "#94A3B8" }}>Accès réservé aux partenaires référencés AGE Climate</div>
        </div>
      </div>
    </div>
  )
}