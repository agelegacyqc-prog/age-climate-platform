import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  ArrowLeft, Download, Leaf, AlertTriangle, CheckCircle,
  TrendingDown, Factory, Zap, Package
} from 'lucide-react'
import jsPDF from 'jspdf'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Bilan {
  id: string
  raison_sociale: string
  siren: string
  secteur_naf: string
  annee_reporting: number
  statut: string
}

interface Resultat {
  id: string
  bilan_id: string
  poste_id: string
  poste: string
  scope: number
  total_kg_co2e: number
  pct_total: number
  
}

interface ResultatsAgreges {
  scope1: number
  scope2: number
  scope3: number
  total: number
  parPoste: { poste: string; scope: number; tco2e: number }[]
}

// ─── Constantes couleurs (style guide workplace) ──────────────────────────────

const COULEURS_SCOPE = ['#2F7D5C', '#0369A1', '#D97706']
const COULEUR_PRIMAIRE = '#1D9E75'

const LIBELLES_SCOPE: Record<number, string> = {
  1: 'Scope 1 — Émissions directes',
  2: 'Scope 2 — Indirectes énergie',
  3: 'Scope 3 — Autres indirectes',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTco2e(val: number): string {
  return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' tCO₂e'
}

function formatNombre(val: number, decimales = 2): string {
  return val.toFixed(decimales).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const LIBELLES_POSTES: Record<string, string> = {
  energie: 'Énergie',
  hors_energie: 'Émissions hors énergie',
  deplacements: 'Déplacements',
  fret: 'Fret',
  intrants: 'Intrants',
  immobilisations: 'Immobilisations',
  dechets: 'Déchets',
  futurs_emballages: 'Emballages futurs',
  utilisation: 'Utilisation des produits',
  fin_de_vie: 'Fin de vie',
}

function niveauEmissions(total: number): { label: string; couleur: string; icone: 'check' | 'warning' | 'alert' } {
  if (total < 50) return { label: 'Faible', couleur: '#2F7D5C', icone: 'check' }
  if (total < 500) return { label: 'Modéré', couleur: '#D97706', icone: 'warning' }
  return { label: 'Élevé', couleur: '#B91C1C', icone: 'alert' }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AGEcarbonResultats() {
  const { bilanId } = useParams<{ bilanId: string }>()
  const navigate = useNavigate()

  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [agreges, setAgreges] = useState<ResultatsAgreges | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [exportEnCours, setExportEnCours] = useState(false)

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!bilanId) return
    charger()
  }, [bilanId])

  async function charger() {
    setLoading(true)
    setErreur(null)
    try {
      // Bilan
      const { data: bilanData, error: bilanErr } = await supabase
        .from('abc_bilans')
        .select('id, raison_sociale, siren, secteur_naf, annee_reporting, statut')
        .eq('id', bilanId)
        .single()
      if (bilanErr) throw bilanErr
      setBilan(bilanData)

      // Résultats
      const { data: resultatsData, error: resultatsErr } = await supabase
        .from('abc_resultats')
        .select('id, bilan_id, poste, scope, total_kg_co2e, pct_total')
        .eq('bilan_id', bilanId)
        .order('scope', { ascending: true })
      if (resultatsErr) throw resultatsErr
      setResultats(resultatsData ?? [])

      // Agrégation
      const rows = resultatsData ?? []
      const scope1 = rows.filter(r => r.scope === 1).reduce((s, r) => s + r.total_kg_co2e / 1000, 0)
      const scope2 = rows.filter(r => r.scope === 2).reduce((s, r) => s + r.total_kg_co2e / 1000, 0)
      const scope3 = rows.filter(r => r.scope === 3).reduce((s, r) => s + r.total_kg_co2e / 1000, 0)
      setAgreges({
        scope1,
        scope2,
        scope3,
        total: scope1 + scope2 + scope3,
        parPoste: rows
          .filter(r => r.total_kg_co2e > 0)
          .sort((a, b) => b.total_kg_co2e - a.total_kg_co2e)
          .map(r => ({ poste: r.poste, scope: r.scope, tco2e: r.total_kg_co2e / 1000 })),
      })
    } catch (e: unknown) {
      setErreur('Impossible de charger les résultats.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Export PDF ──────────────────────────────────────────────────────────────

  async function exporterPDF() {
    if (!bilan || !agreges) return
    setExportEnCours(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const bleu = [26, 58, 95] as [number, number, number]
      const vert = [29, 158, 117] as [number, number, number]
      const gris = [120, 113, 108] as [number, number, number]

      // En-tête
      doc.setFillColor(...bleu)
      doc.rect(0, 0, 210, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('BILAN CARBONE® — RÉSULTATS', 15, 14)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`${bilan.raison_sociale} · Année ${bilan.annee_reporting}`, 15, 22)
      if (bilan.siren) doc.text(`SIREN : ${bilan.siren}`, 15, 28)

      // Date
      doc.setTextColor(...gris)
      doc.setFontSize(9)
      doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, 150, 28)

      // Total global
      doc.setFillColor(...vert)
      doc.rect(15, 40, 180, 18, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text('TOTAL ÉMISSIONS', 20, 51)
      doc.setFontSize(15)
      doc.text(`${formatNombre(agreges.total)} tCO2e`, 120, 51)

      // Tableau scopes
      doc.setTextColor(...bleu)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Répartition par scope', 15, 70)

      const scopes = [
        { label: 'Scope 1 — Émissions directes', val: agreges.scope1, pct: agreges.total > 0 ? (agreges.scope1 / agreges.total * 100) : 0 },
        { label: 'Scope 2 — Indirectes énergie', val: agreges.scope2, pct: agreges.total > 0 ? (agreges.scope2 / agreges.total * 100) : 0 },
        { label: 'Scope 3 — Autres indirectes', val: agreges.scope3, pct: agreges.total > 0 ? (agreges.scope3 / agreges.total * 100) : 0 },
      ]

      doc.setFillColor(241, 245, 249)
      doc.rect(15, 74, 180, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...bleu)
      doc.text('Scope', 18, 79.5)
      doc.text('tCO2e', 130, 79.5)
      doc.text('% du total', 160, 79.5)

      scopes.forEach((s, i) => {
        const y = 87 + i * 9
        if (i % 2 === 0) {
          doc.setFillColor(248, 247, 244)
          doc.rect(15, y - 5, 180, 9, 'F')
        }
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(31, 41, 55)
        doc.text(s.label, 18, y)
        doc.setFont('helvetica', 'bold')
        doc.text(formatNombre(s.val), 130, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...gris)
        doc.text(`${s.pct.toFixed(1)} %`, 162, y)
      })

      // Tableau postes
      let y = 125
      doc.setTextColor(...bleu)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Détail par poste d\'émission', 15, y)
      y += 8

      doc.setFillColor(241, 245, 249)
      doc.rect(15, y, 180, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...bleu)
      doc.text('Poste', 18, y + 5.5)
      doc.text('Scope', 130, y + 5.5)
      doc.text('tCO2e', 158, y + 5.5)
      y += 8

      agreges.parPoste.forEach((p, i) => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        if (i % 2 === 0) {
          doc.setFillColor(248, 247, 244)
          doc.rect(15, y, 180, 8, 'F')
        }
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(31, 41, 55)
        const libellePoste = LIBELLES_POSTES[p.poste] ?? p.poste
const libelle = libellePoste.length > 55 ? libellePoste.substring(0, 52) + '...' : libellePoste
        doc.text(libelle, 18, y + 5.5)
        doc.setTextColor(...gris)
        doc.text(`S${p.scope}`, 132, y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(31, 41, 55)
        doc.text(formatNombre(p.tco2e), 158, y + 5.5)
        y += 8
      })

      // Pied de page
      doc.setTextColor(...gris)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Bilan établi selon la méthodologie ABC (Bilan Carbone®) — AGE Legacy QC', 15, 285)
      doc.text(`Page 1`, 195, 285, { align: 'right' })

      doc.save(`BilanCarbone_${bilan.raison_sociale}_${bilan.annee_reporting}.pdf`)
    } catch (e) {
      console.error('Erreur export PDF', e)
    } finally {
      setExportEnCours(false)
    }
  }

  // ── Rendu conditionnel ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#78716C', fontFamily: 'Inter, sans-serif' }}>
        Chargement des résultats…
      </div>
    )
  }

  if (erreur || !bilan || !agreges) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#B91C1C', fontFamily: 'Inter, sans-serif' }}>
        {erreur ?? 'Résultats introuvables.'}
      </div>
    )
  }

  const niveau = niveauEmissions(agreges.total)
  const pctScope1 = agreges.total > 0 ? (agreges.scope1 / agreges.total * 100) : 0
  const pctScope2 = agreges.total > 0 ? (agreges.scope2 / agreges.total * 100) : 0
  const pctScope3 = agreges.total > 0 ? (agreges.scope3 / agreges.total * 100) : 0

  const donneesPie = [
    { name: 'Scope 1', value: agreges.scope1 },
    { name: 'Scope 2', value: agreges.scope2 },
    { name: 'Scope 3', value: agreges.scope3 },
  ].filter(d => d.value > 0)

  const donneesBarres = agreges.parPoste.map(p => ({
    name: p.poste.length > 35 ? p.poste.substring(0, 32) + '…' : p.poste,
    tco2e: parseFloat(p.tco2e.toFixed(2)),
    scope: p.scope,
  }))

  const IconeNiveau =
    niveau.icone === 'check' ? CheckCircle :
    niveau.icone === 'warning' ? AlertTriangle :
    TrendingDown

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: 'Inter, sans-serif',
      background: '#F8F7F4',
      minHeight: '100vh',
    }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(`/metier/agecarbon/${bilanId}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #E5E1DA',
              borderRadius: 8, padding: '8px 14px',
              cursor: 'pointer', color: '#78716C', fontSize: 14,
            }}
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Leaf size={22} color={COULEUR_PRIMAIRE} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Résultats — {bilan.raison_sociale}
              </h1>
              <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>
                Bilan Carbone® · Année {bilan.annee_reporting}
                {bilan.siren && ` · SIREN ${bilan.siren}`}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={exporterPDF}
          disabled={exportEnCours}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: COULEUR_PRIMAIRE, color: '#fff',
            border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 14, fontWeight: 600,
            cursor: exportEnCours ? 'not-allowed' : 'pointer',
            opacity: exportEnCours ? 0.7 : 1,
          }}
        >
          <Download size={16} />
          {exportEnCours ? 'Export en cours…' : 'Exporter PDF'}
        </button>
      </div>

      {/* ── KPIs scopes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>

        {/* Total */}
        <div style={{
          background: '#1F2937', borderRadius: 12, padding: '20px 24px',
          color: '#fff', gridColumn: '1',
        }}>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total émissions
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', margin: '0 0 6px' }}>
            {agreges.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>tCO₂e</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <IconeNiveau size={14} color={niveau.couleur} />
            <span style={{ fontSize: 12, color: niveau.couleur, fontWeight: 600 }}>{niveau.label}</span>
          </div>
        </div>

        {/* Scope 1 */}
        <KpiScope
          label="Scope 1"
          sousTitre="Émissions directes"
          icone={<Factory size={16} color={COULEURS_SCOPE[0]} />}
          valeur={agreges.scope1}
          pct={pctScope1}
          couleur={COULEURS_SCOPE[0]}
        />

        {/* Scope 2 */}
        <KpiScope
          label="Scope 2"
          sousTitre="Indirectes énergie"
          icone={<Zap size={16} color={COULEURS_SCOPE[1]} />}
          valeur={agreges.scope2}
          pct={pctScope2}
          couleur={COULEURS_SCOPE[1]}
        />

        {/* Scope 3 */}
        <KpiScope
          label="Scope 3"
          sousTitre="Autres indirectes"
          icone={<Package size={16} color={COULEURS_SCOPE[2]} />}
          valeur={agreges.scope3}
          pct={pctScope3}
          couleur={COULEURS_SCOPE[2]}
        />
      </div>

      {/* ── Graphiques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>

        {/* Donut scopes */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: '0 0 20px' }}>
            Répartition par scope
          </h2>
          {donneesPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donneesPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donneesPie.map((_, index) => (
                    <Cell key={index} fill={COULEURS_SCOPE[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [
                    val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' tCO₂e',
                    '',
                  ]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: '#1F2937' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#78716C', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>
              Aucune émission enregistrée
            </p>
          )}
        </div>

        {/* Barres horizontales par poste */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: '0 0 20px' }}>
            Émissions par poste (tCO₂e)
          </h2>
          {donneesBarres.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(240, donneesBarres.length * 36)}>
              <BarChart
                data={donneesBarres}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E1DA" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#78716C', fontFamily: 'JetBrains Mono, monospace' }}
                  tickFormatter={(v) => v.toLocaleString('fr-FR')}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fontSize: 11, fill: '#1F2937' }}
                />
                <Tooltip
                  formatter={(val: number) => [
                    val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' tCO₂e',
                    'Émissions',
                  ]}
                />
                <Bar dataKey="tco2e" radius={[0, 4, 4, 0]}>
                  {donneesBarres.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COULEURS_SCOPE[(entry.scope - 1) % 3]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#78716C', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>
              Aucune émission enregistrée
            </p>
          )}
        </div>
      </div>

      {/* ── Tableau détail ── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E1DA' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>
            Détail par poste d'émission
          </h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F4' }}>
              <th style={thStyle}>Poste</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Scope</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Mode saisie</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>tCO₂e</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>% total</th>
            </tr>
          </thead>
          <tbody>
            {agreges.parPoste.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#78716C', fontSize: 13 }}>
                  Aucune émission enregistrée
                </td>
              </tr>
            ) : (
              agreges.parPoste.map((p, i) => {
                const pct = agreges.total > 0 ? (p.tco2e / agreges.total * 100) : 0
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #E5E1DA', background: i % 2 === 0 ? '#fff' : '#F8F7F4' }}>
                    <td style={tdStyle}>{p.poste}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px',
                        borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: COULEURS_SCOPE[(p.scope - 1) % 3] + '20',
                        color: COULEURS_SCOPE[(p.scope - 1) % 3],
                      }}>
                        S{p.scope}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12, color: '#78716C' }}>
                      {resultats.find(r => r.poste === p.poste)?.pct_total !== undefined ? `${resultats.find(r => r.poste === p.poste)?.pct_total?.toFixed(1)} %` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                      {p.tco2e.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{
                          width: 60, height: 6, background: '#E5E1DA', borderRadius: 3, overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: COULEURS_SCOPE[(p.scope - 1) % 3],
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#78716C', fontFamily: 'JetBrains Mono, monospace', minWidth: 40, textAlign: 'right' }}>
                          {pct.toFixed(1)} %
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {agreges.parPoste.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F8F7F4', borderTop: '2px solid #E5E1DA' }}>
                <td colSpan={3} style={{ ...tdStyle, fontWeight: 700, color: '#1F2937' }}>TOTAL</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1F2937' }}>
                  {agreges.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#1F2937', fontFamily: 'JetBrains Mono, monospace' }}>
                  100,00 %
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  )
}

// ─── Sous-composant KPI scope ─────────────────────────────────────────────────

function KpiScope({
  label, sousTitre, icone, valeur, pct, couleur,
}: {
  label: string
  sousTitre: string
  icone: React.ReactNode
  valeur: number
  pct: number
  couleur: string
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      borderTop: `3px solid ${couleur}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icone}
        <p style={{ fontSize: 12, color: '#78716C', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1F2937', margin: '0 0 2px' }}>
        {valeur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p style={{ fontSize: 11, color: '#78716C', margin: '0 0 10px' }}>tCO₂e · {sousTitre}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: '#E5E1DA', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: couleur, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 12, color: couleur, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
          {pct.toFixed(1)} %
        </span>
      </div>
    </div>
  )
}

// ─── Styles tableaux ──────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: '#78716C',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  borderBottom: '1px solid #E5E1DA',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#1F2937',
}