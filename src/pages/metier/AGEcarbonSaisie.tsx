import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { Calculator, ChevronLeft, ChevronDown, ChevronRight, Check } from 'lucide-react'

interface Bilan {
  id: string
  raison_sociale: string
  annee_reporting: number
  statut: string
}

interface Facteur {
  id: string
  poste: string
  sous_poste: string
  libelle: string
  unite_physique: string
  facteur_kg_co2e: number
  scope: number
}

interface Saisie {
  id?: string
  poste: string
  sous_poste: string
  libelle_saisie: string
  facteur_id: string
  mode_saisie: 'physique' | 'monetaire'
  quantite: string
  unite: string
  montant_eur: string
  ratio_monetaire: string
  kg_co2e: number
  scope: number
}

const POSTES = [
  { id: 'energie', label: 'Énergie', scope: '1 & 2', icon: '⚡' },
  { id: 'hors_energie', label: 'Hors énergie', scope: '1', icon: '🏭' },
  { id: 'intrants', label: 'Intrants & services', scope: '3', icon: '📦' },
  { id: 'futurs_emballages', label: 'Futurs emballages', scope: '3', icon: '📫' },
  { id: 'dechets', label: 'Déchets directs', scope: '3', icon: '🗑️' },
  { id: 'fret', label: 'Fret', scope: '3', icon: '🚛' },
  { id: 'deplacements', label: 'Déplacements', scope: '3', icon: '🚗' },
  { id: 'immobilisations', label: 'Immobilisations', scope: '3', icon: '🏢' },
  { id: 'utilisation', label: 'Utilisation des produits vendus', scope: '3', icon: '🔌' },
  { id: 'fin_de_vie', label: 'Fin de vie des produits', scope: '3', icon: '♻️' },
]

