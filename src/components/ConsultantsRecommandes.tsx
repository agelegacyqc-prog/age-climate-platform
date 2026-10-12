import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

interface Consultant {
  id: string
  user_id: string | null
  prenom: string
  nom: string
  titre: string
  region: string
  bio: string
  competences: string[]
  methodologies: Record<string, { etape: number; titre: string; desc: string }[]>
  disponibilite: string
  missions_actives: number
  photo_url: string | null
}

// Consultant enrichi pour l'affichage
// match        : compétences de l'expert qui correspondent aux réglementations de l'actif
// tousRealises : toutes ses réglementations correspondantes sont réalisées → carte grisée
interface ConsultantAffiche extends Consultant {
  match: string[]
  score: number
  tousRealises: boolean
}

const COMPETENCE_LABELS: Record<string, string> = {
  csrd: "CSRD", tertiaire: "Décret Tertiaire", bilan_ges: "Bilan GES",
  audit_energetique: "Audit Énergétique", sfdr: "SFDR",
  eu_taxonomy: "EU Taxonomy", bacs: "Décret BACS",
  iso50001: "ISO 50001", ifrs_s2: "IFRS S2", esrs: "ESRS",
  loi_climat: "Loi Climat Résilience",
  geodata: "Geodata climatique",
  delphi: "Delphi",
}

interface Props {
  // Réglementations éligibles + potentielles de l'actif (base du matching)
  alertesRegl: { reglementation: string }[]
  // Ids des réglementations déclarées « Réalisé » par le client
  realisees?: string[]
  // Carte repliable ouverte à l'affichage
  defaultOuvert?: boolean
  // true : n'affiche que les experts qui ont au moins une réglementation en commun avec l'actif
  seulementPertinents?: boolean
}

