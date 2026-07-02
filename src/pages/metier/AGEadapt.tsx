import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Leaf, BarChart2, Building2, Building, Cloud, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clickableCardProps, focusRing, AGEADAPT_PRIMARY } from '../../lib/a11y'

interface Mission {
  id: string
  raison_sociale: string
  type_structure: string
  methode: string
  etape_courante: number
  statut: string
  updated_at: string
}

const METHODE_LABELS: Record<string, string> = {
  abc: 'ABC Bilan',
  act: 'ACT Adaptation',
  vuln: 'Diagnostic vulnérabilité',
  full: 'Mission complète',
}

const METHODE_COLORS: Record<string, { bg: string; text: string }> = {
  abc:  { bg: '#E1F5EE', text: '#0F6E56' },
  act:  { bg: '#E6F1FB', text: '#185FA5' },
  vuln: { bg: '#FAECE7', text: '#993C1D' },
  full: { bg: 'rgba(120,60,220,0.10)', text: '#783CDC' },
}

export default function AGEadapt() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState<Mission[]>([])
  const [tco2eEvitees, setTco2eEvitees] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const kpis = {
    actives: missions.filter(m => m.statut !== 'archive').length,
    collectivites: missions.filter(m => m.type_structure === 'collectivite').length,
    entreprises: missions.filter(m => m.type_structure === 'entreprise').length,
  }

  useEffect(() => {
    async function fetchMissions() {
      const { data, error } = await supabase
        .from('ageadapt_missions')
        .select('id, raison_sociale, type_structure, methode, etape_courante, statut, updated_at')
        .neq('statut', 'archive')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (!error && data) setMissions(data)
      setLoading(false)
    }

    // KPI tCO₂e évitées — agrégation réelle depuis ageadapt_actions (§7 fiche v1.1).
    // Retourne 0 tant qu'aucune action n'est saisie : aucun écran de saisie
    // n'existe encore pour cette table (Niveau 3, non traité).
    async function fetchTco2eEvitees() {
      const { data, error } = await supabase
        .from('ageadapt_actions')
        .select('gain_ges_tco2e')

      if (!error && data) {
        const total = data.reduce((sum, a) => sum + (a.gain_ges_tco2e ?? 0), 0)
        setTco2eEvitees(total)
      }
    }

    fetchMissions()
    fetchTco2eEvitees()
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '8px', display: 'flex' }}>
          <Leaf size={22} color="#2F7D5C" />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 }}>AGEadapt</h1>
          <p style={{ fontSize: '13px', color: '#78716C', margin: 0 }}>
            Bilan carbone · ACT Adaptation · Diagnostic de vulnérabilité
          </p>
        </div>
        <button
          onClick={() => navigate('/metier/ageadapt/nouvelle-mission')}
          style={{
            marginLeft: 'auto', background: '#1D9E75', color: 'white',
            border: 'none', borderRadius: '8px', padding: '9px 18px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Plus size={15} /> Nouvelle mission
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Missions actives', value: kpis.actives, icon: <Leaf size={18} color="#1D9E75" />, color: '#1D9E75' },
          { label: 'Collectivités', value: kpis.collectivites, icon: <Building size={18} color="#D97706" />, color: '#D97706' },
          { label: 'Entreprises', value: kpis.entreprises, icon: <Building2 size={18} color="#0369A1" />, color: '#0369A1' },
 { label: 'tCO₂e évitées', value: tco2eEvitees !== null ? tco2eEvitees.toLocaleString('fr-FR') : '—', icon: <Cloud size={18} color="#1F2937" />, color: '#1F2937' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '12px',
            border: '1px solid #E5E1DA', padding: '16px',
            borderTop: `3px solid ${kpi.color}`
          }}>
            <div style={{ marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '10px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#1F2937', fontFamily: 'JetBrains Mono, monospace' }}>
              {loading ? '—' : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Missions */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <BarChart2 size={16} color="#1D9E75" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Missions en cours
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#78716C', fontSize: '13px' }}>Chargement...</p>
        ) : missions.length === 0 ? (
          <p style={{ color: '#78716C', fontSize: '13px' }}>Aucune mission active.</p>
        ) : (
          missions.map(m => {
            const pct = Math.round((m.etape_courante / 5) * 100)
            const mc = METHODE_COLORS[m.methode] || { bg: '#F3F4F6', text: '#6B7280' }
            return (
              <div
  key={m.id}
  onClick={() => navigate(`/metier/ageadapt/${m.id}`)}
  aria-label={`Ouvrir la mission ${m.raison_sociale}`}
  {...clickableCardProps(() => navigate(`/metier/ageadapt/${m.id}`))}
  {...focusRing(AGEADAPT_PRIMARY)}
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
                  background: m.type_structure === 'collectivite' ? '#FEF3C7' : '#DBEAFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, flexShrink: 0,
                  color: m.type_structure === 'collectivite' ? '#D97706' : '#0369A1'
                }}>
                  {m.raison_sociale.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{m.raison_sociale}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: mc.bg, color: mc.text, fontWeight: 500 }}>
                      {METHODE_LABELS[m.methode] || m.methode}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#78716C', fontFamily: 'monospace' }}>{pct}%</span>
                  <div style={{ width: '80px', height: '4px', background: '#E5E1DA', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#1D9E75', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}