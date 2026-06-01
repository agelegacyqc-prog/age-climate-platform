import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Utilisateur {
  id: string
  prenom: string | null
  nom: string | null
  role_client: "admin_client" | "utilisateur_client"
  actif: boolean
  created_at: string
  email?: string
}

interface Organisation {
  id: string
  raison_sociale: string
  type_client: string
}

// ─── Badge rôle ───────────────────────────────────────────────────────────────
function BadgeRole({ role }: { role: string }) {
  const isAdmin = role === "admin_client"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
      background: isAdmin ? "#ECFDF5" : "#F1F5F9",
      color: isAdmin ? "#065F46" : "#475569",
      border: `1px solid ${isAdmin ? "#A7F3D0" : "#E2E8F0"}`,
    }}>
      <i className={`ti ${isAdmin ? "ti-shield-check" : "ti-user"}`} style={{ fontSize: "11px" }} aria-hidden="true" />
      {isAdmin ? "Admin" : "Utilisateur"}
    </span>
  )
}

// ─── Badge statut ─────────────────────────────────────────────────────────────
function BadgeStatut({ actif }: { actif: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
      background: actif ? "#ECFDF5" : "#FEF2F2",
      color: actif ? "#065F46" : "#991B1B",
      border: `1px solid ${actif ? "#A7F3D0" : "#FECACA"}`,
    }}>
      <i className={`ti ${actif ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "11px" }} aria-hidden="true" />
      {actif ? "Actif" : "Désactivé"}
    </span>
  )
}

// ─── Modal invitation ─────────────────────────────────────────────────────────
interface ModalInvitationProps {
  organisationId: string
  onClose: () => void
  onSuccess: () => void
}

function ModalInvitation({ organisationId, onClose, onSuccess }: ModalInvitationProps) {
  const [email, setEmail]   = useState("")
  const [prenom, setPrenom] = useState("")
  const [nom, setNom]       = useState("")
  const [role, setRole]     = useState<"admin_client" | "utilisateur_client">("utilisateur_client")
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur]   = useState("")

  async function handleInviter() {
    if (!email.trim()) { setErreur("L'email est obligatoire."); return }
    setLoading(true)
    setErreur("")

    try {
      // Invitation Supabase — crée le compte auth et envoie l'email
      const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          organisation_id: organisationId,
          role_client: role,
          prenom,
          nom,
        },
      })

      if (inviteError) throw inviteError

      // Créer le profil_client en attente
      const { error: profilError } = await supabase
        .from("profils_client")
        .insert({
          id: data.user.id,
          organisation_id: organisationId,
          role_client: role,
          prenom: prenom || null,
          nom: nom || null,
          actif: true,
          onboarding_complete: false,
        })

      if (profilError) throw profilError

      onSuccess()
    } catch (e: any) {
      setErreur(e.message || "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(2px)",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "#FFFFFF", borderRadius: "12px", padding: "28px",
        width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}>
              Inviter un collaborateur
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
              Un email d'invitation lui sera envoyé automatiquement
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#94A3B8", fontSize: "18px", padding: "4px",
          }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* Formulaire */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "#475569", display: "block", marginBottom: "5px" }}>
                Prénom
              </label>
              <input
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                placeholder="Jean"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: "7px",
                  border: "1px solid #E2E8F0", fontSize: "13px", color: "#0F172A",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#0F6E56"}
                onBlur={e => e.target.style.borderColor = "#E2E8F0"}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "#475569", display: "block", marginBottom: "5px" }}>
                Nom
              </label>
              <input
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Dupont"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: "7px",
                  border: "1px solid #E2E8F0", fontSize: "13px", color: "#0F172A",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#0F6E56"}
                onBlur={e => e.target.style.borderColor = "#E2E8F0"}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "#475569", display: "block", marginBottom: "5px" }}>
              Email <span style={{ color: "#B91C1C" }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jean.dupont@entreprise.fr"
              style={{
                width: "100%", padding: "9px 12px", borderRadius: "7px",
                border: "1px solid #E2E8F0", fontSize: "13px", color: "#0F172A",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#0F6E56"}
              onBlur={e => e.target.style.borderColor = "#E2E8F0"}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "#475569", display: "block", marginBottom: "5px" }}>
              Rôle
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["utilisateur_client", "admin_client"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    padding: "10px 12px", borderRadius: "7px", cursor: "pointer",
                    border: `2px solid ${role === r ? "#0F6E56" : "#E2E8F0"}`,
                    background: role === r ? "#ECFDF5" : "#F8FAFC",
                    color: role === r ? "#065F46" : "#475569",
                    fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: "6px",
                    transition: "all 0.15s",
                  }}
                >
                  <i className={`ti ${r === "admin_client" ? "ti-shield-check" : "ti-user"}`} style={{ fontSize: "14px" }} aria-hidden="true" />
                  {r === "admin_client" ? "Admin" : "Utilisateur"}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
              {role === "admin_client"
                ? "Peut gérer les utilisateurs et accéder à tous les modules."
                : "Accès aux modules sans gestion des comptes."}
            </div>
          </div>

          {erreur && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 12px", background: "#FEF2F2",
              borderRadius: "7px", border: "1px solid #FECACA",
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "14px", color: "#B91C1C", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: "12px", color: "#991B1B" }}>{erreur}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px", borderRadius: "7px",
              border: "1px solid #E2E8F0", background: "white",
              color: "#475569", fontSize: "13px", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleInviter}
            disabled={loading}
            style={{
              flex: 2, padding: "10px", borderRadius: "7px",
              border: "none", background: loading ? "#94A3B8" : "#0F6E56",
              color: "white", fontSize: "13px", fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            {loading
              ? <><i className="ti ti-loader-2 ti-spin" aria-hidden="true" /> Envoi en cours…</>
              : <><i className="ti ti-send" aria-hidden="true" /> Envoyer l'invitation</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function GestionUtilisateurs() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser]       = useState<any>(null)
  const [monProfil, setMonProfil]           = useState<any>(null)
  const [organisation, setOrganisation]     = useState<Organisation | null>(null)
  const [utilisateurs, setUtilisateurs]     = useState<Utilisateur[]>([])
  const [loading, setLoading]               = useState(true)
  const [showModal, setShowModal]           = useState(false)
  const [actionLoading, setActionLoading]   = useState<string | null>(null)
  const [toast, setToast]                   = useState<{ msg: string; type: "success" | "error" } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    // Profil courant
    const { data: profil, error } = await supabase
      .from("profils_client")
      .select("*, organisation:organisations(*)")
      .eq("id", user?.id)
      .maybeSingle()
console.log("PROFIL GESTION →", profil)
console.log("ERREUR →", error)
    if (!profil || profil.role_client !== "admin_client") {
      navigate("/client")
      return
    }

    setMonProfil(profil)
    setOrganisation(profil.organisation)

    await chargerUtilisateurs(profil.organisation_id, user?.id)
    setLoading(false)
  }

  async function chargerUtilisateurs(orgId: string, currentUserId: string) {
    // Récupérer les profils de l'organisation
    const { data: profils } = await supabase
      .from("profils_client")
      .select("id, prenom, nom, role_client, actif, created_at")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: true })

    if (!profils) return

    // Récupérer les emails depuis auth.users via la vue si disponible
    // Fallback : afficher sans email
    setUtilisateurs(profils as Utilisateur[])
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleToggleActif(userId: string, actifActuel: boolean) {
    if (userId === currentUser?.id) {
      showToast("Vous ne pouvez pas désactiver votre propre compte.", "error")
      return
    }
    setActionLoading(userId)
    const { error } = await supabase
      .from("profils_client")
      .update({ actif: !actifActuel })
      .eq("id", userId)

    if (error) {
      showToast("Erreur lors de la mise à jour.", "error")
    } else {
      showToast(
        actifActuel ? "Utilisateur désactivé." : "Utilisateur réactivé.",
        "success"
      )
      setUtilisateurs(prev =>
        prev.map(u => u.id === userId ? { ...u, actif: !actifActuel } : u)
      )
    }
    setActionLoading(null)
  }

  async function handleChangeRole(userId: string, roleActuel: string) {
    if (userId === currentUser?.id) {
      showToast("Vous ne pouvez pas modifier votre propre rôle.", "error")
      return
    }
    const newRole = roleActuel === "admin_client" ? "utilisateur_client" : "admin_client"
    setActionLoading(userId + "_role")

    const { error } = await supabase
      .from("profils_client")
      .update({ role_client: newRole })
      .eq("id", userId)

    if (error) {
      showToast("Erreur lors de la mise à jour du rôle.", "error")
    } else {
      showToast("Rôle mis à jour.", "success")
      setUtilisateurs(prev =>
        prev.map(u => u.id === userId ? { ...u, role_client: newRole as any } : u)
      )
    }
    setActionLoading(null)
  }

  if (loading) return (
    <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>
      Chargement…
    </div>
  )

  const actifs    = utilisateurs.filter(u => u.actif)
  const inactifs  = utilisateurs.filter(u => !u.actif)
  const admins    = utilisateurs.filter(u => u.role_client === "admin_client")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 2000,
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px 16px", borderRadius: "8px",
          background: toast.type === "success" ? "#ECFDF5" : "#FEF2F2",
          border: `1px solid ${toast.type === "success" ? "#A7F3D0" : "#FECACA"}`,
          color: toast.type === "success" ? "#065F46" : "#991B1B",
          fontSize: "13px", fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-alert-triangle"}`} aria-hidden="true" />
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{
        background: "#FFFFFF", border: "1px solid #E2E8F0",
        borderRadius: "12px", padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>
            Gestion des utilisateurs
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8" }}>
            {organisation?.raison_sociale} — {actifs.length} utilisateur{actifs.length > 1 ? "s" : ""} actif{actifs.length > 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "9px 18px", borderRadius: "8px", cursor: "pointer",
            fontWeight: 500, fontSize: "13px", fontFamily: "inherit",
          }}
        >
          <i className="ti ti-user-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Inviter un collaborateur
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Utilisateurs actifs",   val: actifs.length,   icon: "ti-users",        color: "#065F46", bg: "#ECFDF5" },
          { label: "Administrateurs",        val: admins.length,   icon: "ti-shield-check", color: "#0369A1", bg: "#EFF6FF" },
          { label: "Comptes désactivés",     val: inactifs.length, icon: "ti-user-off",     color: "#991B1B", bg: "#FEF2F2" },
        ].map((k, i) => (
          <div key={i} style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "10px", padding: "18px 20px",
            borderTop: `2px solid ${k.color}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {k.label}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>
              {k.val}
            </div>
          </div>
        ))}
      </div>

      {/* Table utilisateurs */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>
            Membres de l'organisation
          </div>
        </div>

        {utilisateurs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Utilisateur", "Rôle", "Statut", "Membre depuis", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 20px", textAlign: "left",
                    fontSize: "11px", fontWeight: 600, color: "#94A3B8",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    borderBottom: "1px solid #E2E8F0",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u, i) => {
                const isCurrentUser = u.id === currentUser?.id
                const displayName = [u.prenom, u.nom].filter(Boolean).join(" ") || "—"
                const dateStr = new Date(u.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "short", year: "numeric"
                })
                return (
                  <tr key={u.id} style={{
                    borderBottom: i < utilisateurs.length - 1 ? "1px solid #F1F5F9" : "none",
                    background: isCurrentUser ? "#F8FAFC" : "white",
                    opacity: u.actif ? 1 : 0.6,
                  }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "#ECFDF5", color: "#0F6E56",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700, flexShrink: 0,
                        }}>
                          {displayName !== "—"
                            ? `${u.prenom?.[0] || ""}${u.nom?.[0] || ""}`.toUpperCase()
                            : <i className="ti ti-user" style={{ fontSize: "14px" }} aria-hidden="true" />
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
                            {displayName}
                            {isCurrentUser && (
                              <span style={{ marginLeft: "6px", fontSize: "10px", color: "#94A3B8", fontWeight: 400 }}>
                                (vous)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <BadgeRole role={u.role_client} />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <BadgeStatut actif={u.actif} />
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: "12px", color: "#94A3B8", fontFamily: "'DM Mono', monospace" }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {!isCurrentUser && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          {/* Changer le rôle */}
                          <button
                            onClick={() => handleChangeRole(u.id, u.role_client)}
                            disabled={actionLoading === u.id + "_role"}
                            title={u.role_client === "admin_client" ? "Rétrograder en Utilisateur" : "Promouvoir en Admin"}
                            style={{
                              padding: "6px 10px", borderRadius: "6px",
                              border: "1px solid #E2E8F0", background: "white",
                              cursor: "pointer", fontSize: "12px", color: "#475569",
                              display: "flex", alignItems: "center", gap: "4px",
                              fontFamily: "inherit",
                            }}
                          >
                            <i className={`ti ${u.role_client === "admin_client" ? "ti-user-down" : "ti-user-up"}`} style={{ fontSize: "13px" }} aria-hidden="true" />
                            {u.role_client === "admin_client" ? "Rétrograder" : "Promouvoir"}
                          </button>

                          {/* Activer / Désactiver */}
                          <button
                            onClick={() => handleToggleActif(u.id, u.actif)}
                            disabled={actionLoading === u.id}
                            title={u.actif ? "Désactiver" : "Réactiver"}
                            style={{
                              padding: "6px 10px", borderRadius: "6px",
                              border: `1px solid ${u.actif ? "#FECACA" : "#A7F3D0"}`,
                              background: u.actif ? "#FEF2F2" : "#ECFDF5",
                              cursor: "pointer", fontSize: "12px",
                              color: u.actif ? "#991B1B" : "#065F46",
                              display: "flex", alignItems: "center", gap: "4px",
                              fontFamily: "inherit",
                            }}
                          >
                            <i className={`ti ${u.actif ? "ti-user-off" : "ti-user-check"}`} style={{ fontSize: "13px" }} aria-hidden="true" />
                            {u.actif ? "Désactiver" : "Réactiver"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal invitation */}
      {showModal && monProfil?.organisation_id && (
        <ModalInvitation
          organisationId={monProfil.organisation_id}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            showToast("Invitation envoyée avec succès.", "success")
            chargerUtilisateurs(monProfil.organisation_id, currentUser?.id)
          }}
        />
      )}
    </div>
  )
}