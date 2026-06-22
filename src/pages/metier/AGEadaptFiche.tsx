import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Leaf, Calendar, Users, MapPin, Target } from 'lucide-react'

interface Mission {
  id: string
  raison_sociale: string
  siren: string
  type_structure: string
  secteur_naf: string
  effectif_tranche: number
  nb_sites_tranche: number
  region: string
  methode: string
  bilan_existant: boolean
  statut: string
  created_at: string
  aleas: string[]
}

interface Simulation {
  jours_consultant: number
  duree_mois: number
  tarif_bas_ht: number
  tarif_haut_ht: number
  phase1_jours: number
  phase1_pct: number
  phase2_jours: number
  phase2_pct: number
  phase3_jours: number
  phase3_pct: number
}

const LIBELLES_METHODE: Record<string, string> = {
  abc: 'Bilan Carbone® ABC',
  act: 'ACT Adaptation',
  vuln: 'Diagnostic vulnérabilité',
  full: 'Mission complète',
}

const LIBELLES_EFFECTIF: Record<number, string> = {
  1: '1 – 10', 2: '11 – 49', 3: '50 – 249',
  4: '250 – 499', 5: '500 – 999', 6: '1 000+',
}

const LIBELLES_SITES: Record<number, string> = {
  1: '1 site', 2: '2 – 3 sites', 3: '4 – 9 sites', 4: '10 sites et +',
}

export default function AGEadaptFiche() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [mission, setMission] = useState<Mission | null>(null)
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    type_structure: '',
    effectif_tranche: '',
    region: '',
    methode: '',
    nb_sites_tranche: '',
    bilan_existant: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    charger()
  }, [id])
