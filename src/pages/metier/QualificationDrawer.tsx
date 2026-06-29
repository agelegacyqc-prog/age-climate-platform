// QualificationDrawer.tsx — Drawer qualification contact
// Module P2-04 · M09 · Intégré dans CampagnePipeline.tsx

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  X, Flame, Minus, Snowflake, Circle,
  Clock, CheckCircle, AlertTriangle, ChevronRight,
  MessageSquare, CalendarClock
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type StatutQualif = 'chaud' | 'tiede' | 'froid' | 'non_qualifie'

interface Qualification {
  id: string
  created_at: string
  statut: StatutQualif
  note: string | null
  action_suivante: string | null
  consultant_id: string | null
  relance_due_at: string | null
  relance_traitee: boolean
}

interface Contact {
  id: string
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  statut: string
}

interface Props {
  contact: Contact
  campagneId: string
  onClose: () => void
  onQualifSaved: () => void  // callback pour rafraîchir le pipeline
}

// ── Config statuts ─────────────────────────────────────────────────────────────

const STATUTS: {
  key: StatutQualif
  label: string
  couleur: string
  fond: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    key: 'chaud',
    label: 'Chaud',
    couleur: '#B91C1C',
    fond: '#FEF2F2',
    icon: <Flame size={16} />,
    description: 'Intérêt fort — relance sous 48h'
  },
  {
    key: 'tiede',
    label: 'Tiède',
    couleur: '#D97706',
    fond: '#FFFBEB',
    icon: <Minus size={16} />,
    description: 'Intérêt modéré — à recontacter'
  },
  {
    key: 'froid',
    label: 'Froid',
    couleur: '#0369A1',
    fond: '#EFF6FF',
    icon: <Snowflake size={16} />,
    description: 'Peu réceptif — garder en veille'
  },
  {
    key: 'non_qualifie',
    label: 'Non qualifié',
    couleur: '#78716C',
    fond: '#F8F7F4',
    icon: <Circle size={16} />,
    description: 'Hors cible ou injoignable'
  },
]

