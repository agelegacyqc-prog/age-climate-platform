import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "../../lib/supabase"

const perfData = [
  { semaine: "S1", reponses: 120, rdv: 80, diagnostics: 45 },
  { semaine: "S2", reponses: 340, rdv: 210, diagnostics: 120 },
  { semaine: "S3", reponses: 520, rdv: 380, diagnostics: 240 },
  { semaine: "S4", reponses: 890, rdv: 530, diagnostics: 395 },
]

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  soumise:          { label: "Soumise",          color: "#92400E", bg: "#FFFBEB" },
  en_qualification: { label: "En qualification", color: "#1E40AF", bg: "#EFF6FF" },
  validee:          { label: "Validee",           color: "#065F46", bg: "#ECFDF5" },
  en_cours:         { label: "En cours",          color: "#0369A1", bg: "#EFF6FF" },
  terminee:         { label: "Terminee",          color: "#475569", bg: "#F1F5F9" },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sensibilisation: { label: "Sensibilisation", color: "#065F46", bg: "#ECFDF5" },
  scoring:         { label: "Scoring",         color: "#1E40AF", bg: "#EFF6FF" },
  pre_diagnostic:  { label: "Pre-diagnostic",  color: "#5B21B6", bg: "#F5F3FF" },
}

type Onglet = "age" | "clients"

interface FormCampagne {
  nom: string
  type_campagne: string
  zone_geo: string
  date_debut: string
  date_fin: string
  description: string
}

