// src/pages/trajectoire/OngletAValider.tsx
//
// Extractions à valider. Circuit : l'extraction est proposée, l'admin_client la valide ou la rejette,
// le personnel AGE confirme (ou rejette). Le motif de rejet est facultatif.
// Saisie manuelle réservée au personnel AGE (l'analyse automatique n'est pas encore activée).

import React, { useMemo, useState } from "react"
import { DOMAINES, fmtDateFR, fmtPct, type DomaineTrajectoire, type ExigenceLigne } from "../../lib/trajectoire"
import {
  STATUTS_EXTRACTION_META, TYPES_EXTRACTION, UNITES_GAIN, actionsPossibles, analyserNombre, filtrerExtractions, fmtMontant,
  libelleTypeExtraction, type FiltreDomaine, type GainUnite, type StatutExtraction, type TypeExtraction, type VueExtraction,
} from "../../lib/trajectoireExtractions"
import type { DocumentLigne } from "./useDocuments"
import type { ExtractionLigne, NouvelleExtraction } from "./useExtractions"
import { Valeur, boutonPrimaire, boutonSecondaire, carte, selecteur } from "./ui"

interface Props {
  extractions: ExtractionLigne[]
  documents: DocumentLigne[]
  exigences: ExigenceLigne[]
  chargement: boolean
  erreur: string | null
  estAdminClient: boolean
  estPersonnelAGE: boolean
  changerStatut: (id: string, cible: StatutExtraction, motif: string | null) => Promise<string | null>
  creer: (saisie: NouvelleExtraction) => Promise<string | null>
}

type Message = { type: "ok" | "erreur"; texte: string }
type Filtre = "tous" | StatutExtraction

const FILTRES: ReadonlyArray<{ id: Filtre; label: string }> = [
  { id: "tous", label: "Toutes" },
  { id: "propose", label: "Proposées" },
  { id: "valide_client", label: "En attente de confirmation AGE" },
  { id: "valide_age", label: "Confirmées" },
  { id: "rejete", label: "Rejetées" },
]

const FILTRES_DOMAINE: ReadonlyArray<{ id: FiltreDomaine; label: string; icone: string | null }> = [
  { id: "tous", label: "Tous", icone: null },
  ...DOMAINES.map(d => ({ id: d.id as FiltreDomaine, label: d.label, icone: d.icone as string | null })),
  { id: "non_precise", label: "Non précisé", icone: "ti-help-circle" },
]

/** Pastille de filtre : même style pour le statut et le domaine. */
const pastille = (actif: boolean): React.CSSProperties => ({
  minHeight: 44, padding: "0 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
  ...(actif ? { background: "#4338CA", color: "#FFFFFF", border: "1px solid #4338CA" } : { background: "#FFFFFF", color: "#3730A3", border: "1px solid #C7D2FE" }),
})

const champ: React.CSSProperties = {
  minHeight: 44, padding: "0 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFFFFF",
  color: "#0F172A", fontSize: 13, boxSizing: "border-box",
}
const zoneTexte: React.CSSProperties = { ...champ, padding: "10px", minHeight: 88, fontFamily: "inherit", resize: "vertical" }
const etiquette: React.CSSProperties = { fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }

function PastilleExtraction({ statut }: { statut: StatutExtraction }) {
  const m = STATUTS_EXTRACTION_META[statut]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, lineHeight: 1.4, background: m.fond, color: m.texte,
    }}>
      <i className={`ti ${m.icone}`} style={{ color: m.couleur, fontSize: 14 }} aria-hidden="true" />
      {m.label}
    </span>
  )
}

