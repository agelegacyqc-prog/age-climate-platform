// src/pages/trajectoire/AccueilTrajectoire.tsx
//
// Point 6 : bloc KPI Trajectoire de l'Accueil client (variante A2, anneaux).
// Quatre anneaux : maturité globale, Énergie, Environnement, IT. Chaque anneau est découpé par statut ;
// la maturité (conformes validées / applicables) est au centre. Sélecteur d'actif (défaut : Tous les actifs).
// Exécution : côté client (affichage). Référence d'audit : triggers de la base.
// Réservé aux comptes client ; ne rend rien pour le personnel AGE ou sans organisation.

import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { DOMAINES, fmtPct } from "../../lib/trajectoire"
import { compterAnneau } from "../../lib/trajectoireAccueil"
import type { CleStatutAnneau, ComptageAnneau } from "../../lib/trajectoireAccueil"
import { useExigences } from "./useExigences"
import { useTrajectoireContexte } from "./useTrajectoireContexte"

const COULEUR_MODULE = "#4338CA"

/** Ordre et habillage des statuts (couleurs du socle, toujours doublées d'une icône). */
const STATUTS: ReadonlyArray<{ cle: CleStatutAnneau; label: string; couleur: string; icone: string }> = [
  { cle: "conformes",     label: "Conformes validées",          couleur: "#2F7D5C", icone: "ti-circle-check" },
  { cle: "attente_age",   label: "Confirmation AGE attendue",   couleur: "#D97706", icone: "ti-alert-triangle" },
  { cle: "en_cours",      label: "En cours",                    couleur: "#0369A1", icone: "ti-info-circle" },
  { cle: "non_conformes", label: "Non conformes",               couleur: "#B91C1C", icone: "ti-alert-octagon" },
  { cle: "a_evaluer",     label: "À évaluer",                   couleur: "#64748B", icone: "ti-circle-dotted" },
]

const RAYON = 62
const EPAISSEUR = 12
const TAILLE = 160
const CIRCONFERENCE = 2 * Math.PI * RAYON

interface ActifOption { actif_id: string; nom: string }

interface AnneauProps extends React.Attributes {
  titre: string
  icone: string | null
  comptage: ComptageAnneau
}

function Anneau({ titre, icone, comptage }: AnneauProps) {
  // Segments consécutifs : stroke-dasharray + décalage cumulé, départ à 12 h.
  let cumul = 0
  const segments = STATUTS.map(s => {
    const n = comptage[s.cle]
    const longueur = comptage.applicables === 0 ? 0 : (n / comptage.applicables) * CIRCONFERENCE
    const seg = { ...s, n, longueur, decalage: cumul }
    cumul += longueur
    return seg
  })
  const resume = `${titre} : maturité ${fmtPct(comptage.pct)}, ${comptage.conformes} conforme(s) validée(s) sur ${comptage.applicables} applicable(s)`

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#1F2937" }}>
        {icone && <i className={`ti ${icone}`} style={{ fontSize: 18, color: COULEUR_MODULE }} aria-hidden="true" />}
        {titre}
      </div>

      <div style={{ position: "relative", width: TAILLE, height: TAILLE }}>
        <svg width={TAILLE} height={TAILLE} viewBox={`0 0 ${TAILLE} ${TAILLE}`} role="img" aria-label={resume}>
          <circle cx={TAILLE / 2} cy={TAILLE / 2} r={RAYON} fill="none" stroke="#E5E1DA" strokeWidth={EPAISSEUR} />
          <g transform={`rotate(-90 ${TAILLE / 2} ${TAILLE / 2})`}>
            {segments.filter(s => s.longueur > 0).map(s => (
              <circle
                key={s.cle}
                cx={TAILLE / 2} cy={TAILLE / 2} r={RAYON}
                fill="none" stroke={s.couleur} strokeWidth={EPAISSEUR}
                strokeDasharray={`${s.longueur} ${CIRCONFERENCE - s.longueur}`}
                strokeDashoffset={-s.decalage}
              />
            ))}
          </g>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: "#1F2937" }}>{fmtPct(comptage.pct)}</span>
          <span style={{ fontSize: 11, color: "#78716C" }}>maturité</span>
        </div>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
        {segments.map(s => (
          <li key={s.cle} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: s.n === 0 ? 0.45 : 1, color: "#1F2937" }}>
            <i className={`ti ${s.icone}`} style={{ fontSize: 16, color: s.couleur }} aria-hidden="true" />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{s.n}</span>
          </li>
        ))}
      </ul>

      <div style={{ fontSize: 12, color: "#78716C", textAlign: "center" }}>
        {comptage.conformes} conforme(s) validée(s) sur {comptage.applicables} applicables
      </div>
    </div>
  )
}

