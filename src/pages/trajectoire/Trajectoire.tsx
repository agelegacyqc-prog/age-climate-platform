// src/pages/trajectoire/Trajectoire.tsx
//
// Module Trajectoire : page principale (onglets, sélecteur d'organisation pour le personnel AGE,
// maturité globale et par domaine). Couleur du module : #4338CA.
// Route : /trajectoire (accessible aux clients rattachés à une organisation et au personnel AGE).

import React, { useMemo, useState } from "react"
import { DOMAINES, fmtPct, maturite } from "../../lib/trajectoire"
import OngletDocuments from "./OngletDocuments"
import OngletAValider from "./OngletAValider"
import OngletMatrice from "./OngletMatrice"
import OngletRoadmap from "./OngletRoadmap"
import { useDocuments } from "./useDocuments"
import { useConsentementIA } from "./useConsentementIA"
import { useExigences } from "./useExigences"
import { useExtractions } from "./useExtractions"
import { useRoadmap } from "./useRoadmap"
import { useTrajectoireContexte } from "./useTrajectoireContexte"
import { Valeur, carte, selecteur } from "./ui"

type OngletId = "documents" | "matrice" | "avalider" | "roadmap"

const ONGLETS: ReadonlyArray<{ id: OngletId; label: string }> = [
  { id: "documents", label: "Documents" },
  { id: "matrice", label: "Matrice" },
  { id: "avalider", label: "À valider" },
  { id: "roadmap", label: "Roadmap" },
]

export default function Trajectoire() {
  const ctx = useTrajectoireContexte()
  const exig = useExigences(ctx.organisationId)
  const docs = useDocuments(ctx.organisationId, ctx.userId, ctx.mode)
    const extr = useExtractions(ctx.organisationId)
  const roadmap = useRoadmap(ctx.organisationId, exig.exigences, extr.extractions)
  const consent = useConsentementIA(ctx.organisationId)
  const [onglet, setOnglet] = useState<OngletId>("matrice")

  const kpis = useMemo(() => [
    { id: "global", label: "Maturité globale", icone: "ti-route", m: maturite(exig.exigences) },
    ...DOMAINES.map(d => ({ id: d.id, label: d.label, icone: d.icone, m: maturite(exig.exigences.filter(l => l.referentiel.domaine === d.id)) })),
  ], [exig.exigences])

  if (ctx.chargement) return <div style={{ padding: 32 }}>Chargement…</div>
  if (ctx.erreur) {
    return (
      <div role="alert" style={{ ...carte, margin: 32, borderColor: "#FCA5A5", display: "flex", gap: 10, alignItems: "center", color: "#991B1B" }}>
        <i className="ti ti-alert-octagon" style={{ color: "#B91C1C" }} aria-hidden="true" />
        {ctx.erreur}
      </div>
    )
  }

  const organisation = ctx.organisations.find(o => o.id === ctx.organisationId)

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 16px 48px", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ ...carte, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: "50%", background: "#EEF2FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-route" style={{ color: "#4338CA", fontSize: 24 }} aria-hidden="true" />
        </span>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0F172A" }}>Trajectoire</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#57534E", lineHeight: 1.5 }}>
            {organisation ? <strong style={{ color: "#0F172A" }}>{organisation.raison_sociale}</strong> : "Aucune organisation"}
            {". "}Votre stratégie d'action sur l'énergie, l'environnement et l'IT, avec le suivi de votre conformité réglementaire et volontaire.
          </p>
        </div>
        {ctx.estPersonnelAGE && ctx.organisations.length > 0 && (
          <label style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
            Organisation
            <select aria-label="Organisation" style={{ ...selecteur, minWidth: 220 }} value={ctx.organisationId ?? ""}
              onChange={e => ctx.choisirOrganisation(e.target.value)}>
              {ctx.organisations.map(o => <option key={o.id} value={o.id}>{o.raison_sociale}</option>)}
            </select>
          </label>
        )}
      </header>

      {ctx.estPersonnelAGE && ctx.organisations.length === 0 ? (
        <div style={carte}>Aucune organisation ne vous est affectée pour le moment.</div>
      ) : (
        <>
          <section aria-label="Maturité par domaine" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
              {kpis.map(k => (
                <div key={k.id} style={{ ...carte, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className={`ti ${k.icone}`} style={{ color: "#4338CA", fontSize: 18 }} aria-hidden="true" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{k.label}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 26, fontWeight: 500, color: "#0F172A" }}>{fmtPct(k.m.pct)}</span>
                  <div role="progressbar" aria-label={`Maturité ${k.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(k.m.pct)}
                    style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${k.m.pct}%`, background: "#4338CA", borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#57534E" }}><Valeur>{k.m.conformes}</Valeur> conformes validées sur <Valeur>{k.m.applicables}</Valeur> applicables</span>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#57534E", lineHeight: 1.5 }}>
              Maturité = exigences conformes, validées par le client puis confirmées par AGE, rapportées aux exigences applicables.
            </p>
          </section>

          <div role="tablist" aria-label="Sections de Trajectoire" style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid #E2E8F0" }}>
            {ONGLETS.map(o => (
              <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} onClick={() => { setOnglet(o.id); if (o.id === "avalider") void extr.recharger() }}
                style={{
                  minHeight: 44, padding: "0 16px", border: 0, background: "transparent", cursor: "pointer", fontSize: 14, marginBottom: -1,
                  borderBottom: `2px solid ${onglet === o.id ? "#4338CA" : "transparent"}`,
                  fontWeight: onglet === o.id ? 700 : 500, color: onglet === o.id ? "#3730A3" : "#475569",
                }}>
                {o.label}
              </button>
            ))}
          </div>

          {onglet === "documents" && (
            <OngletDocuments
              documents={docs.documents}
              chargement={docs.chargement}
              erreur={docs.erreur}
              estAdminClient={ctx.estAdminClient}
              estPersonnelAGE={ctx.estPersonnelAGE}
              deposer={docs.deposer}
              ouvrir={docs.ouvrir}
              archiver={docs.archiver}
              relancer={docs.relancer}
              consentement={consent.consentement}
              consentementChargement={consent.chargement}
              consentementErreur={consent.erreur}
              donnerConsentement={async () => {
                const err = await consent.donner()
                if (!err) docs.surveiller(60_000)
                return err
              }}
              retirerConsentement={consent.retirer}
            />
          )}

          {onglet === "matrice" && (
            <OngletMatrice
              exigences={exig.exigences}
              chargement={exig.chargement}
              erreur={exig.erreur}
              estAdminClient={ctx.estAdminClient}
              estPersonnelAGE={ctx.estPersonnelAGE}
              modifier={exig.modifier}
              initialiser={exig.initialiser}
            />
          )}

          {onglet === "avalider" && (
            <OngletAValider
              extractions={extr.extractions}
              documents={docs.documents}
              exigences={exig.exigences}
              chargement={extr.chargement}
              erreur={extr.erreur}
              estAdminClient={ctx.estAdminClient}
              estPersonnelAGE={ctx.estPersonnelAGE}
              changerStatut={extr.changerStatut}
                    creer={extr.creer}
            />
          )}

          {onglet === "roadmap" && (
            <OngletRoadmap
              actions={roadmap.actions}
              params={roadmap.params}
              nbActifsScores={roadmap.nbActifsScores}
              chargement={roadmap.chargement || exig.chargement || extr.chargement}
              avertissement={roadmap.avertissement}
            />
          )}
        </>
      )}
    </div>
  )
}