import React, { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"

export default function PartenaireMessages() {
  const [userId, setUserId]     = useState<string>("")
  const [missions, setMissions] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [contenu, setContenu]   = useState("")
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { if (selected) loadMessages(selected.id) }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase.from("missions").select("*").eq("consultant_id", user.id).order("created_at", { ascending: false })
    setMissions(data || [])
    if (data && data.length > 0) setSelected(data[0])
    setLoading(false)
  }

  async function loadMessages(missionId: string) {
    const { data } = await supabase.from("messages").select("*").eq("mission_id", missionId).order("created_at", { ascending: true })
    setMessages(data || [])
    await supabase.from("messages").update({ lu: true }).eq("mission_id", missionId).neq("expediteur_id", userId)
  }

  async function handleEnvoyer() {
    if (!contenu.trim() || !selected) return
    setSending(true)
    await supabase.from("messages").insert({ mission_id: selected.id, expediteur_id: userId, contenu: contenu.trim(), lu: false })
    setContenu("")
    await loadMessages(selected.id)
    setSending(false)
  }

  function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) return <div style={{ color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", gap: "0", height: "calc(100vh - 120px)", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>

      <div style={{ width: "240px", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>Messages</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>{missions.length} conversation{missions.length > 1 ? "s" : ""}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {missions.map(m => (
            <div key={m.id} onClick={() => setSelected(m)} style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9", cursor: "pointer", background: selected?.id === m.id ? "#ECFDF5" : "white", borderLeft: selected?.id === m.id ? "3px solid #0F6E56" : "3px solid transparent" }}
              onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.background = "#FAFFFE" }}
              onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.background = "white" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.societe || "Mission"}</div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>Phase {m.phase || 1}/10</div>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{selected.societe}</div>
            <div style={{ fontSize: "12px", color: "#94A3B8" }}>Conversation avec AGE Climate</div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", marginTop: "40px" }}>
                <i className="ti ti-message-circle" style={{ fontSize: "32px", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                Aucun message — commencez la conversation
              </div>
            ) : messages.map(msg => {
              const isMine = msg.expediteur_id === userId
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: "8px", alignItems: "flex-end" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: isMine ? "#0F6E56" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", fontWeight: 600, color: isMine ? "white" : "#64748B" }}>
                    {isMine ? "P" : "A"}
                  </div>
                  <div style={{ maxWidth: "65%" }}>
                    <div style={{ background: isMine ? "#0F6E56" : "#F1F5F9", color: isMine ? "white" : "#0F172A", padding: "10px 14px", borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", fontSize: "13px", lineHeight: 1.5 }}>
                      {msg.contenu}
                    </div>
                    <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "3px", textAlign: isMine ? "right" : "left" }}>
                      {formatHeure(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <textarea value={contenu} onChange={e => setContenu(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnvoyer() } }} placeholder="Écrire un message… (Entrée pour envoyer)" rows={2} style={{ flex: 1, padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "none", outline: "none", color: "#0F172A" }} />
            <button onClick={handleEnvoyer} disabled={!contenu.trim() || sending} style={{ display: "flex", alignItems: "center", gap: "6px", background: contenu.trim() ? "#0F6E56" : "#E2E8F0", color: contenu.trim() ? "white" : "#94A3B8", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: contenu.trim() ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", flexShrink: 0 }}>
              <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: "14px" }}>
          Sélectionnez une mission pour voir les messages
        </div>
      )}
    </div>
  )
}