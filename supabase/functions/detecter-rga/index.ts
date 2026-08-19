import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const NIVEAU_MAP: Record<string, string> = {
  "0": "non_expose",
  "1": "faible",
  "2": "moyenne",
  "3": "forte",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { adresse, ville, code_postal } = await req.json()
    if (!adresse || !ville) {
      return new Response(JSON.stringify({ niveau: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 1. Géocodage précis
    const q = encodeURIComponent(`${adresse}, ${code_postal || ""} ${ville}`)
    const resGeo = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`)
    const geo = await resGeo.json()
    const feature = geo.features?.[0]
    if (!feature) {
      return new Response(JSON.stringify({ niveau: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    const [lon, lat] = feature.geometry.coordinates

    // 2. GetFeatureInfo RGA
    const delta = 0.01
    const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`
    const url = "https://georisques.gouv.fr/services" +
      "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo" +
      "&LAYERS=ALEARG_REALISE&QUERY_LAYERS=ALEARG_REALISE&STYLES=" +
      "&CRS=EPSG:4326&BBOX=" + bbox +
      "&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=text/plain"

    const resRga = await fetch(url)
    const texte = await resRga.text()
    const match = texte.match(/niveau\s*=\s*'(\d)'/)
    const niveau = match ? NIVEAU_MAP[match[1]] ?? null : null

    return new Response(JSON.stringify({ niveau }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, niveau: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})