import React, { useState } from "react"

const projets = [
  { titre: "Reforestation Landes",       desc: "Plantation de 10 000 arbres",          statut: "En cours",  progression: 65,  icon: "ti-trees",       color: "#065F46" },
  { titre: "Panneaux solaires écoles",   desc: "Installation sur 5 établissements",    statut: "Planifié",  progression: 20,  icon: "ti-solar-panel", color: "#D97706" },
  { titre: "Pistes cyclables Dax",       desc: "Extension du réseau de 15 km",         statut: "Terminé",   progression: 100, icon: "ti-bike",        color: "#1E40AF" },
  { titre: "Compostage collectif",       desc: "Installation de 20 points de compost", statut: "En cours",  progression: 45,  icon: "ti-leaf",        color: "#065F46" },
  { titre: "Toits végétalisés",          desc: "Verdissement de 5 bâtiments publics",  statut: "Planifié",  progression: 10,  icon: "ti-building",    color: "#D97706" },
]

const STATUT_CONFIG: Record<string, { color: string; bg: string }> = {
  "En cours": { color: "#065F46", bg: "#ECFDF5" },
  "Planifié": { color: "#92400E", bg: "#FFFBEB" },
  "Terminé":  { color: "#1E40AF", bg: "#EFF6FF" },
}

const filtres = ["Tous", "En cours", "Planifié", "Terminé"]

export default function Projets() {
  const [filtre, setFiltre] = useState("Tous")

  const projetsAffiches = filtre === "Tous" ? projets : projets.filter(p => p.statut === filtre)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête + filtres */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{projetsAffiches.length}</span> projet{projetsAffiches.length > 1 ? "s" : ""} affiché{projetsAffiches.length > 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {filtres.map(f => (
            <button key={f} onClick={() => setFiltre(f)} style={{
              padding: "5px 14px", borderRadius: "6px",
              border: filtre === f ? "1px solid #0F6E56" : "1px solid #E2E8F0",
              background: filtre === f ? "#ECFDF5" : "white",
              color: filtre === f ? "#065F46" : "#64748B",
              fontSize: "12px", fontWeight: filtre === f ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Liste projets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {projetsAffiches.map((p, i) => {
          const statut = STATUT_CONFIG[p.statut]
          return (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>

                {/* Icône */}
                <div style={{ width: 40, height: 40, borderRadius: "9px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`ti ${p.icon}`} style={{ fontSize: "20px", color: p.color }} aria-hidden="true" />
                </div>

                {/* Titre + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>{p.titre}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>{p.desc}</div>
                </div>

                {/* Statut */}
                <span style={{ background: statut.bg, color: statut.color, padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, flexShrink: 0 }}>
                  {p.statut}
                </span>

                {/* Progression */}
                <div style={{ width: "120px", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>Progression</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: p.color, fontFamily: "'DM Mono', monospace" }}>{p.progression} %</span>
                  </div>
                  <div style={{ background: "#F1F5F9", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                    <div style={{ background: p.color, width: `${p.progression}%`, height: "100%", borderRadius: "3px", transition: "width 0.5s" }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}