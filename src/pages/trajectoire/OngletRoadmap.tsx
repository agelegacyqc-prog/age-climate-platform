// src/pages/trajectoire/OngletRoadmap.tsx
//
// Roadmap priorisée de l'organisation. Le classement est calculé à la volée ; une action peut être
// « planifiée » (enregistrée dans trajectoire_actions avec un instantané de son score) puis suivie :
// statut, responsable, date cible (seulement si la source n'a pas d'échéance).
// Droits (contrôlés par trigger en base, reflétés ici) : admin_client et personnel AGE écrivent ;
// utilisateur_client consulte. Le statut d'une action n'agit pas sur l'exigence liée.
// Couleur du module : #4338CA (accent uniquement). Alertes doublées d'une icône (daltonisme).

import React, { useMemo, useState } from "react"
import { DOMAINES, QUALIFICATIONS_LABEL, aujourdhuiISO, fmtDateFR, type DomaineTrajectoire } from "../../lib/trajectoire"
import {
  HORIZONS, STATUTS_ACTION, indexerLignes, peutPlanifier, versNouvelleAction,
  type ActionRoadmap, type CritereId, type LigneAction, type NouvelleAction, type ParametresPriorite, type StatutAction,
} from "../../lib/trajectoireRoadmap"
import type { PatchAction } from "./useActions"
import { Valeur, boutonPrimaire, boutonSecondaire, carte, selecteur } from "./ui"

interface Props {
  organisationId: string
  actions: ActionRoadmap[]
  lignes: LigneAction[]
  params: ParametresPriorite
  nbActifsScores: number
  chargement: boolean
  avertissement: string | null
  erreurActions: string | null
  /** admin_client ou personnel AGE. */
  peutGerer: boolean
  planifier: (nouvelle: NouvelleAction) => Promise<string | null>
  modifier: (id: string, patch: PatchAction) => Promise<string | null>
  retirer: (id: string) => Promise<string | null>
}

const CRITERES: ReadonlyArray<{ id: CritereId; label: string }> = [
  { id: "leg", label: "Obligation légale" },
  { id: "ech", label: "Échéance" },
  { id: "sanc", label: "Sanction prévue" },
  { id: "gain", label: "Gain estimé" },
  { id: "cout", label: "Coût (un coût faible est prioritaire)" },
  { id: "expo", label: "Exposition climatique" },
]

const GROUPES: ReadonlyArray<{ id: string; label: string }> = [
  ...HORIZONS.map(h => ({ id: h.id as string, label: h.label })),
  { id: "sans_echeance", label: "Sans échéance" },
]

function poidsDe(id: CritereId, p: ParametresPriorite): number {
  switch (id) {
    case "leg": return p.w_leg
    case "ech": return p.w_ech
    case "sanc": return p.w_sanc
    case "gain": return p.w_gain
    case "cout": return p.w_cout
    case "expo": return p.w_expo
  }
}

const fmtNombre = (n: number, decimales: number): string =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
const fmtEuros = (n: number): string => `${fmtNombre(n, 0)}\u00A0€`
const fmtPoids = (w: number): string => `${fmtNombre(w * 100, 2)}\u00A0%`

const badge: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
}

const champ: React.CSSProperties = { fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }

function styleQualification(q: NonNullable<ActionRoadmap["qualification"]>): React.CSSProperties {
  const base: React.CSSProperties = { ...badge, padding: "3px 10px" }
  if (q === "obligatoire") return { ...base, background: "#EEF2FF", color: "#3730A3" }
  if (q === "potentielle") return { ...base, background: "#F1F5F9", color: "#475569" }
  return { ...base, background: "#FFFFFF", color: "#475569", border: "1px solid #CBD5E1" }
}

function libelleStatut(s: StatutAction): string {
  return STATUTS_ACTION.find(x => x.id === s)?.label ?? s
}

