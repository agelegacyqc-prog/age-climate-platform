// src/pages/metier/ListeTrajectoire.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface Programme {
  id: string
  nom: string
  statut: 'actif' | 'suspendu' | 'clos'
  date_debut: string
  organisation_id: string
  organisation_nom?: string
}

const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  actif:     { bg: '#E6F5F3', text: '#0B786D' },
  suspendu:  { bg: '#FEF3E1', text: '#92610A' },
  clos:      { bg: '#F1F0EC', text: '#78716C' },
}

const STATUT_LABELS: Record<string, string> = {
  actif: 'Actif',
  suspendu: 'Suspendu',
  clos: 'Clos',
}

export default function ListeTrajectoire() {
  const navigate = useNavigate()
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)

  const kpis = {
    actifs: programmes.filter(p => p.statut === 'actif').length,
    suspendus: programmes.filter(p => p.statut === 'suspendu').length,
    clos: programmes.filter(p => p.statut === 'clos').length,
  }

  useEffect(() => {
    async function fetchProgrammes() {
       const { data, error } = await supabase
        .from('trajectoire_programmes')
        .select('id, nom, statut, date_debut, organisation_id, organisations(raison_sociale)')
        .eq('archivee', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setProgrammes(
          data.map((p: any) => ({
            id: p.id,
            nom: p.nom,
            statut: p.statut,
            date_debut: p.date_debut,
            organisation_id: p.organisation_id,
            organisation_nom: p.organisations?.raison_sociale,
          }))
        )
      }
      setLoading(false)
    }
    fetchProgrammes()
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#E6F5F3', borderRadius: '10px', padding: '8px', display: 'flex' }}>
          <i className="ti ti-route" style={{ fontSize: '22px', color: '#0D9488' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 }}>Trajectoire</h1>
          <p style={{ fontSize: '13px', color: '#78716C', margin: 0 }}>
            Programmes d'accompagnement pluriannuels
          </p>
        </div>
         <button
          onClick={() => navigate('/metier/trajectoire/nouveau')}
          style={{
            marginLeft: 'auto', background: '#0D9488', color: 'white',
            border: 'none', borderRadius: '8px', padding: '9px 18px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: '15px' }} /> Nouveau programme
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Programmes actifs', value: kpis.actifs, icon: 'ti-player-play', color: '#0D9488' },
          { label: 'Suspendus', value: kpis.suspendus, icon: 'ti-player-pause', color: '#D97706' },
          { label: 'Clos', value: kpis.clos, icon: 'ti-flag-check', color: '#78716C' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '12px',
            border: '1px solid #E5E1DA', padding: '16px',
            borderTop: `3px solid ${kpi.color}`
          }}>
            <div style={{ marginBottom: '8px' }}>
              <i className={`ti ${kpi.icon}`} style={{ fontSize: '18px', color: kpi.color }} />
            </div>
            <div style={{ fontSize: '10px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#1F2937', fontFamily: 'JetBrains Mono, monospace' }}>
              {loading ? '—' : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <i className="ti ti-list" style={{ fontSize: '16px', color: '#0D9488' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Programmes
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#78716C', fontSize: '13px' }}>Chargement...</p>
        ) : programmes.length === 0 ? (
          <p style={{ color: '#78716C', fontSize: '13px' }}>Aucun programme pour l'instant.</p>
        ) : (
          programmes.map(p => {
            const sc = STATUT_COLORS[p.statut] || { bg: '#F3F4F6', text: '#6B7280' }
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/metier/trajectoire/${p.id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Ouvrir le programme ${p.nom}`}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/metier/trajectoire/${p.id}`) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 0', borderBottom: '1px solid #E5E1DA',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F4')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '8px',
                  background: '#E6F5F3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <i className="ti ti-route" style={{ fontSize: '16px', color: '#0D9488' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{p.nom}</div>
                  <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                    {p.organisation_nom ?? '—'} · démarré le {new Date(p.date_debut).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <span style={{
                  fontSize: '9px', padding: '3px 9px', borderRadius: '20px',
                  background: sc.bg, color: sc.text, fontWeight: 500,
                }}>
                  {STATUT_LABELS[p.statut] || p.statut}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}