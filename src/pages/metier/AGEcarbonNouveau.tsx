import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Calculator, ChevronLeft } from 'lucide-react'

export default function AGEcarbonNouveau() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    raison_sociale: '',
    siren: '',
    secteur_naf: '',
    effectif: '',
    chiffre_affaires: '',
    annee_reporting: new Date().getFullYear().toString(),
    perimetre_geo: 'France métropolitaine',
    mode_consolidation: 'operationnel',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.raison_sociale || !form.annee_reporting) {
      alert('Raison sociale et année de reporting sont obligatoires.')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('abc_bilans')
      .insert({
        raison_sociale: form.raison_sociale,
        siren: form.siren || null,
        secteur_naf: form.secteur_naf || null,
        effectif: form.effectif ? parseInt(form.effectif) : null,
        chiffre_affaires: form.chiffre_affaires ? parseFloat(form.chiffre_affaires) : null,
        annee_reporting: parseInt(form.annee_reporting),
        perimetre_geo: form.perimetre_geo,
        mode_consolidation: form.mode_consolidation,
        statut: 'en_cours',
      })
      .select('id')
      .single()
    setSaving(false)
    if (!error && data) {
      navigate(`/metier/agecarbon/${data.id}`)
    } else {
      alert('Erreur : ' + error?.message)
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #E5E1DA', borderRadius: '8px',
    fontSize: '13px', fontFamily: 'inherit',
    background: 'white', color: '#1F2937', outline: 'none',
  }

  const labelStyle = {
    fontSize: '11px', color: '#78716C',
    fontWeight: 500 as const, marginBottom: '4px', display: 'block'
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

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
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>Nouveau bilan carbone</h1>
          <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>Méthodologie ABC — Scope 1, 2, 3</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '20px' }}>
          Informations générales
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Raison sociale *</label>
            <input style={inputStyle} value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} placeholder="Ex. : Groupe TCP" />
          </div>
          <div>
            <label style={labelStyle}>SIREN</label>
            <input style={inputStyle} value={form.siren} onChange={e => set('siren', e.target.value)} placeholder="9 chiffres" />
          </div>
          <div>
            <label style={labelStyle}>Secteur d'activité (NAF)</label>
            <input style={inputStyle} value={form.secteur_naf} onChange={e => set('secteur_naf', e.target.value)} placeholder="Ex. : 4941A — Transport" />
          </div>
          <div>
            <label style={labelStyle}>Effectif (ETP)</label>
            <input style={inputStyle} type="number" value={form.effectif} onChange={e => set('effectif', e.target.value)} placeholder="Ex. : 360" />
          </div>
          <div>
            <label style={labelStyle}>Chiffre d'affaires (€)</label>
            <input style={inputStyle} type="number" value={form.chiffre_affaires} onChange={e => set('chiffre_affaires', e.target.value)} placeholder="Ex. : 37373000" />
          </div>
          <div>
            <label style={labelStyle}>Année de reporting *</label>
            <input style={inputStyle} type="number" value={form.annee_reporting} onChange={e => set('annee_reporting', e.target.value)} placeholder="Ex. : 2024" />
          </div>
          <div>
            <label style={labelStyle}>Périmètre géographique</label>
            <select style={inputStyle} value={form.perimetre_geo} onChange={e => set('perimetre_geo', e.target.value)}>
              <option>France métropolitaine</option>
              <option>France + DOM-TOM</option>
              <option>Europe</option>
              <option>Monde</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Mode de consolidation</label>
            <select style={inputStyle} value={form.mode_consolidation} onChange={e => set('mode_consolidation', e.target.value)}>
              <option value="operationnel">Opérationnel</option>
              <option value="financier">Financier</option>
              <option value="controle">Contrôle</option>
            </select>
          </div>
        </div>

        {/* Info postes */}
        <div style={{ marginTop: '20px', background: '#E1F5EE', borderRadius: '10px', padding: '14px', display: 'flex', gap: '10px' }}>
          <Calculator size={16} color="#1D9E75" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '12px', color: '#0F6E56', margin: 0, lineHeight: 1.6 }}>
            Après création, vous saisirez les données pour les <strong>14 postes d'émissions</strong> : Énergie, Hors énergie, Intrants, Futurs emballages, Déchets directs, Fret, Déplacements, Immobilisations, Utilisation, Fin de vie.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => navigate('/metier/agecarbon')}
            style={{ background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer', color: '#78716C' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {saving ? 'Création...' : 'Créer le bilan →'}
          </button>
        </div>
      </div>
    </div>
  )
}