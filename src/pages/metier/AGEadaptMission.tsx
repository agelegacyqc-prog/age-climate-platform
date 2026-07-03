import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import {
  Leaf, ChevronRight, ChevronLeft, Check,
  Info, Calculator, BadgeCheck, Settings, Shield, TrendingDown,
} from 'lucide-react'
import { REGIONS_FRANCE, regionCodeFromNom } from '../../lib/ageadaptRegions'
import { clickableCardProps, focusRing, AGEADAPT_PRIMARY } from '../../lib/a11y'
import { simulerTarif, type MethodeAgeadapt } from '../../lib/ageadaptTarif'

const ETAPES = [
  'Qualification client',
  'Méthodes & périmètre',
  'Données & upload',
  'Cadrage mission',
  'Validation & tarif',
]

const METHODES = [
  { id: 'abc', label: 'Bilan Carbone® ABC', desc: 'GES Scope 1–3, AGEcarbon, plan de transition', tags: ['Entreprise', 'Collectivité'] },
  { id: 'act', label: 'ACT Adaptation', desc: 'Maturité adaptation, 3 dimensions, 9 modules, matrice 5 niveaux', tags: ['Entreprise'] },
  { id: 'vuln', label: 'Diagnostic vulnérabilité', desc: 'Exposition, sensibilité, capacité adaptation, aléas TRACC / GIEC', tags: ['Collectivité'] },
  { id: 'full', label: 'Mission complète', desc: 'ABC + ACT + Vulnérabilité, livrables CSRD-compatibles', tags: ['Entreprise', 'Collectivité'] },
]

// Libellés complets §4.7 fiche v1.1 — repris mot pour mot, ne pas reformuler
const ALEAS = [
  'Inondation (pluviale, fluviale, nappe, coulée de boue)',
  'Vagues de chaleur / stress thermique / îlot de chaleur',
  'Sécheresse / stress hydrique / intrusion saline',
  'Feux de forêt',
  'Tempêtes / grêle / vents violents / tornades',
  'RGA — Retrait-gonflement des argiles / gel-dégel',
  'Submersion / recul du trait de côte',
  'Épisodes froids / gel tardif / neige et verglas',
]

type CategorieRisque = {
  titre: string
  couleur: string
  bg: string
  icone: typeof Settings
  champs: { key: string; label: string }[]
}

const CATEGORIES_RISQUES: CategorieRisque[] = [
  {
    titre: 'Risques opérationnels', couleur: '#0369A1', bg: '#EFF6FF',
    icone: Settings,
    champs: [
      { key: 'risque_territoire', label: 'Exposition du/des sites aux aléas climatiques' },
      { key: 'risque_installations', label: 'Vulnérabilité des bâtiments et conditions de travail' },
      { key: 'risque_chaine', label: 'Dépendances eau / énergie / transport / télécom' },
    ],
  },
  {
    titre: 'Risques assurantiels', couleur: '#D97706', bg: '#FFFBEB',
    icone: Shield,
    champs: [
      { key: 'difficulte_assurance', label: 'Difficulté à assurer les actifs ou activités' },
      { key: 'sinistres_passes', label: 'Sinistres climatiques sur les 5 dernières années' },
    ],
  },
  {
    titre: 'Risques financiers', couleur: '#B91C1C', bg: '#FEF2F2',
    icone: TrendingDown,
    champs: [
      { key: 'impact_couts', label: 'Répercussion sur les coûts d\'exploitation' },
      { key: 'impact_competitivite', label: 'Impact sur la compétitivité / clients / marchés' },
    ],
  },
]

const TJM = 950

function calculerSimulation(form: {
  methode: string
  effectif_tranche: string
  nb_sites_tranche: string
  bilan_existant: boolean
  maturite_donnees: string
}) {
  // Source unique de vérité : simulerTarif (src/lib/ageadaptTarif.ts), formule §4.1 / §4.2.
  // Fallback « vide → tranche 1 » préservé (comportement historique) : l'étape 5 est
  // atteignable sans effectif/sites renseignés, et simulerTarif lève sur tranche hors bornes.
  const t = simulerTarif({
    methode: form.methode as MethodeAgeadapt,
    effectifTranche: parseInt(form.effectif_tranche) || 1,
    nbSitesTranche: parseInt(form.nb_sites_tranche) || 1,
    bilanExistant: form.bilan_existant,
    maturiteDonnees: parseInt(form.maturite_donnees) || 1,
  })
  return {
    j: t.joursConsultant,
    duree: t.dureeMois,
    tL: t.tarifBasHt,
    tH: t.tarifHautHt,
    phases: [t.phases[0].pct, t.phases[1].pct, t.phases[2].pct] as [number, number, number],
    ph1j: t.phases[0].jours,
    ph2j: t.phases[1].jours,
    ph3j: t.phases[2].jours,
    m1: t.phases[0].montant,
    m2: t.phases[1].montant,
    m3: t.phases[2].montant,
  }
}

