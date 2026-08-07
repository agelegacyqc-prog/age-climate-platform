// src/components/ScoreRepartitionBar.tsx
//
// Histogramme (barres verticales) de répartition des 3 niveaux de score d'un actif :
// Géorisques, Risque réglementaire, Climatique AGE (après mission).
// Variante de ScoreRepartitionPie.tsx — même interface de props, même palette.
// Utilisé uniquement dans FicheActif.tsx (espace client). Ne pas propager à
// FicheBien.tsx / MesActifs.tsx qui conservent le camembert.

import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"

interface ScoreRepartitionBarProps {
  scoreGeorisques: number             // 0-100
  scoreReglementaire: number          // 0-100
  scoreClimatiqueAge: number | null   // 0-100 — null si aucune mission réalisée
}

const COULEURS = {
  georisques:    "#0369A1", // Sky — information
  reglementaire: "#7C3AED", // Violet
  climatiqueAge: "#B91C1C", // Crimson
}

export default function ScoreRepartitionBar({ scoreGeorisques, scoreReglementaire, scoreClimatiqueAge }: ScoreRepartitionBarProps) {
  const data = [
    { name: "Géorisques",               value: scoreGeorisques,        color: COULEURS.georisques },
    { name: "Risque réglementaire",     value: scoreReglementaire,     color: COULEURS.reglementaire },
    { name: "Climatique AGE (mission)", value: scoreClimatiqueAge ?? 0, color: COULEURS.climatiqueAge },
  ]

  const aucuneDonnee = data.every(d => d.value === 0)

  if (aucuneDonnee) {
    return (
      <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" as const, padding: "24px 0" }}>
        Aucune donnée de score disponible pour la répartition.
      </div>
    )
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#0F172A" }}
            interval={0}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip formatter={(value: number, _name: string, item: any) => [`${value} / 100`, item?.payload?.name]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => `${v}/100`}
              style={{ fontSize: 11, fontWeight: 600, fill: "#0F172A" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {scoreClimatiqueAge === null && (
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center" as const, marginTop: 4 }}>
          Score climatique AGE non disponible (aucune mission réalisée)
        </div>
      )}
    </div>
  )
}