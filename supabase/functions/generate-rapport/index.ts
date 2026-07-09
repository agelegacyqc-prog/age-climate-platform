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
if (module === "agecarbon") {
      const b = data.bilan
      const r = data.resultats
      const barometre = data.barometre ?? null

      const total = r.reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const scope1 = r.filter((row: any) => row.scope === 1).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const scope2 = r.filter((row: any) => row.scope === 2).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
      const scope3 = r.filter((row: any) => row.scope === 3).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000

      const LIBELLES_POSTES: Record<string, string> = {
        energie: "Énergie",
        hors_energie: "Émissions hors énergie",
        deplacements: "Déplacements",
        fret: "Fret",
        intrants: "Intrants",
        immobilisations: "Immobilisations",
        dechets: "Déchets",
        futurs_emballages: "Emballages futurs",
        utilisation: "Utilisation des produits",
        fin_de_vie: "Fin de vie",
      }

      // Postes réellement présents dans ce bilan (dynamique — pas de liste fixe)
      const postesPresents = Array.from(new Set(r.map((row: any) => row.poste)))
        .filter((poste) => r.some((row: any) => row.poste === poste && parseFloat(row.total_kg_co2e || 0) > 0))
        .map((poste) => {
          const tco2e = r.filter((row: any) => row.poste === poste).reduce((s: number, row: any) => s + parseFloat(row.total_kg_co2e || 0), 0) / 1000
          return { poste, libelle: LIBELLES_POSTES[poste as string] ?? poste, tco2e }
        })
        .sort((a, b) => b.tco2e - a.tco2e)

      const barometreTexte = barometre
        ? `
DONNÉES BAROMÈTRE EMPLOYÉS (à commenter dans "teletravail" et "barometre_employes") :
- Taux moyen de télétravail : ${barometre.taux_teletravail_moyen_pct ?? "—"} %
- Jours télétravaillés (total) : ${barometre.jours_teletravail_total ?? "—"}
- Empreinte énergie télétravail : ${barometre.empreinte_energie_teletravail_tco2e ?? "—"} tCO₂e
- Émissions évitées grâce au télétravail : ${barometre.emissions_evitees_teletravail_tco2e ?? "—"} tCO₂e
- Distance domicile-travail agrégée : ${barometre.distance_domicile_travail_km ?? "—"} km (${barometre.emissions_domicile_travail_tco2e ?? "—"} tCO₂e)
- Répartition modes : voiture ${barometre.mode_voiture_pct ?? "—"} % / covoiturage ${barometre.mode_covoiturage_pct ?? "—"} % / TC ${barometre.mode_transports_commun_pct ?? "—"} % / vélo ${barometre.mode_velo_pct ?? "—"} % / marche ${barometre.mode_marche_pct ?? "—"} %
- Collaborateurs pratiquant le covoiturage : ${barometre.collaborateurs_covoiturage_pct ?? "—"} %
- Sensibilisation climat : ${barometre.sensibilisation_climat_pct ?? "—"} %
- Collaborateurs formés aux enjeux climat : ${barometre.collaborateurs_formes_climat_pct ?? "—"} %
- Satisfaction politique climat entreprise : ${barometre.satisfaction_politique_climat_pct ?? "—"} %`
        : `
Aucune donnée de baromètre employés renseignée pour ce bilan — ne pas inventer de chiffres, indiquer dans "teletravail" et "barometre_employes" que ces données ne sont pas encore disponibles.`

      prompt = `Tu es un expert en comptabilité carbone selon la méthodologie ABC (Bilan Carbone®).
Tu dois générer le CONTENU TEXTE d'un rapport de bilan carbone au format d'un objet JSON strict.

RÈGLES IMPÉRATIVES :
- Réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant, aucun texte après, aucun bloc markdown \`\`\`.
- Tu ne dois JAMAIS inventer ou recalculer de chiffres (tCO₂e, %, km) : ces valeurs sont injectées séparément depuis les données réelles. Tu rédiges uniquement des commentaires qualitatifs qui s'appuient sur les chiffres fournis ci-dessous, sans en réécrire d'autres.
- Si une donnée n'est pas fournie, ne l'invente pas : indique que l'information n'est pas disponible.

DONNÉES DU BILAN :
- Organisation : ${b.raison_sociale}${b.siren ? ` (SIREN : ${b.siren})` : ""}
- Secteur : ${b.secteur_naf || "—"}
- Année de reporting : ${b.annee_reporting || "—"}
- Total émissions : ${total.toFixed(2)} tCO₂e
- Scope 1 : ${scope1.toFixed(2)} tCO₂e (${total > 0 ? (scope1/total*100).toFixed(1) : 0} %)
- Scope 2 : ${scope2.toFixed(2)} tCO₂e (${total > 0 ? (scope2/total*100).toFixed(1) : 0} %)
- Scope 3 : ${scope3.toFixed(2)} tCO₂e (${total > 0 ? (scope3/total*100).toFixed(1) : 0} %)

POSTES PRÉSENTS DANS CE BILAN (rédige une entrée dans "resultats_par_poste" pour CHACUN, ni plus ni moins) :
${postesPresents.map(p => `- ${p.libelle} (clé: "${p.poste}") : ${p.tco2e.toFixed(2)} tCO₂e`).join("\n")}
${barometreTexte}

Réponds avec EXACTEMENT ce schéma JSON :
{
  "synthese": {
    "phrase_accroche": "1 phrase d'accroche sur le niveau d'émissions",
    "pourquoi_agir": "2-3 phrases sur l'importance d'agir, ton pédagogique",
    "budget_carbone_contexte": "2-3 phrases sur le budget carbone et la trajectoire 1,5°C"
  },
  "resultats_par_poste": [
    { "poste": "clé exacte du poste", "libelle": "libellé exact du poste", "commentaire": "2-3 phrases de commentaire qualitatif sur ce poste" }
  ],
  "teletravail": "2-3 phrases commentant les données télétravail fournies, ou mention d'absence de données",
  "barometre_employes": "2-3 phrases commentant les données baromètre fournies, ou mention d'absence de données",
  "agir": {
    "typologie_intro": "2-3 phrases introduisant les leviers d'action (réduction, contribution, sensibilisation)",
    "plan_actions": ["5 à 8 actions concrètes, classées par potentiel de réduction, adaptées aux postes dominants de ce bilan"]
  },
  "annexes": "1-2 phrases de mention méthodologique (ABC, facteurs d'émission ADEME)"
}`
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
        max_tokens: module === "agecarbon" ? 6000 : 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    })

  const result = await response.json()
    const texte = result.content?.[0]?.text ?? ""

    if (module === "agecarbon") {
      let rapportStructure
      try {
        const nettoye = texte.replace(/^```json\s*|\s*```$/g, "").trim()
        rapportStructure = JSON.parse(nettoye)
      } catch (parseError) {
        return new Response(JSON.stringify({ error: "Réponse IA non conforme au format JSON attendu.", brut: texte }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ rapport_structure: rapportStructure }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

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