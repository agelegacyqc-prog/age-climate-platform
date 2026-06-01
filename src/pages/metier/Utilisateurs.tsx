import React, { useEffect, useState, useRef } from "react"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
type RoleAGE = "admin_national" | "responsable_regional" | "consultant"

type Region =
  | "Nord"
  | "Nord-Est"
  | "Nord-Ouest"
  | "Ile-de-France"
  | "Centre"
  | "Sud-Est"
  | "Sud-Ouest"

const REGIONS: Region[] = [
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Ile-de-France",
  "Centre",
  "Sud-Est",
  "Sud-Ouest",
]

const ROLES: { value: RoleAGE | "tous"; label: string }[] = [
  { value: "tous", label: "Tous les rôles" },
  { value: "admin_national", label: "Admin national" },
  { value: "responsable_regional", label: "Resp. régional" },
  { value: "consultant", label: "Consultant" },
]

interface Utilisateur {
  id: string
  email: string
  prenom: string
  nom: string
  role: string
  region: string | null
  is_active: boolean
}

interface DrawerForm {
  prenom: string
  nom: string
  email: string
  role: RoleAGE
  region: Region | ""
  password: string
  is_active?: boolean
}

const FORM_INITIAL: DrawerForm = {
  prenom: "",
  nom: "",
  email: "",
  role: "consultant",
  region: "",
  password: "",
  is_active: true,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: "Admin national",
    admin_national: "Admin national",
    responsable_regional: "Resp. régional",
    consultant: "Consultant",
  }
  return map[role] || role
}

