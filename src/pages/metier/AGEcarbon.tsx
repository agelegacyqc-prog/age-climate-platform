import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Calculator, Plus, Leaf, BarChart2, Cloud, FileText } from 'lucide-react'

interface Bilan {
  id: string
  raison_sociale: string
  annee_reporting: number
  statut: string
  total_tco2e: number
  total_scope1: number
  total_scope2: number
  total_scope3: number
  updated_at: string
}

const STATUT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  en_cours:  { bg: '#FEF3C7', text: '#D97706', label: 'En cours' },
  finalise:  { bg: '#E1F5EE', text: '#0F6E56', label: 'Finalisé' },
  archive:   { bg: '#F3F4F6', text: '#6B7280', label: 'Archivé' },
}

export default function AGEcarbon() {
  const navigate = useNavigate()
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBilans() {
      const { data, error } = await supabase
        .from('abc_bilans')
        .select('id, raison_sociale, annee_reporting, statut, total_tco2e, total_scope1, total_scope2, total_scope3, updated_at')
        .neq('statut', 'archive')
        .order('updated_at', { ascending: false })
        .limit(20)
      if (!error && data) setBilans(data)
      setLoading(false)
    }
    fetchBilans()
  }, [])

  const totalTco2e = bilans.reduce((s, b) => s + (b.total_tco2e || 0), 0)
  const nbFinalises = bilans.filter(b => b.statut === 'finalise').length

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '8px', display: 'flex' }}>
          <Calculator size={22} color="#2F7D5C" />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 }}>AGEcarbon</h1>
          <p style={{ fontSize: '13px', color: '#78716C', margin: 0 }}>
            Calculateur Bilan Carbone® — Méthodologie ABC — 14 postes Scope 1, 2, 3
          </p>
        </div>
        <button
          onClick={() => navigate('/metier/agecarbon/nouveau')}
          style={{
            marginLeft: 'auto', background: '#1D9E75', color: 'white',
            border: 'none', borderRadius: '8px', padding: '9px 18px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Plus size={15} /> Nouveau bilan
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Bilans actifs', value: loading ? '—' : bilans.length, icon: <FileText size={18} color="#1D9E75" />, color: '#1D9E75' },
          { label: 'Bilans finalisés', value: loading ? '—' : nbFinalises, icon: <Leaf size={18} color="#0369A1" />, color: '#0369A1' },
          { label: 'tCO₂e total mesuré', value: loading ? '—' : Math.round(totalTco2e).toLocaleString('fr-FR'), icon: <Cloud size={18} color="#D97706" />, color: '#D97706' },
          { label: 'Postes couverts', value: '14', icon: <BarChart2 size={18} color="#1F2937" />, color: '#1F2937' },
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
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Liste bilans */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <BarChart2 size={16} color="#1D9E75" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bilans en cours
          </span>
        </div>

        {loading ? (
          <p style={{ color: '#78716C', fontSize: '13px' }}>Chargement...</p>
        ) : bilans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Calculator size={32} color="#E5E1DA" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#78716C', fontSize: '13px', margin: 0 }}>Aucun bilan carbone. Créez le premier.</p>
            <button
              onClick={() => navigate('/metier/agecarbon/nouveau')}
              style={{ marginTop: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              + Nouveau bilan
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E1DA' }}>
                {['Organisation', 'Année', 'Scope 1', 'Scope 2', 'Scope 3', 'Total tCO₂e', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: '#78716C', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bilans.map(b => {
                const sc = STATUT_COLORS[b.statut] || STATUT_COLORS.en_cours
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #E5E1DA' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1F2937' }}>{b.raison_sociale}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#78716C' }}>{b.annee_reporting}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{(b.total_scope1 || 0).toLocaleString('fr-FR')} t</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{(b.total_scope2 || 0).toLocaleString('fr-FR')} t</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{(b.total_scope3 || 0).toLocaleString('fr-FR')} t</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#1F2937' }}>{(b.total_tco2e || 0).toLocaleString('fr-FR')} t</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: sc.bg, color: sc.text, fontWeight: 500 }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        onClick={() => navigate(`/metier/agecarbon/${b.id}`)}
                        style={{ background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: '#78716C' }}
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}