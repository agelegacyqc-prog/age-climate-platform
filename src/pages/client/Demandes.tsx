import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type SourceType = "marketplace" | "rdv" | "campagne" | "analyse"

interface DemandeUnifiee {
  id: string
  source: SourceType
  titre: string
  sousTitre: string
  statut: string
  statutLabel: string
  statutColor: string
  statutBg: string
  date: string
  archivable: boolean
  actifId: string | null
  detail: Record<string, string>
}

interface Actif { id: string; nom: string }

const STATUT_MARKETPLACE: Record<string, { label: string; color: string; bg: string }> = {
  soumise:            { label: "Soumise",            color: "#64748B", bg: "#F1F5F9" },
  en_qualification:   { label: "En qualification",   color: "#92400E", bg: "#FFFBEB" },
  entretien_planifie: { label: "Entretien planifié",  color: "#1E40AF", bg: "#EFF6FF" },
  validee:            { label: "Validée",             color: "#065F46", bg: "#ECFDF5" },
  dispatchee:         { label: "Dispatchée",          color: "#0369A1", bg: "#EFF6FF" },
  en_cours:           { label: "En cours",            color: "#5B21B6", bg: "#F5F3FF" },
  terminee:           { label: "Terminée",            color: "#065F46", bg: "#ECFDF5" },
  refusee:            { label: "Refusée",             color: "#991B1B", bg: "#FEF2F2" },
}

const STATUT_CAMPAGNE: Record<string, { label: string; color: string; bg: string }> = {
  soumise:          { label: "Soumise",          color: "#64748B", bg: "#F1F5F9" },
  en_qualification: { label: "En qualification", color: "#92400E", bg: "#FFFBEB" },
  validee:          { label: "Validée",           color: "#065F46", bg: "#ECFDF5" },
  en_cours:         { label: "En cours",          color: "#0369A1", bg: "#EFF6FF" },
  terminee:         { label: "Terminée",          color: "#475569", bg: "#F1F5F9" },
}

const STATUT_ANALYSE: Record<string, { label: string; color: string; bg: string }> = {
  demande:    { label: "Demandé",    color: "#64748B", bg: "#F1F5F9" },
  en_cours:   { label: "En cours",   color: "#92400E", bg: "#FFFBEB" },
  disponible: { label: "Disponible", color: "#065F46", bg: "#ECFDF5" },
}

const STATUT_RDV: Record<string, { label: string; color: string; bg: string }> = {
  confirme: { label: "Confirmé", color: "#185FA5", bg: "#E6F1FB" },
  annule:   { label: "Annulé",   color: "#991B1B", bg: "#FEF2F2" },
}

