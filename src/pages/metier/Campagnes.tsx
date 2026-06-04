import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────
type Onglet = "age" | "clients"

interface Campagne {
  id: string
  nom: string
  type_campagne: string
  zone_geo: string | null
  date_debut: string | null
  date_fin: string | null
  statut: string
  origine: string
  courriers_envoyes: number
  reponses: number
  rdv_pris: number
  diagnostics: number
  description: string | null
  client_id: string | null
  region: string | null
  responsable_id: string | null
  created_at: string
  // Enrichi
  client?: { prenom: string; nom: string; profil: string } | null
  campagnes_actifs?: any[]
}

interface FormCampagne {
  nom: string
  type_campagne: string
  zone_geo: string
  date_debut: string
  date_fin: string
  description: string
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  soumise:          { label: "Soumise",          color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  en_qualification: { label: "En qualification", color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE" },
  validee:          { label: "Validée",           color: "#2F7D5C", bg: "#F0FDF4", border: "#BBF7D0" },
  en_cours:         { label: "En cours",          color: "#B25C2A", bg: "#F9F0EA", border: "#F0DDD0" },
  terminee:         { label: "Terminée",          color: "#6B7280", bg: "#F4F3F0", border: "#E2DDD8" },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sensibilisation: { label: "Sensibilisation", color: "#2F7D5C", bg: "#F0FDF4" },
  scoring:         { label: "Scoring",          color: "#0369A1", bg: "#EFF6FF" },
  pre_diagnostic:  { label: "Pré-diagnostic",   color: "#7C3AED", bg: "#F5F3FF" },
}

const FORM_INITIAL: FormCampagne = {
  nom: "", type_campagne: "", zone_geo: "",
  date_debut: "", date_fin: "", description: "",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function taux(c: Campagne) {
  return c.courriers_envoyes > 0
    ? Math.round((c.reponses / c.courriers_envoyes) * 100)
    : 0
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function exportCSV(campagne: Campagne) {
  const rows = [
    ["Champ", "Valeur"],
    ["Nom", campagne.nom],
    ["Type", TYPE_CONFIG[campagne.type_campagne]?.label || campagne.type_campagne],
    ["Zone géographique", campagne.zone_geo || "—"],
    ["Date début", formatDate(campagne.date_debut)],
    ["Date fin", formatDate(campagne.date_fin)],
    ["Statut", STATUT_CONFIG[campagne.statut]?.label || campagne.statut],
    [""],
    ["KPIs", ""],
    ["Courriers envoyés", campagne.courriers_envoyes?.toString() || "0"],
    ["Réponses", campagne.reponses?.toString() || "0"],
    ["RDV pris", campagne.rdv_pris?.toString() || "0"],
    ["Diagnostics", campagne.diagnostics?.toString() || "0"],
    ["Taux de réponse", taux(campagne) + "%"],
  ]

  const csv = rows.map(r => r.map(cell => `"${cell}"`).join(";")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `campagne_${campagne.nom.replace(/\s+/g, "_")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(campagne: Campagne) {
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Campagne — ${campagne.nom}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
        h1 { font-size: 22px; color: #B25C2A; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #6B7280; margin-bottom: 32px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6B7280; margin-bottom: 12px; border-bottom: 1px solid #E2DDD8; padding-bottom: 6px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F4F3F0; font-size: 13px; }
        .label { color: #6B7280; }
        .value { font-weight: 500; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 12px; }
        .kpi { background: #F9F0EA; border-radius: 8px; padding: 16px; text-align: center; }
        .kpi-val { font-size: 28px; font-weight: 700; color: #B25C2A; font-family: monospace; }
        .kpi-label { font-size: 11px; color: #6B7280; margin-top: 4px; }
        .footer { margin-top: 48px; font-size: 11px; color: #9CA3AF; text-align: center; }
      </style>
    </head>
    <body>
      <h1>${campagne.nom}</h1>
      <div class="subtitle">Rapport de campagne — Généré le ${new Date().toLocaleDateString("fr-FR")}</div>

      <div class="section">
        <div class="section-title">Informations générales</div>
        <div class="row"><span class="label">Type</span><span class="value">${TYPE_CONFIG[campagne.type_campagne]?.label || campagne.type_campagne}</span></div>
        <div class="row"><span class="label">Zone géographique</span><span class="value">${campagne.zone_geo || "—"}</span></div>
        <div class="row"><span class="label">Date début</span><span class="value">${formatDate(campagne.date_debut)}</span></div>
        <div class="row"><span class="label">Date fin</span><span class="value">${formatDate(campagne.date_fin)}</span></div>
        <div class="row"><span class="label">Statut</span><span class="value">${STATUT_CONFIG[campagne.statut]?.label || campagne.statut}</span></div>
        ${campagne.description ? `<div class="row"><span class="label">Description</span><span class="value">${campagne.description}</span></div>` : ""}
      </div>

      <div class="section">
        <div class="section-title">Indicateurs de performance</div>
        <div class="kpis">
          <div class="kpi"><div class="kpi-val">${campagne.courriers_envoyes || 0}</div><div class="kpi-label">Courriers</div></div>
          <div class="kpi"><div class="kpi-val">${campagne.reponses || 0}</div><div class="kpi-label">Réponses</div></div>
          <div class="kpi"><div class="kpi-val">${campagne.rdv_pris || 0}</div><div class="kpi-label">RDV</div></div>
          <div class="kpi"><div class="kpi-val">${campagne.diagnostics || 0}</div><div class="kpi-label">Diagnostics</div></div>
        </div>
        <div class="row" style="margin-top:16px"><span class="label">Taux de réponse</span><span class="value">${taux(campagne)} %</span></div>
      </div>

      <div class="footer">AGE Climate Platform — Rapport confidentiel</div>
    </body>
    </html>
  `
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.onload = () => {
      win.print()
      URL.revokeObjectURL(url)
    }
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Campagnes() {
  const navigate = useNavigate()
  const [onglet, setOnglet]               = useState<Onglet>("age")
  const [campagnes, setCampagnes]         = useState<Campagne[]>([])
  const [demandesClient, setDemandesClient] = useState<Campagne[]>([])
  const [loading, setLoading]             = useState(true)
  const [recherche, setRecherche]         = useState("")
  const [filtreStatut, setFiltreStatut]   = useState("tous")
  const [filtreType, setFiltreType]       = useState("tous")
  const [roleAGE, setRoleAGE]             = useState<string>("")
  const [regionAGE, setRegionAGE]         = useState<string | null>(null)

  // Drawer
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [selected, setSelected]           = useState<Campagne | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Formulaire création
  const [showForm, setShowForm]           = useState(false)
  const [form, setForm]                   = useState<FormCampagne>(FORM_INITIAL)
  const [formLoading, setFormLoading]     = useState(false)

  useEffect(() => { chargerProfil() }, [])

  async function chargerProfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profil } = await supabase
      .from("profils")
      .select("role, region")
      .eq("id", user.id)
      .single()
    if (profil) {
      setRoleAGE(profil.role)
      setRegionAGE(profil.region || null)
    }
    await Promise.all([loadCampagnes(profil?.region), loadDemandesClient(profil?.region)])
    setLoading(false)
  }

  async function loadCampagnes(region?: string | null) {
    let query = supabase
      .from("campagnes")
      .select("*")
      .eq("origine", "age")
      .order("date_debut", { ascending: false })
    if (region) query = query.eq("region", region)
    const { data } = await query
    setCampagnes(data || [])
  }

  async function loadDemandesClient(region?: string | null) {
    let query = supabase
      .from("campagnes")
      .select("*")
      .eq("origine", "client")
      .order("created_at", { ascending: false })
    if (region) query = query.eq("region", region)
    const { data: campagnesData } = await query
    if (!campagnesData) { setDemandesClient([]); return }

    const enriched = await Promise.all(
      campagnesData.map(async (c: Campagne) => {
        const { data: clientData } = await supabase
          .from("profils")
          .select("prenom, nom, profil")
          .eq("id", c.client_id)
          .single()
        const { data: actifs } = await supabase
          .from("campagnes_actifs")
          .select("actif:actif_id(id, nom, adresse, ville, surface)")
          .eq("campagne_id", c.id)
        return { ...c, client: clientData, campagnes_actifs: actifs || [] }
      })
    )
    setDemandesClient(enriched)
  }

  async function handleCreerCampagne() {
    if (!form.nom || !form.type_campagne) return
    setFormLoading(true)
    const { data } = await supabase.from("campagnes").insert({
      nom:           form.nom,
      type_campagne: form.type_campagne,
      zone_geo:      form.zone_geo || null,
      date_debut:    form.date_debut || null,
      date_fin:      form.date_fin || null,
      description:   form.description || null,
      statut:        "en_cours",
      origine:       "age",
      region:        regionAGE || null,
    }).select().single()
    if (data) setCampagnes([data, ...campagnes])
    setForm(FORM_INITIAL)
    setShowForm(false)
    setFormLoading(false)
  }

  async function updateStatutDemande(id: string, statut: string) {
    await supabase.from("campagnes").update({ statut }).eq("id", id)
    setDemandesClient(demandesClient.map(d => d.id === id ? { ...d, statut } : d))
  }

  // Filtres
  const campagnesFiltrees = campagnes.filter(c => {
    if (filtreStatut !== "tous" && c.statut !== filtreStatut) return false
    if (filtreType !== "tous" && c.type_campagne !== filtreType) return false
    if (recherche && !c.nom?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const demandesFiltrees = demandesClient.filter(d => {
    if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false
    if (recherche && !d.nom?.toLowerCase().includes(recherche.toLowerCase()) &&
        !d.client?.nom?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const demandesEnAttente = demandesClient.filter(d => d.statut === "soumise").length
  const campagnesActives  = campagnes.filter(c => c.statut === "en_cours").length
  const isAdmin = roleAGE === "admin" || roleAGE === "admin_national"

  // Données camembert
  function pieData(c: Campagne) {
    const data = [
      { name: "Réponses", value: c.reponses || 0, color: "#B25C2A" },
      { name: "RDV", value: c.rdv_pris || 0, color: "#0369A1" },
      { name: "Diagnostics", value: c.diagnostics || 0, color: "#2F7D5C" },
      { name: "Sans réponse", value: Math.max(0, (c.courriers_envoyes || 0) - (c.reponses || 0)), color: "#E2DDD8" },
    ].filter(d => d.value > 0)
    return data.length > 0 ? data : [{ name: "Aucune donnée", value: 1, color: "#E2DDD8" }]
  }

  if (loading) return <div style={{ padding: "2rem", color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid #E2DDD8",
    borderRadius: "7px", fontSize: "13px", color: "#111827",
    background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  }

  const lStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 600, color: "#6B7280",
    marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.07em",
  }

  return (
    <div className="page-wrapper" style={{ position: "relative" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Campagnes</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {campagnesActives} active{campagnesActives > 1 ? "s" : ""} · {campagnes.length} total
          </p>
        </div>
        {onglet === "age" && (
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            <i className="ti ti-plus" style={{ fontSize: "14px" }} />
            Nouvelle campagne
          </button>
        )}
      </div>

      {/* Formulaire création */}
      {showForm && onglet === "age" && (
        <div className="card" style={{ marginBottom: "16px", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>Nouvelle campagne AGE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lStyle}>Nom *</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Campagne RGA 2026" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Type *</label>
              <select value={form.type_campagne} onChange={e => setForm({ ...form, type_campagne: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                <option value="">Choisir…</option>
                <option value="sensibilisation">Sensibilisation</option>
                <option value="scoring">Scoring</option>
                <option value="pre_diagnostic">Pré-diagnostic</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Zone</label>
              <input value={form.zone_geo} onChange={e => setForm({ ...form, zone_geo: e.target.value })} placeholder="Ex : Nouvelle-Aquitaine" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date début</label>
              <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date fin</label>
              <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={iStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lStyle}>Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Objectifs…" style={{ ...iStyle, resize: "vertical" as const }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleCreerCampagne} disabled={!form.nom || !form.type_campagne || formLoading} className="btn-primary">
              {formLoading ? "Création…" : "Lancer"}
            </button>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2DDD8", marginBottom: "16px" }}>
        <div style={{ display: "flex" }}>
          {([
            { key: "age",     label: "Campagnes AGE",    icon: "ti-speakerphone", count: campagnes.length,       badge: campagnesActives > 0 ? campagnesActives : null },
            ...(!roleAGE.includes("responsable") ? [{ key: "clients", label: "Demandes clients", icon: "ti-users", count: demandesClient.length, badge: demandesEnAttente > 0 ? demandesEnAttente : null }] : []),
          ] as const).map(o => (
            <button key={o.key} onClick={() => { setOnglet(o.key as Onglet); setShowForm(false) }} style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "10px 16px", background: "transparent", border: "none",
              borderBottom: `2px solid ${onglet === o.key ? "#B25C2A" : "transparent"}`,
              color: onglet === o.key ? "#B25C2A" : "#6B7280",
              fontWeight: onglet === o.key ? 600 : 400,
              fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
              marginBottom: "-1px",
            }}>
              <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} />
              {o.label}
              <span style={{
                background: o.badge ? "#FEF2F2" : "#F4F3F0",
                color: o.badge ? "#B91C1C" : "#6B7280",
                fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "10px",
              }}>
                {o.badge ?? o.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "14px" }} />
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher une campagne…"
            className="input"
            style={{ paddingLeft: "32px" }}
          />
        </div>
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} className="input" style={{ width: "160px" }}>
          <option value="tous">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="soumise">Soumise</option>
          <option value="validee">Validée</option>
          <option value="terminee">Terminée</option>
        </select>
        {onglet === "age" && (
          <select value={filtreType} onChange={e => setFiltreType(e.target.value)} className="input" style={{ width: "160px" }}>
            <option value="tous">Tous les types</option>
            <option value="sensibilisation">Sensibilisation</option>
            <option value="scoring">Scoring</option>
            <option value="pre_diagnostic">Pré-diagnostic</option>
          </select>
        )}
      </div>

      {/* ── Tableau Campagnes AGE ── */}
      {onglet === "age" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {campagnesFiltrees.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
              <i className="ti ti-speakerphone-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
              Aucune campagne
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                  {["Nom", "Type", "Zone", "Dates", "Statut", "Taux", ""].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campagnesFiltrees.map((c, i) => {
                  const statut = STATUT_CONFIG[c.statut] || STATUT_CONFIG.en_cours
                  const type   = TYPE_CONFIG[c.type_campagne]
                  const t      = taux(c)
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: "1px solid #E2DDD8", height: "52px", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={() => { setSelected(c); setDrawerOpen(true); setShowExportMenu(false) }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{c.nom}</td>
                      <td style={tdStyle}>
                        {type && (
                          <span style={{ background: type.bg, color: type.color, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                            {type.label}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: "#6B7280", fontSize: "13px" }}>{c.zone_geo || "—"}</td>
                      <td style={{ ...tdStyle, color: "#6B7280", fontSize: "12px" }}>
                        {formatDate(c.date_debut)} → {formatDate(c.date_fin)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: statut.bg, color: statut.color, border: `1px solid ${statut.border}`, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>
                          {statut.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "80px" }}>
                          <div style={{ flex: 1, background: "#E2DDD8", borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                            <div style={{ background: "#B25C2A", width: `${t}%`, height: "100%", borderRadius: "3px" }} />
                          </div>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#6B7280", minWidth: "28px" }}>{t} %</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(c); setDrawerOpen(true); setShowExportMenu(false) }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "#F4F3F0", color: "#111827", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          <i className="ti ti-eye" style={{ fontSize: "13px" }} />
                          Voir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {campagnesFiltrees.length > 0 && (
            <div style={{ padding: "10px 20px", borderTop: "1px solid #E2DDD8" }}>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{campagnesFiltrees.length} campagne{campagnesFiltrees.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tableau Demandes clients ── */}
      {onglet === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {demandesEnAttente > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#D97706" }} />
              <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 500 }}>
                {demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente
              </span>
            </div>
          )}
          {demandesFiltrees.length === 0 ? (
            <div className="card" style={{ padding: "48px", textAlign: "center" }}>
              <i className="ti ti-inbox" style={{ fontSize: "32px", color: "#9CA3AF", display: "block", marginBottom: "12px" }} />
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827", marginBottom: "6px" }}>Aucune demande</div>
            </div>
          ) : demandesFiltrees.map(d => {
            const statut = STATUT_CONFIG[d.statut] || STATUT_CONFIG.soumise
            const type   = TYPE_CONFIG[d.type_campagne]
            const estTraitee = ["validee", "en_cours", "terminee"].includes(d.statut)
            const nbBiens = d.campagnes_actifs?.length || 0
            return (
              <div key={d.id}
                onClick={() => navigate("/metier/campagnes/" + d.id)}
                style={{ background: "#FFFFFF", border: `1px solid ${d.statut === "soumise" ? "#FDE68A" : "#E2DDD8"}`, borderRadius: "10px", overflow: "hidden", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#B25C2A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = d.statut === "soumise" ? "#FDE68A" : "#E2DDD8")}
              >
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                      {type && <span style={{ background: type.bg, color: type.color, padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>{d.nom || "Campagne sans nom"}</div>
                    {d.client && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <i className="ti ti-user" style={{ fontSize: "12px", color: "#9CA3AF" }} />
                        <span style={{ fontSize: "12px", color: "#6B7280" }}>{d.client.prenom} {d.client.nom}</span>
                      </div>
                    )}
                    {d.zone_geo && <div style={{ fontSize: "12px", color: "#6B7280" }}><i className="ti ti-map-pin" style={{ fontSize: "12px", marginRight: "3px" }} />{d.zone_geo}</div>}
                    {nbBiens > 0 && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "#6B7280" }}>
                        <i className="ti ti-building" style={{ fontSize: "11px", marginRight: "3px" }} />
                        {nbBiens} bien{nbBiens > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "6px", flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    {!estTraitee && d.statut === "soumise" && (
                      <>
                        <button onClick={() => updateStatutDemande(d.id, "validee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#B25C2A", color: "white", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-check" style={{ fontSize: "12px" }} /> Valider
                        </button>
                        <button onClick={() => updateStatutDemande(d.id, "en_qualification")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-search" style={{ fontSize: "12px" }} /> Qualifier
                        </button>
                      </>
                    )}
                    <button onClick={() => navigate("/metier/campagnes/" + d.id)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #F0DDD0", background: "#F9F0EA", color: "#B25C2A", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-eye" style={{ fontSize: "12px" }} /> Voir biens
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Drawer détail campagne ── */}
      {drawerOpen && selected && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "440px", maxWidth: "100vw", background: "#FFFFFF", zIndex: 400, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>

            {/* Header drawer */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ flex: 1, paddingRight: "12px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>{selected.nom}</h2>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {TYPE_CONFIG[selected.type_campagne] && (
                    <span style={{ background: TYPE_CONFIG[selected.type_campagne].bg, color: TYPE_CONFIG[selected.type_campagne].color, fontSize: "10px", padding: "2px 6px", borderRadius: "3px", fontWeight: 500 }}>
                      {TYPE_CONFIG[selected.type_campagne].label}
                    </span>
                  )}
                  {STATUT_CONFIG[selected.statut] && (
                    <span style={{ background: STATUT_CONFIG[selected.statut].bg, color: STATUT_CONFIG[selected.statut].color, fontSize: "10px", padding: "2px 6px", borderRadius: "3px", fontWeight: 500 }}>
                      {STATUT_CONFIG[selected.statut].label}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", flexShrink: 0 }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} />
              </button>
            </div>

            {/* Corps drawer */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Infos générales */}
              <div>
                <div style={sectionTitleStyle}>Informations générales</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {[
                    { label: "Zone", value: selected.zone_geo || "—" },
                    { label: "Date début", value: formatDate(selected.date_debut) },
                    { label: "Date fin", value: formatDate(selected.date_fin) },
                    { label: "Région", value: selected.region || "—" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F4F3F0" }}>
                      <span style={{ fontSize: "12px", color: "#6B7280" }}>{item.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {selected.description && (
                  <div style={{ marginTop: "10px", padding: "10px 12px", background: "#F4F3F0", borderRadius: "8px", fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                    {selected.description}
                  </div>
                )}
              </div>

              {/* KPIs */}
              <div>
                <div style={sectionTitleStyle}>Indicateurs de performance</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {[
                    { label: "Courriers", value: selected.courriers_envoyes || 0, icon: "ti-mail" },
                    { label: "Réponses",  value: selected.reponses || 0,          icon: "ti-mail-opened" },
                    { label: "RDV pris",  value: selected.rdv_pris || 0,          icon: "ti-calendar" },
                    { label: "Diagnostics", value: selected.diagnostics || 0,     icon: "ti-clipboard-list" },
                  ].map((k, i) => (
                    <div key={i} style={{ background: "#F9F0EA", borderRadius: "8px", padding: "12px", border: "1px solid #F0DDD0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <i className={`ti ${k.icon}`} style={{ fontSize: "13px", color: "#B25C2A" }} />
                        <span className="label-section" style={{ fontSize: "10px" }}>{k.label}</span>
                      </div>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "22px", fontWeight: 600, color: "#111827" }}>{k.value.toLocaleString("fr-FR")}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "8px", padding: "10px 12px", background: "#F4F3F0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6B7280" }}>Taux de réponse</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 600, color: "#B25C2A" }}>{taux(selected)} %</span>
                </div>
              </div>

              {/* Camembert */}
              <div>
                <div style={sectionTitleStyle}>Répartition</div>
                <div style={{ height: "180px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData(selected)}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData(selected).map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Footer drawer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2DDD8", flexShrink: 0, position: "relative" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setDrawerOpen(false)}
                >
                  Fermer
                </button>
                <div style={{ position: "relative", flex: 2 }}>
                  <button
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                  >
                    <i className="ti ti-download" style={{ fontSize: "14px" }} />
                    Exporter
                    <i className="ti ti-chevron-down" style={{ fontSize: "12px", marginLeft: "4px" }} />
                  </button>
                  {showExportMenu && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 500, overflow: "hidden" }}>
                      <button
                        onClick={() => { exportCSV(selected); setShowExportMenu(false) }}
                        style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", color: "#111827", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <i className="ti ti-table" style={{ fontSize: "14px", color: "#2F7D5C" }} />
                        Export CSV
                      </button>
                      <button
                        onClick={() => { exportPDF(selected); setShowExportMenu(false) }}
                        style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", color: "#111827", textAlign: "left", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #F4F3F0" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <i className="ti ti-file-type-pdf" style={{ fontSize: "14px", color: "#B91C1C" }} />
                        Export PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#6B7280",
  marginBottom: "10px",
  paddingBottom: "6px",
  borderBottom: "1px solid #F4F3F0",
}