export default function Campagnes() {
  const navigate = useNavigate()
  const [onglet, setOnglet] = useState<Onglet>("age")
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [demandesClient, setDemandesClient] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [recherche, setRecherche] = useState("")
  const [filtreStatut, setFiltreStatut] = useState("tous")
  const [filtreType, setFiltreType] = useState("tous")
  const [roleAGE, setRoleAGE]       = useState<string>("")
const [regionAGE, setRegionAGE]   = useState<string | null>(null)
  const [form, setForm] = useState<FormCampagne>({
    nom: "", type_campagne: "", zone_geo: "",
    date_debut: "", date_fin: "", description: "",
  })

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
    setRegionAGE(profil.region)
  }
  await init()
}

  async function init() {
    await Promise.all([loadCampagnes(), loadDemandesClient()])
    setLoading(false)
  }

  async function loadCampagnes() {
  let query = supabase
  .from("campagnes")
  .select("*")
  .eq("origine", "age")
  .order("date_debut", { ascending: false })

if (regionAGE) {
  query = query.eq("region", regionAGE)
}

const { data } = await query
    setCampagnes(data || [])
    if (data && data.length > 0) setSelected(data[0])
  }

  async function loadDemandesClient() {
   let queryClient = supabase
  .from("campagnes")
  .select("*")
  .eq("origine", "client")
  .order("created_at", { ascending: false })

if (regionAGE) {
  queryClient = queryClient.eq("region", regionAGE)
}

const { data: campagnesData } = await queryClient

    if (!campagnesData) { setDemandesClient([]); return }

    const campagnesAvecDetails = await Promise.all(
      campagnesData.map(async (c) => {
        const { data: clientData } = await supabase
          .from("profils")
          .select("id, prenom, nom, profil")
          .eq("id", c.client_id)
          .single()
        const { data: actifs } = await supabase
          .from("campagnes_actifs")
          .select("actif:actif_id(id, nom, adresse, ville, surface, type_batiment)")
          .eq("campagne_id", c.id)
        return { ...c, client: clientData, campagnes_actifs: actifs || [] }
      })
    )
    setDemandesClient(campagnesAvecDetails)
  }

  async function handleCreerCampagne() {
    if (!form.nom || !form.type_campagne) return
    setLoadingForm(true)
    const { data } = await supabase.from("campagnes").insert({
      nom:           form.nom,
      type_campagne: form.type_campagne,
      zone_geo:      form.zone_geo || null,
      date_debut:    form.date_debut || null,
      date_fin:      form.date_fin || null,
      description:   form.description || null,
      statut:        "en_cours",
      origine:       "age",
    }).select().single()
    if (data) {
      setCampagnes([data, ...campagnes])
      setSelected(data)
    }
    setForm({ nom: "", type_campagne: "", zone_geo: "", date_debut: "", date_fin: "", description: "" })
    setShowForm(false)
    setLoadingForm(false)
  }

  async function updateStatutDemande(id: string, statut: string) {
    await supabase.from("campagnes").update({ statut }).eq("id", id)
    setDemandesClient(demandesClient.map(d => d.id === id ? { ...d, statut } : d))
  }

  const demandesEnAttente = demandesClient.filter(d => d.statut === "soumise").length
  const campagnesActives  = campagnes.filter(c => c.statut === "en_cours").length
  const totalBiensClients = demandesClient.reduce((acc, d) => acc + (d.campagnes_actifs?.length || 0), 0)

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

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0",
    borderRadius: "7px", fontSize: "13px", color: "#0F172A",
    background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  }

  const lStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8",
    marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.07em",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement...</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <button onClick={() => navigate("/metier")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit", width: "fit-content" }}>
        <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
        {[
          { label: "Campagnes actives",   val: campagnesActives,      color: "#0F172A" },
          { label: "Demandes en attente", val: demandesEnAttente,     color: demandesEnAttente > 0 ? "#B91C1C" : "#065F46" },
          { label: "Biens clients",       val: totalBiensClients,     color: "#0369A1" },
          { label: "Total campagnes AGE", val: campagnes.length,      color: "#0F172A" },
          { label: "Total demandes",      val: demandesClient.length, color: "#0F172A" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "6px" }}>{k.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 500, color: k.color, fontFamily: "monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex" }}>
          {(([
  { key: "age",     label: "Campagnes AGE",    icon: "ti-speakerphone", count: campagnes.length,      badge: campagnesActives > 0 ? campagnesActives : null, badgeBg: "#ECFDF5", badgeColor: "#065F46" },
  ...( roleAGE !== "responsable_regional" ? [{ key: "clients", label: "Demandes clients", icon: "ti-users", count: demandesClient.length, badge: demandesEnAttente > 0 ? demandesEnAttente : null, badgeBg: "#FEF2F2", badgeColor: "#991B1B" }] : []),
]) as const).map(o => (
            <button key={o.key} onClick={() => { setOnglet(o.key); setSelected(null); setShowForm(false) }} style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "10px 20px", background: "transparent", border: "none",
              borderBottom: onglet === o.key ? "2px solid #0F6E56" : "2px solid transparent",
              color: onglet === o.key ? "#0F6E56" : "#64748B",
              fontWeight: onglet === o.key ? 600 : 400,
              fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
              marginBottom: "-1px",
            }}>
              <i className={"ti " + o.icon} style={{ fontSize: "15px" }} />
              {o.label}
              <span style={{ background: o.badge ? o.badgeBg : "#F1F5F9", color: o.badge ? o.badgeColor : "#64748B", fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "10px" }}>
                {o.badge ?? o.count}
              </span>
            </button>
          ))}
        </div>
        {onglet === "age" && (
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "15px" }} />
            Nouvelle campagne
          </button>
        )}
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94A3B8" }} />
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher..." style={{ width: "100%", padding: "6px 9px 6px 30px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
        </div>
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", background: "white", color: "#0F172A" }}>
          <option value="tous">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="soumise">Soumise</option>
          <option value="validee">Validee</option>
          <option value="terminee">Terminee</option>
        </select>
        {onglet === "age" && (
          <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", background: "white", color: "#0F172A" }}>
            <option value="tous">Tous les types</option>
            <option value="sensibilisation">Sensibilisation</option>
            <option value="scoring">Scoring</option>
            <option value="pre_diagnostic">Pre-diagnostic</option>
          </select>
        )}
      </div>

      {showForm && onglet === "age" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "16px" }}>Nouvelle campagne AGE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lStyle}>Nom *</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Campagne RGA 2026" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Type *</label>
              <select value={form.type_campagne} onChange={e => setForm({ ...form, type_campagne: e.target.value })} style={{ ...iStyle, cursor: "pointer" }}>
                <option value="">Choisir...</option>
                <option value="sensibilisation">Sensibilisation</option>
                <option value="scoring">Scoring</option>
                <option value="pre_diagnostic">Pre-diagnostic</option>
              </select>
            </div>
            <div>
              <label style={lStyle}>Zone</label>
              <input value={form.zone_geo} onChange={e => setForm({ ...form, zone_geo: e.target.value })} placeholder="Ex : Nouvelle-Aquitaine" style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date debut</label>
              <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Date fin</label>
              <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={iStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lStyle}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Objectifs..." style={{ ...iStyle, resize: "vertical" as const }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={handleCreerCampagne} disabled={!form.nom || !form.type_campagne || loadingForm} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: form.nom && form.type_campagne ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              {loadingForm ? "Creation..." : "Lancer"}
            </button>
          </div>
        </div>
      )}

      {onglet === "age" && (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "300px 1fr" : "1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {campagnesFiltrees.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune campagne</div>
            ) : campagnesFiltrees.map(c => {
              const statut = STATUT_CONFIG[c.statut] || STATUT_CONFIG.en_cours
              const type   = TYPE_CONFIG[c.type_campagne]
              const taux   = c.courriers_envoyes > 0 ? Math.round(c.reponses / c.courriers_envoyes * 100) : 0
              const isSelected = selected?.id === c.id
              return (
                <div key={c.id} onClick={() => navigate("/metier/campagnes-age/" + c.id)} style={{ background: "#FFFFFF", border: "1px solid " + (isSelected ? "#0F6E56" : "#E2E8F0"), borderRadius: "10px", padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", flex: 1, paddingRight: "8px" }}>{c.nom}</div>
                    <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
                    {type && <span style={{ background: type.bg, color: type.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                    {c.zone_geo && <span style={{ fontSize: "11px", color: "#94A3B8" }}>{c.zone_geo}</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "8px" }}>{c.date_debut} {"->"} {c.date_fin || "—"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                      <div style={{ background: "#0F6E56", width: taux + "%", height: "100%", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "monospace" }}>{taux} %</span>
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                {[
                  { label: "Courriers", val: selected.courriers_envoyes, icon: "ti-mail" },
                  { label: "Reponses",  val: selected.reponses,          icon: "ti-mail-opened" },
                  { label: "RDV",       val: selected.rdv_pris,          icon: "ti-calendar" },
                  { label: "Diag.",     val: selected.diagnostics,       icon: "ti-clipboard-list" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <i className={"ti " + k.icon} style={{ fontSize: "14px", color: "#94A3B8" }} />
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const }}>{k.label}</div>
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 500, color: "#0F172A" }}>{k.val?.toLocaleString("fr-FR") ?? "—"}</div>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, marginBottom: "8px" }}>Description</div>
                  <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
                </div>
              )}
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Performance hebdomadaire</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={perfData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="semaine" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="reponses" stroke="#0F6E56" fill="#ECFDF5" strokeWidth={2} name="Reponses" />
                    <Area type="monotone" dataKey="rdv" stroke="#0369A1" fill="#EFF6FF" strokeWidth={2} name="RDV" />
                    <Area type="monotone" dataKey="diagnostics" stroke="#D97706" fill="#FFFBEB" strokeWidth={2} name="Diagnostics" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-download" style={{ fontSize: "14px" }} /> Exporter
                </button>
                <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-send" style={{ fontSize: "14px" }} /> Relance
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {onglet === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {demandesEnAttente > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "16px", color: "#D97706" }} />
              <span style={{ fontSize: "13px", color: "#92400E", fontWeight: 500 }}>{demandesEnAttente} demande{demandesEnAttente > 1 ? "s" : ""} en attente</span>
            </div>
          )}
          {demandesFiltrees.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
              <i className="ti ti-inbox" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} />
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune demande</div>
            </div>
          ) : demandesFiltrees.map(d => {
            const statut = STATUT_CONFIG[d.statut] || STATUT_CONFIG.soumise
            const type   = TYPE_CONFIG[d.type_campagne]
            const estTraitee = ["validee", "en_cours", "terminee"].includes(d.statut)
            const nbBiens = d.campagnes_actifs?.length || 0
            return (
              <div key={d.id} onClick={() => navigate("/metier/campagnes/" + d.id)} style={{ background: "#FFFFFF", border: "1px solid " + (d.statut === "soumise" ? "#FDE68A" : "#E2E8F0"), borderRadius: "10px", overflow: "hidden", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#0F6E56")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = d.statut === "soumise" ? "#FDE68A" : "#E2E8F0")}
              >
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                      {type && <span style={{ background: type.bg, color: type.color, padding: "2px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{d.nom || "Campagne sans nom"}</div>
                    {d.client && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <i className="ti ti-user" style={{ fontSize: "12px", color: "#94A3B8" }} />
                        <span style={{ fontSize: "12px", color: "#64748B" }}>{d.client.prenom} {d.client.nom}</span>
                        {d.client.profil && <span style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: "10px", fontWeight: 500, padding: "1px 6px", borderRadius: "3px" }}>{d.client.profil}</span>}
                      </div>
                    )}
                    {d.zone_geo && <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}><i className="ti ti-map-pin" style={{ fontSize: "12px", marginRight: "3px" }} />{d.zone_geo}</div>}
                    {nbBiens > 0 && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "4px" }}>{nbBiens} bien{nbBiens > 1 ? "s" : ""}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {(d.campagnes_actifs || []).slice(0, 3).map((ca: any, i: number) => (
                            <div key={i} style={{ fontSize: "11px", color: "#64748B", display: "flex", alignItems: "center", gap: "5px" }}>
                              <i className="ti ti-building" style={{ fontSize: "11px", color: "#94A3B8" }} />
                              {ca.actif?.nom} - {ca.actif?.ville}{ca.actif?.surface ? " " + ca.actif.surface + " m2" : ""}
                            </div>
                          ))}
                          {nbBiens > 3 && <div style={{ fontSize: "11px", color: "#94A3B8" }}>+ {nbBiens - 3} autre{nbBiens - 3 > 1 ? "s" : ""}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "6px", flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    {!estTraitee && d.statut === "soumise" && (
                      <>
                        <button onClick={() => updateStatutDemande(d.id, "en_qualification")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-search" style={{ fontSize: "12px" }} /> Qualifier
                        </button>
                        <button onClick={() => updateStatutDemande(d.id, "validee")} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#0F6E56", color: "white", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                          <i className="ti ti-check" style={{ fontSize: "12px" }} /> Valider
                        </button>
                      </>
                    )}
                    <button onClick={() => navigate("/metier/campagnes/" + d.id)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#065F46", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                      <i className="ti ti-eye" style={{ fontSize: "12px" }} /> Voir biens
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}