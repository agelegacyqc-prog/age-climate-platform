// ScoreHistorique.tsx — Historique des scores climatiques
// Module P2-07 · M05
// Intégrable dans FicheBien.tsx et FicheActif.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, Save, Clock, User, Info
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ClasseRisque = 'faible' | 'modere' | 'eleve' | 'critique'

interface RiskScore {
  id: string
  created_at: string
  score_global: number
  classe_risque: ClasseRisque
  alea_principal: string | null
  scores_aleas: Record<string, number>
  calcule_par: string | null
  note: string | null
  source: string
}

interface AlerteScore {
  id: string
  created_at: string
  type_alerte: string
  classe_avant: string | null
  classe_apres: string | null
  score_avant: number | null
  score_apres: number | null
  delta_points: number | null
  lu: boolean
}

interface Props {
  bienId?: string
  actifId?: string
  scoreActuel?: number
  classeActuelle?: ClasseRisque
  aleaPrincipal?: string
  scoresAleas?: Record<string, number>
  modeClient?: boolean   // true = vue client simplifiée
}

// ── Config classes ────────────────────────────────────────────────────────────

const CLASSE_CONFIG: Record<ClasseRisque, {
  label: string; couleur: string; fond: string; seuil: number
}> = {
  faible:   { label: 'Faible',   couleur: '#0F6E56', fond: '#ECFDF5', seuil: 25 },
  modere:   { label: 'Modéré',   couleur: '#D97706', fond: '#FFFBEB', seuil: 50 },
  eleve:    { label: 'Élevé',    couleur: '#B91C1C', fond: '#FEF2F2', seuil: 75 },
  critique: { label: 'Critique', couleur: '#7C3AED', fond: '#F5F3FF', seuil: 100 },
}

const COULEUR_SCORE = (score: number): string => {
  if (score <= 25) return '#0F6E56'
  if (score <= 50) return '#D97706'
  if (score <= 75) return '#B91C1C'
  return '#7C3AED'
}

// ── Tooltip personnalisé ──────────────────────────────────────────────────────