function roleBadgeClass(role: string): string {
  if (role === "admin" || role === "admin_national") return "badge badge--info"
  if (role === "responsable_regional") return "badge badge--warning"
  return "badge badge--neutral"
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Utilisateurs() {
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; region: string | null } | null>(null)
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtreRole, setFiltreRole] = useState<RoleAGE | "tous">("tous")
  const [filtreRegions, setFiltreRegions] = useState<Region[]>([])
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "actif" | "inactif">("tous")
  const [regionDropOpen, setRegionDropOpen] = useState(false)
  const regionDropRef = useRef<HTMLDivElement>(null)

  // Drawer création
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<DrawerForm>(FORM_INITIAL)
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState("")

  // Drawer édition
  const [drawerEditOpen, setDrawerEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<Utilisateur | null>(null)
  const [editForm, setEditForm] = useState<Partial<DrawerForm>>({})
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  // ── Charger le profil courant ─────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profil } = await supabase
        .from("profils")
        .select("role, region")
        .eq("id", user.id)
        .single()
      if (profil) {
        setCurrentUser({ id: user.id, role: profil.role, region: profil.region })
      }
    }
    init()
  }, [])

  // ── Charger les utilisateurs ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    chargerUtilisateurs()
  }, [currentUser])

  async function chargerUtilisateurs() {
    setLoading(true)
    try {
      let query = supabase
        .from("profils")
        .select("id, prenom, nom, role, region")
        .in("role", ["admin", "admin_national", "responsable_regional", "consultant"])

      if (currentUser?.role === "responsable_regional" && currentUser.region) {
        query = query
          .eq("region", currentUser.region)
          .eq("role", "consultant")
      }

      const { data, error } = await query.order("nom")
      if (error) throw error

      const mapped: Utilisateur[] = (data || []).map((p: any) => ({
        id: p.id,
        email: "",
        prenom: p.prenom || "",
        nom: p.nom || "",
        role: p.role,
        region: p.region,
        is_active: true,
      }))

      if (
        currentUser?.role === "admin" ||
        currentUser?.role === "admin_national"
      ) {
        const ids = mapped.map((u) => u.id)
        let authUsers = null
        try {
          const { data: rpcData } = await supabase.rpc("get_users_emails", { user_ids: ids })
          authUsers = rpcData
        } catch {
          authUsers = null
        }
        if (authUsers) {
          authUsers.forEach((au: { id: string; email: string }) => {
            const u = mapped.find((m) => m.id === au.id)
            if (u) u.email = au.email
          })
        }
      }

      setUtilisateurs(mapped)
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle actif/inactif ──────────────────────────────────────────────────
  async function toggleActif(u: Utilisateur) {
    const nouvelle_valeur = !u.is_active
    setUtilisateurs((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, is_active: nouvelle_valeur } : x))
    )
    try {
      await supabase
        .from("profils")
        .update({ is_active: nouvelle_valeur } as any)
        .eq("id", u.id)
    } catch {
      setUtilisateurs((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_active: u.is_active } : x))
      )
    }
  }

  // ── Fermer dropdown région au clic extérieur ──────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (regionDropRef.current && !regionDropRef.current.contains(e.target as Node)) {
        setRegionDropOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ── Filtres ───────────────────────────────────────────────────────────────
  const utilisateursFiltres = utilisateurs.filter((u) => {
    const matchSearch =
      search === "" ||
      `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole =
      filtreRole === "tous" ||
      u.role === filtreRole ||
      (filtreRole === "admin_national" && u.role === "admin")
    const matchRegion =
      filtreRegions.length === 0 ||
      (u.region != null && filtreRegions.includes(u.region as Region))
    const matchStatut =
      filtreStatut === "tous" ||
      (filtreStatut === "actif" && u.is_active) ||
      (filtreStatut === "inactif" && !u.is_active)
    return matchSearch && matchRole && matchRegion && matchStatut
  })

  // ── Création ──────────────────────────────────────────────────────────────
  async function handleCreer(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormSuccess("")
    if (!form.prenom || !form.nom || !form.email || !form.password) {
      setFormError("Tous les champs obligatoires doivent être remplis.")
      return
    }
    if (
      (form.role === "responsable_regional" || form.role === "consultant") &&
      !form.region
    ) {
      setFormError("La région est obligatoire pour ce rôle.")
      return
    }
    setFormLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Session expirée")
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            prenom: form.prenom,
            nom: form.nom,
            role: form.role,
            region: form.region || null,
          }),
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erreur lors de la création")
      setFormSuccess(`Utilisateur ${form.prenom} ${form.nom} créé avec succès.`)
      setForm(FORM_INITIAL)
      chargerUtilisateurs()
      setTimeout(() => {
        setDrawerOpen(false)
        setFormSuccess("")
      }, 1500)
    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue.")
    } finally {
      setFormLoading(false)
    }
  }

  // ── Édition ───────────────────────────────────────────────────────────────
  async function handleEditer(e: React.FormEvent) {
    e.preventDefault()
    setEditError("")
    setEditSuccess("")
    if (!editUser) return
    if (!editForm.prenom || !editForm.nom) {
      setEditError("Prénom et nom sont obligatoires.")
      return
    }
    if (
      (editForm.role === "responsable_regional" || editForm.role === "consultant") &&
      !editForm.region
    ) {
      setEditError("La région est obligatoire pour ce rôle.")
      return
    }
    setEditLoading(true)
    try {
      const { error } = await supabase
        .from("profils")
        .update({
          prenom: editForm.prenom,
          nom: editForm.nom,
          role: editForm.role,
          region: editForm.region || null,
          is_active: editForm.is_active,
        } as any)
        .eq("id", editUser.id)
      if (error) throw error
      setEditSuccess("Utilisateur mis à jour avec succès.")
      chargerUtilisateurs()
      setTimeout(() => {
        setDrawerEditOpen(false)
        setEditSuccess("")
      }, 1500)
    } catch (err: any) {
      setEditError(err.message || "Une erreur est survenue.")
    } finally {
      setEditLoading(false)
    }
  }

  // ── Suppression (soft delete) ─────────────────────────────────────────────
  async function handleSupprimer() {
    if (!editUser) return
    if (!window.confirm(`Supprimer ${editUser.prenom} ${editUser.nom} ? Cette action est irréversible.`)) return
    setEditLoading(true)
    try {
      const { error } = await supabase
        .from("profils")
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        } as any)
        .eq("id", editUser.id)
      if (error) throw error
      chargerUtilisateurs()
      setDrawerEditOpen(false)
    } catch (err: any) {
      setEditError(err.message || "Une erreur est survenue.")
    } finally {
      setEditLoading(false)
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "admin_national"
  const isResponsable = currentUser?.role === "responsable_regional"

  return (
    <div className="page-wrapper">

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
            {isResponsable ? `Mon équipe — ${currentUser?.region}` : "Utilisateurs"}
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {isResponsable ? "Consultants rattachés à votre région" : "Gestion des comptes AGE Climate Platform"}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => { setDrawerOpen(true); setForm(FORM_INITIAL); setFormError(""); setFormSuccess("") }}
          >
            <i className="ti ti-user-plus" />
            Nouvel utilisateur
          </button>
        )}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "15px" }} />
          <input
            className="input"
            style={{ paddingLeft: "32px" }}
            placeholder="Rechercher un utilisateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <select className="input" style={{ width: "160px" }} value={filtreRole} onChange={(e) => setFiltreRole(e.target.value as any)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        )}
        {isAdmin && (
          <div ref={regionDropRef} style={{ position: "relative" }}>
            <button className="btn-ghost" style={{ height: "40px", gap: "6px" }} onClick={() => setRegionDropOpen((v) => !v)}>
              <i className="ti ti-map-pin" style={{ fontSize: "14px" }} />
              {filtreRegions.length === 0 ? "Toutes régions" : `${filtreRegions.length} région${filtreRegions.length > 1 ? "s" : ""}`}
              <i className="ti ti-chevron-down" style={{ fontSize: "12px", marginLeft: "2px" }} />
            </button>
            {regionDropOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 200, minWidth: "180px", padding: "6px" }}>
                {REGIONS.map((r) => (
                  <label key={r} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "13px", color: "#111827", background: filtreRegions.includes(r) ? "#F9F0EA" : "transparent" }}>
                    <input type="checkbox" checked={filtreRegions.includes(r)} onChange={() => setFiltreRegions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])} style={{ accentColor: "#B25C2A" }} />
                    {r}
                  </label>
                ))}
                {filtreRegions.length > 0 && (
                  <button onClick={() => setFiltreRegions([])} style={{ width: "100%", marginTop: "4px", padding: "6px", fontSize: "12px", color: "#B25C2A", background: "none", border: "none", cursor: "pointer", borderTop: "1px solid #E2DDD8" }}>
                    Effacer les filtres
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {isAdmin && (
          <select className="input" style={{ width: "130px" }} value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value as any)}>
            <option value="tous">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
        )}
      </div>

      {/* ── Tableau ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-loader" style={{ fontSize: "20px", display: "block", marginBottom: "8px" }} />
            Chargement…
          </div>
        ) : utilisateursFiltres.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-users-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
            Aucun utilisateur trouvé
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                <th style={thStyle}>Nom</th>
                {isAdmin && <th style={thStyle}>Email</th>}
                <th style={thStyle}>Rôle</th>
                <th style={thStyle}>Région</th>
                <th style={thStyle}>Statut</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilisateursFiltres.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid #E2DDD8", height: "52px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F9F0EA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#F4F3F0", border: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#6B7280", flexShrink: 0 }}>
                        {(u.prenom[0] || "").toUpperCase()}{(u.nom[0] || "").toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, color: "#111827" }}>{u.prenom} {u.nom}</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                      {u.email || <span style={{ color: "#9CA3AF" }}>—</span>}
                    </td>
                  )}
                  <td style={tdStyle}>
                    <span className={roleBadgeClass(u.role)}>{roleLabel(u.role)}</span>
                  </td>
                  <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                    {u.region || <span style={{ color: "#9CA3AF" }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    <span className={u.is_active ? "badge badge--success" : "badge badge--neutral"}>
                      <i className={`ti ${u.is_active ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "11px" }} />
                      {u.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                      {isAdmin && (
                        <>
                          <button
                            title="Modifier"
                            style={actionBtnStyle}
                            onClick={() => {
                              setEditUser(u)
                              setEditForm({
                                prenom: u.prenom,
                                nom: u.nom,
                                role: u.role as RoleAGE,
                                region: (u.region as Region) || "",
                                is_active: u.is_active,
                              })
                              setEditError("")
                              setEditSuccess("")
                              setDrawerEditOpen(true)
                            }}
                          >
                            <i className="ti ti-pencil" style={{ fontSize: "14px" }} />
                          </button>
                          <button
                            title={u.is_active ? "Désactiver" : "Activer"}
                            style={{ ...actionBtnStyle, color: u.is_active ? "#2F7D5C" : "#B91C1C", background: u.is_active ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${u.is_active ? "#BBF7D0" : "#FECACA"}` }}
                            onClick={() => toggleActif(u)}
                          >
                            <i className={`ti ${u.is_active ? "ti-toggle-right" : "ti-toggle-left"}`} style={{ fontSize: "16px" }} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && utilisateursFiltres.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
              {utilisateursFiltres.length} utilisateur{utilisateursFiltres.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Drawer création ── */}
      {drawerOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Nouvel utilisateur</h2>
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>Créer un compte AGE</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>
            <form onSubmit={handleCreer} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {formError && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", display: "flex", gap: "8px", alignItems: "center" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "14px", flexShrink: 0 }} />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", fontSize: "13px", color: "#2F7D5C", display: "flex", gap: "8px", alignItems: "center" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "14px", flexShrink: 0 }} />
                  {formSuccess}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Prénom <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" />
                </div>
                <div>
                  <label style={labelStyle}>Nom <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ color: "#B91C1C" }}>*</span></label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="prenom.nom@agelegacy-qc.com" />
              </div>
              <div>
                <label style={labelStyle}>Mot de passe provisoire <span style={{ color: "#B91C1C" }}>*</span></label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 caractères" />
              </div>
              <div>
                <label style={labelStyle}>Rôle <span style={{ color: "#B91C1C" }}>*</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                  {([
                    { value: "admin_national", label: "Admin national", desc: "Accès complet, toutes régions" },
                    { value: "responsable_regional", label: "Responsable régional", desc: "Gestion d'une région" },
                    { value: "consultant", label: "Consultant", desc: "Dossiers assignés, région fixe" },
                  ] as const).map((r) => (
                    <label key={r.value} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: `1px solid ${form.role === r.value ? "#B25C2A" : "#E2DDD8"}`, background: form.role === r.value ? "#F9F0EA" : "#FFFFFF", transition: "all 0.1s" }}>
                      <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value, region: "" })} style={{ accentColor: "#B25C2A", marginTop: "2px" }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{r.label}</div>
                        <div style={{ fontSize: "12px", color: "#6B7280" }}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {(form.role === "responsable_regional" || form.role === "consultant") && (
                <div>
                  <label style={labelStyle}>Région <span style={{ color: "#B91C1C" }}>*</span></label>
                  <select className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Region })}>
                    <option value="">Sélectionner une région…</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </form>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setDrawerOpen(false)}>Annuler</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleCreer} disabled={formLoading}>
                {formLoading ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Création…</> : <><i className="ti ti-user-plus" style={{ fontSize: "14px" }} /> Créer l'utilisateur</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Drawer édition ── */}
      {drawerEditOpen && editUser && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerEditOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Modifier l'utilisateur</h2>
                <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{editUser.prenom} {editUser.nom}</p>
              </div>
              <button onClick={() => setDrawerEditOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>
            <form onSubmit={handleEditer} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {editError && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", display: "flex", gap: "8px", alignItems: "center" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "14px", flexShrink: 0 }} />
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", fontSize: "13px", color: "#2F7D5C", display: "flex", gap: "8px", alignItems: "center" }}>
                  <i className="ti ti-circle-check" style={{ fontSize: "14px", flexShrink: 0 }} />
                  {editSuccess}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Prénom <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={editForm.prenom || ""} onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Nom <span style={{ color: "#B91C1C" }}>*</span></label>
                  <input className="input" value={editForm.nom || ""} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Rôle <span style={{ color: "#B91C1C" }}>*</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                  {([
                    { value: "admin_national", label: "Admin national", desc: "Accès complet, toutes régions" },
                    { value: "responsable_regional", label: "Responsable régional", desc: "Gestion d'une région" },
                    { value: "consultant", label: "Consultant", desc: "Dossiers assignés, région fixe" },
                  ] as const).map((r) => (
                    <label key={r.value} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: `1px solid ${editForm.role === r.value ? "#B25C2A" : "#E2DDD8"}`, background: editForm.role === r.value ? "#F9F0EA" : "#FFFFFF", transition: "all 0.1s" }}>
                      <input type="radio" name="edit_role" value={r.value} checked={editForm.role === r.value} onChange={() => setEditForm({ ...editForm, role: r.value, region: "" })} style={{ accentColor: "#B25C2A", marginTop: "2px" }} />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{r.label}</div>
                        <div style={{ fontSize: "12px", color: "#6B7280" }}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {(editForm.role === "responsable_regional" || editForm.role === "consultant") && (
                <div>
                  <label style={labelStyle}>Région <span style={{ color: "#B91C1C" }}>*</span></label>
                  <select className="input" value={editForm.region || ""} onChange={(e) => setEditForm({ ...editForm, region: e.target.value as Region })}>
                    <option value="">Sélectionner une région…</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>Statut</label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: "1px solid #E2DDD8", background: "#FFFFFF" }}>
                  <input type="checkbox" checked={editForm.is_active ?? true} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} style={{ accentColor: "#B25C2A" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>Compte actif</div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>Décochez pour désactiver l'accès</div>
                  </div>
                </label>
              </div>
              <div style={{ marginTop: "8px", padding: "16px", background: "#FEF2F2", borderRadius: "8px", border: "1px solid #FECACA" }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#B91C1C", marginBottom: "8px" }}>Zone de danger</p>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px" }}>La suppression désactive le compte et conserve les données (RGPD).</p>
                <button type="button" onClick={handleSupprimer} disabled={editLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", border: "1px solid #FECACA", background: "#FFFFFF", color: "#B91C1C", fontFamily: "inherit" }}>
                  <i className="ti ti-trash" style={{ fontSize: "14px" }} />
                  Supprimer cet utilisateur
                </button>
              </div>
            </form>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setDrawerEditOpen(false)}>Annuler</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleEditer} disabled={editLoading}>
                {editLoading ? <><i className="ti ti-loader" style={{ fontSize: "14px" }} /> Sauvegarde…</> : <><i className="ti ti-check" style={{ fontSize: "14px" }} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6B7280",
  textAlign: "left",
  whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "0 16px",
  fontSize: "14px",
  color: "#111827",
}

const actionBtnStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  border: "1px solid #E2DDD8",
  background: "#F4F3F0",
  borderRadius: "6px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6B7280",
  transition: "all 0.1s",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
}