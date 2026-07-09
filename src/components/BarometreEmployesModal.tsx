import React, { useEffect, useState } from 'react'
import { X, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface BarometreEmployesModalProps {
  bilanId: string
  onClose: () => void
  onSaved: () => void
}

interface BarometreForm {
  taux_teletravail_moyen_pct: string
  jours_teletravail_total: string
  empreinte_energie_teletravail_tco2e: string
  emissions_evitees_teletravail_tco2e: string
  distance_domicile_travail_km: string
  emissions_domicile_travail_tco2e: string
  sensibilisation_climat_pct: string
  collaborateurs_formes_climat_pct: string
  satisfaction_politique_climat_pct: string
  mode_voiture_pct: string
  mode_covoiturage_pct: string
  mode_transports_commun_pct: string
  mode_velo_pct: string
  mode_marche_pct: string
  collaborateurs_covoiturage_pct: string
}

const CHAMPS_VIDES: BarometreForm = {
  taux_teletravail_moyen_pct: '',
  jours_teletravail_total: '',
  empreinte_energie_teletravail_tco2e: '',
  emissions_evitees_teletravail_tco2e: '',
  distance_domicile_travail_km: '',
  emissions_domicile_travail_tco2e: '',
  sensibilisation_climat_pct: '',
  collaborateurs_formes_climat_pct: '',
  satisfaction_politique_climat_pct: '',
  mode_voiture_pct: '',
  mode_covoiturage_pct: '',
  mode_transports_commun_pct: '',
  mode_velo_pct: '',
  mode_marche_pct: '',
  collaborateurs_covoiturage_pct: '',
}

// Normalisation saisie FR : accepte point ET virgule
function normaliserNombre(valeur: string): number | null {
  if (valeur.trim() === '') return null
  const nettoye = valeur.replace(',', '.').trim()
  const n = parseFloat(nettoye)
  return isNaN(n) ? null : n
}

const COULEUR_PRIMAIRE = '#1D9E75'

export default function BarometreEmployesModal({ bilanId, onClose, onSaved }: BarometreEmployesModalProps) {
  const [form, setForm] = useState<BarometreForm>(CHAMPS_VIDES)
  const [loading, setLoading] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    charger()
  }, [bilanId])

  async function charger() {
    setLoading(true)
    const { data, error } = await supabase
      .from('abc_barometre_employes')
      .select('*')
      .eq('bilan_id', bilanId)
      .maybeSingle()

    if (!error && data) {
      const rempli: Partial<BarometreForm> = {}
      ;(Object.keys(CHAMPS_VIDES) as (keyof BarometreForm)[]).forEach((cle) => {
        const valeur = data[cle]
        rempli[cle] = valeur === null || valeur === undefined ? '' : String(valeur).replace('.', ',')
      })
      setForm({ ...CHAMPS_VIDES, ...rempli })
    }
    setLoading(false)
  }

  function majChamp(cle: keyof BarometreForm, valeur: string) {
    setForm((f) => ({ ...f, [cle]: valeur }))
  }

  async function sauvegarder() {
    setSauvegarde(true)
    setErreur(null)
    try {
      const payload: Record<string, number | null> = {}
      ;(Object.keys(form) as (keyof BarometreForm)[]).forEach((cle) => {
        payload[cle] = normaliserNombre(form[cle])
      })

      const { error } = await supabase
        .from('abc_barometre_employes')
        .upsert({ bilan_id: bilanId, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'bilan_id' })

      if (error) throw error
      onSaved()
      onClose()
    } catch (e) {
      console.error('Erreur sauvegarde baromètre employés', e)
      setErreur("Impossible d'enregistrer le baromètre employés.")
    } finally {
      setSauvegarde(false)
    }
  }

  const champInput = (
    cle: keyof BarometreForm,
    label: string,
    unite: string,
  ) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, color: '#1F2937', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          inputMode="decimal"
          value={form[cle]}
          onChange={(e) => majChamp(cle, e.target.value)}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: '1px solid #E5E1DA', fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
          }}
          onFocus={(e) => (e.target.style.outline = `2px solid ${COULEUR_PRIMAIRE}`)}
        />
        <span style={{ fontSize: 12, color: '#78716C', minWidth: 50 }}>{unite}</span>
      </div>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 640, maxHeight: '85vh',
        overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #E5E1DA', position: 'sticky', top: 0, background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={20} color={COULEUR_PRIMAIRE} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>
              Baromètre employés
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#78716C' }}>Chargement…</div>
        ) : (
          <div style={{ padding: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
              Télétravail
            </h3>
            {champInput('taux_teletravail_moyen_pct', "Taux moyen de télétravail sur l'année", '%')}
            {champInput('jours_teletravail_total', 'Nombre total de jours télétravaillés', 'jours')}
            {champInput('empreinte_energie_teletravail_tco2e', 'Empreinte totale énergie télétravail', 'tCO₂e')}
            {champInput('emissions_evitees_teletravail_tco2e', 'Émissions évitées grâce au télétravail', 'tCO₂e')}

            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 12px' }}>
              Déplacements domicile-travail
            </h3>
            {champInput('distance_domicile_travail_km', 'Distance domicile-travail agrégée', 'km')}
            {champInput('emissions_domicile_travail_tco2e', 'Émissions associées', 'tCO₂e')}
            {champInput('mode_voiture_pct', 'Répartition modes — Voiture', '%')}
            {champInput('mode_covoiturage_pct', 'Répartition modes — Covoiturage', '%')}
            {champInput('mode_transports_commun_pct', 'Répartition modes — Transports en commun', '%')}
            {champInput('mode_velo_pct', 'Répartition modes — Vélo', '%')}
            {champInput('mode_marche_pct', 'Répartition modes — Marche', '%')}
            {champInput('collaborateurs_covoiturage_pct', 'Collaborateurs pratiquant le covoiturage', '%')}

            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 12px' }}>
              Sensibilisation & satisfaction
            </h3>
            {champInput('sensibilisation_climat_pct', 'Niveau de sensibilisation climat des collaborateurs', '%')}
            {champInput('collaborateurs_formes_climat_pct', 'Collaborateurs formés aux enjeux climat', '%')}
            {champInput('satisfaction_politique_climat_pct', "Satisfaction vis-à-vis de la politique climat de l'entreprise", '%')}

            {erreur && <p style={{ color: '#B91C1C', fontSize: 13 }}>{erreur}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button
                onClick={onClose}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E1DA', background: '#fff', color: '#78716C', fontSize: 14, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={sauvegarder}
                disabled={sauvegarde}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: COULEUR_PRIMAIRE, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: sauvegarde ? 'not-allowed' : 'pointer', opacity: sauvegarde ? 0.7 : 1,
                }}
              >
                {sauvegarde ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}