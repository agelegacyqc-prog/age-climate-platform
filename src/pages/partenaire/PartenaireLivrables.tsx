import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumis:  { label: "Soumis",   color: "#0369A1", bg: "#EFF6FF" },
  valide:  { label: "Validé",   color: "#2F7D5C", bg: "#F0FDF4" },
  rejete:  { label: "Rejeté",   color: "#B91C1C", bg: "#FEF2F2" },
}

export default function PartenaireLivrables() {
  const navigate = useNavigate()
  const [livrables, setLivrables]         = useState<any[]>([])
  const [missions, setMissions]           = useState<any[]>([])
  const [partenaireId, setPartenaireId]   = useState<string>("")
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [uploadingId, setUploadingId]     = useState<string | null>(null)

  // Formulaire
  const [form, setForm] = useState({
    mission_id: "",
    nom: "",
    description: "",
  })
  const [formLoading, setFormLoading]   = useState(false)
  const [formSuccess, setFormSuccess]   = useState(false)
  const [formError, setFormError]       = useState("")

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: partenaire } = await supabase
      .from("prestataires_pro")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!partenaire) return
    setPartenaireId(partenaire.id)

    const [{ data: livrablesData }, { data: missionsData }] = await Promise.all([
      supabase
        .from("livrables_missions")
        .select("*, mission:mission_id(societe)")
        .eq("partenaire_id", partenaire.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("missions")
        .select("id, societe")
        .eq("consultant_id", user.id)
        .in("statut", ["nouvelle", "en_cours"]),
    ])

    setLivrables(livrablesData || [])
    setMissions(missionsData || [])
    setLoading(false)
  }

  async function handleSoumettre() {
    if (!form.mission_id || !form.nom) {
      setFormError("Mission et nom du livrable sont obligatoires.")
      return
    }
    setFormLoading(true)
    setFormError("")
    try {
      const { error } = await supabase.from("livrables_missions").insert({
        mission_id:    form.mission_id,
        partenaire_id: partenaireId,
        nom:           form.nom,
        description:   form.description || null,
        statut:        "soumis",
      })
      if (error) throw error
      setFormSuccess(true)
      setForm({ mission_id: "", nom: "", description: "" })
      setTimeout(() => {
        setFormSuccess(false)
        setShowForm(false)
        init()
      }, 1500)
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la soumission.")
    } finally {
      setFormLoading(false)
    }
  }

  async function uploadFichier(livrableId: string, file: File) {
    setUploadingId(livrableId)
    try {
      const path = `livrables/${livrableId}/${file.name}`
      const { error } = await supabase.storage
        .from("documents-clients")
        .upload(path, file, { upsert: true })
      if (error) throw error

      const { data: urlData } = supabase.storage
        .from("documents-clients")
        .getPublicUrl(path)

      await supabase
        .from("livrables_missions")
        .update({ fichier_url: urlData.publicUrl, storage_path: path })
        .eq("id", livrableId)

      setLivrables(prev => prev.map(l =>
        l.id === livrableId ? { ...l, fichier_url: urlData.publicUrl } : l
      ))
    } finally {
      setUploadingId(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  if (loading) return <div style={{ color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => navigate("/partenaire/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2DDD8", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#6B7280", fontSize: "13px", fontFamily: "inherit" }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "#6B7280" }}>
            <span style={{ fontWeight: 500, color: "#111827" }}>{livrables.length}</span> livrable{livrables.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-plus" style={{ fontSize: "14px" }} />
            Soumettre un livrable
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "16px" }}>
            Nouveau livrable
          </div>

          {formError && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "14px" }} />
              {formError}
            </div>
          )}

          {formSuccess && (
            <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", fontSize: "13px", color: "#2F7D5C", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "14px" }} />
              Livrable soumis avec succès
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Mission <span style={{ color: "#B91C1C" }}>*</span></label>
              <select
                className="input"
                value={form.mission_id}
                onChange={e => setForm({ ...form, mission_id: e.target.value })}
              >
                <option value="">Choisir une mission…</option>
                {missions.map(m => (
                  <option key={m.id} value={m.id}>{m.societe || "Mission"}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nom du livrable <span style={{ color: "#B91C1C" }}>*</span></label>
              <input
                className="input"
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex : Rapport final, Présentation…"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "14px", fontFamily: "Inter, sans-serif", color: "#111827", background: "white", outline: "none", resize: "none", height: "80px", boxSizing: "border-box" as const }}
                placeholder="Décrivez le contenu du livrable…"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowForm(false); setFormError("") }}
                style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSoumettre}
                disabled={formLoading}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#B25C2A", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                <i className="ti ti-send" style={{ fontSize: "14px" }} />
                {formLoading ? "Soumission…" : "Soumettre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {livrables.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-package" style={{ fontSize: "32px", color: "#9CA3AF", display: "block", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "6px" }}>Aucun livrable</div>
          <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Soumettez votre premier livrable via le bouton ci-dessus</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                {["Livrable", "Mission", "Date", "Statut", "Fichier", ""].map((h, i) => (
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {livrables.map((l, i) => {
                const statut = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis
                return (
                  <tr
                    key={l.id}
                    style={{ borderBottom: i < livrables.length - 1 ? "1px solid #E2DDD8" : "none", height: "52px" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>{l.nom}</div>
                      {l.description && <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{l.description.slice(0, 40)}…</div>}
                    </td>
                    <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>
                      {(l.mission as any)?.societe || "—"}
                    </td>
                    <td style={{ ...tdStyle, color: "#9CA3AF", fontSize: "12px" }}>
                      {formatDate(l.created_at)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: statut.bg, color: statut.color, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                        {statut.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {l.fichier_url ? (
                        <a
                          href={l.fichier_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "5px", background: "#F0FDF4", color: "#2F7D5C", fontSize: "11px", fontWeight: 500, textDecoration: "none" }}
                        >
                          <i className="ti ti-download" style={{ fontSize: "12px" }} />
                          Voir
                        </a>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Aucun fichier</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {!l.fichier_url && (
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "11px", fontWeight: 500, cursor: "pointer" }}>
                          <i className="ti ti-upload" style={{ fontSize: "12px" }} />
                          {uploadingId === l.id ? "Upload…" : "Ajouter"}
                          <input
                            type="file"
                            style={{ display: "none" }}
                            onChange={e => { if (e.target.files?.[0]) uploadFichier(l.id, e.target.files[0]) }}
                          />
                        </label>
                      )}
                      {l.commentaire_age && (
                        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px", maxWidth: "150px", textAlign: "right" }}>
                          💬 {l.commentaire_age}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "6px",
}