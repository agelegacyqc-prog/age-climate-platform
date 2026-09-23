// src/pages/metier/ProgrammeTrajectoire.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { focusRing } from '../../lib/a11y'

const TRAJECTOIRE_PRIMARY = '#0D9488'

// ============================================================================
// Types — reflètent le schéma réel (information_schema, session du 15/09/2026)
// ============================================================================

interface Programme {
  id: string
  nom: string
  statut: 'actif' | 'suspendu' | 'clos'
  date_debut: string
  consultant_id: string | null
  region_code: string | null
  organisation_id: string
  archivee: boolean
  archivee_at: string | null
}
interface ActifProgramme {
  liaison_id: string
  actif_id: string
  nom: string
  adresse: string
  impact_net_reference: number | null
  brown_value: {
    impact_net: number
    valeur_ajustee: number
  } | null
  risk_score: {
    score_global: number
    classe_risque: string
  } | null
  reglementations: {
    id: string
    reglementation: string
    echeance: string | null
    effectuee: boolean
    suivi_id: string | null
  }[]
}

interface MissionLiee {
  liaison_id: string
  type_mission: 'b2b' | 'ageadapt'
  mission_id: string
  titre: string
  statut: string
}

interface Avancement {
  missions_realisees: number
  missions_totales: number
  taux_avancement: number | null
}

interface RatioReglementaire {
  obligatoires_totales: number
  obligatoires_effectuees: number
  taux_completion: number | null
}

// ============================================================================
// Composant
// ============================================================================