function CarteAction(props: {
  key?: string
  a: ActionRoadmap
  params: ParametresPriorite
  ligne: LigneAction | null
  peutGerer: boolean
  occupe: boolean
  onPlanifier: (a: ActionRoadmap) => void
  onModifier: (id: string, patch: PatchAction) => void
  onRetirer: (id: string) => void
}) {
  const { a, params, ligne, peutGerer, occupe, onPlanifier, onModifier, onRetirer } = props
  const domaine = DOMAINES.find(d => d.id === a.domaine)
  const dateModifiable = ligne !== null && (a.date_cible === null || a.date_planifiee === true)
  const terminee = ligne !== null && (ligne.statut === "realise" || ligne.statut === "abandonne")

  return (
    <li style={{ listStyle: "none", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", background: "#FFFFFF", opacity: terminee ? 0.75 : 1 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", overflowWrap: "anywhere" }}>{a.titre}</span>
            {a.qualification && <span style={styleQualification(a.qualification)}>{QUALIFICATIONS_LABEL[a.qualification]}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ ...badge, background: "#F1F5F9", color: "#475569" }}>
              <i className={`ti ${a.origine === "exigence" ? "ti-list-check" : "ti-bulb"}`} aria-hidden="true" />
              {a.origine === "exigence" ? "Exigence" : "Recommandation"}
            </span>
            {domaine && (
              <span style={{ ...badge, background: "#F1F5F9", color: "#475569" }}>
                <i className={`ti ${domaine.icone}`} aria-hidden="true" />
                {domaine.label}
              </span>
            )}
            {ligne && (
              <span style={{ ...badge, background: "#DCFCE7", color: "#166534" }}>
                <i className="ti ti-circle-check" style={{ color: "#2F7D5C" }} aria-hidden="true" />
                Planifiée
              </span>
            )}
            {a.en_retard && (
              <span style={{ ...badge, background: "#FEE2E2", color: "#991B1B" }}>
                <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
                En retard
              </span>
            )}
            {a.en_attente_age && (
              <span style={{ ...badge, background: "#FEF3C7", color: "#92400E" }}>
                <i className="ti ti-alert-triangle" style={{ color: "#D97706" }} aria-hidden="true" />
                En attente de confirmation AGE
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: "#57534E", marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>Échéance : <Valeur>{a.date_cible ? fmtDateFR(a.date_cible) : "—"}</Valeur></span>
            <span>Coût estimé : <Valeur>{a.cout_estime !== null ? fmtEuros(a.cout_estime) : "—"}</Valeur></span>
            <span>Gain estimé : <Valeur>{a.gain_estime !== null ? fmtEuros(a.gain_estime) : "—"}</Valeur></span>
          </div>
        </div>

        <div style={{ flex: "0 1 170px", minWidth: 140 }}>
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Score de priorité</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
            <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 26, fontWeight: 500, color: "#0F172A" }}>{fmtNombre(a.score, 1)}</span>
            <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12, color: "#57534E" }}>/ 100</span>
          </div>
          <div role="progressbar" aria-label={`Score de priorité de ${a.titre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(a.score)}
            style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
            <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, a.score))}%`, background: "#4338CA", borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Suivi de l'action */}
      {ligne === null && peutGerer && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {peutPlanifier(a) ? (
            <button type="button" style={boutonPrimaire} disabled={occupe} onClick={() => onPlanifier(a)}>
              Planifier
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "#475569", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-info-circle" style={{ color: "#0369A1" }} aria-hidden="true" />
              Le domaine de cette recommandation doit être précisé avant de la planifier.
            </span>
          )}
        </div>
      )}

      {ligne !== null && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          {peutGerer ? (
            <>
              <label style={champ}>
                Statut
                <select aria-label={`Statut de l'action ${a.titre}`} style={selecteur} disabled={occupe} value={ligne.statut}
                  onChange={e => onModifier(ligne.id, { statut: e.target.value as StatutAction })}>
                  {STATUTS_ACTION.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label style={champ}>
                Responsable
                <input key={`${ligne.id}:${ligne.responsable ?? ""}`} type="text" aria-label={`Responsable de l'action ${a.titre}`}
                  style={{ ...selecteur, minWidth: 200 }} disabled={occupe} maxLength={120} defaultValue={ligne.responsable ?? ""}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    if (v !== (ligne.responsable ?? "")) onModifier(ligne.id, { responsable: v === "" ? null : v })
                  }} />
              </label>
              {dateModifiable && (
                <label style={champ}>
                  Date cible
                  <input type="date" aria-label={`Date cible de l'action ${a.titre}`} style={selecteur} disabled={occupe}
                    value={ligne.date_cible ?? ""}
                    onChange={e => onModifier(ligne.id, { date_cible: e.target.value === "" ? null : e.target.value })} />
                </label>
              )}
              <button type="button" style={boutonSecondaire} disabled={occupe} onClick={() => onRetirer(ligne.id)}>
                Retirer de la roadmap
              </button>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#57534E", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Statut : <strong style={{ color: "#0F172A" }}>{libelleStatut(ligne.statut)}</strong></span>
              <span>Responsable : <strong style={{ color: "#0F172A" }}>{ligne.responsable ?? "—"}</strong></span>
            </div>
          )}
        </div>
      )}

      <details style={{ marginTop: 10 }}>
        <summary style={{ fontSize: 12, color: "#3730A3", cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>
          Voir le détail du score
        </summary>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 4 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#475569" }}>
              <th scope="col" style={{ padding: "6px 8px", fontWeight: 600 }}>Critère</th>
              <th scope="col" style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Valeur (0 à 1)</th>
              <th scope="col" style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Poids</th>
              <th scope="col" style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {CRITERES.map(c => (
              <tr key={c.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                <th scope="row" style={{ padding: "6px 8px", fontWeight: 500, textAlign: "left", color: "#0F172A" }}>{c.label}</th>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><Valeur>{fmtNombre(a.detail.criteres[c.id], 2)}</Valeur></td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><Valeur>{fmtPoids(poidsDe(c.id, params))}</Valeur></td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><Valeur>{fmtNombre(a.detail.contributions[c.id], 2)}</Valeur></td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #E2E8F0" }}>
              <th scope="row" colSpan={3} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#0F172A" }}>Score de priorité</th>
              <td style={{ padding: "6px 8px", textAlign: "right" }}><Valeur>{fmtNombre(a.score, 2)}</Valeur></td>
            </tr>
          </tbody>
        </table>
      </details>
    </li>
  )
}

export default function OngletRoadmap(props: Props) {
  const { organisationId, actions, lignes, params, nbActifsScores, chargement, avertissement, erreurActions, peutGerer, planifier, modifier, retirer } = props
  const [domaine, setDomaine] = useState<"tous" | DomaineTrajectoire>("tous")
  const [occupe, setOccupe] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const index = useMemo(() => indexerLignes(lignes), [lignes])
  const visibles = useMemo(
    () => (domaine === "tous" ? actions : actions.filter(a => a.domaine === domaine)),
    [actions, domaine],
  )
  const parGroupe = useMemo(() => {
    const m = new Map<string, ActionRoadmap[]>()
    for (const g of GROUPES) m.set(g.id, [])
    for (const a of visibles) m.get(a.horizon ?? "sans_echeance")?.push(a)
    return m
  }, [visibles])

  async function executer(cle: string, operation: () => Promise<string | null>) {
    setOccupe(cle)
    setMessage(null)
    const erreur = await operation()
    if (erreur) setMessage(erreur)
    setOccupe(null)
  }

  function onPlanifier(a: ActionRoadmap) {
    const nouvelle = versNouvelleAction(a, organisationId, params, aujourdhuiISO())
    if (nouvelle === null) { setMessage("Cette action ne peut pas être planifiée : domaine ou source manquant."); return }
    void executer(a.cle, () => planifier(nouvelle))
  }

  function onModifier(cle: string, id: string, patch: PatchAction) {
    void executer(cle, () => modifier(id, patch))
  }

  function onRetirer(cle: string, id: string) {
    if (!window.confirm("Retirer cette action de la roadmap ? Elle ne sera plus suivie ; l'exigence ou la recommandation d'origine reste inchangée.")) return
    void executer(cle, () => retirer(id))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...carte, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0F172A" }}>Roadmap</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#57534E", lineHeight: 1.5 }}>
            Actions à mener, classées par horizon puis par score de priorité. Le score pondère l'obligation légale, l'échéance, la sanction,
            le gain, le coût et l'exposition climatique, et il est recalculé à chaque affichage. Planifier une action l'enregistre pour la suivre
            (statut, responsable, date cible) avec le score du moment.
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#57534E" }}>
            <Valeur>{index.size}</Valeur> action{index.size > 1 ? "s" : ""} planifiée{index.size > 1 ? "s" : ""} sur <Valeur>{actions.length}</Valeur>
          </p>
        </div>
        <label style={champ}>
          Domaine
          <select aria-label="Filtrer la roadmap par domaine" style={{ ...selecteur, minWidth: 200 }} value={domaine}
            onChange={e => setDomaine(e.target.value as "tous" | DomaineTrajectoire)}>
            <option value="tous">Tous les domaines</option>
            {DOMAINES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
      </div>

      {message && (
        <div role="alert" style={{ ...carte, padding: "12px 16px", borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B", fontSize: 13 }}>
          <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
          {message}
        </div>
      )}
      {erreurActions && (
        <div role="alert" style={{ ...carte, padding: "12px 16px", borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B", fontSize: 13 }}>
          <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
          Actions planifiées indisponibles : {erreurActions}
        </div>
      )}
      {avertissement && (
        <div role="status" style={{ ...carte, padding: "12px 16px", borderColor: "#FCD34D", display: "flex", gap: 10, alignItems: "center", color: "#92400E", fontSize: 13 }}>
          <i className="ti ti-alert-triangle" style={{ color: "#D97706" }} aria-hidden="true" />
          {avertissement}
        </div>
      )}
      {!avertissement && nbActifsScores === 0 && (
        <div role="status" style={{ ...carte, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", color: "#475569", fontSize: 13 }}>
          <i className="ti ti-info-circle" style={{ color: "#0369A1" }} aria-hidden="true" />
          Aucun actif de l'organisation n'a de score climatique validé : l'exposition compte pour 0 dans le score de priorité.
        </div>
      )}

      {chargement && actions.length === 0 ? (
        <div style={carte}>Calcul de la roadmap…</div>
      ) : visibles.length === 0 ? (
        <div style={{ ...carte, display: "flex", gap: 10, alignItems: "center", color: "#475569" }}>
          <i className="ti ti-circle-check" style={{ color: "#2F7D5C", fontSize: 20 }} aria-hidden="true" />
          {actions.length === 0
            ? "Aucune action à planifier : aucune exigence non conforme, en cours ou à évaluer, et aucune recommandation validée."
            : "Aucune action pour ce domaine."}
        </div>
      ) : (
        GROUPES.map(g => {
          const liste = parGroupe.get(g.id) ?? []
          if (liste.length === 0) return null
          return (
            <section key={g.id} aria-labelledby={`roadmap-${g.id}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 id={`roadmap-${g.id}`} style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 10, borderLeft: "3px solid #4338CA", paddingLeft: 10 }}>
                {g.label}
                <span style={{ ...badge, background: "#EEF2FF", color: "#3730A3" }}>
                  <Valeur>{liste.length}</Valeur> action{liste.length > 1 ? "s" : ""}
                </span>
              </h3>
              <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {liste.map(a => {
                  const ligne = index.get(a.cle) ?? null
                  return (
                    <CarteAction key={a.cle} a={a} params={params} ligne={ligne} peutGerer={peutGerer} occupe={occupe === a.cle}
                      onPlanifier={onPlanifier}
                      onModifier={(id, patch) => onModifier(a.cle, id, patch)}
                      onRetirer={id => onRetirer(a.cle, id)} />
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}