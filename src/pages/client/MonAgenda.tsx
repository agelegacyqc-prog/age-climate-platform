import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { resolveAffectationClient } from "../../lib/resolveAffectationClient"

interface RdvConfirme {
  id: string
  date: string
  heure_debut: string
  type_mission: string
  message: string | null
  consultant_nom: string
}

type VueCalendrier = "semaine" | "mois"

const COMPETENCE_LABELS: Record<string, string> = {
  csrd: "CSRD", tertiaire: "Décret Tertiaire", bilan_ges: "Bilan GES",
  audit_energetique: "Audit Énergétique", sfdr: "SFDR",
  eu_taxonomy: "Taxonomie européenne", bacs: "Décret BACS",
  iso50001: "ISO 50001", ifrs_s2: "IFRS S2", esrs: "ESRS",
}

const JOURS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MOIS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
const HEURES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

function lundiDeLaSemaine(d: Date) {
  const jour = d.getDay()
  const diff = jour === 0 ? -6 : 1 - jour
  const lundi = new Date(d)
  lundi.setDate(d.getDate() + diff)
  lundi.setHours(0, 0, 0, 0)
  return lundi
}

function premierJourDuMois(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function formatDateISO(d: Date) {
  return d.toISOString().split("T")[0]
}

function formatDateAffichage(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })
}

function isMemeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function MonAgenda() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [vue, setVue] = useState<VueCalendrier>("semaine")
  const [dateRef, setDateRef] = useState(new Date())
  const [rdvs, setRdvs] = useState<RdvConfirme[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOuvert, setDetailOuvert] = useState<RdvConfirme | null>(null)
  const [consultantAttitre, setConsultantAttitre] = useState<string | null>(null)

  const lundi = lundiDeLaSemaine(dateRef)
  const jours = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(lundi)
    d.setDate(lundi.getDate() + i)
    return d
  })

  // Grille mois : 42 cases à partir du lundi de la semaine du 1er du mois
  const premier = premierJourDuMois(dateRef)
  const lundiPremier = lundiDeLaSemaine(premier)
  const joursGrilleMois = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(lundiPremier)
    d.setDate(lundiPremier.getDate() + i)
    return d
  })

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const affectation = await resolveAffectationClient(user.id)
        setConsultantAttitre(affectation.consultant_id)
      }
    })()
  }, [])

  useEffect(() => { if (userId) charger() }, [userId, vue, dateRef])

  async function charger() {
    if (!userId) return
    setLoading(true)

    const debut = vue === "semaine" ? formatDateISO(jours[0]) : formatDateISO(joursGrilleMois[0])
    const fin   = vue === "semaine" ? formatDateISO(jours[4]) : formatDateISO(joursGrilleMois[41])

    const { data } = await supabase
      .from("rendez_vous_client")
      .select("id, type_mission, message, consultant_id, disponibilite:disponibilite_id(date, heure_debut)")
      .eq("client_id", userId)
      .eq("statut", "confirme")

    const consultantIds = [...new Set((data || []).map((r: any) => r.consultant_id))]
    const { data: consultants } = await supabase
      .from("marketplace_consultants")
      .select("user_id, prenom, nom")
      .in("user_id", consultantIds)
    const nomsMap: Record<string, string> = {}
    ;(consultants || []).forEach((c: any) => { nomsMap[c.user_id] = `${c.prenom} ${c.nom}` })

    const rdvsFiltres: RdvConfirme[] = (data || [])
      .filter((r: any) => r.disponibilite?.date >= debut && r.disponibilite?.date <= fin)
      .map((r: any) => ({
        id: r.id,
        date: r.disponibilite.date,
        heure_debut: r.disponibilite.heure_debut,
        type_mission: r.type_mission,
        message: r.message,
        consultant_nom: nomsMap[r.consultant_id] || "Consultant AGE",
      }))

    setRdvs(rdvsFiltres)
    setLoading(false)
  }

  function trouverRdv(jourIndex: number, heure: string): RdvConfirme | undefined {
    const dateStr = formatDateISO(jours[jourIndex])
    return rdvs.find(r => r.date === dateStr && r.heure_debut.slice(0, 5) === heure)
  }

  function rdvsDuJour(jour: Date): RdvConfirme[] {
    const dateStr = formatDateISO(jour)
    return rdvs.filter(r => r.date === dateStr).sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
  }

  function precedent() {
    const d = new Date(dateRef)
    if (vue === "semaine") d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setDateRef(d)
  }

  function suivant() {
    const d = new Date(dateRef)
    if (vue === "semaine") d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setDateRef(d)
  }

  const titrePeriode = vue === "semaine"
    ? `${formatDateAffichage(jours[0])} — ${formatDateAffichage(jours[4])}`
    : `${MOIS_FR[dateRef.getMonth()]} ${dateRef.getFullYear()}`

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Mon agenda</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {consultantAttitre ? (
            <button
              onClick={() => navigate(`/client/prise-rdv/${consultantAttitre}?mode=coordination`)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-calendar-plus" aria-hidden="true" />
              Prendre RDV
            </button>
          ) : (
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>Aucun consultant attitré pour l'instant</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["semaine", "mois"] as VueCalendrier[]).map(v => (
            <button
              key={v}
              onClick={() => setVue(v)}
              style={{
                padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500,
                border: `1px solid ${vue === v ? "#0F6E56" : "#E2E8F0"}`,
                background: vue === v ? "#ECFDF5" : "white",
                color: vue === v ? "#0F6E56" : "#64748B", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {v === "semaine" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={precedent} style={{ width: "32px", height: "32px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer" }}>
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </button>
          <span style={{ fontSize: "13px", color: "#64748B", minWidth: "180px", textAlign: "center" }}>
            {titrePeriode}
          </span>
          <button onClick={suivant} style={{ width: "32px", height: "32px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer" }}>
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Chargement…</div>
      ) : rdvs.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-calendar-off" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
            Aucun rendez-vous {vue === "semaine" ? "cette semaine" : "ce mois-ci"}
          </div>
        </div>
      ) : vue === "semaine" ? (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "560px" }}>
            <thead>
              <tr>
                <th style={{ width: "64px" }}></th>
                {jours.map((j, i) => (
                  <th key={i} style={{ fontSize: "12px", fontWeight: 500, color: "#64748B", padding: "6px 4px" }}>
                    {formatDateAffichage(j)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEURES.map(heure => (
                <tr key={heure}>
                  <td style={{ fontSize: "12px", color: "#94A3B8", padding: "6px 4px", verticalAlign: "middle" }}>{heure}</td>
                  {jours.map((_, jourIndex) => {
                    const r = trouverRdv(jourIndex, heure)
                    return (
                      <td key={jourIndex} style={{ padding: "2px" }}>
                        <div
                          onClick={() => r && setDetailOuvert(r)}
                          style={{
                            height: "34px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", cursor: r ? "pointer" : "default", padding: "2px", textAlign: "center",
                            background: r ? "#B5D4F4" : "white", color: r ? "#0C447C" : "#CBD5E1",
                            border: r ? "none" : "1px solid #E2E8F0",
                          }}
                        >
                          {r ? r.consultant_nom : ""}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {JOURS_FR.map(j => (
              <div key={j} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#78716C", padding: "4px 0", letterSpacing: "0.05em" }}>
                {j}
              </div>
            ))}
            {joursGrilleMois.map((jour, i) => {
              const horsMois = jour.getMonth() !== dateRef.getMonth()
              const estAujourdhui = isMemeJour(jour, new Date())
              const rdvsJour = rdvsDuJour(jour)
              return (
                <div
                  key={i}
                  style={{
                    background: estAujourdhui ? "#F0FDF4" : horsMois ? "#FAFAFA" : "#fff",
                    border: `1px solid ${estAujourdhui ? "#0F6E56" : "#E5E1DA"}`,
                    borderRadius: "8px", padding: "4px 5px", minHeight: "72px",
                    opacity: horsMois ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: estAujourdhui ? 700 : 400, color: estAujourdhui ? "#0F6E56" : "#1F2937", marginBottom: "3px", textAlign: "right" }}>
                    {jour.getDate()}
                  </div>
                  {rdvsJour.slice(0, 2).map(r => (
                    <div
                      key={r.id}
                      onClick={() => setDetailOuvert(r)}
                      style={{ background: "#B5D4F4", color: "#0C447C", borderRadius: "4px", padding: "2px 4px", marginBottom: "2px", fontSize: "9px", fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {r.heure_debut.slice(0, 5)} {r.consultant_nom}
                    </div>
                  ))}
                  {rdvsJour.length > 2 && (
                    <div style={{ fontSize: "9px", color: "#78716C", textAlign: "center" }}>
                      +{rdvsJour.length - 2} autre{rdvsJour.length - 2 > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {detailOuvert && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => setDetailOuvert(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "380px", maxWidth: "90vw", background: "white", zIndex: 400, borderRadius: "12px", padding: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Rendez-vous confirmé</h3>
              <button onClick={() => setDetailOuvert(null)} style={{ border: "none", background: "#F4F3F0", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Avec</div>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>{detailOuvert.consultant_nom}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Quand</div>
                <div style={{ fontSize: "14px" }}>
                  {new Date(detailOuvert.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })} à {detailOuvert.heure_debut.slice(0, 5)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Type de prestation</div>
                <div style={{ fontSize: "14px" }}>{COMPETENCE_LABELS[detailOuvert.type_mission] || detailOuvert.type_mission}</div>
              </div>
              {detailOuvert.message && (
                <div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Description</div>
                  <div style={{ fontSize: "13px", background: "#F8F7F4", padding: "10px", borderRadius: "8px" }}>{detailOuvert.message}</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}