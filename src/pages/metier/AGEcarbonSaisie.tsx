import { useEffect, useState, ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Calculator, ChevronLeft, ChevronDown, ChevronRight, Check, UploadCloud, X, AlertTriangle, Pencil, Settings, Search } from 'lucide-react'

interface Bilan {
  id: string
  raison_sociale: string
  annee_reporting: number
  statut: string
}

interface Facteur {
  id: string
  poste: string
  sous_poste: string
  libelle: string
  unite_physique: string | null
  facteur_kg_co2e: number | null
  facteur_kg_co2e_eur: number | null
  scope: number | null
  source?: string
}

interface Saisie {
  id?: string
  poste: string
  sous_poste: string
  libelle_saisie: string
  facteur_id: string
  mode_saisie: 'physique' | 'monetaire'
  quantite: string
  unite: string
  montant_eur: string
  ratio_monetaire: string
  kg_co2e: number
  scope: number | null
}

interface ImportRow {
  libelle: string
  montant: number
  fe: number
  facteurExistant: Facteur | null
  posteChoisi: string
}

const POSTES = [
  { id: 'energie', label: 'Énergie', scope: '1 & 2', icon: '⚡' },
  { id: 'hors_energie', label: 'Hors énergie', scope: '1', icon: '🏭' },
  { id: 'intrants', label: 'Intrants & services', scope: '3', icon: '📦' },
  { id: 'futurs_emballages', label: 'Futurs emballages', scope: '3', icon: '📫' },
  { id: 'dechets', label: 'Déchets directs', scope: '3', icon: '🗑️' },
  { id: 'fret', label: 'Fret', scope: '3', icon: '🚛' },
  { id: 'deplacements', label: 'Déplacements', scope: '3', icon: '🚗' },
  { id: 'immobilisations', label: 'Immobilisations', scope: '3', icon: '🏢' },
  { id: 'utilisation', label: 'Utilisation des produits vendus', scope: '3', icon: '🔌' },
  { id: 'fin_de_vie', label: 'Fin de vie des produits', scope: '3', icon: '♻️' },
]

