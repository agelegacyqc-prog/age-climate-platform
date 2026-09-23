// src/pages/metier/NouveauProgrammeTrajectoire.tsx
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { REGIONS_FRANCE, regionCodeFromNom } from '../../lib/ageadaptRegions'

const TRAJECTOIRE_PRIMARY = '#0D9488'

interface Organisation {
  id: string
  raison_sociale: string
}

export default function NouveauProgrammeTrajectoire() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const [nom, setNom] = useState('')
  const [region, setRegion] = useState('')
  const [organisationQuery, setOrganisationQuery] = useState('')
  const [organisationSelectionnee, setOrganisationSelectionnee] = useState<Organisation | null>(null)
  const [suggestions, setSuggestions] = useState<Organisation[]>([])
  const [loadingOrg, setLoadingOrg] = useState(false)

  const searchOrganisation = async (q: string) => {
    setOrganisationQuery(q)
    setOrganisationSelectionnee(null)
    if (q.length < 2) { setSuggestions([]); return }
    setLoadingOrg(true)
    const { data } = await supabase
      .from('organisations')
      .select('id, raison_sociale')
      .ilike('raison_sociale', `%${q}%`)
      .limit(8)
    setSuggestions(data ?? [])
    setLoadingOrg(false)
  }

  const selectOrganisation = (o: Organisation) => {
    setOrganisationSelectionnee(o)
    setOrganisationQuery(o.raison_sociale)
    setSuggestions([])
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #E5E1DA', borderRadius: '8px',
    fontSize: '13px', fontFamily: 'inherit',
    background: 'white', color: '#1F2937', outline: 'none',
  }
  const labelStyle = {
    fontSize: '11px', color: '#78716C',
    fontWeight: 500, marginBottom: '4px', display: 'block',
  }

  const peutEnregistrer = nom.trim().length > 0 && organisationSelectionnee !== null

  const handleSave = async () => {
    if (!peutEnregistrer || !organisationSelectionnee) return
    setSaving(true)

    // Auto-assignation : un consultant qui crée un programme en devient le
    // consultant assigné (même pattern qu'AGEadaptMission.tsx, nécessaire
    // pour trajectoire_programmes_write si sa condition venait à se durcir).
    const { data: { user: userCourant } } = await supabase.auth.getUser()
    const { data: monProfil } = await supabase
      .from('profils')
      .select('role')
      .eq('id', userCourant?.id)
      .maybeSingle()
    const consultantIdAAssigner = monProfil?.role === 'consultant' ? userCourant?.id ?? null : null

    const { data: programmeCree, error } = await supabase
      .from('trajectoire_programmes')
      .insert({
        nom: nom.trim(),
        organisation_id: organisationSelectionnee.id,
        consultant_id: consultantIdAAssigner,
        region_code: region ? regionCodeFromNom(region) : null,
        statut: 'actif',
      })
      .select()
      .single()

    setSaving(false)

    if (error || !programmeCree) {
      alert('Erreur : ' + (error?.message ?? 'création du programme impossible'))
      return
    }

    navigate(`/metier/trajectoire/${programmeCree.id}`)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#E6F5F3', borderRadius: '10px', padding: '8px' }}>
          <i className="ti ti-route" style={{ fontSize: '20px', color: TRAJECTOIRE_PRIMARY }} />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>Nouveau programme</h1>
          <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>Trajectoire</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle} htmlFor="trajectoire-nom">Nom du programme *</label>
          <input
            id="trajectoire-nom"
            style={inputStyle}
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Ex. : Trajectoire adaptation climat — Groupe Delmas Immobilier"
          />
        </div>

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <label style={labelStyle} htmlFor="trajectoire-organisation">Organisation *</label>
          <input
            id="trajectoire-organisation"
            style={inputStyle}
            value={organisationQuery}
            onChange={e => searchOrganisation(e.target.value)}
            placeholder="Tapez le nom de l'organisation..."
            autoComplete="off"
          />
          {loadingOrg && (
            <div style={{ position: 'absolute', right: '10px', top: '32px', fontSize: '11px', color: '#78716C' }}>
              Recherche...
            </div>
          )}
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'white', border: '1px solid #E5E1DA',
              borderRadius: '8px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              maxHeight: '200px', overflowY: 'auto',
            }}>
              {suggestions.map(o => (
                <div
                  key={o.id}
                  onClick={() => selectOrganisation(o)}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F8F7F4', fontSize: '13px', color: '#1F2937' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = '#F8F7F4')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'white')}
                >
                  {o.raison_sociale}
                </div>
              ))}
            </div>
          )}
          {organisationQuery.length >= 2 && !loadingOrg && suggestions.length === 0 && !organisationSelectionnee && (
            <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px' }}>
              Aucune organisation trouvée — elle doit exister au préalable dans le système.
            </div>
          )}
        </div>

        <div style={{ marginBottom: '4px' }}>
          <label style={labelStyle} htmlFor="trajectoire-region">Région</label>
          <select id="trajectoire-region" style={inputStyle} value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">— sélectionner —</option>
            {REGIONS_FRANCE.map(r => <option key={r.code} value={r.nom}>{r.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          onClick={() => navigate('/metier/trajectoire')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: '1px solid #E5E1DA',
            borderRadius: '8px', padding: '9px 16px', fontSize: '13px',
            cursor: 'pointer', color: '#78716C', fontFamily: 'inherit',
          }}
        >
          <i className="ti ti-chevron-left" style={{ fontSize: '15px' }} /> Retour
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !peutEnregistrer}
          style={{
            background: peutEnregistrer ? TRAJECTOIRE_PRIMARY : '#B5B0A8',
            color: 'white', border: 'none', borderRadius: '8px',
            padding: '9px 18px', fontSize: '13px', fontWeight: 500,
            cursor: peutEnregistrer ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          }}
        >
          {saving ? 'Enregistrement...' : 'Créer le programme'}
        </button>
      </div>
    </div>
  )
}