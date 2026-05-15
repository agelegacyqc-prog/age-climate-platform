import React, { useState } from "react"

const THEMES = [
  { id: "tous",          label: "Tous",                icon: "ti-layout-grid" },
  { id: "energie",       label: "Énergie",             icon: "ti-bolt" },
  { id: "carbone",       label: "Carbone & Reporting", icon: "ti-leaf" },
  { id: "prevention",    label: "Prévention climatique",icon: "ti-shield" },
  { id: "finance",       label: "Finance durable",     icon: "ti-coin" },
  { id: "adaptation",    label: "Adaptation",          icon: "ti-refresh-alert" },
  { id: "grand_public",  label: "Grand public",        icon: "ti-world" },
]

const CONTENUS = [
  // ── Énergie ───────────────────────────────────────────────────────────────
  {
    theme: "energie", icon: "ti-bolt", couleur: "#D97706",
    tag: "Obligatoire", tagColor: "#92400E", tagBg: "#FFFBEB",
    titre: "Décret Tertiaire (OPERAT)",
    texte: "Obligation légale de réduction des consommations énergétiques pour tous les bâtiments à usage tertiaire ≥ 1 000 m². Objectifs : −40 % en 2030, −50 % en 2040, −60 % en 2050 par rapport à une année de référence. Déclaration annuelle sur la plateforme OPERAT.",
    actions: [
      "Déclarez vos consommations sur OPERAT avant le 30/09 chaque année",
      "Réalisez un audit énergétique pour identifier les leviers de réduction",
      "Mettez en place un plan d'actions pluriannuel documenté",
    ],
    lien: "https://operat.ademe.fr",
  },
  {
    theme: "energie", icon: "ti-tool", couleur: "#D97706",
    tag: "Obligatoire", tagColor: "#92400E", tagBg: "#FFFBEB",
    titre: "Décret BACS",
    texte: "Obligation d'installer des systèmes d'automatisation et de régulation (GTB/GTC) dans les bâtiments tertiaires d'une puissance > 290 kW. Échéance : 1er janvier 2025 pour les systèmes existants. Objectif : réduire de 25 % la consommation énergétique via l'automatisation.",
    actions: [
      "Vérifiez si votre puissance installée dépasse 290 kW",
      "Faites réaliser un diagnostic GTB par un bureau d'études certifié",
      "Intégrez la GTB dans vos prochains travaux de rénovation",
    ],
    lien: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043976886",
  },
  {
    theme: "energie", icon: "ti-certificate", couleur: "#0369A1",
    tag: "Volontaire", tagColor: "#1E40AF", tagBg: "#EFF6FF",
    titre: "ISO 50001 — Management de l'énergie",
    texte: "Norme internationale structurant une démarche d'amélioration continue des performances énergétiques. Adoptée par plus de 18 000 organisations dans le monde, elle permet de réduire de 10 à 20 % les consommations en 3 ans et constitue un atout majeur pour répondre aux exigences CSRD.",
    actions: [
      "Nommez un responsable énergie au sein de votre organisation",
      "Réalisez une revue énergétique initiale (audit de base)",
      "Engagez une démarche de certification avec un organisme accrédité COFRAC",
    ],
    lien: "https://www.iso.org/fr/iso-50001-energy-management.html",
  },
  {
    theme: "energie", icon: "ti-coin", couleur: "#065F46",
    tag: "Financement", tagColor: "#065F46", tagBg: "#ECFDF5",
    titre: "Certificats d'Économies d'Énergie (CEE)",
    texte: "Mécanisme obligeant les fournisseurs d'énergie à financer des travaux d'efficacité énergétique. Gisement estimé à 3 200 TWh Cumac pour la période 2022–2025. Les primes CEE peuvent couvrir jusqu'à 50 % du coût des travaux d'isolation ou de régulation.",
    actions: [
      "Identifiez vos travaux éligibles sur le catalogue ADEME",
      "Demandez plusieurs devis incluant la valorisation CEE",
      "Déposez votre demande AVANT le début des travaux (obligation réglementaire)",
    ],
    lien: "https://www.ecologie.gouv.fr/dispositif-des-certificats-deconomies-denergie",
  },
  {
    theme: "energie", icon: "ti-search", couleur: "#0369A1",
    tag: "Obligatoire", tagColor: "#92400E", tagBg: "#FFFBEB",
    titre: "Audit énergétique réglementaire",
    texte: "Obligatoire pour les grandes entreprises (≥ 250 salariés ou CA ≥ 50 M€) tous les 4 ans depuis 2015. Depuis 2023, les entreprises en vente d'un logement classé E, F ou G ont l'obligation de fournir un audit énergétique à l'acheteur.",
    actions: [
      "Vérifiez votre obligation d'audit (seuils effectifs et CA)",
      "Mandatez un auditeur certifié RGE ou bureau d'études accrédité",
      "Utilisez les résultats pour prioriser vos investissements énergie",
    ],
    lien: "https://www.ademe.fr/audit-energetique",
  },

  // ── Carbone & Reporting ───────────────────────────────────────────────────
  {
    theme: "carbone", icon: "ti-leaf", couleur: "#065F46",
    tag: "Obligatoire", tagColor: "#92400E", tagBg: "#FFFBEB",
    titre: "Bilan GES (BEGES)",
    texte: "Obligatoire pour les entreprises ≥ 500 salariés (250 en DOM-TOM), les collectivités ≥ 50 000 habitants et l'État. Renouvellement tous les 4 ans. Couvre les Scopes 1 (émissions directes), 2 (énergie achetée) et 3 (chaîne de valeur).",
    actions: [
      "Constituez une équipe projet pluridisciplinaire (achat, RH, logistique)",
      "Collectez vos données de consommation sur les 3 dernières années",
      "Déposez votre BEGES sur bilans-ges.ademe.fr",
    ],
    lien: "https://bilans-ges.ademe.fr",
  },
  {
    theme: "carbone", icon: "ti-file-analytics", couleur: "#5B21B6",
    tag: "Obligatoire", tagColor: "#5B21B6", tagBg: "#F5F3FF",
    titre: "CSRD / ESRS — Reporting de durabilité",
    texte: "La directive CSRD impose un reporting extra-financier standardisé selon les normes ESRS. Calendrier : grandes entreprises cotées dès 2024, autres grandes entreprises en 2025, PME cotées en 2026. Couvre les enjeux E (environnement), S (social) et G (gouvernance).",
    actions: [
      "Réalisez une double matérialité pour identifier vos enjeux prioritaires",
      "Mettez en place un système de collecte de données ESG",
      "Préparez votre rapport avec un commissaire aux comptes habilité",
    ],
    lien: "https://www.efrag.org/Activities/2010051123048/Sustainability-reporting-standards",
  },

  // ── Finance durable ───────────────────────────────────────────────────────
  {
    theme: "finance", icon: "ti-world", couleur: "#1E40AF",
    tag: "Réglementaire", tagColor: "#1E40AF", tagBg: "#EFF6FF",
    titre: "EU Taxonomy — Taxonomie verte européenne",
    texte: "Système de classification européen définissant les activités économiques durables. Clé pour accéder aux obligations vertes, aux fonds ESG et aux investisseurs institutionnels. Une activité est alignée si elle contribue à un des 6 objectifs environnementaux sans en dégrader aucun autre (principe DNSH).",
    actions: [
      "Identifiez vos activités économiques éligibles aux 6 objectifs environnementaux",
      "Évaluez l'alignement de vos investissements selon les critères techniques (TSC)",
      "Communiquez votre taux d'alignement dans votre rapport CSRD",
    ],
    lien: "https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/eu-taxonomy-sustainable-activities_fr",
  },
  {
    theme: "finance", icon: "ti-shield-check", couleur: "#1E40AF",
    tag: "Obligatoire", tagColor: "#5B21B6", tagBg: "#F5F3FF",
    titre: "SFDR — Sustainable Finance Disclosure Regulation",
    texte: "Règlement européen imposant aux gestionnaires d'actifs de classer leurs fonds selon leur niveau de durabilité (Article 6, 8 ou 9). Oblige à divulguer les risques de durabilité et les principales incidences négatives (PAI) sur les facteurs environnementaux et sociaux.",
    actions: [
      "Classifiez vos produits financiers selon les articles 6, 8 ou 9 SFDR",
      "Collectez les données PAI (Principal Adverse Impacts) de vos investissements",
      "Publiez votre déclaration SFDR sur votre site internet",
    ],
    lien: "https://www.amf-france.org/fr/reglementation/dossiers-thematiques/finance-durable/sfdr-sustainable-finance-disclosure-regulation",
  },

  // ── Prévention climatique ─────────────────────────────────────────────────
  {
    theme: "prevention", icon: "ti-shield", couleur: "#991B1B",
    tag: "Obligatoire", tagColor: "#92400E", tagBg: "#FFFBEB",
    titre: "Risques climatiques physiques (TCFD)",
    texte: "Les recommandations TCFD et le règlement SFDR imposent d'intégrer les risques climatiques physiques dans les analyses financières. En France, l'article 29 de la loi Énergie-Climat oblige les investisseurs institutionnels à divulguer leur exposition aux risques climatiques.",
    actions: [
      "Cartographiez l'exposition de vos actifs aux 6 aléas climatiques (PPRI, RGA, feux...)",
      "Intégrez les scénarios RCP 4.5 et 8.5 dans vos analyses de risque",
      "Utilisez le score climatique AGE pour quantifier l'exposition par actif",
    ],
    lien: "https://www.fsb-tcfd.org/recommendations",
  },
  {
    theme: "prevention", icon: "ti-home", couleur: "#B25C2A",
    tag: "Innovation AGE", tagColor: "#B25C2A", tagBg: "#FDF3EC",
    titre: "Brown Value — Décote climatique des actifs",
    texte: "Méthode AGE Climate pour quantifier la dépréciation des actifs immobiliers liée aux aléas climatiques. Intègre 6 aléas (inondation, RGA, feux, submersion, tempête, îlot de chaleur), un horizon d'analyse de 20 ans et deux méthodes de valorisation (DCF et Marché).",
    actions: [
      "Calculez la Brown Value de chaque actif via le wizard AGE (onglet Brown Value)",
      "Intégrez la décote climatique dans vos valorisations patrimoniales",
      "Communiquez les résultats dans vos reportings CSRD et TCFD",
    ],
    lien: null,
  },
  {
    theme: "prevention", icon: "ti-droplet", couleur: "#1E40AF",
    tag: "Géorisques", tagColor: "#1E40AF", tagBg: "#EFF6FF",
    titre: "PPRI — Plan de Prévention des Risques Inondation",
    texte: "Document réglementaire délimitant les zones exposées aux inondations et prescrivant des règles d'urbanisme, de construction et d'usage. En zone rouge, toute nouvelle construction est interdite. En zone bleue, des prescriptions de construction s'appliquent.",
    actions: [
      "Consultez le PPRI de votre commune sur Géorisques (georisques.gouv.fr)",
      "Vérifiez la zone de chacun de vos actifs (rouge, bleue, blanche)",
      "Adaptez vos projets de construction et de rénovation aux prescriptions",
    ],
    lien: "https://www.georisques.gouv.fr",
  },
  {
    theme: "prevention", icon: "ti-layers-difference", couleur: "#D97706",
    tag: "Géorisques", tagColor: "#92400E", tagBg: "#FFFBEB",
    titre: "RGA — Retrait-Gonflement des Argiles",
    texte: "Premier risque naturel en termes de coûts d'indemnisation en France (plus de 40 % des indemnisations Cat Nat). Les mouvements du sol liés aux variations de teneur en eau des argiles provoquent des fissures structurelles. Risque aggravé par le réchauffement climatique et les sécheresses.",
    actions: [
      "Consultez la cartographie RGA sur Géorisques pour chacun de vos actifs",
      "Réalisez une étude géotechnique G1 avant tout projet de construction",
      "Intégrez le RGA dans votre score Brown Value via l'onglet Aléas",
    ],
    lien: "https://www.georisques.gouv.fr/risques/retrait-gonflement-des-argiles",
  },

  // ── Adaptation ────────────────────────────────────────────────────────────
  {
    theme: "adaptation", icon: "ti-trending-down", couleur: "#0369A1",
    tag: "Stratégie", tagColor: "#0369A1", tagBg: "#E0F2FE",
    titre: "Plan d'adaptation climatique",
    texte: "Stratégie structurée de résilience face aux risques climatiques physiques et de transition. Requis dans les reportings TCFD, CSRD (ESRS E1) et les plans de financement durables. Un plan d'adaptation définit les mesures de prévention, les investissements nécessaires et les indicateurs de suivi.",
    actions: [
      "Réalisez un diagnostic d'exposition aux aléas climatiques par site",
      "Définissez des mesures d'adaptation priorisées par coût-bénéfice",
      "Intégrez le plan dans votre stratégie RSE et votre reporting CSRD",
    ],
    lien: null,
  },
  {
    theme: "adaptation", icon: "ti-building", couleur: "#065F46",
    tag: "Urbanisme", tagColor: "#065F46", tagBg: "#ECFDF5",
    titre: "Résilience des bâtiments",
    texte: "L'adaptation du parc bâti au changement climatique passe par la surélévation des réseaux sensibles, l'amélioration de l'isolation thermique contre les vagues de chaleur, et la mise en place de systèmes de drainage renforcés contre les inondations.",
    actions: [
      "Réalisez un diagnostic de vulnérabilité climatique de vos bâtiments",
      "Priorisez les travaux selon l'exposition aux aléas et la valeur des actifs",
      "Sollicitez les aides du Fonds Barnier pour les travaux de prévention",
    ],
    lien: "https://www.fondbarnier.fr",
  },

  // ── Grand public ──────────────────────────────────────────────────────────
  {
    theme: "grand_public", icon: "ti-world", couleur: "#0F6E56",
    tag: "Enjeux globaux", tagColor: "#065F46", tagBg: "#ECFDF5",
    titre: "Pourquoi agir maintenant ?",
    texte: "Le GIEC confirme : chaque dixième de degré supplémentaire au-delà de 1,5°C multiplie les événements climatiques extrêmes. Les émissions mondiales doivent être réduites de 45 % d'ici 2030 pour rester sous ce seuil critique.",
    actions: [
      "Calculez votre empreinte carbone personnelle sur le site de l'ADEME",
      "Adoptez un régime moins carné (économie : −500 kg CO₂/an en moyenne)",
      "Privilégiez les transports en commun ou le vélo pour vos trajets quotidiens",
    ],
    lien: "https://nosgestesclimat.fr",
  },
  {
    theme: "grand_public", icon: "ti-recycle", couleur: "#0F6E56",
    tag: "Actions", tagColor: "#065F46", tagBg: "#ECFDF5",
    titre: "Gestes du quotidien",
    texte: "Les comportements individuels représentent environ 25 % des émissions nationales. La consommation responsable, le tri sélectif et la sobriété énergétique sont les leviers les plus accessibles pour réduire son impact climatique au quotidien.",
    actions: [
      "Éteignez les appareils en veille (économie : 80 €/an en moyenne)",
      "Triez vos déchets et compostez vos biodéchets",
      "Achetez local et de saison pour réduire l'empreinte transport",
    ],
    lien: null,
  },
  {
    theme: "grand_public", icon: "ti-bolt", couleur: "#D97706",
    tag: "Énergie", tagColor: "#D97706", tagBg: "#FFFBEB",
    titre: "Énergies renouvelables",
    texte: "Le solaire et l'éolien représentent plus de 30 % de la production mondiale d'électricité en 2024. En France, l'objectif est d'atteindre 40 % d'énergies renouvelables dans la consommation finale d'énergie d'ici 2030.",
    actions: [
      "Souscrivez à une offre d'électricité verte certifiée",
      "Installez des panneaux solaires (aides MaPrimeRénov' disponibles)",
      "Isolez votre logement pour réduire votre consommation de chauffage",
    ],
    lien: "https://www.maprimerenov.gouv.fr",
  },
  {
    theme: "grand_public", icon: "ti-ripple", couleur: "#1E40AF",
    tag: "Biodiversité", tagColor: "#1E40AF", tagBg: "#EFF6FF",
    titre: "Préserver les océans",
    texte: "Les océans absorbent 30 % du CO₂ et 90 % de la chaleur excédentaire produite par le réchauffement climatique. Leur acidification menace 25 % des espèces marines et la sécurité alimentaire de 3 milliards de personnes.",
    actions: [
      "Réduisez votre consommation de plastique à usage unique",
      "Choisissez des produits de la mer issus de pêche durable (label MSC)",
      "Participez à des opérations de nettoyage des côtes ou rivières locales",
    ],
    lien: null,
  },
  {
    theme: "grand_public", icon: "ti-users", couleur: "#5B21B6",
    tag: "Collectif", tagColor: "#5B21B6", tagBg: "#F5F3FF",
    titre: "Agir ensemble",
    texte: "La transition écologique ne peut réussir que collectivement. Les entreprises, collectivités et citoyens représentent chacun environ un tiers des émissions françaises. La mobilisation simultanée des trois est indispensable pour atteindre la neutralité carbone en 2050.",
    actions: [
      "Engagez-vous dans une association climatique locale",
      "Interpellez vos élus sur les politiques climatiques locales",
      "Partagez vos pratiques durables autour de vous",
    ],
    lien: null,
  },
]

