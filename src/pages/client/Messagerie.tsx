import React, { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"

type Onglet = "demandes" | "campagnes" | "actifs"

export default function ClientMessagerie() {
  const [onglet, setOnglet]         = useState<Onglet>("demandes")
  const [userId, setUserId]         = useState<string>("")
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected]     = useState<any>(null)
  const [messages, setMessages]     = useState<any[]>([])
  const [contenu, setContenu]       = useState("")
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const [nbNonLus, setNbNonLus] = useState<Record<string, number>>({ demandes: 0, campagnes: 0, actifs: 0 })
  
  const bottomRef                   = useRef<HTMLDivElement>(null)

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
    if (onglet === "demandes") {
      const { data } = await supabase
        .from("demandes_marketplace")
        .select("*")
        .order("created_at", { ascending: false })
      setConversations(data || [])
      if (data && data.length > 0 && !selected) setSelected(data[0])
    } else if (onglet === "campagnes") {
      const { data } = await supabase
        .from("campagnes")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
      setConversations(data || [])
      if (data && data.length > 0) setSelected(data[0])
      else setSelected(null)
  } else if (onglet === "actifs") {
  const { data } = await supabase
    .from("actifs")
    .select("*")
    .eq("user_id", userId)
    .eq("categorie", "patrimoine_propre")
    .eq("actif", true)
    .order("created_at", { ascending: false })
  setConversations(data || [])
  if (data && data.length > 0) setSelected(data[0])
  else setSelected(null)
}
  }

  async function loadMessages() {
    if (!selected) return
    let query = supabase.from("messages").select("*")
    if (onglet === "demandes")  query = query.eq("demande_id",  selected.id)
    if (onglet === "campagnes") query = query.eq("campagne_id", selected.id)
    if (onglet === "actifs")    query = query.eq("actif_id",    selected.id)
    const { data } = await query.order("created_at", { ascending: true })
    setMessages(data || [])
    // Marquer comme lus
    if (data && data.length > 0) {
      let updateQuery = supabase.from("messages").update({ lu: true }).neq("expediteur_id", userId)
      if (onglet === "demandes")  updateQuery = updateQuery.eq("demande_id",  selected.id)
      if (onglet === "campagnes") updateQuery = updateQuery.eq("campagne_id", selected.id)
      if (onglet === "actifs")    updateQuery = updateQuery.eq("actif_id",    selected.id)
      await updateQuery
    }
    // Compter non lus par onglet
    const counts: Record<string, number> = { demandes: 0, campagnes: 0, actifs: 0 }
    const { data: nonLus } = await supabase
      .from("messages")
      .select("demande_id, campagne_id, actif_id")
      .eq("client_id", userId)
      .eq("lu", false)
      .neq("expediteur_id", userId)
    if (nonLus) {
      nonLus.forEach(m => {
        if (m.demande_id)  counts.demandes++
        if (m.campagne_id) counts.campagnes++
        if (m.actif_id)    counts.actifs++
      })
    }
    setNbNonLus(counts)
  }

  async function handleEnvoyer() {
    if (!contenu.trim() || !selected || !userId) return
    setSending(true)
    const payload: any = {
      expediteur_id: userId,
      client_id:     userId,
      contenu:       contenu.trim(),
      lu:            false,
    }
    if (onglet === "demandes")  payload.demande_id  = selected.id
    if (onglet === "campagnes") payload.campagne_id = selected.id
    if (onglet === "actifs")    payload.actif_id    = selected.id
    await supabase.from("messages").insert(payload)
    setContenu("")
    await loadMessages()
    setSending(false)
  }

  function nomConversation(c: any) {
    if (onglet === "demandes")  return c.type_prestation || "Demande de prestation"
    if (onglet === "campagnes") return c.nom || "Campagne"
    if (onglet === "actifs")    return c.nom || c.adresse || "Actif"
    return "—"
  }

  function sousTitre(c: any) {
    if (onglet === "demandes")  return c.statut || "—"
    if (onglet === "campagnes") return c.statut || "—"
    if (onglet === "actifs")    return `${c.ville || ""} ${c.code_postal || ""}`.trim() || "—"
    return "—"
  }

  function formatHeure(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return "à l'instant"
    if (h < 24) return `il y a ${h}h`
    const j = Math.floor(h / 24)
    return j === 1 ? "hier" : new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
  }

  function formatHeureMsg(iso: string) {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

 const onglets = [
  { id: "demandes",  label: "Demandes",  icon: "ti-clipboard-list", nb: nbNonLus.demandes  },
  { id: "campagnes", label: "Campagnes", icon: "ti-speakerphone",   nb: nbNonLus.campagnes },
  { id: "actifs",    label: "Actifs",    icon: "ti-building",       nb: nbNonLus.actifs    },
] as const

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {onglets.map(o => (
          <button key={o.id} onClick={() => { setOnglet(o.id); setSelected(null); setMessages([]) }} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "7px", border: "none",
            background: onglet === o.id ? "#ECFDF5" : "transparent",
            color: onglet === o.id ? "#065F46" : "#64748B",
            fontSize: "13px", fontWeight: onglet === o.id ? 500 : 400,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
{o.label}
{o.nb > 0 && (
  <span style={{ background: "#B91C1C", color: "white", fontSize: "10px", fontWeight: 600, padding: "1px 5px", borderRadius: "10px" }}>
    {o.nb}
  </span>
)}
          </button>
        ))}
      </div>

      {/* Layout 2 colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "12px", alignItems: "start" }}>

        {/* Liste conversations */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #E2E8F0", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
            Mes {onglet}
          </div>
          {conversations.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
              Aucune conversation
            </div>
          ) : conversations.map(c => {
            const isSelected = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => setSelected(c)} style={{
                padding: "12px 14px",
                borderBottom: "1px solid #F1F5F9",
                borderLeft: `3px solid ${isSelected ? "#0F6E56" : "transparent"}`,
                background: isSelected ? "#ECFDF5" : "white",
                cursor: "pointer", transition: "all 0.1s",
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#FAFFFE" }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "white" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: "8px" }}>
                    {nomConversation(c)}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>{sousTitre(c)}</div>
              </div>
            )
          })}
        </div>

        {/* Fil de messages */}
        {selected ? (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{nomConversation(selected)}</div>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                {onglet === "demandes" && "Demande Marketplace"}
                {onglet === "campagnes" && "Campagne"}
                {onglet === "actifs" && "Actif immobilier"}
                {" · "}
                <span style={{ background: "#ECFDF5", color: "#065F46", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                  {sousTitre(selected)}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "280px", maxHeight: "400px", overflowY: "auto" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", marginTop: "40px" }}>
                  <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                  Aucun message — commencez la conversation avec AGE
                </div>
              ) : messages.map(msg => {
                const isMine = msg.expediteur_id === userId
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isMine ? "#0F6E56" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", fontWeight: 600, color: isMine ? "white" : "#065F46" }}>
                      {isMine ? "C" : "A"}
                    </div>
                    <div style={{ maxWidth: "65%" }}>
                      {!isMine && <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "3px", paddingLeft: "4px" }}>AGE Climate</div>}
                      <div style={{ background: isMine ? "#0F6E56" : "#F1F5F9", color: isMine ? "white" : "#0F172A", padding: "10px 14px", borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", fontSize: "13px", lineHeight: 1.5 }}>
                        {msg.contenu}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "3px", textAlign: isMine ? "right" : "left", paddingLeft: isMine ? 0 : "4px", paddingRight: isMine ? "4px" : 0 }}>
                        {formatHeureMsg(msg.created_at)}
                        {isMine && <span style={{ marginLeft: "4px" }}>{msg.lu ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Zone saisie */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnvoyer() } }}
                placeholder="Écrire un message… (Entrée pour envoyer)"
                rows={2}
                style={{ flex: 1, padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "none", outline: "none", color: "#0F172A" }}
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
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
            <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "12px" }} aria-hidden="true" />
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  )
}