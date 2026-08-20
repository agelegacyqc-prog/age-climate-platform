import React, { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

interface DispoExistante {
  id: string
  date: string
  heure_debut: string
  statut: "libre" | "reserve" | "indisponible"
}

interface CreneauSelectionne {
  date: string
  heure: string
  existingId: string | null
  existingStatut: "libre" | "reserve" | "indisponible" | null
}

const HEURES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

const COMPETENCE_LABELS: Record<string, string> = {
  csrd: "CSRD", tertiaire: "Décret Tertiaire", bilan_ges: "Bilan GES",
  audit_energetique: "Audit Énergétique", sfdr: "SFDR",
  eu_taxonomy: "Taxonomie européenne", bacs: "Décret BACS",
  iso50001: "ISO 50001", ifrs_s2: "IFRS S2", esrs: "ESRS",
}
const MOTIFS_COORDINATION: Record<string, string> = {
  point_suivi: "Point de suivi",
  lancement_mission: "Lancement d'une mission",
  point_kpi: "Point sur les indicateurs",
  autre: "Autre besoin",
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

function heureFin(heure: string) {
  const [h, m] = heure.split(":").map(Number)
  const d = new Date(2000, 0, 1, h, m)
  d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function PriseRdv() {
  const { consultantId } = useParams<{ consultantId: string }>()
  const [searchParams] = useSearchParams()
  const modeCoordination = searchParams.get("mode") === "coordination"
  const navigate = useNavigate()

  const [userId, setUserId] = useState<string | null>(null)
  const [consultantNom, setConsultantNom] = useState("")
  const [competences, setCompetences] = useState<string[]>([])
  const [semaine, setSemaine] = useState(lundiDeLaSemaine(new Date()))
  const [dispos, setDispos] = useState<DispoExistante[]>([])
  const [loading, setLoading] = useState(true)

  const [formOuvert, setFormOuvert] = useState<CreneauSelectionne | null>(null)
  const [typeMission, setTypeMission] = useState("")
  const [message, setMessage] = useState("")
  const [erreur, setErreur] = useState("")
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [succes, setSucces] = useState(false)

  const jours = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(semaine)
    d.setDate(semaine.getDate() + i)
    return d
  })

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      if (modeCoordination) {
        // RDV de coordination avec le consultant régional attitré : pas de fiche
        // expert, motifs génériques fixes, nom lu directement sur profils.
        const { data: profil } = await supabase
          .from("profils")
          .select("prenom, nom")
          .eq("id", consultantId)
          .maybeSingle()
        if (profil) setConsultantNom(`${profil.prenom} ${profil.nom}`)
        setCompetences(Object.keys(MOTIFS_COORDINATION))
        return
      }

      const { data: fiche } = await supabase
        .from("marketplace_consultants")
        .select("prenom, nom, competences")
        .eq("user_id", consultantId)
        .maybeSingle()
      if (fiche) {
        setConsultantNom(`${fiche.prenom} ${fiche.nom}`)
        setCompetences(fiche.competences || [])
      }
    })()
  }, [consultantId, modeCoordination])

  useEffect(() => { if (consultantId) charger() }, [consultantId, semaine])

  async function charger() {
    setLoading(true)
    const debut = formatDateISO(jours[0])
    const fin = formatDateISO(jours[4])
    // On charge TOUTES les lignes (plus seulement 'libre') : dans le nouveau modèle,
    // l'absence de ligne = disponible, donc il faut connaître les exceptions
    // ('indisponible' et 'reserve') pour savoir quels créneaux ne sont PAS réservables.
    const { data } = await supabase
      .from("disponibilites_consultant")
      .select("id, date, heure_debut, statut")
      .eq("consultant_id", consultantId)
      .gte("date", debut)
      .lte("date", fin)
    setDispos(data || [])
    setLoading(false)
  }

  function trouverDispo(jourIndex: number, heure: string): DispoExistante | undefined {
    const dateStr = formatDateISO(jours[jourIndex])
    return dispos.find(d => d.date === dateStr && d.heure_debut.slice(0, 5) === heure)
  }

  function estReservable(d: DispoExistante | undefined) {
    return !d || d.statut === "libre"
  }

  function ouvrirFormulaire(jourIndex: number, heure: string) {
    const existante = trouverDispo(jourIndex, heure)
    if (!estReservable(existante)) return
    setFormOuvert({
      date: formatDateISO(jours[jourIndex]),
      heure,
      existingId: existante?.id ?? null,
      existingStatut: existante?.statut ?? null,
    })
    setTypeMission("")
    setMessage("")
    setErreur("")
    setSucces(false)
  }

  async function confirmerReservation() {
    if (!typeMission) { setErreur("Choisissez un type de prestation."); return }
    if (!formOuvert || !userId || !consultantId) return

    setEnvoiEnCours(true)
    setErreur("")

    let disponibiliteId: string
    let creeParNous = false

    if (formOuvert.existingId) {
      // Ligne 'libre' existante : verrouillage atomique par UPDATE conditionnel
      const { data: verrou, error: erreurVerrou } = await supabase
        .from("disponibilites_consultant")
        .update({ statut: "reserve", vu_consultant: false })
        .eq("id", formOuvert.existingId)
        .eq("statut", "libre")
        .select()

      if (erreurVerrou || !verrou || verrou.length === 0) {
        setErreur("Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.")
        setEnvoiEnCours(false)
        charger()
        return
      }
      disponibiliteId = formOuvert.existingId
    } else {
      // Aucune ligne : le créneau est disponible par défaut. On tente de créer
      // la ligne directement en 'reserve' — la contrainte UNIQUE(consultant_id,
      // date, heure_debut) empêche deux clients de réserver le même créneau
      // en même temps (le second INSERT échoue).
          const { data: nouvelle, error: erreurInsert } = await supabase
        .from("disponibilites_consultant")
        .insert({
          consultant_id: consultantId,
          date: formOuvert.date,
          heure_debut: formOuvert.heure,
          heure_fin: heureFin(formOuvert.heure),
          statut: "reserve",
          vu_consultant: false,
        })
        .select()
        .single()

      if (erreurInsert || !nouvelle) {
        if (erreurInsert?.code === "23505") {
          setErreur("Ce créneau vient d'être pris ou bloqué. Choisissez-en un autre.")
        } else {
          setErreur("Échec de la réservation. Réessayez.")
        }
        setEnvoiEnCours(false)
        charger()
        return
      }
      disponibiliteId = nouvelle.id
      creeParNous = true
    }

    const { error: erreurInsertRdv } = await supabase.from("rendez_vous_client").insert({
      disponibilite_id: disponibiliteId,
      client_id: userId,
      consultant_id: consultantId,
      type_mission: typeMission,
      message: message || null,
      statut: "confirme",
    })

    if (erreurInsertRdv) {
      // Rollback : si on a nous-mêmes créé la ligne, on la supprime (retour à "disponible" par défaut) ;
      // si c'était une ligne 'libre' préexistante, on la restaure.
      if (creeParNous) {
        await supabase.from("disponibilites_consultant").delete().eq("id", disponibiliteId)
      } else {
        await supabase.from("disponibilites_consultant").update({ statut: "libre" }).eq("id", disponibiliteId)
      }
      setErreur("Échec de la réservation. Réessayez.")
      setEnvoiEnCours(false)
      return
    }

    // Duplication dans l'Agenda RDV (table `rendez_vous`, système indépendant
    // de disponibilites_consultant/rendez_vous_client) — identité client
    // résolue comme dans Missions.tsx (organisation_id prioritaire, sinon nom).
    const { data: pc } = await supabase
      .from("profils_client")
      .select("prenom, nom, organisation_id")
      .eq("id", userId)
      .maybeSingle()

    let clientLabel = "Client"
    if (pc) {
      if (pc.organisation_id) {
        const { data: org } = await supabase
          .from("organisations")
          .select("raison_sociale")
          .eq("id", pc.organisation_id)
          .maybeSingle()
        if (org?.raison_sociale) clientLabel = org.raison_sociale
      }
      if (clientLabel === "Client" && (pc.prenom || pc.nom)) {
        clientLabel = `${pc.prenom || ""} ${pc.nom || ""}`.trim()
      }
    }

    const motifLabel = modeCoordination
      ? (MOTIFS_COORDINATION[typeMission] || typeMission)
      : (COMPETENCE_LABELS[typeMission] || typeMission)

    const { error: erreurAgenda } = await supabase.from("rendez_vous").insert({
      titre: `${clientLabel} — ${motifLabel}`,
      type_rdv: "appel",
      date_debut: new Date(`${formOuvert.date}T${formOuvert.heure}`).toISOString(),
      duree_minutes: 60,
      note_preparation: message || null,
      statut: "confirme",
      consultant_id: consultantId,
    })

    if (erreurAgenda) {
      // La réservation client (disponibilites_consultant + rendez_vous_client)
      // est déjà confirmée et prioritaire : on ne rollback pas pour un échec
      // de duplication d'affichage, on log seulement pour investigation.
      console.error("Échec duplication Agenda RDV:", erreurAgenda)
    }

    setSucces(true)
    setEnvoiEnCours(false)
    charger()
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

      <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit", width: "fit-content" }}>
        <i className="ti ti-arrow-left" aria-hidden="true" /> Retour
      </button>

      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Prendre rendez-vous</h2>
        <p style={{ fontSize: "13px", color: "#64748B", marginTop: "2px" }}>avec {consultantNom || "…"}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#64748B" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#9FE1CB", marginRight: "6px" }} />
          Créneau disponible
        </span>
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
                    const d = trouverDispo(jourIndex, heure)
                    const reservable = estReservable(d)
                    return (
                      <td key={jourIndex} style={{ padding: "2px" }}>
                        <div
                          onClick={() => reservable && ouvrirFormulaire(jourIndex, heure)}
                          style={{
                            height: "34px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", cursor: reservable ? "pointer" : "default",
                            background: reservable ? "#9FE1CB" : d?.statut === "reserve" ? "#F5C4B3" : "#F1EFE8",
                            color: reservable ? "#085041" : d?.statut === "reserve" ? "#712B13" : "#B4B2A9",
                          }}
                        >
                          {reservable ? "Réserver" : d?.statut === "reserve" ? "Pris" : "Indisponible"}
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

      {formOuvert && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }} onClick={() => !succes && setFormOuvert(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "420px", maxWidth: "90vw", background: "white", zIndex: 400, borderRadius: "12px", padding: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
            {succes ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <i className="ti ti-circle-check" style={{ fontSize: "40px", color: "#2F7D5C", display: "block", marginBottom: "12px" }} aria-hidden="true" />
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>Rendez-vous confirmé</div>
                <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>
                  Retrouvez-le dans "Mon agenda".
                </div>
                <button onClick={() => navigate("/client/mon-agenda")} style={{ background: "#0F6E56", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  Voir mon agenda
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px" }}>
                  {new Date(formOuvert.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })} à {formOuvert.heure}
                </h3>

                {erreur && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", fontSize: "12px", color: "#991B1B" }}>
                    {erreur}
                  </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                    {modeCoordination ? "Motif du rendez-vous" : "Type de prestation"} <span style={{ color: "#B91C1C" }}>*</span>
                  </label>
                               <select value={typeMission} onChange={e => setTypeMission(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", background: "white" }}>
                    <option value="">Choisir…</option>
                    {competences.map(c => (
                      <option key={c} value={c}>{modeCoordination ? (MOTIFS_COORDINATION[c] || c) : (COMPETENCE_LABELS[c] || c)}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#44403C", marginBottom: "6px" }}>
                    Description du besoin <span style={{ color: "#94A3B8", fontWeight: 400 }}>— optionnel</span>
                  </label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Décrivez brièvement votre besoin…" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E1DA", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical" }} />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setFormOuvert(null)} style={{ flex: 1, padding: "10px", background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "#64748B" }}>
                    Annuler
                  </button>
                  <button onClick={confirmerReservation} disabled={envoiEnCours} style={{ flex: 2, padding: "10px", background: "#0F6E56", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                    {envoiEnCours ? "Confirmation…" : "Confirmer le rendez-vous"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}