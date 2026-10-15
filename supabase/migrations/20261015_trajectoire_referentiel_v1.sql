-- 20261015_trajectoire_referentiel_v1.sql
-- Module Trajectoire : contenu initial du referentiel (15 fiches).
-- Verifie a la source le 15/10/2026 (voir BACKLOG_session_15-10-2026.md).
-- DEJA execute en production (projet vkclvfsblsjpuycjfiso) le 15/10/2026 : 15 fiches inserees et verifiees.
-- Idempotent : ON CONFLICT (code) DO NOTHING (une fiche deja presente n'est pas modifiee).
-- Points encore a confirmer sur Legifrance / EUR-Lex avant mise en production :
--   * tertiaire : date limite annuelle du 30/09 (confirmee par DREAL Occitanie, arrete a citer)
--   * bacs : sanction et exemption sur etude de rentabilite
--   * bilan_ges : montants 50 000 / 100 000 EUR (source secondaire)
--   * csrd / esrs : numero de la directive Omnibus, calendrier de transposition
--   * sfdr : echeance annuelle du 30/06 ; reen : obligations hors secteur public
--   * loi_climat : dates du 22/08/2026
-- applicabilite : cles indicatives lues par le front (types_client, seuils) ; competences : a renseigner plus tard.

INSERT INTO public.trajectoire_referentiel
  (code, libelle, domaine, nature, cadre, description, applicabilite,
   echeance_type, echeance_date, recurrence_mois, sanction_prevue, competences, source_url)
VALUES
('tertiaire', 'Décret Tertiaire (Éco Énergie Tertiaire)', 'energie', 'reglementaire', 'france',
 'Bâtiments tertiaires de 1 000 m² ou plus : réduction de la consommation d''énergie finale de 40 % en 2030, 50 % en 2040 et 60 % en 2050 (année de référence 2010 ou postérieure) ou valeurs absolues en kWh/m²/an. Déclaration annuelle sur OPERAT avant le 30 septembre. Défaut de déclaration ou de programme d''actions : mise en demeure puis publication ; non-respect du programme : amende jusqu''à 7 500 € pour une personne morale.',
 '{"surface_min_m2": 1000, "types_actif": ["tertiaire"]}'::jsonb,
 'annuelle', DATE '2026-09-30', NULL, true, '{}', NULL),
('bacs', 'Décret BACS (automatisation et contrôle des bâtiments)', 'energie', 'reglementaire', 'france',
 'Bâtiments tertiaires équipés d''un système de chauffage ou de climatisation de plus de 70 kW. Décret n° 2025-1343 du 26/12/2025 : seuil de 70 kW reporté au 01/01/2030 pour les bâtiments existants ; seuil de plus de 290 kW resté au 01/01/2025. Sanction et exemption sur étude de rentabilité : à confirmer.',
 '{"puissance_min_kw": 70, "puissance_seuil_haut_kw": 290, "types_actif": ["tertiaire"]}'::jsonb,
 'fixe', DATE '2030-01-01', NULL, false, '{}', NULL),
('audit_energetique', 'Audit énergétique ou système de management de l''énergie', 'energie', 'reglementaire', 'france',
 'Régime issu de la directive (UE) 2023/1791 (loi 2025-391, décret 2025-1382) : critère de consommation moyenne sur 3 ans. De 2,75 à 23,6 GWh/an : audit tous les 4 ans ; à partir de 23,6 GWh/an : système de management de l''énergie certifié (11/10/2027). Sanction : mise en demeure puis amende jusqu''à 2 % du chiffre d''affaires, 4 % en récidive (L233-4).',
 '{"consommation_min_gwh": 2.75, "consommation_sme_gwh": 23.6}'::jsonb,
 'pluriannuelle', NULL, 48, true, '{}', 'https://www.ecologie.gouv.fr/politiques-publiques/audit-energetique-grandes-entreprises'),
('iso50001', 'ISO 50001 (management de l''énergie)', 'energie', 'volontaire', 'international',
 'Norme de système de management de l''énergie (ISO 50001:2018, amendement climat 2024). Une certification valide dispense de l''audit énergétique réglementaire.',
 '{}'::jsonb,
 'aucune', NULL, NULL, false, '{}', NULL),
('bilan_ges', 'Bilan d''émissions de gaz à effet de serre (réglementaire)', 'environnement', 'reglementaire', 'france',
 'Article L229-25 du code de l''environnement : plus de 500 salariés en métropole, 250 outre-mer, État, régions, départements, communes et EPCI de plus de 50 000 habitants. Mise à jour tous les 4 ans (3 ans pour le public), dépôt sur la plateforme ADEME avec plan de transition. Sanction : jusqu''à 50 000 € par manquement, 100 000 € en récidive (à confirmer).',
 '{"effectif_min": 500, "effectif_min_outre_mer": 250, "inclut_secteur_public": true}'::jsonb,
 'pluriannuelle', NULL, 48, true, '{}', NULL),
('csrd', 'CSRD (Corporate Sustainability Reporting Directive)', 'environnement', 'reglementaire', 'europe',
 'Après Omnibus I : plus de 1 000 salariés et plus de 450 M€ de chiffre d''affaires net. Transposition en droit français au plus tard le 19/03/2027 : tant que la transposition n''est pas faite, pas d''échéance applicable. Sanction nationale à confirmer.',
 '{"effectif_min": 1000, "ca_min_meur": 450}'::jsonb,
 'aucune', NULL, NULL, false, '{}', NULL),
('esrs', 'ESRS (European Sustainability Reporting Standards)', 'environnement', 'reglementaire', 'europe',
 'Normes de reporting associées à la CSRD (mêmes assujettis). ESRS révisés adoptés par la Commission le 03/07/2026 : 60 % de points de données obligatoires en moins ; publication au JOUE attendue au T4 2026 ; application aux exercices 2027, application anticipée possible dès 2026.',
 '{"suit": "csrd"}'::jsonb,
 'aucune', NULL, NULL, false, '{}', NULL),
('eu_taxonomy', 'Taxonomie européenne (règlement (UE) 2020/852)', 'environnement', 'reglementaire', 'europe',
 'Reporting d''alignement des activités sur la taxonomie. Acte délégué simplifié publié au JOUE le 08/01/2026, en vigueur le 28/01/2026, applicable à l''exercice 2026 : seuil de matérialité de 10 % et environ 64 % de points de données en moins pour les entreprises non financières. Entités concernées : celles soumises à la CSRD.',
 '{"suit": "csrd"}'::jsonb,
 'aucune', NULL, NULL, false, '{}', NULL),
('sfdr', 'SFDR (règlement (UE) 2019/2088)', 'environnement', 'reglementaire', 'europe',
 'Informations de durabilité des acteurs des marchés financiers. Règlement en vigueur ; révision (SFDR 2.0) proposée par la Commission le 20/11/2025 avec trois catégories de produits, en cours de négociation. Échéance annuelle du 30/06 : à confirmer.',
 '{"acteur_financier": true}'::jsonb,
 'annuelle', DATE '2026-06-30', NULL, false, '{}', NULL),
('ifrs_s2', 'IFRS S2 (informations liées au climat, ISSB)', 'environnement', 'volontaire', 'international',
 'Norme ISSB d''informations financières liées au climat. Non obligatoire dans l''UE, qui applique les ESRS. Amendements sur les émissions de GES applicables aux exercices ouverts à compter du 01/01/2027 (application anticipée permise).',
 '{}'::jsonb,
 'aucune', NULL, NULL, false, '{}', NULL),
('loi_climat', 'Loi Climat et Résilience, article 35 (commande publique)', 'environnement', 'reglementaire', 'france',
 'Loi n° 2021-1104 du 22/08/2021, article 35 : verdissement de la commande publique pour les marchés et concessions lancés à compter du 22/08/2026. Critère d''attribution environnemental obligatoire en cas de pluralité de critères (L2152-7, R2152-7 ; prix seul interdit) et au moins une condition d''exécution environnementale (L2112-2). Concessions : L3124-5, L3114-2. Pas de sanction propre : annulation de la procédure pour critère imprécis, pénalités contractuelles.',
 '{"types_client": ["collectivite"], "objet": "commande_publique"}'::jsonb,
 'fixe', DATE '2026-08-22', NULL, false, '{}', 'https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000043957012'),
('rgpd', 'RGPD (règlement (UE) 2016/679)', 'it', 'reglementaire', 'europe',
 'Protection des données personnelles : registre des traitements, base légale, droits des personnes, sécurité, notification des violations. Amendes administratives jusqu''à 20 M€ ou 4 % du chiffre d''affaires mondial annuel.',
 '{}'::jsonb,
 'aucune', NULL, NULL, true, '{}', NULL),
('nis2', 'NIS2 (directive (UE) 2022/2555)', 'it', 'reglementaire', 'europe',
 'Cybersécurité des entités essentielles et importantes. Non transposée en France au 11/10/2026 (projet de loi Résilience retiré de l''ordre du jour les 7 et 9 octobre 2026). Texte de commission : entités essentielles à partir de 250 salariés ou 50 M€ de chiffre d''affaires, importantes à partir de 50 salariés. Plafonds de sanction du texte de commission : 10 M€ ou 2 % (essentielles), 7 M€ ou 1,4 % (importantes) ; montants non définitifs.',
 '{"effectif_min_essentielles": 250, "effectif_min_importantes": 50, "transposition": "en_cours"}'::jsonb,
 'aucune', NULL, NULL, true, '{}', NULL),
('reen', 'Loi REEN (empreinte environnementale du numérique)', 'it', 'reglementaire', 'france',
 'Loi n° 2021-1485 du 15/11/2021. Communes et EPCI de plus de 50 000 habitants : stratégie numérique responsable exigible au 01/01/2025. Commande publique : indice de durabilité des produits numériques depuis le 01/01/2026. Aucune obligation précise établie pour les entreprises privées dans la source consultée.',
 '{"types_client": ["collectivite"], "habitants_min": 50000}'::jsonb,
 'fixe', DATE '2025-01-01', NULL, false, '{}', NULL),
('iso27001', 'ISO/IEC 27001 (sécurité de l''information)', 'it', 'volontaire', 'international',
 'Norme de système de management de la sécurité de l''information. Version 2022 : 93 mesures en 4 thèmes. Les certificats ISO 27001:2013 ont cessé d''être valides le 31/10/2025.',
 '{}'::jsonb,
 'aucune', NULL, NULL, false, '{}', NULL)
ON CONFLICT (code) DO NOTHING;