export default function AGEadaptMission() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState(0)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSiren, setLoadingSiren] = useState(false)

  const searchEntreprise = async (nom: string) => {
    set('raison_sociale', nom)
    if (nom.length < 3) { setSuggestions([]); return }
    setLoadingSiren(true)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(nom)}&limit=5`)
      const data = await res.json()
      setSuggestions(data.results || [])
    } catch { setSuggestions([]) }
    setLoadingSiren(false)
  }

  const selectEntreprise = (e: any) => {
    setForm(f => ({
      ...f,
      raison_sociale: e.nom_complet || e.nom_raison_sociale || '',
      siren: e.siren || '',
      secteur_naf: e.activite_principale || '',
    }))
    setSuggestions([])
  }

  const [form, setForm] = useState({
    raison_sociale: '',
    siren: '',
    type_structure: '',
    secteur_naf: '',
    effectif_tranche: '',
    nb_sites_tranche: '',
    region: '',
    bilan_existant: false,
    diagnostic_existant: false,
    plan_transition_init: false,
    pcaet_adopte: false,
    methode: '',
    scope1: true,
    scope2: true,
    scope3_transport: true,
    scope3_achats: true,
    scope3_produits: false,
    scope3_autres: false,
    aleas: [] as string[],              // couverture de mission (étape 2)
    aleas_identifies: [] as string[],   // exposition déjà documentée (étape 4, collectivité)
    maturite_donnees: '1',
    total_tco2e: '',
    annee_reporting: '',
    methode_bilan: '',
    scope1_pct: '',
    scope2_pct: '',
    scope3_pct: '',
    poste_majeur_1: '',
    objectif_reduction: '',
    risques: {} as Record<string, string>,
    horizon_2030: false,
    horizon_2040: false,
    horizon_2050: false,
    mesure_33: false,
    mesure_40: false,
    mesure_41: false,
    tracc_utilisee: false,
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleAlea = (a: string) => {
    setForm(f => ({
      ...f,
      aleas: f.aleas.includes(a) ? f.aleas.filter(x => x !== a) : [...f.aleas, a]
    }))
  }

  const toggleAleaIdentifie = (a: string) => {
    setForm(f => ({
      ...f,
      aleas_identifies: f.aleas_identifies.includes(a)
        ? f.aleas_identifies.filter(x => x !== a)
        : [...f.aleas_identifies, a]
    }))
  }

  const handleSave = async () => {
    setSaving(true)

    // Transformation des champs étape 4 (Cadrage mission) vers le schéma §7 fiche v1.1
    const risqueOperationnel = {
      territoire: form.risques.risque_territoire || null,
      installations: form.risques.risque_installations || null,
      chaine_logistique: form.risques.risque_chaine || null,
    }
    const risqueAssuranciel = {
      difficulte: form.risques.difficulte_assurance || null,
      sinistres_passes: form.risques.sinistres_passes || null,
    }
    const risqueFinancier = {
      impact_couts: form.risques.impact_couts || null,
      impact_competitivite: form.risques.impact_competitivite || null,
    }
    const horizons = [
      form.horizon_2030 ? '2030' : null,
      form.horizon_2040 ? '2040' : null,
      form.horizon_2050 ? '2050' : null,
    ].filter((h): h is string => h !== null)
    const mesuresPnacc = [
      form.mesure_33 ? '33' : null,
      form.mesure_40 ? '40' : null,
      form.mesure_41 ? '41' : null,
    ].filter((m): m is string => m !== null)

    const { data: missionCreee, error } = await supabase
      .from('ageadapt_missions')
      .insert({
        raison_sociale: form.raison_sociale,
        siren: form.siren,
        type_structure: form.type_structure || null,
        secteur_naf: form.secteur_naf,
        effectif_tranche: parseInt(form.effectif_tranche) || null,
        nb_sites_tranche: parseInt(form.nb_sites_tranche) || null,
        region: form.region,
        region_code: regionCodeFromNom(form.region),
        bilan_existant: form.bilan_existant,
        diagnostic_existant: form.diagnostic_existant,
        plan_transition_init: form.plan_transition_init,
        pcaet_adopte: form.pcaet_adopte,
        methode: form.methode || null,
        scope1: form.scope1,
        scope2: form.scope2,
        scope3_transport: form.scope3_transport,
        scope3_achats: form.scope3_achats,
        scope3_produits: form.scope3_produits,
        scope3_autres: form.scope3_autres,
        aleas: form.aleas,
        aleas_identifies: form.aleas_identifies,
        maturite_donnees: parseInt(form.maturite_donnees),
        risque_operationnel: risqueOperationnel,
        risque_assuranciel: risqueAssuranciel,
        risque_financier: risqueFinancier,
        horizons,
        mesures_pnacc: mesuresPnacc,
        tracc_utilisee: form.tracc_utilisee,
        etape_courante: 1,
        statut: 'brouillon',
      })
      .select()
      .single()

    if (error || !missionCreee) {
      alert('Erreur : ' + (error?.message ?? 'création de la mission impossible'))
      setSaving(false)
      return
    }

    const { j, duree, tL, tH, phases, ph1j, ph2j, ph3j, m1, m2, m3 } = calculerSimulation(form)

    // Montants par phase issus de simulerTarif (§4.1) — base milieu de fourchette (tL+tH)/2,
    // résidu sur la dernière phase (Σ = milieu). Décision PO 03/07/2026.
    const { error: simError } = await supabase.from('ageadapt_simulations').insert({
      mission_id: missionCreee.id,
      type_structure: form.type_structure,
      effectif_tranche: parseInt(form.effectif_tranche) || null,
      nb_sites_tranche: parseInt(form.nb_sites_tranche) || null,
      methode: form.methode,
      bilan_existant: form.bilan_existant,
      maturite_donnees: parseInt(form.maturite_donnees),
      jours_consultant: j,
      duree_mois: duree,
      tarif_bas_ht: tL,
      tarif_haut_ht: tH,
      tjm_reference: TJM,
      phase1_jours: ph1j,
      phase1_pct: phases[0],
      phase1_montant: m1,
      phase2_jours: ph2j,
      phase2_pct: phases[1],
      phase2_montant: m2,
      phase3_jours: ph3j,
      phase3_pct: phases[2],
      phase3_montant: m3,
    })

    setSaving(false)

    if (simError) {
      alert('Mission enregistrée, mais la simulation tarifaire n\'a pas pu être sauvegardée : ' + simError.message)
    }

    navigate(`/metier/ageadapt/${missionCreee.id}`)
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #E5E1DA', borderRadius: '8px',
    fontSize: '13px', fontFamily: 'inherit',
    background: 'white', color: '#1F2937', outline: 'none',
  }

  const labelStyle = {
    fontSize: '11px', color: '#78716C',
    fontWeight: 500, marginBottom: '4px', display: 'block'
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '8px' }}>
          <Leaf size={20} color="#2F7D5C" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>Nouvelle mission</h1>
          <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>AGEadapt</p>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {ETAPES.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < ETAPES.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600,
                background: i < etape ? '#1D9E75' : i === etape ? '#E1F5EE' : 'white',
                border: i === etape ? '2px solid #1D9E75' : '1px solid #E5E1DA',
                color: i < etape ? 'white' : i === etape ? '#1D9E75' : '#78716C',
              }}>
                {i < etape ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: '9px', color: i === etape ? '#1D9E75' : '#78716C', marginTop: '4px', whiteSpace: 'nowrap' }}>
                {e}
              </span>
            </div>
            {i < ETAPES.length - 1 && (
              <div style={{ flex: 1, height: '1px', background: i < etape ? '#1D9E75' : '#E5E1DA', margin: '0 4px', marginBottom: '16px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Etape 1 — Qualification */}
      {etape === 0 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>Qualification client</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle} htmlFor="ageadapt-raison-sociale">Raison sociale *</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={inputStyle}
                  value={form.raison_sociale}
                  onChange={e => searchEntreprise(e.target.value)}
                  placeholder="Tapez le nom de l'entreprise..."
                  autoComplete="off"
                />
                {loadingSiren && (
                  <div style={{ position: 'absolute', right: '10px', top: '8px', fontSize: '11px', color: '#78716C' }}>
                    Recherche...
                  </div>
                )}
                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'white', border: '1px solid #E5E1DA',
                    borderRadius: '8px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {suggestions.map((e, i) => (
                      <div
                        key={i}
                        onClick={() => selectEntreprise(e)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F8F7F4' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = '#F8F7F4')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'white')}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>
                          {e.nom_complet || e.nom_raison_sociale}
                        </div>
                        <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                          SIREN : {e.siren} — {e.activite_principale} — {e.siege?.commune}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div><label style={labelStyle} htmlFor="ageadapt-siren">SIREN</label><input id="ageadapt-siren" style={inputStyle} value={form.siren} onChange={e => set('siren', e.target.value)} placeholder="9 chiffres" /></div>
            <div>
              <label style={labelStyle} htmlFor="ageadapt-type-structure">Type de structure *</label>
<select id="ageadapt-type-structure" style={inputStyle} value={form.type_structure} onChange={e => set('type_structure', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option value="entreprise">Entreprise / Groupe</option>
                <option value="collectivite">Collectivité / EPCI</option>
                <option value="asso">Association</option>
              </select>
            </div>
            <div><label style={labelStyle} htmlFor="ageadapt-secteur-naf">Secteur (NAF)</label><input id="ageadapt-secteur-naf" style={inputStyle} value={form.secteur_naf} onChange={e => set('secteur_naf', e.target.value)} placeholder="Ex. : 4941A" /></div>
            <div>
              <label style={labelStyle} htmlFor="ageadapt-effectif">Effectif (ETP)</label>
<select id="ageadapt-effectif" style={inputStyle} value={form.effectif_tranche} onChange={e => set('effectif_tranche', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option value="1">1 à 10</option>
                <option value="2">11 à 49</option>
                <option value="3">50 à 249</option>
                <option value="4">250 à 499</option>
                <option value="5">500 à 999</option>
                <option value="6">1 000+</option>
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="ageadapt-sites">Nombre de sites</label>
<select id="ageadapt-sites" style={inputStyle} value={form.nb_sites_tranche} onChange={e => set('nb_sites_tranche', e.target.value)}>
                <option value="">— sélectionner —</option>
                <option value="1">1 site</option>
                <option value="2">2 à 3 sites</option>
                <option value="3">4 à 9 sites</option>
                <option value="4">10 sites et +</option>
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="ageadapt-region">Région</label>
<select id="ageadapt-region" style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
                <option value="">— sélectionner —</option>
                {REGIONS_FRANCE.map(r => <option key={r.code} value={r.nom}>{r.nom}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', background: '#F8F7F4', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '12px' }}>Situation existante</p>
           {[
  { key: 'bilan_existant', label: 'Bilan carbone existant', sub: 'Le client dispose déjà d\'un bilan GES' },
  { key: 'diagnostic_existant', label: 'Diagnostic de vulnérabilité existant', sub: 'Étude territoire ou entreprise conduite' },
  { key: 'plan_transition_init', label: 'Plan de transition initié', sub: 'Feuille de route bas-carbone commencée' },
  { key: 'pcaet_adopte', label: 'PCAET adopté (collectivités)', sub: 'Plan Climat Air Énergie Territorial validé' },
].map(item => (
  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E1DA' }}>
    <label htmlFor={`ageadapt-${item.key}`}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#1F2937' }}>{item.label}</div>
      <div style={{ fontSize: '11px', color: '#78716C' }}>{item.sub}</div>
    </label>
    <input id={`ageadapt-${item.key}`} type="checkbox" checked={form[item.key as keyof typeof form] as boolean} onChange={e => set(item.key, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1D9E75' }} />
  </div>
))}
          </div>
        </div>
      )}

      {/* Etape 2 — Méthodes */}
      {etape === 1 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>Méthodes & périmètre</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {METHODES.map(m => (
  <div
    key={m.id}
    onClick={() => set('methode', m.id)}
    aria-pressed={form.methode === m.id}
    {...clickableCardProps(() => set('methode', m.id))}
    {...focusRing(AGEADAPT_PRIMARY)}
    style={{
      border: form.methode === m.id ? '2px solid #1D9E75' : '1px solid #E5E1DA',
      background: form.methode === m.id ? '#E1F5EE' : 'white',
      borderRadius: '12px', padding: '14px', cursor: 'pointer',
    }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#78716C', marginBottom: '8px', lineHeight: 1.5 }}>{m.desc}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {m.tags.map(t => (
                    <span key={t} style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: t === 'Entreprise' ? '#DBEAFE' : '#FEF3C7', color: t === 'Entreprise' ? '#0369A1' : '#D97706', fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '10px' }}>Aléas climatiques — couverts par la mission</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
           {ALEAS.map(a => (
  <div
    key={a}
    onClick={() => toggleAlea(a)}
    aria-pressed={form.aleas.includes(a)}
    {...clickableCardProps(() => toggleAlea(a))}
    {...focusRing(AGEADAPT_PRIMARY)}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
      border: form.aleas.includes(a) ? '1px solid #D97706' : '1px solid #E5E1DA',
      background: form.aleas.includes(a) ? '#FEF3C7' : 'white',
    }}>
                <span style={{ fontSize: '11px', color: form.aleas.includes(a) ? '#D97706' : '#78716C', fontWeight: form.aleas.includes(a) ? 600 : 400 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Etape 3 — Données & bilan */}
      {etape === 2 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>Données & bilan existant</h2>
          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '20px' }}>
            {form.bilan_existant
              ? 'Un bilan carbone existant a été indiqué. Renseignez les données clés pour recaler le périmètre de la mission.'
              : 'Aucun bilan existant. La mission démarrera de zéro.'}
          </p>

          {form.bilan_existant && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Total émissions (tCO₂e)</label>
                <input style={inputStyle} type="number" value={form.total_tco2e} onChange={e => set('total_tco2e', e.target.value)} placeholder="Ex. : 1 250" />
              </div>
              <div>
                <label style={labelStyle}>Année de reporting</label>
                <input style={inputStyle} type="number" value={form.annee_reporting} onChange={e => set('annee_reporting', e.target.value)} placeholder="Ex. : 2023" />
              </div>
              <div>
                <label style={labelStyle}>Méthode utilisée</label>
                <select style={inputStyle} value={form.methode_bilan} onChange={e => set('methode_bilan', e.target.value)}>
                  <option value="">— sélectionner —</option>
                  <option value="ABC">Bilan Carbone® ABC</option>
                  <option value="BEGES">BEGES</option>
                  <option value="GHG">GHG Protocol</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>% Scope 1</label>
                <input style={inputStyle} type="number" value={form.scope1_pct} onChange={e => set('scope1_pct', e.target.value)} placeholder="Ex. : 35" />
              </div>
              <div>
                <label style={labelStyle}>% Scope 2</label>
                <input style={inputStyle} type="number" value={form.scope2_pct} onChange={e => set('scope2_pct', e.target.value)} placeholder="Ex. : 15" />
              </div>
              <div>
                <label style={labelStyle}>% Scope 3</label>
                <input style={inputStyle} type="number" value={form.scope3_pct} onChange={e => set('scope3_pct', e.target.value)} placeholder="Ex. : 50" />
              </div>
              <div>
                <label style={labelStyle}>Poste dominant (libellé)</label>
                <input style={inputStyle} value={form.poste_majeur_1} onChange={e => set('poste_majeur_1', e.target.value)} placeholder="Ex. : Déplacements professionnels" />
              </div>
              <div>
                <label style={labelStyle}>Objectif de réduction (%)</label>
                <input style={inputStyle} type="number" value={form.objectif_reduction} onChange={e => set('objectif_reduction', e.target.value)} placeholder="Ex. : 30" />
              </div>
            </div>
          )}

          <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '10px' }}>Maturité des données disponibles</p>
          <div style={{ display: 'flex', gap: '10px' }}>
           {[
  { val: '1', label: 'Faible', sub: 'Données partielles, estimations' },
  { val: '2', label: 'Moyen', sub: 'Données disponibles, quelques lacunes' },
  { val: '3', label: 'Élevé', sub: 'Données complètes et structurées' },
].map(m => (
  <div
    key={m.val}
    onClick={() => set('maturite_donnees', m.val)}
    aria-pressed={form.maturite_donnees === m.val}
    {...clickableCardProps(() => set('maturite_donnees', m.val))}
    {...focusRing(AGEADAPT_PRIMARY)}
    style={{
      flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
      border: form.maturite_donnees === m.val ? '2px solid #1D9E75' : '1px solid #E5E1DA',
      background: form.maturite_donnees === m.val ? '#E1F5EE' : 'white',
    }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '2px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {form.bilan_existant && (
            <div style={{ marginTop: '16px', background: '#E1F5EE', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={16} color="#1D9E75" />
              <p style={{ fontSize: '12px', color: '#0F6E56', margin: 0 }}>
                Bilan existant détecté — <strong>−35 % de jours estimés</strong> appliqués sur la simulation tarifaire.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Etape 4 — Cadrage mission */}
      {etape === 3 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>Cadrage mission</h2>
          <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '20px' }}>
            {form.type_structure === 'collectivite'
              ? 'Exposition territoriale et ancrage réglementaire PNACC3.'
              : 'Risques climatiques identifiés et horizons temporels analysés.'}
          </p>

          {/* Parcours Entreprise */}
          {form.type_structure !== 'collectivite' && (
            <>
              {CATEGORIES_RISQUES.map(cat => (
                <div key={cat.titre} style={{ marginBottom: '16px', background: cat.bg, borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <cat.icone size={16} color={cat.couleur} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cat.couleur }}>{cat.titre}</span>
                  </div>
                  {cat.champs.map(champ => (
                    <div key={champ.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${cat.couleur}20` }}>
                      <span style={{ fontSize: '12px', color: '#1F2937' }}>{champ.label}</span>
                      <select
                        style={{ ...inputStyle, width: '140px', fontSize: '12px' }}
                        value={form.risques[champ.key] || ''}
                        onChange={e => setForm(f => ({ ...f, risques: { ...f.risques, [champ.key]: e.target.value } }))}
                      >
                        <option value="">—</option>
                        <option value="oui">Oui</option>
                        <option value="non">Non</option>
                        <option value="partiel">Partiel</option>
                        <option value="ne_sait_pas">Ne sait pas</option>
                      </select>
                    </div>
                  ))}
                </div>
              ))}

              <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', margin: '16px 0 10px' }}>Horizons temporels analysés</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { key: 'horizon_2030', label: '2030', sub: '+2°C · Court terme' },
                  { key: 'horizon_2040', label: '2040', sub: '+2,7°C · Moyen terme' },
                  { key: 'horizon_2050', label: '2050', sub: '+3,5°C · Long terme' },
                ].map(h => (
                  <div
  key={h.key}
  onClick={() => set(h.key, !(form as any)[h.key])}
  aria-pressed={!!(form as any)[h.key]}
  {...clickableCardProps(() => set(h.key, !(form as any)[h.key]))}
  {...focusRing(AGEADAPT_PRIMARY)}
  style={{
    flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
    border: (form as any)[h.key] ? '2px solid #1D9E75' : '1px solid #E5E1DA',
    background: (form as any)[h.key] ? '#E1F5EE' : 'white',
  }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', fontFamily: 'JetBrains Mono, monospace' }}>{h.label}</div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>{h.sub}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Parcours Collectivité */}
          {form.type_structure === 'collectivite' && (
            <>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '10px' }}>Aléas déjà documentés</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
              {ALEAS.map(a => (
  <div
    key={a}
    onClick={() => toggleAleaIdentifie(a)}
    aria-pressed={form.aleas_identifies.includes(a)}
    {...clickableCardProps(() => toggleAleaIdentifie(a))}
    {...focusRing(AGEADAPT_PRIMARY)}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
      border: form.aleas_identifies.includes(a) ? '1px solid #1D9E75' : '1px solid #E5E1DA',
      background: form.aleas_identifies.includes(a) ? '#E1F5EE' : 'white',
    }}>
                    <span style={{ fontSize: '11px', color: form.aleas_identifies.includes(a) ? '#1D9E75' : '#78716C', fontWeight: form.aleas_identifies.includes(a) ? 600 : 400 }}>{a}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '10px' }}>Ancrage PNACC3</p>
              {[
  { key: 'mesure_33', label: 'Mesure 33', sub: 'Plan d\'adaptation entreprises du territoire' },
  { key: 'mesure_40', label: 'Mesure 40', sub: 'Évaluation des actions d\'adaptation' },
  { key: 'mesure_41', label: 'Mesure 41', sub: 'Outils ADEME déployés (Climadiag, DRIAS)' },
  { key: 'tracc_utilisee', label: 'TRACC', sub: 'Utilisée comme référence de planification' },
].map(item => (
  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E1DA' }}>
    <label htmlFor={`ageadapt-${item.key}`}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#1F2937' }}>{item.label}</div>
      <div style={{ fontSize: '11px', color: '#78716C' }}>{item.sub}</div>
    </label>
    <input id={`ageadapt-${item.key}`} type="checkbox" checked={!!(form as any)[item.key]} onChange={e => set(item.key, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1D9E75' }} />
  </div>
))}
            </>
          )}
        </div>
      )}

      {/* Etape 5 — Validation & tarif */}
      {etape === 4 && (() => {
        const { j, duree, tL, tH, phases, ph1j, ph2j, ph3j } = calculerSimulation(form)

        const LIBELLES_METHODE: Record<string, string> = {
          abc: 'Bilan Carbone® ABC', act: 'ACT Adaptation',
          vuln: 'Diagnostic vulnérabilité', full: 'Mission complète',
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', marginBottom: '14px' }}>Récapitulatif mission</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Client', val: form.raison_sociale || '—' },
                  { label: 'SIREN', val: form.siren || '—' },
                  { label: 'Méthode', val: LIBELLES_METHODE[form.methode] || '—' },
                  { label: 'Structure', val: form.type_structure || '—' },
                  { label: 'Bilan existant', val: form.bilan_existant ? 'Oui (−35 %)' : 'Non' },
                  { label: 'Maturité données', val: ['Faible', 'Moyen', 'Élevé'][parseInt(form.maturite_donnees) - 1] || '—' },
                ].map(r => (
                  <div key={r.label} style={{ padding: '8px', background: '#F8F7F4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1F2937', marginTop: '2px' }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E1DA', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Calculator size={18} color="#1D9E75" />
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0 }}>Simulation tarifaire</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#1F2937', borderRadius: '10px', padding: '16px', color: 'white' }}>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Jours consultant</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{j}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>jours · TJM {TJM} €/j</div>
                </div>
                <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '16px', border: '1px solid #1D9E75' }}>
                  <div style={{ fontSize: '10px', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Honoraires HT</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1F2937' }}>
                    {tL.toLocaleString('fr-FR')} – {tH.toLocaleString('fr-FR')} €
                  </div>
                  <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Fourchette indicative</div>
                </div>
                <div style={{ background: '#F8F7F4', borderRadius: '10px', padding: '16px', border: '1px solid #E5E1DA' }}>
                  <div style={{ fontSize: '10px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Durée estimée</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1F2937' }}>{duree}</div>
                  <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>mois</div>
                </div>
              </div>

              <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '10px' }}>Répartition par phase</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Collecte & cadrage', j: ph1j, pct: phases[0], couleur: '#1D9E75' },
                  { label: 'Calcul & analyse', j: ph2j, pct: phases[1], couleur: '#D97706' },
                  { label: 'Plan transition & livrables', j: ph3j, pct: phases[2], couleur: '#0369A1' },
                ].map(ph => (
                  <div key={ph.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '180px', fontSize: '12px', color: '#1F2937' }}>{ph.label}</div>
                    <div style={{ flex: 1, height: '8px', background: '#E5E1DA', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${ph.pct}%`, height: '100%', background: ph.couleur, borderRadius: '4px' }} />
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#78716C', minWidth: '80px', textAlign: 'right' }}>
                      {ph.j} j · {ph.pct} %
                    </div>
                  </div>
                ))}
              </div>

              {form.bilan_existant && (
                <div style={{ marginTop: '14px', background: '#E1F5EE', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BadgeCheck size={16} color="#1D9E75" />
                  <span style={{ fontSize: '12px', color: '#0F6E56' }}>Bilan existant — <strong>−35 % appliqués</strong> sur les jours estimés</span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          onClick={() => etape === 0 ? navigate('/metier/ageadapt') : setEtape(e => e - 1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: '1px solid #E5E1DA',
            borderRadius: '8px', padding: '9px 16px', fontSize: '13px',
            cursor: 'pointer', color: '#78716C', fontFamily: 'inherit'
          }}
        >
          <ChevronLeft size={15} /> {etape === 0 ? 'Retour' : 'Précédent'}
        </button>

        {etape < 4 ? (
          <button
            onClick={() => {
              if (etape === 0 && !form.type_structure) {
                alert('Veuillez sélectionner un type de structure.')
                return
              }
              if (etape === 1 && !form.methode) {
                alert('Veuillez sélectionner une méthode.')
                return
              }
              setEtape(e => e + 1)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            Suivant <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer la mission'}
          </button>
        )}
      </div>
    </div>
  )
}