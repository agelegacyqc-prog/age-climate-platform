import React, { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"

type Onglet = "demandes" | "campagnes" | "actifs"

interface ProfilAGE {
  id: string
  prenom: string
  nom: string
  role: string
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  admin_national:       { label: "Admin national",  bg: "#F5F3FF", color: "#7C3AED" },
  admin:                { label: "Admin national",  bg: "#F5F3FF", color: "#7C3AED" },
  responsable_regional: { label: "Resp. régional",  bg: "#F9F0EA", color: "#B25C2A" },
  consultant:           { label: "Consultant",      bg: "#EFF6FF", color: "#0369A1" },
}

function initiales(prenom: string, nom: string) {
  return `${(prenom[0] || "").toUpperCase()}${(nom[0] || "").toUpperCase()}`
}

function formatHeureMsg(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function ClientMessagerie() {
  const [onglet, setOnglet]               = useState<Onglet>("demandes")
  const [userId, setUserId]               = useState<string>("")
  const [monPrenom, setMonPrenom]         = useState<string>("")
  const [monNom, setMonNom]               = useState<string>("")
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected]           = useState<any>(null)
  const [messages, setMessages]           = useState<any[]>([])
  const [profilsAGE, setProfilsAGE]       = useState<Record<string, ProfilAGE>>({})
  const [contenu, setContenu]             = useState("")
  const [loading, setLoading]             = useState(true)
  const [sending, setSending]             = useState(false)
  const [nbNonLus, setNbNonLus]           = useState<Record<string, number>>({ demandes: 0, campagnes: 0, actifs: 0 })
  const bottomRef                         = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { loadConversations() }, [onglet, userId])
  useEffect(() => { if (selected) loadMessages() }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Charger prénom/nom depuis organisations
    const { data: org } = await supabase
      .from("organisations")
      .select("raison_sociale")
      .eq("id", user.id)
      .maybeSingle()
    if (org) {
      setMonPrenom(org.raison_sociale || "")
      setMonNom("")
    } else {
 const { data: pc } = await supabase
        .from("profils_client")
        .select("type_client")
        .eq("id", user.id)
        .maybeSingle()
      setMonPrenom(pc?.type_client || "Client")
    }

    // Ouvrir directement l'onglet contenant le plus de messages non lus
    const { data: nonLus } = await supabase
      .from("messages")
      .select("demande_id, campagne_id, actif_id")
      .or(`client_id.eq.${user.id},destinataire_id.eq.${user.id}`)
      .eq("type_conversation", "client")
      .eq("lu", false)
      .neq("expediteur_id", user.id)
    if (nonLus && nonLus.length > 0) {
      const counts = { demandes: 0, campagnes: 0, actifs: 0 }
      nonLus.forEach(m => {
        if (m.demande_id)  counts.demandes++
        if (m.campagne_id) counts.campagnes++
        if (m.actif_id)    counts.actifs++
      })
      const meilleur = (Object.entries(counts) as [Onglet, number][])
        .sort((a, b) => b[1] - a[1])[0]
      if (meilleur[1] > 0) setOnglet(meilleur[0])
    }

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
        .order("created_at", { ascending: false })
      setConversations(data || [])
      if (data && data.length > 0) setSelected(data[0])
      else setSelected(null)
    }
  }

  async function loadMessages() {
    if (!selected) return

let query = supabase.from("messages").select("*")
      .eq("type_conversation", "client")
    if (onglet === "demandes")  query = query.eq("demande_id",  selected.id)
    if (onglet === "campagnes") query = query.eq("campagne_id", selected.id)
    if (onglet === "actifs")    query = query.eq("actif_id",    selected.id)

    const { data } = await query.order("created_at", { ascending: true })
    setMessages(data || [])

    // Marquer comme lus
    if (data && data.length > 0) {
      let upd = supabase.from("messages").update({ lu: true }).neq("expediteur_id", userId)
      if (onglet === "demandes")  upd = upd.eq("demande_id",  selected.id)
      if (onglet === "campagnes") upd = upd.eq("campagne_id", selected.id)
      if (onglet === "actifs")    upd = upd.eq("actif_id",    selected.id)
      await upd
    }

    // Charger profils AGE des expéditeurs
    const ids = [...new Set((data || []).map((m: any) => m.expediteur_id).filter((id: string) => id !== userId))]
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profils")
        .select("id, prenom, nom, role")
        .in("id", ids)
      const map: Record<string, ProfilAGE> = {}
      profs?.forEach(p => { map[p.id] = p })
      setProfilsAGE(map)
    }

    // Compter non lus
    const counts: Record<string, number> = { demandes: 0, campagnes: 0, actifs: 0 }
    const { data: nonLus } = await supabase
      .from("messages")
      .select("demande_id, campagne_id, actif_id")
      .or(`client_id.eq.${userId},destinataire_id.eq.${userId}`)
      .eq("type_conversation", "client")
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
      expediteur_id:     userId,
      client_id:         userId,
      contenu:           contenu.trim(),
      lu:                false,
      type_conversation: "client",
    }
    if (onglet === "demandes")  payload.demande_id  = selected.id
    if (onglet === "campagnes") payload.campagne_id = selected.id
    if (onglet === "actifs")    payload.actif_id    = selected.id
   await supabase.from("messages").insert(payload)

    // Copie au responsable commercial + admin
    const { data: pcData } = await supabase
      .from("profils_client")
      .select("responsable_commercial_id")
      .eq("id", userId)
      .maybeSingle()
   const respId = pcData?.responsable_commercial_id
    if (respId) {
      await supabase.from("messages").insert({ ...payload, destinataire_id: respId, lu: false })
    }

    // Copie au consultant assigné
    const { data: pcDataConsultant } = await supabase
      .from("profils_client")
      .select("consultant_id")
      .eq("id", userId)
      .maybeSingle()
    const consultantId = pcDataConsultant?.consultant_id
    if (consultantId && consultantId !== respId) {
      await supabase.from("messages").insert({ ...payload, destinataire_id: consultantId, lu: false })
    }

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

  const onglets = [
    { id: "demandes",  label: "Demandes",  icon: "ti-clipboard-list", nb: nbNonLus.demandes  },
    { id: "campagnes", label: "Campagnes", icon: "ti-speakerphone",   nb: nbNonLus.campagnes },
    { id: "actifs",    label: "Actifs",    icon: "ti-building",       nb: nbNonLus.actifs    },
  ] as const

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {onglets.map(o => (
          <button key={o.id} onClick={() => { setOnglet(o.id); setSelected(null); setMessages([]) }} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "7px", border: "none",
            background: onglet === o.id ? "#F9F0EA" : "transparent",
            color: onglet === o.id ? "#B25C2A" : "#64748B",
            fontSize: "13px", fontWeight: onglet === o.id ? 500 : 400,
            cursor: "pointer", fontFamily: "inherit",
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
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #E2DDD8", fontSize: "13px", fontWeight: 500, color: "#111827" }}>
            Mes {onglet}
          </div>
          {conversations.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
              Aucune conversation
            </div>
          ) : conversations.map(c => {
            const isSelected = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => setSelected(c)} style={{
                padding: "12px 14px", borderBottom: "1px solid #F4F3F0",
                borderLeft: `3px solid ${isSelected ? "#B25C2A" : "transparent"}`,
                background: isSelected ? "#F9F0EA" : "white",
                cursor: "pointer",
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F9F7F4" }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "white" }}
              >
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" }}>
                  {nomConversation(c)}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{sousTitre(c)}</div>
              </div>
            )
          })}
        </div>

        {/* Fil de messages */}
        {selected ? (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2DDD8" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{nomConversation(selected)}</div>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>
                  {onglet === "demandes" && "Demande Marketplace"}
                  {onglet === "campagnes" && "Campagne"}
                  {onglet === "actifs" && "Actif immobilier"}
                </span>
                <span style={{ background: "#F9F0EA", color: "#B25C2A", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                  {sousTitre(selected)}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "280px", maxHeight: "420px", overflowY: "auto" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: "13px", marginTop: "40px" }}>
                  <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                  Aucun message — commencez la conversation avec AGE
                </div>
              ) : messages.map((msg, i) => {
                const isMine = msg.expediteur_id === userId
                const profil = profilsAGE[msg.expediteur_id]
                const roleCfg = profil ? (ROLE_CONFIG[profil.role] || ROLE_CONFIG.consultant) : null
                const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at)
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: "center", fontSize: "11px", color: "#9CA3AF", margin: "4px 0" }}>
                        {formatDate(msg.created_at)}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                      {/* Avatar */}
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: isMine ? "#F9F0EA" : (roleCfg?.bg || "#F4F3F0"),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 600,
                        color: isMine ? "#B25C2A" : (roleCfg?.color || "#6B7280"),
                      }}>
                        {isMine
                          ? (monPrenom[0] || "C").toUpperCase()
                          : profil ? initiales(profil.prenom, profil.nom) : "A"
                        }
                      </div>
                      <div style={{ maxWidth: "65%" }}>
                        {/* Nom + rôle */}
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", flexDirection: isMine ? "row-reverse" : "row" }}>
                          <span style={{ fontSize: "11px", color: "#6B7280" }}>
                            {isMine ? monPrenom : profil ? `${profil.prenom} ${profil.nom}`.trim() : "AGE Climate"}
                          </span>
                          {!isMine && roleCfg && (
                            <span style={{ background: roleCfg.bg, color: roleCfg.color, fontSize: "9px", padding: "1px 5px", borderRadius: "8px", fontWeight: 500 }}>
                              {roleCfg.label}
                            </span>
                          )}
                        </div>
                        {/* Bulle */}
                        <div style={{
                          background: isMine ? "#F9F0EA" : "#F4F3F0",
                          color: "#111827",
                          padding: "10px 14px",
                          borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          fontSize: "13px", lineHeight: 1.5,
                        }}>
                          {msg.contenu}
                        </div>
                        {/* Heure */}
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
            <div style={{ padding: "12px 16px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <textarea
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnvoyer() } }}
                placeholder="Écrire un message à AGE… (Entrée pour envoyer)"
                rows={2}
                style={{ flex: 1, padding: "9px 12px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "none", outline: "none", color: "#111827" }}
              />
              <button
                onClick={handleEnvoyer}
                disabled={!contenu.trim() || sending}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: contenu.trim() ? "#B25C2A" : "#E2DDD8",
                  color: contenu.trim() ? "white" : "#9CA3AF",
                  border: "none", padding: "10px 16px", borderRadius: "8px",
                  cursor: contenu.trim() ? "pointer" : "not-allowed",
                  fontSize: "13px", fontWeight: 500, fontFamily: "inherit", flexShrink: 0,
                  opacity: sending ? 0.7 : 1,
                }}>
                <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "14px" }}>
            <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "12px" }} aria-hidden="true" />
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  )
}