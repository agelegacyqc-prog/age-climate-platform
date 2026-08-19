import React, { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ReportingParticulier from "./ReportingParticulier"

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  bilan_ges:     { label: "Bilan GES — Scope 1, 2, 3", icon: "ti-leaf",           color: "#065F46", bg: "#ECFDF5" },
  csrd:          { label: "CSRD / ESRS",                icon: "ti-file-analytics", color: "#92400E", bg: "#FFFBEB" },
  bilan_carbone: { label: "Bilan Carbone",              icon: "ti-chart-pie",      color: "#1E40AF", bg: "#EFF6FF" },
  brown_value:   { label: "Brown Value",                icon: "ti-home",           color: "#B25C2A", bg: "#FDF4EF" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  demande:    { label: "Demandé",    color: "#64748B", bg: "#F1F5F9" },
  en_cours:   { label: "En cours",   color: "#92400E", bg: "#FFFBEB" },
  disponible: { label: "Disponible", color: "#065F46", bg: "#ECFDF5" },
}

// Reprise à l'identique de CATEGORIE_CONFIG (GED.tsx, espace métier) pour la cohérence
// visuelle entre les documents vus par le consultant et ceux vus par le client.
const CATEGORIE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  contrat:        { label: "Contrat",        icon: "ti-file-certificate", color: "#92400E", bg: "#FFFBEB" },
  mandat:         { label: "Mandat",         icon: "ti-writing",          color: "#1E40AF", bg: "#EFF6FF" },
  rapport:        { label: "Rapport",        icon: "ti-file-analytics",   color: "#065F46", bg: "#ECFDF5" },
  donnees:        { label: "Données",        icon: "ti-database",        color: "#5B21B6", bg: "#F5F3FF" },
  facture:        { label: "Facture",        icon: "ti-receipt",         color: "#B25C2A", bg: "#FDF0E8" },
  photo:          { label: "Photo",          icon: "ti-photo",           color: "#0369A1", bg: "#EFF6FF" },
  diagnostic:     { label: "Diagnostic",     icon: "ti-stethoscope",     color: "#0F6E56", bg: "#ECFDF5" },
  plan_action:    { label: "Plan d'action",  icon: "ti-list-check",      color: "#7C3AED", bg: "#F5F3FF" },
  correspondance: { label: "Correspondance", icon: "ti-mail",            color: "#475569", bg: "#F1F5F9" },
  autre:          { label: "Autre",          icon: "ti-file",            color: "#64748B", bg: "#F1F5F9" },
}

const BUCKET_RAPPORTS = "rapports-client"
const BUCKET_DOCUMENTS = "documents-clients"

// ── Type unifié pour la recherche/filtrage (rapports_client + documents) ──────

interface ElementUnifie {
  id: string
  source: "rapport" | "document"
  cleType: string                 // clé brute dans TYPE_CONFIG ou CATEGORIE_CONFIG
  label: string
  icon: string
  color: string
  bg: string
  date: string                    // rapports: updated_at si disponible sinon created_at / documents: created_at
  actifId: string | null
  actifNom: string | null
  statut: string | null           // rapports uniquement (demande/en_cours/disponible)
  periode: string | null          // rapports uniquement
  kpis: Record<string, any>
  fichierChemin: string | null    // storage_path (documents) ou fichier_url (rapports) — chemin bucket
  bucket: string
}

