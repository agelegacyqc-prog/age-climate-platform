// ModelesComm.tsx — Gestion des modèles de communication
// Module P2-03 · Publipostage M08
// Couleur workplace : #B25C2A (Brown) → ici espace métier AGE, on reste sur les neutres socle

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Mail, FileText, Plus, Pencil, Trash2, Eye, Copy,
  CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp,
  Bold, Italic, Link, List
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type TypeModele = 'email' | 'courrier'

interface ModeleComm {
  id: string
  created_at: string
  updated_at: string
  nom: string
  type: TypeModele
  objet: string | null
  bloc_entete: string
  bloc_corps: string
  bloc_signature: string
  consultant_id: string
  region_code: string | null
  actif: boolean
  usage_count: number
}

interface FormModele {
  nom: string
  type: TypeModele
  objet: string
  bloc_entete: string
  bloc_corps: string
  bloc_signature: string
}

// ── Variables de fusion disponibles ─────────────────────────────────────────

const VARIABLES_FUSION = [
  { label: 'Prénom',             token: '{{prenom}}',             cat: 'Contact' },
  { label: 'Nom',                token: '{{nom}}',                cat: 'Contact' },
  { label: 'Adresse',            token: '{{adresse}}',            cat: 'Contact' },
  { label: 'Ville',              token: '{{ville}}',              cat: 'Contact' },
  { label: 'Score risque',       token: '{{score_risque}}',       cat: 'Risque' },
  { label: 'Classe risque',      token: '{{classe_risque}}',      cat: 'Risque' },
  { label: 'Aléa principal',     token: '{{alea_principal}}',     cat: 'Risque' },
  { label: 'Nom consultant',     token: '{{nom_consultant}}',     cat: 'Consultant' },
  { label: 'Téléphone consultant', token: '{{telephone_consultant}}', cat: 'Consultant' },
]

const FORM_VIDE: FormModele = {
  nom: '',
  type: 'email',
  objet: '',
  bloc_entete: '',
  bloc_corps: '',
  bloc_signature: '',
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

function insererVariable(
  texte: string,
  cursor: number,
  token: string
): { texte: string; cursor: number } {
  const avant = texte.slice(0, cursor)
  const apres = texte.slice(cursor)
  return {
    texte: avant + token + apres,
    cursor: cursor + token.length,
  }
}

function highlightVariables(texte: string): string {
  return texte.replace(
    /\{\{[^}]+\}\}/g,
    m => `<mark style="background:#FEF3C7;color:#92400E;border-radius:3px;padding:0 3px;">${m}</mark>`
  )
}

// ── Composant éditeur de bloc ────────────────────────────────────────────────

interface BlocEditorProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  activeBloc: string
  setActiveBloc: (b: string) => void
  blocKey: string
}

