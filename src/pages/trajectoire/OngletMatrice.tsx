// src/pages/trajectoire/OngletMatrice.tsx
//
// Matrice d'exigences de l'organisation, par domaine.
// Droits (appliqués par les triggers de la base, reflétés ici) :
//  - admin_client : statut (sauf "conforme"), déclaration de conformité, retrait de sa déclaration.
//  - utilisateur_client : lecture seule.
//  - personnel AGE : qualification, statut, confirmation de conformité après déclaration du client.

import React, { useMemo, useState } from "react"
import {
  DOMAINES, QUALIFICATIONS_LABEL, aujourdhuiISO, echeanceEffective, estEnRetard, fmtDateFR, fmtPct,
  maturite, statutAffiche, type DomaineTrajectoire, type ExigenceLigne, type Qualification, type StatutExigence,
} from "../../lib/trajectoire"
import type { PatchExigence } from "./useExigences"
import { PastilleStatut, Valeur, boutonPrimaire, boutonSecondaire, carte, selecteur } from "./ui"

interface Props {
  exigences: ExigenceLigne[]
  chargement: boolean
  erreur: string | null
  estAdminClient: boolean
  estPersonnelAGE: boolean
  modifier: (id: string, patch: PatchExigence) => Promise<string | null>
  initialiser: () => Promise<{ crees: number; erreur: string | null }>
}

const STATUTS_SAISISSABLES: ReadonlyArray<{ id: StatutExigence; label: string }> = [
  { id: "a_evaluer", label: "À évaluer" },
  { id: "en_cours", label: "En cours" },
  { id: "non_conforme", label: "Non conforme" },
  { id: "non_applicable", label: "Non applicable" },
]

const QUALIFICATIONS: ReadonlyArray<Qualification> = ["obligatoire", "potentielle", "volontaire"]

function styleQualification(q: Qualification): React.CSSProperties {
  const base: React.CSSProperties = { display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }
  if (q === "obligatoire") return { ...base, background: "#EEF2FF", color: "#3730A3" }
  if (q === "potentielle") return { ...base, background: "#F1F5F9", color: "#475569" }
  return { ...base, background: "#FFFFFF", color: "#475569", border: "1px solid #CBD5E1" }
}

