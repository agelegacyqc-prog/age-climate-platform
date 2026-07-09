import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import html2canvas from 'html2canvas'
import { genererRapportIA } from '../lib/agecarbonRapportIA'
import { construirePdfRapportIA } from '../lib/agecarbonRapportPDF'
import { supabase } from '../lib/supabase'

const COULEURS_SCOPE = ['#2F7D5C', '#0369A1', '#D97706']

export interface GenerateurRapportIARef {
  generer: (bilanId: string) => Promise<void>
}

interface Props {
  onDebut?: () => void
  onFin?: () => void
  onErreur?: (message: string) => void
}

const GenerateurRapportIA = forwardRef<GenerateurRapportIARef, Props>(({ onDebut, onFin, onErreur }, ref) => {
  const [donneesGraphiques, setDonneesGraphiques] = useState<{
    donut: { name: string; value: number }[]
    barres: { name: string; tco2e: number }[]
    modes: { name: string; value: number }[] | null
  } | null>(null)

  const refDonut = useRef<HTMLDivElement>(null)
  const refBarres = useRef<HTMLDivElement>(null)
  const refModes = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    generer: async (bilanId: string) => {
      onDebut?.()
      try {
        // 1. Données réelles (bilan, agrégats, baromètre)
        const { data: bilan, error: bilanErr } = await supabase
          .from('abc_bilans')
          .select('id, raison_sociale, siren, secteur_naf, annee_reporting')
          .eq('id', bilanId)
          .single()
        if (bilanErr || !bilan) throw new Error('Bilan introuvable.')

        const { data: resultats, error: resultatsErr } = await supabase
          .from('abc_resultats')
          .select('poste, scope, total_kg_co2e')
          .eq('bilan_id', bilanId)
        if (resultatsErr || !resultats) throw new Error('Résultats introuvables.')

        const { data: barometre } = await supabase
          .from('abc_barometre_employes')
          .select('*')
          .eq('bilan_id', bilanId)
          .maybeSingle()

        const scope1 = resultats.filter(r => r.scope === 1).reduce((s, r) => s + r.total_kg_co2e / 1000, 0)
        const scope2 = resultats.filter(r => r.scope === 2).reduce((s, r) => s + r.total_kg_co2e / 1000, 0)
        const scope3 = resultats.filter(r => r.scope === 3).reduce((s, r) => s + r.total_kg_co2e / 1000, 0)
        const parPoste = resultats
          .filter(r => r.total_kg_co2e > 0)
          .sort((a, b) => b.total_kg_co2e - a.total_kg_co2e)
          .map(r => ({ poste: r.poste, scope: r.scope, tco2e: r.total_kg_co2e / 1000 }))

        // Fusion par poste (un même poste peut avoir plusieurs lignes scope1/scope2/scope3)
        const posteFusionne = new Map<string, number>()
        parPoste.forEach(p => posteFusionne.set(p.poste, (posteFusionne.get(p.poste) ?? 0) + p.tco2e))
        const parPosteDetail = Array.from(posteFusionne.entries())
          .map(([poste, tco2e]) => ({ poste, tco2e }))
          .sort((a, b) => b.tco2e - a.tco2e)

        const agreges = { scope1, scope2, scope3, total: scope1 + scope2 + scope3, parPosteDetail }

        const donutData = [
          { name: 'Scope 1', value: scope1 },
          { name: 'Scope 2', value: scope2 },
          { name: 'Scope 3', value: scope3 },
        ].filter(d => d.value > 0)

       const barresData = parPosteDetail.map(p => ({
          name: p.poste.length > 25 ? p.poste.substring(0, 22) + '…' : p.poste,
          tco2e: parseFloat(p.tco2e.toFixed(2)),
        }))

        const modesData = barometre && barometre.mode_voiture_pct !== null ? [
          { name: 'Voiture', value: barometre.mode_voiture_pct ?? 0 },
          { name: 'Covoiturage', value: barometre.mode_covoiturage_pct ?? 0 },
          { name: 'Transports en commun', value: barometre.mode_transports_commun_pct ?? 0 },
          { name: 'Vélo', value: barometre.mode_velo_pct ?? 0 },
          { name: 'Marche', value: barometre.mode_marche_pct ?? 0 },
        ].filter(d => d.value > 0) : null

        // 2. Monte les graphiques hors-écran
        setDonneesGraphiques({ donut: donutData, barres: barresData, modes: modesData })
        await new Promise(resolve => setTimeout(resolve, 600)) // laisse Recharts peindre le SVG (sans animation, delai de sécurité)

        // 3. Rasterise
        const capturer = async (el: HTMLDivElement | null): Promise<string | null> => {
          if (!el) return null
          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
          return canvas.toDataURL('image/png')
        }
        const [donutImg, barresImg, modesImg] = await Promise.all([
          capturer(refDonut.current),
          capturer(refBarres.current),
          modesData ? capturer(refModes.current) : Promise.resolve(null),
        ])

        // 4. Appel Claude API (Edge Function)
        const rapport = await genererRapportIA(bilanId)

        // 5. Construction PDF
        const doc = construirePdfRapportIA(
          rapport,
          bilan,
          agreges,
          barometre ?? null,
          { donutScopes: donutImg, barresPostes: barresImg, repartitionModes: modesImg },
        )
        doc.save(`RapportIA_BilanCarbone_${bilan.raison_sociale}_${bilan.annee_reporting}.pdf`)

        onFin?.()
      } catch (e: unknown) {
        console.error('Erreur génération rapport IA', e)
        onErreur?.(e instanceof Error ? e.message : 'Erreur inconnue lors de la génération du rapport.')
      } finally {
        setDonneesGraphiques(null)
      }
    },
  }))

  // Conteneur hors-écran (position absolue, hors du viewport visible)
  return (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: 700 }}>
      {donneesGraphiques && (
        <>
          <div ref={refDonut} style={{ width: 500, height: 400, background: '#fff', padding: 20 }}>
            <PieChart width={460} height={360}>
              <Pie data={donneesGraphiques.donut} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" isAnimationActive={false}>
                {donneesGraphiques.donut.map((_, i) => <Cell key={i} fill={COULEURS_SCOPE[i]} />)}
              </Pie>
            </PieChart>
          </div>
          <div ref={refBarres} style={{ width: 650, height: Math.max(300, donneesGraphiques.barres.length * 40), background: '#fff', padding: 20 }}>
            <BarChart width={610} height={Math.max(260, donneesGraphiques.barres.length * 40)} data={donneesGraphiques.barres} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} />
              
               <Bar dataKey="tco2e" radius={[0, 4, 4, 0]} isAnimationActive={false} fill="#2F7D5C">
              </Bar>
            </BarChart>
          </div>
          {donneesGraphiques.modes && (
            <div ref={refModes} style={{ width: 500, height: 400, background: '#fff', padding: 20 }}>
              <PieChart width={460} height={360}>
                <Pie data={donneesGraphiques.modes} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={(e) => e.name} isAnimationActive={false}>
                  {donneesGraphiques.modes.map((_, i) => <Cell key={i} fill={['#2F7D5C', '#1D9E75', '#0369A1', '#D97706', '#78716C'][i % 5]} />)}
                </Pie>
              </PieChart>
            </div>
          )}
        </>
      )}
    </div>
  )
})

GenerateurRapportIA.displayName = 'GenerateurRapportIA'
export default GenerateurRapportIA