function BlocEditor({
  label, value, onChange, placeholder, rows = 4,
  activeBloc, setActiveBloc, blocKey
}: BlocEditorProps) {
  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) (el as HTMLTextAreaElement & { _ref?: HTMLTextAreaElement })._ref = el
  }, [])

  function inserer(token: string) {
    const ta = document.getElementById(`bloc-${blocKey}`) as HTMLTextAreaElement | null
    if (!ta) return
    const pos = ta.selectionStart ?? value.length
    const { texte, cursor } = insererVariable(value, pos, token)
    onChange(texte)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    }, 0)
  }

  function appliquerFormat(tag: 'gras' | 'italique' | 'lien') {
    const ta = document.getElementById(`bloc-${blocKey}`) as HTMLTextAreaElement | null
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selection = value.slice(start, end)
    let resultat = value
    if (tag === 'gras') {
      resultat = value.slice(0, start) + `**${selection}**` + value.slice(end)
    } else if (tag === 'italique') {
      resultat = value.slice(0, start) + `_${selection}_` + value.slice(end)
    } else if (tag === 'lien') {
      resultat = value.slice(0, start) + `[${selection || 'texte'}](url)` + value.slice(end)
    }
    onChange(resultat)
  }

  const isFocused = activeBloc === blocKey

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 600,
        color: '#1F2937', marginBottom: 6
      }}>
        {label}
      </label>

      {/* Barre de mise en forme */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 4,
        padding: '4px 8px', background: '#F8F7F4',
        border: '1px solid #E5E1DA', borderBottom: 'none',
        borderRadius: '8px 8px 0 0'
      }}>
        <button type="button" onClick={() => appliquerFormat('gras')}
          title="Gras" style={btnFmt}>
          <Bold size={13} />
        </button>
        <button type="button" onClick={() => appliquerFormat('italique')}
          title="Italique" style={btnFmt}>
          <Italic size={13} />
        </button>
        <button type="button" onClick={() => appliquerFormat('lien')}
          title="Lien" style={btnFmt}>
          <Link size={13} />
        </button>
        <div style={{ width: 1, background: '#E5E1DA', margin: '2px 4px' }} />
        {/* Variables par catégorie */}
       {(['Contact', 'Risque', 'Consultant'] as const).map(cat => (
  <React.Fragment key={cat}>
    <VariableMenu cat={cat} onInsert={inserer} />
  </React.Fragment>
))}
      </div>

      <textarea
        id={`bloc-${blocKey}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setActiveBloc(blocKey)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
          borderLeft: `1px solid ${isFocused ? '#0F6E56' : '#E5E1DA'}`,
borderRight: `1px solid ${isFocused ? '#0F6E56' : '#E5E1DA'}`,
borderBottom: `1px solid ${isFocused ? '#0F6E56' : '#E5E1DA'}`,
borderTop: 'none',
          outline: isFocused ? '2px solid #0F6E5620' : 'none',
          outlineOffset: -1,
          borderRadius: '0 0 8px 8px',
          resize: 'vertical', lineHeight: 1.6,
          background: '#fff', color: '#1F2937',
          transition: 'border-color 0.15s'
        }}
      />
    </div>
  )
}

const btnFmt: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, border: 'none', background: 'transparent',
  borderRadius: 4, cursor: 'pointer', color: '#78716C',
}

// ── Menu variables ────────────────────────────────────────────────────────────

function VariableMenu({ cat, onInsert }: { cat: string; onInsert: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const vars = VARIABLES_FUSION.filter(v => v.cat === cat)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '3px 8px', fontSize: 11, fontWeight: 500,
          border: '1px solid #E5E1DA', borderRadius: 4,
          background: '#fff', cursor: 'pointer', color: '#78716C',
          whiteSpace: 'nowrap'
        }}>
        {cat} {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 30, left: 0, zIndex: 50,
          background: '#fff', border: '1px solid #E5E1DA',
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
          minWidth: 180, overflow: 'hidden'
        }}>
          {vars.map(v => (
            <button key={v.token} type="button"
              onClick={() => { onInsert(v.token); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', fontSize: 12, border: 'none',
                background: 'transparent', cursor: 'pointer', color: '#1F2937',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8F7F4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#B25C2A', fontSize: 11 }}>
                {v.token}
              </span>
              <span style={{ marginLeft: 8, color: '#78716C' }}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ModelesComm() {
  const [modeles, setModeles] = useState<ModeleComm[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormModele>(FORM_VIDE)
  const [saving, setSaving] = useState(false)
  const [activeBloc, setActiveBloc] = useState('')

  // Aperçu
  const [apercuId, setApercuId] = useState<string | null>(null)

  // Filtre type
  const [filtreType, setFiltreType] = useState<'tous' | TypeModele>('tous')

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data, error } = await supabase
      .from('modeles_comm')
      .select('*')
      .eq('actif', true)
      .order('updated_at', { ascending: false })
    if (!error) setModeles(data ?? [])
    setLoading(false)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function ouvrirCreation() {
    setEditId(null)
    setForm(FORM_VIDE)
    setDrawerOpen(true)
  }

  function ouvrirEdition(m: ModeleComm) {
    setEditId(m.id)
    setForm({
      nom: m.nom,
      type: m.type,
      objet: m.objet ?? '',
      bloc_entete: m.bloc_entete,
      bloc_corps: m.bloc_corps,
      bloc_signature: m.bloc_signature,
    })
    setDrawerOpen(true)
  }

  async function dupliquer(m: ModeleComm) {
    const { error } = await supabase.from('modeles_comm').insert({
      nom: `${m.nom} (copie)`,
      type: m.type,
      objet: m.objet,
      bloc_entete: m.bloc_entete,
      bloc_corps: m.bloc_corps,
      bloc_signature: m.bloc_signature,
    })
    if (error) showToast('err', 'Erreur lors de la duplication')
    else { showToast('ok', 'Modèle dupliqué'); charger() }
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce modèle ?')) return
    const { error } = await supabase.from('modeles_comm').update({ actif: false }).eq('id', id)
    if (error) showToast('err', 'Erreur suppression')
    else { showToast('ok', 'Modèle supprimé'); charger() }
  }

  async function sauvegarder() {
    if (!form.nom.trim() || !form.bloc_corps.trim()) {
      showToast('err', 'Nom et corps du message obligatoires')
      return
    }
    setSaving(true)
  const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      nom: form.nom.trim(),
      type: form.type,
      objet: form.type === 'email' ? form.objet.trim() : null,
      bloc_entete: form.bloc_entete.trim(),
      bloc_corps: form.bloc_corps.trim(),
      bloc_signature: form.bloc_signature.trim(),
      consultant_id: user?.id,
    }
    const { error } = editId
      ? await supabase.from('modeles_comm').update(payload).eq('id', editId)
      : await supabase.from('modeles_comm').insert(payload)

    setSaving(false)
    if (error) showToast('err', 'Erreur lors de la sauvegarde')
    else {
      showToast('ok', editId ? 'Modèle mis à jour' : 'Modèle créé')
      setDrawerOpen(false)
      charger()
    }
  }

  const modelesFiltres = modeles.filter(m => filtreType === 'tous' || m.type === filtreType)
  const apercuModele = modeles.find(m => m.id === apercuId)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 10,
          background: toast.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'ok' ? '#6EE7B7' : '#FECACA'}`,
          color: toast.type === 'ok' ? '#065F46' : '#991B1B',
          boxShadow: '0 4px 12px rgba(0,0,0,0.10)', fontSize: 13, fontWeight: 500
        }}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>
            Modèles de communication
          </h1>
          <p style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
            Gérez vos modèles email et courrier avec variables de fusion
          </p>
        </div>
        <button onClick={ouvrirCreation} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: '#0F6E56', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: 'pointer'
        }}>
          <Plus size={16} /> Nouveau modèle
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['tous', 'email', 'courrier'] as const).map(f => (
          <button key={f} onClick={() => setFiltreType(f)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            border: '1px solid',
            borderColor: filtreType === f ? '#0F6E56' : '#E5E1DA',
            background: filtreType === f ? '#ECFDF5' : '#fff',
            color: filtreType === f ? '#0F6E56' : '#78716C',
            cursor: 'pointer'
          }}>
            {f === 'tous' ? 'Tous' : f === 'email' ? '✉ Email' : '📄 Courrier'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p style={{ color: '#78716C', fontSize: 13 }}>Chargement…</p>
      ) : modelesFiltres.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          border: '2px dashed #E5E1DA', borderRadius: 12, color: '#78716C'
        }}>
          <Mail size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontWeight: 500 }}>Aucun modèle créé</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Créez votre premier modèle pour démarrer le publipostage.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {modelesFiltres.map(m => (
            <CarteModele
              key={m.id}
              modele={m}
              onEdit={() => ouvrirEdition(m)}
              onDuplicate={() => dupliquer(m)}
              onDelete={() => supprimer(m.id)}
              onPreview={() => setApercuId(m.id)}
            />
          ))}
        </div>
      )}

      {/* Drawer création / édition */}
      {drawerOpen && (
        <DrawerModele
          form={form}
          setForm={setForm}
          saving={saving}
          editId={editId}
          activeBloc={activeBloc}
          setActiveBloc={setActiveBloc}
          onClose={() => setDrawerOpen(false)}
          onSave={sauvegarder}
        />
      )}

      {/* Aperçu */}
      {apercuModele && (
        <ApercuModale
          modele={apercuModele}
          onClose={() => setApercuId(null)}
        />
      )}
    </div>
  )
}