function TooltipScore({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const cfg = CLASSE_CONFIG[d.classe_risque as ClasseRisque]
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E1DA', borderRadius: 10,
      padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      minWidth: 180
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: '#78716C' }}>
        {new Date(d.date_iso).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'long', year: 'numeric'
        })}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700,
          color: COULEUR_SCORE(d.score_global)
        }}>
          {d.score_global}
        </span>
        <span style={{ fontSize: 12, color: '#78716C' }}>/100</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
          background: cfg?.fond, color: cfg?.couleur
        }}>
          {cfg?.label}
        </span>
      </div>
      {d.alea_principal && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#78716C' }}>
          Aléa principal : {d.alea_principal}
        </p>
      )}
      {d.delta !== null && d.delta !== undefined && (
        <p style={{
          margin: '6px 0 0', fontSize: 11, fontWeight: 600,
          color: d.delta > 0 ? '#B91C1C' : d.delta < 0 ? '#0F6E56' : '#78716C'
        }}>
          {d.delta > 0 ? `+${d.delta}` : d.delta} pts vs précédent
        </p>
      )}
      {d.note && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#78716C', fontStyle: 'italic' }}>
          {d.note}
        </p>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ScoreHistorique({
  bienId, actifId, scoreActuel, classeActuelle, aleaPrincipal, scoresAleas, modeClient = false
}: Props) {
  const [historique, setHistorique] = useState<RiskScore[]>([])
  const [alertes, setAlertes] = useState<AlerteScore[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => { charger() }, [bienId, actifId])

  async function charger() {
    setLoading(true)
    const filtre = bienId ? { column: 'bien_id', value: bienId }
                          : { column: 'actif_id', value: actifId ?? '' }

    const [{ data: scores }, { data: alerts }] = await Promise.all([
      supabase.from('risk_scores')
        .select('*')
        .eq(filtre.column, filtre.value)
        .order('created_at', { ascending: true }),
      supabase.from('alertes_scores')
        .select('*')
        .eq(filtre.column, filtre.value)
        .eq('lu', false)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    setHistorique(scores ?? [])
    setAlertes(alerts ?? [])
    setLoading(false)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function sauvegarderScore() {
    if (scoreActuel === undefined || !classeActuelle) {
      showToast('err', 'Aucun score à sauvegarder')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profils').select('region').eq('id', user?.id ?? '').maybeSingle()

    const { data: saved, error } = await supabase.from('risk_scores').insert({
      bien_id: bienId ?? null,
      actif_id: actifId ?? null,
      score_global: scoreActuel,
      classe_risque: classeActuelle,
      alea_principal: aleaPrincipal ?? null,
      scores_aleas: scoresAleas ?? {},
      calcule_par: user?.id,
      region_code: profil?.region ?? null,
      note: note.trim() || null,
      source: 'manuel',
    }).select().maybeSingle()

    if (error) { setSaving(false); showToast('err', 'Erreur lors de la sauvegarde'); return }

    // Détecter alertes
    const dernier = historique[historique.length - 1]
    if (dernier && saved) {
      const delta = scoreActuel - dernier.score_global
      const classeChange = dernier.classe_risque !== classeActuelle

      const alertesAInserer: any[] = []

      if (classeChange) {
        alertesAInserer.push({
          bien_id: bienId ?? null,
          actif_id: actifId ?? null,
          risk_score_id: saved.id,
          type_alerte: 'changement_classe',
          classe_avant: dernier.classe_risque,
          classe_apres: classeActuelle,
          score_avant: dernier.score_global,
          score_apres: scoreActuel,
          delta_points: delta,
          region_code: profil?.region ?? null,
          consultant_id: user?.id,
        })
      }

      if (Math.abs(delta) >= 10) {
        alertesAInserer.push({
          bien_id: bienId ?? null,
          actif_id: actifId ?? null,
          risk_score_id: saved.id,
          type_alerte: 'variation_points',
          score_avant: dernier.score_global,
          score_apres: scoreActuel,
          delta_points: delta,
          region_code: profil?.region ?? null,
          consultant_id: user?.id,
        })
      }

      if (alertesAInserer.length > 0) {
        await supabase.from('alertes_scores').insert(alertesAInserer)
      }
    }

    setSaving(false)
    setNote('')
    setNoteOpen(false)
    showToast('ok', 'Score sauvegardé avec succès')
    charger()
  }

  async function marquerAlerteLue(id: string) {
    await supabase.from('alertes_scores').update({
      lu: true, lu_at: new Date().toISOString()
    }).eq('id', id)
    setAlertes(prev => prev.filter(a => a.id !== id))
  }

  // Préparer données graphique
  const dataGraphique = historique.map((s, i) => ({
    date_iso: s.created_at,
    date: new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    score_global: s.score_global,
    classe_risque: s.classe_risque,
    alea_principal: s.alea_principal,
    note: s.note,
    delta: i > 0 ? s.score_global - historique[i - 1].score_global : null,
  }))

  const dernierScore = historique[historique.length - 1]
  const avantDernierScore = historique[historique.length - 2]
  const delta = dernierScore && avantDernierScore
    ? dernierScore.score_global - avantDernierScore.score_global
    : null
  const scoreAChange = dernierScore?.score_global !== scoreActuel

  // Vue client simplifiée
  if (modeClient) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
        padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
          SCORE CLIMATIQUE
        </p>
        {dernierScore ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700,
              color: COULEUR_SCORE(dernierScore.score_global)
            }}>
              {dernierScore.score_global}
            </span>
            <div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: CLASSE_CONFIG[dernierScore.classe_risque]?.fond,
                color: CLASSE_CONFIG[dernierScore.classe_risque]?.couleur,
                display: 'block', marginBottom: 4
              }}>
                {CLASSE_CONFIG[dernierScore.classe_risque]?.label}
              </span>
              <span style={{ fontSize: 11, color: '#78716C' }}>
                Mis à jour le {new Date(dernierScore.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#78716C' }}>Score non encore calculé.</p>
        )}
      </div>
    )
  }

  // Vue métier complète
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 18px', borderRadius: 10,
          background: toast.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'ok' ? '#6EE7B7' : '#FECACA'}`,
          color: toast.type === 'ok' ? '#065F46' : '#991B1B',
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.10)'
        }}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Alertes non lues */}
      {alertes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertes.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10,
              background: a.type_alerte === 'changement_classe' ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${a.type_alerte === 'changement_classe' ? '#FECACA' : '#FDE68A'}`,
            }}>
              <AlertTriangle size={16} color={a.type_alerte === 'changement_classe' ? '#B91C1C' : '#D97706'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12 }}>
                {a.type_alerte === 'changement_classe' ? (
                  <span>
                    <strong>Changement de classe</strong> — {a.classe_avant} → <strong>{a.classe_apres}</strong>
                    {a.delta_points !== null && (
                      <span style={{ marginLeft: 8, color: (a.delta_points ?? 0) > 0 ? '#B91C1C' : '#0F6E56' }}>
                        ({(a.delta_points ?? 0) > 0 ? '+' : ''}{a.delta_points} pts)
                      </span>
                    )}
                  </span>
                ) : (
                  <span>
                    <strong>Variation significative</strong> — {a.score_avant} → {a.score_apres}
                    <span style={{ marginLeft: 8, color: (a.delta_points ?? 0) > 0 ? '#B91C1C' : '#0F6E56' }}>
                      ({(a.delta_points ?? 0) > 0 ? '+' : ''}{a.delta_points} pts)
                    </span>
                  </span>
                )}
                <span style={{ display: 'block', color: '#78716C', marginTop: 2 }}>
                  {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <button onClick={() => marquerAlerteLue(a.id)} style={{
                padding: '4px 10px', border: '1px solid #E5E1DA', borderRadius: 6,
                background: '#fff', fontSize: 11, color: '#78716C', cursor: 'pointer', flexShrink: 0
              }}>
                Traité
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI + bouton sauvegarde */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
        padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', align: 'center', gap: 20 }}>
          {/* Score actuel */}
          {scoreActuel !== undefined && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#78716C', fontWeight: 600 }}>
                SCORE ACTUEL
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700,
                  color: COULEUR_SCORE(scoreActuel)
                }}>
                  {scoreActuel}
                </span>
                <span style={{ fontSize: 12, color: '#78716C' }}>/100</span>
                {classeActuelle && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: CLASSE_CONFIG[classeActuelle]?.fond,
                    color: CLASSE_CONFIG[classeActuelle]?.couleur, marginLeft: 4
                  }}>
                    {CLASSE_CONFIG[classeActuelle]?.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Delta */}
          {delta !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {delta > 0 ? <TrendingUp size={20} color="#B91C1C" /> :
               delta < 0 ? <TrendingDown size={20} color="#0F6E56" /> :
               <Minus size={20} color="#78716C" />}
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#78716C', fontWeight: 600 }}>VS PRÉCÉDENT</p>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
                  color: delta > 0 ? '#B91C1C' : delta < 0 ? '#0F6E56' : '#78716C'
                }}>
                  {delta > 0 ? '+' : ''}{delta} pts
                </span>
              </div>
            </div>
          )}

          {/* Nb sauvegardes */}
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#78716C', fontWeight: 600 }}>HISTORIQUE</p>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
              {historique.length} score{historique.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Bouton sauvegarde */}
        {scoreActuel !== undefined && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {scoreAChange && (
              <div style={{
                fontSize: 11, color: '#D97706', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <Info size={12} /> Score modifié — pensez à sauvegarder
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setNoteOpen(o => !o)} style={{
                padding: '8px 14px', border: '1px solid #E5E1DA', borderRadius: 8,
                background: '#fff', color: '#78716C', fontSize: 12, cursor: 'pointer'
              }}>
                + Note
              </button>
              <button onClick={sauvegarderScore} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', border: 'none', borderRadius: 8,
                background: saving ? '#9CA3AF' : '#0F6E56',
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'default' : 'pointer'
              }}>
                <Save size={14} /> {saving ? 'Sauvegarde…' : 'Sauvegarder le score'}
              </button>
            </div>
            {noteOpen && (
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Note contextuelle (ex : après visite terrain)"
                style={{
                  width: 280, padding: '8px 12px', fontSize: 12,
                  border: '1px solid #E5E1DA', borderRadius: 8, outline: 'none'
                }} />
            )}
          </div>
        )}
      </div>

      {/* Graphique */}
      {dataGraphique.length >= 2 ? (
        <div style={{
          background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
          padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
            ÉVOLUTION DU SCORE CLIMATIQUE
          </p>

          {/* Zones de référence */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const }}>
            {Object.entries(CLASSE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: cfg.couleur }} />
                <span style={{ fontSize: 10, color: '#78716C' }}>{cfg.label}</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dataGraphique} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0F6E56" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }}
                ticks={[0, 25, 50, 75, 100]} />
              <Tooltip content={<TooltipScore />} />
              {/* Lignes de classe */}
              <ReferenceLine y={25} stroke="#0F6E5640" strokeDasharray="4 2" label={{ value: '25', fill: '#0F6E56', fontSize: 9 }} />
              <ReferenceLine y={50} stroke="#D9770640" strokeDasharray="4 2" label={{ value: '50', fill: '#D97706', fontSize: 9 }} />
              <ReferenceLine y={75} stroke="#B91C1C40" strokeDasharray="4 2" label={{ value: '75', fill: '#B91C1C', fontSize: 9 }} />
              <Area
                type="monotone" dataKey="score_global"
                stroke="#0F6E56" strokeWidth={2.5}
                fill="url(#scoreGradient)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle key={payload.date_iso} cx={cx} cy={cy} r={5}
                      fill={COULEUR_SCORE(payload.score_global)}
                      stroke="#fff" strokeWidth={2} />
                  )
                }}
                activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : dataGraphique.length === 1 ? (
        <div style={{
          background: '#F8F7F4', border: '1px dashed #E5E1DA', borderRadius: 12,
          padding: 20, textAlign: 'center', color: '#78716C', fontSize: 13
        }}>
          Sauvegardez au moins 2 scores pour afficher le graphique d'évolution.
        </div>
      ) : null}

      {/* Tableau historique */}
      {historique.length > 0 && (
        <div style={{
          background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E1DA' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
              HISTORIQUE DES SAUVEGARDES ({historique.length})
            </p>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ background: '#F8F7F4' }}>
                  {['Date', 'Score', 'Classe', 'Aléa principal', 'Δ', 'Note', 'Source'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left' as const,
                      fontSize: 10, fontWeight: 700, color: '#78716C',
                      letterSpacing: '0.05em', borderBottom: '1px solid #E5E1DA'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...historique].reverse().map((s, i, arr) => {
                  const prev = arr[i + 1]
                  const delta = prev ? s.score_global - prev.score_global : null
                  const cfg = CLASSE_CONFIG[s.classe_risque]
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#78716C' }}>
                        {new Date(s.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700,
                          color: COULEUR_SCORE(s.score_global)
                        }}>
                          {s.score_global}
                        </span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 2 }}>/100</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: cfg?.fond, color: cfg?.couleur
                        }}>
                          {cfg?.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#1F2937' }}>
                        {s.alea_principal ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {delta !== null ? (
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
                            color: delta > 0 ? '#B91C1C' : delta < 0 ? '#0F6E56' : '#78716C'
                          }}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#78716C', fontStyle: 'italic' as const }}>
                        {s.note ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                          background: '#F8F7F4', color: '#78716C'
                        }}>
                          {s.source}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historique.length === 0 && !loading && (
        <div style={{
          background: '#F8F7F4', border: '2px dashed #E5E1DA', borderRadius: 12,
          padding: '40px 20px', textAlign: 'center', color: '#78716C'
        }}>
          <Clock size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontWeight: 500, margin: '0 0 4px' }}>Aucun score sauvegardé</p>
          <p style={{ fontSize: 12, margin: 0 }}>
            Calculez un score puis cliquez sur "Sauvegarder le score" pour démarrer l'historique.
          </p>
        </div>
      )}
    </div>
  )
}