export default function Sensibilisation() {
  const [theme, setTheme] = useState("tous")

  const contenusFiltres = theme === "tous"
    ? CONTENUS
    : CONTENUS.filter(c => c.theme === theme)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Hero */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Comprendre les enjeux climatiques</div>
          <div style={{ fontSize: "13px", color: "#64748B" }}>
            Obligations réglementaires, outils métier et actions concrètes — filtrez par thème pour accéder aux fiches qui vous concernent.
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
          <span style={{ fontWeight: 600, color: "#0F172A" }}>{contenusFiltres.length}</span> fiche{contenusFiltres.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Filtres thématiques */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {THEMES.map(t => (
          <button key={t.id} onClick={() => setTheme(t.id)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 16px", borderRadius: "8px",
            border: theme === t.id ? "1px solid #0F6E56" : "1px solid #E2E8F0",
            background: theme === t.id ? "#ECFDF5" : "#FFFFFF",
            color: theme === t.id ? "#065F46" : "#64748B",
            fontSize: "13px", fontWeight: theme === t.id ? 600 : 400,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
          }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Fiches en ligne */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {contenusFiltres.map((c, i) => (
          <div key={i} style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: "10px", padding: "18px 20px",
            display: "grid", gridTemplateColumns: "36px 1fr auto",
            gap: "16px", alignItems: "flex-start",
            transition: "border-color 0.12s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#A7F3D0")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
          >
            {/* Icône */}
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: "18px", color: c.couleur }} aria-hidden="true" />
            </div>

            {/* Contenu central */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{c.titre}</span>
                <span style={{ background: c.tagBg, color: c.tagColor, padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 600 }}>
                  {c.tag}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, margin: 0 }}>{c.texte}</p>

              {/* Actions */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "7px", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
                  Ce que vous devez faire
                </div>
                {c.actions.map((a, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <i className="ti ti-check" style={{ fontSize: "13px", color: "#0F6E56", flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
                    <span style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lien officiel */}
            <div style={{ flexShrink: 0, paddingTop: "4px" }}>
              {c.lien ? (
                <a href={c.lien} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "12px", color: "#0369A1", textDecoration: "none",
                  fontWeight: 500, whiteSpace: "nowrap",
                  background: "#EFF6FF", border: "1px solid #BFDBFE",
                  padding: "5px 10px", borderRadius: "6px",
                }}>
                  <i className="ti ti-external-link" style={{ fontSize: "13px" }} aria-hidden="true" />
                  Texte officiel
                </a>
              ) : (
                <div style={{ width: "110px" }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}