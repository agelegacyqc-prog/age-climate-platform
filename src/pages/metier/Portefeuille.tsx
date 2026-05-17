import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const SCORE_CONFIG = (score: number) => {
  if (score >= 70) return { label: "Élevé",  color: "#991B1B", bg: "#FEF2F2" }
  if (score >= 40) return { label: "Modéré", color: "#92400E", bg: "#FFFBEB" }
  return                  { label: "Faible", color: "#065F46", bg: "#ECFDF5" }
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_analyser:  { label: "À analyser",  color: "#92400E", bg: "#FFFBEB" },
  en_cours:    { label: "En cours",    color: "#1E40AF", bg: "#EFF6FF" },
  analyse:     { label: "Analysé",     color: "#065F46", bg: "#ECFDF5" },
  a_contacter: { label: "À contacter", color: "#92400E", bg: "#FFFBEB" },
  diagnostic:  { label: "Diagnostic",  color: "#1E40AF", bg: "#EFF6FF" },
  travaux:     { label: "Travaux",     color: "#5B21B6", bg: "#F5F3FF" },
  termine:     { label: "Terminé",     color: "#065F46", bg: "#ECFDF5" },
}

const TYPE_CLIENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  banque:       { label: "Banque",       color: "#1E40AF", bg: "#EFF6FF" },
  assurance:    { label: "Assurance",    color: "#5B21B6", bg: "#F5F3FF" },
  entreprise:   { label: "Entreprise",   color: "#92400E", bg: "#FFFBEB" },
  collectivite: { label: "Collectivité", color: "#065F46", bg: "#ECFDF5" },
}

type Onglet = "patrimoine_propre" | "patrimoine_client"

function FilterPill({ label, active, onClick }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px", borderRadius: "6px",
      border: active ? "1px solid #0F6E56" : "1px solid #E2E8F0",
      background: active ? "#ECFDF5" : "#FFFFFF",
      color: active ? "#065F46" : "#64748B",
      fontSize: "12px", fontWeight: active ? 600 : 400,
      cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
    }}>
      {label}
    </button>
  )
}

