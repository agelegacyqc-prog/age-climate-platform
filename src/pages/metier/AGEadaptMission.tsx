import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Leaf, ChevronRight, ChevronLeft } from 'lucide-react'

const ETAPES = [
  'Qualification client',
  'Méthodes & périmètre',
  'Données & upload',
  'Cadrage mission',
  'Validation & tarif',
]

const METHODES = [
  { id: 'abc', label: 'Bilan Carbone® ABC', desc: 'GES Scope 1–3, plateforme ORKI, plan de transition', tags: ['Entreprise', 'Collectivité'] },
  { id: 'act', label: 'ACT Adaptation', desc: 'Maturité adaptation, 3 dimensions, 9 modules, matrice 5 niveaux', tags: ['Entreprise'] },
  { id: 'vuln', label: 'Diagnostic vulnérabilité', desc: 'Exposition, sensibilité, capacité adaptation, aléas TRACC / GIEC', tags: ['Collectivité'] },
  { id: 'full', label: 'Mission complète', desc: 'ABC + ACT + Vulnérabilité, livrables CSRD-compatibles', tags: ['Entreprise', 'Collectivité'] },
]

const ALEAS = [
  'Inondation', 'Vagues de chaleur', 'Sécheresse',
  'Feux de forêt', 'Tempêtes / vents', 'RGA',
  'Submersion', 'Épisodes froids',
]