function LigneExigence(props: {
  key?: string
  e: ExigenceLigne
  aujourdhui: string
  estAdminClient: boolean
  estPersonnelAGE: boolean
  occupe: boolean
  onPatch: (id: string, patch: PatchExigence) => void
}) {
  const { e, aujourdhui, estAdminClient, estPersonnelAGE, occupe, onPatch } = props
  const affiche = statutAffiche(e)
  const echeance = echeanceEffective(e)
  const enRetard = estEnRetard(e, aujourdhui)
  const declaree = e.valide_client_le !== null
  const confirmee = e.valide_age_le !== null

  let validations = "Aucune validation"
  if (declaree && confirmee) validations = `Validé par le client le ${fmtDateFR(e.valide_client_le)}, confirmé par AGE le ${fmtDateFR(e.valide_age_le)}`
  else if (declaree) validations = `Validé par le client le ${fmtDateFR(e.valide_client_le)}, confirmation AGE attendue`

  const statutsPossibles = e.statut === "conforme"
    ? [{ id: "conforme" as StatutExigence, label: "Conforme" }, ...STATUTS_SAISISSABLES]
    : STATUTS_SAISISSABLES

  function changerStatut(valeur: StatutExigence) {
    const patch: PatchExigence = { statut: valeur }
    // Sortir de "conforme" retire la confirmation AGE affichée.
    if (e.statut === "conforme" && estPersonnelAGE) patch.valide_age_le = null
    onPatch(e.id, patch)
  }

  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{e.referentiel.libelle}</span>
          <span style={styleQualification(e.qualification)}>{QUALIFICATIONS_LABEL[e.qualification]}</span>
          <span style={{ fontSize: 12, color: "#57534E" }}>{e.referentiel.nature === "reglementaire" ? "Réglementaire" : "Volontaire"}</span>
        </div>
        <div style={{ fontSize: 12, color: "#57534E", marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>Échéance : <Valeur>{fmtDateFR(echeance)}</Valeur></span>
          {enRetard && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "#FEE2E2", color: "#991B1B", fontWeight: 600 }}>
              <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
              En retard
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#57534E", marginTop: 4 }}>{validations}</div>
        {e.referentiel.description && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, color: "#3730A3", cursor: "pointer" }}>Voir le détail du texte</summary>
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: "6px 0 0", maxWidth: "70ch" }}>{e.referentiel.description}</p>
            {e.referentiel.source_url && (
              <a href={e.referentiel.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0369A1" }}>Voir la source</a>
            )}
          </details>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", flex: "0 1 300px" }}>
        <PastilleStatut statut={affiche} />

        {estPersonnelAGE && (
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
            Qualification
            <select aria-label={`Qualification de ${e.referentiel.libelle}`} style={selecteur} disabled={occupe} value={e.qualification}
              onChange={ev => onPatch(e.id, { qualification: ev.target.value as Qualification })}>
              {QUALIFICATIONS.map(q => <option key={q} value={q}>{QUALIFICATIONS_LABEL[q]}</option>)}
            </select>
          </label>
        )}

        {(estAdminClient || estPersonnelAGE) && (
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
            Statut
            <select aria-label={`Statut de ${e.referentiel.libelle}`} style={selecteur} disabled={occupe} value={e.statut}
              onChange={ev => changerStatut(ev.target.value as StatutExigence)}>
              {statutsPossibles.map(s => <option key={s.id} value={s.id} disabled={s.id === "conforme"}>{s.label}</option>)}
            </select>
          </label>
        )}

        {estAdminClient && !declaree && e.statut !== "non_applicable" && (
          <button type="button" style={boutonPrimaire} disabled={occupe}
            onClick={() => onPatch(e.id, {
              valide_client_le: new Date().toISOString(),
              statut: e.statut === "a_evaluer" || e.statut === "non_conforme" ? "en_cours" : e.statut,
            })}>
            Déclarer conforme
          </button>
        )}
        {estAdminClient && declaree && !confirmee && (
          <button type="button" style={boutonSecondaire} disabled={occupe}
            onClick={() => onPatch(e.id, { valide_client_le: null })}>
            Retirer ma déclaration
          </button>
        )}

        {estPersonnelAGE && declaree && !confirmee && (
          <button type="button" style={boutonPrimaire} disabled={occupe}
            onClick={() => onPatch(e.id, { statut: "conforme" })}>
            Confirmer la conformité
          </button>
        )}
        {estPersonnelAGE && confirmee && (
          <button type="button" style={boutonSecondaire} disabled={occupe}
            onClick={() => onPatch(e.id, { valide_age_le: null })}>
            Retirer la confirmation
          </button>
        )}

        {!estAdminClient && !estPersonnelAGE && (
          <span style={{ fontSize: 12, color: "#57534E", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-lock" aria-hidden="true" />
            Modification réservée aux administrateurs de votre organisation.
          </span>
        )}
      </div>
    </div>
  )
}

export default function OngletMatrice(props: Props) {
  const { exigences, chargement, erreur, estAdminClient, estPersonnelAGE, modifier, initialiser } = props
  const [filtre, setFiltre] = useState<DomaineTrajectoire | "tous">("tous")
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null)
  const aujourdhui = aujourdhuiISO()

  const parDomaine = useMemo(() => DOMAINES.map(d => ({
    ...d,
    lignes: exigences.filter(l => l.referentiel.domaine === d.id),
  })), [exigences])

  async function appliquer(id: string, patch: PatchExigence) {
    setOccupe(true)
    setMessage(null)
    const err = await modifier(id, patch)
    if (err) setMessage({ type: "erreur", texte: err })
    setOccupe(false)
  }

  async function lancerInitialisation() {
    setOccupe(true)
    setMessage(null)
    const r = await initialiser()
    if (r.erreur) setMessage({ type: "erreur", texte: r.erreur })
    else setMessage({ type: "ok", texte: r.crees === 0 ? "La matrice contient déjà toutes les exigences du référentiel." : `${r.crees} exigence${r.crees > 1 ? "s" : ""} ajoutée${r.crees > 1 ? "s" : ""}. Vérifiez la qualification de chacune.` })
    setOccupe(false)
  }

  if (chargement && exigences.length === 0) return <div style={carte}>Chargement de la matrice…</div>
  if (erreur) {
    return (
      <div role="alert" style={{ ...carte, borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B" }}>
        <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
        Impossible de charger la matrice : {erreur}
      </div>
    )
  }

  if (exigences.length === 0) {
    return (
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>La matrice de cette organisation est vide</div>
        {estPersonnelAGE ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: "70ch", lineHeight: 1.5 }}>
              Ajoutez les exigences du référentiel. Chaque exigence démarre « À évaluer » avec la qualification « Potentiellement éligible » (« Volontaire » pour les normes volontaires). Ajustez ensuite la qualification et marquez « Non applicable » celles qui ne concernent pas ce client.
            </p>
            <button type="button" style={boutonPrimaire} disabled={occupe} onClick={() => void lancerInitialisation()}>Ajouter les exigences du référentiel</button>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: "70ch", lineHeight: 1.5 }}>
            Votre consultant AGE prépare la matrice de votre organisation. Elle apparaîtra ici dès qu'elle sera disponible.
          </p>
        )}
        {message && <div role="status" style={{ fontSize: 13, color: message.type === "erreur" ? "#991B1B" : "#166534" }}>{message.texte}</div>}
      </div>
    )
  }

  return (
    <section aria-label="Matrice d'exigences" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div role="group" aria-label="Filtrer par domaine" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[{ id: "tous" as const, label: "Tous les domaines" }, ...DOMAINES.map(d => ({ id: d.id, label: d.label }))].map(f => (
          <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}
            style={{
              minHeight: 44, padding: "0 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              ...(filtre === f.id ? { background: "#4338CA", color: "#FFFFFF", border: "1px solid #4338CA" } : { background: "#FFFFFF", color: "#3730A3", border: "1px solid #C7D2FE" }),
            }}>
            {f.label}
          </button>
        ))}
        {estPersonnelAGE && (
          <button type="button" style={{ ...boutonSecondaire, marginLeft: "auto" }} disabled={occupe} onClick={() => void lancerInitialisation()}>
            Ajouter les exigences manquantes
          </button>
        )}
      </div>

      {message && (
        <div role={message.type === "erreur" ? "alert" : "status"}
          style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
            background: message.type === "erreur" ? "#FEE2E2" : "#DCFCE7", color: message.type === "erreur" ? "#991B1B" : "#166534" }}>
          <i className={`ti ${message.type === "erreur" ? "ti-alert-octagon" : "ti-circle-check"}`} aria-hidden="true" />
          {message.texte}
        </div>
      )}

      {parDomaine.filter(d => (filtre === "tous" || filtre === d.id) && d.lignes.length > 0).map(d => {
        const m = maturite(d.lignes)
        return (
          <div key={d.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEF2FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${d.icone}`} style={{ color: "#4338CA", fontSize: 18 }} aria-hidden="true" />
              </span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0F172A", flex: "1 1 160px" }}>{d.label}</h2>
              <span style={{ fontSize: 13, color: "#57534E" }}>Maturité <Valeur>{fmtPct(m.pct)}</Valeur></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.lignes.map(l => (
                <LigneExigence key={l.id} e={l} aujourdhui={aujourdhui} estAdminClient={estAdminClient}
                  estPersonnelAGE={estPersonnelAGE} occupe={occupe} onPatch={(id, patch) => void appliquer(id, patch)} />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}