export default function ClientReporting() {
  const navigate = useNavigate()
  const [rapports, setRapports]         = useState<any[]>([])
  const [documents, setDocuments]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [formType, setFormType]         = useState("")
  const [formPeriode, setFormPeriode]   = useState("")
  const [formActifId, setFormActifId]   = useState("")
  const [actifsForm, setActifsForm]     = useState<any[]>([])
  const [loadingForm, setLoadingForm]   = useState(false)
  const [succesForm, setSuccesForm]     = useState(false)
  const [erreurForm, setErreurForm]     = useState("")
  const [typeClient, setTypeClient]     = useState<string | null>(null)

  // Recherche & filtres
  const [recherche, setRecherche]           = useState("")
  const [filtreType, setFiltreType]         = useState("tous")
  const [filtreActif, setFiltreActif]       = useState("tous")
  const [filtreDateDebut, setFiltreDateDebut] = useState("")
  const [filtreDateFin, setFiltreDateFin]     = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profilData } = await supabase
      .from("profils_client")
      .select("type_client")
      .eq("id", user.id)
      .maybeSingle()
    setTypeClient(profilData?.type_client || null)

    if (profilData?.type_client === "proprietaire") {
      setLoading(false)
      return
    }

    const [{ data: raps }, { data: docs }, { data: actsForm }] = await Promise.all([
      supabase
        .from("rapports_client")
        .select("*, actif:actif_id(id, nom)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id, nom, categorie, created_at, actif_id, storage_path, actif:actif_id(id, nom)")
        .eq("client_id", user.id)
        .eq("visible_client", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("actifs")
        .select("id, nom")
        .eq("user_id", user.id)
        .eq("categorie", "patrimoine_propre")
        .order("created_at", { ascending: false }),
    ])
    setRapports(raps || [])
    setDocuments(docs || [])
    setActifsForm(actsForm || [])
    setLoading(false)

    await supabase
      .from("rapports_client")
      .update({ vu_client: true })
      .eq("client_id", user.id)
      .eq("statut", "disponible")
      .eq("vu_client", false)
  }

  async function handleDemander() {
    if (!formType) { setErreurForm("Veuillez choisir un type de rapport."); return }
    setLoadingForm(true); setErreurForm("")
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("rapports_client").insert({
      client_id:    user!.id,
      type_rapport: formType,
      periode:      formPeriode || null,
      actif_id:     formActifId || null,
      statut:       "demande",
    })
    if (error) { setErreurForm("Erreur lors de la demande."); setLoadingForm(false); return }
    setSuccesForm(true)
    setLoadingForm(false)
    setTimeout(() => {
      setSuccesForm(false); setShowForm(false)
      setFormType(""); setFormPeriode(""); setFormActifId("")
      load()
    }, 2500)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  async function telechargerFichier(bucket: string, cheminFichier: string) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(cheminFichier, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  // ── Fusion rapports + documents en une liste unique de recherche ────────────

  const elements: ElementUnifie[] = useMemo(() => {
    const depuisRapports: ElementUnifie[] = rapports.map(r => {
      const type = TYPE_CONFIG[r.type_rapport] || { label: r.type_rapport, icon: "ti-file", color: "#64748B", bg: "#F1F5F9" }
      return {
        id: r.id,
        source: "rapport",
        cleType: r.type_rapport,
        label: type.label,
        icon: type.icon,
        color: type.color,
        bg: type.bg,
        date: r.statut === "disponible" ? (r.updated_at || r.created_at) : r.created_at,
        actifId: r.actif_id,
        actifNom: (r.actif as any)?.nom ?? null,
        statut: r.statut,
        periode: r.periode,
        kpis: r.kpis || {},
        fichierChemin: r.fichier_url,
        bucket: BUCKET_RAPPORTS,
      }
    })

    const depuisDocuments: ElementUnifie[] = documents.map(d => {
      const cat = CATEGORIE_CONFIG[d.categorie] || CATEGORIE_CONFIG.autre
      return {
        id: d.id,
        source: "document",
        cleType: d.categorie,
        label: d.nom,
        icon: cat.icon,
        color: cat.color,
        bg: cat.bg,
        date: d.created_at,
        actifId: d.actif_id,
        actifNom: (d.actif as any)?.nom ?? null,
        statut: null,
        periode: null,
        kpis: {},
        fichierChemin: d.storage_path,
        bucket: BUCKET_DOCUMENTS,
      }
    })

    return [...depuisRapports, ...depuisDocuments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [rapports, documents])

  // Options de filtre "type" construites dynamiquement à partir des éléments présents
  const optionsType = useMemo(() => {
    const vus = new Map<string, string>()
    elements.forEach(el => {
      const cle = `${el.source}:${el.cleType}`
      if (!vus.has(cle)) vus.set(cle, el.label)
    })
    return Array.from(vus.entries())
  }, [elements])

  // Options de filtre "bien" construites à partir des actifs réellement référencés
  const optionsActif = useMemo(() => {
    const vus = new Map<string, string>()
    elements.forEach(el => {
      if (el.actifId && el.actifNom && !vus.has(el.actifId)) vus.set(el.actifId, el.actifNom)
    })
    return Array.from(vus.entries())
  }, [elements])

  const elementsFiltres = useMemo(() => {
    return elements.filter(el => {
      if (recherche.trim() && !el.label.toLowerCase().includes(recherche.trim().toLowerCase())) return false
      if (filtreType !== "tous" && `${el.source}:${el.cleType}` !== filtreType) return false
      if (filtreActif !== "tous" && el.actifId !== filtreActif) return false
      if (filtreDateDebut && new Date(el.date) < new Date(filtreDateDebut)) return false
      if (filtreDateFin && new Date(el.date) > new Date(filtreDateFin + "T23:59:59")) return false
      return true
    })
  }, [elements, recherche, filtreType, filtreActif, filtreDateDebut, filtreDateFin])

  const nbDisponibles = rapports.filter(r => r.statut === "disponible").length
  const nbEnCours     = rapports.filter(r => r.statut === "en_cours").length
  const nbDemandes    = rapports.filter(r => r.statut === "demande").length

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  if (typeClient === "proprietaire") return <ReportingParticulier />

  const selectStyle: React.CSSProperties = {
    padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px",
    fontSize: "12px", fontFamily: "inherit", outline: "none", background: "white", cursor: "pointer",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour
        </button>
        <button onClick={() => setShowForm(true)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Demander un rapport
        </button>
      </div>

      {/* KPIs globaux */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        {[
          { label: "Rapports disponibles",    val: nbDisponibles, color: "#065F46" },
          { label: "En cours de génération",  val: nbEnCours,     color: "#D97706" },
          { label: "Demandes en attente",     val: nbDemandes,    color: "#64748B" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>{k.label}</div>
            <div style={{ fontSize: "26px", fontWeight: 500, color: k.color, fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Formulaire de demande */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px 24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Nouvelle demande de rapport</div>
          {erreurForm && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#991B1B" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />{erreurForm}
            </div>
          )}
          {succesForm ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px", padding: "14px 16px" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "20px", color: "#0F6E56" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 500 }}>Demande enregistrée — AGE Climate vous recontacte sous 48h.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>Type de rapport *</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}>
                  <option value="">Choisir…</option>
                  {Object.entries(TYPE_CONFIG).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>Période</label>
                <input value={formPeriode} onChange={e => setFormPeriode(e.target.value)} placeholder="Ex : 2024, Q1 2025" style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              {actifsForm.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "5px" }}>Actif concerné</label>
                  <select value={formActifId} onChange={e => setFormActifId(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}>
                    <option value="">Transverse (tous les actifs)</option>
                    {actifsForm.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => { setShowForm(false); setErreurForm("") }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>Annuler</button>
                <button onClick={handleDemander} disabled={loadingForm} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: loadingForm ? "wait" : "pointer", fontFamily: "inherit", opacity: loadingForm ? 0.7 : 1 }}>
                  <i className="ti ti-send" style={{ fontSize: "14px" }} aria-hidden="true" />
                  {loadingForm ? "Envoi…" : "Envoyer la demande"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recherche & filtres */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", gap: "10px", flexWrap: "wrap" as const, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94A3B8" }} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher un document ou un rapport…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 30px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}
          />
        </div>
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={selectStyle}>
          <option value="tous">Tous les types</option>
          {optionsType.map(([cle, label]) => <option key={cle} value={cle}>{label}</option>)}
        </select>
        <select value={filtreActif} onChange={e => setFiltreActif(e.target.value)} style={selectStyle}>
          <option value="tous">Tous les biens</option>
          {optionsActif.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
        </select>
        <input type="date" value={filtreDateDebut} onChange={e => setFiltreDateDebut(e.target.value)} style={selectStyle} />
        <span style={{ color: "#94A3B8", fontSize: "12px" }}>→</span>
        <input type="date" value={filtreDateFin} onChange={e => setFiltreDateFin(e.target.value)} style={selectStyle} />
      </div>

      {/* Liste unifiée rapports + documents */}
      {elementsFiltres.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-file-analytics" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>
            {elements.length === 0 ? "Aucun document" : "Aucun résultat pour ces filtres"}
          </div>
          {elements.length === 0 && (
            <>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Demandez votre premier rapport réglementaire</div>
              <button onClick={() => setShowForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
                Demander un rapport
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {elementsFiltres.map(el => {
            const statut = el.statut ? (STATUT_CONFIG[el.statut] || STATUT_CONFIG.demande) : null
            const peutTelecharger = el.source === "document" || el.statut === "disponible"

            return (
              <div key={`${el.source}-${el.id}`} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "8px", background: el.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${el.icon}`} style={{ fontSize: "20px", color: el.color }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{el.label}</span>
                        {statut && <span style={{ background: statut.bg, color: statut.color, fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "4px" }}>{statut.label}</span>}
                        {el.source === "document" && <span style={{ background: "#F1F5F9", color: "#64748B", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>Document</span>}
                        {el.periode && <span style={{ background: "#F1F5F9", color: "#64748B", fontSize: "11px", padding: "2px 8px", borderRadius: "4px" }}>{el.periode}</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: peutTelecharger && Object.keys(el.kpis).length > 0 ? "10px" : "0" }}>
                        {el.source === "rapport"
                          ? (el.statut === "disponible" ? `Généré le ${formatDate(el.date)}` : `Demandé le ${formatDate(el.date)}`)
                          : `Ajouté le ${formatDate(el.date)}`}
                        {el.actifNom && ` · Actif : ${el.actifNom}`}
                      </div>

                      {/* KPIs si rapport disponible */}
                      {peutTelecharger && Object.keys(el.kpis).length > 0 && (
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                          {Object.entries(el.kpis).map(([k, v]: [string, any]) => (
                            <div key={k} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{v}</div>
                              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{k}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Barre de progression si rapport en cours */}
                      {el.statut === "en_cours" && el.kpis.progression && (
                        <div style={{ marginTop: "8px" }}>
                          <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden", width: "260px", maxWidth: "100%" }}>
                            <div style={{ background: "#D97706", width: `${el.kpis.progression}%`, height: "100%", borderRadius: "3px" }} />
                          </div>
                          <p style={{ fontSize: "11px", color: "#94A3B8", margin: "4px 0 0" }}>{el.kpis.progression} % — {el.kpis.etape || "en cours"}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {peutTelecharger && el.fichierChemin ? (
                      <button onClick={() => telechargerFichier(el.bucket, el.fichierChemin!)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none", background: el.color, color: "white", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-download" style={{ fontSize: "14px" }} aria-hidden="true" /> {el.source === "document" ? "Télécharger" : "PDF"}
                      </button>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#94A3B8", fontSize: "12px", opacity: 0.6 }}>
                        <i className="ti ti-download" style={{ fontSize: "14px" }} aria-hidden="true" /> PDF
                      </span>
                    )}
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
