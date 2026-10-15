// src/pages/trajectoire/OngletDocuments.tsx
//
// Documents de l'organisation : dépôt (audits, diagnostics, normes, études) et liste.
// Droits : tout compte rattaché à l'organisation (admin_client, utilisateur_client, personnel AGE)
// dépose et ouvre ; l'archivage est proposé à admin_client et au personnel AGE.
// L'analyse automatique n'est pas encore activée : les documents restent au statut « Déposé ».

import React, { useState } from "react"
import { aujourdhuiISO, fmtDateFR } from "../../lib/trajectoire"
import {
  STATUTS_ANALYSE_META, TYPES_DOCUMENT, erreurFichier, fmtTaille, libelleTypeDocument,
  type StatutAnalyse, type TypeDocument,
} from "../../lib/trajectoireDocuments"
import type { DepotDocument, DocumentLigne } from "./useDocuments"
import { Valeur, boutonPrimaire, boutonSecondaire, carte, selecteur } from "./ui"

interface Props {
  documents: DocumentLigne[]
  chargement: boolean
  erreur: string | null
  estAdminClient: boolean
  estPersonnelAGE: boolean
  deposer: (depot: DepotDocument) => Promise<string | null>
  ouvrir: (ligne: DocumentLigne) => Promise<string | null>
  archiver: (id: string) => Promise<string | null>
}

type Message = { type: "ok" | "erreur"; texte: string }

const champ: React.CSSProperties = {
  minHeight: 44, padding: "0 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFFFFF",
  color: "#0F172A", fontSize: 13, boxSizing: "border-box",
}

