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
    const { module, data } = await req.json()

    // Construction du prompt selon le module
    let prompt = ""

    if (module === "ageadapt") {
      const m = data.mission
      const s = data.simulation
      prompt = `Tu es un expert en adaptation climatique et conseil environnemental. 
Tu dois rédiger un rapport de mission AGEadapt professionnel et structuré en français.

DONNÉES DE LA MISSION :
- Client : ${m.raison_sociale}${m.siren ? ` (SIREN : ${m.siren})` : ""}
- Type de structure : ${m.type_structure || "—"}
- Secteur NAF : ${m.secteur_naf || "—"}
- Région : ${m.region || "—"}
- Méthode : ${m.methode === "abc" ? "Bilan Carbone® ABC" : m.methode === "act" ? "ACT Adaptation" : m.methode === "vuln" ? "Diagnostic de vulnérabilité" : "Mission complète"}
- Bilan existant : ${m.bilan_existant ? "Oui" : "Non"}
- Aléas climatiques identifiés : ${m.aleas?.join(", ") || "Non renseignés"}
- Horizons analysés : ${[m.horizon_2030 && "2030", m.horizon_2040 && "2040", m.horizon_2050 && "2050"].filter(Boolean).join(", ") || "Non renseignés"}
${s ? `
SIMULATION TARIFAIRE :
- Jours consultant : ${s.jours_consultant}
- Durée : ${s.duree_mois} mois
- Honoraires HT : ${s.tarif_bas_ht?.toLocaleString("fr-FR")} – ${s.tarif_haut_ht?.toLocaleString("fr-FR")} €` : ""}

Rédige un rapport structuré avec les sections suivantes :
1. **Contexte et enjeux** — présentation du client et de ses enjeux climatiques
2. **Diagnostic de vulnérabilité** — analyse des aléas identifiés et de leur impact potentiel
3. **Recommandations prioritaires** — 3 à 5 actions concrètes adaptées au profil du client
4. **Ancrage réglementaire** — références PNACC3 pertinentes (mesures 33, 40, 41)
5. **Plan d'action proposé** — structuré par horizon temporel (2030, 2040, 2050)
6. **Cadrage de la mission** — périmètre, livrables attendus, prochaines étapes

Sois précis, professionnel et ancré dans le contexte réglementaire français (PNACC3, TRACC, guides DGE/ADEME).`
    }

    if (module === "agecarbon") {
      const b = data.bilan
      const r = data.resultats
      const total = r.reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const scope1 = r.filter((row: any) => row.scope === 1).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const scope2 = r.filter((row: any) => row.scope === 2).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const scope3 = r.filter((row: any) => row.scope === 3).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const postePrincipal = r.sort((a: any, b: any) => b.total_kg_co2e - a.total_kg_co2e)[0]

      prompt = `Tu es un expert en comptabilité carbone et bilan GES selon la méthodologie ABC (Bilan Carbone®).
Tu dois rédiger un rapport de bilan carbone professionnel et structuré en français.

DONNÉES DU BILAN :
- Organisation : ${b.raison_sociale}${b.siren ? ` (SIREN : ${b.siren})` : ""}
- Secteur : ${b.secteur_naf || "—"}
- Année de reporting : ${b.annee_reporting || "—"}
- Total émissions : ${total.toFixed(2)} tCO₂e
- Scope 1 (émissions directes) : ${scope1.toFixed(2)} tCO₂e (${total > 0 ? (scope1/total*100).toFixed(1) : 0} %)
- Scope 2 (indirectes énergie) : ${scope2.toFixed(2)} tCO₂e (${total > 0 ? (scope2/total*100).toFixed(1) : 0} %)
- Scope 3 (autres indirectes) : ${scope3.toFixed(2)} tCO₂e (${total > 0 ? (scope3/total*100).toFixed(1) : 0} %)
- Poste dominant : ${postePrincipal?.poste || "—"} (${(parseFloat(postePrincipal?.total_kg_co2e || 0)/1000).toFixed(2)} tCO₂e)

DÉTAIL PAR POSTE :
${r.map((row: any) => `- ${row.poste} (Scope ${row.scope}) : ${(parseFloat(row.total_kg_co2e)/1000).toFixed(2)} tCO₂e`).join("\n")}

Rédige un rapport structuré avec les sections suivantes :
1. **Synthèse exécutive** — résultats clés et niveau d'émissions par rapport au secteur
2. **Analyse par scope** — commentaire sur la répartition et les postes dominants
3. **Postes prioritaires** — analyse des 3 postes les plus émetteurs et leviers de réduction
4. **Objectifs de réduction** — trajectoire recommandée compatible avec les accords de Paris (-50 % d'ici 2030)
5. **Plan d'actions** — 5 à 8 actions concrètes classées par potentiel de réduction
6. **Prochaines étapes** — mise à jour du bilan, plan de transition, reporting CSRD

Sois précis, ancré dans la méthodologie ABC et le cadre réglementaire français (BEGES, CSRD, ESRS E1).`
    }

    // Appel Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    const result = await response.json()
    const texte = result.content?.[0]?.text ?? ""

    return new Response(JSON.stringify({ rapport: texte }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})