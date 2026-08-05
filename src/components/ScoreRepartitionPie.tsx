// src/components/ScoreRepartitionPie.tsx
//
// Camembert de répartition des 3 niveaux de score d'un actif :
// Géorisques, Risque réglementaire, Climatique AGE (après mission).
// Utilisé dans FicheBien.tsx (consultant) et FicheActif.tsx (client),
// section "Informations du site".

import React from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ScoreRepartitionPieProps {
  scoreGeorisques: number       // 0-100, cf. formule (zone_rga?50:0)+(zone_ppri?50:0)
  scoreReglementaire: number    // 0-100, actif.score_reglementaire
  scoreClimatiqueAge: number | null  // 0-100, risk_scores.score_global (dernier prediagnostic généré) — null si aucune mission réalisée
}

const COULEURS = {
  georisques:   "#0369A1", // Sky — information
  reglementaire:"#7C3AED", // Violet
  climatiqueAge:"#B91C1C", // Crimson
}

export default function ScoreRepartitionPie({ scoreGeorisques, scoreReglementaire, scoreClimatiqueAge }: ScoreRepartitionPieProps) {
  const data = [
    { name: "Géorisques",              value: scoreGeorisques,             color: COULEURS.georisques },
    { name: "Risque réglementaire",    value: scoreReglementaire,          color: COULEURS.reglementaire },
    { name: "Climatique AGE (mission)",value: scoreClimatiqueAge ?? 0,     color: COULEURS.climatiqueAge },
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
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
          >
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} / 100`, name]} />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: 12, color: "#0F172A" }}
          />
        </PieChart>
      </ResponsiveContainer>
      {scoreClimatiqueAge === null && (
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center" as const, marginTop: 4 }}>
          Score climatique AGE non disponible (aucune mission réalisée)
        </div>
      )}
    </div>
  )
}