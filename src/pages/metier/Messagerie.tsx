import React, { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"

type OngletPrincipal = "interne" | "clients"
type ContexteType = "campagne" | "mission" | "demande" | "actif"

interface Conversation {
  id: string
  titre: string
  sousTitre: string
  contexte: ContexteType
  refId: string
  nbNonLus: number
  clientId?: string | null
  clientNom?: string | null
  interlocuteurs?: { id: string; prenom: string; nom: string; role: string }[]
}

interface ProfilCache {
  id: string
  prenom: string
  nom: string
  role: string
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string; initBg: string; initColor: string }> = {
  admin_national:       { label: "Admin national",    bg: "#F5F3FF", color: "#7C3AED", initBg: "#F5F3FF", initColor: "#7C3AED" },
  admin:                { label: "Admin national",    bg: "#F5F3FF", color: "#7C3AED", initBg: "#F5F3FF", initColor: "#7C3AED" },
  responsable_regional: { label: "Resp. régional",    bg: "#F9F0EA", color: "#B25C2A", initBg: "#F9F0EA", initColor: "#B25C2A" },
  consultant:           { label: "Consultant",        bg: "#EFF6FF", color: "#0369A1", initBg: "#EFF6FF", initColor: "#0369A1" },
  client:               { label: "Client",            bg: "#F0FDF4", color: "#2F7D5C", initBg: "#F0FDF4", initColor: "#2F7D5C" },
}

const CONTEXTE_CONFIG: Record<ContexteType, { label: string; bg: string; color: string }> = {
  campagne: { label: "Campagne", bg: "#F9F0EA", color: "#B25C2A" },
  mission:  { label: "Mission",  bg: "#EFF6FF", color: "#0369A1" },
  demande:  { label: "Demande",  bg: "#F0FDF4", color: "#2F7D5C" },
  actif:    { label: "Actif",    bg: "#F5F3FF", color: "#7C3AED" },
}

function initiales(prenom: string, nom: string) {
  return `${(prenom[0] || "").toUpperCase()}${(nom[0] || "").toUpperCase()}`
}

function formatHeure(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "à l'instant"
  if (h < 24) return `il y a ${h}h`
  const j = Math.floor(h / 24)
  if (j === 1) return "hier"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

function formatHeureMsg(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function Messagerie() {
  const [userId, setUserId]                   = useState<string>("")
  const [monRole, setMonRole]                 = useState<string>("")
  const [monPrenom, setMonPrenom]             = useState<string>("")
  const [monNom, setMonNom]                   = useState<string>("")
  const [onglet, setOnglet]                   = useState<OngletPrincipal>("interne")
  const [conversations, setConversations]     = useState<Conversation[]>([])
  const [selected, setSelected]               = useState<Conversation | null>(null)
  const [messages, setMessages]               = useState<any[]>([])
  const [contenu, setContenu]                 = useState("")
  const [loading, setLoading]                 = useState(true)
  const [sending, setSending]                 = useState(false)
  const [profils, setProfils]                 = useState<Record<string, ProfilCache>>({})
  const [destinataireId, setDestinatataireId] = useState<string>("")
  const [interlocuteurs, setInterlocuteurs]   = useState<ProfilCache[]>([])
  const [nbNonLus, setNbNonLus]               = useState<Record<OngletPrincipal, number>>({ interne: 0, clients: 0 })
  const bottomRef                             = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { if (userId) loadConversations() }, [onglet, userId])
  useEffect(() => { if (selected) loadMessages() }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profil } = await supabase
      .from("profils")
      .select("role, prenom, nom")
      .eq("id", user.id)
      .maybeSingle()
    if (profil) {
      setMonRole(profil.role)
      setMonPrenom(profil.prenom || "")
      setMonNom(profil.nom || "")
    }
    setLoading(false)
  }

  async function loadConversations() {
    if (!userId) return

if (onglet === "interne") {
      // Messages entre membres AGE
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, campagne:campagne_id(id, nom, client_id), mission:mission_id(id, societe, client_id), demande:demande_id(id, type_prestation, client_id)")
        .eq("type_conversation", "interne")
        .or(`expediteur_id.eq.${userId},destinataire_id.eq.${userId},destinataire_id.is.null`)
        .order("created_at", { ascending: false })

      if (!msgs) { setConversations([]); return }

      const map = new Map<string, Conversation>()
      for (const msg of msgs) {
        let key = "", titre = "", sousTitre = "", contexte: ContexteType = "campagne", refId = ""

        if (msg.campagne_id) {
          key = `campagne_${msg.campagne_id}`
          titre = (msg.campagne as any)?.nom || "Campagne"
          sousTitre = "Campagne"
          contexte = "campagne"
          refId = msg.campagne_id
        } else if (msg.mission_id) {
          key = `mission_${msg.mission_id}`
          titre = (msg.mission as any)?.societe || "Mission"
          sousTitre = "Mission"
          contexte = "mission"
          refId = msg.mission_id
        } else if (msg.demande_id) {
          key = `demande_${msg.demande_id}`
          titre = (msg.demande as any)?.type_prestation || "Demande"
          sousTitre = "Demande"
          contexte = "demande"
          refId = msg.demande_id
        } else continue

        if (!map.has(key)) {
          map.set(key, { id: key, titre, sousTitre, contexte, refId, nbNonLus: 0 })
        }
        if (!msg.lu && msg.expediteur_id !== userId) {
          map.get(key)!.nbNonLus++
        }
      }

      const convs = Array.from(map.values())
      setConversations(convs)
      if (convs.length > 0 && !selected) setSelected(convs[0])

    } else {
      // Messages avec clients
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, campagne:campagne_id(id, nom, client_id), mission:mission_id(id, societe, client_id), demande:demande_id(id, type_prestation, client_id), actif:actif_id(id, nom, user_id)")
        .eq("type_conversation", "client")
        .order("created_at", { ascending: false })

      if (!msgs) { setConversations([]); return }

      const map = new Map<string, Conversation>()
      for (const msg of msgs) {
        let key = "", titre = "", sousTitre = "", contexte: ContexteType = "campagne", refId = "", clientId = msg.client_id

        if (msg.campagne_id) {
          key = `campagne_${msg.campagne_id}`
          titre = (msg.campagne as any)?.nom || "Campagne"
          sousTitre = "Campagne"
          contexte = "campagne"
          refId = msg.campagne_id
          clientId = clientId || (msg.campagne as any)?.client_id
        } else if (msg.mission_id) {
          key = `mission_${msg.mission_id}`
          titre = (msg.mission as any)?.societe || "Mission"
          sousTitre = "Mission"
          contexte = "mission"
          refId = msg.mission_id
          clientId = clientId || (msg.mission as any)?.client_id
        } else if (msg.demande_id) {
          key = `demande_${msg.demande_id}`
          titre = (msg.demande as any)?.type_prestation || "Demande"
          sousTitre = "Demande"
          contexte = "demande"
          refId = msg.demande_id
          clientId = clientId || (msg.demande as any)?.client_id
        } else if (msg.actif_id) {
          key = `actif_${msg.actif_id}`
          titre = (msg.actif as any)?.nom || "Actif"
          sousTitre = "Actif"
          contexte = "actif"
          refId = msg.actif_id
          clientId = clientId || (msg.actif as any)?.user_id
        } else continue

        if (!map.has(key)) {
          map.set(key, { id: key, titre, sousTitre, contexte, refId, nbNonLus: 0, clientId })
        }
        if (!msg.lu && msg.expediteur_id !== userId) {
          map.get(key)!.nbNonLus++
        }
      }

      // Enrichir avec raison sociale client
      const clientIds = [...new Set(Array.from(map.values()).map(c => c.clientId).filter(Boolean))] as string[]
      if (clientIds.length > 0) {
        const { data: pcs } = await supabase.from("profils_client").select("id, organisation_id").in("id", clientIds)
        const orgIds = [...new Set((pcs || []).map(p => p.organisation_id).filter(Boolean))]
        const { data: orgs } = await supabase.from("organisations").select("id, raison_sociale").in("id", orgIds)
        const orgMap: Record<string, string> = {}
        orgs?.forEach(o => { orgMap[o.id] = o.raison_sociale })
        const pcMap: Record<string, string> = {}
        pcs?.forEach(p => { if (p.organisation_id) pcMap[p.id] = orgMap[p.organisation_id] ?? "" })
          console.log("clientIds:", clientIds)
console.log("pcMap:", pcMap)
        map.forEach((conv, key) => {
          if (conv.clientId && pcMap[conv.clientId]) {
            map.set(key, { ...conv, clientNom: pcMap[conv.clientId] })
          }
        })
      }

      const convs = Array.from(map.values())
      setConversations(convs)
      if (convs.length > 0 && !selected) setSelected(convs[0])
    }

    // Compter non lus globaux
    const { count: nbInterne } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("type_conversation", "interne")
      .or(`expediteur_id.eq.${userId},destinataire_id.eq.${userId},destinataire_id.is.null`)
      .eq("destinataire_id", userId)
      .eq("lu", false)

    const { count: nbClients } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("type_conversation", "client")
      .neq("expediteur_id", userId)
      .eq("lu", false)

    setNbNonLus({ interne: nbInterne || 0, clients: nbClients || 0 })
  }

  async function loadMessages() {
    if (!selected) return

    let query = supabase.from("messages").select("*")
    if (selected.contexte === "campagne") query = query.eq("campagne_id", selected.refId)
    if (selected.contexte === "mission")  query = query.eq("mission_id",  selected.refId)
    if (selected.contexte === "demande")  query = query.eq("demande_id",  selected.refId)
    if (selected.contexte === "actif")    query = query.eq("actif_id",    selected.refId)
    if (onglet === "interne") query = query.eq("type_conversation", "interne")
    if (onglet === "clients") query = query.eq("type_conversation", "client")

    const { data } = await query.order("created_at", { ascending: true })
    setMessages(data || [])

    // Marquer comme lus
    let upd = supabase.from("messages").update({ lu: true }).neq("expediteur_id", userId)
    if (selected.contexte === "campagne") upd = upd.eq("campagne_id", selected.refId)
    if (selected.contexte === "mission")  upd = upd.eq("mission_id",  selected.refId)
    if (selected.contexte === "demande")  upd = upd.eq("demande_id",  selected.refId)
    if (selected.contexte === "actif")    upd = upd.eq("actif_id",    selected.refId)
    await upd

    // Charger profils expéditeurs
    const ids = [...new Set((data || []).map((m: any) => m.expediteur_id))]
    if (ids.length > 0) {
      const { data: profilsAGE } = await supabase.from("profils").select("id, prenom, nom, role").in("id", ids)
      const map: Record<string, ProfilCache> = {}
      profilsAGE?.forEach(p => { map[p.id] = p })
     const { data: profilsClient } = await supabase
  .from("profils_client")
  .select("id, type_client, organisation_id")
  .in("id", ids)

const orgIdsClient = [...new Set((profilsClient || []).map((p: any) => p.organisation_id).filter(Boolean))]
const { data: orgsClient } = orgIdsClient.length > 0
  ? await supabase.from("organisations").select("id, raison_sociale").in("id", orgIdsClient)
  : { data: [] }
const orgMapClient: Record<string, string> = {}
orgsClient?.forEach((o: any) => { orgMapClient[o.id] = o.raison_sociale })

profilsClient?.forEach((p: any) => {
  if (!map[p.id]) {
    const raisonSociale = p.organisation_id ? (orgMapClient[p.organisation_id] || p.type_client || "Client") : (p.type_client || "Client")
    map[p.id] = { id: p.id, prenom: raisonSociale, nom: "", role: "client" }
  }
})
      setProfils(map)
    }

    // Charger interlocuteurs possibles pour le sélecteur destinataire
    if (onglet === "interne") {
      const { data: membres } = await supabase
        .from("profils")
        .select("id, prenom, nom, role")
        .in("role", ["admin_national", "admin", "responsable_regional", "consultant"])
        .neq("id", userId)
      setInterlocuteurs(membres || [])
      if (membres && membres.length > 0 && !destinataireId) setDestinatataireId(membres[0].id)
    }
  }

  async function handleEnvoyer() {
    if (!contenu.trim() || !selected || !userId) return
    setSending(true)
    const payload: any = {
      expediteur_id:     userId,
      contenu:           contenu.trim(),
      lu:                false,
      type_conversation: onglet,
      client_id:         selected.clientId || null,
    }
    if (onglet === "interne" && destinataireId) payload.destinataire_id = destinataireId
    if (selected.contexte === "campagne") payload.campagne_id = selected.refId
    if (selected.contexte === "mission")  payload.mission_id  = selected.refId
    if (selected.contexte === "demande")  payload.demande_id  = selected.refId
    if (selected.contexte === "actif")    payload.actif_id    = selected.refId
    await supabase.from("messages").insert(payload)
    setContenu("")
    await loadMessages()
    setSending(false)
  }

  // Grouper conversations par contexte
  const groupes: Record<ContexteType, Conversation[]> = {
    campagne: conversations.filter(c => c.contexte === "campagne"),
    mission:  conversations.filter(c => c.contexte === "mission"),
    demande:  conversations.filter(c => c.contexte === "demande"),
    actif:    conversations.filter(c => c.contexte === "actif"),
  }

  const nbNonLusTotal = nbNonLus.interne + nbNonLus.clients

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#9CA3AF", fontSize: "14px" }}>
      Chargement…
    </div>
  )

  return (
    <div style={{ display: "flex", gap: "0", height: "calc(100vh - 120px)", background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "12px", overflow: "hidden" }}>

      {/* ── Sidebar gauche ── */}
      <div style={{ width: "280px", borderRight: "1px solid #E2DDD8", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #E2DDD8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Messagerie</span>
            {nbNonLusTotal > 0 && (
              <span style={{ background: "#B91C1C", color: "white", fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "10px" }}>
                {nbNonLusTotal}
              </span>
            )}
          </div>
          {/* Onglets Interne / Clients */}
          <div style={{ display: "flex", background: "#F4F3F0", borderRadius: "8px", padding: "3px", gap: "2px" }}>
            {([
              { key: "interne" as const, label: "Interne AGE", icon: "ti-users" },
              { key: "clients" as const, label: "Clients",     icon: "ti-building-community" },
            ]).map(o => (
              <button key={o.key} onClick={() => { setOnglet(o.key); setSelected(null); setMessages([]) }} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                padding: "6px 8px", border: "none", borderRadius: "6px",
                background: onglet === o.key ? "#FFFFFF" : "transparent",
                color: onglet === o.key ? "#111827" : "#6B7280",
                fontSize: "12px", fontWeight: onglet === o.key ? 500 : 400,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: onglet === o.key ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}>
                <i className={`ti ${o.icon}`} style={{ fontSize: "13px" }} />
                {o.label}
                {nbNonLus[o.key] > 0 && (
                  <span style={{ background: "#B91C1C", color: "white", fontSize: "9px", fontWeight: 600, padding: "1px 4px", borderRadius: "8px" }}>
                    {nbNonLus[o.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Liste conversations groupées */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
              <i className="ti ti-message-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
              Aucune conversation
            </div>
          ) : (Object.entries(groupes) as [ContexteType, Conversation[]][]).map(([type, convs]) => {
            if (convs.length === 0) return null
            const cfg = CONTEXTE_CONFIG[type]
            return (
              <div key={type}>
                <div style={{ padding: "8px 16px 4px", fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {cfg.label}s
                </div>
                {convs.map(c => (
                  <div key={c.id} onClick={() => setSelected(c)} style={{
                    padding: "10px 16px", borderBottom: "1px solid #F4F3F0", cursor: "pointer",
                    background: selected?.id === c.id ? "#F9F0EA" : "transparent",
                    borderLeft: `3px solid ${selected?.id === c.id ? "#B25C2A" : "transparent"}`,
                  }}
                    onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = "#F9F7F4" }}
                    onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = "transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                          <span style={{ background: cfg.bg, color: cfg.color, fontSize: "9px", padding: "1px 5px", borderRadius: "8px", fontWeight: 500, flexShrink: 0 }}>
                            {cfg.label}
                          </span>
                          {c.nbNonLus > 0 && (
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#B91C1C", flexShrink: 0 }} />
                          )}
                        </div>
                        {c.clientNom && (
  <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
    {c.clientNom}
  </div>
)}
<div style={{ fontSize: "11px", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
  {c.titre}
</div>
                      </div>
                      {c.nbNonLus > 0 && (
                        <span style={{ background: "#B91C1C", color: "white", fontSize: "9px", fontWeight: 600, padding: "1px 5px", borderRadius: "8px", flexShrink: 0 }}>
                          {c.nbNonLus}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Zone messages ── */}
      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header conversation */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2DDD8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ background: CONTEXTE_CONFIG[selected.contexte].bg, color: CONTEXTE_CONFIG[selected.contexte].color, fontSize: "10px", padding: "2px 8px", borderRadius: "8px", fontWeight: 500 }}>
                {CONTEXTE_CONFIG[selected.contexte].label}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{selected.titre}</span>
              {selected.clientNom && (
                <span style={{ fontSize: "12px", color: "#6B7280" }}>· {selected.clientNom}</span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: "13px", marginTop: "40px" }}>
                <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }} />
                Aucun message
              </div>
            ) : messages.map((msg, i) => {
              const isMine = msg.expediteur_id === userId
              const profil = profils[msg.expediteur_id]
              const role = profil?.role || "client"
              const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.client
              const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at)
              const prenomExp = profil?.prenom || "?"
              const nomExp = profil?.nom || ""
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: "center", fontSize: "11px", color: "#9CA3AF", margin: "4px 0" }}>
                      {formatDate(msg.created_at)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                    {/* Avatar */}
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: isMine ? "#B25C2A" : cfg.initBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "10px", fontWeight: 600, color: isMine ? "white" : cfg.initColor }}>
                      {isMine ? initiales(monPrenom, monNom) : initiales(prenomExp, nomExp)}
                    </div>
                    <div style={{ maxWidth: "65%" }}>
                      {/* Nom + rôle */}
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", flexDirection: isMine ? "row-reverse" : "row" }}>
                        <span style={{ fontSize: "11px", color: "#6B7280" }}>
                          {isMine ? `${monPrenom} ${monNom}`.trim() : `${prenomExp} ${nomExp}`.trim()}
                        </span>
                        <span style={{ background: isMine ? "#F9F0EA" : cfg.bg, color: isMine ? "#B25C2A" : cfg.color, fontSize: "9px", padding: "1px 5px", borderRadius: "8px", fontWeight: 500 }}>
                          {isMine ? (ROLE_CONFIG[monRole]?.label || monRole) : (cfg.label)}
                        </span>
                      </div>
                      {/* Bulle */}
                      <div style={{ background: isMine ? "#B25C2A" : "#F4F3F0", color: isMine ? "white" : "#111827", padding: "10px 14px", borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", fontSize: "13px", lineHeight: 1.5 }}>
                        {msg.contenu}
                      </div>
                      {/* Heure + lu */}
                      <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px", textAlign: isMine ? "right" : "left" }}>
                        {formatHeureMsg(msg.created_at)}
                        {isMine && <span style={{ marginLeft: "4px" }}>{msg.lu ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Zone saisie */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #E2DDD8", display: "flex", flexDirection: "column", gap: "8px" }}>

            {/* Sélecteur destinataire (interne uniquement) */}
            {onglet === "interne" && interlocuteurs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#6B7280", flexShrink: 0 }}>À :</span>
                <select
                  value={destinataireId}
                  onChange={e => setDestinatataireId(e.target.value)}
                  style={{ fontSize: "12px", padding: "4px 8px", border: "1px solid #E2DDD8", borderRadius: "6px", background: "#FFFFFF", color: "#111827", fontFamily: "inherit", cursor: "pointer" }}
                >
                  {interlocuteurs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.prenom} {p.nom} — {ROLE_CONFIG[p.role]?.label || p.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnvoyer() } }}
                placeholder="Écrire un message… (Entrée pour envoyer)"
                rows={2}
                style={{ flex: 1, padding: "10px 14px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "none", outline: "none", color: "#111827", background: "#FFFFFF" }}
              />
              <button
                onClick={handleEnvoyer}
                disabled={!contenu.trim() || sending}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: contenu.trim() ? "#B25C2A" : "#E2DDD8", color: contenu.trim() ? "white" : "#9CA3AF", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: contenu.trim() ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", flexShrink: 0, opacity: sending ? 0.7 : 1 }}
              >
                <i className="ti ti-send" style={{ fontSize: "15px" }} />
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: "14px" }}>
          <div style={{ textAlign: "center" }}>
            <i className="ti ti-message-circle" style={{ fontSize: "40px", display: "block", marginBottom: "12px" }} />
            Sélectionnez une conversation
          </div>
        </div>
      )}
    </div>
  )
}