// ── Carte modèle ─────────────────────────────────────────────────────────────

function CarteModele({
  modele, onEdit, onDuplicate, onDelete, onPreview
}: {
  key?: string
  modele: ModeleComm
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onPreview: () => void
}) {
  const isEmail = modele.type === 'email'
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
      padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: isEmail ? '#E6F1FB' : '#FEF3C7',
            color: isEmail ? '#185FA5' : '#92400E'
          }}>
            {isEmail ? <Mail size={16} /> : <FileText size={16} />}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1F2937' }}>{modele.nom}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#78716C' }}>
              {isEmail ? 'Email' : 'Courrier PDF'} · {modele.usage_count} export{modele.usage_count > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
          background: isEmail ? '#E6F1FB' : '#FEF3C7',
          color: isEmail ? '#185FA5' : '#92400E'
        }}>
          {isEmail ? 'EMAIL' : 'COURRIER'}
        </span>
      </div>

      {isEmail && modele.objet && (
        <p style={{
          margin: 0, fontSize: 12, color: '#78716C',
          padding: '6px 10px', background: '#F8F7F4', borderRadius: 6
        }}>
          <span style={{ fontWeight: 600 }}>Objet : </span>{modele.objet}
        </p>
      )}

      <p style={{
        margin: 0, fontSize: 12, color: '#78716C',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const
      }}>
        {modele.bloc_corps}
      </p>

      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
        <BtnIcone onClick={onPreview} title="Aperçu"><Eye size={14} /></BtnIcone>
        <BtnIcone onClick={onEdit} title="Modifier"><Pencil size={14} /></BtnIcone>
        <BtnIcone onClick={onDuplicate} title="Dupliquer"><Copy size={14} /></BtnIcone>
        <BtnIcone onClick={onDelete} title="Supprimer" danger><Trash2 size={14} /></BtnIcone>
      </div>
    </div>
  )
}