export default function AGEcarbonSaisie() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [facteurs, setFacteurs] = useState<Facteur[]>([])
  const [saisies, setSaisies] = useState<Saisie[]>([])
  const [posteOuvert, setPosteOuvert] = useState<string>('energie')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: b } = await supabase
        .from('abc_bilans')
        .select('id, raison_sociale, annee_reporting, statut')
        .eq('id', id)
        .single()
      if (b) setBilan(b)

      const { data: f } = await supabase
        .from('abc_facteurs_emission')
        .select('*')
        .eq('actif', true)
        .order('poste')
      if (f) setFacteurs(f)

      const { data: s } = await supabase
        .from('abc_saisies')
        .select('*')
        .eq('bilan_id', id)
      if (s) setSaisies(s.map(row => ({
        ...row,
        quantite: row.quantite?.toString() || '',
        montant_eur: row.montant_eur?.toString() || '',
        ratio_monetaire: row.ratio_monetaire?.toString() || '',
      })))
    }
    load()
  }, [id])

  const facteursPoste = (poste: string) => facteurs.filter(f => f.poste === poste)

  const getSaisie = (facteurId: string): Saisie => {
    const existing = saisies.find(s => s.facteur_id === facteurId)
    const facteur = facteurs.find(f => f.id === facteurId)
    return existing || {
      poste: facteur?.poste || '',
      sous_poste: facteur?.sous_poste || '',
      libelle_saisie: facteur?.libelle || '',
      facteur_id: facteurId,
      mode_saisie: 'physique',
      quantite: '',
      unite: facteur?.unite_physique || '',
      montant_eur: '',
      ratio_monetaire: '',
      kg_co2e: 0,
      scope: facteur?.scope || 3,
    }
  }

  const calcKgCo2e = (saisie: Saisie, facteur: Facteur): number => {
    if (saisie.mode_saisie === 'physique') {
      const q = parseFloat(saisie.quantite) || 0
      return q * facteur.facteur_kg_co2e
    } else {
      const m = parseFloat(saisie.montant_eur) || 0
      const r = parseFloat(saisie.ratio_monetaire) || 0
      return m * r
    }
  }

  const updateSaisie = (facteurId: string, field: string, value: string) => {
    const facteur = facteurs.find(f => f.id === facteurId)
    if (!facteur) return
    setSaisies(prev => {
      const existing = prev.find(s => s.facteur_id === facteurId)
      const base = existing || getSaisie(facteurId)
      const updated = { ...base, [field]: value }
      updated.kg_co2e = calcKgCo2e(updated, facteur)
      if (existing) {
        return prev.map(s => s.facteur_id === facteurId ? updated : s)
      } else {
        return [...prev, updated]
      }
    })
  }

  const handleSavePoste = async (poste: string) => {
    setSaving(true)
    const saisiesPoste = saisies.filter(s => s.poste === poste && (parseFloat(s.quantite) > 0 || parseFloat(s.montant_eur) > 0))

    for (const saisie of saisiesPoste) {
      const payload = {
        bilan_id: id,
        poste: saisie.poste,
        sous_poste: saisie.sous_poste,
        libelle_saisie: saisie.libelle_saisie,
        facteur_id: saisie.facteur_id,
        mode_saisie: saisie.mode_saisie,
        quantite: saisie.mode_saisie === 'physique' ? parseFloat(saisie.quantite) || null : null,
        unite: saisie.unite,
        montant_eur: saisie.mode_saisie === 'monetaire' ? parseFloat(saisie.montant_eur) || null : null,
        ratio_monetaire: saisie.mode_saisie === 'monetaire' ? parseFloat(saisie.ratio_monetaire) || null : null,
        kg_co2e: saisie.kg_co2e,
        scope: saisie.scope,
      }

      if (saisie.id) {
        await supabase.from('abc_saisies').update(payload).eq('id', saisie.id)
      } else {
        await supabase.from('abc_saisies').insert(payload)
      }
    }

    // Recalculer totaux bilan
    const { data: allSaisies } = await supabase
      .from('abc_saisies')
      .select('kg_co2e, scope')
      .eq('bilan_id', id)

    if (allSaisies) {
      const s1 = allSaisies.filter(s => s.scope === 1).reduce((a, s) => a + (s.kg_co2e || 0), 0)
      const s2 = allSaisies.filter(s => s.scope === 2).reduce((a, s) => a + (s.kg_co2e || 0), 0)
      const s3 = allSaisies.filter(s => s.scope === 3).reduce((a, s) => a + (s.kg_co2e || 0), 0)
      const total = s1 + s2 + s3

      await supabase.from('abc_bilans').update({
        total_scope1: s1 / 1000,
        total_scope2: s2 / 1000,
        total_scope3: s3 / 1000,
        total_tco2e: total / 1000,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }

    setSaving(false)
    setSaved(poste)
    setTimeout(() => setSaved(null), 2000)
  }

  const inputStyle = {
    width: '100%', padding: '7px 9px',
    border: '1px solid #E5E1DA', borderRadius: '7px',
    fontSize: '12px', fontFamily: 'inherit',
    background: 'white', color: '#1F2937', outline: 'none',
  }

  const totalKgCo2e = saisies.reduce((a, s) => a + (s.kg_co2e || 0), 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/metier/agecarbon')}
          style={{ background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#78716C', fontSize: '13px' }}
        >
          <ChevronLeft size={15} /> Retour
        </button>
        <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '8px', display: 'flex' }}>
          <Calculator size={20} color="#2F7D5C" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
            {bilan?.raison_sociale || '—'} — {bilan?.annee_reporting}
          </h1>
          <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>Saisie des émissions — 14 postes</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1D9E75' }}>
            {(totalKgCo2e / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tCO₂e
          </div>
          <div style={{ fontSize: '11px', color: '#78716C' }}>Total en cours de saisie</div>
        </div>
      </div>

      {/* Postes accordéon */}
      {POSTES.map(poste => {
        const facteursP = facteursPoste(poste.id)
        const isOpen = posteOuvert === poste.id
        const totalPoste = saisies.filter(s => s.poste === poste.id).reduce((a, s) => a + (s.kg_co2e || 0), 0)
        const isSaved = saved === poste.id

        return (
          <div key={poste.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E1DA', marginBottom: '8px', overflow: 'hidden' }}>

            {/* Entête poste */}
            <button
              onClick={() => setPosteOuvert(isOpen ? '' : poste.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: '18px' }}>{poste.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{poste.label}</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>Scope {poste.scope}</div>
              </div>
              {totalPoste > 0 && (
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1D9E75', fontWeight: 600 }}>
                  {(totalPoste / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} tCO₂e
                </span>
              )}
              {isSaved && <Check size={16} color="#1D9E75" />}
              {isOpen ? <ChevronDown size={16} color="#78716C" /> : <ChevronRight size={16} color="#78716C" />}
            </button>

            {/* Contenu poste */}
            {isOpen && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid #E5E1DA' }}>
                {facteursP.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#78716C', padding: '16px 0' }}>
                    Aucun facteur d'émission disponible pour ce poste. Saisie manuelle disponible prochainement.
                  </p>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E1DA' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Libellé</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Mode</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Quantité / Montant</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Unité / Ratio</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#78716C', fontWeight: 500 }}>kg CO₂e</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facteursP.map(facteur => {
                          const saisie = getSaisie(facteur.id)
                          return (
                            <tr key={facteur.id} style={{ borderBottom: '1px solid #F8F7F4' }}>
                              <td style={{ padding: '8px', color: '#1F2937', maxWidth: '200px' }}>
                                <div style={{ fontWeight: 500 }}>{facteur.libelle}</div>
                                <div style={{ fontSize: '10px', color: '#78716C' }}>{facteur.facteur_kg_co2e} kg CO₂e/{facteur.unite_physique}</div>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <select
                                  style={{ ...inputStyle, width: '110px' }}
                                  value={saisie.mode_saisie}
                                  onChange={e => updateSaisie(facteur.id, 'mode_saisie', e.target.value)}
                                >
                                  <option value="physique">Physique</option>
                                  <option value="monetaire">Monétaire</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px' }}>
                                {saisie.mode_saisie === 'physique' ? (
                                  <input
                                    style={{ ...inputStyle, width: '120px' }}
                                    type="number"
                                    placeholder="0"
                                    value={saisie.quantite}
                                    onChange={e => updateSaisie(facteur.id, 'quantite', e.target.value)}
                                  />
                                ) : (
                                  <input
                                    style={{ ...inputStyle, width: '120px' }}
                                    type="number"
                                    placeholder="Montant €"
                                    value={saisie.montant_eur}
                                    onChange={e => updateSaisie(facteur.id, 'montant_eur', e.target.value)}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {saisie.mode_saisie === 'physique' ? (
                                  <span style={{ fontSize: '11px', color: '#78716C' }}>{facteur.unite_physique}</span>
                                ) : (
                                  <input
                                    style={{ ...inputStyle, width: '120px' }}
                                    type="number"
                                    placeholder="Ratio kg/€"
                                    value={saisie.ratio_monetaire}
                                    onChange={e => updateSaisie(facteur.id, 'ratio_monetaire', e.target.value)}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: saisie.kg_co2e > 0 ? '#1D9E75' : '#E5E1DA' }}>
                                {saisie.kg_co2e > 0 ? saisie.kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button
                        onClick={() => handleSavePoste(poste.id)}
                        disabled={saving}
                        style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isSaved ? <><Check size={14} /> Enregistré</> : saving ? 'Enregistrement...' : 'Enregistrer ce poste'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Bouton résultats */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button
          onClick={() => navigate(`/metier/agecarbon/${id}/resultats`)}
          style={{ background: '#1F2937', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Voir les résultats →
        </button>
      </div>
    </div>
  )
}