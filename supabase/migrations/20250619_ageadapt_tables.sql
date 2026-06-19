-- AGEadapt v1.1 — Migration tables
-- 19/06/2025

CREATE TABLE ageadapt_missions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  raison_sociale        TEXT NOT NULL,
  siren                 TEXT,
  type_structure        TEXT CHECK (type_structure IN ('entreprise','collectivite','asso')),
  secteur_naf           TEXT,
  effectif_tranche      INT CHECK (effectif_tranche BETWEEN 1 AND 6),
  nb_sites_tranche      INT CHECK (nb_sites_tranche BETWEEN 1 AND 4),
  region                TEXT,
  risque_operationnel   JSONB DEFAULT '{}',
  risque_assuranciel    JSONB DEFAULT '{}',
  risque_financier      JSONB DEFAULT '{}',
  horizons              TEXT[] DEFAULT '{}',
  mesures_pnacc         TEXT[] DEFAULT '{}',
  tracc_utilisee        BOOLEAN DEFAULT false,
  bilan_existant        BOOLEAN DEFAULT false,
  diagnostic_existant   BOOLEAN DEFAULT false,
  plan_transition_init  BOOLEAN DEFAULT false,
  pcaet_adopte          BOOLEAN DEFAULT false,
  act_test_realise      BOOLEAN DEFAULT false,
  methode               TEXT CHECK (methode IN ('abc','act','vuln','full')),
  scope1                BOOLEAN DEFAULT true,
  scope2                BOOLEAN DEFAULT true,
  scope3_transport      BOOLEAN DEFAULT true,
  scope3_achats         BOOLEAN DEFAULT true,
  scope3_produits       BOOLEAN DEFAULT false,
  scope3_autres         BOOLEAN DEFAULT false,
  aleas                 TEXT[] DEFAULT '{}',
  jours_consultant      INT,
  duree_mois            INT,
  tarif_bas_ht          INT,
  tarif_haut_ht         INT,
  maturite_donnees      INT CHECK (maturite_donnees BETWEEN 1 AND 3),
  etape_courante        INT DEFAULT 1 CHECK (etape_courante BETWEEN 1 AND 5),
  statut                TEXT DEFAULT 'brouillon'
                          CHECK (statut IN ('brouillon','actif','en_cours','termine','archive')),
  consultant_id         UUID REFERENCES profils(id),
  region_code           TEXT,
  organisation_id       UUID,
  archived_at           TIMESTAMPTZ
);

CREATE TABLE ageadapt_bilans_imports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id          UUID REFERENCES ageadapt_missions(id) ON DELETE CASCADE,
  uploaded_at         TIMESTAMPTZ DEFAULT now(),
  uploaded_by         UUID REFERENCES profils(id),
  filename            TEXT,
  file_size_kb        INT,
  format              TEXT CHECK (format IN ('pdf','xlsx_orki','beges')),
  total_tco2e         NUMERIC(12,2),
  scope1_pct          NUMERIC(5,2),
  scope2_pct          NUMERIC(5,2),
  scope3_pct          NUMERIC(5,2),
  annee_reporting     INT,
  methode_utilisee    TEXT,
  intensite_ca        NUMERIC(8,4),
  intensite_employe   NUMERIC(8,2),
  poste_majeur_1      TEXT,
  poste_majeur_1_pct  NUMERIC(5,2),
  poste_majeur_2      TEXT,
  poste_majeur_2_pct  NUMERIC(5,2),
  objectif_reduction  NUMERIC(5,2),
  extraction_status   TEXT DEFAULT 'pending'
                        CHECK (extraction_status IN ('pending','success','partial','failed')),
  extraction_notes    TEXT
);

CREATE TABLE ageadapt_simulations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id        UUID REFERENCES ageadapt_missions(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        UUID REFERENCES profils(id),
  type_structure    TEXT,
  effectif_tranche  INT,
  nb_sites_tranche  INT,
  methode           TEXT,
  bilan_existant    BOOLEAN,
  maturite_donnees  INT,
  jours_consultant  INT,
  duree_mois        INT,
  tarif_bas_ht      INT,
  tarif_haut_ht     INT,
  tjm_reference     INT DEFAULT 950,
  phase1_jours      INT,
  phase1_pct        INT,
  phase1_montant    INT,
  phase2_jours      INT,
  phase2_pct        INT,
  phase2_montant    INT,
  phase3_jours      INT,
  phase3_pct        INT,
  phase3_montant    INT
);

