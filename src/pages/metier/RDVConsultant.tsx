// RDVConsultant.tsx — Agenda RDV consultant
// Module P2-05 · M10
// Vue calendrier semaine/mois + drawer création/détail

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, ChevronLeft, ChevronRight, Phone, Monitor,
  MapPin, Clock, CheckCircle, XCircle, AlertTriangle,
  X, Calendar, FileText, User
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type TypeRDV = 'appel' | 'visio' | 'presentiel'
type StatutRDV = 'propose' | 'confirme' | 'realise' | 'annule'
type VueCalendrier = 'semaine' | 'mois'

interface RendezVous {
  id: string
  created_at: string
  titre: string
  type_rdv: TypeRDV
  date_debut: string
  duree_minutes: number
  lieu_lien: string | null
  note_preparation: string | null
  statut: StatutRDV
  compte_rendu: string | null
  compte_rendu_at: string | null
  consultant_id: string
  contact_id: string | null
  campagne_id: string | null
}

interface FormRDV {
  titre: string
  type_rdv: TypeRDV
  date_debut: string
  heure_debut: string
  duree_minutes: number
  lieu_lien: string
  note_preparation: string
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TypeRDV, { label: string; couleur: string; fond: string; icon: React.ReactNode }> = {
  appel:      { label: 'Appel',      couleur: '#0369A1', fond: '#EFF6FF', icon: <Phone size={12} /> },
  visio:      { label: 'Visio',      couleur: '#7C3AED', fond: '#F5F3FF', icon: <Monitor size={12} /> },
  presentiel: { label: 'Présentiel', couleur: '#0F6E56', fond: '#ECFDF5', icon: <MapPin size={12} /> },
}

const STATUT_CONFIG: Record<StatutRDV, { label: string; couleur: string; fond: string; icon: React.ReactNode }> = {
  propose:  { label: 'Proposé',   couleur: '#D97706', fond: '#FFFBEB', icon: <Clock size={12} /> },
  confirme: { label: 'Confirmé',  couleur: '#0369A1', fond: '#EFF6FF', icon: <CheckCircle size={12} /> },
  realise:  { label: 'Réalisé',   couleur: '#0F6E56', fond: '#ECFDF5', icon: <CheckCircle size={12} /> },
  annule:   { label: 'Annulé',    couleur: '#B91C1C', fond: '#FEF2F2', icon: <XCircle size={12} /> },
}

const JOURS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const FORM_VIDE: FormRDV = {
  titre: '',
  type_rdv: 'appel',
  date_debut: '',
  heure_debut: '09:00',
  duree_minutes: 60,
  lieu_lien: '',
  note_preparation: '',
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formatHeure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateCourte(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatDateComplete(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function lundiDeLaSemaine(date: Date): Date {
  const d = new Date(date)
  const jour = d.getDay()
  const diff = jour === 0 ? -6 : 1 - jour
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function premierJourDuMois(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isMemeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function rdvDuJour(rdvs: RendezVous[], jour: Date) {
  return rdvs.filter(r => isMemeJour(new Date(r.date_debut), jour))
             .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime())
}

// ── Carte RDV (compact, dans le calendrier) ───────────────────────────────────

function CarteRDV({ rdv, onClick }: { key?: string; rdv: RendezVous; onClick: () => void }) {
  const type = TYPE_CONFIG[rdv.type_rdv]
  const statut = STATUT_CONFIG[rdv.statut]
  return (
    <div
      onClick={onClick}
      style={{
        padding: '3px 6px', borderRadius: 5, marginBottom: 2,
        background: rdv.statut === 'annule' ? '#F4F3F0' : type.fond,
        borderLeft: `3px solid ${rdv.statut === 'annule' ? '#C9C3BB' : type.couleur}`,
        cursor: 'pointer', opacity: rdv.statut === 'annule' ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={e => (e.currentTarget.style.opacity = rdv.statut === 'annule' ? '0.6' : '1')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: type.couleur, flexShrink: 0 }}>{type.icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: '#1F2937',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {formatHeure(rdv.date_debut)} · {rdv.titre}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
        <span style={{
          fontSize: 9, fontWeight: 500,
          color: rdv.statut === 'annule' ? '#9CA3AF' : statut.couleur
        }}>
          {statut.label}
        </span>
        <span style={{ fontSize: 9, color: '#9CA3AF' }}>· {rdv.duree_minutes} min</span>
      </div>
    </div>
  )
}

// ── Vue Semaine ───────────────────────────────────────────────────────────────

function VueSemaine({
  lundi, rdvs, onClickJour, onClickRDV
}: {
  lundi: Date
  rdvs: RendezVous[]
  onClickJour: (date: Date) => void
  onClickRDV: (rdv: RendezVous) => void
}) {
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi)
    d.setDate(lundi.getDate() + i)
    return d
  })
  const auj = new Date()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, flex: 1 }}>
      {jours.map((jour, i) => {
        const rdvsJour = rdvDuJour(rdvs, jour)
        const estAujourdhui = isMemeJour(jour, auj)
        return (
          <div
            key={i}
            onClick={() => onClickJour(jour)}
            style={{
              background: estAujourdhui ? '#F0FDF4' : '#fff',
              border: `1.5px solid ${estAujourdhui ? '#0F6E56' : '#E5E1DA'}`,
              borderRadius: 10, padding: '8px 6px',
              cursor: 'pointer', minHeight: 120,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => !estAujourdhui && (e.currentTarget.style.borderColor = '#B25C2A')}
            onMouseLeave={e => !estAujourdhui && (e.currentTarget.style.borderColor = '#E5E1DA')}
          >
            {/* En-tête jour */}
            <div style={{ marginBottom: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#78716C', fontWeight: 500 }}>
                {JOURS_FR[i]}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700,
                color: estAujourdhui ? '#0F6E56' : '#1F2937',
                lineHeight: 1.2
              }}>
                {jour.getDate()}
              </div>
              {rdvsJour.length > 0 && (
                <div style={{
                  display: 'inline-block', fontSize: 9, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 8,
                  background: estAujourdhui ? '#0F6E56' : '#E5E1DA',
                  color: estAujourdhui ? '#fff' : '#78716C',
                  marginTop: 2
                }}>
                  {rdvsJour.length}
                </div>
              )}
            </div>

            {/* RDVs du jour */}
            <div onClick={e => e.stopPropagation()}>
              {rdvsJour.map(r => (
                <CarteRDV key={r.id} rdv={r} onClick={() => onClickRDV(r)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Vue Mois ──────────────────────────────────────────────────────────────────

function VueMois({
  moisDate, rdvs, onClickJour, onClickRDV
}: {
  moisDate: Date
  rdvs: RendezVous[]
  onClickJour: (date: Date) => void
  onClickRDV: (rdv: RendezVous) => void
}) {
  const auj = new Date()
  const premier = premierJourDuMois(moisDate)
  const lundiPremier = lundiDeLaSemaine(premier)
  const jours: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(lundiPremier)
    d.setDate(lundiPremier.getDate() + i)
    jours.push(d)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
      {/* En-têtes */}
      {JOURS_FR.map(j => (
        <div key={j} style={{
          textAlign: 'center', fontSize: 10, fontWeight: 700,
          color: '#78716C', padding: '4px 0', letterSpacing: '0.05em'
        }}>
          {j}
        </div>
      ))}

      {/* Jours */}
      {jours.map((jour, i) => {
        const horseMois = jour.getMonth() !== moisDate.getMonth()
        const estAujourdhui = isMemeJour(jour, auj)
        const rdvsJour = rdvDuJour(rdvs, jour)
        return (
          <div
            key={i}
            onClick={() => onClickJour(jour)}
            style={{
              background: estAujourdhui ? '#F0FDF4' : horseMois ? '#FAFAFA' : '#fff',
              border: `1px solid ${estAujourdhui ? '#0F6E56' : '#E5E1DA'}`,
              borderRadius: 8, padding: '4px 5px',
              cursor: 'pointer', minHeight: 72, opacity: horseMois ? 0.4 : 1,
            }}
          >
            <div style={{
              fontSize: 11, fontWeight: estAujourdhui ? 700 : 400,
              color: estAujourdhui ? '#0F6E56' : '#1F2937',
              marginBottom: 3, textAlign: 'right'
            }}>
              {jour.getDate()}
            </div>
            <div onClick={e => e.stopPropagation()}>
              {rdvsJour.slice(0, 2).map(r => (
                <CarteRDV key={r.id} rdv={r} onClick={() => onClickRDV(r)} />
              ))}
              {rdvsJour.length > 2 && (
                <div style={{ fontSize: 9, color: '#78716C', textAlign: 'center', marginTop: 2 }}>
                  +{rdvsJour.length - 2} autre{rdvsJour.length - 2 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Drawer Création / Édition ─────────────────────────────────────────────────

function DrawerRDV({
  form, setForm, saving, editId, onClose, onSave
}: {
  form: FormRDV
  setForm: React.Dispatch<React.SetStateAction<FormRDV>>
  saving: boolean
  editId: string | null
  onClose: () => void
  onSave: () => void
}) {
  function update(k: keyof FormRDV, v: string | number) {
    setForm(f => ({ ...f, [k]: v }))
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#fff', zIndex: 201, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #E5E1DA',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
            {editId ? 'Modifier le RDV' : 'Nouveau RDV'}
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Titre */}
          <div>
            <label style={labelStyle}>Titre *</label>
            <input value={form.titre} onChange={e => update('titre', e.target.value)}
              placeholder="Ex : Appel découverte — M. Dupont"
              style={inputStyle} />
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(['appel', 'visio', 'presentiel'] as TypeRDV[]).map(t => {
                const cfg = TYPE_CONFIG[t]
                return (
                  <button key={t} onClick={() => update('type_rdv', t)} style={{
                    padding: '10px 8px', borderRadius: 8, textAlign: 'center',
                    border: `2px solid ${form.type_rdv === t ? cfg.couleur : '#E5E1DA'}`,
                    background: form.type_rdv === t ? cfg.fond : '#fff',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4
                  }}>
                    <span style={{ color: form.type_rdv === t ? cfg.couleur : '#78716C' }}>
                      {cfg.icon}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: form.type_rdv === t ? cfg.couleur : '#78716C'
                    }}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date + Heure */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date_debut}
                onChange={e => update('date_debut', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Heure *</label>
              <input type="time" value={form.heure_debut}
                onChange={e => update('heure_debut', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Durée */}
          <div>
            <label style={labelStyle}>Durée</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[30, 60, 90, 120].map(d => (
                <button key={d} onClick={() => update('duree_minutes', d)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: `2px solid ${form.duree_minutes === d ? '#0F6E56' : '#E5E1DA'}`,
                  background: form.duree_minutes === d ? '#ECFDF5' : '#fff',
                  color: form.duree_minutes === d ? '#0F6E56' : '#78716C',
                  cursor: 'pointer'
                }}>
                  {d < 60 ? `${d} min` : `${d / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Lieu / Lien */}
          <div>
            <label style={labelStyle}>
              {form.type_rdv === 'visio' ? 'Lien visio' : form.type_rdv === 'presentiel' ? 'Lieu' : 'Lieu / Lien (optionnel)'}
            </label>
            <input value={form.lieu_lien}
              onChange={e => update('lieu_lien', e.target.value)}
              placeholder={form.type_rdv === 'visio' ? 'https://meet.google.com/...' : form.type_rdv === 'presentiel' ? '12 rue des Lilas, Paris' : ''}
              style={inputStyle} />
          </div>

          {/* Note préparatoire */}
          <div>
            <label style={labelStyle}>Note préparatoire (optionnel)</label>
            <textarea value={form.note_preparation}
              onChange={e => update('note_preparation', e.target.value)}
              placeholder="Points à aborder, contexte client…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

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
              flex: 2, padding: '11px', border: 'none', borderRadius: 8,
              background: saving ? '#9CA3AF' : '#0F6E56',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer'
            }}>
              {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer le RDV'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Drawer Détail RDV ─────────────────────────────────────────────────────────

function DrawerDetailRDV({
  rdv, onClose, onEdit, onStatut, onCompteRendu, saving
}: {
  rdv: RendezVous
  onClose: () => void
  onEdit: () => void
  onStatut: (statut: StatutRDV) => void
  onCompteRendu: (texte: string) => void
  saving: boolean
}) {
  const [cr, setCR] = useState(rdv.compte_rendu ?? '')
  const type = TYPE_CONFIG[rdv.type_rdv]
  const statut = STATUT_CONFIG[rdv.statut]

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#fff', zIndex: 201, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
      }}>
        {/* Header coloré selon type */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E5E1DA',
          background: type.fond, position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: type.couleur }}>{type.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: type.couleur, letterSpacing: '0.05em' }}>
                  {type.label.toUpperCase()}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                  background: statut.fond, color: statut.couleur,
                  border: `1px solid ${statut.couleur}30`
                }}>
                  {statut.label}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
                {rdv.titre}
              </h2>
            </div>
            <button onClick={onClose} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C'
            }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Infos RDV */}
          <div style={{
            background: '#F8F7F4', borderRadius: 10, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <InfoLigne icon={<Calendar size={14} />}
              label={`${formatDateComplete(rdv.date_debut)} à ${formatHeure(rdv.date_debut)}`} />
            <InfoLigne icon={<Clock size={14} />}
              label={`${rdv.duree_minutes < 60 ? rdv.duree_minutes + ' min' : rdv.duree_minutes / 60 + 'h'}`} />
            {rdv.lieu_lien && (
              <InfoLigne icon={rdv.type_rdv === 'visio' ? <Monitor size={14} /> : <MapPin size={14} />}
                label={rdv.lieu_lien} lien={rdv.type_rdv === 'visio'} />
            )}
          </div>

          {/* Note préparatoire */}
          {rdv.note_preparation && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
                NOTE PRÉPARATOIRE
              </p>
              <p style={{
                margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.7,
                background: '#F8F7F4', padding: '10px 14px', borderRadius: 8,
                borderLeft: `3px solid ${type.couleur}`
              }}>
                {rdv.note_preparation}
              </p>
            </div>
          )}

          {/* Actions statut */}
          {rdv.statut !== 'annule' && rdv.statut !== 'realise' && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
                CHANGER LE STATUT
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {rdv.statut === 'propose' && (
                  <BtnStatut label="Confirmer" couleur="#0369A1" fond="#EFF6FF"
                    onClick={() => onStatut('confirme')} />
                )}
                {(rdv.statut === 'propose' || rdv.statut === 'confirme') && (
                  <BtnStatut label="Marquer réalisé" couleur="#0F6E56" fond="#ECFDF5"
                    onClick={() => onStatut('realise')} />
                )}
                <BtnStatut label="Annuler le RDV" couleur="#B91C1C" fond="#FEF2F2"
                  onClick={() => onStatut('annule')} />
              </div>
            </div>
          )}

          {/* Compte rendu */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
              COMPTE RENDU
            </p>
            {rdv.compte_rendu_at && (
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#78716C' }}>
                Rédigé le {formatDateCourte(rdv.compte_rendu_at)}
              </p>
            )}
            <textarea
              value={cr}
              onChange={e => setCR(e.target.value)}
              placeholder="Résumé de l'échange, décisions prises, prochaines étapes…"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' as const, marginBottom: 8 }}
            />
            <button onClick={() => onCompteRendu(cr)} disabled={saving} style={{
              width: '100%', padding: '10px', border: 'none', borderRadius: 8,
              background: saving ? '#9CA3AF' : '#0F6E56',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer'
            }}>
              {saving ? 'Enregistrement…' : 'Sauvegarder le compte rendu'}
            </button>
          </div>

          {/* Modifier */}
          {rdv.statut !== 'annule' && rdv.statut !== 'realise' && (
            <button onClick={onEdit} style={{
              padding: '10px', border: '1px solid #E5E1DA', borderRadius: 8,
              background: '#fff', color: '#78716C', fontSize: 13, fontWeight: 500,
              cursor: 'pointer'
            }}>
              Modifier ce RDV
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function InfoLigne({ icon, label, lien }: { icon: React.ReactNode; label: string; lien?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1F2937' }}>
      <span style={{ color: '#78716C', flexShrink: 0 }}>{icon}</span>
      {lien ? (
        <a href={label} target="_blank" rel="noopener noreferrer"
          style={{ color: '#0369A1', textDecoration: 'underline' }}>
          {label}
        </a>
      ) : label}
    </div>
  )
}

function BtnStatut({ label, couleur, fond, onClick }: {
  label: string; couleur: string; fond: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      border: `1px solid ${couleur}40`, background: fond, color: couleur, cursor: 'pointer'
    }}>
      {label}
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function RDVConsultant() {
  const [rdvs, setRdvs] = useState<RendezVous[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [vue, setVue] = useState<VueCalendrier>('semaine')
  const [dateRef, setDateRef] = useState(new Date())

  // Drawers
  const [drawerCreation, setDrawerCreation] = useState(false)
  const [form, setForm] = useState<FormRDV>(FORM_VIDE)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [rdvDetail, setRdvDetail] = useState<RendezVous | null>(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from('rendez_vous')
      .select('*')
      .order('date_debut', { ascending: true })
    setRdvs(data ?? [])
    setLoading(false)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function ouvrirCreation(date?: Date) {
    setEditId(null)
    const dateStr = date ? date.toISOString().slice(0, 10) : ''
    setForm({ ...FORM_VIDE, date_debut: dateStr })
    setDrawerCreation(true)
  }

  function ouvrirEdition(rdv: RendezVous) {
    setEditId(rdv.id)
    const d = new Date(rdv.date_debut)
    setForm({
      titre: rdv.titre,
      type_rdv: rdv.type_rdv,
      date_debut: d.toISOString().slice(0, 10),
      heure_debut: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      duree_minutes: rdv.duree_minutes,
      lieu_lien: rdv.lieu_lien ?? '',
      note_preparation: rdv.note_preparation ?? '',
    })
    setRdvDetail(null)
    setDrawerCreation(true)
  }

  async function sauvegarder() {
    if (!form.titre.trim() || !form.date_debut || !form.heure_debut) {
      showToast('err', 'Titre, date et heure obligatoires')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profils').select('region').eq('id', user?.id ?? '').maybeSingle()

    const date_debut = new Date(`${form.date_debut}T${form.heure_debut}`).toISOString()

    const payload = {
      titre: form.titre.trim(),
      type_rdv: form.type_rdv,
      date_debut,
      duree_minutes: form.duree_minutes,
      lieu_lien: form.lieu_lien.trim() || null,
      note_preparation: form.note_preparation.trim() || null,
      consultant_id: user?.id,
      region_code: profil?.region ?? null,
    }

    const { error } = editId
      ? await supabase.from('rendez_vous').update(payload).eq('id', editId)
      : await supabase.from('rendez_vous').insert(payload)

    setSaving(false)
    if (error) showToast('err', 'Erreur lors de la sauvegarde')
    else {
      showToast('ok', editId ? 'RDV mis à jour' : 'RDV créé')
      setDrawerCreation(false)
      charger()
    }
  }

  async function changerStatut(statut: StatutRDV) {
    if (!rdvDetail) return
    setSaving(true)
    await supabase.from('rendez_vous').update({ statut }).eq('id', rdvDetail.id)
    setSaving(false)
    showToast('ok', `Statut mis à jour : ${STATUT_CONFIG[statut].label}`)
    setRdvDetail(null)
    charger()
  }

  async function sauvegarderCR(texte: string) {
    if (!rdvDetail) return
    setSaving(true)
    await supabase.from('rendez_vous').update({
      compte_rendu: texte || null,
      compte_rendu_at: texte ? new Date().toISOString() : null,
      statut: rdvDetail.statut === 'confirme' ? 'realise' : rdvDetail.statut,
    }).eq('id', rdvDetail.id)
    setSaving(false)
    showToast('ok', 'Compte rendu sauvegardé')
    setRdvDetail(null)
    charger()
  }

  // Navigation calendrier
  function precedent() {
    const d = new Date(dateRef)
    if (vue === 'semaine') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setDateRef(d)
  }
  function suivant() {
    const d = new Date(dateRef)
    if (vue === 'semaine') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setDateRef(d)
  }
  function aujourdhui() { setDateRef(new Date()) }

  const lundi = lundiDeLaSemaine(dateRef)
  const titreCalendrier = vue === 'semaine'
    ? `${lundi.getDate()} ${MOIS_FR[lundi.getMonth()]} — ${(() => { const d = new Date(lundi); d.setDate(d.getDate() + 6); return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}` })()}`
    : `${MOIS_FR[dateRef.getMonth()]} ${dateRef.getFullYear()}`

  const rdvsAVenir = rdvs.filter(r =>
    new Date(r.date_debut) >= new Date() && r.statut !== 'annule'
  ).slice(0, 5)

  if (loading) return (
    <div style={{ padding: 40, color: '#78716C', fontSize: 13 }}>Chargement…</div>
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 18px', borderRadius: 10,
          background: toast.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'ok' ? '#6EE7B7' : '#FECACA'}`,
          color: toast.type === 'ok' ? '#065F46' : '#991B1B',
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.10)'
        }}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>Agenda RDV</h1>
          <p style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
            {rdvs.filter(r => r.statut === 'confirme').length} RDV confirmé{rdvs.filter(r => r.statut === 'confirme').length > 1 ? 's' : ''} ·{' '}
            {rdvs.filter(r => r.statut === 'propose').length} en attente
          </p>
        </div>
        <button onClick={() => ouvrirCreation()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: '#0F6E56', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>
          <Plus size={16} /> Nouveau RDV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>

        {/* Calendrier */}
        <div style={{
          background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
          padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column', gap: 16
        }}>
          {/* Barre navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={precedent} style={btnNav}><ChevronLeft size={16} /></button>
              <button onClick={suivant} style={btnNav}><ChevronRight size={16} /></button>
              <button onClick={aujourdhui} style={{
                padding: '5px 12px', border: '1px solid #E5E1DA', borderRadius: 6,
                background: '#fff', fontSize: 12, fontWeight: 500, color: '#78716C', cursor: 'pointer'
              }}>
                Aujourd'hui
              </button>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginLeft: 8 }}>
                {titreCalendrier}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['semaine', 'mois'] as VueCalendrier[]).map(v => (
                <button key={v} onClick={() => setVue(v)} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${vue === v ? '#0F6E56' : '#E5E1DA'}`,
                  background: vue === v ? '#ECFDF5' : '#fff',
                  color: vue === v ? '#0F6E56' : '#78716C',
                  cursor: 'pointer'
                }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Grille */}
          {vue === 'semaine' ? (
            <VueSemaine
              lundi={lundi} rdvs={rdvs}
              onClickJour={d => ouvrirCreation(d)}
              onClickRDV={r => setRdvDetail(r)}
            />
          ) : (
            <VueMois
              moisDate={dateRef} rdvs={rdvs}
              onClickJour={d => ouvrirCreation(d)}
              onClickRDV={r => setRdvDetail(r)}
            />
          )}
        </div>

        {/* Colonne latérale — prochains RDV */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
            padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
              PROCHAINS RDV
            </p>
            {rdvsAVenir.length === 0 ? (
              <p style={{ fontSize: 12, color: '#78716C' }}>Aucun RDV à venir.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rdvsAVenir.map(r => {
                  const type = TYPE_CONFIG[r.type_rdv]
                  const statut = STATUT_CONFIG[r.statut]
                  return (
                    <div key={r.id}
                      onClick={() => setRdvDetail(r)}
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${type.couleur}30`,
                        background: type.fond,
                        borderLeft: `3px solid ${type.couleur}`
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 2 }}>
                        {r.titre}
                      </div>
                      <div style={{ fontSize: 11, color: '#78716C' }}>
                        {formatDateCourte(r.date_debut)} · {formatHeure(r.date_debut)}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: statut.couleur,
                        display: 'inline-block', marginTop: 3
                      }}>
                        {statut.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Légende */}
          <div style={{
            background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
            padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#78716C', letterSpacing: '0.05em' }}>
              LÉGENDE
            </p>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: cfg.couleur }}>{cfg.icon}</span>
                <span style={{ fontSize: 12, color: '#1F2937' }}>{cfg.label}</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#E5E1DA', margin: '10px 0' }} />
            {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: cfg.couleur }}>{cfg.icon}</span>
                <span style={{ fontSize: 12, color: '#1F2937' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drawers */}
      {drawerCreation && (
        <DrawerRDV
          form={form} setForm={setForm}
          saving={saving} editId={editId}
          onClose={() => setDrawerCreation(false)}
          onSave={sauvegarder}
        />
      )}
      {rdvDetail && (
        <DrawerDetailRDV
          rdv={rdvDetail}
          onClose={() => setRdvDetail(null)}
          onEdit={() => ouvrirEdition(rdvDetail)}
          onStatut={changerStatut}
          onCompteRendu={sauvegarderCR}
          saving={saving}
        />
      )}
    </div>
  )
}

// ── Styles utilitaires ────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 6
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
  border: '1px solid #E5E1DA', borderRadius: 8,
  background: '#fff', color: '#1F2937', outline: 'none'
}

const btnNav: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, border: '1px solid #E5E1DA', borderRadius: 6,
  background: '#fff', cursor: 'pointer', color: '#78716C'
}