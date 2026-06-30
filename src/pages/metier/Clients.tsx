import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface Client {
  id: string
  email: string
  prenom: string | null
  nom: string | null
  type_client: string
  sous_profil: string | null
  actif: boolean
  onboarding_complete: boolean
  created_at: string
  responsable_commercial_id: string | null
  region: string | null
  nb_actifs: number
  nb_campagnes: number
  derniere_activite: string | null
}

const TYPE_LABELS: Record<string, string> = {
  banque: "Banque", banque_assurance: "Banque / Assurance",
  assurance: "Assurance", assureur: "Assurance",
  entreprise: "Entreprise", collectivite: "Collectivité",
  proprietaire: "Particulier", particulier: "Particulier",
}

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  banque:           { bg: "#EFF6FF", color: "#1E40AF" },
  banque_assurance: { bg: "#EFF6FF", color: "#1E40AF" },
  assurance:        { bg: "#F0F9FF", color: "#0369A1" },
  assureur:         { bg: "#F0F9FF", color: "#0369A1" },
  entreprise:       { bg: "#F9F0EA", color: "#B25C2A" },
  collectivite:     { bg: "#F0FDF4", color: "#2F7D5C" },
  proprietaire:     { bg: "#FFFBEB", color: "#D97706" },
  particulier:      { bg: "#FFFBEB", color: "#D97706" },
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px", fontSize: "11px", fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.06em",
  color: "#6B7280", textAlign: "left", whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "0 16px", fontSize: "14px", color: "#111827",
}

const actionBtnStyle: React.CSSProperties = {
  width: "30px", height: "30px", border: "1px solid #E2DDD8",
  background: "#F4F3F0", borderRadius: "6px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6B7280", transition: "all 0.1s",
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 500,
  color: "#374151", marginBottom: "6px",
}