function PastilleAnalyse({ statut }: { statut: StatutAnalyse }) {
  const m = STATUTS_ANALYSE_META[statut]
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

export default function OngletDocuments(props: Props) {
  const { documents, chargement, erreur, estAdminClient, estPersonnelAGE, deposer, ouvrir, archiver } = props
  const [fichier, setFichier] = useState<File | null>(null)
  const [cleFichier, setCleFichier] = useState(0)
  const [typeDocument, setTypeDocument] = useState<TypeDocument>("audit")
  const [dateDocument, setDateDocument] = useState("")
  const [dateValidite, setDateValidite] = useState("")
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const aujourdhui = aujourdhuiISO()
  const peutArchiver = estAdminClient || estPersonnelAGE

  async function lancerDepot(ev: React.FormEvent) {
    ev.preventDefault()
    setMessage(null)
    if (!fichier) { setMessage({ type: "erreur", texte: "Choisissez un fichier à déposer." }); return }
    const refus = erreurFichier(fichier)
    if (refus) { setMessage({ type: "erreur", texte: refus }); return }
    setOccupe(true)
    const err = await deposer({
      fichier,
      type_document: typeDocument,
      date_document: dateDocument || null,
      date_validite: dateValidite || null,
    })
    setOccupe(false)
    if (err) { setMessage({ type: "erreur", texte: err }); return }
    setFichier(null)
    setCleFichier(k => k + 1)
    setDateDocument("")
    setDateValidite("")
    setMessage({ type: "ok", texte: "Document déposé." })
  }

  async function lancerOuverture(l: DocumentLigne) {
    setMessage(null)
    const err = await ouvrir(l)
    if (err) setMessage({ type: "erreur", texte: err })
  }

  async function lancerArchivage(l: DocumentLigne) {
    if (!window.confirm("Archiver ce document ? Il ne sera plus affiché dans la liste.")) return
    setOccupe(true)
    setMessage(null)
    const err = await archiver(l.id)
    setOccupe(false)
    if (err) setMessage({ type: "erreur", texte: err })
    else setMessage({ type: "ok", texte: "Document archivé." })
  }

  return (
    <section aria-label="Documents" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form onSubmit={e => void lancerDepot(e)} style={{ ...carte, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Déposer un document</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#57534E", lineHeight: 1.5, maxWidth: "70ch" }}>
          Audits, diagnostics, normes et études. Formats acceptés : PDF, Word (.doc, .docx) et Excel (.xls, .xlsx), 50 Mo maximum.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4, flex: "1 1 260px" }}>
            Fichier
            <input key={cleFichier} type="file" disabled={occupe}
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={e => setFichier(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null)}
              style={{ ...champ, padding: "9px 10px" }} />
          </label>
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
            Type de document
            <select style={selecteur} disabled={occupe} value={typeDocument} onChange={e => setTypeDocument(e.target.value as TypeDocument)}>
              {TYPES_DOCUMENT.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
            Date du document (facultatif)
            <input type="date" style={champ} disabled={occupe} value={dateDocument} onChange={e => setDateDocument(e.target.value)} />
          </label>
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
            Date de validité (facultatif)
            <input type="date" style={champ} disabled={occupe} value={dateValidite} onChange={e => setDateValidite(e.target.value)} />
          </label>
          <button type="submit" style={boutonPrimaire} disabled={occupe}>
            {occupe ? "Dépôt en cours…" : "Déposer le document"}
          </button>
        </div>
      </form>

      {message && (
        <div role={message.type === "erreur" ? "alert" : "status"}
          style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
            background: message.type === "erreur" ? "#FEE2E2" : "#DCFCE7", color: message.type === "erreur" ? "#991B1B" : "#166534" }}>
          <i className={`ti ${message.type === "erreur" ? "ti-alert-octagon" : "ti-circle-check"}`} aria-hidden="true" />
          {message.texte}
        </div>
      )}

      <div role="note" style={{ fontSize: 12, padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, background: "#E0F2FE", color: "#075985" }}>
        <i className="ti ti-info-circle" style={{ color: "#0369A1" }} aria-hidden="true" />
        L'analyse automatique n'est pas encore activée : les documents restent au statut « Déposé ».
      </div>

      {erreur && (
        <div role="alert" style={{ ...carte, borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B" }}>
          <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
          Impossible de charger les documents : {erreur}
        </div>
      )}

      {!erreur && chargement && documents.length === 0 && <div style={carte}>Chargement des documents…</div>}

      {!erreur && !chargement && documents.length === 0 && (
        <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Aucun document déposé</div>
          <p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: "70ch", lineHeight: 1.5 }}>
            Déposez votre premier audit, diagnostic, norme ou étude avec le formulaire ci-dessus.
          </p>
        </div>
      )}

      {documents.length > 0 && (
        <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Documents déposés</h2>
          {documents.map(l => {
            const expire = l.date_validite !== null && l.date_validite < aujourdhui
            const nom = l.document?.nom_fichier ?? l.document?.nom ?? "Document"
            return (
              <div key={l.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <i className="ti ti-file-text" style={{ color: "#4338CA", fontSize: 18 }} aria-hidden="true" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", overflowWrap: "anywhere" }}>{nom}</span>
                    <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#EEF2FF", color: "#3730A3" }}>
                      {libelleTypeDocument(l.type_document)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#57534E", marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <span>Déposé le <Valeur>{fmtDateFR(l.created_at)}</Valeur></span>
                    <span>Taille <Valeur>{fmtTaille(l.document?.taille_octets ?? null)}</Valeur></span>
                    {l.date_document && <span>Date du document <Valeur>{fmtDateFR(l.date_document)}</Valeur></span>}
                    {l.date_validite && <span>Valide jusqu'au <Valeur>{fmtDateFR(l.date_validite)}</Valeur></span>}
                    {expire && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "#FEE2E2", color: "#991B1B", fontWeight: 600 }}>
                        <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
                        Expiré
                      </span>
                    )}
                  </div>
                  {l.erreur && <div style={{ fontSize: 12, color: "#991B1B", marginTop: 6 }}>{l.erreur}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", flex: "0 1 220px" }}>
                  <PastilleAnalyse statut={l.statut_analyse} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={boutonSecondaire} onClick={() => void lancerOuverture(l)}>Ouvrir</button>
                    {peutArchiver && (
                      <button type="button" style={boutonSecondaire} disabled={occupe} onClick={() => void lancerArchivage(l)}>Archiver</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}