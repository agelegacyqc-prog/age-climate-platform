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

  useEffect(() => {
    if (!id) return
    charger()
  }, [id])

  async function charger() {
    setLoading(true)
    const { data: m } = await supabase
      .from('ageadapt_missions')
      .select('*')
      .eq('id', id)
      .single()
    setMission(m)

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
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Identification client</h2>
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