async function sauvegarder() {
    setSaving(true)
    const { error } = await supabase
      .from('ageadapt_missions')
      .update({
        type_structure: editForm.type_structure || null,
        effectif_tranche: parseInt(editForm.effectif_tranche) || null,
        region: editForm.region || null,
        methode: editForm.methode || null,
        nb_sites_tranche: parseInt(editForm.nb_sites_tranche) || null,
        bilan_existant: editForm.bilan_existant,
      })
      .eq('id', id)
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setEditMode(false)
    charger()
  }
  async function charger() {
    setLoading(true)
    const { data: m } = await supabase
      .from('ageadapt_missions')
      .select('*')
      .eq('id', id)
      .single()
    setMission(m)
    if (m) {
      setEditForm({
        type_structure: m.type_structure || '',
        effectif_tranche: String(m.effectif_tranche || ''),
        region: m.region || '',
        methode: m.methode || '',
        nb_sites_tranche: String(m.nb_sites_tranche || ''),
        bilan_existant: m.bilan_existant || false,
      })
    }

    const { data: s } = await supabase
      .from('ageadapt_simulations')
      .select('*')
      .eq('mission_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSimulation(s)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#78716C', fontFamily: 'Inter, sans-serif' }}>
      Chargement…
    </div>
  )

  if (!mission) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#B91C1C', fontFamily: 'Inter, sans-serif' }}>
      Mission introuvable.
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: 'Inter, sans-serif', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/metier/ageadapt')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid #E5E1DA',
            borderRadius: 8, padding: '8px 14px',
            cursor: 'pointer', color: '#78716C', fontSize: 14,
          }}>
            <ArrowLeft size={16} /> Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Leaf size={20} color="#1D9E75" />
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>{mission.raison_sociale}</h1>
              <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>
                {LIBELLES_METHODE[mission.methode] ?? '—'} · Créée le {new Date(mission.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: mission.statut === 'brouillon' ? '#F1F5F9' : '#E1F5EE',
          color: mission.statut === 'brouillon' ? '#78716C' : '#1D9E75',
        }}>
          {mission.statut.charAt(0).toUpperCase() + mission.statut.slice(1)}
        </span>
      </div>

      
      {/* Infos client */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E1DA', padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Identification client</h2>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} style={{ fontSize: 12, color: '#1D9E75', background: 'none', border: '1px solid #1D9E75', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
              Modifier
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditMode(false)} style={{ fontSize: 12, color: '#78716C', background: 'none', border: '1px solid #E5E1DA', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={sauvegarder} disabled={saving} style={{ fontSize: 12, color: 'white', background: '#1D9E75', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
       {!editMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icone: <Leaf size={14} color="#1D9E75" />, label: 'Structure', val: mission.type_structure || '—' },
              { icone: <Users size={14} color="#1D9E75" />, label: 'Effectif', val: LIBELLES_EFFECTIF[mission.effectif_tranche] ?? '—' },
              { icone: <MapPin size={14} color="#1D9E75" />, label: 'Région', val: mission.region || '—' },
              { icone: <Target size={14} color="#1D9E75" />, label: 'Méthode', val: LIBELLES_METHODE[mission.methode] ?? '—' },
              { icone: <Users size={14} color="#1D9E75" />, label: 'Sites', val: LIBELLES_SITES[mission.nb_sites_tranche] ?? '—' },
              { icone: <Calendar size={14} color="#1D9E75" />, label: 'Bilan existant', val: mission.bilan_existant ? 'Oui (−35 %)' : 'Non' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 12px', background: '#F8F7F4', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {item.icone}
                  <span style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>{item.val}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Structure</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: 8, fontSize: 13, background: 'white' }}
                value={editForm.type_structure} onChange={e => setEditForm(f => ({ ...f, type_structure: e.target.value }))}>
                <option value="">—</option>
                <option value="entreprise">Entreprise / Groupe</option>
                <option value="collectivite">Collectivité / EPCI</option>
                <option value="asso">Association</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Effectif</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: 8, fontSize: 13, background: 'white' }}
                value={editForm.effectif_tranche} onChange={e => setEditForm(f => ({ ...f, effectif_tranche: e.target.value }))}>
                <option value="">—</option>
                <option value="1">1 – 10</option>
                <option value="2">11 – 49</option>
                <option value="3">50 – 249</option>
                <option value="4">250 – 499</option>
                <option value="5">500 – 999</option>
                <option value="6">1 000+</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Région</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: 8, fontSize: 13, background: 'white' }}
                value={editForm.region} onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))}>
                <option value="">—</option>
                <option>Nouvelle-Aquitaine</option>
                <option>Île-de-France</option>
                <option>Occitanie</option>
                <option>Auvergne-Rhône-Alpes</option>
                <option>Autre</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Méthode</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: 8, fontSize: 13, background: 'white' }}
                value={editForm.methode} onChange={e => setEditForm(f => ({ ...f, methode: e.target.value }))}>
                <option value="">—</option>
                <option value="abc">Bilan Carbone® ABC</option>
                <option value="act">ACT Adaptation</option>
                <option value="vuln">Diagnostic vulnérabilité</option>
                <option value="full">Mission complète</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Sites</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: 8, fontSize: 13, background: 'white' }}
                value={editForm.nb_sites_tranche} onChange={e => setEditForm(f => ({ ...f, nb_sites_tranche: e.target.value }))}>
                <option value="">—</option>
                <option value="1">1 site</option>
                <option value="2">2 – 3 sites</option>
                <option value="3">4 – 9 sites</option>
                <option value="4">10 sites et +</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Bilan existant</label>
              <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: 8, fontSize: 13, background: 'white' }}
                value={editForm.bilan_existant ? 'oui' : 'non'} onChange={e => setEditForm(f => ({ ...f, bilan_existant: e.target.value === 'oui' }))}>
                <option value="non">Non</option>
                <option value="oui">Oui</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Simulation tarifaire */}
      {simulation && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E1DA', padding: '20px 24px', marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Simulation tarifaire</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#1F2937', borderRadius: 10, padding: '16px 20px', color: 'white' }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Jours consultant</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{simulation.jours_consultant}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>jours · TJM 950 €/j</div>
            </div>
            <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '16px 20px', border: '1px solid #1D9E75' }}>
              <div style={{ fontSize: 10, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Honoraires HT</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1F2937' }}>
                {simulation.tarif_bas_ht.toLocaleString('fr-FR')} – {simulation.tarif_haut_ht.toLocaleString('fr-FR')} €
              </div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>Fourchette indicative</div>
            </div>
            <div style={{ background: '#F8F7F4', borderRadius: 10, padding: '16px 20px', border: '1px solid #E5E1DA' }}>
              <div style={{ fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Durée estimée</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1F2937' }}>{simulation.duree_mois}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>mois</div>
            </div>
          </div>

          {/* Phases */}
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 10 }}>Répartition par phase</p>
          {[
            { label: 'Collecte & cadrage', j: simulation.phase1_jours, pct: simulation.phase1_pct, couleur: '#1D9E75' },
            { label: 'Calcul & analyse', j: simulation.phase2_jours, pct: simulation.phase2_pct, couleur: '#D97706' },
            { label: 'Plan transition & livrables', j: simulation.phase3_jours, pct: simulation.phase3_pct, couleur: '#0369A1' },
          ].map(ph => (
            <div key={ph.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 200, fontSize: 12, color: '#1F2937' }}>{ph.label}</div>
              <div style={{ flex: 1, height: 8, background: '#E5E1DA', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${ph.pct}%`, height: '100%', background: ph.couleur, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#78716C', minWidth: 80, textAlign: 'right' }}>
                {ph.j} j · {ph.pct} %
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aléas */}
      {mission.aleas && mission.aleas.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E1DA', padding: '20px 24px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Aléas climatiques</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mission.aleas.map(a => (
              <span key={a} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A',
              }}>{a}</span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}