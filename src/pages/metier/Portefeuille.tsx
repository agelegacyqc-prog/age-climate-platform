import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const RISQUE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  eleve:  { label: "Élevé",  color: "#991B1B", bg: "#FEF2F2" },
  moyen:  { label: "Modéré", color: "#92400E", bg: "#FFFBEB" },
  faible: { label: "Faible", color: "#065F46", bg: "#ECFDF5" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_contacter: { label: "À contacter", color: "#92400E", bg: "#FFFBEB" },
  diagnostic:  { label: "Diagnostic",  color: "#1E40AF", bg: "#EFF6FF" },
  travaux:     { label: "Travaux",     color: "#5B21B6", bg: "#F5F3FF" },
  termine:     { label: "Terminé",     color: "#065F46", bg: "#ECFDF5" },
}

const TYPE_CLIENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  assure:     { label: "Assuré",     color: "#1E40AF", bg: "#EFF6FF" },
  emprunteur: { label: "Emprunteur", color: "#5B21B6", bg: "#F5F3FF" },
}

type Onglet = "patrimoine_propre" | "patrimoine_client"

interface FilterPillProps {
  key?: string
  label: string
  active: boolean
  onClick: () => void
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
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
  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<Onglet>("patrimoine_propre")
  const [filtreRisque, setFiltreRisque] = useState("tous")
  const [filtreStatut, setFiltreStatut] = useState("tous")
  const [filtreZone, setFiltreZone] = useState("tous")
  const [filtreTypeClient, setFiltreTypeClient] = useState("tous")
  const [recherche, setRecherche] = useState("")

  useEffect(() => { loadBiens() }, [])

  useEffect(() => {
    setFiltreRisque("tous")
    setFiltreStatut("tous")
    setFiltreZone("tous")
    setFiltreTypeClient("tous")
    setRecherche("")
  }, [onglet])

  async function loadBiens() {
    const { data } = await supabase.from("biens").select("*").order("priorite", { ascending: false })
    setBiens(data || [])
    setLoading(false)
  }

  const biensOnglet = biens.filter(b => (b.categorie || "patrimoine_propre") === onglet)

  const biensFiltres = biensOnglet.filter(b => {
    if (filtreRisque !== "tous" && b.niveau_risque !== filtreRisque) return false
    if (filtreStatut !== "tous" && b.statut !== filtreStatut) return false
    if (filtreZone === "rga" && !b.zone_rga) return false
    if (filtreZone === "ppri" && !b.zone_ppri) return false
    if (onglet === "patrimoine_client" && filtreTypeClient !== "tous" && b.type_client !== filtreTypeClient) return false
    if (recherche && !`${b.adresse} ${b.ville}`.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const countPropre  = biens.filter(b => (b.categorie || "patrimoine_propre") === "patrimoine_propre").length
  const countClients = biens.filter(b => b.categorie === "patrimoine_client").length

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{biensFiltres.length}</span> bien{biensFiltres.length > 1 ? "s" : ""} affiché{biensFiltres.length > 1 ? "s" : ""}
          {biensFiltres.length !== biensOnglet.length && <span> sur {biensOnglet.length}</span>}
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
          <button
            key={o.key}
            onClick={() => setOnglet(o.key)}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom: onglet === o.key ? "2px solid #0F6E56" : "2px solid transparent",
              color: onglet === o.key ? "#0F6E56" : "#64748B",
              fontWeight: onglet === o.key ? 600 : 400,
              fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
              marginBottom: "-1px",
              transition: "color 0.12s",
            }}
          >
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
            <span style={{
              background: onglet === o.key ? "#ECFDF5" : "#F1F5F9",
              color: onglet === o.key ? "#065F46" : "#94A3B8",
              fontSize: "11px", fontWeight: 600,
              padding: "1px 7px", borderRadius: "10px",
              fontFamily: "'DM Mono', monospace",
            }}>
              {o.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>

          {/* Recherche */}
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
            <input
              type="text" placeholder="Rechercher une adresse…"
              value={recherche} onChange={e => setRecherche(e.target.value)}
              style={{ width: "100%", padding: "7px 12px 7px 32px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "#F8FAFC" }}
            />
          </div>

          {/* Filtre type client — Patrimoine clients uniquement */}
          {onglet === "patrimoine_client" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "4px" }}>Client</span>
              {["tous", "assure", "emprunteur"].map(t => (
                <FilterPill
                  key={t}
                  active={filtreTypeClient === t}
                  onClick={() => setFiltreTypeClient(t)}
                  label={t === "tous" ? "Tous" : TYPE_CLIENT_CONFIG[t]?.label || t}
                />
              ))}
            </div>
          )}

          {/* Filtre risque */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "4px" }}>Risque</span>
            {["tous", "eleve", "moyen", "faible"].map(r => (
              <FilterPill
                key={r}
                active={filtreRisque === r}
                onClick={() => setFiltreRisque(r)}
                label={r === "tous" ? "Tous" : RISQUE_CONFIG[r]?.label || r}
              />
            ))}
          </div>