export default function Clients() {
  const navigate = useNavigate()

  const [clients, setClients]           = useState<Client[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [filtreType, setFiltreType]     = useState("tous")
  const [filtreStatut, setFiltreStatut] = useState("tous")

  const [responsables, setResponsables] = useState<{ id: string; prenom: string; nom: string }[]>([])

  const [newClientOpen, setNewClientOpen]     = useState(false)
  const [newClientForm, setNewClientForm]     = useState({
    raison_sociale: "", type_client: "entreprise",
    prenom: "", nom: "", email: "", password: "",
  })
  const [newClientError, setNewClientError]   = useState("")
  const [newClientSuccess, setNewClientSuccess] = useState("")
  const [newClientLoading, setNewClientLoading] = useState(false)
  const [newClientCreds, setNewClientCreds]   = useState<{ email: string; password: string } | null>(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    try {
      const { data: profilsData } = await supabase
        .from("profils_client")
        .select("id, type_client, sous_profil, actif, onboarding_complete, created_at, responsable_commercial_id, region, prenom, nom")
        .order("created_at", { ascending: false })

      if (!profilsData) { setLoading(false); return }

      const ids = profilsData.map(p => p.id)
      let emailsMap: Record<string, string> = {}
      try {
        const { data: emailsData } = await supabase.rpc("get_users_emails", { user_ids: ids })
        ;(emailsData || []).forEach((e: any) => { emailsMap[e.id] = e.email })
      } catch { emailsMap = {} }

      const { data: actifsCount } = await supabase
        .from("actifs").select("user_id").in("user_id", ids).eq("categorie", "patrimoine_propre")
      const { data: campagnesCount } = await supabase
        .from("campagnes").select("client_id, statut").in("client_id", ids).eq("statut", "en_cours")

      const actifsMap: Record<string, number> = {}
      const campagnesMap: Record<string, number> = {}
      ;(actifsCount || []).forEach((a: any) => { actifsMap[a.user_id] = (actifsMap[a.user_id] || 0) + 1 })
      ;(campagnesCount || []).forEach((c: any) => { campagnesMap[c.client_id] = (campagnesMap[c.client_id] || 0) + 1 })

      const mapped: Client[] = profilsData.map(p => ({
        id: p.id, email: emailsMap[p.id] || "—",
        prenom: p.prenom, nom: p.nom, type_client: p.type_client,
        sous_profil: p.sous_profil, actif: p.actif !== false,
        onboarding_complete: p.onboarding_complete || false,
        created_at: p.created_at,
        responsable_commercial_id: p.responsable_commercial_id,
        region: p.region || null,
        nb_actifs: actifsMap[p.id] || 0,
        nb_campagnes: campagnesMap[p.id] || 0,
        derniere_activite: null,
      }))

      setClients(mapped)

      const { data: resps } = await supabase
        .from("profils").select("id, prenom, nom, role, region")
        .in("role", ["admin", "admin_national", "responsable_regional"])
      setResponsables(resps || [])
    } finally {
      setLoading(false)
    }
  }

  async function toggleActif(client: Client) {
    const nouvelle_valeur = !client.actif
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, actif: nouvelle_valeur } : c))
    await supabase.from("profils_client").update({ actif: nouvelle_valeur }).eq("id", client.id)
  }

  async function handleCreerClient() {
    setNewClientError("")
    setNewClientSuccess("")
    const { raison_sociale, type_client, prenom, nom, email, password } = newClientForm
    if (!raison_sociale || !type_client || !email || !password) {
      setNewClientError("Raison sociale, type, email et mot de passe sont obligatoires.")
      return
    }
    if (password.length < 8) {
      setNewClientError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    setNewClientLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Session expirée")
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ raison_sociale, type_client, prenom, nom, email, password }),
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erreur lors de la création")
      setNewClientSuccess(`Client ${raison_sociale} créé avec succès.`)
      setNewClientCreds({ email, password })
      charger()
    } catch (err: any) {
      setNewClientError(err.message || "Une erreur est survenue.")
    } finally {
      setNewClientLoading(false)
    }
  }

  const clientsFiltres = clients.filter(c => {
    const matchSearch = search === "" ||
      `${c.prenom || ""} ${c.nom || ""}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchType = filtreType === "tous" || c.type_client === filtreType
    const matchStatut = filtreStatut === "tous" ||
      (filtreStatut === "actif" && c.actif) ||
      (filtreStatut === "inactif" && !c.actif)
    return matchSearch && matchType && matchStatut
  })

  function typeLabel(type: string) { return TYPE_LABELS[type] || type }
  function typeBadge(type: string) { return TYPE_BADGE[type] || { bg: "#F4F3F0", color: "#6B7280" } }
  function responsableNom(id: string | null) {
    if (!id) return null
    const r = responsables.find(r => r.id === id)
    return r ? `${r.prenom} ${r.nom}` : null
  }

  return (
    <div className="page-wrapper">

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Clients</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Gestion des comptes clients AGE Climate Platform</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 600, color: "#111827" }}>
            {clients.length} <span style={{ fontSize: "13px", fontWeight: 400, color: "#6B7280" }}>clients</span>
          </span>
          <button className="btn-primary" onClick={() => {
            setNewClientOpen(true)
            setNewClientError("")
            setNewClientSuccess("")
            setNewClientCreds(null)
            setNewClientForm({ raison_sociale: "", type_client: "entreprise", prenom: "", nom: "", email: "", password: "" })
          }}>
            <i className="ti ti-user-plus" style={{ fontSize: "14px" }} />
            Nouveau client
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "15px" }} />
          <input className="input" style={{ paddingLeft: "32px" }} placeholder="Rechercher un client…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: "160px" }} value={filtreType} onChange={e => setFiltreType(e.target.value)}>
          <option value="tous">Tous types</option>
          <option value="banque">Banque</option>
          <option value="assurance">Assurance</option>
          <option value="assureur">Assurance</option>
          <option value="entreprise">Entreprise</option>
          <option value="collectivite">Collectivité</option>
          <option value="proprietaire">Particulier</option>
        </select>
        <select className="input" style={{ width: "140px" }} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
          <option value="tous">Tous statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-loader" style={{ fontSize: "20px", display: "block", marginBottom: "8px" }} />
            Chargement…
          </div>
        ) : clientsFiltres.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-users-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
            Aucun client trouvé
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Actifs</th>
                <th style={thStyle}>Campagnes actives</th>
                <th style={thStyle}>Responsable</th>
                <th style={thStyle}>Statut</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clientsFiltres.map(c => {
                const badge = typeBadge(c.type_client)
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #E2DDD8", height: "56px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: badge.bg, border: `1px solid ${badge.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: badge.color, flexShrink: 0 }}>
                          {(c.prenom?.[0] || c.email[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>
                            {c.prenom && c.nom ? `${c.prenom} ${c.nom}` : c.email}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: badge.bg, color: badge.color, fontSize: "11px", padding: "3px 8px", borderRadius: "4px", fontWeight: 500 }}>
                        {typeLabel(c.type_client)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: c.nb_actifs > 0 ? "#111827" : "#9CA3AF" }}>
                      {c.nb_actifs}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: c.nb_campagnes > 0 ? "#B25C2A" : "#9CA3AF" }}>
                      {c.nb_campagnes}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "#6B7280" }}>
                      {responsableNom(c.responsable_commercial_id) || (
                        <span style={{ color: "#D97706", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}>
                          <i className="ti ti-alert-triangle" style={{ fontSize: "11px" }} />
                          Non assigné
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span className={c.actif ? "badge badge--success" : "badge badge--neutral"}>
                        <i className={`ti ${c.actif ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "11px" }} />
                        {c.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => navigate(`/metier/clients/${c.id}`)} style={actionBtnStyle} title="Voir la fiche">
                          <i className="ti ti-eye" style={{ fontSize: "14px" }} />
                        </button>
                        <button onClick={() => toggleActif(c)}
                          style={{ ...actionBtnStyle, color: c.actif ? "#B91C1C" : "#2F7D5C", background: c.actif ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${c.actif ? "#FECACA" : "#BBF7D0"}` }}
                          title={c.actif ? "Désactiver" : "Activer"}
                        >
                          <i className={`ti ${c.actif ? "ti-toggle-right" : "ti-toggle-left"}`} style={{ fontSize: "16px" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && clientsFiltres.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
              {clientsFiltres.length} client{clientsFiltres.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Drawer nouveau client ── */}
      {newClientOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => !newClientCreds && setNewClientOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "420px", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Nouveau client</h2>
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>Créer un accès client à la plateforme</p>
              </div>
              {!newClientCreds && (
                <button onClick={() => setNewClientOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                  <i className="ti ti-x" style={{ fontSize: "14px" }} />
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {newClientCreds ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ padding: "16px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#2F7D5C", flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#2F7D5C", marginBottom: "4px" }}>Client créé avec succès</div>
                      <div style={{ fontSize: "12px", color: "#374151" }}>{newClientSuccess}</div>
                    </div>
                  </div>
                  <div style={{ padding: "16px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#92400E", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: "14px" }} />
                      Identifiants provisoires — à transmettre au client
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[
                        { label: "Email", value: newClientCreds.email },
                        { label: "Mot de passe", value: newClientCreds.password },
                      ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FFFFFF", borderRadius: "6px", border: "1px solid #FDE68A" }}>
                          <span style={{ fontSize: "12px", color: "#6B7280" }}>{item.label}</span>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: "11px", color: "#92400E", marginTop: "10px" }}>
                      Le client devra changer son mot de passe lors de sa première connexion.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {newClientError && (
                    <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", display: "flex", gap: "8px", alignItems: "center" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: "14px", flexShrink: 0 }} />{newClientError}
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Raison sociale <span style={{ color: "#B91C1C" }}>*</span></label>
                    <input className="input" value={newClientForm.raison_sociale} onChange={e => setNewClientForm({ ...newClientForm, raison_sociale: e.target.value })} placeholder="Ex : Allianz France" />
                  </div>
                  <div>
                    <label style={labelStyle}>Type de client <span style={{ color: "#B91C1C" }}>*</span></label>
                    <select className="input" value={newClientForm.type_client} onChange={e => setNewClientForm({ ...newClientForm, type_client: e.target.value })}>
                      <option value="banque">Banque</option>
                      <option value="assureur">Assurance</option>
                      <option value="entreprise">Entreprise</option>
                      <option value="collectivite">Collectivité</option>
                      <option value="proprietaire">Particulier</option>
                    </select>
                  </div>
                  <div style={{ paddingTop: "8px", borderTop: "1px solid #E2DDD8" }}>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "12px" }}>Contact principal</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Prénom</label>
                        <input className="input" value={newClientForm.prenom} onChange={e => setNewClientForm({ ...newClientForm, prenom: e.target.value })} placeholder="Prénom" />
                      </div>
                      <div>
                        <label style={labelStyle}>Nom</label>
                        <input className="input" value={newClientForm.nom} onChange={e => setNewClientForm({ ...newClientForm, nom: e.target.value })} placeholder="Nom" />
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={labelStyle}>Email <span style={{ color: "#B91C1C" }}>*</span></label>
                      <input className="input" type="email" value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} placeholder="contact@societe.fr" />
                    </div>
                    <div>
                      <label style={labelStyle}>Mot de passe provisoire <span style={{ color: "#B91C1C" }}>*</span></label>
                      <input className="input" type="password" value={newClientForm.password} onChange={e => setNewClientForm({ ...newClientForm, password: e.target.value })} placeholder="Min. 8 caractères" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              {newClientCreds ? (
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => setNewClientOpen(false)}>
                  <i className="ti ti-check" style={{ fontSize: "14px" }} /> Terminer
                </button>
              ) : (
                <>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setNewClientOpen(false)}>Annuler</button>
                  <button className="btn-primary" style={{ flex: 2 }} onClick={handleCreerClient} disabled={newClientLoading}>
                    {newClientLoading
                      ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Création…</>
                      : <><i className="ti ti-user-plus" style={{ fontSize: "14px" }} /> Créer le client</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  )
}