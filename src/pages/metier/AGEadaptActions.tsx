// src/pages/metier/AGEadaptActions.tsx
//
// Module : AGEadapt — Onglet « Plan d'actions » de la fiche mission (P3-19).
// CRUD complet sur ageadapt_actions (§7). Ancrage PNACC3 §4.8.
// Style guide AGEadapt : Forest #2F7D5C / accent #1D9E75, Lucide, Inter,
// JetBrains Mono pour les valeurs (tCO₂e). Format FR (virgule décimale).

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, Pencil, Trash2, Check, X, Leaf,
  CheckCircle2, AlertTriangle, Loader, Ban,
} from 'lucide-react'

interface Action {
  id: string
  mission_id: string
  created_at: string
  intitule: string
  thematique: string | null
  type_action: 'pilotage' | 'operationnelle' | 'interne' | null
  mesure_pnacc: string | null
  categorie_risque: 'operationnel' | 'assuranciel' | 'financier' | null
  horizon: '2030' | '2040' | '2050' | '2100' | null
  gain_ges_tco2e: number | null
  gain_pct_bilan: number | null
  potentiel: 'faible' | 'moyen' | 'fort' | null
  statut: 'a_lancer' | 'en_cours' | 'realise' | 'abandonne'
  indicateur_suivi: string | null
  objectif_cible: string | null
  echeance: string | null
  responsable: string | null
}

interface FormState {
  intitule: string
  thematique: string
  type_action: string
  mesure_pnacc: string
  categorie_risque: string
  horizon: string
  gain_ges_tco2e: string
  gain_pct_bilan: string
  potentiel: string
  statut: string
  indicateur_suivi: string
  objectif_cible: string
  echeance: string
  responsable: string
}

// Libellés PNACC3 mot pour mot (§4.8)
const MESURES_PNACC: Record<string, string> = {
  '20': 'M20 — Déployer les SfN pour l\'adaptation',
  '21': 'M21 — Préserver la ressource en eau (Plan Eau)',
  '23': 'M23 — Intégrer la TRACC dans les documents de planification',
  '33': 'M33 — Mobiliser tous les secteurs économiques',
  '40': 'M40 — Mieux évaluer les actions d\'adaptation des entreprises',
  '41': 'M41 — Développer les outils pour les entreprises',
  '42': 'M42 — Mobiliser les acteurs financiers',
}
const TYPES_ACTION: [string, string][] = [['pilotage', 'Pilotage'], ['operationnelle', 'Opérationnelle'], ['interne', 'Interne']]
const CATEGORIES: [string, string][] = [['operationnel', 'Opérationnel'], ['assuranciel', 'Assurantiel'], ['financier', 'Financier']]
const HORIZONS = ['2030', '2040', '2050', '2100']
const POTENTIELS: [string, string][] = [['faible', 'Faible'], ['moyen', 'Moyen'], ['fort', 'Fort']]
const STATUTS: [string, string][] = [['a_lancer', 'À lancer'], ['en_cours', 'En cours'], ['realise', 'Réalisé'], ['abandonne', 'Abandonné']]

const FORM_VIDE: FormState = {
  intitule: '', thematique: '', type_action: '', mesure_pnacc: '', categorie_risque: '',
  horizon: '', gain_ges_tco2e: '', gain_pct_bilan: '', potentiel: '', statut: 'a_lancer',
  indicateur_suivi: '', objectif_cible: '', echeance: '', responsable: '',
}

// Saisie FR : accepte point ET virgule, normalise en interne. Le moteur n'arrondit pas.
function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
// Affichage FR : virgule décimale, espace milliers. L'affichage arrondit (2 déc.).
function fmtTco2e(n: number | null): string {
  if (n === null) return '—'
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' tCO₂e'
}
function fmtPct(n: number | null): string {
  if (n === null) return '—'
  return n.toFixed(2).replace('.', ',') + ' %'
}

function badgeStatut(statut: Action['statut']) {
  switch (statut) {
    case 'realise': return { bg: '#E1F5EE', color: '#0F6E56', Icone: CheckCircle2, label: 'Réalisé' }
    case 'en_cours': return { bg: '#E6F1FB', color: '#185FA5', Icone: Loader, label: 'En cours' }
    case 'abandonne': return { bg: '#F1F5F9', color: '#78716C', Icone: Ban, label: 'Abandonné' }
    default: return { bg: '#FEF3C7', color: '#D97706', Icone: AlertTriangle, label: 'À lancer' }
  }
}

const inputStyle = {
  width: '100%', padding: '9px 10px', border: '1px solid #E5E1DA',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'white', color: '#1F2937',
}
const labelStyle = { fontSize: 11, color: '#78716C', fontWeight: 500, marginBottom: 4, display: 'block' } as const
const btnPrimaire = {
  display: 'flex', alignItems: 'center', gap: 6, background: '#1D9E75', color: 'white',
  border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
} as const

