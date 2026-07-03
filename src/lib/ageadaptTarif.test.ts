// src/lib/ageadaptTarif.test.ts
//
// Tests unitaires du simulateur tarifaire AGEadapt (P3-22).
// Jeux de validation dérivés du tableau base_j (§4.1) + recalage §4.2.
// Framework : Vitest. Imports explicites → aucune config `globals` requise.

import { describe, it, expect } from 'vitest';
import {
  simulerTarif,
  calculerDureeMois,
  round0,
  TJM_DEFAUT,
  type EntreesTarif,
  type MethodeAgeadapt,
} from './ageadaptTarif';

const METHODES: MethodeAgeadapt[] = ['abc', 'act', 'vuln', 'full'];

// ─────────────────────────────────────────────────────────────────────────────
// round0 — équivalent Excel ROUND(x,0), robuste IEEE-754
// ─────────────────────────────────────────────────────────────────────────────
describe('round0', () => {
  it('arrondit le demi vers le haut', () => {
    expect(round0(2.5)).toBe(3);
    expect(round0(11.5)).toBe(12);
    expect(round0(0.5)).toBe(1);
  });

  it('gère le bruit binaire IEEE-754 (piège 50 × 1.15)', () => {
    // 50 * 1.15 === 57.49999999999999 ; Math.round donnerait 57 (faux), §4.1 attend 58.
    expect(50 * 1.15).not.toBe(57.5); // confirme le bruit binaire
    expect(Math.round(50 * 1.15)).toBe(57); // ce que round0 doit corriger
    expect(round0(50 * 1.15)).toBe(58);
  });

  it('n’altère pas les valeurs franches sous le demi', () => {
    expect(round0(11.4)).toBe(11);
    expect(round0(25.65)).toBe(26);
    expect(round0(131.1)).toBe(131);
    expect(round0(0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculerDureeMois — bornes §4.1 (supérieures inclusives, pas de « 5 mois »)
// ─────────────────────────────────────────────────────────────────────────────
describe('calculerDureeMois', () => {
  const cas: Array<[number, number]> = [
    [1, 1], [6, 1],
    [7, 2], [12, 2],
    [13, 3], [20, 3],
    [21, 4], [30, 4],
    [31, 6], [64, 6],
  ];
  it.each(cas)('j=%i → %i mois', (j, mois) => {
    expect(calculerDureeMois(j)).toBe(mois);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Golden cases — dérivés à la main de §4.1 / §4.2
// ─────────────────────────────────────────────────────────────────────────────
describe('simulerTarif — jeux de validation §4.1', () => {
  interface Golden {
    label: string;
    in: EntreesTarif;
    j: number;
    duree: number;
    tL: number;
    tH: number;
    milieu: number;
    phases: Array<{ pct: number; jours: number; montant: number }>;
  }

  const goldens: Golden[] = [
    {
      label: 'Cas 1 — ABC · 1–10 · 1 site · 1er bilan · maturité faible',
      in: { methode: 'abc', effectifTranche: 1, nbSitesTranche: 1, bilanExistant: false, maturiteDonnees: 1 },
      // base 3 × 1.0 × 1.0 × 1.0 = 3
      j: 3, duree: 1, tL: 2600, tH: 3300, milieu: 2950,
      phases: [
        { pct: 35, jours: 1, montant: 1033 },
        { pct: 35, jours: 1, montant: 1033 },
        { pct: 30, jours: 1, montant: 884 },
      ],
    },
    {
      label: 'Cas 2 — Mission complète · 1 000+ · 10+ sites · 1er bilan · maturité élevée',
      in: { methode: 'full', effectifTranche: 6, nbSitesTranche: 4, bilanExistant: false, maturiteDonnees: 3 },
      // base 50 × 1.6 × 1.0 × 0.8 = 64
      j: 64, duree: 6, tL: 54700, tH: 69900, milieu: 62300,
      phases: [
        { pct: 30, jours: 19, montant: 18690 },
        { pct: 40, jours: 26, montant: 24920 },
        { pct: 30, jours: 19, montant: 18690 },
      ],
    },
    {
      label: 'Cas 3 — Diagnostic vulnérabilité · 50–249 · 2–3 sites · BILAN EXISTANT (§4.2) · maturité moyenne',
      in: { methode: 'vuln', effectifTranche: 3, nbSitesTranche: 2, bilanExistant: true, maturiteDonnees: 2 },
      // base 12 × 1.15 × 0.65 × 0.9 = 8.073 → 8
      j: 8, duree: 2, tL: 6800, tH: 8700, milieu: 7750,
      phases: [
        { pct: 40, jours: 3, montant: 3100 },
        { pct: 35, jours: 3, montant: 2713 },
        { pct: 25, jours: 2, montant: 1937 },
      ],
    },
    {
      label: 'Cas 4 — ABC · 250–499 · 2–3 sites · 1er bilan · maturité faible (piège arrondi 11,5 → 12)',
      in: { methode: 'abc', effectifTranche: 4, nbSitesTranche: 2, bilanExistant: false, maturiteDonnees: 1 },
      // base 10 × 1.15 × 1.0 × 1.0 = 11.5 → 12
      j: 12, duree: 2, tL: 10300, tH: 13100, milieu: 11700,
      phases: [
        { pct: 35, jours: 4, montant: 4095 },
        { pct: 35, jours: 4, montant: 4095 },
        { pct: 30, jours: 4, montant: 3510 },
      ],
    },
    {
      label: 'Cas 5 — Mission complète · 1 000+ · 2–3 sites · 1er bilan · maturité faible (piège arrondi 57,5 → 58)',
      in: { methode: 'full', effectifTranche: 6, nbSitesTranche: 2, bilanExistant: false, maturiteDonnees: 1 },
      // base 50 × 1.15 × 1.0 × 1.0 = 57.5 → 58 (round0 ; Math.round donnerait 57)
      j: 58, duree: 6, tL: 49600, tH: 63400, milieu: 56500,
      phases: [
        { pct: 30, jours: 17, montant: 16950 },
        { pct: 40, jours: 23, montant: 22600 },
        { pct: 30, jours: 18, montant: 16950 },
      ],
    },
  ];

  it.each(goldens)('$label', (g) => {
    const r = simulerTarif(g.in);
    expect(r.joursConsultant).toBe(g.j);
    expect(r.dureeMois).toBe(g.duree);
    expect(r.tarifBasHt).toBe(g.tL);
    expect(r.tarifHautHt).toBe(g.tH);
    expect(r.milieuHt).toBe(g.milieu);

    expect(r.phases).toHaveLength(3);
    g.phases.forEach((p, i) => {
      expect(r.phases[i].pct).toBe(p.pct);
      expect(r.phases[i].jours).toBe(p.jours);
      expect(r.phases[i].montant).toBe(p.montant);
    });

    // Invariants de décomposition
    expect(r.phases.reduce((s, p) => s + p.jours, 0)).toBe(g.j);
    expect(r.phases.reduce((s, p) => s + p.montant, 0)).toBe(g.milieu);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4.2 — le recalage bilan existant réduit bien j (reduc_existant = 0.65)
// ─────────────────────────────────────────────────────────────────────────────
describe('recalage §4.2 — bilan existant', () => {
  it('réduit j par rapport à un premier bilan (12,42 → 12 vs 8,07 → 8)', () => {
    const base: Omit<EntreesTarif, 'bilanExistant'> = {
      methode: 'vuln', effectifTranche: 3, nbSitesTranche: 2, maturiteDonnees: 2,
    };
    const premier = simulerTarif({ ...base, bilanExistant: false });
    const misAJour = simulerTarif({ ...base, bilanExistant: true });
    expect(premier.joursConsultant).toBe(12);
    expect(misAJour.joursConsultant).toBe(8);
    expect(misAJour.joursConsultant).toBeLessThan(premier.joursConsultant);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Effet maturité — meilleure maturité = moins de jours
// ─────────────────────────────────────────────────────────────────────────────
describe('effet maturité des données', () => {
  it('maturité élevée < moyenne < faible (à autres paramètres égaux)', () => {
    const base: Omit<EntreesTarif, 'maturiteDonnees'> = {
      methode: 'full', effectifTranche: 6, nbSitesTranche: 4, bilanExistant: false,
    };
    const faible = simulerTarif({ ...base, maturiteDonnees: 1 }).joursConsultant; // ×1.0 → 80
    const moyen = simulerTarif({ ...base, maturiteDonnees: 2 }).joursConsultant;  // ×0.9 → 72
    const eleve = simulerTarif({ ...base, maturiteDonnees: 3 }).joursConsultant;  // ×0.8 → 64
    expect(faible).toBe(80);
    expect(moyen).toBe(72);
    expect(eleve).toBe(64);
    expect(eleve).toBeLessThan(moyen);
    expect(moyen).toBeLessThan(faible);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TJM paramétrable — proportionnalité des honoraires
// ─────────────────────────────────────────────────────────────────────────────
describe('TJM de référence', () => {
  it('défaut = 950', () => {
    expect(TJM_DEFAUT).toBe(950);
    expect(simulerTarif({ methode: 'abc', effectifTranche: 1, nbSitesTranche: 1, bilanExistant: false, maturiteDonnees: 1 }).tjm).toBe(950);
  });

  it('un TJM override recalcule tL/tH', () => {
    const r = simulerTarif({ methode: 'abc', effectifTranche: 1, nbSitesTranche: 1, bilanExistant: false, maturiteDonnees: 1, tjm: 1000 });
    // j=3 ; tL = round(3×1000×0.9/100)×100 = round(27)×100 = 2700 ; tH = round(3×1000×1.15/100)×100 = round(34.5)×100 = 3500
    expect(r.tarifBasHt).toBe(2700);
    expect(r.tarifHautHt).toBe(3500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Garde-fous — bornes des CHECK ageadapt_missions
// ─────────────────────────────────────────────────────────────────────────────
describe('garde-fous de bornes', () => {
  const valide: EntreesTarif = { methode: 'abc', effectifTranche: 1, nbSitesTranche: 1, bilanExistant: false, maturiteDonnees: 1 };

  it('effectifTranche hors [1..6]', () => {
    expect(() => simulerTarif({ ...valide, effectifTranche: 0 })).toThrow();
    expect(() => simulerTarif({ ...valide, effectifTranche: 7 })).toThrow();
  });
  it('nbSitesTranche hors [1..4]', () => {
    expect(() => simulerTarif({ ...valide, nbSitesTranche: 0 })).toThrow();
    expect(() => simulerTarif({ ...valide, nbSitesTranche: 5 })).toThrow();
  });
  it('maturiteDonnees hors [1..3]', () => {
    expect(() => simulerTarif({ ...valide, maturiteDonnees: 0 })).toThrow();
    expect(() => simulerTarif({ ...valide, maturiteDonnees: 4 })).toThrow();
  });
  it('tranche non entière rejetée', () => {
    expect(() => simulerTarif({ ...valide, effectifTranche: 2.5 })).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Balayage exhaustif — invariants sur les 576 combinaisons
// (4 méthodes × 6 effectifs × 4 sites × 3 maturités × 2 bilans)
// ─────────────────────────────────────────────────────────────────────────────
describe('invariants sur toutes les combinaisons', () => {
  it('j entier ≥ 1 ; Σ jours = j ; Σ montants = milieu ; tL,tH multiples de 100 ; tL ≤ tH', () => {
    let n = 0;
    for (const methode of METHODES) {
      for (let eff = 1; eff <= 6; eff++) {
        for (let sites = 1; sites <= 4; sites++) {
          for (let mat = 1; mat <= 3; mat++) {
            for (const bilanExistant of [false, true]) {
              const r = simulerTarif({ methode, effectifTranche: eff, nbSitesTranche: sites, bilanExistant, maturiteDonnees: mat });

              expect(Number.isInteger(r.joursConsultant)).toBe(true);
              expect(r.joursConsultant).toBeGreaterThanOrEqual(1);

              expect(r.tarifBasHt % 100).toBe(0);
              expect(r.tarifHautHt % 100).toBe(0);
              expect(r.tarifBasHt).toBeLessThanOrEqual(r.tarifHautHt);

              const sommeJours = r.phases.reduce((s, p) => s + p.jours, 0);
              const sommeMontants = r.phases.reduce((s, p) => s + p.montant, 0);
              expect(sommeJours).toBe(r.joursConsultant);
              expect(sommeMontants).toBe(r.milieuHt);

              r.phases.forEach((p) => {
                expect(p.jours).toBeGreaterThanOrEqual(0);
                expect(p.montant).toBeGreaterThanOrEqual(0);
              });
              n++;
            }
          }
        }
      }
    }
    expect(n).toBe(4 * 6 * 4 * 3 * 2); // 576
  });
});