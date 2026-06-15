import React, { useEffect, useState } from "react"
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
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
  "/metier":                     "Dashboard métier",
  "/metier/file-attente":        "File d'attente",
  "/metier/campagnes":           "Campagnes",
  "/metier/missions":            "Missions",
  "/metier/clients":             "Clients",
  "/metier/equipe": "Mon équipe",
  "/metier/utilisateurs":        "Utilisateurs",
  "/metier/messagerie":          "Messagerie",
  "/metier/reporting":           "Reporting",
"/metier/factures":            "Factures",
  "/metier/ged":                 "Documents",
  "/metier/admin":               "Administration",
}

// ─── Types ───────────────────────────────────────────────────────────────────
type EspaceType = "metier" | "client" | "public"

/**
 * Sous-rôles AGE — étendent le champ `role` de la table `profils`.
 * `admin`       → mappé sur `admin_national` (rétrocompatibilité)
 * `consultant`  → inchangé
 * Nouveau : `responsable_regional`
 */
type RoleAGE = "admin_national" | "responsable_regional" | "consultant"

interface NavItemProps {
  to: string
  icon: string
  label: string
  badge?: number
  end?: boolean
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ to, icon, label, badge, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
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
/** Normalise le champ `role` Supabase vers un RoleAGE typé. */
function resolveRoleAGE(role: string): RoleAGE {
  if (role === "admin") return "admin_national"          // rétrocompatibilité
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
  const [monProfilClient, setMonProfilClient] = useState<any>(null)
  const [authChecked, setAuthChecked]           = useState(false)

  // Badges
  const [nbFileAttente, setNbFileAttente]       = useState(0)  // admin_national : demandes clients
  const [nbCampagnes, setNbCampagnes]           = useState(0)  // campagnes à traiter
  const [nbMissions, setNbMissions]             = useState(0)  // missions à traiter
  const [nbMessagesAGE, setNbMessagesAGE]       = useState(0)  // messages non lus AGE
  const [nbMessagesClient, setNbMessagesClient] = useState(0)  // messages non lus client

  useEffect(() => {
    async function chargerProfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
          // File d'attente : demandes clients non assignées
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

const { count: countRdvAttente } = await supabase
  .from("demandes_rdv")
  .select("id", { count: "exact", head: true })
  .eq("lu_admin", false)
  .eq("statut", "en_attente")

const { count: countMissionsAttente } = await supabase
  .from("missions")
  .select("id", { count: "exact", head: true })
  .is("consultant_id", null)
  .in("statut", ["nouvelle", "en_cours"])

setNbFileAttente((countFile || 0) + (countCampagnesAttente || 0) + (countRdvAttente || 0) + (countMissionsAttente || 0))

const { count: countRdv } = await supabase
  .from("demandes_rdv")
  .select("id", { count: "exact", head: true })
  .eq("lu_admin", false)
  .eq("statut", "en_attente")

setNbFileAttente((countFile || 0) + (countRdv || 0))

          // Campagnes soumises par clients en attente de dispatch
          const { count: countCamp } = await supabase
            .from("campagnes")
            .select("id", { count: "exact", head: true })
            .eq("origine", "client")
            .eq("statut", "soumise")
          setNbCampagnes(countCamp || 0)
        }

       if (role === "responsable_regional") {
  const { count: countCampRegion } = await supabase
    .from("campagnes")
    .select("id", { count: "exact", head: true })
    .eq("responsable_id", user.id)
    .is("consultant_id", null)
  setNbCampagnes(countCampRegion || 0)

          // Missions de la région non assignées
          const { count: countMissRegion } = await supabase
            .from("missions")
            .select("id", { count: "exact", head: true })
            .eq("region", profilAGE.region)
            .is("consultant_id", null)
          setNbMissions(countMissRegion || 0)
        }

        // Messages non lus (tous rôles AGE)
       const { count: countMsg } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("lu", false)
          .neq("expediteur_id", user.id)
          .or(`destinataire_id.eq.${user.id},destinataire_id.is.null`)
        setNbMessagesAGE(countMsg || 0)
// Realtime — nouveaux messages non lus
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
        const { count: countMsgClient } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("lu", false)
          .eq("client_id", user.id)
          .neq("expediteur_id", user.id)
        setNbMessagesClient(countMsgClient || 0)
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#64748B",
          fontSize: "14px",
        }}
      >
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
          

          {/*
            Sensibilisation :
            - AGE  : accès édition (route gérée côté page)
            - client : lecture seule (même route, droits différents)
          */}
          <NavItem to="/sensibilisation" icon="ti-plant-2" label="Sensibilisation" />

          {/*
            Marketplace :
            - admin_national : édition
            - client         : lecture seule
            - responsable_regional + consultant : masqué
          */}
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
              <NavItem to="/client/reporting" icon="ti-file-analytics" label="Reporting" />
              <NavItem to="/client/profil" icon="ti-settings" label="Mon profil" />
              <NavItem
                to="/client/messagerie"
                icon="ti-message-circle"
                label="Messagerie"
                badge={nbMessagesClient}
              />
              {/* Gestion utilisateurs — admin_client uniquement */}
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

              {/* Campagnes — admin_national et responsable_regional */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
                <NavItem
                  to="/metier/campagnes"
                  icon="ti-speakerphone"
                  label="Campagnes"
                  badge={roleAGE === "responsable_regional" ? nbCampagnes : 0}
                />
              )}

              {/* Missions — admin_national et responsable_regional */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
                <NavItem
                  to="/metier/missions"
                  icon="ti-briefcase"
                  label="Missions"
                  badge={roleAGE === "responsable_regional" ? nbMissions : 0}
                />
              )}

              {/* Mes missions — consultant uniquement */}
              {roleAGE === "consultant" && (
                <NavItem to="/metier/missions" icon="ti-briefcase" label="Mes missions" />
              )}

              {/* Mon équipe — admin_national et responsable_regional */}
{(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
  <NavItem to="/metier/equipe" icon="ti-users" label="Mon équipe" />
)}

              {/* Clients — admin_national uniquement */}
              {roleAGE === "admin_national" && (
                <NavItem to="/metier/clients" icon="ti-building-community" label="Clients" />
              )}

              {/* Messagerie — tous les rôles AGE */}
              <NavItem
                to="/metier/messagerie"
                icon="ti-message-circle"
                label="Messagerie"
                badge={nbMessagesAGE}
              />

             {/* Reporting — admin_national et responsable_regional */}
              {(roleAGE === "admin_national" || roleAGE === "responsable_regional") && (
                <NavItem to="/metier/reporting" icon="ti-file-analytics" label="Reporting" />
              )}

              {/* Factures — admin_national uniquement */}
              {roleAGE === "admin_national" && (
                <NavItem to="/metier/factures" icon="ti-receipt" label="Factures" />
              )}

              {/* Documents — tous les rôles AGE */}
              <NavItem to="/metier/ged" icon="ti-folders" label="Documents" />

              {/* Utilisateurs — admin_national uniquement */}
              {roleAGE === "admin_national" && (
                <NavItem to="/metier/utilisateurs" icon="ti-users-group" label="Utilisateurs" />
              )}

              {/* Administration — admin_national uniquement */}
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