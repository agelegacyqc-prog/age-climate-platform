import React, { useEffect, useState } from 'react';
import { TrendingDown, ShieldCheck, AlertTriangle, Building2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ════════════════════════════════════════════════════════════════
// Notations (cf. formule validée P2-09) :
// Encours_i, LGD_avant_i, Impact_net_avant_i, Impact_net_apres_i, V_i
// Δ_impact_net_i    = Impact_net_apres_i − Impact_net_avant_i
// Valeur_protegee_i = Δ_impact_net_i × V_i
// LGD_reduite_i     = MIN(LGD_avant_i, Valeur_protegee_i / Encours_i)
// LGD_apres_i       = LGD_avant_i − LGD_reduite_i
// ════════════════════════════════════════════════════════════════

interface BienFinanceROI {
  actif_id: string;
  nom_site: string;
  encours_credit: number;
  lgd_avant: number;
  lgd_apres: number | null;
  lgd_reduite: number | null;
  valeur_protegee: number | null;
  valeur_marche: number;
  impact_net_avant: number | null;
  impact_net_apres: number | null;
  statut_calcul: 'calcule' | 'en_attente_post_travaux' | 'pas_de_mandat';
}

interface PortefeuilleROI {
  biens: BienFinanceROI[];
  lgd_reduite_moyenne_ponderee: number;
  valeur_protegee_totale: number;
  encours_total: number;
  nb_biens_calcules: number;
  nb_biens_en_attente: number;
}

function formatEuro(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ') + ' €';
}

function formatPct(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' %';
}

async function chargerPortefeuilleROI(clientId: string): Promise<PortefeuilleROI> {
  // 1. Récupérer les biens financés du client (banque)
  const { data: biensFinances, error: errBf } = await supabase
    .from('biens_finances')
    .select('actif_id, encours_credit, lgd_avant, lgd_apres, valeur_protegee')
    .eq('client_id', clientId);

  if (errBf) throw errBf;
  if (!biensFinances || biensFinances.length === 0) {
    return {
      biens: [],
      lgd_reduite_moyenne_ponderee: 0,
      valeur_protegee_totale: 0,
      encours_total: 0,
      nb_biens_calcules: 0,
      nb_biens_en_attente: 0,
    };
  }

  const actifIds = biensFinances.map((b) => b.actif_id);

  // 2. Récupérer les actifs (nom, valeur marché)
  const { data: actifs, error: errActifs } = await supabase
    .from('actifs')
    .select('id, nom_site, valeur_marche')
    .in('id', actifIds);

  if (errActifs) throw errActifs;

  // 3. Pour chaque actif, dernier case 'initial' et premier case 'post_travaux'
  //    après la date_fin_travaux du mandat lié à cet actif.
  //    NB : bug FK découvert et corrigé le 30/06/2026 — brown_value_cases.bien_id
  //    référence la table biens (espace particulier), pas actifs. Le wizard B2B
  //    écrit désormais dans brown_value_cases.actif_id.
  //    Seuls les cases finalise=true (étape 5 "Terminer") sont des points de référence ;
  //    les brouillons (étapes 1-4) sont ignorés.
  const { data: mandats, error: errMandats } = await supabase
    .from('mandats')
    .select('bien_id, date_fin_travaux')
    .in('bien_id', actifIds)
    .not('date_fin_travaux', 'is', null);

  if (errMandats) throw errMandats;

  const { data: scores, error: errScores } = await supabase
    .from('brown_value_cases')
    .select('actif_id, impact_net, contexte, finalise, created_at')
    .in('actif_id', actifIds)
    .eq('finalise', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (errScores) throw errScores;

  const biens: BienFinanceROI[] = biensFinances.map((bf) => {
    const actif = actifs?.find((a) => a.id === bf.actif_id);
    const mandat = mandats?.find((m) => m.bien_id === bf.actif_id);
    const scoresActif = scores?.filter((s) => s.actif_id === bf.actif_id) ?? [];

    if (!mandat) {
      return {
        actif_id: bf.actif_id,
        nom_site: actif?.nom_site ?? 'Actif inconnu',
        encours_credit: bf.encours_credit,
        lgd_avant: bf.lgd_avant,
        lgd_apres: null,
        lgd_reduite: null,
        valeur_protegee: null,
        valeur_marche: actif?.valeur_marche ?? 0,
        impact_net_avant: null,
        impact_net_apres: null,
        statut_calcul: 'pas_de_mandat',
      };
    }

    const dateFinTravaux = new Date(mandat.date_fin_travaux as string);

    const scoreInitial = [...scoresActif]
      .filter((s) => s.contexte === 'initial' && new Date(s.created_at) < dateFinTravaux)
      .pop(); // le plus récent avant travaux

    const scorePostTravaux = scoresActif.find(
      (s) => s.contexte === 'post_travaux' && new Date(s.created_at) > dateFinTravaux
    ); // le premier après travaux

    if (!scoreInitial || !scorePostTravaux) {
      return {
        actif_id: bf.actif_id,
        nom_site: actif?.nom_site ?? 'Actif inconnu',
        encours_credit: bf.encours_credit,
        lgd_avant: bf.lgd_avant,
        lgd_apres: null,
        lgd_reduite: null,
        valeur_protegee: null,
        valeur_marche: actif?.valeur_marche ?? 0,
        impact_net_avant: scoreInitial?.impact_net ?? null,
        impact_net_apres: null,
        statut_calcul: 'en_attente_post_travaux',
      };
    }

    const V = actif?.valeur_marche ?? 0;
    const deltaImpactNet = scorePostTravaux.impact_net - scoreInitial.impact_net;
    const valeurProtegee = deltaImpactNet * V;
    const lgdReduite = Math.min(bf.lgd_avant, (valeurProtegee / bf.encours_credit) * 100);
    const lgdApres = bf.lgd_avant - lgdReduite;

    return {
      actif_id: bf.actif_id,
      nom_site: actif?.nom_site ?? 'Actif inconnu',
      encours_credit: bf.encours_credit,
      lgd_avant: bf.lgd_avant,
      lgd_apres: lgdApres,
      lgd_reduite: lgdReduite,
      valeur_protegee: valeurProtegee,
      valeur_marche: V,
      impact_net_avant: scoreInitial.impact_net,
      impact_net_apres: scorePostTravaux.impact_net,
      statut_calcul: 'calcule',
    };
  });

  const biensCalcules = biens.filter((b) => b.statut_calcul === 'calcule');
  const encoursTotal = biens.reduce((sum, b) => sum + b.encours_credit, 0);
  const encoursCalcules = biensCalcules.reduce((sum, b) => sum + b.encours_credit, 0);
  const valeurProtegeeTotale = biensCalcules.reduce((sum, b) => sum + (b.valeur_protegee ?? 0), 0);
  const lgdPonderee =
    encoursCalcules > 0
      ? biensCalcules.reduce((sum, b) => sum + (b.lgd_reduite ?? 0) * b.encours_credit, 0) / encoursCalcules
      : 0;

  return {
    biens,
    lgd_reduite_moyenne_ponderee: lgdPonderee,
    valeur_protegee_totale: valeurProtegeeTotale,
    encours_total: encoursTotal,
    nb_biens_calcules: biensCalcules.length,
    nb_biens_en_attente: biens.filter((b) => b.statut_calcul === 'en_attente_post_travaux').length,
  };
}

export default function Analytics({ clientId }: { clientId: string }) {
  const [data, setData] = useState<PortefeuilleROI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    chargerPortefeuilleROI(clientId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return <div style={{ padding: 24, color: '#78716C' }}>Chargement des indicateurs ROI…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={18} />
        Erreur de chargement : {error}
      </div>
    );
  }

  if (!data || data.biens.length === 0) {
    return (
      <div style={{ padding: 24, color: '#78716C' }}>
        Aucun bien financé renseigné pour ce client. Ajoutez des biens financés depuis la fiche client.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, sans-serif', color: '#1F2937' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Analytics ROI — LGD réduite</h2>
      <p style={{ color: '#78716C', fontSize: 13, marginBottom: 24 }}>
        Valeur protégée et réduction de LGD apportées par les travaux d'adaptation réalisés sur le portefeuille financé.
      </p>

      {/* Bandeau KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard
          icon={<Building2 size={18} />}
          label="Encours total"
          value={formatEuro(data.encours_total)}
          color="#1F2937"
        />
        <KpiCard
          icon={<ShieldCheck size={18} />}
          label="Valeur protégée"
          value={formatEuro(data.valeur_protegee_totale)}
          color="#2F7D5C"
        />
        <KpiCard
          icon={<TrendingDown size={18} />}
          label="LGD réduite (pondérée)"
          value={formatPct(data.lgd_reduite_moyenne_ponderee)}
          color="#0369A1"
        />
        <KpiCard
          icon={<Info size={18} />}
          label="Biens en attente de recalcul"
          value={String(data.nb_biens_en_attente)}
          color={data.nb_biens_en_attente > 0 ? '#D97706' : '#78716C'}
        />
      </div>

      {/* Tableau détail par bien */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E1DA', textAlign: 'left', color: '#78716C' }}>
            <th style={{ padding: '8px 12px' }}>Bien</th>
            <th style={{ padding: '8px 12px' }}>Encours</th>
            <th style={{ padding: '8px 12px' }}>LGD avant</th>
            <th style={{ padding: '8px 12px' }}>LGD après</th>
            <th style={{ padding: '8px 12px' }}>Valeur protégée</th>
            <th style={{ padding: '8px 12px' }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {data.biens.map((b) => (
            <tr key={b.actif_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{b.nom_site}</td>
              <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatEuro(b.encours_credit)}
              </td>
              <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatPct(b.lgd_avant)}
              </td>
              <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                {b.lgd_apres !== null ? formatPct(b.lgd_apres) : '—'}
              </td>
              <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                {b.valeur_protegee !== null ? formatEuro(b.valeur_protegee) : '—'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <StatutBadge statut={b.statut_calcul} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#78716C', fontSize: 12, marginBottom: 8 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function StatutBadge({ statut }: { statut: BienFinanceROI['statut_calcul'] }) {
  const config = {
    calcule: { label: 'Calculé', bg: '#E1F5EE', fg: '#0F6E56' },
    en_attente_post_travaux: { label: 'Attente recalcul post-travaux', bg: '#FEF3E2', fg: '#D97706' },
    pas_de_mandat: { label: 'Pas de mandat lié', bg: '#F1F5F9', fg: '#78716C' },
  }[statut];

  return (
    <span
      style={{
        background: config.bg,
        color: config.fg,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {config.label}
    </span>
  );
}