// src/pages/trajectoire/ui.tsx
// Éléments d'interface communs au module Trajectoire. Couleur du module : #4338CA. Icônes Tabler (ti-*).

import React from "react"
import { STATUTS_META, type StatutAffiche } from "../../lib/trajectoire"

export const COULEUR_MODULE = "#4338CA"

export const carte: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24,
}

export const boutonPrimaire: React.CSSProperties = {
  minHeight: 44, padding: "0 16px", border: 0, borderRadius: 8, background: COULEUR_MODULE,
  color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer",
}

export const boutonSecondaire: React.CSSProperties = {
  minHeight: 44, padding: "0 16px", border: "1px solid #C7D2FE", borderRadius: 8, background: "#FFFFFF",
  color: "#3730A3", fontSize: 13, fontWeight: 600, cursor: "pointer",
}

export const selecteur: React.CSSProperties = {
  minHeight: 44, padding: "0 10px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#FFFFFF",
  color: "#0F172A", fontSize: 13,
}

/** Pastille de statut : couleur toujours doublée d'une icône (accessibilité daltonisme). */
export function PastilleStatut({ statut }: { statut: StatutAffiche }) {
  const m = STATUTS_META[statut]
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

export function Valeur({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#0F172A" }}>{children}</span>
}