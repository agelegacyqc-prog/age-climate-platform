import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import loginBackground from "../../assets/login-background.jpg"

// Page publique /prescripteur/definir-mot-de-passe
// Sert à deux cas : première activation (lien d'invitation) et mot de passe oublié (lien de récupération).
// Dans les deux cas Supabase ouvre une session à partir du lien ; la page permet alors de définir le mot de passe.

const MIN_LONGUEUR = 8

type Etat = "verification" | "pret" | "lien_invalide" | "termine"

function lienEnErreur(): boolean {
  // Supabase place les erreurs de lien dans le hash (#error=...&error_code=otp_expired) ou la query string
  const brut = window.location.hash.replace(/^#/, "") + "&" + window.location.search.replace(/^\?/, "")
  const params = new URLSearchParams(brut)
  return params.has("error") || params.has("error_code")
}

export default function PrescripteurMotDePasse() {
  const navigate = useNavigate()
  const [etat, setEtat]           = useState<Etat>("verification")
  const [motDePasse, setMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading]     = useState(false)
  const [erreur, setErreur]       = useState("")

  useEffect(() => {
    let actif = true

    if (lienEnErreur()) { setEtat("lien_invalide"); return }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!actif) return
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        setEtat("pret")
      }
    })

    // Filet de sécurité : session déjà établie, ou lien sans session exploitable
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!actif) return
      if (session) { setEtat("pret"); return }
      window.setTimeout(() => { if (actif) setEtat(e => (e === "verification" ? "lien_invalide" : e)) }, 2500)
    })

    return () => { actif = false; listener.subscription.unsubscribe() }
  }, [])

  async function handleValider() {
    setErreur("")
    if (motDePasse.length < MIN_LONGUEUR) { setErreur(`Choisissez un mot de passe d'au moins ${MIN_LONGUEUR} caractères.`); return }
    if (motDePasse !== confirmation) { setErreur("Les deux mots de passe ne sont pas identiques."); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    if (error) {
      setErreur("Le mot de passe n'a pas pu être enregistré. Demandez un nouveau lien depuis la page de connexion.")
      setLoading(false); return
    }
    setLoading(false)
    setEtat("termine")
  }

  const iStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }
  const lStyle: React.CSSProperties = { display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }
  const btnStyle: React.CSSProperties = { width: "100%", padding: "10px", background: "#A9713F", color: "white", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1, marginTop: "4px" }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: `linear-gradient(180deg, rgba(15,30,20,0.55) 0%, rgba(15,30,20,0.35) 100%), url(${loginBackground})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "inherit"
    }}>
      <style>{`.presc-input:focus-visible, .presc-btn:focus-visible { outline: 2px solid #A9713F; outline-offset: 2px; }`}</style>
      <div style={{ width: "100%", maxWidth: "400px", padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#F5ECE1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <i className="ti ti-handshake" style={{ fontSize: "26px", color: "#A9713F" }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "4px" }}>Portail Prescripteur</div>
          <div style={{ fontSize: "13px", color: "#E2E8F0" }}>AGE-QC</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "28px" }}>
          {etat === "verification" && (
            <div role="status" style={{ textAlign: "center", fontSize: "13px", color: "#64748B" }}>Vérification du lien…</div>
          )}

          {etat === "lien_invalide" && (
            <div>
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B", display: "flex", alignItems: "flex-start", gap: "8px" }} role="alert">
                <i className="ti ti-alert-triangle" style={{ fontSize: "15px", marginTop: "1px" }} aria-hidden="true" />
                <span>Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau depuis la page de connexion, avec « Mot de passe oublié ».</span>
              </div>
              <button className="presc-btn" onClick={() => navigate("/prescripteur/login")} style={btnStyle}>Retour à la connexion</button>
            </div>
          )}

          {etat === "pret" && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Définir votre mot de passe</div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "18px" }}>{`Il doit contenir au moins ${MIN_LONGUEUR} caractères.`}</div>
              {erreur && (
                <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#991B1B", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "15px", marginTop: "1px" }} aria-hidden="true" /><span>{erreur}</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label htmlFor="nouveau-mdp" style={lStyle}>Nouveau mot de passe</label>
                  <input id="nouveau-mdp" className="presc-input" type="password" autoComplete="new-password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} style={iStyle} />
                </div>
                <div>
                  <label htmlFor="confirmation-mdp" style={lStyle}>Confirmer le mot de passe</label>
                  <input id="confirmation-mdp" className="presc-input" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} style={iStyle} onKeyDown={e => e.key === "Enter" && handleValider()} />
                </div>
                <button className="presc-btn" onClick={handleValider} disabled={loading} style={btnStyle}>
                  {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
                </button>
              </div>
            </div>
          )}

          {etat === "termine" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "22px", color: "#2F7D5C" }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Mot de passe enregistré</div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "18px" }}>Vous pouvez accéder à vos demandes.</div>
              <button className="presc-btn" onClick={() => navigate("/prescripteur/mes-demandes")} style={btnStyle}>Accéder à mes demandes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}