export default function Portefeuille() {
  const navigate = useNavigate()
  const [actifs, setActifs]                     = useState<any[]>([])
  const [loading, setLoading]                   = useState(true)
  const [onglet, setOnglet]                     = useState<Onglet>("patrimoine_propre")
  const [filtreScore, setFiltreScore]           = useState("tous")
  const [filtreStatut, setFiltreStatut]         = useState("tous")
  const [filtreTypeClient, setFiltreTypeClient] = useState("tous")
  const [recherche, setRecherche]               = useState("")

  useEffect(() => { loadActifs() }, [])

  useEffect(() => {
    setFiltreScore("tous")
    setFiltreStatut("tous")
    setFiltreTypeClient("tous")
    setRecherche("")
  }, [onglet])

  async function loadActifs() {
    const { data } = await supabase.from("actifs").select("*").order("created_at", { ascending: false })
    setActifs(data || [])
    setLoading(false)
  }

  const actifsOnglet = actifs.filter(a =>
    onglet === "patrimoine_propre"
      ? (a.categorie === "patrimoine_propre" || !a.categorie)
      : a.categorie === "patrimoine_client"
  )

  const actifsFiltres = actifsOnglet.filter(a => {
    if (filtreScore !== "tous") {
      const score = Number(a.score_climatique) || 0
      if (filtreScore === "eleve"  && score < 70) return false
      if (filtreScore === "moyen"  && (score < 40 || score >= 70)) return false
      if (filtreScore === "faible" && score >= 40) return false
    }
    if (filtreStatut !== "tous" && a.statut_analyse !== filtreStatut) return false
    if (onglet === "patrimoine_client" && filtreTypeClient !== "tous" && a.type_client !== filtreTypeClient) return false
    if (recherche) {
      const q = recherche.toLowerCase()
      if (!`${a.nom} ${a.adresse} ${a.ville} ${a.nom_client}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const countPropre  = actifs.filter(a => a.categorie === "patrimoine_propre" || !a.categorie).length
  const countClients = actifs.filter(a => a.categorie === "patrimoine_client").length

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{actifsFiltres.length}</span> actif{actifsFiltres.length > 1 ? "s" : ""} affiché{actifsFiltres.length > 1 ? "s" : ""}
          {actifsFiltres.length !== actifsOnglet.length && <span> sur {actifsOnglet.length}</span>}
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "#0F6E56", color: "white", border: "none",
          padding: "8px 16px", borderRadius: "7px",
          fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>
          <i className="ti ti-upload" style={{ fontSize: "15px" }} aria-hidden="true" />
          Importer CSV
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0" }}>
        {([
          { key: "patrimoine_propre", label: "Mon Patrimoine",     count: countPropre,  icon: "ti-building" },
          { key: "patrimoine_client", label: "Patrimoine clients", count: countClients, icon: "ti-users" },
        ] as const).map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: onglet === o.key ? "2px solid #0F6E56" : "2px solid transparent",
            color: onglet === o.key ? "#0F6E56" : "#64748B",
            fontWeight: onglet === o.key ? 600 : 400,
            fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
            marginBottom: "-1px", transition: "color 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
            <span style={{
              background: onglet === o.key ? "#ECFDF5" : "#F1F5F9",
              color: onglet === o.key ? "#065F46" : "#94A3B8",
              fontSize: "11px", fontWeight: 600,
              padding: "1px 7px", borderRadius: "10px",
              fontFamily: "'DM Mono', monospace",
            }}>{o.count}</span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>

          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
            <input
              type="text"
              placeholder={onglet === "patrimoine_propre" ? "Rechercher un actif, une adresse…" : "Rechercher un client, une adresse…"}
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              style={{ width: "100%", padding: "7px 12px 7px 32px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "#F8FAFC", boxSizing: "border-box" as const }}
            />
          </div>

          {onglet === "patrimoine_client" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Client</span>
              {["tous", "banque", "assurance", "entreprise", "collectivite"].map(t => (
                <FilterPill key={t} active={filtreTypeClient === t} onClick={() => setFiltreTypeClient(t)} label={t === "tous" ? "Tous" : TYPE_CLIENT_CONFIG[t]?.label || t} />
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Risque</span>
            {["tous", "eleve", "moyen", "faible"].map(r => (
              <FilterPill key={r} active={filtreScore === r} onClick={() => setFiltreScore(r)} label={r === "tous" ? "Tous" : r === "eleve" ? "Élevé" : r === "moyen" ? "Modéré" : "Faible"} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Statut</span>
            {["tous", "a_analyser", "en_cours", "analyse"].map(s => (
              <FilterPill key={s} active={filtreStatut === s} onClick={() => setFiltreStatut(s)} label={s === "tous" ? "Tous" : STATUT_CONFIG[s]?.label || s} />
            ))}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              {(onglet === "patrimoine_propre"
                ? ["Actif", "Adresse", "Type", "Score climatique", "Statut", ""]
                : ["Actif", "Adresse", "Type", "Client", "Score climatique", "Statut", ""]
              ).map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actifsFiltres.length === 0 ? (
              <tr>
                <td colSpan={onglet === "patrimoine_propre" ? 6 : 7} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                  Aucun actif ne correspond aux filtres sélectionnés
                </td>
              </tr>
            ) : actifsFiltres.map(a => {
              const score      = Number(a.score_climatique) || 0
              const scoreConf  = SCORE_CONFIG(score)
              const statut     = STATUT_CONFIG[a.statut_analyse]
              const typeClient = TYPE_CLIENT_CONFIG[a.type_client]
              return (
                <tr key={a.id}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                  style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>

                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{a.nom || a.raison_sociale || "—"}</div>
                    {a.siren && <div style={{ fontSize: "11px", color: "#94A3B8" }}>SIREN {a.siren}</div>}
                  </td>

                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "13px", color: "#64748B" }}>{a.adresse || "—"}</div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{a.code_postal} {a.ville}</div>
                  </td>

                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>
                    {a.type_batiment || a.type_bien || "—"}
                  </td>

                  {onglet === "patrimoine_client" && (
                   <td style={{ padding: "12px 16px" }}>
  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
    {[a.prenom_client, a.nom_client].filter(Boolean).join(" ") || "—"}
  </div>
  {a.telephone_client && (
    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{a.telephone_client}</div>
  )}
  {typeClient && (
    <span style={{ display: "inline-flex", background: typeClient.bg, color: typeClient.color, padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, marginTop: "3px" }}>
      {typeClient.label}
    </span>
  )}
</td>
                  )}

                  <td style={{ padding: "12px 16px" }}>
                    {score > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: scoreConf.bg, color: scoreConf.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{score}</span>
                        <span style={{ opacity: 0.7 }}>/ 100</span>
                      </span>
                    ) : <span style={{ color: "#CBD5E1", fontSize: "13px" }}>—</span>}
                  </td>

                  <td style={{ padding: "12px 16px" }}>
                    {statut ? (
                      <span style={{ background: statut.bg, color: statut.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                    ) : <span style={{ color: "#CBD5E1", fontSize: "13px" }}>—</span>}
                  </td>

                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => navigate(`/metier/portefeuille/${a.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = "#ECFDF5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", color: "#0F6E56", border: "1px solid #A7F3D0", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500, fontFamily: "inherit", transition: "background 0.12s" }}>
                      Voir <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}