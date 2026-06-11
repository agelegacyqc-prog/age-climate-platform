import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────
interface LigneFacture {
  id?: string
  ordre: number
  designation: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  taux_tva: number
}

interface Facture {
  id: string
  numero: string
  type: "AGE_client" | "partenaire_AGE"
  emetteur_raison_sociale: string
  emetteur_siren: string
  emetteur_adresse: string
  emetteur_tva_intracom: string
  destinataire_raison_sociale: string
  destinataire_siren: string
  destinataire_adresse: string
  destinataire_tva_intracom: string
  mission_id: string | null
  campagne_id: string | null
  date_emission: string
  date_echeance: string
  total_ht: number
  total_tva: number
  total_ttc: number
  statut: "brouillon" | "emise" | "payee" | "en_retard"
  conditions_paiement: string
  taux_penalites: string
  escompte: string
  notes: string
  created_at: string
}

interface ClientPlateforme {
  id: string
  prenom: string
  nom: string
  raison_sociale: string
  siren: string
  adresse: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatEur(val: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(val) + " €"
}

function formatDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function generateNumero(): string {
  const annee = new Date().getFullYear()
  const seq   = Math.floor(Math.random() * 900) + 100
  return `FAC-${annee}-AG${seq}`
}

// Calcul TVA intracommunautaire FR depuis SIREN (article 289 A CGI)
function calculerTvaIntracom(siren: string): string {
  const s = siren.replace(/\s/g, "")
  if (s.length !== 9 || isNaN(Number(s))) return ""
  const cle = (12 + 3 * (Number(s) % 97)) % 97
  return `FR${String(cle).padStart(2, "0")}${s}`
}

function calcLigne(l: LigneFacture) {
  const ht  = l.quantite * l.prix_unitaire_ht
  const tva = Math.round(ht * l.taux_tva) / 100
  return { ht, tva, ttc: ht + tva }
}

function calcTotaux(lignes: LigneFacture[]) {
  return lignes.reduce(
    (acc, l) => { const { ht, tva, ttc } = calcLigne(l); return { ht: acc.ht + ht, tva: acc.tva + tva, ttc: acc.ttc + ttc } },
    { ht: 0, tva: 0, ttc: 0 }
  )
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  brouillon: { label: "Brouillon", color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", icon: "ti-pencil" },
  emise:     { label: "Émise",     color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", icon: "ti-send" },
  payee:     { label: "Payée",     color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", icon: "ti-circle-check" },
  en_retard: { label: "En retard", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", icon: "ti-alert-triangle" },
}

const TVA_TAUX = [0, 5.5, 10, 20]

// ─── Composant recherche entreprise ──────────────────────────────────────────
interface RechercheEntrepriseProps {
  prefix: "emetteur" | "destinataire"
  form: any
  setForm: (fn: (f: any) => any) => void
  clientsPlateforme?: ClientPlateforme[]
}

function RechercheEntreprise({ prefix, form, setForm, clientsPlateforme }: RechercheEntrepriseProps) {
  const [query, setQuery]             = useState(form[`${prefix}_raison_sociale`] || "")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [searching, setSearching]     = useState(false)
  const [showDrop, setShowDrop]       = useState(false)
  const [modeClient, setModeClient]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function rechercher(q: string) {
    setQuery(q)
    if (q.length < 3) { setSuggestions([]); setShowDrop(false); return }
    setSearching(true)
    try {
      const res  = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&limit=6`)
      const data = await res.json()
      setSuggestions(data.results || [])
      setShowDrop(true)
    } catch { setSuggestions([]) }
    setSearching(false)
  }

  function selectEntreprise(e: any) {
    const siege   = e.siege || {}
    const siren   = (e.siren || "").replace(/\s/g, "")
    const adresse = [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune].filter(Boolean).join(" ")
    const rs      = e.nom_complet || e.nom_raison_sociale || ""
    setQuery(rs)
    setForm((f: any) => ({
      ...f,
      [`${prefix}_raison_sociale`]: rs,
      [`${prefix}_siren`]:          siren,
      [`${prefix}_adresse`]:        adresse,
      [`${prefix}_tva_intracom`]:   calculerTvaIntracom(siren),
    }))
    setSuggestions([])
    setShowDrop(false)
  }

  function selectClient(c: ClientPlateforme) {
    const rs = c.raison_sociale || `${c.prenom || ""} ${c.nom || ""}`.trim()
    setQuery(rs)
    setForm((f: any) => ({
      ...f,
      [`${prefix}_raison_sociale`]: rs,
      [`${prefix}_siren`]:          c.siren || "",
      [`${prefix}_adresse`]:        c.adresse || "",
      [`${prefix}_tva_intracom`]:   c.siren ? calculerTvaIntracom(c.siren) : "",
    }))
    setShowDrop(false)
    setModeClient(false)
  }

  function effacer() {
    setQuery("")
    setForm((f: any) => ({
      ...f,
      [`${prefix}_raison_sociale`]: "",
      [`${prefix}_siren`]:          "",
      [`${prefix}_adresse`]:        "",
      [`${prefix}_tva_intracom`]:   "",
    }))
  }

  const clientsFiltres = (clientsPlateforme || [])
    .filter(c => {
      const rs = (c.raison_sociale || `${c.prenom} ${c.nom}`).toLowerCase()
      return query.length >= 2 ? rs.includes(query.toLowerCase()) : true
    })
    .slice(0, 6)

  const dejaRempli = !!form[`${prefix}_raison_sociale`]

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
        {prefix === "emetteur" ? "Émetteur" : "Destinataire"}
      </div>

      {/* Sélecteur mode — destinataire uniquement */}
      {prefix === "destinataire" && clientsPlateforme && clientsPlateforme.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {[
            { val: false, label: "Recherche libre",    icon: "ti-search" },
            { val: true,  label: "Client plateforme",  icon: "ti-users"  },
          ].map(m => (
            <button
              key={String(m.val)}
              onClick={() => { setModeClient(m.val); setQuery(""); setShowDrop(m.val) }}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 14px", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit",
                border: modeClient === m.val ? "1px solid #B25C2A" : "1px solid #E2E8F0",
                background: modeClient === m.val ? "#FEF3EC" : "#FFFFFF",
                color: modeClient === m.val ? "#B25C2A" : "#64748B",
                fontSize: "12px", fontWeight: modeClient === m.val ? 600 : 400,
              }}
            >
              <i className={`ti ${m.icon}`} style={{ fontSize: "12px" }} />
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Champ recherche */}
      <div ref={ref} style={{ position: "relative", marginBottom: dejaRempli ? "12px" : "0" }}>
        <div style={{ position: "relative" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94A3B8" }} />
          <input
            value={query}
            onChange={e => {
              if (modeClient) { setQuery(e.target.value); setShowDrop(true) }
              else rechercher(e.target.value)
            }}
            onFocus={() => { if (modeClient) setShowDrop(true) }}
            placeholder={modeClient ? "Nom ou raison sociale du client…" : "Rechercher par raison sociale…"}
            style={{ width: "100%", padding: "9px 36px 9px 32px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
          />
          {searching && <i className="ti ti-loader-2 ti-spin" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94A3B8" }} />}
          {dejaRempli && !searching && (
            <button onClick={effacer} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: "2px", display: "flex" }}>
              <i className="ti ti-x" style={{ fontSize: "14px" }} />
            </button>
          )}
        </div>

        {/* Dropdown API */}
        {showDrop && !modeClient && suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 100, overflow: "hidden" }}>
            {suggestions.map((s, i) => {
              const siren = (s.siren || "").replace(/\s/g, "")
              const tva   = calculerTvaIntracom(siren)
              return (
                <div key={i} onClick={() => selectEntreprise(s)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid #F1F5F9" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "2px" }}>{s.nom_complet || s.nom_raison_sociale}</div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", display: "flex", gap: "12px" }}>
                    {siren && <span>SIREN : {siren}</span>}
                    {tva   && <span>TVA : {tva}</span>}
                    {s.siege?.libelle_commune && <span>{s.siege.libelle_commune}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Dropdown clients plateforme */}
        {showDrop && modeClient && clientsFiltres.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 100, overflow: "hidden" }}>
            {clientsFiltres.map((c, i) => {
              const rs = c.raison_sociale || `${c.prenom || ""} ${c.nom || ""}`.trim()
              return (
                <div key={i} onClick={() => selectClient(c)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < clientsFiltres.length - 1 ? "1px solid #F1F5F9" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "2px" }}>{rs}</div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", display: "flex", gap: "12px" }}>
                    {c.prenom && c.nom && c.raison_sociale && <span>{c.prenom} {c.nom}</span>}
                    {c.siren && <span>SIREN : {c.siren}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Champs remplis — éditables */}
      {dejaRempli && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { field: "raison_sociale", label: "Raison sociale",              multiline: false },
            { field: "siren",          label: "SIREN",                        multiline: false },
            { field: "tva_intracom",   label: "N° TVA intracommunautaire",   multiline: false },
            { field: "adresse",        label: "Adresse",                      multiline: true  },
          ].map(({ field, label, multiline }) => (
            <div key={field}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</label>
              {multiline ? (
                <textarea
                  value={form[`${prefix}_${field}`] || ""}
                  onChange={e => setForm((f: any) => ({ ...f, [`${prefix}_${field}`]: e.target.value }))}
                  rows={2}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
              ) : (
                <input
                  value={form[`${prefix}_${field}`] || ""}
                  onChange={e => setForm((f: any) => ({ ...f, [`${prefix}_${field}`]: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Factures() {
  const navigate = useNavigate()
  const [factures, setFactures]                     = useState<Facture[]>([])
  const [loading, setLoading]                       = useState(true)
  const [vue, setVue]                               = useState<"liste" | "form" | "detail">("liste")
  const [factureSelectee, setFactureSelectee]       = useState<any>(null)
  const [filtreStatut, setFiltreStatut]             = useState("tous")
  const [filtreType, setFiltreType]                 = useState("tous")
  const [saving, setSaving]                         = useState(false)
  const [missions, setMissions]                     = useState<any[]>([])
  const [campagnes, setCampagnes]                   = useState<any[]>([])
  const [clientsPlateforme, setClientsPlateforme]   = useState<ClientPlateforme[]>([])

  const formVide = {
    type: "AGE_client" as const,
    date_emission: new Date().toISOString().split("T")[0],
    date_echeance: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    statut: "brouillon" as const,
    conditions_paiement: "30 jours nets",
    taux_penalites: "3 fois le taux légal en vigueur",
    escompte: "Aucun escompte pour paiement anticipé",
    emetteur_raison_sociale: "", emetteur_siren: "", emetteur_adresse: "", emetteur_tva_intracom: "",
    destinataire_raison_sociale: "", destinataire_siren: "", destinataire_adresse: "", destinataire_tva_intracom: "",
    mission_id: null as string | null,
    campagne_id: null as string | null,
    notes: "",
  }

  const [form, setForm] = useState<any>({ ...formVide })
  const [lignes, setLignes] = useState<LigneFacture[]>([
    { ordre: 1, designation: "", quantite: 1, unite: "forfait", prix_unitaire_ht: 0, taux_tva: 20 }
  ])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [factRes, missRes, campRes, clientRes] = await Promise.all([
      supabase.from("factures").select("*").order("created_at", { ascending: false }),
      supabase.from("missions").select("id, societe").order("created_at", { ascending: false }).limit(50),
      supabase.from("campagnes").select("id, nom").order("created_at", { ascending: false }).limit(50),
      supabase.from("profils_client").select("id, prenom, nom").order("created_at", { ascending: false }),
    ])

    // Enrichir avec organisations
    const clients = clientRes.data || []
    const { data: orgsData } = await supabase
      .from("organisations")
      .select("id, nom, siren, adresse")

    const orgsMap: Record<string, any> = {}
    orgsData?.forEach((o: any) => { orgsMap[o.id] = o })

    const clientsEnrichis: ClientPlateforme[] = clients.map((c: any) => ({
      id:             c.id,
      prenom:         c.prenom || "",
      nom:            c.nom    || "",
      raison_sociale: orgsMap[c.id]?.nom     || "",
      siren:          orgsMap[c.id]?.siren   || "",
      adresse:        orgsMap[c.id]?.adresse || "",
    }))

    setFactures(factRes.data || [])
    setMissions(missRes.data || [])
    setCampagnes(campRes.data || [])
    setClientsPlateforme(clientsEnrichis)
    setLoading(false)
  }

  async function saveFacture() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const totaux = calcTotaux(lignes)
    const numero = form.id ? form.numero : generateNumero()

    const payload = {
      ...form,
      numero,
      total_ht:   Math.round(totaux.ht  * 100) / 100,
      total_tva:  Math.round(totaux.tva * 100) / 100,
      total_ttc:  Math.round(totaux.ttc * 100) / 100,
      created_by: user?.id,
    }
    delete payload.lignes

    let factureId = form.id
    if (form.id) {
      await supabase.from("factures").update(payload).eq("id", form.id)
    } else {
      const { data } = await supabase.from("factures").insert([payload]).select()
      factureId = data?.[0]?.id
    }

    if (factureId) {
      await supabase.from("factures_lignes").delete().eq("facture_id", factureId)
      await supabase.from("factures_lignes").insert(
        lignes.map((l, i) => ({
          facture_id: factureId, ordre: i + 1,
          designation: l.designation, quantite: l.quantite,
          unite: l.unite, prix_unitaire_ht: l.prix_unitaire_ht, taux_tva: l.taux_tva,
        }))
      )
    }

    await loadData()
    setSaving(false)
    setVue("liste")
    setForm({ ...formVide })
    setLignes([{ ordre: 1, designation: "", quantite: 1, unite: "forfait", prix_unitaire_ht: 0, taux_tva: 20 }])
  }

  async function changerStatut(id: string, statut: string) {
    await supabase.from("factures").update({ statut }).eq("id", id)
    await loadData()
    setFactureSelectee((prev: any) => prev ? { ...prev, statut } : null)
  }

  async function supprimerFacture(id: string) {
    if (!confirm("Supprimer cette facture ? Cette action est irréversible.")) return
    await supabase.from("factures").delete().eq("id", id)
    await loadData()
    setVue("liste")
  }

  async function ouvrirEdition(f: any) {
    const { data: lignesData } = await supabase.from("factures_lignes").select("*").eq("facture_id", f.id).order("ordre")
    setForm({ ...f })
    setLignes(lignesData?.map((l: any) => ({
      id: l.id, ordre: l.ordre, designation: l.designation,
      quantite: l.quantite, unite: l.unite,
      prix_unitaire_ht: l.prix_unitaire_ht, taux_tva: l.taux_tva,
    })) || [])
    setVue("form")
  }

  async function ouvrirDetail(f: Facture) {
    const { data: lignesData } = await supabase.from("factures_lignes").select("*").eq("facture_id", f.id).order("ordre")
    setFactureSelectee({ ...f, lignes: lignesData || [] })
    setVue("detail")
  }

  const facturesFiltrees = factures.filter(f =>
    (filtreStatut === "tous" || f.statut === filtreStatut) &&
    (filtreType   === "tous" || f.type   === filtreType)
  )

  const totalEmis   = factures.filter(f => f.statut !== "brouillon").reduce((s, f) => s + (f.total_ttc || 0), 0)
  const totalPayees = factures.filter(f => f.statut === "payee").reduce((s, f) => s + (f.total_ttc || 0), 0)
  const totalRetard = factures.filter(f => f.statut === "en_retard").reduce((s, f) => s + (f.total_ttc || 0), 0)
  const nbEnAttente = factures.filter(f => f.statut === "emise").length
  const totauxForm  = calcTotaux(lignes)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#9CA3AF", fontSize: "14px" }}>Chargement…</div>
  )

  // ── VUE DETAIL ──────────────────────────────────────────────────────────────
  if (vue === "detail" && factureSelectee) {
    const f      = factureSelectee
    const statut = STATUT_CONFIG[f.statut]
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setVue("liste")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => ouvrirEdition(f)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-pencil" style={{ fontSize: "14px" }} /> Modifier
            </button>
            {f.statut === "brouillon" && (
              <button onClick={() => changerStatut(f.id, "emise")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1E40AF", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-send" style={{ fontSize: "14px" }} /> Émettre
              </button>
            )}
            {f.statut === "emise" && (
              <button onClick={() => changerStatut(f.id, "payee")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "14px" }} /> Marquer payée
              </button>
            )}
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "40px 48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: "4px" }}>FACTURE</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", color: "#B25C2A", fontWeight: 600 }}>{f.numero}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: statut.bg, color: statut.color, border: `1px solid ${statut.border}`, padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                <i className={`ti ${statut.icon}`} style={{ fontSize: "13px" }} /> {statut.label}
              </span>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>
                Émise le {formatDate(f.date_emission)}<br />Échéance : {formatDate(f.date_echeance)}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "40px" }}>
            {[
              { titre: "Émetteur",      rs: f.emetteur_raison_sociale,      siren: f.emetteur_siren,      tva: f.emetteur_tva_intracom,      adresse: f.emetteur_adresse },
              { titre: "Destinataire",  rs: f.destinataire_raison_sociale,  siren: f.destinataire_siren,  tva: f.destinataire_tva_intracom,  adresse: f.destinataire_adresse },
            ].map((p, i) => (
              <div key={i}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>{p.titre}</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>{p.rs || "—"}</div>
                {p.siren   && <div style={{ fontSize: "12px", color: "#64748B" }}>SIREN : {p.siren}</div>}
                {p.tva     && <div style={{ fontSize: "12px", color: "#64748B" }}>TVA : {p.tva}</div>}
                {p.adresse && <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px", whiteSpace: "pre-line" }}>{p.adresse}</div>}
              </div>
            ))}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Désignation", "Qté", "Unité", "PU HT", "TVA", "Montant HT", "Montant TTC"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: i === 0 ? "left" : "right", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(f.lignes || []).map((l: any, i: number) => {
                const ht  = l.montant_ht  ?? (l.quantite * l.prix_unitaire_ht)
                const ttc = l.montant_ttc ?? (ht + ht * l.taux_tva / 100)
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#0F172A" }}>{l.designation}</td>
                    <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{l.quantite}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#64748B", textAlign: "right" }}>{l.unite}</td>
                    <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(l.prix_unitaire_ht)}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#64748B", textAlign: "right" }}>{l.taux_tva} %</td>
                    <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(ht)}</td>
                    <td style={{ padding: "12px", fontSize: "13px", fontWeight: 600, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{formatEur(ttc)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
            <div style={{ minWidth: "280px" }}>
              {[
                { label: "Total HT",  val: formatEur(f.total_ht),  i: 0 },
                { label: "Total TVA", val: formatEur(f.total_tva), i: 1 },
                { label: "Total TTC", val: formatEur(f.total_ttc), i: 2 },
              ].map((t) => (
                <div key={t.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: t.i < 2 ? "1px solid #F1F5F9" : "none", borderTop: t.i === 2 ? "2px solid #0F172A" : "none", marginTop: t.i === 2 ? "4px" : "0" }}>
                  <span style={{ fontSize: t.i === 2 ? "15px" : "13px", fontWeight: t.i === 2 ? 700 : 400, color: "#0F172A" }}>{t.label}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: t.i === 2 ? "18px" : "13px", fontWeight: t.i === 2 ? 700 : 400, color: t.i === 2 ? "#B25C2A" : "#0F172A" }}>{t.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}><strong style={{ color: "#64748B" }}>Conditions de paiement :</strong> {f.conditions_paiement}</div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}><strong style={{ color: "#64748B" }}>Pénalités de retard :</strong> {f.taux_penalites}</div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}><strong style={{ color: "#64748B" }}>Escompte :</strong> {f.escompte}</div>
            {f.notes && <div style={{ fontSize: "11px", color: "#94A3B8" }}><strong style={{ color: "#64748B" }}>Notes :</strong> {f.notes}</div>}
          </div>
        </div>
      </div>
    )
  }

  // ── VUE FORMULAIRE ──────────────────────────────────────────────────────────
  if (vue === "form") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => { setVue("liste"); setForm({ ...formVide }); setLignes([{ ordre: 1, designation: "", quantite: 1, unite: "forfait", prix_unitaire_ht: 0, taux_tva: 20 }]) }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
          </button>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A" }}>{form.id ? `Modifier ${form.numero}` : "Nouvelle facture"}</div>
          <button onClick={saveFacture} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "8px 20px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
            <i className="ti ti-device-floppy" style={{ fontSize: "14px" }} />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        {/* Type */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>Type de facture</div>
          <div style={{ display: "flex", gap: "10px" }}>
            {[
              { val: "AGE_client",     label: "AGE → Client",     icon: "ti-arrow-right" },
              { val: "partenaire_AGE", label: "Partenaire → AGE", icon: "ti-arrow-left"  },
            ].map(t => (
              <button key={t.val} onClick={() => setForm((f: any) => ({ ...f, type: t.val }))} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", border: form.type === t.val ? "2px solid #B25C2A" : "2px solid #E2E8F0", background: form.type === t.val ? "#FEF3EC" : "#FFFFFF", color: form.type === t.val ? "#B25C2A" : "#64748B", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: "14px" }} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Émetteur + Destinataire */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <RechercheEntreprise prefix="emetteur"     form={form} setForm={setForm} />
          <RechercheEntreprise prefix="destinataire" form={form} setForm={setForm} clientsPlateforme={clientsPlateforme} />
        </div>

        {/* Dates */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Dates &amp; Références</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { field: "date_emission", label: "Date d'émission *", type: "date" },
              { field: "date_echeance", label: "Date d'échéance *", type: "date" },
            ].map(({ field, label, type }) => (
              <div key={field}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>{label}</label>
                <input type={type} value={form[field] || ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Mission liée</label>
              <select value={form.mission_id || ""} onChange={e => setForm((f: any) => ({ ...f, mission_id: e.target.value || null }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", background: "white", boxSizing: "border-box" }}>
                <option value="">—</option>
                {missions.map(m => <option key={m.id} value={m.id}>{m.societe || m.id}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Campagne liée</label>
              <select value={form.campagne_id || ""} onChange={e => setForm((f: any) => ({ ...f, campagne_id: e.target.value || null }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", background: "white", boxSizing: "border-box" }}>
                <option value="">—</option>
                {campagnes.map(c => <option key={c.id} value={c.id}>{c.nom || c.id}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Lignes de facture</div>
            <button onClick={() => setLignes(prev => [...prev, { ordre: prev.length + 1, designation: "", quantite: 1, unite: "forfait", prix_unitaire_ht: 0, taux_tva: 20 }])} style={{ display: "flex", alignItems: "center", gap: "5px", background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#0F172A", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-plus" style={{ fontSize: "13px" }} /> Ajouter une ligne
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Désignation", "Qté", "Unité", "PU HT (€)", "TVA (%)", "HT", "TTC", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", textAlign: i === 0 ? "left" : "right", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const { ht, ttc } = calcLigne(l)
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "8px 6px" }}><input value={l.designation} onChange={e => setLignes(prev => prev.map((x, idx) => idx === i ? { ...x, designation: e.target.value } : x))} placeholder="Description de la prestation" style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "13px", outline: "none" }} /></td>
                    <td style={{ padding: "8px 6px", width: "70px" }}><input type="number" value={l.quantite} onChange={e => setLignes(prev => prev.map((x, idx) => idx === i ? { ...x, quantite: parseFloat(e.target.value) || 0 } : x))} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "13px", outline: "none", textAlign: "right" }} /></td>
                    <td style={{ padding: "8px 6px", width: "90px" }}><input value={l.unite} onChange={e => setLignes(prev => prev.map((x, idx) => idx === i ? { ...x, unite: e.target.value } : x))} placeholder="forfait" style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "13px", outline: "none" }} /></td>
                    <td style={{ padding: "8px 6px", width: "110px" }}><input type="number" value={l.prix_unitaire_ht} onChange={e => setLignes(prev => prev.map((x, idx) => idx === i ? { ...x, prix_unitaire_ht: parseFloat(e.target.value) || 0 } : x))} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "13px", outline: "none", textAlign: "right" }} /></td>
                    <td style={{ padding: "8px 6px", width: "80px" }}>
                      <select value={l.taux_tva} onChange={e => setLignes(prev => prev.map((x, idx) => idx === i ? { ...x, taux_tva: parseFloat(e.target.value) } : x))} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "13px", outline: "none", background: "white" }}>
                        {TVA_TAUX.map(t => <option key={t} value={t}>{t} %</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#64748B", whiteSpace: "nowrap" }}>{formatEur(ht)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontSize: "13px", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>{formatEur(ttc)}</td>
                    <td style={{ padding: "8px 6px", width: "36px" }}>
                      {lignes.length > 1 && <button onClick={() => setLignes(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: "4px", display: "flex" }}><i className="ti ti-x" style={{ fontSize: "14px" }} /></button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <div style={{ minWidth: "240px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748B" }}><span>Total HT</span><span style={{ fontFamily: "JetBrains Mono, monospace" }}>{formatEur(totauxForm.ht)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748B" }}><span>Total TVA</span><span style={{ fontFamily: "JetBrains Mono, monospace" }}>{formatEur(totauxForm.tva)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, color: "#B25C2A", borderTop: "2px solid #0F172A", paddingTop: "8px", marginTop: "4px" }}><span>Total TTC</span><span style={{ fontFamily: "JetBrains Mono, monospace" }}>{formatEur(totauxForm.ttc)}</span></div>
            </div>
          </div>
        </div>

        {/* Mentions légales */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Mentions légales obligatoires</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { field: "conditions_paiement", label: "Conditions de paiement" },
              { field: "taux_penalites",       label: "Pénalités de retard" },
              { field: "escompte",             label: "Escompte" },
              { field: "notes",                label: "Notes" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>{label}</label>
                <input value={form[field] || ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── VUE LISTE ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{factures.length}</span> facture{factures.length > 1 ? "s" : ""}
        </div>
        <button onClick={() => { setForm({ ...formVide }); setLignes([{ ordre: 1, designation: "", quantite: 1, unite: "forfait", prix_unitaire_ht: 0, taux_tva: 20 }]); setVue("form") }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} /> Nouvelle facture
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Total émis",     val: formatEur(totalEmis),   icon: "ti-receipt",        color: "#1E40AF" },
          { label: "Total encaissé", val: formatEur(totalPayees), icon: "ti-circle-check",   color: "#065F46" },
          { label: "En retard",      val: formatEur(totalRetard), icon: "ti-alert-triangle", color: "#991B1B" },
          { label: "En attente",     val: `${nbEnAttente} fact.`, icon: "ti-clock",          color: "#D97706" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 30, height: 30, borderRadius: "7px", background: `${k.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: k.color }} />
              </div>
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "18px", fontWeight: 600, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {["tous", "brouillon", "emise", "payee", "en_retard"].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)} style={{ padding: "5px 14px", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", border: filtreStatut === s ? `1px solid ${s === "tous" ? "#B25C2A" : STATUT_CONFIG[s]?.color || "#B25C2A"}` : "1px solid #E2E8F0", background: filtreStatut === s ? (s === "tous" ? "#FEF3EC" : STATUT_CONFIG[s]?.bg || "#FEF3EC") : "#FFFFFF", color: filtreStatut === s ? (s === "tous" ? "#B25C2A" : STATUT_CONFIG[s]?.color || "#B25C2A") : "#64748B", fontSize: "12px", fontWeight: filtreStatut === s ? 600 : 400 }}>
              {s === "tous" ? "Tous" : STATUT_CONFIG[s]?.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
          {[{ val: "tous", label: "Tous types" }, { val: "AGE_client", label: "AGE → Client" }, { val: "partenaire_AGE", label: "Partenaire → AGE" }].map(t => (
            <button key={t.val} onClick={() => setFiltreType(t.val)} style={{ padding: "5px 14px", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", border: filtreType === t.val ? "1px solid #B25C2A" : "1px solid #E2E8F0", background: filtreType === t.val ? "#FEF3EC" : "#FFFFFF", color: filtreType === t.val ? "#B25C2A" : "#64748B", fontSize: "12px", fontWeight: filtreType === t.val ? 600 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {facturesFiltrees.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#FEF3EC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="ti ti-receipt" style={{ fontSize: "24px", color: "#B25C2A" }} />
          </div>
          <div style={{ fontWeight: 500, color: "#0F172A", marginBottom: "6px", fontSize: "15px" }}>Aucune facture</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Créez votre première facture pour démarrer.</div>
          <button onClick={() => { setForm({ ...formVide }); setVue("form") }} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "15px" }} /> Nouvelle facture
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Numéro", "Type", "Destinataire", "Date émission", "Échéance", "Total TTC", "Statut", "Actions"].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: i >= 5 ? "right" : "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturesFiltrees.map((f, i) => {
                const statut = STATUT_CONFIG[f.statut]
                return (
                  <tr key={f.id} style={{ borderBottom: i < facturesFiltrees.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => ouvrirDetail(f)}
                  >
                    <td style={{ padding: "14px 16px" }}><span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", fontWeight: 600, color: "#B25C2A" }}>{f.numero}</span></td>
                    <td style={{ padding: "14px 16px" }}><span style={{ fontSize: "11px", color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: "4px" }}>{f.type === "AGE_client" ? "AGE → Client" : "Partenaire → AGE"}</span></td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: "#0F172A", fontWeight: 500 }}>{f.destinataire_raison_sociale || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: "#64748B" }}>{formatDate(f.date_emission)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: f.statut === "en_retard" ? "#991B1B" : "#64748B", fontWeight: f.statut === "en_retard" ? 600 : 400 }}>{formatDate(f.date_echeance)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "JetBrains Mono, monospace", fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{formatEur(f.total_ttc)}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: statut.bg, color: statut.color, border: `1px solid ${statut.border}`, padding: "3px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 600 }}>
                        <i className={`ti ${statut.icon}`} style={{ fontSize: "11px" }} /> {statut.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => ouvrirEdition(f)} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", padding: "5px 8px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <i className="ti ti-pencil" style={{ fontSize: "13px" }} />
                        </button>
                        <button onClick={() => supprimerFacture(f.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: "5px 8px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <i className="ti ti-trash" style={{ fontSize: "13px" }} />
                        </button>
                      </div>
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