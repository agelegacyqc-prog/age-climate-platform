import React, { useEffect, useState } from "react"
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { Home } from "lucide-react"
import "../styles/Layout.css"

// ─── Page titles ────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/":                           "Accueil",
  "/sensibilisation":            "Sensibilisation",
  "/marketplace":                "Marketplace",
  "/client":                     "Mon compte",
  "/client/actifs":              "Mon Patrimoine",
  "/client/campagnes":           "Mes Campagnes",
  "/client/demandes":            "Mes Demandes",
  "/client/profil":              "Mon profil",
  "/client/messagerie":          "Messagerie",
  "/client/utilisateurs":        "Gestion des utilisateurs",
  "/client/carnet-logement":     "Carnet du logement",
  "/metier":                     "Dashboard métier",
  "/metier/file-attente":        "File d'attente",
  "/metier/campagnes":           "Campagnes",
  "/metier/portefeuille":        "Portefeuille",
  "/metier/missions":            "Missions",
  "/metier/clients":             "Clients",
  "/metier/equipe":              "Mon équipe",
  "/metier/utilisateurs":        "Utilisateurs",
  "/metier/messagerie":          "Messagerie",
  "/metier/reporting":           "Reporting",
  "/metier/factures":            "Factures",
  "/metier/brown-value":         "Simulation Brown Value",
  "/metier/ageadapt":            "AGEadapt",
  "/metier/ageadapt/nouvelle-mission": "Nouvelle mission — AGEadapt",
  "/metier/dossiers-rga":        "Dossiers RGA",
  "/metier/publipostage":        "Publipostage",
  "/metier/modeles-comm":        "Modèles de communication",
  "/metier/rdv":                 "Agenda RDV",
  "/metier/mandats":             "Mandats",
  "/metier/ged":                 "Documents",
  "/metier/admin":               "Administration",
}

// ─── Types ───────────────────────────────────────────────────────────────────
type EspaceType = "metier" | "client" | "public"
type RoleAGE = "admin_national" | "responsable_regional" | "consultant"

interface NavItemProps {
  to: string
  icon: string
  label: string
  badge?: number
  end?: boolean
  title?: string
}

// ─── Menus collapsibles ───────────────────────────────────────────────────────

function ProspectionMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isActive = location.pathname.startsWith('/metier/campagnes') ||
                   location.pathname.startsWith('/metier/dossiers-rga') ||
                   location.pathname.startsWith('/metier/publipostage') ||
                   location.pathname.startsWith('/metier/modeles-comm') ||
                   location.pathname.startsWith('/metier/rdv') ||
                   location.pathname.startsWith('/metier/mandats')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', padding: '8px 12px', border: 'none',
          background: isActive ? 'rgba(178,92,42,0.10)' : 'transparent',
          borderRadius: '8px', cursor: 'pointer',
          color: isActive ? '#B25C2A' : '#78716C',
          fontSize: '13px', fontWeight: isActive ? 600 : 400,
        }}
      >
        <i className="ti ti-speakerphone" style={{ fontSize: '16px' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>Prospection</span>
        <i className={`ti ${open || isActive ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: '12px' }} />
      </button>
      {(open || isActive) && (
        <div style={{ paddingLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink
            to="/metier/campagnes"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-speakerphone nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Campagnes</span>
          </NavLink>
          <NavLink
            to="/metier/rdv"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-calendar nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Agenda RDV</span>
          </NavLink>
          <NavLink
            to="/metier/dossiers-rga"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-home-search nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Dossiers RGA</span>
          </NavLink>
          <NavLink
            to="/metier/mandats"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-writing nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Mandats</span>
          </NavLink>
          <NavLink
            to="/metier/publipostage"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-send nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Publipostage</span>
          </NavLink>
          <NavLink
            to="/metier/modeles-comm"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-mail nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Modèles comm.</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

function FinanceMenu({ roleAGE }: { roleAGE: string }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isActive = location.pathname.startsWith('/metier/reporting') ||
                   location.pathname.startsWith('/metier/factures')
                   location.pathname.startsWith('/metier/brown-value')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', padding: '8px 12px', border: 'none',
          background: isActive ? 'rgba(3,105,161,0.10)' : 'transparent',
          borderRadius: '8px', cursor: 'pointer',
          color: isActive ? '#0369A1' : '#78716C',
          fontSize: '13px', fontWeight: isActive ? 600 : 400,
        }}
      >
        <i className="ti ti-chart-pie" style={{ fontSize: '16px' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>Finance</span>
        <i className={`ti ${open || isActive ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: '12px' }} />
      </button>
      {(open || isActive) && (
        <div style={{ paddingLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink
            to="/metier/reporting"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-file-analytics nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">Reporting</span>
          </NavLink>
    {(roleAGE === 'admin_national' || roleAGE === 'consultant') && (
            <NavLink
              to="/metier/factures"
              className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <i className="ti ti-receipt nav-item__icon" style={{ fontSize: '14px' }} />
              <span className="nav-item__label">Facturation</span>
            </NavLink>
          )}
          <NavLink
            to="/metier/brown-value"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px', color: '#B25C2A' }}
          >
            <Home className="nav-item__icon" style={{ width: '14px', height: '14px' }} />
            <span className="nav-item__label">Brown Value</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

function EnvironnementMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isActive = location.pathname.startsWith('/metier/ageadapt') ||
                   location.pathname.startsWith('/metier/agecarbon')

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', padding: '8px 12px', border: 'none',
          background: isActive ? 'rgba(29,158,117,0.12)' : 'transparent',
          borderRadius: '8px', cursor: 'pointer', color: isActive ? '#1D9E75' : '#78716C',
          fontSize: '13px', fontWeight: isActive ? 600 : 400,
        }}
      >
        <i className="ti ti-leaf" style={{ fontSize: '16px' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>Environnement</span>
        <i className={`ti ${open || isActive ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: '12px' }} />
      </button>
      {(open || isActive) && (
        <div style={{ paddingLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink
            to="/metier/ageadapt"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-chart-bar nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">AGEadapt</span>
          </NavLink>
          <NavLink
            to="/metier/agecarbon"
            className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <i className="ti ti-calculator nav-item__icon" style={{ fontSize: '14px' }} />
            <span className="nav-item__label">AGEcarbone</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ to, icon, label, badge, end, title }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      className={({ isActive }) =>
        isActive ? "nav-item nav-item--active" : "nav-item"
      }
    >
      <i className={`ti ${icon} nav-item__icon`} aria-hidden="true" />
      <span className="nav-item__label">{label}</span>
      {badge != null && badge > 0 && (
        <span
          style={{
            marginLeft: "auto",
            background: "#B91C1C",
            color: "white",
            fontSize: "10px",
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: "10px",
            minWidth: "16px",
            textAlign: "center",
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function resolveRoleAGE(role: string): RoleAGE {
  if (role === "admin") return "admin_national"
  if (role === "responsable_regional") return "responsable_regional"
  return "consultant"
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [initiales, setInitiales]               = useState("--")
  const [prenom, setPrenom]                     = useState("")
  const [labelProfil, setLabelProfil]           = useState("")
  const [espace, setEspace]                     = useState<EspaceType>("public")
  const [roleAGE, setRoleAGE]                   = useState<RoleAGE>("consultant")
  const [monProfilClient, setMonProfilClient]   = useState<any>(null)
  const [authChecked, setAuthChecked]           = useState(false)

  // Badges
  const [nbFileAttente, setNbFileAttente]       = useState(0)
  const [nbCampagnes, setNbCampagnes]           = useState(0)
  const [nbMissions, setNbMissions]             = useState(0)
  const [nbRapportsAttente, setNbRapportsAttente] = useState(0)
  const [nbMessagesAGE, setNbMessagesAGE]       = useState(0)
  const [nbMessagesClient, setNbMessagesClient] = useState(0)
  const [detailMessagesClient, setDetailMessagesClient] = useState({ demandes: 0, campagnes: 0, actifs: 0 })
  const [nbRapportsDispo, setNbRapportsDispo] = useState(0)

  useEffect(() => {
    async function chargerProfil() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login")
        return
      }

      // ── Profil AGE ──────────────────────────────────────────────────────
      const { data: profilAGE } = await supabase
        .from("profils")
        .select("prenom, nom, profil, role, region")
        .eq("id", user.id)
        .maybeSingle()

      if (profilAGE && profilAGE.role !== null && profilAGE.role !== "client") {
        const p = profilAGE.prenom || ""
        const n = profilAGE.nom || ""
        setPrenom(p)
        setInitiales(
          `${p[0] || ""}${n[0] || ""}`.toUpperCase() ||
            user.email![0].toUpperCase()
        )

        const role = resolveRoleAGE(profilAGE.role)
        setRoleAGE(role)
        setLabelProfil(
          role === "admin_national"
            ? "Admin national"
            : role === "responsable_regional"
            ? `Resp. régional — ${profilAGE.region || ""}`
            : "Consultant"
        )
        setEspace("metier")

        // ── Badges selon rôle ────────────────────────────────────────────
        if (role === "admin_national") {
          const { count: countFile } = await supabase
            .from("demandes_marketplace")
            .select("id", { count: "exact", head: true })
            .eq("statut", "soumise")

          const { count: countCampagnesAttente } = await supabase
            .from("campagnes")
            .select("id", { count: "exact", head: true })
            .eq("origine", "client")
            .eq("statut", "soumise")
            .is("responsable_id", null)

          const { count: countRdv } = await supabase
            .from("demandes_rdv")
            .select("id", { count: "exact", head: true })
            .eq("lu_admin", false)
            .eq("statut", "en_attente")

          const { count: countMissionsAttente } = await supabase
            .from("missions")
            .select("id", { count: "exact", head: true })
            .is("consultant_id", null)
            .in("statut", ["nouvelle", "en_cours"])

          const { count: countRapportsAttente } = await supabase
            .from("rapports_client")
            .select("id", { count: "exact", head: true })
            .eq("statut", "demande")

          setNbFileAttente(
            (countFile || 0) + (countCampagnesAttente || 0) +
            (countRdv || 0) + (countMissionsAttente || 0) + (countRapportsAttente || 0)
          )
          setNbRapportsAttente(countRapportsAttente || 0)

          supabase
            .channel(`rapports-demande-${Date.now()}`)
            .on("postgres_changes", {
              event: "INSERT", schema: "public", table: "rapports_client",
            }, (payload: any) => {
              if (payload.new?.statut === "demande") {
                setNbFileAttente(prev => prev + 1)
                setNbRapportsAttente(prev => prev + 1)
              }
            })
            .subscribe()

          const { count: countCamp } = await supabase
            .from("campagnes")
            .select("id", { count: "exact", head: true })
            .eq("origine", "client")
            .eq("statut", "soumise")
          setNbCampagnes(countCamp || 0)
          // Alertes scores non lues toutes régions
          const { count: countAlertesAdmin } = await supabase
            .from('alertes_scores')
            .select('id', { count: 'exact', head: true })
            .eq('lu', false)
          setNbFileAttente(prev => prev + (countAlertesAdmin || 0))
        }

        if (role === "responsable_regional") {
          const { count: countCampRegion } = await supabase
            .from("campagnes")
            .select("id", { count: "exact", head: true })
            .eq("responsable_id", user.id)
          setNbCampagnes(countCampRegion || 0)
// Alertes scores non lues
          const { count: countAlertes } = await supabase
            .from('alertes_scores')
            .select('id', { count: 'exact', head: true })
            .eq('lu', false)
            .eq('region_code', profilAGE.region)
          setNbFileAttente(prev => prev + (countAlertes || 0))

        // Missions de la région non assignées
          const { count: countMissRegion } = await supabase
            .from("missions")
            .select("id", { count: "exact", head: true })
            .eq("region", profilAGE.region)
            .is("consultant_id", null)
          setNbMissions(countMissRegion || 0)

          // Rapports demandés par des clients de la région
       const { data: clientsRegion } = await supabase
            .from("profils_client")
            .select("id")
            .eq("region", profilAGE.region)
          const clientIdsRegion = (clientsRegion || []).map(c => c.id)
        if (clientIdsRegion.length > 0) {
            const { count: countRapportsRegion } = await supabase
              .from("rapports_client")
              .select("id", { count: "exact", head: true })
              .eq("statut", "demande")
              .in("client_id", clientIdsRegion)
            setNbFileAttente(prev => prev + (countRapportsRegion || 0))
            setNbRapportsAttente(countRapportsRegion || 0)
          }

          supabase
            .channel(`rapports-demande-region-${Date.now()}`)
            .on("postgres_changes", {
              event: "INSERT", schema: "public", table: "rapports_client",
            }, async (payload: any) => {
              if (payload.new?.statut !== "demande") return
              const { data: pc } = await supabase
                .from("profils_client")
                .select("region")
                .eq("id", payload.new.client_id)
                .maybeSingle()
              if (pc?.region === profilAGE.region) {
                setNbFileAttente(prev => prev + 1)
                setNbRapportsAttente(prev => prev + 1)
              }
            })
            .subscribe()
        }

        // Messages non lus (tous rôles AGE)
        const { count: countMsg } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("lu", false)
          .neq("expediteur_id", user.id)
          .or(`destinataire_id.eq.${user.id},destinataire_id.is.null`)
        setNbMessagesAGE(countMsg || 0)

        supabase
          .channel(`messages-non-lus-${Date.now()}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `destinataire_id=eq.${user.id}`,
          }, () => {
            setNbMessagesAGE(prev => prev + 1)
          })
          .subscribe()

        setAuthChecked(true)
        return
      }

      // ── Profil client ────────────────────────────────────────────────────
      const { data: profilClient } = await supabase
        .from("profils_client")
        .select("type_client, role_client")
        .eq("id", user.id)
        .maybeSingle()

      if (profilClient) {
        const labels: Record<string, string> = {
          banque: "Banque",
          assureur: "Assurance",
          entreprise: "Entreprise",
          collectivite: "Collectivité",
          proprietaire: "Particulier",
        }
        setInitiales(user.email![0].toUpperCase())
        setLabelProfil(labels[profilClient.type_client] || "Client")
        setEspace("client")
        setMonProfilClient(profilClient)

     const { data: msgsNonLus } = await supabase
          .from("messages")
          .select("demande_id, campagne_id, actif_id")
          .eq("type_conversation", "client")
          .eq("lu", false)
          .neq("expediteur_id", user.id)
          .or(`client_id.eq.${user.id},destinataire_id.eq.${user.id}`)

        const detail = { demandes: 0, campagnes: 0, actifs: 0 }
        msgsNonLus?.forEach(m => {
          if (m.demande_id) detail.demandes++
          if (m.campagne_id) detail.campagnes++
          if (m.actif_id) detail.actifs++
        })
        setDetailMessagesClient(detail)
        setNbMessagesClient(detail.demandes + detail.campagnes + detail.actifs)

        const { count: countRapportsDispo } = await supabase
          .from("rapports_client")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id)
          .eq("statut", "disponible")
          .eq("vu_client", false)
        setNbRapportsDispo(countRapportsDispo || 0)

        supabase
          .channel(`rapports-dispo-${Date.now()}`)
          .on("postgres_changes", {
            event: "*", schema: "public", table: "rapports_client",
            filter: `client_id=eq.${user.id}`,
          }, async () => {
            const { count } = await supabase
              .from("rapports_client")
              .select("id", { count: "exact", head: true })
              .eq("client_id", user.id)
              .eq("statut", "disponible")
              .eq("vu_client", false)
            setNbRapportsDispo(count || 0)
          })
          .subscribe()

        supabase
          .channel(`messages-client-non-lus-${Date.now()}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `destinataire_id=eq.${user.id}`,
          }, () => {
            setNbMessagesClient(prev => prev + 1)
          })
          .subscribe()

        setAuthChecked(true)
        return
      }

      setAuthChecked(true)
      setEspace("public")
    }

    chargerProfil()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const pageTitle = PAGE_TITLES[location.pathname] || "AGE Climate"

  if (!authChecked)
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: "#64748B", fontSize: "14px",
      }}>
        Chargement…
      </div>
    )

  return (
    <div className="app-container">
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo__mark">
            <i className="ti ti-leaf" aria-hidden="true" />
          </div>
          <div className="sidebar-logo__text">
            <span className="sidebar-logo__name">AGE Climate</span>
            <span className="sidebar-logo__sub">Platform</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          {/* ── Section Plateforme (commune) ──────────────────────────── */}
          <div className="nav-section">Plateforme</div>
          <NavItem to="/" icon="ti-home" label="Accueil" end />
          <NavItem to="/sensibilisation" icon="ti-plant-2" label="Sensibilisation" />

          {(espace === "client" || roleAGE === "admin_national") && (
            <NavItem to="/marketplace" icon="ti-building-store" label="Marketplace" />
          )}

          {/* ── Espace Client ──────────────────────────────────────────── */}
          {espace === "client" && (
            <>
              <div className="nav-section">Mon espace</div>
              <NavItem to="/client/campagnes" icon="ti-speakerphone" label="Mes Campagnes" />

              {(labelProfil === "Entreprise" || labelProfil === "Particulier") && (
                <NavItem
                  to="/client/actifs"
                  icon="ti-building"
                  label={labelProfil === "Particulier" ? "Mon bien" : "Mon Patrimoine"}
                />
              )}
              {labelProfil === "Particulier" && (
                <NavItem to="/client/carnet-logement" icon="ti-notebook" label="Carnet du logement" />
              )}
              {labelProfil === "Collectivité" && (
                <NavItem to="/client/actifs" icon="ti-map" label="Mon Territoire" />
              )}
              {labelProfil === "Banque" && (
                <>
                  <NavItem to="/client/biens-campagnes" icon="ti-building-bank" label="Biens financés" />
                  <NavItem to="/client/actifs?vue=patrimoine" icon="ti-building" label="Mon Patrimoine" />
                </>
              )}
              {labelProfil === "Assurance" && (
                <>
                  <NavItem to="/client/biens-campagnes" icon="ti-shield" label="Biens assurés" />
                  <NavItem to="/client/actifs" icon="ti-building" label="Mon Patrimoine" />
                </>
              )}

              <NavItem to="/client/demandes" icon="ti-clipboard-list" label="Mes Demandes" />
              <NavItem to="/client/reporting" icon="ti-file-analytics" label="Reporting" badge={nbRapportsDispo} />
              <NavItem to="/client/profil" icon="ti-settings" label="Mon profil" />
              <NavItem
                to="/client/messagerie"
                icon="ti-message-circle"
                label="Messagerie"
                badge={nbMessagesClient}
                title={nbMessagesClient > 0
                  ? `${detailMessagesClient.demandes} demande${detailMessagesClient.demandes > 1 ? "s" : ""} · ${detailMessagesClient.campagnes} campagne${detailMessagesClient.campagnes > 1 ? "s" : ""} · ${detailMessagesClient.actifs} actif${detailMessagesClient.actifs > 1 ? "s" : ""}`
                  : undefined}
              />
              {monProfilClient?.role_client === "admin_client" && (
                <NavItem to="/client/utilisateurs" icon="ti-users-group" label="Utilisateurs" />
              )}
            </>
          )}

          {/* ── Espace Métier AGE ──────────────────────────────────────── */}
          {espace === "metier" && (
            <>
              {/* File d'attente — admin national uniquement */}
              {roleAGE === "admin_national" && (
                <NavItem
                  to="/metier/file-attente"
                  icon="ti-inbox"
                  label="File d'attente"
                  badge={nbFileAttente + nbCampagnes}
                />
              )}

            {/* Missions */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
                <NavItem
                  to="/metier/missions"
                  icon="ti-briefcase"
                  label="Missions"
                  badge={roleAGE === "responsable_regional" ? nbMissions + nbRapportsAttente : nbRapportsAttente}
                />
              )}
              {roleAGE === "consultant" && (
                <NavItem to="/metier/missions" icon="ti-briefcase" label="Mes missions" />
              )}

              {/* Mon équipe */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
                <NavItem to="/metier/equipe" icon="ti-users" label="Mon équipe" />
              )}

              {/* Portefeuille */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
                <NavItem to="/metier/portefeuille" icon="ti-building" label="Portefeuille" />
              )}

              {/* Clients */}
              {roleAGE === "admin_national" && (
                <NavItem to="/metier/clients" icon="ti-building-community" label="Clients" />
              )}

              {/* Messagerie */}
              <NavItem
                to="/metier/messagerie"
                icon="ti-message-circle"
                label="Messagerie"
                badge={nbMessagesAGE}
              />

              {/* Finance */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional" || roleAGE === "consultant") && (
                <FinanceMenu roleAGE={roleAGE} />
              )}

              {/* Environnement */}
              <EnvironnementMenu />

              {/* Prospection */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional" || roleAGE === "consultant") && (
                <ProspectionMenu />
              )}

              {/* Documents */}
              <NavItem to="/metier/ged" icon="ti-folders" label="Documents" />

              {/* Utilisateurs */}
              {roleAGE === "admin_national" && (
                <NavItem to="/metier/utilisateurs" icon="ti-users-group" label="Utilisateurs" />
              )}

              {/* Administration */}
              {roleAGE === "admin_national" && (
                <NavItem to="/metier/admin" icon="ti-adjustments-horizontal" label="Administration" />
              )}
            </>
          )}

        </nav>

        {/* Profil utilisateur */}
        <div className="sidebar-user">
          <div className="sidebar-user__avatar">{initiales}</div>
          <div className="sidebar-user__info">
            <span className="sidebar-user__name">{prenom || "Mon compte"}</span>
            {labelProfil && (
              <span className="sidebar-user__profil">{labelProfil}</span>
            )}
          </div>
          <button
            className="sidebar-user__logout"
            onClick={handleLogout}
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <i className="ti ti-logout" aria-hidden="true" />
          </button>
        </div>

      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">{pageTitle}</h1>
          </div>
          <div className="header-right">
            <div className="header-badge">
              <i className="ti ti-leaf" aria-hidden="true" />
              Ensemble pour le climat
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}