export default function ProgrammeTrajectoire() {
  const { id: programmeId } = useParams<{ id: string }>()

  const [programme, setProgramme] = useState<Programme | null>(null)
  const [organisationNom, setOrganisationNom] = useState<string>('—')
  const [actifs, setActifs] = useState<ActifProgramme[]>([])
  const [missions, setMissions] = useState<MissionLiee[]>([])
  const [avancement, setAvancement] = useState<Avancement | null>(null)
    const [ratioReglementaire, setRatioReglementaire] = useState<RatioReglementaire | null>(null)
  const [tco2eEvitees, setTco2eEvitees] = useState<number>(0)
  const [showAjoutActif, setShowAjoutActif] = useState(false)
  const [actifsDisponibles, setActifsDisponibles] = useState<{ id: string; nom: string; adresse: string }[]>([])
  const [actifSelectionne, setActifSelectionne] = useState<{ id: string; nom: string } | null>(null)
  const [impactRefSaisi, setImpactRefSaisi] = useState('')
  const [ajoutEnCours, setAjoutEnCours] = useState(false)
  const [showAjoutMission, setShowAjoutMission] = useState(false)
  const [typeMissionAjout, setTypeMissionAjout] = useState<'b2b' | 'ageadapt'>('b2b')
  const [missionsDisponibles, setMissionsDisponibles] = useState<{ id: string; titre: string }[]>([])
  const [missionSelectionnee, setMissionSelectionnee] = useState<string>('')
  const [ajoutMissionEnCours, setAjoutMissionEnCours] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (programmeId) chargerProgramme(programmeId)
  }, [programmeId])

  async function chargerProgramme(id: string) {
    setLoading(true)
    setErreur(null)
    try {
      const { data: prog, error: progErr } = await supabase
              .from('trajectoire_programmes')
        .select('id, nom, statut, date_debut, consultant_id, region_code, organisation_id, archivee, archivee_at')
        .eq('id', id)
        .single()
      if (progErr) throw progErr
      setProgramme(prog)

      const { data: org } = await supabase
        .from('organisations')
        .select('raison_sociale')
        .eq('id', prog.organisation_id)
        .single()
      setOrganisationNom(org?.raison_sociale ?? '—')

      const { data: liaisons, error: liaisonsErr } = await supabase
        .from('trajectoire_programme_actifs')
        .select('id, actif_id, impact_net_reference, actifs(nom, adresse)')
        .eq('programme_id', id)
      if (liaisonsErr) throw liaisonsErr

      const actifIds = (liaisons ?? []).map((l: any) => l.actif_id)

      const { data: bvCases } = actifIds.length
        ? await supabase
            .from('brown_value_cases')
            .select('actif_id, impact_net, valeur_ajustee, created_at')
            .in('actif_id', actifIds)
            .eq('finalise', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
        : { data: [] }

      const { data: scores } = actifIds.length
        ? await supabase
            .from('risk_scores')
            .select('actif_id, score_global, classe_risque, created_at')
            .in('actif_id', actifIds)
            .order('created_at', { ascending: false })
        : { data: [] }

      const { data: reglementaire } = actifIds.length
        ? await supabase
            .from('actifs_reglementaire')
            .select('id, actif_id, reglementation, echeance, statut')
            .in('actif_id', actifIds)
            .eq('statut', 'eligible')
        : { data: [] }

      const liaisonIds = (liaisons ?? []).map((l: any) => l.id)
      const { data: suivis } = liaisonIds.length
        ? await supabase
            .from('trajectoire_reglementation_suivi')
            .select('id, programme_actif_id, reglementation_id, effectuee')
            .in('programme_actif_id', liaisonIds)
        : { data: [] }

      const actifsAssembles: ActifProgramme[] = (liaisons ?? []).map((l: any) => {
        const bv = (bvCases ?? []).find((c: any) => c.actif_id === l.actif_id) ?? null
        const rs = (scores ?? []).find((s: any) => s.actif_id === l.actif_id) ?? null
        const regsObligatoires = (reglementaire ?? []).filter((r: any) => r.actif_id === l.actif_id)
        return {
          liaison_id: l.id,
          actif_id: l.actif_id,
          nom: l.actifs?.nom ?? '—',
          adresse: l.actifs?.adresse ?? '—',
          impact_net_reference: l.impact_net_reference,
          brown_value: bv ? { impact_net: bv.impact_net, valeur_ajustee: bv.valeur_ajustee } : null,
          risk_score: rs ? { score_global: rs.score_global, classe_risque: rs.classe_risque } : null,
          reglementations: regsObligatoires.map((r: any) => {
            const suivi = (suivis ?? []).find(
              (s: any) => s.programme_actif_id === l.id && s.reglementation_id === r.id
            )
            return {
              id: r.id,
              reglementation: r.reglementation,
              echeance: r.echeance,
              effectuee: suivi?.effectuee ?? false,
              suivi_id: suivi?.id ?? null,
            }
          }),
        }
      })
      setActifs(actifsAssembles)

      const { data: liaisonsMissions } = await supabase
        .from('trajectoire_programme_missions')
        .select('id, type_mission, mission_id')
        .eq('programme_id', id)

      const idsB2b = (liaisonsMissions ?? []).filter((m: any) => m.type_mission === 'b2b').map((m: any) => m.mission_id)
      const idsAgeadapt = (liaisonsMissions ?? []).filter((m: any) => m.type_mission === 'ageadapt').map((m: any) => m.mission_id)

      const { data: missionsB2b } = idsB2b.length
        ? await supabase.from('missions').select('id, titre, statut').in('id', idsB2b)
        : { data: [] }
      const { data: missionsAgeadapt } = idsAgeadapt.length
        ? await supabase.from('ageadapt_missions').select('id, raison_sociale, statut').in('id', idsAgeadapt)
        : { data: [] }

      const missionsAssemblees: MissionLiee[] = (liaisonsMissions ?? []).map((l: any) => {
        if (l.type_mission === 'b2b') {
          const m = (missionsB2b ?? []).find((x: any) => x.id === l.mission_id)
          return { liaison_id: l.id, type_mission: 'b2b', mission_id: l.mission_id, titre: m?.titre ?? '—', statut: m?.statut ?? '—' }
        }
        const m = (missionsAgeadapt ?? []).find((x: any) => x.id === l.mission_id)
        return { liaison_id: l.id, type_mission: 'ageadapt', mission_id: l.mission_id, titre: m?.raison_sociale ?? '—', statut: m?.statut ?? '—' }
      })
      setMissions(missionsAssemblees)

      const { data: avancementData, error: avancementErr } = await supabase
        .rpc('calculer_avancement_programme', { p_programme_id: id })
        .single()
      if (avancementErr) throw avancementErr
      setAvancement(avancementData as Avancement)

      const { data: ratioData, error: ratioErr } = await supabase
        .rpc('calculer_ratio_reglementaire_programme', { p_programme_id: id })
        .single()
      if (ratioErr) throw ratioErr
      setRatioReglementaire(ratioData as RatioReglementaire)

      if (idsAgeadapt.length) {
        const { data: actions } = await supabase
          .from('ageadapt_actions')
          .select('gain_ges_tco2e')
          .in('mission_id', idsAgeadapt)
          .neq('statut', 'abandonne')
        setTco2eEvitees((actions ?? []).reduce((sum: number, a: any) => sum + (a.gain_ges_tco2e ?? 0), 0))
      }
     } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur de chargement du programme')
    } finally {
      setLoading(false)
    }
  }

  async function ouvrirAjoutActif() {
    if (!programme) return

    // actifs.client_id référence auth.users (un compte client individuel),
    // pas organisations directement — il faut passer par profils_client
    // pour retrouver tous les comptes clients rattachés à l'organisation.
    const { data: comptesClients } = await supabase
      .from('profils_client')
      .select('id')
      .eq('organisation_id', programme.organisation_id)
    const clientIds = (comptesClients ?? []).map(c => c.id)

    if (clientIds.length === 0) {
      setActifsDisponibles([])
      setActifSelectionne(null)
      setImpactRefSaisi('')
      setShowAjoutActif(true)
      return
    }

    const { data } = await supabase
      .from('actifs')
      .select('id, nom, adresse')
      .in('client_id', clientIds)
    const dejaRattaches = new Set(actifs.map(a => a.actif_id))
    setActifsDisponibles((data ?? []).filter(a => !dejaRattaches.has(a.id)))
    setActifSelectionne(null)
    setImpactRefSaisi('')
    setShowAjoutActif(true)
  }

  async function confirmerAjoutActif() {
    if (!actifSelectionne || !programme) return
    setAjoutEnCours(true)
    const { error } = await supabase.from('trajectoire_programme_actifs').insert({
      programme_id: programme.id,
      actif_id: actifSelectionne.id,
      impact_net_reference: impactRefSaisi ? parseFloat(impactRefSaisi.replace(',', '.')) : null,
      date_reference: impactRefSaisi ? new Date().toISOString().slice(0, 10) : null,
    })
    setAjoutEnCours(false)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    setShowAjoutActif(false)
    if (programmeId) chargerProgramme(programmeId)
  }

  async function chargerMissionsDisponibles(type: 'b2b' | 'ageadapt') {
    if (!programme) return
    const dejaRattachees = new Set(missions.filter(m => m.type_mission === type).map(m => m.mission_id))
    if (type === 'b2b') {
      const { data } = await supabase
        .from('missions')
        .select('id, titre')
        .eq('client_id', programme.organisation_id)
      setMissionsDisponibles((data ?? []).filter(m => !dejaRattachees.has(m.id)).map(m => ({ id: m.id, titre: m.titre ?? '(sans titre)' })))
    } else {
      const { data } = await supabase
        .from('ageadapt_missions')
        .select('id, raison_sociale')
        .eq('organisation_id', programme.organisation_id)
      setMissionsDisponibles((data ?? []).filter(m => !dejaRattachees.has(m.id)).map(m => ({ id: m.id, titre: m.raison_sociale })))
    }
  }

  async function ouvrirAjoutMission() {
    setMissionSelectionnee('')
    setTypeMissionAjout('b2b')
    await chargerMissionsDisponibles('b2b')
    setShowAjoutMission(true)
  }

  async function changerTypeMissionAjout(type: 'b2b' | 'ageadapt') {
    setTypeMissionAjout(type)
    setMissionSelectionnee('')
    await chargerMissionsDisponibles(type)
  }

  async function confirmerAjoutMission() {
    if (!missionSelectionnee || !programme) return
    setAjoutMissionEnCours(true)
    const { error } = await supabase.from('trajectoire_programme_missions').insert({
      programme_id: programme.id,
      type_mission: typeMissionAjout,
      mission_id: missionSelectionnee,
    })
    setAjoutMissionEnCours(false)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    setShowAjoutMission(false)
    if (programmeId) chargerProgramme(programmeId)
  }

  async function retirerActif(liaisonId: string, nom: string) {
    if (!window.confirm(`Retirer "${nom}" du programme ? Le rattachement sera supprimé définitivement (aucun historique conservé).`)) return
    const { error } = await supabase.from('trajectoire_programme_actifs').delete().eq('id', liaisonId)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    if (programmeId) chargerProgramme(programmeId)
  }

  async function retirerMission(liaisonId: string, titre: string) {
    if (!window.confirm(`Retirer la mission "${titre}" du programme ? Le rattachement sera supprimé définitivement.`)) return
    const { error } = await supabase.from('trajectoire_programme_missions').delete().eq('id', liaisonId)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    if (programmeId) chargerProgramme(programmeId)
  }

  async function toggleArchivageProgramme() {
    if (!programme) return
    const archivage = !programme.archivee
    const message = archivage
      ? `Archiver le programme "${programme.nom}" ? Il disparaîtra des listes mais restera consultable via ce lien.`
      : `Restaurer le programme "${programme.nom}" ? Il réapparaîtra dans les listes.`
    if (!window.confirm(message)) return
    const { error } = await supabase
      .from('trajectoire_programmes')
      .update({ archivee: archivage })
      .eq('id', programme.id)
    if (error) {
      alert(archivage
        ? "Vous n'avez pas les droits pour archiver ce programme (réservé admin/admin_national)."
        : "Vous n'avez pas les droits pour restaurer ce programme (réservé admin/admin_national).")
      return
    }
    if (programmeId) chargerProgramme(programmeId)
  }

  async function toggleReglementationEffectuee(
    liaisonId: string, reglementationId: string, suiviId: string | null, nouvelEtat: boolean
  ) {
    if (suiviId) {
      await supabase
        .from('trajectoire_reglementation_suivi')
        .update({ effectuee: nouvelEtat, effectuee_le: nouvelEtat ? new Date().toISOString().slice(0, 10) : null })
        .eq('id', suiviId)
    } else {
      await supabase.from('trajectoire_reglementation_suivi').insert({
        programme_actif_id: liaisonId, reglementation_id: reglementationId,
        effectuee: nouvelEtat, effectuee_le: nouvelEtat ? new Date().toISOString().slice(0, 10) : null,
      })
    }
    if (programmeId) chargerProgramme(programmeId)
  }

  const impactNetMoyen = (() => {
    const avecBv = actifs.filter(a => a.brown_value)
    return avecBv.length ? avecBv.reduce((s, a) => s + (a.brown_value?.impact_net ?? 0), 0) / avecBv.length : null
  })()

  const impactNetReferenceMoyen = (() => {
    const avecRef = actifs.filter(a => a.impact_net_reference !== null)
    return avecRef.length ? avecRef.reduce((s, a) => s + (a.impact_net_reference ?? 0), 0) / avecRef.length : null
  })()

  const deltaImpactNet =
    impactNetMoyen !== null && impactNetReferenceMoyen !== null ? impactNetMoyen - impactNetReferenceMoyen : null

  const valeurAjusteeCumulee = actifs.reduce((s, a) => s + (a.brown_value?.valeur_ajustee ?? 0), 0)

  const fmtPct = (v: number | null) =>
    v === null ? '—' : `${v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace('.', ',')} %`
  const fmtEur = (v: number) => `${Math.round(v).toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} €`

  if (loading) return <div style={{ padding: '24px', color: '#78716C', fontSize: '13px' }}>Chargement du programme…</div>
  if (erreur) return <div style={{ padding: '24px', color: '#B91C1C', fontSize: '13px' }}>Erreur : {erreur}</div>
  if (!programme) return null

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#E6F5F3', borderRadius: '10px', padding: '8px', display: 'flex' }}>
            <i className="ti ti-route" style={{ fontSize: '22px', color: TRAJECTOIRE_PRIMARY }} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{programme.nom}</h1>
            <p style={{ fontSize: '13px', color: '#78716C', margin: 0 }}>
              {organisationNom} · {actifs.length} actif{actifs.length > 1 ? 's' : ''} suivi{actifs.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {programme.archivee && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              background: '#F1F0ED', color: '#78716C',
            }}>
              <i className="ti ti-archive" style={{ fontSize: '13px' }} />
              Archivé{programme.archivee_at ? ` le ${new Date(programme.archivee_at).toLocaleDateString('fr-FR')}` : ''}
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
            background: '#E6F5F3', color: '#0B786D',
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: '13px' }} />
            {programme.statut === 'actif' ? 'Programme actif' : programme.statut}
          </span>
          <button
            onClick={toggleArchivageProgramme}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent',
              border: '1px solid #E5E1DA', borderRadius: '6px', padding: '5px 10px',
              fontSize: '12px', color: '#78716C', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className={`ti ${programme.archivee ? 'ti-refresh' : 'ti-archive'}`} style={{ fontSize: '13px' }} />
            {programme.archivee ? 'Restaurer' : 'Archiver'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          {
            label: 'Décote climatique moyenne — Brown Value',
            value: fmtPct(impactNetMoyen),
            icon: 'ti-home', color: '#B25C2A',
            sub: deltaImpactNet !== null
              ? `${deltaImpactNet >= 0 ? '+' : ''}${deltaImpactNet.toFixed(1).replace('.', ',')} pts vs référence`
              : undefined,
          },
          {
            label: 'Score AGEadapt/TRACC moyen',
            value: actifs.filter(a => a.risk_score).length
              ? Math.round(actifs.reduce((s, a) => s + (a.risk_score?.score_global ?? 0), 0) / actifs.filter(a => a.risk_score).length).toString()
              : '—',
            icon: 'ti-leaf', color: '#2F7D5C',
            sub: `${actifs.filter(a => a.risk_score?.classe_risque === 'critique').length} critique · ${actifs.filter(a => a.risk_score?.classe_risque === 'eleve').length} élevé`,
          },
          {
            label: 'tCO₂e évitées cumulées',
            value: `${tco2eEvitees.toLocaleString('fr-FR')} t`,
            icon: 'ti-cloud', color: '#1F2937',
          },
          {
            label: 'Réglementation obligatoire effectuée',
            value: ratioReglementaire?.taux_completion !== null && ratioReglementaire?.taux_completion !== undefined
              ? `${ratioReglementaire.taux_completion} %` : '—',
            icon: 'ti-shield-check', color: '#0369A1',
            sub: ratioReglementaire ? `${ratioReglementaire.obligatoires_effectuees} / ${ratioReglementaire.obligatoires_totales} obligations` : undefined,
          },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '16px', borderTop: `3px solid ${kpi.color}` }}>
            <div style={{ marginBottom: '8px' }}><i className={`ti ${kpi.icon}`} style={{ fontSize: '18px', color: kpi.color }} /></div>
            <div style={{ fontSize: '10px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1F2937', fontFamily: 'JetBrains Mono, monospace' }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: '11px', color: '#78716C', marginTop: '4px' }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Valeur ajustée + avancement */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '16px' }}>
          <div style={{ fontSize: '10px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            Valeur ajustée Brown Value cumulée
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2F7D5C', fontFamily: 'JetBrains Mono, monospace' }}>{fmtEur(valeurAjusteeCumulee)}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#78716C', marginBottom: '8px' }}>
            <span>Avancement du programme</span>
            <strong style={{ color: '#1F2937', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
              {avancement?.missions_realisees ?? 0} / {avancement?.missions_totales ?? 0} missions
            </strong>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: '#E5E1DA', overflow: 'hidden' }}>
            <div style={{ width: `${avancement?.taux_avancement ?? 0}%`, height: '100%', background: TRAJECTOIRE_PRIMARY, borderRadius: '999px' }} />
          </div>
        </div>
      </div>

      {/* Deux référentiels — jamais fusionnés */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
             <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500,
              padding: '4px 9px', borderRadius: '6px', background: '#FBEEE6', color: '#99461D',
            }}>
              <i className="ti ti-home" style={{ fontSize: '12px' }} /> Brown Value — 6 aléas fixes
            </span>
            <button
              onClick={ouvrirAjoutActif}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent',
                border: '1px solid #E5E1DA', borderRadius: '6px', padding: '4px 9px',
                fontSize: '11px', color: '#78716C', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: '12px' }} /> Actif
            </button>
          </div>
            {actifs.map(a => (
            <div key={a.liaison_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E5E1DA', fontSize: '13px' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{a.nom}</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>{a.adresse}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 500 }}>
                  {a.brown_value ? fmtPct(a.brown_value.impact_net) : '—'}
                </span>
                <button
                  onClick={() => retirerActif(a.liaison_id, a.nom)}
                  aria-label={`Retirer ${a.nom} du programme`}
                  title="Retirer du programme"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '26px', background: 'transparent',
                    border: 'none', borderRadius: '6px', color: '#B91C1C', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: '14px' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500,
            padding: '4px 9px', borderRadius: '6px', marginBottom: '12px', background: '#E1F5EE', color: '#0F6E56',
          }}>
            <i className="ti ti-leaf" style={{ fontSize: '12px' }} /> AGEadapt / TRACC — 8 aléas
          </span>
          {actifs.map(a => (
            <div key={a.liaison_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #E5E1DA', fontSize: '13px' }}>
              <span>{a.nom}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 500 }}>
                {a.risk_score ? `${a.risk_score.score_global} — ${a.risk_score.classe_risque}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist réglementaire par actif */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#0369A1' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Réglementations obligatoires
          </span>
        </div>
        {actifs.map(a => a.reglementations.length > 0 && (
          <div key={a.liaison_id} style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}>{a.nom}</div>
            {a.reglementations.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0', color: '#1F2937' }}>
                <input
                  type="checkbox"
                  checked={r.effectuee}
                  onChange={e => toggleReglementationEffectuee(a.liaison_id, r.id, r.suivi_id, e.target.checked)}
                  {...focusRing(TRAJECTOIRE_PRIMARY)}
                />
                <span>{r.reglementation}</span>
                {r.echeance && <span style={{ color: '#78716C', marginLeft: 'auto' }}>échéance {new Date(r.echeance).toLocaleDateString('fr-FR')}</span>}
              </label>
            ))}
          </div>
        ))}
      </div>

      {/* Missions rattachées */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <i className="ti ti-briefcase" style={{ fontSize: '16px', color: TRAJECTOIRE_PRIMARY }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Missions rattachées
          </span>
          <button
            onClick={ouvrirAjoutMission}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent',
              border: '1px solid #E5E1DA', borderRadius: '6px', padding: '4px 9px',
              fontSize: '11px', color: '#78716C', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: '12px' }} /> Mission
          </button>
        </div>
        {missions.map(m => (
          <div key={m.liaison_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #E5E1DA' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: m.type_mission === 'b2b' ? '#0369A1' : '#2F7D5C',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className={`ti ${m.type_mission === 'b2b' ? 'ti-stack-2' : 'ti-target-arrow'}`} style={{ fontSize: '16px', color: 'white' }} />
            </div>
             <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{m.titre}</div>
              <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                {m.type_mission === 'b2b' ? 'Mission B2B' : 'AGEadapt'} · statut : {m.statut}
              </div>
            </div>
            <button
              onClick={() => retirerMission(m.liaison_id, m.titre)}
              aria-label={`Retirer la mission ${m.titre} du programme`}
              title="Retirer du programme"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '26px', height: '26px', background: 'transparent',
                border: 'none', borderRadius: '6px', color: '#B91C1C', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <i className="ti ti-trash" style={{ fontSize: '14px' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Modale ajout actif */}
      {showAjoutActif && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '420px', maxWidth: '90vw', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '14px' }}>Ajouter un actif au programme</h3>

            {actifsDisponibles.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#78716C' }}>
                Aucun actif disponible — soit tous les actifs de cette organisation sont déjà rattachés, soit l'organisation n'a pas d'actif enregistré.
              </p>
            ) : (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', color: '#78716C', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Actif *</label>
                  <select
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px' }}
                    value={actifSelectionne?.id ?? ''}
                    onChange={e => {
                      const a = actifsDisponibles.find(x => x.id === e.target.value)
                      setActifSelectionne(a ? { id: a.id, nom: a.nom } : null)
                    }}
                  >
                    <option value="">— sélectionner —</option>
                    {actifsDisponibles.map(a => (
                      <option key={a.id} value={a.id}>{a.nom} — {a.adresse}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '11px', color: '#78716C', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Impact net de référence (%, optionnel) — saisie consultant au moment du diagnostic initial
                  </label>
                  <input
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px' }}
                    value={impactRefSaisi}
                    onChange={e => setImpactRefSaisi(e.target.value)}
                    placeholder="Ex. : -4,2"
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAjoutActif(false)}
                style={{ padding: '8px 14px', border: '1px solid #E5E1DA', borderRadius: '8px', background: 'white', color: '#78716C', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmerAjoutActif}
                disabled={!actifSelectionne || ajoutEnCours}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: '8px',
                  background: actifSelectionne ? TRAJECTOIRE_PRIMARY : '#B5B0A8', color: 'white',
                  fontSize: '13px', fontWeight: 500, cursor: actifSelectionne ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                }}
              >
                {ajoutEnCours ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale ajout mission */}
      {showAjoutMission && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '420px', maxWidth: '90vw', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '14px' }}>Ajouter une mission au programme</h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {(['b2b', 'ageadapt'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => changerTypeMissionAjout(t)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    border: typeMissionAjout === t ? `2px solid ${t === 'b2b' ? '#0369A1' : '#2F7D5C'}` : '1px solid #E5E1DA',
                    background: typeMissionAjout === t ? (t === 'b2b' ? '#EFF6FF' : '#E1F5EE') : 'white',
                    color: typeMissionAjout === t ? (t === 'b2b' ? '#0369A1' : '#2F7D5C') : '#78716C',
                  }}
                >
                  {t === 'b2b' ? 'Mission B2B' : 'AGEadapt'}
                </button>
              ))}
            </div>

            {missionsDisponibles.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '18px' }}>
                Aucune mission {typeMissionAjout === 'b2b' ? 'B2B' : 'AGEadapt'} disponible pour cette organisation.
              </p>
            ) : (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '11px', color: '#78716C', fontWeight: 500, marginBottom: '4px', display: 'block' }}>Mission *</label>
                <select
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px' }}
                  value={missionSelectionnee}
                  onChange={e => setMissionSelectionnee(e.target.value)}
                >
                  <option value="">— sélectionner —</option>
                  {missionsDisponibles.map(m => (
                    <option key={m.id} value={m.id}>{m.titre}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAjoutMission(false)}
                style={{ padding: '8px 14px', border: '1px solid #E5E1DA', borderRadius: '8px', background: 'white', color: '#78716C', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmerAjoutMission}
                disabled={!missionSelectionnee || ajoutMissionEnCours}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: '8px',
                  background: missionSelectionnee ? TRAJECTOIRE_PRIMARY : '#B5B0A8', color: 'white',
                  fontSize: '13px', fontWeight: 500, cursor: missionSelectionnee ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                }}
              >
                {ajoutMissionEnCours ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}