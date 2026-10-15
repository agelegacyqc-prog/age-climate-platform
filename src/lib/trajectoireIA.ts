// src/lib/trajectoireIA.ts
//
// Module Trajectoire : analyse automatique des documents par un service d'IA.
// Texte de consentement (donné par admin_client, une fois par organisation) et règles d'affichage.
// Le serveur reste la référence : consentement, limites et journal sont contrôlés par l'Edge Function
// trajectoire-analyse et les politiques RLS (20261015_trajectoire_ia.sql).

import type { StatutAnalyse } from "./trajectoireDocuments"

/** À incrémenter à chaque modification du texte : la version consentie est enregistrée avec le consentement. */
export const TEXTE_CONSENTEMENT_VERSION = "v1-2026-10-15"

export const TEXTE_CONSENTEMENT = {
  titre: "Analyse automatique de vos documents par un service d'IA",
  introduction:
    "Pour identifier les constats, écarts, recommandations, échéances et certifications de vos documents, AGE Climate peut les faire analyser automatiquement par un service d'intelligence artificielle (modèle Claude, fourni par Anthropic).",
  paragraphes: [
    {
      titre: "Ce qui est transmis.",
      texte: "Le contenu des documents que vous déposez dans Trajectoire, au moment de leur dépôt. Rien n'est transmis avant votre accord.",
    },
    {
      titre: "Ce qui est produit.",
      texte: "Des propositions d'extraction. Elles ne valent rien tant que vous ne les avez pas validées, puis qu'AGE ne les a pas confirmées. Vous pouvez les rejeter.",
    },
    {
      titre: "Vos données.",
      texte: "Les documents peuvent contenir des données personnelles (noms, coordonnées). Ils sont transmis uniquement pour cette analyse. AGE Climate reste responsable du traitement.",
    },
    {
      titre: "Votre choix.",
      texte: "Vous pouvez retirer votre accord à tout moment : les documents déposés ensuite ne seront plus analysés. Les analyses déjà réalisées restent consultables.",
    },
  ],
  caseACocher: "J'autorise l'analyse automatique des documents de mon organisation par un service d'IA.",
} as const

/** Statuts pour lesquels une relance de l'analyse a un sens. */
const STATUTS_RELANCABLES: ReadonlySet<StatutAnalyse> = new Set<StatutAnalyse>(["depose", "echec", "partiel"])

/** La relance est réservée au personnel AGE, et n'a de sens que si l'organisation a donné son consentement. */
export function peutRelancer(statut: StatutAnalyse, estPersonnelAGE: boolean, consentementActif: boolean): boolean {
  return estPersonnelAGE && consentementActif && STATUTS_RELANCABLES.has(statut)
}