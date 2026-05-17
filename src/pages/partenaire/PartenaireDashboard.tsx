import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nouvelle: { label: "Nouvelle", color: "#0369A1", bg: "#EFF6FF" },
  en_cours: { label: "En cours", color: "#065F46", bg: "#ECFDF5" },
  terminee: { label: "Terminée", color: "#475569", bg: "#F1F5F9" },
  annulee:  { label: "Annulée",  color: "#991B1B", bg: "#FEF2F2" },
}

export default function PartenaireDashboard() {
  const navigate = useNavigate()
  const [userId, setUserId]       = useState<string>("")
  const [missions, setMissions]   = useState<any[]>([])
  const [messages, setMessages]   = useState<any[]>([])
  const [nbDocs, setNbDocs]       = useState(0)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: partenaire } = await supabase
      .from("prestataires_pro")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!partenaire) return

    const [missRes, msgRes, docRes] = await Promise.all([
      supabase.from("missions").select("*").eq("consultant_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("messages").select("*, mission:mission_id(societe)").eq("lu", false).neq("expediteur_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("documents").select("id", { count: "exact", head: true }),
    ])

    setMissions(missRes.data || [])
    setMessages(msgRes.data || [])
    setNbDocs(docRes.count || 0)
    setLoading(false)
  }

  function tempsEcoule(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return "il y a moins d'1h"
    if (h < 24) return `il y a ${h}h`
    const j = Math.floor(h / 24)
    return j === 1 ? "hier" : `il y a ${j} jours`
  }

  if (loading) return <div style={{ color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Missions actives", val: missions.filter(m => m.statut === "en_cours").length, icon: "ti-briefcase",      color: "#0F6E56" },
          { label: "Messages non lus", val: messages.length,                                       icon: "ti-message-circle", color: "#B91C1C" },
          { label: "Documents reçus",  val: nbDocs,                                                icon: "ti-file",           color: "#0369A1" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
              <div style={{ width: 28, height: 28, borderRadius: "7px", background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "14px", color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Missions + Messages */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Missions */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-briefcase" style={{ fontSize: "15px", color: "#0F6E56" }} aria-hidden="true" />
              Missions dispatchées par AGE
            </div>
          </div>
          {missions.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucune mission pour l'instant</div>
          ) : missions.map((m, i) => {
            const statut = STATUT_CONFIG[m.statut] || STATUT_CONFIG.nouvelle
            return (
              <div key={m.id} onClick={() => navigate("/partenaire/missions")} style={{ padding: "12px 16px", borderBottom: i < missions.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{m.societe || "Mission"}</div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>Phase {m.phase || 1}/10</div>
                </div>
                <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                <button onClick={e => { e.stopPropagation(); navigate("/partenaire/messages") }} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-message-circle" style={{ fontSize: "13px" }} aria-hidden="true" /> Répondre
                </button>
              </div>
            )
          })}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/partenaire/missions")} style={{ fontSize: "12px", color: "#0F6E56", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Voir tout →</button>
          </div>
        </div>

        {/* Messages non lus */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", display: "flex", alignItems: "center", gap: "7px" }}>
              <i className="ti ti-message-circle" style={{ fontSize: "15px", color: "#B91C1C" }} aria-hidden="true" />
              Derniers messages AGE
            </div>
            {messages.length > 0 && (
              <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 600, padding: "1px 7px", borderRadius: "10px" }}>{messages.length} non lu{messages.length > 1 ? "s" : ""}</span>
            )}
          </div>
          {messages.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>Aucun message non lu</div>
          ) : messages.map((msg, i) => (
            <div key={msg.id} onClick={() => navigate("/partenaire/messages")} style={{ padding: "12px 16px", borderBottom: i < messages.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#B91C1C", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 500, color: "#0F172A", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {msg.contenu?.slice(0, 60) || "Message AGE"}…
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  {(msg.mission as any)?.societe || "AGE Climate"} · {tempsEcoule(msg.created_at)}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: "14px", color: "#CBD5E1" }} aria-hidden="true" />
            </div>
          ))}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/partenaire/messages")} style={{ fontSize: "12px", color: "#B91C1C", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Voir tout →</button>
          </div>
        </div>
      </div>
    </div>
  )
}