export default function AccueilTrajectoire() {
  const navigate = useNavigate()
  const ctx = useTrajectoireContexte()
  const { exigences, chargement, erreur } = useExigences(ctx.mode === "client" ? ctx.organisationId : null)
  const [actifs, setActifs] = useState<ActifOption[]>([])
  const [actifId, setActifId] = useState<string | null>(null)

  useEffect(() => {
    if (ctx.mode !== "client" || !ctx.organisationId) return
    let annule = false
    void (async () => {
      const { data } = await supabase.rpc("trajectoire_actifs_organisation", { org: ctx.organisationId })
      if (!annule) setActifs(((data ?? []) as ActifOption[]))
    })()
    return () => { annule = true }
  }, [ctx.mode, ctx.organisationId])

  const comptages = useMemo(() => ({
    global: compterAnneau(exigences, null, actifId),
    parDomaine: DOMAINES.map(d => ({ ...d, comptage: compterAnneau(exigences, d.id, actifId) })),
  }), [exigences, actifId])

  // Réservé aux comptes client rattachés à une organisation.
  if (ctx.chargement || ctx.mode !== "client" || erreur) return null

  const aucuneExigence = !chargement && exigences.length === 0

  return (
    <section aria-labelledby="titre-trajectoire" style={{ background: "#FFFFFF", border: "1px solid #E5E1DA", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <i className="ti ti-route" style={{ fontSize: 20, color: COULEUR_MODULE }} aria-hidden="true" />
        <h2 id="titre-trajectoire" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1F2937", flex: 1 }}>Trajectoire</h2>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#78716C" }}>
          Actif
          <select
            value={actifId ?? ""}
            onChange={e => setActifId(e.target.value === "" ? null : e.target.value)}
            style={{ border: "1px solid #E5E1DA", borderRadius: 8, padding: "8px 12px", fontSize: 13, background: "#FFFFFF", color: "#1F2937", minHeight: 44 }}
          >
            <option value="">Tous les actifs</option>
            {actifs.map(a => <option key={a.actif_id} value={a.actif_id}>{a.nom}</option>)}
          </select>
        </label>

        <button
          type="button"
          onClick={() => navigate("/trajectoire")}
          style={{ background: COULEUR_MODULE, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "12px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}
        >
          Ouvrir Trajectoire
        </button>
      </div>

      {chargement ? (
        <div style={{ fontSize: 13, color: "#78716C" }}>Chargement…</div>
      ) : aucuneExigence ? (
        <div style={{ fontSize: 13, color: "#78716C" }}>
          Aucune exigence initialisée pour cette organisation. Votre consultant AGE les crée depuis la Matrice de Trajectoire.
        </div>
      ) : (
        <div
          onClick={() => navigate("/trajectoire")}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, cursor: "pointer" }}
        >
          <Anneau titre="Maturité globale" icone={null} comptage={comptages.global} />
          {comptages.parDomaine.map(d => (
                       <div key={d.id}><Anneau titre={d.label} icone={d.icone} comptage={d.comptage} /></div>
          ))}
        </div>
      )}
    </section>
  )
}