          {/* Filtre statut */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "4px" }}>Statut</span>
            {["tous", "a_contacter", "diagnostic", "travaux", "termine"].map(s => (
              <FilterPill
                key={s}
                active={filtreStatut === s}
                onClick={() => setFiltreStatut(s)}
                label={s === "tous" ? "Tous" : STATUT_CONFIG[s]?.label || s}
              />
            ))}
          </div>

          {/* Filtre zone */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "4px" }}>Zone</span>
            {["tous", "rga", "ppri"].map(z => (
              <FilterPill
                key={z}
                active={filtreZone === z}
                onClick={() => setFiltreZone(z)}
                label={z === "tous" ? "Toutes" : z.toUpperCase()}
              />
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
                ? ["Adresse", "Ville", "Type", "Score risque", "Statut", "Zones", ""]
                : ["Adresse", "Ville", "Type", "Client", "Score risque", "Statut", "Zones", ""]
              ).map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {biensFiltres.length === 0 ? (
              <tr>
                <td colSpan={onglet === "patrimoine_propre" ? 7 : 8} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                  Aucun bien ne correspond aux filtres sélectionnés
                </td>
              </tr>
            ) : (
              biensFiltres.map((b) => {
                const risque     = RISQUE_CONFIG[b.niveau_risque]
                const statut     = STATUT_CONFIG[b.statut]
                const typeClient = TYPE_CLIENT_CONFIG[b.type_client]
                return (
                  <tr key={b.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>

                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{b.adresse}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>{b.ville} {b.code_postal}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>{b.type_bien || "—"}</td>

                    {/* Colonne Client — Patrimoine clients uniquement */}
                    {onglet === "patrimoine_client" && (
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
                            {b.nom_client || "—"}
                          </span>
                          {typeClient && (
                            <span style={{ display: "inline-flex", alignItems: "center", width: "fit-content", background: typeClient.bg, color: typeClient.color, padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                              {typeClient.label}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    <td style={{ padding: "12px 16px" }}>
                      {risque ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: risque.bg, color: risque.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{b.score_risque}</span>
                          <span style={{ opacity: 0.7 }}>/ 100</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {statut ? (
                        <span style={{ background: statut.bg, color: statut.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                      {b.zone_rga && <span style={{ marginRight: "6px", background: "#FFFBEB", color: "#92400E", padding: "2px 6px", borderRadius: "3px", fontSize: "11px", fontWeight: 500 }}>RGA</span>}
                      {b.zone_ppri && <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "2px 6px", borderRadius: "3px", fontSize: "11px", fontWeight: 500 }}>PPRI</span>}
                      {!b.zone_rga && !b.zone_ppri && <span style={{ color: "#CBD5E1" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => navigate("/metier/portefeuille/" + b.id)}
                        onMouseEnter={e => (e.currentTarget.style.background = "#ECFDF5")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", color: "#0F6E56", border: "1px solid #A7F3D0", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500, fontFamily: "inherit", transition: "background 0.12s" }}>
                        Voir <i className="ti ti-arrow-right" style={{ fontSize: "13px" }} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}