function CarteExtraction(props: {
  key?: string
  e: ExtractionLigne
  vue: VueExtraction
  occupe: boolean
  onAction: (id: string, cible: StatutExtraction, motif: string | null) => void
}) {
  const { e, vue, occupe, onAction } = props
  const [rejetOuvert, setRejetOuvert] = useState(false)
  const [motif, setMotif] = useState("")
  const actions = actionsPossibles(e.statut, vue)
  const nomDocument = e.trajectoire_document?.document?.nom_fichier ?? e.trajectoire_document?.document?.nom ?? "Document"
  const domaine = DOMAINES.find(d => d.id === e.domaine)
  const aGain = e.gain_estime !== null
  const aCout = e.cout_estime !== null

  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
      <div style={{ flex: "1 1 340px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#EEF2FF", color: "#3730A3" }}>
            {libelleTypeExtraction(e.type_extraction)}
          </span>
          {domaine && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#57534E" }}>
              <i className={`ti ${domaine.icone}`} style={{ color: "#4338CA" }} aria-hidden="true" />
              {domaine.label}
            </span>
          )}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#0F172A", lineHeight: 1.5, maxWidth: "70ch", whiteSpace: "pre-wrap" }}>{e.contenu}</p>
        <div style={{ fontSize: 12, color: "#57534E", marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span><i className="ti ti-file-text" aria-hidden="true" /> {nomDocument}</span>
          {e.referentiel && <span>Exigence liée : {e.referentiel.libelle}</span>}
          {e.echeance && <span>Échéance <Valeur>{fmtDateFR(e.echeance)}</Valeur></span>}
          {aCout && <span>Coût estimé <Valeur>{fmtMontant(e.cout_estime, "eur")}</Valeur></span>}
          {aGain && <span>Gain estimé <Valeur>{fmtMontant(e.gain_estime, e.gain_unite)}</Valeur></span>}
          {e.confiance !== null && <span>Confiance <Valeur>{fmtPct(e.confiance * 100)}</Valeur></span>}
        </div>
        {(e.source_page !== null || e.source_extrait) && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, color: "#3730A3", cursor: "pointer" }}>
              Voir l'extrait source{e.source_page !== null ? ` (page ${e.source_page})` : ""}
            </summary>
            {e.source_extrait && <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: "6px 0 0", maxWidth: "70ch", whiteSpace: "pre-wrap" }}>{e.source_extrait}</p>}
          </details>
        )}
        {e.statut === "rejete" && e.commentaire_rejet && (
          <div style={{ fontSize: 12, color: "#991B1B", marginTop: 8 }}>Motif du rejet : {e.commentaire_rejet}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", flex: "0 1 300px" }}>
        <PastilleExtraction statut={e.statut} />
        {e.valide_client_le && <span style={{ fontSize: 12, color: "#57534E" }}>Validée par le client le <Valeur>{fmtDateFR(e.valide_client_le)}</Valeur></span>}
        {e.valide_age_le && <span style={{ fontSize: 12, color: "#57534E" }}>Confirmée par AGE le <Valeur>{fmtDateFR(e.valide_age_le)}</Valeur></span>}

        {vue === "lecture" && (
          <span style={{ fontSize: 12, color: "#57534E", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-lock" aria-hidden="true" />
            Validation réservée aux administrateurs de votre organisation.
          </span>
        )}

        {!rejetOuvert && actions.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {actions.map(a => (
              <button key={a.cible} type="button" disabled={occupe}
                style={a.cible === "valide_client" || a.cible === "valide_age" ? boutonPrimaire : boutonSecondaire}
                onClick={() => (a.rejet ? setRejetOuvert(true) : onAction(e.id, a.cible, null))}>
                {a.libelle}
              </button>
            ))}
          </div>
        )}

        {rejetOuvert && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <label style={etiquette}>
              Motif du rejet (facultatif)
              <textarea style={zoneTexte} value={motif} onChange={ev => setMotif(ev.target.value)} disabled={occupe} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={boutonPrimaire} disabled={occupe}
                onClick={() => { onAction(e.id, "rejete", motif); setRejetOuvert(false); setMotif("") }}>
                Confirmer le rejet
              </button>
              <button type="button" style={boutonSecondaire} disabled={occupe} onClick={() => { setRejetOuvert(false); setMotif("") }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FormulaireSaisie(props: {
  documents: DocumentLigne[]
  exigences: ExigenceLigne[]
  creer: (saisie: NouvelleExtraction) => Promise<string | null>
  onMessage: (m: Message) => void
}) {
  const { documents, exigences, creer, onMessage } = props
  const [ouvert, setOuvert] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [erreurForm, setErreurForm] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState("")
  const [type, setType] = useState<TypeExtraction>("constat")
  const [contenu, setContenu] = useState("")
  const [domaine, setDomaine] = useState<DomaineTrajectoire | "">("")
  const [referentielId, setReferentielId] = useState("")
  const [echeance, setEcheance] = useState("")
  const [cout, setCout] = useState("")
  const [gain, setGain] = useState("")
  const [unite, setUnite] = useState<GainUnite>("eur")
  const [page, setPage] = useState("")
  const [extrait, setExtrait] = useState("")

  const exigencesDistinctes = useMemo(() => {
    const vues = new Set<string>()
    return exigences.filter(x => (vues.has(x.referentiel_id) ? false : (vues.add(x.referentiel_id), true)))
  }, [exigences])

  function reinitialiser() {
    setDocumentId(""); setType("constat"); setContenu(""); setDomaine(""); setReferentielId("")
    setEcheance(""); setCout(""); setGain(""); setUnite("eur"); setPage(""); setExtrait(""); setErreurForm(null)
  }

  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault()
    setErreurForm(null)
    if (!documentId) { setErreurForm("Choisissez le document concerné."); return }
    if (contenu.trim() === "") { setErreurForm("Le contenu est obligatoire."); return }
    const c = analyserNombre(cout)
    const g = analyserNombre(gain)
    if (!c.valide) { setErreurForm("Le coût estimé doit être un nombre positif."); return }
    if (!g.valide) { setErreurForm("Le gain estimé doit être un nombre positif."); return }
    const p = page.trim() === "" ? null : Number(page)
    if (p !== null && (!Number.isInteger(p) || p < 1)) { setErreurForm("La page source doit être un nombre entier supérieur ou égal à 1."); return }

    setOccupe(true)
    const err = await creer({
      trajectoire_document_id: documentId,
      type_extraction: type,
      contenu: contenu.trim(),
      domaine: domaine === "" ? null : domaine,
      referentiel_id: referentielId === "" ? null : referentielId,
      echeance: echeance === "" ? null : echeance,
      cout_estime: c.valeur,
      gain_estime: g.valeur,
      gain_unite: g.valeur === null ? null : unite,
      source_page: p,
      source_extrait: extrait.trim() === "" ? null : extrait.trim(),
    })
    setOccupe(false)
    if (err) { setErreurForm(err); return }
    reinitialiser()
    setOuvert(false)
    onMessage({ type: "ok", texte: "Extraction enregistrée, au statut proposée." })
  }

  if (!ouvert) {
    return (
      <div>
        <button type="button" style={boutonSecondaire} onClick={() => setOuvert(true)}>Ajouter une extraction</button>
      </div>
    )
  }

  return (
    <form onSubmit={e => void enregistrer(e)} style={{ ...carte, display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Ajouter une extraction</h2>
      {documents.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          Déposez d'abord un document dans l'onglet Documents : une extraction est toujours rattachée à un document.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <label style={{ ...etiquette, flex: "1 1 260px" }}>
              Document
              <select style={selecteur} value={documentId} disabled={occupe} onChange={ev => setDocumentId(ev.target.value)}>
                <option value="">Choisir un document</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.document?.nom_fichier ?? d.document?.nom ?? "Document"}</option>)}
              </select>
            </label>
            <label style={etiquette}>
              Type
              <select style={selecteur} value={type} disabled={occupe} onChange={ev => setType(ev.target.value as TypeExtraction)}>
                {TYPES_EXTRACTION.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label style={etiquette}>
              Domaine (facultatif)
              <select style={selecteur} value={domaine} disabled={occupe} onChange={ev => setDomaine(ev.target.value as DomaineTrajectoire | "")}>
                <option value="">Non précisé</option>
                {DOMAINES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
            <label style={{ ...etiquette, flex: "1 1 260px" }}>
              Exigence liée (facultatif)
              <select style={selecteur} value={referentielId} disabled={occupe} onChange={ev => setReferentielId(ev.target.value)}>
                <option value="">Aucune</option>
                {exigencesDistinctes.map(x => <option key={x.referentiel_id} value={x.referentiel_id}>{x.referentiel.libelle}</option>)}
              </select>
            </label>
          </div>

          <label style={etiquette}>
            Contenu
            <textarea style={zoneTexte} value={contenu} disabled={occupe} onChange={ev => setContenu(ev.target.value)} />
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <label style={etiquette}>
              Échéance (facultatif)
              <input type="date" style={champ} value={echeance} disabled={occupe} onChange={ev => setEcheance(ev.target.value)} />
            </label>
            <label style={etiquette}>
              Coût estimé en € (facultatif)
              <input type="text" inputMode="decimal" style={{ ...champ, width: 160 }} value={cout} disabled={occupe} onChange={ev => setCout(ev.target.value)} />
            </label>
            <label style={etiquette}>
              Gain estimé (facultatif)
              <input type="text" inputMode="decimal" style={{ ...champ, width: 160 }} value={gain} disabled={occupe} onChange={ev => setGain(ev.target.value)} />
            </label>
            <label style={etiquette}>
              Unité du gain
              <select style={selecteur} value={unite} disabled={occupe} onChange={ev => setUnite(ev.target.value as GainUnite)}>
                {UNITES_GAIN.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </label>
            <label style={etiquette}>
              Page source (facultatif)
              <input type="text" inputMode="numeric" style={{ ...champ, width: 120 }} value={page} disabled={occupe} onChange={ev => setPage(ev.target.value)} />
            </label>
          </div>

          <label style={etiquette}>
            Extrait source (facultatif)
            <textarea style={zoneTexte} value={extrait} disabled={occupe} onChange={ev => setExtrait(ev.target.value)} />
          </label>

          {erreurForm && (
            <div role="alert" style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, background: "#FEE2E2", color: "#991B1B" }}>
              <i className="ti ti-alert-octagon" aria-hidden="true" />
              {erreurForm}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" style={boutonPrimaire} disabled={occupe}>{occupe ? "Enregistrement…" : "Enregistrer l'extraction"}</button>
            <button type="button" style={boutonSecondaire} disabled={occupe} onClick={() => { reinitialiser(); setOuvert(false) }}>Annuler</button>
          </div>
        </>
      )}
    </form>
  )
}

export default function OngletAValider(props: Props) {
  const { extractions, documents, exigences, chargement, erreur, estAdminClient, estPersonnelAGE, changerStatut, creer } = props
    const [filtre, setFiltre] = useState<Filtre>("tous")
  const [filtreDomaine, setFiltreDomaine] = useState<FiltreDomaine>("tous")
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const vue: VueExtraction = estPersonnelAGE ? "personnel" : estAdminClient ? "admin_client" : "lecture"

    // Chaque compteur indique le résultat d'un clic, l'autre filtre restant actif.
  const compte = (f: Filtre) => filtrerExtractions(extractions, f, filtreDomaine).length
  const compteDomaine = (d: FiltreDomaine) => filtrerExtractions(extractions, filtre, d).length
  const visibles = filtrerExtractions(extractions, filtre, filtreDomaine)

  async function appliquer(id: string, cible: StatutExtraction, motif: string | null) {
    setOccupe(true)
    setMessage(null)
    const err = await changerStatut(id, cible, motif)
    setOccupe(false)
    if (err) setMessage({ type: "erreur", texte: err })
  }

  return (
    <section aria-label="Extractions à valider" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {estPersonnelAGE && <FormulaireSaisie documents={documents} exigences={exigences} creer={creer} onMessage={setMessage} />}

      {message && (
        <div role={message.type === "erreur" ? "alert" : "status"}
          style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
            background: message.type === "erreur" ? "#FEE2E2" : "#DCFCE7", color: message.type === "erreur" ? "#991B1B" : "#166534" }}>
          <i className={`ti ${message.type === "erreur" ? "ti-alert-octagon" : "ti-circle-check"}`} aria-hidden="true" />
          {message.texte}
        </div>
      )}

      {erreur && (
        <div role="alert" style={{ ...carte, borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B" }}>
          <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
          Impossible de charger les extractions : {erreur}
        </div>
      )}

      {!erreur && chargement && extractions.length === 0 && <div style={carte}>Chargement des extractions…</div>}

      {!erreur && !chargement && extractions.length === 0 && (
        <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Aucune extraction pour le moment</div>
          <p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: "70ch", lineHeight: 1.5 }}>
            {estPersonnelAGE
              ? "Ajoutez une extraction avec le bouton ci-dessus : constat, écart, recommandation, échéance ou certification relevés dans un document."
              : "Les constats, écarts et recommandations relevés dans vos documents apparaîtront ici, à valider."}
          </p>
        </div>
      )}

      {extractions.length > 0 && (
        <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Statut</span>
              <div role="group" aria-label="Filtrer par statut" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FILTRES.map(f => (
                  <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)} style={pastille(filtre === f.id)}>
                    {f.label} ({compte(f.id)})
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Domaine</span>
              <div role="group" aria-label="Filtrer par domaine" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FILTRES_DOMAINE.map(d => (
                  <button key={d.id} type="button" aria-pressed={filtreDomaine === d.id} onClick={() => setFiltreDomaine(d.id)} style={pastille(filtreDomaine === d.id)}>
                    {d.icone && <i className={`ti ${d.icone}`} aria-hidden="true" />}
                    {d.label} ({compteDomaine(d.id)})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 10 }}>
            {visibles.length === 0 && <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>Aucune extraction pour ces filtres.</p>}
            {visibles.map(e => <CarteExtraction key={e.id} e={e} vue={vue} occupe={occupe} onAction={(id, cible, motif) => void appliquer(id, cible, motif)} />)}
          </div>
        </>
      )}
    </section>
  )
}