export default function AGEadaptMission() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState(0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    raison_sociale: '',
    siren: '',
    type_structure: '',
    secteur_naf: '',
    effectif_tranche: '',
    nb_sites_tranche: '',
    region: '',
    bilan_existant: false,
    diagnostic_existant: false,
    plan_transition_init: false,
    pcaet_adopte: false,
    methode: '',
    scope1: true,
    scope2: true,
    scope3_transport: true,
    scope3_achats: true,
    scope3_produits: false,
    scope3_autres: false,
    aleas: [] as string[],
    maturite_donnees: '1',
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleAlea = (a: string) => {
    setForm(f => ({
      ...f,
      aleas: f.aleas.includes(a) ? f.aleas.filter(x => x !== a) : [...f.aleas, a]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('ageadapt_missions').insert({
      raison_sociale: form.raison_sociale,
      siren: form.siren,
      type_structure: form.type_structure,
      secteur_naf: form.secteur_naf,
      effectif_tranche: parseInt(form.effectif_tranche) || null,
      nb_sites_tranche: parseInt(form.nb_sites_tranche) || null,
      region: form.region,
      bilan_existant: form.bilan_existant,
      diagnostic_existant: form.diagnostic_existant,
      plan_transition_init: form.plan_transition_init,
      pcaet_adopte: form.pcaet_adopte,
      methode: form.methode,
      scope1: form.scope1,
      scope2: form.scope2,
      scope3_transport: form.scope3_transport,
      scope3_achats: form.scope3_achats,
      scope3_produits: form.scope3_produits,
      scope3_autres: form.scope3_autres,
      aleas: form.aleas,
      maturite_donnees: parseInt(form.maturite_donnees),
      etape_courante: 1,
      statut: 'brouillon',
    })
    setSaving(false)
    if (!error) navigate('/metier/ageadapt')
    else alert('Erreur : ' + error.message)
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #E5E1DA', borderRadius: '8px',
    fontSize: '13px', fontFamily: 'inherit',
    background: 'white', color: '#1F2937', outline: 'none',
  }

  const labelStyle = {
    fontSize: '11px', color: '#78716C',
    fontWeight: 500, marginBottom: '4px', display: 'block'
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '8px' }}>
          <Leaf size={20} color="#2F7D5C" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>Nouvelle mission</h1>
          <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>AGEadapt</p>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {ETAPES.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < ETAPES.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600,
                background: i < etape ? '#1D9E75' : i === etape ? '#E1F5EE' : 'white',
                border: i === etape ? '2px solid #1D9E75' : '1px solid #E5E1DA',
                color: i < etape ? 'white' : i === etape ? '#1D9E75' : '#78716C',
              }}>
                {i < etape ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '9px', color: i === etape ? '#1D9E75' : '#78716C', marginTop: '4px', whiteSpace: 'nowrap' }}>
                {e}
              </span>
            </div>
            {i < ETAPES.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: i < etape ? '#1D9E75' : '#E5E1DA', margin: '0 4px', marginBottom: '16px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Etape 1 — Qualification */}
      {etape === 0 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>Qualification client</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Raison sociale *</label><input style={inputStyle} value={form.raison_sociale} onChange={e => set('raison_sociale', e.target.value)} placeholder="Ex. : Groupe TCP" /></div>
            <div><label style={labelStyle}>SIREN</label><input style={inputStyle} value={form.siren} onChange={e => set('siren', e.target.value)} placeholder="9 chiffres" /></div>
            <div>
              <label style={labelStyle}>Type de structure *</label>
              <select style={inputStyle} value={form.type_structure} onChange={e => set('type_structure', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option value="entreprise">Entreprise / Groupe</option>
                <option value="collectivite">Collectivité / EPCI</option>
                <option value="asso">Association</option>
              </select>
            </div>
            <div><label style={labelStyle}>Secteur (NAF)</label><input style={inputStyle} value={form.secteur_naf} onChange={e => set('secteur_naf', e.target.value)} placeholder="Ex. : 4941A" /></div>
            <div>
              <label style={labelStyle}>Effectif (ETP)</label>
              <select style={inputStyle} value={form.effectif_tranche} onChange={e => set('effectif_tranche', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option value="1">1 à 10</option>
                <option value="2">11 à 49</option>
                <option value="3">50 à 249</option>
                <option value="4">250 à 499</option>
                <option value="5">500 à 999</option>
                <option value="6">1 000+</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nombre de sites</label>
              <select style={inputStyle} value={form.nb_sites_tranche} onChange={e => set('nb_sites_tranche', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option value="1">1 site</option>
                <option value="2">2 à 3 sites</option>
                <option value="3">4 à 9 sites</option>
                <option value="4">10 sites et +</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Région</label>
              <select style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option>Nouvelle-Aquitaine</option>
                <option>Île-de-France</option>
                <option>Occitanie</option>
                <option>Auvergne-Rhône-Alpes</option>
                <option>Autre</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', background: '#F8F7F4', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>Situation existante</p>
            {[
              { key: 'bilan_existant', label: 'Bilan carbone existant', sub: 'Le client dispose déjà d\'un bilan GES' },
              { key: 'diagnostic_existant', label: 'Diagnostic de vulnérabilité existant', sub: 'Étude territoire ou entreprise conduite' },
              { key: 'plan_transition_init', label: 'Plan de transition initié', sub: 'Feuille de route bas-carbone commencée' },
              { key: 'pcaet_adopte', label: 'PCAET adopté (collectivités)', sub: 'Plan Climat Air Énergie Territorial validé' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E1DA' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#1F2937' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: '#78716C' }}>{item.sub}</div>
                </div>
                <input type="checkbox" checked={form[item.key as keyof typeof form] as boolean} onChange={e => set(item.key, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1D9E75' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Etape 2 — Méthodes */}
      {etape === 1 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>Méthodes & périmètre</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {METHODES.map(m => (
              <div key={m.id} onClick={() => set('methode', m.id)} style={{
                border: form.methode === m.id ? '2px solid #1D9E75' : '1px solid #E5E1DA',
                background: form.methode === m.id ? '#E1F5EE' : 'white',
                borderRadius: '12px', padding: '14px', cursor: 'pointer',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#78716C', marginBottom: '8px', lineHeight: 1.5 }}>{m.desc}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {m.tags.map(t => (
                    <span key={t} style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: t === 'Entreprise' ? '#DBEAFE' : '#FEF3C7', color: t === 'Entreprise' ? '#0369A1' : '#D97706', fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '10px' }}>Aléas climatiques</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {ALEAS.map(a => (
              <div key={a} onClick={() => toggleAlea(a)} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                border: form.aleas.includes(a) ? '1px solid #D97706' : '1px solid #E5E1DA',
                background: form.aleas.includes(a) ? '#FEF3C7' : 'white',
              }}>
                <span style={{ fontSize: '11px', color: form.aleas.includes(a) ? '#D97706' : '#78716C', fontWeight: form.aleas.includes(a) ? 600 : 400 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Etapes 3, 4 — placeholder */}
      {(etape === 2 || etape === 3) && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#78716C', fontSize: '13px' }}>Étape {etape + 1} — À développer</p>
        </div>
      )}

      {/* Etape 5 — Validation */}
      {etape === 4 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>Validation & enregistrement</h2>
          <p style={{ fontSize: '13px', color: '#78716C' }}>Client : <strong>{form.raison_sociale}</strong></p>
          <p style={{ fontSize: '13px', color: '#78716C' }}>Méthode : <strong>{form.methode}</strong></p>
          <p style={{ fontSize: '13px', color: '#78716C' }}>Aléas sélectionnés : <strong>{form.aleas.join(', ') || '—'}</strong></p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          onClick={() => etape === 0 ? navigate('/metier/ageadapt') : setEtape(e => e - 1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer', color: '#78716C' }}
        >
          <ChevronLeft size={15} /> {etape === 0 ? 'Annuler' : 'Précédent'}
        </button>
        {etape < 4 ? (
          <button
            onClick={() => setEtape(e => e + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            Suivant <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer la mission'}
          </button>
        )}
      </div>
    </div>
  )
}