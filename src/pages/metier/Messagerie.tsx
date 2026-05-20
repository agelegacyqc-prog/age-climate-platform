import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type Onglet = "clients" | "missions"

interface Conversation {
  id: string
  titre: string
  sousTitre: string
  type: "mission" | "actif" | "demande" | "campagne"
  refId: string
  nbNonLus: number
  clientId?: string
  clientEmail?: string
}

export default function Messagerie() {
  const navigate = useNavigate()
  const [userId, setUserId]               = useState<string>("")
  const [onglet, setOnglet]               = useState<Onglet>("clients")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected]           = useState<Conversation | null>(null)
  const [messages, setMessages]           = useState<any[]>([])
  const [contenu, setContenu]             = useState("")
  const [loading, setLoading]             = useState(true)
  const [sending, setSending]             = useState(false)
  const [profils, setProfils]             = useState<Record<string, any>>({})
  const bottomRef                         = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { loadConversations() }, [onglet, userId])
  useEffect(() => { if (selected) loadMessages() }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setLoading(false)
  }

  async function loadConversations() {
    if (!userId) return

    if (onglet === "clients") {
      // Messages liés aux actifs, demandes, campagnes
      const { data: msgs } = await supabase
  .from("messages")
  .select("*, actif:actif_id(id, nom, adresse, user_id), demande:demande_id(id, type_prestation, client_id), campagne:campagne_id(id, nom, client_id)")
  .or("actif_id.not.is.null,demande_id.not.is.null,campagne_id.not.is.null")
  .order("created_at", { ascending: false })

      if (!msgs) return

      // Grouper par contexte
      const map = new Map<string, Conversation>()
      for (const msg of msgs) {
        let key = "", titre = "", sousTitre = "", type: Conversation["type"] = "actif", refId = ""
        if (msg.actif_id) {
          key = `actif_${msg.actif_id}`
          titre = (msg.actif as any)?.nom || (msg.actif as any)?.adresse || "Actif"
          sousTitre = "Actif immobilier"
          type = "actif"
          refId = msg.actif_id
        } else if (msg.demande_id) {
          key = `demande_${msg.demande_id}`
          titre = (msg.demande as any)?.type_prestation || "Demande marketplace"
          sousTitre = "Demande Marketplace"
          type = "demande"
          refId = msg.demande_id
        } else if (msg.campagne_id) {
          key = `campagne_${msg.campagne_id}`
          titre = (msg.campagne as any)?.nom || "Campagne"
          sousTitre = "Campagne client"
          type = "campagne"
          refId = msg.campagne_id
        } else continue

       if (!map.has(key)) {
  const clientId = msg.client_id
    || (msg.actif as any)?.user_id
    || (msg.demande as any)?.client_id
    || (msg.campagne as any)?.client_id
  map.set(key, {
    id: key, titre, sousTitre, type, refId,
    nbNonLus: 0, clientId,
  })
}
        if (!msg.lu && msg.expediteur_id !== userId) {
          map.get(key)!.nbNonLus++
        }
      }
      const convs = Array.from(map.values())
      setConversations(convs)
      if (convs.length > 0 && !selected) setSelected(convs[0])

    } else {
      // Missions
      const { data: profil } = await supabase.from("profils").select("role").eq("id", userId).single()
      const query = profil?.role === "admin"
        ? supabase.from("missions").select("*").order("created_at", { ascending: false })
        : supabase.from("missions").select("*").eq("consultant_id", userId).order("created_at", { ascending: false })
      const { data: missionsData } = await query
      const convs: Conversation[] = (missionsData || []).map(m => ({
        id: `mission_${m.id}`, titre: m.societe || "Mission", sousTitre: `Phase ${m.phase || 1}/10 · ${m.secteur || "—"}`,
        type: "mission" as const, refId: m.id, nbNonLus: 0,
      }))
      setConversations(convs)
      if (convs.length > 0 && !selected) setSelected(convs[0])
    }
  }

  async function loadMessages() {
    if (!selected) return
    let query = supabase.from("messages").select("*")

    if (selected.type === "mission")   query = query.eq("mission_id",  selected.refId)
    if (selected.type === "actif")     query = query.eq("actif_id",    selected.refId)
    if (selected.type === "demande")   query = query.eq("demande_id",  selected.refId)
    if (selected.type === "campagne")  query = query.eq("campagne_id", selected.refId)

    const { data } = await query.order("created_at", { ascending: true })
    setMessages(data || [])

    // Marquer comme lus
    let updateQuery = supabase.from("messages").update({ lu: true }).neq("expediteur_id", userId)
    if (selected.type === "mission")  updateQuery = updateQuery.eq("mission_id",  selected.refId)
    if (selected.type === "actif")    updateQuery = updateQuery.eq("actif_id",    selected.refId)
    if (selected.type === "demande")  updateQuery = updateQuery.eq("demande_id",  selected.refId)
    if (selected.type === "campagne") updateQuery = updateQuery.eq("campagne_id", selected.refId)
    await updateQuery

    // Charger profils
    const ids = [...new Set((data || []).map((m: any) => m.expediteur_id))]
    if (ids.length > 0) {
      const { data: profilsData } = await supabase.from("profils").select("id, prenom, nom, role").in("id", ids)
      const map: Record<string, any> = {}
      profilsData?.forEach(p => { map[p.id] = p })

      // Chercher aussi dans profils_client
      const { data: profilsClient } = await supabase.from("profils_client").select("id, type_client").in("id", ids)
      profilsClient?.forEach(p => { if (!map[p.id]) map[p.id] = { ...p, prenom: "Client", nom: p.type_client } })

      // Récupérer emails
      setProfils(map)
    }
  }

  async function handleEnvoyer() {
    if (!contenu.trim() || !selected || !userId) return
    setSending(true)
    const payload: any = { 
  expediteur_id: userId, 
  contenu: contenu.trim(), 
  lu: false,
  client_id: selected.clientId || null,
}
    if (selected.type === "mission")  payload.mission_id  = selected.refId
    if (selected.type === "actif")    payload.actif_id    = selected.refId
    if (selected.type === "demande")  payload.demande_id  = selected.refId
    if (selected.type === "campagne") payload.campagne_id = selected.refId
    await supabase.from("messages").insert(payload)
    setContenu("")
    await loadMessages()
    setSending(false)
  }

  function nomExpediteur(id: string) {
    if (id === userId) return "Moi"
    const p = profils[id]
    if (!p) return "Client"
    return `${p.prenom || ""} ${p.nom || ""}`.trim() || "Utilisateur"
  }

  function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const nbNonLusClients  = conversations.filter(c => c.type !== "mission").reduce((s, c) => s + c.nbNonLus, 0)
  const nbNonLusMissions = conversations.filter(c => c.type === "mission").reduce((s, c) => s + c.nbNonLus, 0)

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", gap: "0", height: "calc(100vh - 120px)", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>

      {/* Sidebar */}
      <div style={{ width: "300px", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <button onClick={() => navigate("/metier")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "12px", fontFamily: "inherit", marginBottom: "10px" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: "13px" }} aria-hidden="true" /> Retour
          </button>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Messagerie</div>
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
          {([
            { key: "clients",  label: "Clients",  icon: "ti-users",    nb: nbNonLusClients  },
            { key: "missions", label: "Missions", icon: "ti-briefcase", nb: nbNonLusMissions },
          ] as const).map(o => (
            <button key={o.key} onClick={() => { setOnglet(o.key); setSelected(null); setMessages([]) }} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "10px 8px", background: "transparent", border: "none",
              borderBottom: onglet === o.key ? "2px solid #0F6E56" : "2px solid transparent",
              color: onglet === o.key ? "#0F6E56" : "#64748B",
              fontSize: "13px", fontWeight: onglet === o.key ? 500 : 400,
              cursor: "pointer", fontFamily: "inherit", marginBottom: "-1px",
            }}>
              <i className={`ti ${o.icon}`} style={{ fontSize: "14px" }} aria-hidden="true" />
              {o.label}
              {o.nb > 0 && (
                <span style={{ background: "#B91C1C", color: "white", fontSize: "10px", fontWeight: 600, padding: "1px 5px", borderRadius: "10px" }}>{o.nb}</span>
              )}
            </button>
          ))}
        </div>

        {/* Liste conversations */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
              Aucune conversation
            </div>
          ) : conversations.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{
              padding: "12px 16px", borderBottom: "1px solid #F1F5F9", cursor: "pointer",
              background: selected?.id === c.id ? "#ECFDF5" : "white",
              borderLeft: selected?.id === c.id ? "3px solid #0F6E56" : "3px solid transparent",
              transition: "all 0.1s",
            }}
              onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = "#FAFFFE" }}
              onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = "white" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: "8px" }}>
                  {c.titre}
                </div>
                {c.nbNonLus > 0 && (
                  <span style={{ background: "#B91C1C", color: "white", fontSize: "10px", fontWeight: 600, padding: "1px 5px", borderRadius: "10px", flexShrink: 0 }}>{c.nbNonLus}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ background: "#F1F5F9", color: "#64748B", padding: "1px 6px", borderRadius: "3px", fontSize: "10px" }}>{c.sousTitre}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone messages */}
      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{selected.titre}</div>
              <div style={{ fontSize: "12px", color: "#94A3B8" }}>{selected.sousTitre}</div>
            </div>
            <span style={{ background: "#ECFDF5", color: "#065F46", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>
              {selected.type === "mission" ? "Mission" : selected.type === "actif" ? "Actif" : selected.type === "demande" ? "Marketplace" : "Campagne"}
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", marginTop: "40px" }}>
                <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                Aucun message
              </div>
            ) : messages.map((msg, i) => {
              const isMine   = msg.expediteur_id === userId
              const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at)
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: "center", fontSize: "11px", color: "#94A3B8", margin: "8px 0" }}>
                      {formatDate(msg.created_at)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMine ? "#0F6E56" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", fontWeight: 600, color: isMine ? "white" : "#065F46" }}>
                      {isMine ? "A" : "C"}
                    </div>
                    <div style={{ maxWidth: "65%" }}>
                      {!isMine && (
                        <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "3px", paddingLeft: "4px" }}>
                          {nomExpediteur(msg.expediteur_id)}
                        </div>
                      )}
                      <div style={{ background: isMine ? "#0F6E56" : "#F1F5F9", color: isMine ? "white" : "#0F172A", padding: "10px 14px", borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", fontSize: "13px", lineHeight: 1.5 }}>
                        {msg.contenu}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "3px", textAlign: isMine ? "right" : "left", paddingLeft: isMine ? 0 : "4px", paddingRight: isMine ? "4px" : 0 }}>
                        {formatHeure(msg.created_at)}
                        {isMine && <span style={{ marginLeft: "4px" }}>{msg.lu ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Saisie */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <textarea
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnvoyer() } }}
              placeholder="Écrire un message… (Entrée pour envoyer)"
              rows={2}
              style={{ flex: 1, padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "none", outline: "none", color: "#0F172A" }}
            />
            <button
              onClick={handleEnvoyer}
              disabled={!contenu.trim() || sending}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: contenu.trim() ? "#0F6E56" : "#E2E8F0", color: contenu.trim() ? "white" : "#94A3B8", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: contenu.trim() ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", flexShrink: 0, opacity: sending ? 0.7 : 1 }}>
              <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: "14px" }}>
          <div style={{ textAlign: "center" }}>
            <i className="ti ti-message-circle" style={{ fontSize: "40px", display: "block", marginBottom: "12px" }} aria-hidden="true" />
            Sélectionnez une conversation
          </div>
        </div>
      )}
    </div>
  )
}