// src/lib/fetchRga.ts
import { supabase } from "./supabase"

export async function fetchAndStoreRga(actif: { id: string; adresse?: string; ville?: string; code_postal?: string }): Promise<string | null> {
  if (!actif.adresse || !actif.ville) return null

  try {
    const { data, error } = await supabase.functions.invoke("detecter-rga", {
      body: { adresse: actif.adresse, ville: actif.ville, code_postal: actif.code_postal },
    })
    if (error || !data?.niveau) return null

    await supabase.from("actifs").update({ exposition_rga: data.niveau }).eq("id", actif.id)
    return data.niveau

  } catch (e) {
    console.error("Erreur détection RGA:", e)
    return null
  }
}