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

    if (module === "prediag") {
      const { source, bien, actif } = data

      if (source === "bien") {
        const b = bien
        const risques: string[] = []
        if (b.zone_rga)  risques.push("Retrait-gonflement des argiles (RGA)")
        if (b.zone_ppri) risques.push("Inondation / PPRI")

        prompt = `Tu es un expert en risque climatique immobilier chez AGE Climate.
Tu dois rédiger un pré-diagnostic climatique professionnel et structuré en français pour un bien immobilier B2B.

DONNÉES DU BIEN :
- Adresse : ${b.adresse || "—"}, ${b.ville || "—"}
- Type de bien : ${b.type_bien || "—"}
- Catégorie : ${b.categorie || "—"}
- Score de risque climatique : ${b.score_risque ?? "—"} / 100
- Niveau de risque : ${b.niveau_risque || "—"}
- Zones à risque identifiées : ${risques.length > 0 ? risques.join(", ") : "Aucune zone spécifique identifiée"}
${b.nom_client ? `- Propriétaire / Client : ${b.nom_client}` : ""}

Rédige un pré-diagnostic structuré avec les sections suivantes :
1. **Synthèse du bien** — présentation et niveau d'exposition global
2. **Aléas climatiques identifiés** — analyse des risques détectés et leur impact potentiel sur le bien
3. **Recommandations prioritaires** — 5 actions concrètes classées par urgence (travaux, assurance, mesures préventives)
4. **Estimation budgétaire** — fourchette indicative des travaux d'adaptation (€)
5. **Prochaines étapes AGE** — mission de diagnostic complet, mandat, financement (Fonds Barnier, Ma Prime Adapt')

Sois précis, professionnel, ancré dans le contexte réglementaire français (loi Climat et Résilience, PPRN, RGA BRGM).
Ne mentionne pas d'informations inventées sur le bien. Base-toi uniquement sur les données fournies.`
      }

      if (source === "actif") {
        const a = actif
        const risquesDetail = a.georisques_data?.data?.[0]?.risques_detail ?? []
        const risquesLabels = risquesDetail
          .map((r: any) => r.libelle_risque_long)
          .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
          .join(", ")
        const commune = a.georisques_data?.data?.[0]?.libelle_commune ?? a.ville ?? "—"

        prompt = `Tu es un expert en risque climatique immobilier chez AGE Climate.
Tu dois rédiger un pré-diagnostic climatique professionnel et structuré en français pour un particulier.

DONNÉES DU BIEN :
- Nom du bien : ${a.nom || "—"}
- Adresse : ${a.adresse || "—"}, ${a.ville || "—"}
- Commune Géorisques : ${commune}
- Type de bien : ${a.type_bien || "—"}
- Score climatique : ${a.score_climatique ?? "—"} / 100
- Risques Géorisques identifiés : ${risquesLabels || "Aucun risque identifié"}

Rédige un pré-diagnostic structuré avec les sections suivantes :
1. **Synthèse du bien** — présentation et niveau d'exposition global
2. **Aléas climatiques identifiés** — analyse détaillée des risques Géorisques et leur impact potentiel sur le bien
3. **Recommandations prioritaires** — 5 actions concrètes classées par urgence (travaux, assurance, mesures préventives)
4. **Estimation budgétaire** — fourchette indicative des travaux d'adaptation (€)
5. **Prochaines étapes AGE** — mission de diagnostic complet, mandat, financement (Ma Prime Adapt', Fonds Barnier, éco-PTZ)

Sois précis, professionnel, ancré dans le contexte réglementaire français (loi Climat et Résilience, PPRN, RGA BRGM, Géorisques).
Ne mentionne pas d'informations inventées sur le bien. Base-toi uniquement sur les données fournies.`
      }
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