function BtnIcone({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, border: '1px solid #E5E1DA', borderRadius: 6,
      background: '#fff', cursor: 'pointer',
      color: danger ? '#B91C1C' : '#78716C',
    }}>
      {children}
    </button>
  )
}

// ── Drawer formulaire ─────────────────────────────────────────────────────────

function DrawerModele({
  form, setForm, saving, editId, activeBloc, setActiveBloc, onClose, onSave
}: {
  form: FormModele
  setForm: React.Dispatch<React.SetStateAction<FormModele>>
  saving: boolean
  editId: string | null
  activeBloc: string
  setActiveBloc: (b: string) => void
  onClose: () => void
  onSave: () => void
}) {
  function update(k: keyof FormModele, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 600,
        background: '#fff', zIndex: 201, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1px solid #E5E1DA',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
            {editId ? 'Modifier le modèle' : 'Nouveau modèle'}
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 28 }}>
          {/* Nom */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom du modèle *</label>
            <input value={form.nom} onChange={e => update('nom', e.target.value)}
              placeholder="Ex : Relance risque élevé — propriétaires"
              style={inputStyle(activeBloc === 'nom')}
              onFocus={() => setActiveBloc('nom')}
            />
          </div>

          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Type *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['email', 'courrier'] as TypeModele[]).map(t => (
                <button key={t} type="button" onClick={() => update('type', t)} style={{
                  flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: `2px solid ${form.type === t ? '#0F6E56' : '#E5E1DA'}`,
                  background: form.type === t ? '#ECFDF5' : '#fff',
                  color: form.type === t ? '#0F6E56' : '#78716C',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8
                }}>
                  {t === 'email' ? <Mail size={15} /> : <FileText size={15} />}
                  {t === 'email' ? 'Email' : 'Courrier PDF'}
                </button>
              ))}
            </div>
          </div>

          {/* Objet email */}
          {form.type === 'email' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Objet de l'email</label>
              <input value={form.objet} onChange={e => update('objet', e.target.value)}
                placeholder="Ex : Votre bien {{adresse}} est exposé aux risques climatiques"
                style={inputStyle(activeBloc === 'objet')}
                onFocus={() => setActiveBloc('objet')}
              />
            </div>
          )}

          {/* Blocs */}
          <BlocEditor
            label="En-tête" blocKey="entete" value={form.bloc_entete}
            onChange={v => update('bloc_entete', v)}
            placeholder="Texte d'introduction (optionnel)"
            rows={2} activeBloc={activeBloc} setActiveBloc={setActiveBloc}
          />
          <BlocEditor
            label="Corps du message *" blocKey="corps" value={form.bloc_corps}
            onChange={v => update('bloc_corps', v)}
            placeholder="Rédigez votre message ici. Insérez des variables via les menus ci-dessus."
            rows={8} activeBloc={activeBloc} setActiveBloc={setActiveBloc}
          />
          <BlocEditor
            label="Signature" blocKey="signature" value={form.bloc_signature}
            onChange={v => update('bloc_signature', v)}
            placeholder="Ex : {{nom_consultant}} — AGE Legacy QC · {{telephone_consultant}}"
            rows={3} activeBloc={activeBloc} setActiveBloc={setActiveBloc}
          />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '11px', border: '1px solid #E5E1DA',
              borderRadius: 8, background: '#fff', color: '#78716C',
              fontSize: 13, fontWeight: 500, cursor: 'pointer'
            }}>
              Annuler
            </button>
            <button onClick={onSave} disabled={saving} style={{
              flex: 2, padding: '11px', border: 'none',
              borderRadius: 8, background: saving ? '#9CA3AF' : '#0F6E56',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer'
            }}>
              {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer le modèle'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Aperçu modale ─────────────────────────────────────────────────────────────

function ApercuModale({ modele, onClose }: { modele: ModeleComm; onClose: () => void }) {
  const exemples: Record<string, string> = {
    '{{prenom}}': 'Jean',
    '{{nom}}': 'Dupont',
    '{{adresse}}': '12 rue des Lilas',
    '{{ville}}': 'Bordeaux',
    '{{score_risque}}': '72/100',
    '{{classe_risque}}': 'Élevé',
    '{{alea_principal}}': 'Inondation',
    '{{nom_consultant}}': 'Sophie Martin',
    '{{telephone_consultant}}': '06 12 34 56 78',
  }

  function rendu(texte: string) {
    let r = texte
    Object.entries(exemples).forEach(([k, v]) => { r = r.split(k).join(v) })
    return r
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560, maxHeight: '80vh', overflowY: 'auto',
        background: '#fff', borderRadius: 16, zIndex: 301,
        boxShadow: '0 20px 60px rgba(0,0,0,0.20)', padding: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            Aperçu — {modele.nom}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          background: '#F8F7F4', borderRadius: 10, padding: 20,
          border: '1px solid #E5E1DA', fontSize: 13, lineHeight: 1.7, color: '#1F2937'
        }}>
          {modele.type === 'email' && modele.objet && (
            <div style={{
              marginBottom: 16, padding: '8px 12px',
              background: '#fff', borderRadius: 6, border: '1px solid #E5E1DA'
            }}>
              <span style={{ fontSize: 11, color: '#78716C', fontWeight: 600 }}>OBJET </span>
              {rendu(modele.objet)}
            </div>
          )}
          {modele.bloc_entete && (
            <p style={{ margin: '0 0 12px', color: '#78716C', fontStyle: 'italic' }}>
              {rendu(modele.bloc_entete)}
            </p>
          )}
          <p style={{ margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
            {rendu(modele.bloc_corps)}
          </p>
          {modele.bloc_signature && (
            <p style={{ margin: 0, borderTop: '1px solid #E5E1DA', paddingTop: 12, color: '#78716C' }}>
              {rendu(modele.bloc_signature)}
            </p>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#78716C', marginTop: 12, textAlign: 'center' }}>
          Aperçu avec données d'exemple · les variables réelles seront injectées à l'export
        </p>
      </div>
    </>
  )
}

// ── Styles utilitaires ────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 6
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
    border: `1px solid ${focused ? '#0F6E56' : '#E5E1DA'}`,
    outline: focused ? '2px solid #0F6E5620' : 'none',
    borderRadius: 8, background: '#fff', color: '#1F2937',
    transition: 'border-color 0.15s'
  }
}