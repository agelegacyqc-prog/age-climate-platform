import React from "react"

const articles = [
  { icon: "ti-world",        titre: "Pourquoi agir maintenant ?",   texte: "Le changement climatique est une urgence mondiale. Chaque action compte pour limiter le réchauffement à 1.5°C." },
  { icon: "ti-recycle",      titre: "Gestes du quotidien",           texte: "Réduire sa consommation, trier ses déchets, privilégier les transports doux font une vraie différence." },
  { icon: "ti-bolt",         titre: "Énergies renouvelables",        texte: "Le solaire et l'éolien représentent aujourd'hui plus de 30% de la production mondiale d'électricité." },
  { icon: "ti-ripple",       titre: "Préserver les océans",          texte: "Les océans absorbent 30% du CO2 mondial. Les protéger est essentiel pour réguler le climat." },
  { icon: "ti-building",     titre: "Villes durables",               texte: "L'urbanisme vert, les toits végétalisés et les transports en commun réduisent l'empreinte carbone." },
  { icon: "ti-users",        titre: "Agir ensemble",                 texte: "La transition écologique est l'affaire de tous. Entreprises, citoyens et institutions doivent collaborer." },
]

export default function Sensibilisation() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Hero */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "24px 28px" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          Comprendre les enjeux climatiques pour mieux agir
        </div>
      </div>

      {/* Articles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {articles.map((a, i) => (
          <div key={i} style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "10px", padding: "20px",
            display: "flex", flexDirection: "column", gap: "12px",
            transition: "border-color 0.12s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#A7F3D0")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
          >
            <div style={{ width: 40, height: 40, borderRadius: "9px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: "20px", color: "#0F6E56" }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>{a.titre}</div>
              <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{a.texte}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}