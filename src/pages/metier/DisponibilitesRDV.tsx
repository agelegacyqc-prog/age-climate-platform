import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

interface Dispo {
  id: string
  date: string
  heure_debut: string
  heure_fin: string
  statut: "libre" | "reserve" | "indisponible"
}

interface RdvDetail {
  id: string
  type_mission: string
  message: string | null
  client_nom: string
}

const HEURES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

type Vue = "semaine" | "mois"

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

function formatMoisAffichage(d: Date) {
  const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function premierJourGrilleMois(mois: Date) {
  const premierDuMois = new Date(mois.getFullYear(), mois.getMonth(), 1)
  return lundiDeLaSemaine(premierDuMois)
}

export default function DisponibilitesRDV() {
  const [userId, setUserId] = useState<string | null>(null)
  const [vue, setVue] = useState<Vue>("semaine")
  const [semaine, setSemaine] = useState(lundiDeLaSemaine(new Date()))
  const [mois, setMois] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dispos, setDispos] = useState<Dispo[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOuvert, setDetailOuvert] = useState<RdvDetail | null>(null)

  const jours = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(semaine)
    d.setDate(semaine.getDate() + i)
    return d
  })

  // Grille mois : 6 semaines complètes (lundi → dimanche) pour couvrir tous les cas
  const joursGrilleMois = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(premierJourGrilleMois(mois))
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    })()
  }, [])

  useEffect(() => { if (userId) charger() }, [userId, semaine, mois, vue])

  async function charger() {
    if (!userId) return
    setLoading(true)

    let debut: string, fin: string
    if (vue === "semaine") {
      debut = formatDateISO(jours[0])
      fin = formatDateISO(jours[4])
    } else {
      debut = formatDateISO(joursGrilleMois[0])
      fin = formatDateISO(joursGrilleMois[41])
    }

     // Seules les lignes 'indisponible' et 'reserve' sont pertinentes : une ligne
    // 'libre' (historique) ou l'absence de ligne ont exactement le même sens —
    // disponible — donc inutile de les charger pour l'affichage.
    const { data } = await supabase
      .from("disponibilites_consultant")
      .select("id, date, heure_debut, heure_fin, statut")
      .eq("consultant_id", userId)
      .in("statut", ["indisponible", "reserve"])
      .gte("date", debut)
      .lte("date", fin)
    setDispos(data || [])
    setLoading(false)

    // Marquer les réservations comme vues (fait disparaître le badge sidebar)
    await supabase
      .from("disponibilites_consultant")
      .update({ vu_consultant: true })
      .eq("consultant_id", userId)
      .eq("statut", "reserve")
      .eq("vu_consultant", false)
  }

  function trouverDispo(jourIndex: number, heure: string): Dispo | undefined {
    const dateStr = formatDateISO(jours[jourIndex])
    return dispos.find(d => d.date === dateStr && d.heure_debut.slice(0, 5) === heure)
  }

  function heureFin(heure: string) {
    const [h, m] = heure.split(":").map(Number)
    const d = new Date(2000, 0, 1, h, m)
    d.setHours(d.getHours() + 1)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  // Modèle : par défaut (aucune ligne), un créneau est DISPONIBLE.
  // Un clic bloque le créneau (crée une ligne 'indisponible').
  // Un second clic débloque (supprime la ligne).
  // Un clic sur un créneau réservé ouvre le détail du RDV.
  async function toggleCase(jourIndex: number, heure: string) {
    if (!userId) return
    const existante = trouverDispo(jourIndex, heure)

    if (existante?.statut === "reserve") {
      await ouvrirDetail(existante.id)
      return
    }

    if (existante?.statut === "indisponible") {
      await supabase.from("disponibilites_consultant").delete().eq("id", existante.id)
    } else {
      await supabase.from("disponibilites_consultant").insert({
        consultant_id: userId,
        date: formatDateISO(jours[jourIndex]),
        heure_debut: heure,
        heure_fin: heureFin(heure),
        statut: "indisponible",
      })
    }
    charger()
  }

  async function ouvrirDetail(dispoId: string) {
    const { data } = await supabase
      .from("rendez_vous_client")
      .select("id, type_mission, message, client_id")
      .eq("disponibilite_id", dispoId)
      .maybeSingle()

    if (data) {
      const { data: profilClient } = await supabase
        .from("profils_client")
        .select("organisation_id")
        .eq("id", data.client_id)
        .maybeSingle()
      let clientNom = data.client_id
      if (profilClient?.organisation_id) {
        const { data: org } = await supabase
          .from("organisations")
          .select("raison_sociale")
          .eq("id", profilClient.organisation_id)
          .maybeSingle()
        clientNom = org?.raison_sociale || clientNom
      }
      setDetailOuvert({ id: data.id, type_mission: data.type_mission, message: data.message, client_nom: clientNom })
    }
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

  function moisPrecedent() {
    setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))
  }

  function moisSuivant() {
    setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))
  }

  function ouvrirSemaineDuJour(d: Date) {
    setSemaine(lundiDeLaSemaine(d))
    setVue("semaine")
  }

  // Stats agrégées par jour pour la vue mois (uniquement à partir des lignes déjà chargées)
  function statsJour(d: Date) {
    const dateStr = formatDateISO(d)
    const lignes = dispos.filter(x => x.date === dateStr)
    const nbIndisponible = lignes.filter(x => x.statut === "indisponible").length
    const nbReserve = lignes.filter(x => x.statut === "reserve").length
    return { nbIndisponible, nbReserve }
  }

  const boutonVueStyle = (actif: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer",
    fontSize: "12px", fontWeight: 500, fontFamily: "inherit",
    background: actif ? "#0F6E56" : "transparent",
    color: actif ? "white" : "#64748B",
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Mes disponibilités RDV</h2>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: "8px", padding: "3px" }}>
            <button onClick={() => setVue("semaine")} style={boutonVueStyle(vue === "semaine")}>Semaine</button>
            <button onClick={() => setVue("mois")} style={boutonVueStyle(vue === "mois")}>Mois</button>
          </div>

          {vue === "semaine" ? (
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
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={moisPrecedent} style={{ width: "32px", height: "32px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer" }}>
                <i className="ti ti-chevron-left" aria-hidden="true" />
              </button>
              <span style={{ fontSize: "13px", color: "#64748B", minWidth: "160px", textAlign: "center" }}>
                {formatMoisAffichage(mois)}
              </span>
              <button onClick={moisSuivant} style={{ width: "32px", height: "32px", border: "1px solid #E2E8F0", background: "white", borderRadius: "6px", cursor: "pointer" }}>
                <i className="ti ti-chevron-right" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#64748B", flexWrap: "wrap" as const }}>
        <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#9FE1CB", marginRight: "6px" }} />Disponible (par défaut)</span>
        <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#D3D1C7", marginRight: "6px" }} />Indisponible — cliquez pour rendre disponible</span>
        <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#F5C4B3", marginRight: "6px" }} />Réservé par un client</span>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Chargement…</div>
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
                    const d = trouverDispo(jourIndex, heure)
                    const bg = d?.statut === "reserve" ? "#F5C4B3" : d?.statut === "indisponible" ? "#D3D1C7" : "#9FE1CB"
                    const color = d?.statut === "reserve" ? "#712B13" : d?.statut === "indisponible" ? "#44403C" : "#085041"
                    return (
                      <td key={jourIndex} style={{ padding: "2px" }}>
                        <div
                          onClick={() => toggleCase(jourIndex, heure)}
                          style={{ height: "34px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", cursor: "pointer", background: bg, color, textAlign: "center", padding: "2px" }}
                        >
                          {d?.statut === "reserve" ? "Réservé" : d?.statut === "indisponible" ? "Indisponible" : "Libre"}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(j => (
              <div key={j} style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textAlign: "center", padding: "4px 0" }}>{j}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {joursGrilleMois.map((d, i) => {
              const dansLeMois = d.getMonth() === mois.getMonth()
              const estWeekend = d.getDay() === 0 || d.getDay() === 6
              const { nbIndisponible, nbReserve } = statsJour(d)
              const totalCreneaux = HEURES.length

              let bg = "#F8FAFC", border = "1px solid #F1F5F9", texteCouleur = "#CBD5E1"
              if (dansLeMois && !estWeekend) {
                if (nbReserve > 0) { bg = "#F5C4B3"; border = "1px solid #F0997B"; texteCouleur = "#712B13" }
                else if (nbIndisponible >= totalCreneaux) { bg = "#D3D1C7"; border = "1px solid #B4B2A9"; texteCouleur = "#2C2C2A" }
                else if (nbIndisponible > 0) { bg = "#FAEEDA"; border = "1px solid #FAC775"; texteCouleur = "#633806" }
                else { bg = "#E1F5EE"; border = "1px solid #9FE1CB"; texteCouleur = "#04342C" }
              }

              return (
                <div
                  key={i}
                  onClick={() => dansLeMois && !estWeekend && ouvrirSemaineDuJour(d)}
                  style={{
                    background: bg, border, borderRadius: "8px", padding: "8px 6px", minHeight: "56px",
                    cursor: dansLeMois && !estWeekend ? "pointer" : "default",
                    opacity: dansLeMois ? 1 : 0.45,
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600, color: texteCouleur }}>{d.getDate()}</div>
                  {dansLeMois && !estWeekend && (nbIndisponible > 0 || nbReserve > 0) && (
                    <div style={{ fontSize: "10px", color: texteCouleur, marginTop: "4px" }}>
                      {nbReserve > 0 && <div>{nbReserve} réservé{nbReserve > 1 ? "s" : ""}</div>}
                      {nbIndisponible > 0 && <div>{nbIndisponible} bloqué{nbIndisponible > 1 ? "s" : ""}</div>}
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
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "380px", background: "white", zIndex: 400, padding: "24px", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Rendez-vous</h3>
              <button onClick={() => setDetailOuvert(null)} style={{ border: "none", background: "#F4F3F0", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Client</div>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>{detailOuvert.client_nom}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Type de prestation</div>
                <div style={{ fontSize: "14px" }}>{detailOuvert.type_mission}</div>
              </div>
              {detailOuvert.message && (
                <div>
                  <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Description du besoin</div>
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