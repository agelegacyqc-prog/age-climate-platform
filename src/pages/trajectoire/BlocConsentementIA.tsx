// src/pages/trajectoire/BlocConsentementIA.tsx
//
// Consentement à l'analyse automatique des documents par un service d'IA.
// Seul admin_client de l'organisation peut le donner ou le retirer ; les autres comptes voient l'état.

import React, { useState } from "react"
import { fmtDateFR } from "../../lib/trajectoire"
import { TEXTE_CONSENTEMENT } from "../../lib/trajectoireIA"
import type { ConsentementIA } from "./useConsentementIA"
import { Valeur, boutonPrimaire, boutonSecondaire, carte } from "./ui"

interface Props {
  consentement: ConsentementIA | null
  chargement: boolean
  erreur: string | null
  estAdminClient: boolean
  donner: () => Promise<string | null>
  retirer: () => Promise<string | null>
  onMessage: (m: { type: "ok" | "erreur"; texte: string }) => void
}

export default function BlocConsentementIA(props: Props) {
  const { consentement, chargement, erreur, estAdminClient, donner, retirer, onMessage } = props
  const [coche, setCoche] = useState(false)
  const [occupe, setOccupe] = useState(false)

  async function lancerConsentement() {
    setOccupe(true)
    const err = await donner()
    setOccupe(false)
    if (err) onMessage({ type: "erreur", texte: err })
    else {
      setCoche(false)
      onMessage({ type: "ok", texte: "Analyse automatique activée. Les documents en attente vont être analysés." })
    }
  }

  async function lancerRetrait() {
    if (!window.confirm("Retirer votre consentement ? Les documents déposés ensuite ne seront plus analysés.")) return
    setOccupe(true)
    const err = await retirer()
    setOccupe(false)
    if (err) onMessage({ type: "erreur", texte: err })
    else onMessage({ type: "ok", texte: "Consentement retiré. Les documents déposés ensuite ne seront plus analysés." })
  }

  if (erreur) {
    return (
      <div role="alert" style={{ ...carte, borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B" }}>
        <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
        Impossible de lire l'état de l'analyse automatique : {erreur}
      </div>
    )
  }

  if (chargement && !consentement) return <div style={carte}>Chargement de l'état de l'analyse automatique…</div>

  if (consentement) {
    return (
      <div style={{ ...carte, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#DCFCE7", color: "#166534" }}>
            <i className="ti ti-circle-check" style={{ color: "#2F7D5C", fontSize: 14 }} aria-hidden="true" />
            Analyse automatique activée
          </span>
          <span style={{ fontSize: 12, color: "#57534E" }}>
            Consentement donné le <Valeur>{fmtDateFR(consentement.consenti_le)}</Valeur>. Seuls les fichiers PDF sont analysés pour le moment.
          </span>
        </div>
        {estAdminClient && (
          <button type="button" style={boutonSecondaire} disabled={occupe} onClick={() => void lancerRetrait()}>
            Retirer mon consentement
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#FEF3C7", color: "#92400E" }}>
          <i className="ti ti-alert-triangle" style={{ color: "#D97706", fontSize: 14 }} aria-hidden="true" />
          Analyse automatique non activée
        </span>
        <span style={{ fontSize: 12, color: "#57534E" }}>Vos documents ne sont pas transmis au service d'IA.</span>
      </div>

      {estAdminClient ? (
        <>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{TEXTE_CONSENTEMENT.titre}</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.5, maxWidth: "70ch" }}>{TEXTE_CONSENTEMENT.introduction}</p>
          {TEXTE_CONSENTEMENT.paragraphes.map(p => (
            <p key={p.titre} style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.5, maxWidth: "70ch" }}>
              <strong>{p.titre}</strong> {p.texte}
            </p>
          ))}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#0F172A", minHeight: 44, cursor: "pointer" }}>
            <input type="checkbox" checked={coche} disabled={occupe} onChange={e => setCoche(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 1, accentColor: "#4338CA", flexShrink: 0 }} />
            <span>{TEXTE_CONSENTEMENT.caseACocher}</span>
          </label>
          <div>
            <button type="button" style={{ ...boutonPrimaire, opacity: coche ? 1 : 0.5 }} disabled={!coche || occupe} onClick={() => void lancerConsentement()}>
              {occupe ? "Enregistrement…" : "Activer l'analyse automatique"}
            </button>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5, maxWidth: "70ch" }}>
          Seul un administrateur de l'organisation peut activer l'analyse automatique des documents.
        </p>
      )}
    </div>
  )
}