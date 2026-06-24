import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { lon, lat } = await req.json()

    if (!lon || !lat) {
      return new Response(JSON.stringify({ error: "lon et lat requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Forcer HTTP/1.1 via client personnalisé
    const rgaUrl      = `https://georisques.gouv.fr/api/v1/rga?latlon=${lon},${lat}`
    const risquesUrl  = `https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${lon},${lat}`

    const headers = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    }

    const [rgaRes, risquesRes] = await Promise.all([
      fetch(rgaUrl,     { headers }),
      fetch(risquesUrl, { headers }),
    ])

    const rga     = rgaRes.ok     ? await rgaRes.json()     : null
    const risques = risquesRes.ok ? await risquesRes.json() : null

    return new Response(JSON.stringify({ rga, risques }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})