const normLibelle = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export default function AGEcarbonSaisie() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [facteurs, setFacteurs] = useState<Facteur[]>([])
  const [saisies, setSaisies] = useState<Saisie[]>([])
  const [posteOuvert, setPosteOuvert] = useState<string>('energie')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [posteError, setPosteError] = useState<string | null>(null)

  // Reclassement de poste
  const [editingPoste, setEditingPoste] = useState<string | null>(null)
  const [showFacteurs, setShowFacteurs] = useState(false)
  const [filtreFacteurs, setFiltreFacteurs] = useState('')

  // Ajout de ligne manuelle
  const [showAjoutLigne, setShowAjoutLigne] = useState(false)
  const [posteCible, setPosteCible] = useState('')
  const [nouvelleLigne, setNouvelleLigne] = useState({
    libelle: '',
    mode: 'physique' as 'physique' | 'monetaire',
    facteur: '',
    unite: '',
    scope: '',
  })

  // Import données monétaires
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importFileName, setImportFileName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: b } = await supabase
        .from('abc_bilans')
        .select('id, raison_sociale, annee_reporting, statut')
        .eq('id', id)
        .single()
      if (b) setBilan(b)

      const { data: f } = await supabase
        .from('abc_facteurs_emission')
        .select('*')
        .eq('actif', true)
        .order('poste')
      if (f) setFacteurs(f)

      const { data: s } = await supabase
        .from('abc_saisies')
        .select('*')
        .eq('bilan_id', id)
      if (s) setSaisies(s.map(row => ({
        ...row,
        quantite: row.quantite?.toString() || '',
        montant_eur: row.montant_eur?.toString() || '',
        ratio_monetaire: row.ratio_monetaire?.toString() || '',
      })))
    }
    load()
  }, [id])

  const facteursPoste = (poste: string) => facteurs.filter(f => f.poste === poste)

  const getSaisie = (facteurId: string): Saisie => {
    const existing = saisies.find(s => s.facteur_id === facteurId)
    const facteur = facteurs.find(f => f.id === facteurId)
    return existing || {
      poste: facteur?.poste || '',
      sous_poste: facteur?.sous_poste || '',
      libelle_saisie: facteur?.libelle || '',
      facteur_id: facteurId,
      mode_saisie: 'physique',
      quantite: '',
      unite: facteur?.unite_physique || '',
      montant_eur: '',
      ratio_monetaire: '',
      kg_co2e: 0,
      scope: facteur ? facteur.scope : 3,
    }
  }

  const calcKgCo2e = (saisie: Saisie, facteur: Facteur): number => {
    if (saisie.mode_saisie === 'physique') {
      const q = parseFloat(saisie.quantite) || 0
      return q * (facteur.facteur_kg_co2e || 0)
    } else {
      const m = parseFloat(saisie.montant_eur) || 0
      const r = parseFloat(saisie.ratio_monetaire) || 0
      return m * r
    }
  }

  const updateSaisie = (facteurId: string, field: string, value: string) => {
    const facteur = facteurs.find(f => f.id === facteurId)
    if (!facteur) return
    setSaisies(prev => {
      const existing = prev.find(s => s.facteur_id === facteurId)
      const base = existing || getSaisie(facteurId)
      const updated: Saisie = {
        ...base,
        [field]: field === 'scope' ? undefined : value,
      } as Saisie
      if (field === 'scope') updated.scope = value ? parseInt(value) : null
      updated.kg_co2e = calcKgCo2e(updated, facteur)
      if (existing) {
        return prev.map(s => s.facteur_id === facteurId ? updated : s)
      } else {
        return [...prev, updated]
      }
    })
  }

  // ── Reclassement de poste (référentiel partagé, saisies scopées au bilan courant) ──

  const handleChangerPoste = async (facteur: Facteur, nouveauPoste: string) => {
    if (nouveauPoste === facteur.poste) return

    const { error: errFact } = await supabase
      .from('abc_facteurs_emission')
      .update({ poste: nouveauPoste })
      .eq('id', facteur.id)
    if (errFact) {
      console.error('Changement de poste échoué —', facteur.libelle, errFact)
      return
    }

 const { error: errSaisies } = await supabase
      .from('abc_saisies')
      .update({ poste: nouveauPoste })
      .eq('facteur_id', facteur.id)
      .eq('bilan_id', id)
    if (errSaisies) {
      console.error('Mise à jour abc_saisies échouée —', facteur.libelle, errSaisies)
    }

    setFacteurs(prev => prev.map(f => f.id === facteur.id ? { ...f, poste: nouveauPoste } : f))
    setSaisies(prev => prev.map(s => s.facteur_id === facteur.id ? { ...s, poste: nouveauPoste } : s))
    setPosteOuvert(nouveauPoste)
    setEditingPoste(null)

    if (!errSaisies) {
      await handleRecalculerResultats()
    }
  }

  const handleChangerScope = async (facteur: Facteur, nouveauScope: number) => {
    if (nouveauScope === facteur.scope) return

    const { error: errFact } = await supabase
      .from('abc_facteurs_emission')
      .update({ scope: nouveauScope })
      .eq('id', facteur.id)
    if (errFact) {
      console.error('Changement de scope échoué —', facteur.libelle, errFact)
      return
    }

    const { error: errSaisiesScope } = await supabase
      .from('abc_saisies')
      .update({ scope: nouveauScope })
      .eq('facteur_id', facteur.id)
      .eq('bilan_id', id)
    if (errSaisiesScope) {
      console.error('Mise à jour abc_saisies (scope) échouée —', facteur.libelle, errSaisiesScope)
    }

    setFacteurs(prev => prev.map(f => f.id === facteur.id ? { ...f, scope: nouveauScope } : f))
    setSaisies(prev => prev.map(s => s.facteur_id === facteur.id ? { ...s, scope: nouveauScope } : s))

    if (!errSaisiesScope) {
      await handleRecalculerResultats()
    }
  }

  const handleAjouterLigne = async () => {
    if (!nouvelleLigne.libelle || !nouvelleLigne.facteur || !nouvelleLigne.scope) return

    const { data: nf, error } = await supabase
      .from('abc_facteurs_emission')
      .insert({
        poste: posteCible,
        libelle: nouvelleLigne.libelle,
        source: 'Ajout manuel',
        facteur_kg_co2e: nouvelleLigne.mode === 'physique' ? parseFloat(nouvelleLigne.facteur) : null,
        facteur_kg_co2e_eur: nouvelleLigne.mode === 'monetaire' ? parseFloat(nouvelleLigne.facteur) : null,
        unite_physique: nouvelleLigne.mode === 'physique' ? nouvelleLigne.unite : null,
        scope: parseInt(nouvelleLigne.scope),
        actif: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Ajout de ligne échoué —', nouvelleLigne.libelle, error)
      return
    }

    if (nf) {
      setFacteurs(prev => [...prev, nf])
      setPosteOuvert(posteCible)
    }

    setShowAjoutLigne(false)
    setNouvelleLigne({ libelle: '', mode: 'physique', facteur: '', unite: '', scope: '' })
  }

  // ── Import données monétaires ──────────────────────────────────────
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true })

    const parsed: ImportRow[] = []
    for (const row of rows.slice(1)) {
      const libelle = row[0]
      const montant = parseFloat(row[1])
      const fe = parseFloat(row[2])
      if (!libelle || typeof libelle !== 'string' || isNaN(montant) || isNaN(fe)) continue
      const facteurExistant = facteurs.find(f => normLibelle(f.libelle) === normLibelle(libelle)) || null
      parsed.push({ libelle: libelle.trim(), montant, fe, facteurExistant, posteChoisi: facteurExistant?.poste || '' })
    }
    setImportRows(parsed)
    setShowImport(true)
    e.target.value = ''
  }

  const updateImportPoste = (index: number, poste: string) => {
    setImportRows(prev => prev.map((r, i) => i === index ? { ...r, posteChoisi: poste } : r))
  }

  const importPret = importRows.length > 0 && importRows.every(r => r.posteChoisi !== '')

  const applyImportSaisie = (facteur: Facteur, montant: number, fe: number) => {
    setSaisies(prev => {
      const existing = prev.find(s => s.facteur_id === facteur.id)
      const base = existing || getSaisie(facteur.id)
      const updated: Saisie = {
        ...base,
        poste: facteur.poste,
        sous_poste: facteur.sous_poste,
        libelle_saisie: facteur.libelle,
        mode_saisie: 'monetaire',
        montant_eur: montant.toString(),
        ratio_monetaire: fe.toString(),
        scope: facteur.scope,
      }
      updated.kg_co2e = montant * fe
      return existing ? prev.map(s => s.facteur_id === facteur.id ? updated : s) : [...prev, updated]
    })
  }

  const handleValiderImport = async () => {
    if (!importPret) return
    setImporting(true)
    const facteursMaj = [...facteurs]

    for (const row of importRows) {
      if (row.facteurExistant) {
        const { error: errUpd } = await supabase
          .from('abc_facteurs_emission')
          .update({ facteur_kg_co2e_eur: row.fe })
          .eq('id', row.facteurExistant.id)
        if (errUpd) {
          console.error('Mise à jour facteur échouée —', row.libelle, errUpd)
          continue
        }
        const idx = facteursMaj.findIndex(f => f.id === row.facteurExistant!.id)
        if (idx >= 0) {
          facteursMaj[idx] = { ...facteursMaj[idx], facteur_kg_co2e_eur: row.fe }
          applyImportSaisie(facteursMaj[idx], row.montant, row.fe)
        }
      } else {
        const { data: nf, error: errInsert } = await supabase
          .from('abc_facteurs_emission')
          .insert({
            poste: row.posteChoisi,
            libelle: row.libelle,
            source: 'Import monétaire',
            facteur_kg_co2e: null,
            facteur_kg_co2e_eur: row.fe,
            unite_physique: null,
            scope: null,
            actif: true,
          })
          .select()
          .single()
        if (errInsert) {
          console.error('Import facteur échoué —', row.libelle, errInsert)
        }
        if (nf) {
          facteursMaj.push(nf)
          applyImportSaisie(nf, row.montant, row.fe)
          setPosteOuvert(nf.poste)
        }
      }
    }

    setFacteurs(facteursMaj)
    setImporting(false)
    setShowImport(false)
    setImportRows([])
    setImportFileName('')
  }

  const handleSavePoste = async (poste: string) => {
  const saisiesPoste = saisies.filter(s => s.poste === poste && (parseFloat(s.quantite) > 0 || parseFloat(s.montant_eur) > 0 || s.id))

    const sansScope = saisiesPoste.filter(s => s.scope == null)
    if (sansScope.length > 0) {
      setPosteError(poste)
      return
    }
    setPosteError(null)
    setSaving(true)

    for (const saisie of saisiesPoste) {
      const facteurRef = facteurs.find(f => f.id === saisie.facteur_id)
      const payload = {
        bilan_id: id,
        poste: facteurRef?.poste ?? saisie.poste,
        sous_poste: saisie.sous_poste,
        libelle_saisie: saisie.libelle_saisie,
        facteur_id: saisie.facteur_id,
        mode_saisie: saisie.mode_saisie,
        quantite: saisie.mode_saisie === 'physique' ? parseFloat(saisie.quantite) || null : null,
        unite: saisie.unite,
        montant_eur: saisie.mode_saisie === 'monetaire' ? parseFloat(saisie.montant_eur) || null : null,
        ratio_monetaire: saisie.mode_saisie === 'monetaire' ? parseFloat(saisie.ratio_monetaire) || null : null,
        kg_co2e: saisie.kg_co2e,
        scope: saisie.scope,
      }

      if (saisie.id) {
        await supabase.from('abc_saisies').update(payload).eq('id', saisie.id)
      } else {
        await supabase.from('abc_saisies').insert(payload)
      }
    }

    // Recalculer totaux bilan
    const { data: allSaisies } = await supabase
      .from('abc_saisies')
      .select('kg_co2e, scope')
      .eq('bilan_id', id)

    if (allSaisies) {
      const s1 = allSaisies.filter(s => s.scope === 1).reduce((a, s) => a + (s.kg_co2e || 0), 0)
      const s2 = allSaisies.filter(s => s.scope === 2).reduce((a, s) => a + (s.kg_co2e || 0), 0)
      const s3 = allSaisies.filter(s => s.scope === 3).reduce((a, s) => a + (s.kg_co2e || 0), 0)
      const total = s1 + s2 + s3

    await supabase.from('abc_bilans').update({
        total_scope1: s1 / 1000,
        total_scope2: s2 / 1000,
        total_scope3: s3 / 1000,
        total_tco2e: total / 1000,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    }

 await handleRecalculerResultats()

    setSaving(false)
    setSaved(poste)
    setTimeout(() => setSaved(null), 2000)
  }

  const handleRecalculerResultats = async () => {
    const { data: allSaisies } = await supabase
      .from('abc_saisies')
      .select('poste, scope, kg_co2e')
      .eq('bilan_id', id)
    if (!allSaisies) return

    const totalGeneral = allSaisies.reduce((a, s) => a + (s.kg_co2e || 0), 0)

    const groupes = new Map<string, { poste: string; scope: number | null; total: number }>()
    for (const s of allSaisies) {
      const key = `${s.poste}__${s.scope}`
      const g = groupes.get(key) || { poste: s.poste, scope: s.scope, total: 0 }
      g.total += s.kg_co2e || 0
      groupes.set(key, g)
    }

    await supabase.from('abc_resultats').delete().eq('bilan_id', id)

    const lignes = Array.from(groupes.values()).map(g => ({
      bilan_id: id,
      poste: g.poste,
      scope: g.scope,
      total_kg_co2e: g.total,
      pct_total: totalGeneral > 0 ? (g.total / totalGeneral) * 100 : 0,
    }))

    if (lignes.length > 0) {
      const { error } = await supabase.from('abc_resultats').insert(lignes)
      if (error) console.error('Écriture abc_resultats échouée', error)
    }
  }

 const inputStyle = {
    width: '100%', padding: '7px 9px',
    border: '1px solid #E5E1DA', borderRadius: '7px',
    fontSize: '12px', fontFamily: 'inherit',
    background: 'white', color: '#1F2937', outline: 'none',
  }

  const totalKgCo2e = saisies.reduce((a, s) => a + (s.kg_co2e || 0), 0)

  const facteursFiltres = facteurs
    .filter(f => normLibelle(f.libelle).includes(normLibelle(filtreFacteurs)))
    .sort((a, b) => a.poste.localeCompare(b.poste) || a.libelle.localeCompare(b.libelle))

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', background: '#F8F7F4', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/metier/agecarbon')}
          style={{ background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#78716C', fontSize: '13px' }}
        >
          <ChevronLeft size={15} /> Retour
        </button>
        <div style={{ background: '#E1F5EE', borderRadius: '10px', padding: '8px', display: 'flex' }}>
          <Calculator size={20} color="#2F7D5C" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
            {bilan?.raison_sociale || '—'} — {bilan?.annee_reporting}
          </h1>
          <p style={{ fontSize: '12px', color: '#78716C', margin: 0 }}>Saisie des émissions — 14 postes</p>
        </div>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: '#1D9E75', cursor: 'pointer' }}
        >
          <UploadCloud size={15} />
          Importer données monétaires
          <input type="file" accept=".xls,.xlsx" onChange={handleFileSelect} style={{ display: 'none' }} />
        </label>

        <button
          onClick={() => setShowFacteurs(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: '#1F2937', cursor: 'pointer' }}
        >
          <Settings size={15} />
          Gérer les facteurs
        </button>

        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#1D9E75' }}>
            {(totalKgCo2e / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tCO₂e
          </div>
          <div style={{ fontSize: '11px', color: '#78716C' }}>Total en cours de saisie</div>
        </div>
      </div>

      {/* Postes accordéon */}
      {POSTES.map(poste => {
        const facteursP = facteursPoste(poste.id)
        const isOpen = posteOuvert === poste.id
        const totalPoste = saisies.filter(s => s.poste === poste.id).reduce((a, s) => a + (s.kg_co2e || 0), 0)
        const isSaved = saved === poste.id
        const hasError = posteError === poste.id

        return (
          <div key={poste.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E1DA', marginBottom: '8px', overflow: 'hidden' }}>

            {/* Entête poste */}
            <button
              onClick={() => setPosteOuvert(isOpen ? '' : poste.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: '18px' }}>{poste.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{poste.label}</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>Scope {poste.scope}</div>
              </div>
              {totalPoste > 0 && (
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1D9E75', fontWeight: 600 }}>
                  {(totalPoste / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} tCO₂e
                </span>
              )}
              {isSaved && <Check size={16} color="#1D9E75" />}
              {isOpen ? <ChevronDown size={16} color="#78716C" /> : <ChevronRight size={16} color="#78716C" />}
            </button>

            {/* Contenu poste */}
            {isOpen && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid #E5E1DA' }}>
                {facteursP.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#78716C', padding: '16px 0' }}>
                    Aucun facteur d'émission disponible pour ce poste. Saisie manuelle disponible prochainement.
                  </p>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E1DA' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Libellé</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Mode</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Quantité / Montant</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Facteur d'émission</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Unité / Ratio</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Scope</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#78716C', fontWeight: 500 }}>kg CO₂e</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#78716C', fontWeight: 500 }}>tCO₂e</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facteursP.map(facteur => {
                          const saisie = getSaisie(facteur.id)
                          return (
                            <tr key={facteur.id} style={{ borderBottom: '1px solid #F8F7F4' }}>
                              <td style={{ padding: '8px', color: '#1F2937', maxWidth: '180px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ fontWeight: 500 }}>{facteur.libelle}</div>
                                  <button
                                    onClick={() => setEditingPoste(editingPoste === facteur.id ? null : facteur.id)}
                                    title="Changer de poste"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78716C', padding: 0, display: 'flex', flexShrink: 0 }}
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </div>
                                {editingPoste === facteur.id && (
                                  <select
                                    autoFocus
                                    style={{ ...inputStyle, width: '170px', marginTop: '4px' }}
                                    value={facteur.poste}
                                    onChange={e => handleChangerPoste(facteur, e.target.value)}
                                    onBlur={() => setEditingPoste(null)}
                                  >
                                    {POSTES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                  </select>
                                )}
                              </td>
                            <td style={{ padding: '8px' }}>
                                <select
                                  style={{ ...inputStyle, width: '110px' }}
                                  value={saisie.mode_saisie}
                                  onChange={e => updateSaisie(facteur.id, 'mode_saisie', e.target.value)}
                                >
                                  <option value="physique">Physique</option>
                                  <option value="monetaire">Monétaire</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px' }}>
                                {saisie.mode_saisie === 'physique' ? (
                                  <input
                                    style={{ ...inputStyle, width: '110px' }}
                                    type="number"
                                    placeholder="0"
                                    value={saisie.quantite}
                                    onChange={e => updateSaisie(facteur.id, 'quantite', e.target.value)}
                                  />
                                ) : (
                                  <input
                                    style={{ ...inputStyle, width: '110px' }}
                                    type="number"
                                    placeholder="Montant €"
                                    value={saisie.montant_eur}
                                    onChange={e => updateSaisie(facteur.id, 'montant_eur', e.target.value)}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px', fontSize: '11px', color: '#78716C', whiteSpace: 'nowrap' }}>
                                {saisie.mode_saisie === 'physique'
                                  ? (facteur.facteur_kg_co2e != null ? `${facteur.facteur_kg_co2e} kg/${facteur.unite_physique ?? '?'}` : '—')
                                  : (facteur.facteur_kg_co2e_eur != null ? `${facteur.facteur_kg_co2e_eur} kg/€` : '—')}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {saisie.mode_saisie === 'physique' ? (
                                  <span style={{ fontSize: '11px', color: '#78716C' }}>{facteur.unite_physique ?? '—'}</span>
                                ) : (
                                  <input
                                    style={{ ...inputStyle, width: '110px' }}
                                    type="number"
                                    placeholder="Ratio kg/€"
                                    value={saisie.ratio_monetaire}
                                    onChange={e => updateSaisie(facteur.id, 'ratio_monetaire', e.target.value)}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <select
                                  style={{ ...inputStyle, width: '80px', borderColor: saisie.scope == null ? '#D97706' : '#E5E1DA' }}
                                  value={facteur.scope ?? ''}
                                  onChange={e => {
                                    const val = e.target.value
                                    if (val) handleChangerScope(facteur, parseInt(val))
                                  }}
                                >
                                  <option value="">—</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: saisie.kg_co2e > 0 ? '#1D9E75' : '#E5E1DA' }}>
                                {saisie.kg_co2e > 0 ? saisie.kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: '#78716C' }}>
                                {saisie.kg_co2e > 0 ? (saisie.kg_co2e / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {hasError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#D97706', fontSize: '12px' }}>
                        <AlertTriangle size={14} />
                        Scope manquant sur une ou plusieurs lignes importées — à renseigner avant d'enregistrer ce poste.
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <button
                        onClick={() => { setPosteCible(poste.id); setShowAjoutLigne(true) }}
                        style={{ background: 'transparent', border: '1px dashed #E5E1DA', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#78716C', cursor: 'pointer' }}
                      >
                        + Ajouter une ligne
                      </button>
                      <button
                        onClick={() => handleSavePoste(poste.id)}
                        disabled={saving}
                        style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isSaved ? <><Check size={14} /> Enregistré</> : saving ? 'Enregistrement...' : 'Enregistrer ce poste'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Bouton résultats */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button
          onClick={() => navigate(`/metier/agecarbon/${id}/resultats`)}
          style={{ background: '#1F2937', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Voir les résultats →
        </button>
      </div>

      {/* Modal import données monétaires */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,41,55,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '760px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px', borderBottom: '1px solid #E5E1DA' }}>
              <UploadCloud size={18} color="#1D9E75" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>Import données monétaires</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>{importFileName} — {importRows.length} ligne(s) détectée(s)</div>
              </div>
              <button onClick={() => { setShowImport(false); setImportRows([]) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78716C' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E1DA' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Libellé</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#78716C', fontWeight: 500 }}>Montant €</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#78716C', fontWeight: 500 }}>FE kg/€</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#78716C', fontWeight: 500 }}>tCO₂e</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Statut</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Poste</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F8F7F4' }}>
                      <td style={{ padding: '7px 8px', color: '#1F2937' }}>{row.libelle}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {row.montant.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{row.fe}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#1D9E75' }}>
                        {((row.montant * row.fe) / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 8px' }}>
                        {row.facteurExistant ? (
                          <span style={{ fontSize: '11px', color: '#0F6E56', background: '#E1F5EE', padding: '2px 8px', borderRadius: '6px' }}>Existant</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#993C1D', background: '#FAECE7', padding: '2px 8px', borderRadius: '6px' }}>Nouveau</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 8px' }}>
                        {row.facteurExistant ? (
                          <span style={{ fontSize: '11px', color: '#78716C' }}>
                            {POSTES.find(p => p.id === row.facteurExistant!.poste)?.label ?? row.facteurExistant.poste}
                          </span>
                        ) : (
                          <select
                            style={{ ...inputStyle, width: '160px', borderColor: row.posteChoisi === '' ? '#D97706' : '#E5E1DA' }}
                            value={row.posteChoisi}
                            onChange={e => updateImportPoste(i, e.target.value)}
                          >
                            <option value="">Choisir un poste</option>
                            {POSTES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #E5E1DA' }}>
              <button
                onClick={() => { setShowImport(false); setImportRows([]) }}
                style={{ background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', color: '#1F2937', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleValiderImport}
                disabled={!importPret || importing}
                style={{ background: importPret ? '#1D9E75' : '#E5E1DA', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: importPret ? 'pointer' : 'not-allowed' }}
              >
                {importing ? 'Import en cours...' : `Valider l'import (${importRows.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal référentiel — Gérer les facteurs */}
      {showFacteurs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,41,55,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px', borderBottom: '1px solid #E5E1DA' }}>
              <Settings size={18} color="#1F2937" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>Référentiel des facteurs d'émission</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>{facteurs.length} facteur(s) — reclassement de poste (référentiel partagé)</div>
              </div>
              <button onClick={() => setShowFacteurs(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78716C' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 20px 0' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#78716C" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  style={{ ...inputStyle, paddingLeft: '30px' }}
                  placeholder="Rechercher un libellé..."
                  value={filtreFacteurs}
                  onChange={e => setFiltreFacteurs(e.target.value)}
                />
              </div>
            </div>

            <div style={{ padding: '12px 20px 16px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E1DA' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Libellé</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Source</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Scope</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#78716C', fontWeight: 500 }}>Poste</th>
                  </tr>
                </thead>
                <tbody>
                  {facteursFiltres.map(facteur => (
                    <tr key={facteur.id} style={{ borderBottom: '1px solid #F8F7F4' }}>
                      <td style={{ padding: '7px 8px', color: '#1F2937' }}>{facteur.libelle}</td>
                      <td style={{ padding: '7px 8px', color: '#78716C', fontSize: '11px' }}>{facteur.source || 'Base Carbone ADEME'}</td>
                      <td style={{ padding: '7px 8px', color: '#78716C', fontSize: '11px' }}>{facteur.scope ?? '—'}</td>
                      <td style={{ padding: '7px 8px' }}>
                        <select
                          style={{ ...inputStyle, width: '170px' }}
                          value={facteur.poste}
                          onChange={e => handleChangerPoste(facteur, e.target.value)}
                        >
                          {POSTES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout de ligne manuelle */}
      {showAjoutLigne && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(31,41,55,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px', borderBottom: '1px solid #E5E1DA' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>Ajouter une ligne</div>
                <div style={{ fontSize: '11px', color: '#78716C' }}>
                  Poste : {POSTES.find(p => p.id === posteCible)?.label ?? posteCible}
                </div>
              </div>
              <button onClick={() => setShowAjoutLigne(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78716C' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#78716C', display: 'block', marginBottom: '4px' }}>Libellé</label>
                <input
                  style={inputStyle}
                  value={nouvelleLigne.libelle}
                  onChange={e => setNouvelleLigne(prev => ({ ...prev, libelle: e.target.value }))}
                  placeholder="Ex. Électricité — fournisseur local"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#78716C', display: 'block', marginBottom: '4px' }}>Mode</label>
                <select
                  style={inputStyle}
                  value={nouvelleLigne.mode}
                  onChange={e => setNouvelleLigne(prev => ({ ...prev, mode: e.target.value as 'physique' | 'monetaire' }))}
                >
                  <option value="physique">Physique</option>
                  <option value="monetaire">Monétaire</option>
                </select>
              </div>

              {nouvelleLigne.mode === 'physique' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#78716C', display: 'block', marginBottom: '4px' }}>Facteur (kg CO₂e / unité)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={nouvelleLigne.facteur}
                      onChange={e => setNouvelleLigne(prev => ({ ...prev, facteur: e.target.value }))}
                      placeholder="0.052"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#78716C', display: 'block', marginBottom: '4px' }}>Unité</label>
                    <input
                      style={inputStyle}
                      value={nouvelleLigne.unite}
                      onChange={e => setNouvelleLigne(prev => ({ ...prev, unite: e.target.value }))}
                      placeholder="kWh"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '11px', color: '#78716C', display: 'block', marginBottom: '4px' }}>Facteur (kg CO₂e / €)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    value={nouvelleLigne.facteur}
                    onChange={e => setNouvelleLigne(prev => ({ ...prev, facteur: e.target.value }))}
                    placeholder="0.17"
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', color: '#78716C', display: 'block', marginBottom: '4px' }}>Scope</label>
                <select
                  style={inputStyle}
                  value={nouvelleLigne.scope}
                  onChange={e => setNouvelleLigne(prev => ({ ...prev, scope: e.target.value }))}
                >
                  <option value="">Choisir</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #E5E1DA' }}>
              <button
                onClick={() => setShowAjoutLigne(false)}
                style={{ background: 'transparent', border: '1px solid #E5E1DA', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', color: '#1F2937', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleAjouterLigne}
                disabled={!nouvelleLigne.libelle || !nouvelleLigne.facteur || !nouvelleLigne.scope}
                style={{
                  background: (nouvelleLigne.libelle && nouvelleLigne.facteur && nouvelleLigne.scope) ? '#1D9E75' : '#E5E1DA',
                  color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500,
                  cursor: (nouvelleLigne.libelle && nouvelleLigne.facteur && nouvelleLigne.scope) ? 'pointer' : 'not-allowed',
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}