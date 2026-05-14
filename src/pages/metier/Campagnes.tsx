import React, { useState, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { supabase } from "../../lib/supabase"

const perfData = [
  { semaine: "S1", reponses: 120, rdv: 80, diagnostics: 45 },
  { semaine: "S2", reponses: 340, rdv: 210, diagnostics: 120 },
  { semaine: "S3", reponses: 520, rdv: 380, diagnostics: 240 },
  { semaine: "S4", reponses: 890, rdv: 530, diagnostics: 395 },
]

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_cours: { label: "En cours", color: "#065F46", bg: "#ECFDF5" },
  termine:  { label: "Terminé",  color: "#475569", bg: "#F1F5F9" },
}

export default function Campagnes() {
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCampagnes() }, [])

  async function loadCampagnes() {
    const { data } = await supabase.from("campagnes").select("*").order("date_debut", { ascending: false })
    setCampagnes(data || [])
    if (data && data.length > 0) setSelected(data[0])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{campagnes.length}</span> campagne{campagnes.length > 1 ? "s" : ""}
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "#0F6E56", color: "white", border: "none",
          padding: "8px 16px", borderRadius: "7px",
          fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle campagne
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px", alignItems: "start" }}>

        {/* Liste campagnes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {campagnes.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
              Aucune campagne
            </div>
          ) : (
            campagnes.map(c => {
              const statut = STATUT_CONFIG[c.statut] || STATUT_CONFIG.termine
              const tauxReponse = c.courriers_envoyes > 0 ? Math.round(c.reponses / c.courriers_envoyes * 100) : 0
              const isSelected = selected?.id === c.id
              return (
                <div key={c.id} onClick={() => setSelected(c)} style={{
                  background: "#FFFFFF",
                  border: `1px solid ${isSelected ? "#0F6E56" : "#E2E8F0"}`,
                  borderRadius: "10px", padding: "14px 16px",
                  cursor: "pointer", transition: "border-color 0.12s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", flex: 1, paddingRight: "8px" }}>{c.nom}</div>
                    <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, flexShrink: 0 }}>{statut.label}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "8px" }}>
                    {c.date_debut} → {c.date_fin}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, background: "#F1F5F9", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                      <div style={{ background: "#0F6E56", width: `${tauxReponse}%`, height: "100%", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{tauxReponse} %</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Taux de réponse</div>
                </div>
              )
            })
          )}
        </div>

        {/* Détail */}
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {[
                { label: "Courriers envoyés", val: selected.courriers_envoyes, icon: "ti-mail" },
                { label: "Réponses reçues", val: selected.reponses, icon: "ti-mail-opened" },
                { label: "RDV pris", val: selected.rdv_pris, icon: "ti-calendar" },
                { label: "Diagnostics", val: selected.diagnostics, icon: "ti-clipboard-list" },
              ].map((k, i) => (
                <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <i className={`ti ${k.icon}`} style={{ fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>
                    {k.val?.toLocaleString("fr-FR") ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Graphique */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Performance hebdomadaire</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={perfData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="semaine" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#0F172A", fontWeight: 500 }} />
                  <Area type="monotone" dataKey="reponses" stroke="#0F6E56" fill="#ECFDF5" strokeWidth={2} name="Réponses" />
                  <Area type="monotone" dataKey="rdv" stroke="#0369A1" fill="#EFF6FF" strokeWidth={2} name="RDV" />
                  <Area type="monotone" dataKey="diagnostics" stroke="#D97706" fill="#FFFBEB" strokeWidth={2} name="Diagnostics" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                {[
                  { label: "Réponses", color: "#0F6E56" },
                  { label: "RDV", color: "#0369A1" },
                  { label: "Diagnostics", color: "#D97706" },
                ].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                    <span style={{ fontSize: "12px", color: "#64748B" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-download" style={{ fontSize: "15px" }} aria-hidden="true" />
                Exporter résultats
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-send" style={{ fontSize: "15px" }} aria-hidden="true" />
                Lancer relance
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
            Sélectionnez une campagne pour voir le détail
          </div>
        )}
      </div>
    </div>
  )
}