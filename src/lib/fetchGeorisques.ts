// src/lib/fetchGeorisques.ts
//
// Récupère les données Géorisques (format GASPAR, { data: [{ risques_detail }] })
// et les stocke dans actifs.georisques_data. Logique reprise telle quelle de
// FicheBienCampagne.tsx (fetchGeorisques) — seule source existante confirmée
// produisant ce format. Ne pas utiliser l'Edge Function "georisques-proxy",
// qui sert le parcours particulier avec un format différent ({ risquesNaturels }).

import { supabase } from "./supabase"

export async function fetchAndStoreGeorisques(actif: { id: string; ville?: string; code_postal?: string }) {
  if (!actif.ville) return null
  try {
    const villeEncode = encodeURIComponent(actif.ville.trim())
    const resCommune = await fetch(
      "https://geo.api.gouv.fr/communes?nom=" + villeEncode +
      "&codePostal=" + (actif.code_postal?.trim() || "") +
      "&fields=code,nom&limit=1"
    )
    if (!resCommune.ok) return null
    const communes = await resCommune.json()
    if (!communes[0]) return null
    const codeInsee = communes[0].code

    const resRisques = await fetch(
      "https://georisques.gouv.fr/api/v1/gaspar/risques?code_insee=" + codeInsee + "&page=1&page_size=10"
    )
    if (!resRisques.ok) return null
    const data = await resRisques.json()

    await supabase.from("actifs").update({ georisques_data: data }).eq("id", actif.id)
    return data
  } catch (e) {
    console.error("Erreur fetch Géorisques:", e)
    return null
  }
}