export default function ConsultantsRecommandes({
  alertesRegl,
  realisees = [],
  defaultOuvert = false,
  seulementPertinents = false,
}: Props) {
  const navigate = useNavigate()
  const [tous, setTous]                     = useState<Consultant[]>([])
  const [loading, setLoading]               = useState(true)
  const [ouvert, setOuvert]                 = useState(defaultOuvert)
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [selected, setSelected]             = useState<Consultant | null>(null)
  const [ongletMethodo, setOngletMethodo]   = useState("")

  // alertesRegl et realisees sont recréés à chaque rendu du parent :
  // on travaille sur des clés stables pour éviter tout recalcul / rechargement inutile.
  const cleAlertes   = alertesRegl.map(a => a.reglementation).join("|")
  const cleRealisees = realisees.join("|")
  const idsActifs    = useMemo(() => (cleAlertes ? cleAlertes.split("|") : []), [cleAlertes])
  const idsRealises  = useMemo(() => (cleRealisees ? cleRealisees.split("|") : []), [cleRealisees])

  // Chargement unique (le tri se fait ensuite en mémoire)
  useEffect(() => { chargerConsultants() }, [])

  async function chargerConsultants() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("marketplace_consultants")
        .select("*")
        .eq("is_active", true)
      if (error) throw error
      setTous((data || []) as Consultant[])
    } catch (e) {
      console.error("Chargement des consultants impossible", e)
      setTous([])
    } finally {
      setLoading(false)
    }
  }

  const consultants: ConsultantAffiche[] = useMemo(() => {
    const enrichis = tous.map((c): ConsultantAffiche => {
      const match = c.competences.filter(comp => idsActifs.includes(comp))
      return {
        ...c,
        match,
        score: match.length,
        tousRealises: match.length > 0 && match.every(m => idsRealises.includes(m)),
      }
    })
    return enrichis
      .filter(c => !seulementPertinents || c.score > 0)
      // Experts encore utiles d'abord, grisés en dernier, puis par pertinence
      .sort((a, b) => Number(a.tousRealises) - Number(b.tousRealises) || b.score - a.score)
      .slice(0, 10)
  }, [tous, idsActifs, idsRealises, seulementPertinents])

  function ouvrirDrawer(c: Consultant) {
    setSelected(c)
    const premiereCompetence = c.competences.find(comp => idsActifs.includes(comp)) || c.competences[0] || ""
    setOngletMethodo(premiereCompetence)
    setDrawerOpen(true)
  }

  function allerVersAgenda(c: Consultant) {
    if (!c.user_id) return
    navigate(`/client/prise-rdv/${c.user_id}`)
  }

  if (loading) return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "20px" }}>
      <div style={{ fontSize: "13px", color: "#9CA3AF" }}>Chargement des consultants…</div>
    </div>
  )

  if (consultants.length === 0) return null

  return (
    <>
      <div style={{ background: "#FFFFFF", border: "1px solid #111C2E", borderRadius: "10px", overflow: "hidden" }}>
        <div
          onClick={() => setOuvert(o => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOuvert(o => !o) } }}
          style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          aria-expanded={ouvert}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#B25C2A", flexShrink: 0 }} />
            <i className="ti ti-users" style={{ fontSize: "16px", color: "#B25C2A" }} aria-hidden="true" />
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Experts recommandés</span>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>· {consultants.length} profil{consultants.length > 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={e => { e.stopPropagation(); setOuvert(o => !o) }}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-eye" style={{ fontSize: "14px" }} aria-hidden="true" />
              Voir
            </button>
            <i className={`ti ti-chevron-${ouvert ? "up" : "down"}`} style={{ fontSize: "16px", color: "#6B7280" }} aria-hidden="true" />
          </div>
        </div>
        {ouvert && (
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "16px" }}>Sélectionnés selon vos alertes réglementaires</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {consultants.map((c) => {
                const grise = c.tousRealises
                const restantes = c.match.filter(m => !idsRealises.includes(m)).length
                const comps = c.match.length > 0 ? c.match : c.competences
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "8px",
                      background: grise ? "#F5F5F4" : "#F9F0EA",
                      border: `1px solid ${grise ? "#E7E5E4" : "#F0DDD0"}`,
                    }}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: grise ? "#A8A29E" : "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: "white", flexShrink: 0 }}>
                      {c.prenom[0]}{c.nom[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: grise ? "#57534E" : "#111827" }}>{c.prenom} {c.nom}</div>
                      <div style={{ fontSize: "11px", color: "#57534E", marginBottom: "4px" }}>{c.titre}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {comps.slice(0, 6).map(comp => {
                          const faite = idsRealises.includes(comp)
                          return (
                            <span
                              key={comp}
                              style={{
                                fontSize: "10px", padding: "2px 6px", borderRadius: "3px", fontWeight: 500,
                                background: faite ? "#E7E5E4" : "#B25C2A",
                                color: faite ? "#57534E" : "white",
                                textDecoration: faite ? "line-through" : "none",
                              }}
                            >
                              {COMPETENCE_LABELS[comp] || comp}
                            </span>
                          )
                        })}
                      </div>
                      {c.match.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", fontSize: "11px", fontWeight: 500, color: grise ? "#2D6A4F" : "#57534E" }}>
                          {grise ? (
                            <>
                              <i className="ti ti-circle-check" style={{ fontSize: "13px", color: "#2F7D5C" }} aria-hidden="true" />
                              Toutes ses réglementations sont réalisées
                            </>
                          ) : (
                            <>{restantes} réglementation{restantes > 1 ? "s" : ""} à réaliser</>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => ouvrirDrawer(c)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px", background: "#FFFFFF", padding: "6px 12px",
                        borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                        color: grise ? "#57534E" : "#B25C2A",
                        border: `1px solid ${grise ? "#A8A29E" : "#B25C2A"}`,
                      }}
                    >
                      <i className="ti ti-eye" style={{ fontSize: "13px" }} aria-hidden="true" />
                      Voir
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && selected && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9998 }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "400px", maxWidth: "100vw", background: "#FFFFFF", zIndex: 9999, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>

            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Fiche expert</div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Fermer la fiche expert" style={{ width: "28px", height: "28px", border: "none", background: "#F4F3F0", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                <i className="ti ti-x" style={{ fontSize: "14px" }} aria-hidden="true" />
              </button>
            </div>

            {/* Corps */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Profil */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 600, color: "white", flexShrink: 0 }}>
                  {selected.prenom[0]}{selected.nom[0]}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>{selected.prenom} {selected.nom}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>{selected.titre}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                    <i className="ti ti-map-pin" style={{ fontSize: "12px" }} aria-hidden="true" /> {selected.region}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, margin: 0 }}>{selected.bio}</p>

              {/* Compétences */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Compétences</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selected.competences.map(comp => {
                    const isMatch = idsActifs.includes(comp)
                    const faite = idsRealises.includes(comp)
                    return (
                      <span
                        key={comp}
                        style={{
                          background: isMatch && !faite ? "#B25C2A" : "#F4F3F0",
                          color: isMatch && !faite ? "white" : "#57534E",
                          textDecoration: isMatch && faite ? "line-through" : "none",
                          fontSize: "11px", padding: "3px 8px", borderRadius: "4px", fontWeight: 500,
                        }}
                      >
                        {COMPETENCE_LABELS[comp] || comp}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Méthodologie */}
              {selected.methodologies && Object.keys(selected.methodologies).length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Méthodologie</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {Object.keys(selected.methodologies).map(comp => (
                      <button key={comp} onClick={() => setOngletMethodo(comp)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${ongletMethodo === comp ? "#B25C2A" : "#E2DDD8"}`, background: ongletMethodo === comp ? "#F9F0EA" : "white", color: ongletMethodo === comp ? "#B25C2A" : "#6B7280" }}>
                        {COMPETENCE_LABELS[comp] || comp}
                      </button>
                    ))}
                  </div>
                  {ongletMethodo && selected.methodologies[ongletMethodo] && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selected.methodologies[ongletMethodo].map((step) => (
                        <div key={step.etape} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0" }}>
                          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#B25C2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "white", fontWeight: 600, flexShrink: 0, marginTop: "1px" }}>
                            {step.etape}
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 500, color: "#111827", marginBottom: "2px" }}>{step.titre}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Disponibilité */}
              <div style={{ padding: "12px", background: "#F9F0EA", borderRadius: "8px", border: "1px solid #F0DDD0" }}>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#B25C2A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Disponibilité</div>
                <div style={{ fontSize: "13px", color: "#111827" }}>
                  {selected.disponibilite} · {selected.missions_actives} mission{selected.missions_actives > 1 ? "s" : ""} active{selected.missions_actives > 1 ? "s" : ""}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #E2DDD8", display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => allerVersAgenda(selected)}
                style={{ flex: 1, padding: "10px", background: "#B25C2A", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <i className="ti ti-calendar-plus" style={{ fontSize: "14px" }} aria-hidden="true" />
                Voir l'agenda et réserver
              </button>
            </div>

          </div>
        </>
      )}
    </>
  )
}