function getStatutConfig(key: StatutQualif) {
  return STATUTS.find(s => s.key === key) ?? STATUTS[3]
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function relanceEnRetard(q: Qualification) {
  if (!q.relance_due_at || q.relance_traitee) return false
  return new Date(q.relance_due_at) < new Date()
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function QualificationDrawer({ contact, campagneId, onClose, onQualifSaved }: Props) {
  const [historique, setHistorique] = useState<Qualification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Formulaire nouvelle qualification
  const [statut, setStatut] = useState<StatutQualif>('tiede')
  const [note, setNote] = useState('')
  const [actionSuivante, setActionSuivante] = useState('')

  useEffect(() => { chargerHistorique() }, [contact.id])

  async function chargerHistorique() {
    setLoading(true)
    const { data } = await supabase
      .from('qualifications')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
    setHistorique(data ?? [])

    // Pré-remplir avec le dernier statut connu
    if (data && data.length > 0) {
      setStatut(data[0].statut)
      setActionSuivante(data[0].action_suivante ?? '')
    }
    setLoading(false)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function sauvegarder() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profil } = await supabase
      .from('profils')
      .select('region')
      .eq('id', user?.id ?? '')
      .maybeSingle()

    const relance_due_at = statut === 'chaud'
      ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      : null

    const { error } = await supabase.from('qualifications').insert({
      contact_id: contact.id,
      campagne_id: campagneId,
      statut,
      note: note.trim() || null,
      action_suivante: actionSuivante.trim() || null,
      consultant_id: user?.id,
      region_code: profil?.region ?? null,
      relance_due_at,
      relance_traitee: false,
    })

    setSaving(false)

    if (error) {
      showToast('err', 'Erreur lors de la sauvegarde')
    } else {
      showToast('ok', 'Qualification enregistrée')
      setNote('')
      chargerHistorique()
      onQualifSaved()
    }
  }

  async function marquerRelanceTraitee(qualifId: string) {
    await supabase
      .from('qualifications')
      .update({ relance_traitee: true })
      .eq('id', qualifId)
    chargerHistorique()
    onQualifSaved()
  }

  const derniere = historique[0] ?? null
  const configDerniere = derniere ? getStatutConfig(derniere.statut) : null
  const enRetard = derniere ? relanceEnRetard(derniere) : false

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#fff', zIndex: 201, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 8,
            background: toast.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${toast.type === 'ok' ? '#6EE7B7' : '#FECACA'}`,
            color: toast.type === 'ok' ? '#065F46' : '#991B1B',
            fontSize: 12, fontWeight: 500
          }}>
            {toast.type === 'ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E5E1DA',
          position: 'sticky', top: 0, background: '#fff', zIndex: 5
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
                Qualification
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#78716C' }}>
                {contact.prenom} {contact.nom}
                {contact.email && <span style={{ marginLeft: 6, color: '#B25C2A' }}>· {contact.email}</span>}
              </p>
            </div>
            <button onClick={onClose} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C'
            }}>
              <X size={20} />
            </button>
          </div>

          {/* Statut courant + alerte relance */}
          {configDerniere && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
              padding: '8px 12px', borderRadius: 8,
              background: enRetard ? '#FEF2F2' : configDerniere.fond,
              border: `1px solid ${enRetard ? '#FECACA' : configDerniere.couleur + '30'}`
            }}>
              <span style={{ color: enRetard ? '#B91C1C' : configDerniere.couleur }}>
                {enRetard ? <Clock size={14} /> : configDerniere.icon}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: enRetard ? '#B91C1C' : configDerniere.couleur
              }}>
                {enRetard ? '⚠ Relance en retard' : `Statut actuel : ${configDerniere.label}`}
              </span>
              {enRetard && !derniere.relance_traitee && (
                <button onClick={() => marquerRelanceTraitee(derniere.id)} style={{
                  marginLeft: 'auto', padding: '3px 8px', fontSize: 11, fontWeight: 600,
                  border: '1px solid #FECACA', borderRadius: 6,
                  background: '#fff', color: '#B91C1C', cursor: 'pointer'
                }}>
                  Marquer traitée
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Nouvelle qualification ── */}
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
              NOUVELLE QUALIFICATION
            </p>

            {/* Sélecteur statut */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {STATUTS.map(s => (
                <button key={s.key} onClick={() => setStatut(s.key)} style={{
                  padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                  border: `2px solid ${statut === s.key ? s.couleur : '#E5E1DA'}`,
                  background: statut === s.key ? s.fond : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ color: statut === s.key ? s.couleur : '#78716C' }}>{s.icon}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: statut === s.key ? s.couleur : '#1F2937'
                    }}>
                      {s.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#78716C' }}>{s.description}</span>
                </button>
              ))}
            </div>

            {/* Alerte 48h si Chaud */}
            {statut === 'chaud' && (
              <div style={{
                display: 'flex', gap: 8, padding: '8px 12px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#991B1B'
              }}>
                <Clock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Une alerte de relance sera créée dans 48h si aucune action n'est enregistrée.
              </div>
            )}

            {/* Action suivante */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>
                <CalendarClock size={13} style={{ marginRight: 4 }} />
                Action suivante
              </label>
              <input
                value={actionSuivante}
                onChange={e => setActionSuivante(e.target.value)}
                placeholder="Ex : Rappeler lundi matin, Envoyer proposition…"
                style={inputStyle}
              />
            </div>

            {/* Note */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                <MessageSquare size={13} style={{ marginRight: 4 }} />
                Note (optionnel)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Contexte de l'échange, objections, points d'intérêt…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button onClick={sauvegarder} disabled={saving} style={{
              width: '100%', padding: '11px', border: 'none', borderRadius: 8,
              background: saving ? '#9CA3AF' : '#0F6E56',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {saving ? 'Enregistrement…' : 'Enregistrer la qualification'}
              {!saving && <ChevronRight size={15} />}
            </button>
          </div>

          {/* ── Historique ── */}
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
              HISTORIQUE ({historique.length})
            </p>

            {loading ? (
              <p style={{ fontSize: 12, color: '#78716C' }}>Chargement…</p>
            ) : historique.length === 0 ? (
              <p style={{ fontSize: 12, color: '#78716C' }}>Aucune qualification enregistrée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historique.map((q, i) => {
                  const cfg = getStatutConfig(q.statut)
                  const retard = relanceEnRetard(q)
                  return (
                    <div key={q.id} style={{
                      padding: '12px 14px', borderRadius: 8,
                      border: `1px solid ${i === 0 ? cfg.couleur + '50' : '#E5E1DA'}`,
                      background: i === 0 ? cfg.fond : '#F8F7F4',
                      position: 'relative'
                    }}>
                      {/* Badge premier */}
                      {i === 0 && (
                        <span style={{
                          position: 'absolute', top: -8, right: 10,
                          fontSize: 9, fontWeight: 700, padding: '2px 6px',
                          background: cfg.couleur, color: '#fff', borderRadius: 6
                        }}>
                          ACTUEL
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ color: cfg.couleur }}>{cfg.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.couleur }}>
                          {cfg.label}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#78716C' }}>
                          {formatDate(q.created_at)}
                        </span>
                      </div>

                      {q.action_suivante && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#1F2937' }}>
                          <span style={{ fontWeight: 600 }}>→ </span>{q.action_suivante}
                        </p>
                      )}

                      {q.note && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#78716C', fontStyle: 'italic' }}>
                          {q.note}
                        </p>
                      )}

                      {/* Alerte relance */}
                      {q.relance_due_at && !q.relance_traitee && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginTop: 8, padding: '4px 8px', borderRadius: 6,
                          background: retard ? '#FEF2F2' : '#FFFBEB',
                          fontSize: 11,
                          color: retard ? '#B91C1C' : '#92400E'
                        }}>
                          <Clock size={11} />
                          {retard
                            ? `Relance en retard depuis ${formatDate(q.relance_due_at)}`
                            : `Relance prévue le ${formatDate(q.relance_due_at)}`
                          }
                          {i === 0 && retard && (
                            <button onClick={() => marquerRelanceTraitee(q.id)} style={{
                              marginLeft: 'auto', padding: '2px 6px', fontSize: 10,
                              border: '1px solid #FECACA', borderRadius: 4,
                              background: '#fff', color: '#B91C1C', cursor: 'pointer', fontWeight: 600
                            }}>
                              Traité
                            </button>
                          )}
                        </div>
                      )}
                      {q.relance_traitee && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginTop: 6, fontSize: 11, color: '#2F7D5C'
                        }}>
                          <CheckCircle size={11} /> Relance traitée
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 6
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  padding: '9px 12px', fontSize: 13, fontFamily: 'inherit',
  border: '1px solid #E5E1DA', borderRadius: 8,
  background: '#fff', color: '#1F2937',
  outline: 'none'
}