const SOURCE_CONFIG: Record<SourceType, { label: string; icon: string; color: string; bg: string }> = {
  marketplace: { label: "Marketplace",        icon: "ti-building-store", color: "#993C1D", bg: "#FAECE7" },
  rdv:         { label: "Rendez-vous",        icon: "ti-calendar",       color: "#534AB7", bg: "#EEEDFE" },
  campagne:    { label: "Campagne",           icon: "ti-speakerphone",   color: "#185FA5", bg: "#E6F1FB" },
  analyse:     { label: "Analyse climatique", icon: "ti-thermometer",    color: "#0F6E56", bg: "#E1F5EE" },
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateCourt(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

function creneauLabel(c: string | null) {
  return c === "matin" ? "Matin" : c === "apres_midi" ? "Après-midi" : "Indifférent"
}

function lundiDe(d: Date) {
  const jour = d.getDay()
  const diff = jour === 0 ? -6 : 1 - jour
  const l = new Date(d)
  l.setDate(d.getDate() + diff)
  l.setHours(0, 0, 0, 0)
  return l
}

function periodeDe(dateIso: string): { cle: string; label: string } {
  const d = new Date(dateIso)
  const aujourdhui = new Date()
  const hier = new Date()
  hier.setDate(aujourdhui.getDate() - 1)

  const estMemeJour = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (estMemeJour(d, aujourdhui)) return { cle: "0-aujourdhui", label: "Aujourd'hui" }
  if (estMemeJour(d, hier)) return { cle: "1-hier", label: "Hier" }

  const lundi = lundiDe(d)
  const vendredi = new Date(lundi)
  vendredi.setDate(lundi.getDate() + 4)
  const cle = lundi.toISOString().split("T")[0]
  const label = `${formatDateCourt(lundi.toISOString())} — ${formatDateCourt(vendredi.toISOString())}`
  return { cle, label }
}

export default function ClientDemandes() {
  const navigate = useNavigate()
  const [demandes, setDemandes]         = useState<DemandeUnifiee[]>([])
  const [actifs, setActifs]             = useState<Actif[]>([])
  const [loading, setLoading]           = useState(true)
  const [filtreType, setFiltreType]     = useState<"tous" | SourceType>("tous")
  const [filtreActif, setFiltreActif]   = useState<"tous" | string>("tous")
  const [filtreDateDebut, setFiltreDateDebut] = useState("")
  const [filtreDateFin, setFiltreDateFin]     = useState("")

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: actifsData } = await supabase
      .from("actifs")
      .select("id, nom")
      .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
      .neq("categorie", "import_csv")
    setActifs(actifsData || [])
    const actifNomMap: Record<string, string> = {}
    ;(actifsData || []).forEach(a => { actifNomMap[a.id] = a.nom })

    const [
      { data: marketplaceData },
      { data: campagnesData },
      { data: analyseData },
      { data: rdvData },
    ] = await Promise.all([
      supabase.from("demandes_marketplace")
        .select("id, type_prestation, statut, archivee, created_at, description, actif_id, actif:actif_id(nom, adresse)")
        .eq("client_id", user.id)
        .eq("archivee", false)
        .order("created_at", { ascending: false }),
      supabase.from("campagnes")
        .select("id, nom, statut, type_campagne, archivee, zone_geo, created_at")
        .eq("client_id", user.id)
        .eq("origine", "client")
        .eq("archivee", false)
        .order("created_at", { ascending: false }),
      supabase.from("rapports_client")
        .select("id, statut, periode, created_at, actif_id")
        .eq("client_id", user.id)
        .eq("type_rapport", "analyse_climatique")
        .order("created_at", { ascending: false }),
      supabase.from("rendez_vous_client")
        .select("id, type_mission, message, statut, created_at, consultant_id, disponibilite:disponibilite_id(date, heure_debut)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
    ])

    const consultantIds = [...new Set((rdvData || []).map((r: any) => r.consultant_id))]
    let consultantsMap: Record<string, string> = {}
    if (consultantIds.length > 0) {
      const { data: consultants } = await supabase
        .from("marketplace_consultants")
        .select("user_id, prenom, nom")
        .in("user_id", consultantIds)
      ;(consultants || []).forEach((c: any) => { consultantsMap[c.user_id] = `${c.prenom} ${c.nom}` })
    }

    const unifiees: DemandeUnifiee[] = [
      ...(marketplaceData || []).map((d: any): DemandeUnifiee => {
        const s = STATUT_MARKETPLACE[d.statut] || STATUT_MARKETPLACE.soumise
        return {
          id: d.id, source: "marketplace",
          titre: d.type_prestation || "Demande de prestation",
          sousTitre: d.actif?.nom || d.actif?.adresse || "Actif non spécifié",
          statut: d.statut, statutLabel: s.label, statutColor: s.color, statutBg: s.bg,
          date: d.created_at, archivable: true, actifId: d.actif_id || null,
          detail: {
            "Type de prestation": d.type_prestation || "—",
            "Actif concerné": d.actif?.nom || d.actif?.adresse || "—",
            ...(d.description ? { "Description": d.description } : {}),
          },
        }
      }),
      ...(campagnesData || []).map((d: any): DemandeUnifiee => {
        const s = STATUT_CAMPAGNE[d.statut] || STATUT_CAMPAGNE.soumise
        return {
          id: d.id, source: "campagne",
          titre: d.nom || "Campagne",
          sousTitre: d.type_campagne || d.zone_geo || "—",
          statut: d.statut, statutLabel: s.label, statutColor: s.color, statutBg: s.bg,
          date: d.created_at, archivable: true, actifId: null,
          detail: {
            "Type de campagne": d.type_campagne || "—",
            "Zone géographique": d.zone_geo || "—",
          },
        }
      }),
      ...(analyseData || []).map((d: any): DemandeUnifiee => {
        const s = STATUT_ANALYSE[d.statut] || STATUT_ANALYSE.demande
        return {
          id: d.id, source: "analyse",
          titre: actifNomMap[d.actif_id] || "Analyse climatique",
          sousTitre: d.periode ? `Période ${d.periode}` : "Analyse climatique",
          statut: d.statut, statutLabel: s.label, statutColor: s.color, statutBg: s.bg,
          date: d.created_at, archivable: false, actifId: d.actif_id || null,
          detail: { "Actif concerné": actifNomMap[d.actif_id] || "—", "Période": d.periode || "—" },
        }
      }),
      ...(rdvData || []).map((d: any): DemandeUnifiee => {
        const s = STATUT_RDV[d.statut] || STATUT_RDV.confirme
        const nomConsultant = consultantsMap[d.consultant_id] || "Consultant AGE"
        return {
          id: d.id, source: "rdv",
          titre: `RDV avec ${nomConsultant}`,
          sousTitre: d.disponibilite
            ? `${formatDate(d.disponibilite.date)} à ${d.disponibilite.heure_debut?.slice(0, 5)}`
            : "—",
          statut: d.statut, statutLabel: s.label, statutColor: s.color, statutBg: s.bg,
          date: d.created_at, archivable: false, actifId: null,
          detail: {
            "Consultant": nomConsultant,
            "Type de prestation": d.type_mission || "—",
            ...(d.message ? { "Message": d.message } : {}),
          },
        }
      }),
    ]

    unifiees.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setDemandes(unifiees)
    setLoading(false)
  }

  async function archiverDemande(d: DemandeUnifiee) {
    if (!d.archivable) return
    if (!confirm("Archiver cette demande ? Elle ne sera plus visible dans votre liste.")) return
    const table = d.source === "marketplace" ? "demandes_marketplace" : "campagnes"
    await supabase.from(table).update({ archivee: true, archivee_at: new Date().toISOString() }).eq("id", d.id)
    setDemandes(prev => prev.filter(x => x.id !== d.id))
  }

  const demandesFiltrees = demandes.filter(d => {
    if (filtreType !== "tous" && d.source !== filtreType) return false
    if (filtreActif !== "tous" && d.actifId !== filtreActif) return false
    if (filtreDateDebut && d.date < filtreDateDebut) return false
    if (filtreDateFin && d.date > filtreDateFin + "T23:59:59") return false
    return true
  })

  const filtresActifs = filtreType !== "tous" || filtreActif !== "tous" || filtreDateDebut || filtreDateFin

  const stats = {
    enCours: demandes.filter(d => d.statut === "en_cours" || d.statut === "demande").length,
    disponibles: demandes.filter(d => d.statut === "disponible" || d.statut === "validee").length,
    rdvAvenir: demandes.filter(d => d.source === "rdv" && d.statut === "confirme").length,
  }

  const groupes: { cle: string; label: string; items: DemandeUnifiee[] }[] = []
  demandesFiltrees.forEach(d => {
    const { cle, label } = periodeDe(d.date)
    let g = groupes.find(g => g.cle === cle)
    if (!g) { g = { cle, label, items: [] }; groupes.push(g) }
    g.items.push(d)
  })

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#0F172A", margin: 0 }}>Mes demandes</h2>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>{demandes.length} demande{demandes.length > 1 ? "s" : ""} au total</p>
        </div>
        <button
          onClick={() => navigate("/marketplace")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "9px 18px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle demande
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "1rem" }}>
          <div style={{ fontSize: "13px", color: "#64748B" }}>En cours</div>
          <div style={{ fontSize: "24px", fontWeight: 500, marginTop: "4px", color: "#0F172A" }}>{stats.enCours}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "1rem" }}>
          <div style={{ fontSize: "13px", color: "#64748B" }}>Disponibles / Validées</div>
          <div style={{ fontSize: "24px", fontWeight: 500, marginTop: "4px", color: "#0F6E56" }}>{stats.disponibles}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "1rem" }}>
          <div style={{ fontSize: "13px", color: "#64748B" }}>RDV confirmés</div>
          <div style={{ fontSize: "24px", fontWeight: 500, marginTop: "4px", color: "#185FA5" }}>{stats.rdvAvenir}</div>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 18px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Type de demande</label>
          <select value={filtreType} onChange={e => setFiltreType(e.target.value as any)} style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", background: "white", minWidth: "180px" }}>
            <option value="tous">Toutes les demandes</option>
            {(Object.keys(SOURCE_CONFIG) as SourceType[]).map(s => (
              <option key={s} value={s}>{SOURCE_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Actif concerné</label>
          <select value={filtreActif} onChange={e => setFiltreActif(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", background: "white", minWidth: "180px" }}>
            <option value="tous">Tous les actifs</option>
            {actifs.map(a => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Du</label>
          <input type="date" value={filtreDateDebut} onChange={e => setFiltreDateDebut(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Au</label>
          <input type="date" value={filtreDateFin} onChange={e => setFiltreDateFin(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit" }} />
        </div>
        {filtresActifs && (
          <button onClick={() => { setFiltreType("tous"); setFiltreActif("tous"); setFiltreDateDebut(""); setFiltreDateFin("") }} style={{ padding: "8px 14px", border: "1px solid #E2E8F0", borderRadius: "7px", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            Réinitialiser
          </button>
        )}
      </div>

      {demandesFiltrees.length === 0 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>
            {demandes.length === 0 ? "Aucune demande" : "Aucune demande ne correspond aux filtres"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            {demandes.length === 0 ? "Déposez une demande de prestation sur la Marketplace" : "Essayez d'élargir vos critères"}
          </div>
        </div>
      )}

      {groupes.map(groupe => (
        <div key={groupe.cle}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "1rem 0 8px" }}>
            {groupe.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "#E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
            {groupe.items.map(d => {
              const src = SOURCE_CONFIG[d.source]
              return (
                <div key={`${d.source}-${d.id}`} style={{ background: "white", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", borderLeft: `3px solid ${src.color}` }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: src.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${src.icon}`} style={{ fontSize: "16px", color: src.color }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{d.titre}</div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      {d.sousTitre}
                      {!d.actifId && d.source !== "rdv" && d.source !== "campagne" ? " · Non lié à un actif" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {d.archivable && d.statut !== "en_cours" && d.statut !== "terminee" && (
                      <button
                        onClick={() => archiverDemande(d)}
                        style={{ fontSize: "11px", padding: "4px 10px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", color: "#64748B", cursor: "pointer", fontFamily: "inherit" }}>
                        Archiver
                      </button>
                    )}
                    <span style={{ background: d.statutBg, color: d.statutColor, padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {d.statutLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}