CREATE TABLE ageadapt_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id        UUID REFERENCES ageadapt_missions(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  intitule          TEXT NOT NULL,
  thematique        TEXT,
  type_action       TEXT CHECK (type_action IN ('pilotage','operationnelle','interne')),
  mesure_pnacc      TEXT,
  categorie_risque  TEXT CHECK (categorie_risque IN ('operationnel','assuranciel','financier')),
  horizon           TEXT CHECK (horizon IN ('2030','2040','2050','2100')),
  gain_ges_tco2e    NUMERIC(10,2),
  gain_pct_bilan    NUMERIC(5,2),
  potentiel         TEXT CHECK (potentiel IN ('faible','moyen','fort')),
  statut            TEXT DEFAULT 'a_lancer'
                      CHECK (statut IN ('a_lancer','en_cours','realise','abandonne')),
  indicateur_suivi  TEXT,
  objectif_cible    TEXT,
  echeance          DATE,
  responsable       TEXT
);

-- RLS
ALTER TABLE ageadapt_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ageadapt_bilans_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ageadapt_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ageadapt_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ageadapt_missions_read" ON ageadapt_missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils p WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin','admin_national')
        OR (p.role = 'responsable_regional' AND region_code = p.region)
        OR (p.role = 'consultant' AND consultant_id = auth.uid())
      )
    )
  );

CREATE POLICY "ageadapt_missions_write" ON ageadapt_missions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils p WHERE p.id = auth.uid()
      AND p.role IN ('admin','admin_national','responsable_regional','consultant')
    )
  );
  -- AGEcarbon v1.0 — tables et facteurs d'émission

CREATE TABLE abc_facteurs_emission (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poste             TEXT NOT NULL,
  sous_poste        TEXT,
  libelle           TEXT NOT NULL,
  source            TEXT DEFAULT 'Base Carbone ADEME',
  unite_physique    TEXT,
  facteur_kg_co2e   NUMERIC(12,6) NOT NULL,
  incertitude_pct   NUMERIC(5,2),
  scope             INT CHECK (scope IN (1,2,3)),
  actif             BOOLEAN DEFAULT true
);

CREATE TABLE abc_bilans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  raison_sociale    TEXT NOT NULL,
  siren             TEXT,
  secteur_naf       TEXT,
  effectif          INT,
  chiffre_affaires  NUMERIC(15,2),
  annee_reporting   INT NOT NULL,
  perimetre_geo     TEXT DEFAULT 'France métropolitaine',
  mode_consolidation TEXT DEFAULT 'operationnel',
  statut            TEXT DEFAULT 'en_cours'
                      CHECK (statut IN ('en_cours','finalise','archive')),
  consultant_id     UUID REFERENCES profils(id),
  region_code       TEXT,
  total_scope1      NUMERIC(12,2) DEFAULT 0,
  total_scope2      NUMERIC(12,2) DEFAULT 0,
  total_scope3      NUMERIC(12,2) DEFAULT 0,
  total_tco2e       NUMERIC(12,2) DEFAULT 0,
  intensite_ca      NUMERIC(10,4),
  intensite_employe NUMERIC(10,4)
);

CREATE TABLE abc_saisies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id          UUID REFERENCES abc_bilans(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  poste             TEXT NOT NULL,
  sous_poste        TEXT,
  libelle_saisie    TEXT,
  facteur_id        UUID REFERENCES abc_facteurs_emission(id),
  mode_saisie       TEXT CHECK (mode_saisie IN ('physique','monetaire')),
  quantite          NUMERIC(15,4),
  unite             TEXT,
  montant_eur       NUMERIC(15,2),
  ratio_monetaire   NUMERIC(12,6),
  kg_co2e           NUMERIC(12,2),
  incertitude_pct   NUMERIC(5,2),
  scope             INT CHECK (scope IN (1,2,3)),
  hypothese         TEXT,
  source_donnee     TEXT
);

CREATE TABLE abc_resultats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id          UUID REFERENCES abc_bilans(id) ON DELETE CASCADE,
  calculated_at     TIMESTAMPTZ DEFAULT now(),
  poste             TEXT NOT NULL,
  scope             INT,
  total_kg_co2e     NUMERIC(12,2),
  pct_total         NUMERIC(5,2)
);