export default function AGEadaptActions({ missionId }: { missionId: string }) {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VIDE)
  const [saving, setSaving] = useState(false)

  useEffect(() => { charger() }, [missionId])

  async function charger() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ageadapt_actions')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true })
    if (error) { alert('Erreur chargement : ' + error.message) }
    setActions((data as Action[]) ?? [])
    setLoading(false)
  }

  function ouvrirCreation() {
    setForm(FORM_VIDE)
    setEditing('new')
  }

  function ouvrirEdition(a: Action) {
    setForm({
      intitule: a.intitule ?? '',
      thematique: a.thematique ?? '',
      type_action: a.type_action ?? '',
      mesure_pnacc: a.mesure_pnacc ?? '',
      categorie_risque: a.categorie_risque ?? '',
      horizon: a.horizon ?? '',
      gain_ges_tco2e: a.gain_ges_tco2e !== null ? String(a.gain_ges_tco2e).replace('.', ',') : '',
      gain_pct_bilan: a.gain_pct_bilan !== null ? String(a.gain_pct_bilan).replace('.', ',') : '',
      potentiel: a.potentiel ?? '',
      statut: a.statut ?? 'a_lancer',
      indicateur_suivi: a.indicateur_suivi ?? '',
      objectif_cible: a.objectif_cible ?? '',
      echeance: a.echeance ?? '',
      responsable: a.responsable ?? '',
    })
    setEditing(a.id)
  }

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function enregistrer() {
    if (!form.intitule.trim()) { alert('L\'intitulé est obligatoire.'); return }
    setSaving(true)
    const payload = {
      mission_id: missionId,
      intitule: form.intitule.trim(),
      thematique: form.thematique.trim() || null,
      type_action: form.type_action || null,
      mesure_pnacc: form.mesure_pnacc || null,
      categorie_risque: form.categorie_risque || null,
      horizon: form.horizon || null,
      gain_ges_tco2e: parseNum(form.gain_ges_tco2e),
      gain_pct_bilan: parseNum(form.gain_pct_bilan),
      potentiel: form.potentiel || null,
      statut: form.statut || 'a_lancer',
      indicateur_suivi: form.indicateur_suivi.trim() || null,
      objectif_cible: form.objectif_cible.trim() || null,
      echeance: form.echeance || null,
      responsable: form.responsable.trim() || null,
    }
    const { error } = editing === 'new'
      ? await supabase.from('ageadapt_actions').insert(payload)
      : await supabase.from('ageadapt_actions').update(payload).eq('id', editing as string)
    setSaving(false)
    if (error) { alert('Erreur enregistrement : ' + error.message); return }
    setEditing(null)
    charger()
  }

  async function supprimer(a: Action) {
    if (!confirm(`Supprimer l'action « ${a.intitule} » ?`)) return
    const { error } = await supabase.from('ageadapt_actions').delete().eq('id', a.id)
    if (error) { alert('Erreur suppression : ' + error.message); return }
    charger()
  }

  // KPI « tCO₂e évitées estimées » (§3) : Σ gain_ges_tco2e hors actions abandonnées.
  const totalEvite = actions
    .filter(a => a.statut !== 'abandonne')
    .reduce((s, a) => s + (a.gain_ges_tco2e ?? 0), 0)

  const enEdition = editing !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Bandeau KPI + action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'white', border: '1px solid #E5E1DA', borderRadius: 12, padding: '14px 20px',
        }}>
          <div style={{ background: '#E1F5EE', borderRadius: 10, padding: 8 }}>
            <Leaf size={18} color="#2F7D5C" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              tCO₂e évitées estimées
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', fontFamily: 'JetBrains Mono, monospace' }}>
              {fmtTco2e(totalEvite)}
            </div>
          </div>
        </div>
        <button onClick={ouvrirCreation} disabled={enEdition} style={{ ...btnPrimaire, opacity: enEdition ? 0.5 : 1 }}>
          <Plus size={16} /> Ajouter une action
        </button>
      </div>

      {/* Formulaire création / édition */}
      {enEdition && (
        <div style={{ background: 'white', border: '1px solid #1D9E75', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '0 0 14px' }}>
            {editing === 'new' ? 'Nouvelle action' : 'Modifier l\'action'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="act-intitule" style={labelStyle}>Intitulé *</label>
              <input id="act-intitule" style={inputStyle} value={form.intitule}
                onChange={e => set('intitule', e.target.value)} placeholder="Ex. : Végétaliser les toitures des entrepôts" />
            </div>

            <div>
              <label htmlFor="act-thematique" style={labelStyle}>Thématique</label>
              <input id="act-thematique" style={inputStyle} value={form.thematique}
                onChange={e => set('thematique', e.target.value)} placeholder="Ex. : Gestion de l'eau" />
            </div>
            <div>
              <label htmlFor="act-type" style={labelStyle}>Type d'action</label>
              <select id="act-type" style={inputStyle} value={form.type_action} onChange={e => set('type_action', e.target.value)}>
                <option value="">—</option>
                {TYPES_ACTION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="act-mesure" style={labelStyle}>Mesure PNACC3</label>
              <select id="act-mesure" style={inputStyle} value={form.mesure_pnacc} onChange={e => set('mesure_pnacc', e.target.value)}>
                <option value="">—</option>
                {Object.entries(MESURES_PNACC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="act-categorie" style={labelStyle}>Catégorie de risque</label>
              <select id="act-categorie" style={inputStyle} value={form.categorie_risque} onChange={e => set('categorie_risque', e.target.value)}>
                <option value="">—</option>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="act-horizon" style={labelStyle}>Horizon</label>
              <select id="act-horizon" style={inputStyle} value={form.horizon} onChange={e => set('horizon', e.target.value)}>
                <option value="">—</option>
                {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="act-potentiel" style={labelStyle}>Potentiel</label>
              <select id="act-potentiel" style={inputStyle} value={form.potentiel} onChange={e => set('potentiel', e.target.value)}>
                <option value="">—</option>
                {POTENTIELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="act-gain-ges" style={labelStyle}>Gain GES (tCO₂e)</label>
              <input id="act-gain-ges" style={inputStyle} inputMode="decimal" value={form.gain_ges_tco2e}
                onChange={e => set('gain_ges_tco2e', e.target.value)} placeholder="Ex. : 12,5" />
            </div>
            <div>
              <label htmlFor="act-gain-pct" style={labelStyle}>Gain (% du bilan)</label>
              <input id="act-gain-pct" style={inputStyle} inputMode="decimal" value={form.gain_pct_bilan}
                onChange={e => set('gain_pct_bilan', e.target.value)} placeholder="Ex. : 3,2" />
            </div>

            <div>
              <label htmlFor="act-statut" style={labelStyle}>Statut</label>
              <select id="act-statut" style={inputStyle} value={form.statut} onChange={e => set('statut', e.target.value)}>
                {STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="act-echeance" style={labelStyle}>Échéance</label>
              <input id="act-echeance" type="date" style={inputStyle} value={form.echeance} onChange={e => set('echeance', e.target.value)} />
            </div>

            <div>
              <label htmlFor="act-indicateur" style={labelStyle}>Indicateur de suivi</label>
              <input id="act-indicateur" style={inputStyle} value={form.indicateur_suivi}
                onChange={e => set('indicateur_suivi', e.target.value)} placeholder="Ex. : m² de toiture végétalisée" />
            </div>
            <div>
              <label htmlFor="act-objectif" style={labelStyle}>Objectif cible</label>
              <input id="act-objectif" style={inputStyle} value={form.objectif_cible}
                onChange={e => set('objectif_cible', e.target.value)} placeholder="Ex. : 2 000 m² d'ici 2030" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="act-responsable" style={labelStyle}>Responsable</label>
              <input id="act-responsable" style={inputStyle} value={form.responsable}
                onChange={e => set('responsable', e.target.value)} placeholder="Ex. : Direction RSE" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={() => setEditing(null)} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'white', color: '#78716C',
              border: '1px solid #E5E1DA', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer',
            }}>
              <X size={15} /> Annuler
            </button>
            <button onClick={enregistrer} disabled={saving} style={{ ...btnPrimaire, opacity: saving ? 0.6 : 1 }}>
              <Check size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des actions */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#78716C', fontSize: 13 }}>Chargement…</div>
      ) : actions.length === 0 ? (
        <div style={{
          background: 'white', border: '1px dashed #E5E1DA', borderRadius: 12,
          padding: 40, textAlign: 'center', color: '#78716C', fontSize: 13,
        }}>
          Aucune action pour le moment. Cliquez sur « Ajouter une action » pour construire le plan de transition.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map(a => {
            const b = badgeStatut(a.statut)
            return (
              <div key={a.id} style={{
                background: 'white', border: '1px solid #E5E1DA', borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{a.intitule}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 600, background: b.bg, color: b.color,
                    }}>
                      <b.Icone size={12} /> {b.label}
                    </span>
                    {a.mesure_pnacc && (
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}>
                        PNACC {a.mesure_pnacc}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#78716C' }}>
                    {a.thematique && <span>{a.thematique}</span>}
                    {a.horizon && <span>Horizon {a.horizon}</span>}
                    {a.potentiel && <span>Potentiel {a.potentiel}</span>}
                    {a.gain_ges_tco2e !== null && (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0F6E56' }}>{fmtTco2e(a.gain_ges_tco2e)}</span>
                    )}
                    {a.gain_pct_bilan !== null && <span>{fmtPct(a.gain_pct_bilan)} du bilan</span>}
                    {a.echeance && <span>Échéance {new Date(a.echeance).toLocaleDateString('fr-FR')}</span>}
                    {a.responsable && <span>· {a.responsable}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => ouvrirEdition(a)} aria-label={`Modifier ${a.intitule}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
                    background: 'white', border: '1px solid #E5E1DA', borderRadius: 8, cursor: 'pointer', color: '#78716C',
                  }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => supprimer(a)} aria-label={`Supprimer ${a.intitule}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
                    background: 'white', border: '1px solid #E5E1DA', borderRadius: 8, cursor: 'pointer', color: '#B91C1C',
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}