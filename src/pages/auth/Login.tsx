import React, { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  async function handleLogin() {
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate("/metier")
    }
  }

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f0",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"white",padding:"2.5rem",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",width:"100%",maxWidth:"400px"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>🌍</div>
          <h1 style={{color:"#1a3a2a",fontSize:"1.5rem",fontWeight:"800"}}>AGE Climate</h1>
          <p style={{color:"#666",fontSize:"0.9rem"}}>Espace professionnel</p>
        </div>
        {error && <div style={{background:"#fee2e2",color:"#b91c1c",padding:"0.75rem",borderRadius:"8px",marginBottom:"1rem",fontSize:"0.9rem"}}>{error}</div>}
        <div style={{marginBottom:"1rem"}}>
          <label style={{display:"block",marginBottom:"0.5rem",color:"#1a3a2a",fontWeight:"600",fontSize:"0.9rem"}}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"1rem",outline:"none"}} />
        </div>
        <div style={{marginBottom:"1.5rem"}}>
          <label style={{display:"block",marginBottom:"0.5rem",color:"#1a3a2a",fontWeight:"600",fontSize:"0.9rem"}}>Mot de passe</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" style={{width:"100%",padding:"0.75rem",borderRadius:"8px",border:"1px solid #e5e1da",fontSize:"1rem",outline:"none"}} />
        </div>
        <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:"0.875rem",background:"#1a3a2a",color:"white",border:"none",borderRadius:"8px",fontSize:"1rem",fontWeight:"700",cursor:"pointer"}}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </div>
  )
}
