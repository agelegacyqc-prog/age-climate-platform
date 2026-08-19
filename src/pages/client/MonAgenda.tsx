import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

interface RdvConfirme {
  id: string
  date: string
  heure_debut: string
  type_mission: string
  message: string | null
  consultant_nom: string
}

const COMPETENCE_LABELS: Record<string, string> = {
  csrd: "CSRD", tertiaire: "Décret Tertiaire", bilan_ges: "Bilan GES",
  audit_energetique: "Audit Énergétique", sfdr: "SFDR",
  eu_taxonomy: "Taxonomie européenne", bacs: "Décret BACS",
  iso50001: "ISO 50001", ifrs_s2: "IFRS S2", esrs: "ESRS",
}

function lundiDeLaSemaine(d: Date) {
  const jour = d.getDay()
  const diff = jour === 0 ? -6 : 1 - jour
  const lundi = new Date(d)
  lundi.setDate(d.getDate() + diff)
  lundi.setHours(0, 0, 0, 0)
  return lundi
}

function formatDateISO(d: Date) {
  return d.toISOString().split("T")[0]
}

function formatDateAffichage(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })
}

const HEURES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

export default function MonAgenda() {
  const [userId, setUserId] = useState<string | null>(null)
  const [semaine, setSemaine] = useState(lundiDeLaSemaine(new Date()))
  const [rdvs, setRdvs] = useState<RdvConfirme[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOuvert, setDetailOuvert] = useState<RdvConfirme | null>(null)

  const jours = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(semaine)
    d.setDate(semaine.getDate() + i)
    return d
  })

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    })()
  }, [])

  useEffect(() => { if (userId) charger() }, [userId, semaine])

  async function charger() {
    if (!userId) return
    setLoading(true)
    const debut = formatDateISO(jours[0])
    const fin = formatDateISO(jours[4])

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

  function semainePrecedente() {
    const d = new Date(semaine)
    d.setDate(d.getDate() - 7)
    setSemaine(d)
  }

  function semaineSuivante() {
    const d = new Date(semaine)
    d.setDate(d.getDate() + 7)
    setSemaine(d)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Mon agenda</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={semainePrecedente} style={{ width: "32px", height: "32px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer" }}>
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </button>
          <span style={{ fontSize: "13px", color: "#64748B", minWidth: "160px", textAlign: "center" }}>
            {formatDateAffichage(jours[0])} — {formatDateAffichage(jours[4])}
          </span>
          <button onClick={semaineSuivante} style={{ width: "32px", height: "32px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer" }}>
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Chargement…</div>
      ) : rdvs.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-calendar-off" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Aucun rendez-vous cette semaine</div>
        </div>
      ) : (
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