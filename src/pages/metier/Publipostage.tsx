// Publipostage.tsx — Export publipostage (CSV Brevo + PDF courrier)
// Module P2-03 · M08
// Accès : admin, admin_national, responsable_regional, consultant

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Mail, FileText, Download, CheckCircle, AlertTriangle,
  ChevronRight, Users, Eye, X, Send, FileDown
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campagne {
  id: string
  nom: string
  statut: string
  nb_contacts?: number
}

interface ModeleComm {
  id: string
  nom: string
  type: 'email' | 'courrier'
  objet: string | null
  bloc_entete: string
  bloc_corps: string
  bloc_signature: string
  usage_count: number
}

interface Contact {
  id: string
  prenom: string | null
  nom: string | null
  adresse: string | null
  ville: string | null
  code_postal: string | null
  email: string | null
  telephone: string | null
  score_risque: number | null
  classe_risque: string | null
  alea_principal: string | null
  statut: string
}

type Etape = 1 | 2 | 3 | 4

// ── Variables de fusion ───────────────────────────────────────────────────────

const VARIABLES: Record<string, (c: Contact, consultant: string, tel: string) => string> = {
  '{{prenom}}':             (c) => c.prenom ?? '',
  '{{nom}}':               (c) => c.nom ?? '',
  '{{adresse}}':           (c) => c.adresse ?? '',
  '{{ville}}':             (c) => c.ville ?? '',
  '{{score_risque}}':      (c) => c.score_risque != null ? `${c.score_risque}/100` : '',
  '{{classe_risque}}':     (c) => c.classe_risque ?? '',
  '{{alea_principal}}':    (c) => c.alea_principal ?? '',
  '{{nom_consultant}}':    (_, consultant) => consultant,
  '{{telephone_consultant}}': (_, _c, tel) => tel,
}

function fusionner(texte: string, contact: Contact, consultant: string, tel: string): string {
  let r = texte
  Object.entries(VARIABLES).forEach(([token, fn]) => {
    r = r.split(token).join(fn(contact, consultant, tel))
  })
  return r
}

// ── Export CSV Brevo ──────────────────────────────────────────────────────────

function exporterCSVBrevo(contacts: Contact[], modele: ModeleComm, consultant: string, tel: string) {
  const entetes = ['EMAIL', 'PRENOM', 'NOM', 'ADRESSE', 'VILLE', 'SCORE_RISQUE',
    'CLASSE_RISQUE', 'ALEA_PRINCIPAL', 'OBJET_EMAIL', 'CORPS_MESSAGE']

  const lignes = contacts
    .filter(c => c.email)
    .map(c => [
      c.email ?? '',
      c.prenom ?? '',
      c.nom ?? '',
      c.adresse ?? '',
      c.ville ?? '',
      c.score_risque?.toString() ?? '',
      c.classe_risque ?? '',
      c.alea_principal ?? '',
      modele.objet ? fusionner(modele.objet, c, consultant, tel) : '',
      fusionner(
        [modele.bloc_entete, modele.bloc_corps, modele.bloc_signature].filter(Boolean).join('\n\n'),
        c, consultant, tel
      ),
    ].map(v => `"${v.replace(/"/g, '""')}"`))

  const csv = [entetes.join(','), ...lignes.map(l => l.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brevo_export_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Export PDF courrier ───────────────────────────────────────────────────────

function exporterPDFCourriers(contacts: Contact[], modele: ModeleComm, consultant: string, tel: string) {
  // Génère une page HTML par contact, ouvre dans nouvel onglet pour impression/PDF
  const pages = contacts.map(c => {
    const corps = fusionner(
      [modele.bloc_entete, modele.bloc_corps, modele.bloc_signature].filter(Boolean).join('\n\n'),
      c, consultant, tel
    )
    return `
      <div class="page">
        <div class="entete-doc">
          <span class="logo">AGE Legacy QC</span>
          <span class="date">${new Date().toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="destinataire">
          <strong>${c.prenom ?? ''} ${c.nom ?? ''}</strong><br/>
          ${c.adresse ? c.adresse + '<br/>' : ''}
          ${c.code_postal ? c.code_postal + ' ' : ''}${c.ville ?? ''}
        </div>
        <div class="corps">${corps.replace(/\n/g, '<br/>')}</div>
        <div class="pied-page">
          Document généré par la plateforme AGE Climate Platform · Confidentiel
        </div>
      </div>
    `
  }).join('<div class="saut-page"></div>')

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
    <title>Courriers — ${modele.nom}</title>
    <style>
      body { font-family: Georgia, serif; font-size: 12pt; color: #1F2937; margin: 0; }
      .page { padding: 60px 80px; min-height: 100vh; box-sizing: border-box; }
      .saut-page { page-break-before: always; }
      .entete-doc { display: flex; justify-content: space-between; margin-bottom: 60px;
        border-bottom: 2px solid #0F6E56; padding-bottom: 12px; }
      .logo { font-weight: bold; color: #0F6E56; font-size: 14pt; letter-spacing: 0.5px; }
      .date { color: #78716C; font-size: 10pt; }
      .destinataire { margin-bottom: 48px; line-height: 1.8; }
      .corps { line-height: 1.9; white-space: pre-wrap; }
      .pied-page { position: fixed; bottom: 20px; left: 80px; right: 80px;
        font-size: 8pt; color: #78716C; border-top: 1px solid #E5E1DA; padding-top: 8px; }
      @media print { .saut-page { page-break-before: always; } }
    </style></head><body>${pages}</body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function Publipostage() {
  const [etape, setEtape] = useState<Etape>(1)
  const [campagnes, setCampagnes] = useState<Campagne[]>([])
  const [modeles, setModeles] = useState<ModeleComm[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  const [campagneId, setCampagneId] = useState<string>('')
  const [modeleId, setModeleId] = useState<string>('')
  const [typeExport, setTypeExport] = useState<'csv_brevo' | 'pdf_courrier'>('csv_brevo')

  const [consultant, setConsultant] = useState('')
  const [telConsultant, setTelConsultant] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [apercuContact, setApercuContact] = useState<Contact | null>(null)

  const campagneSelectionnee = campagnes.find(c => c.id === campagneId)
  const modeleSelectionne = modeles.find(m => m.id === modeleId)
  const contactsValides = typeExport === 'csv_brevo'
    ? contacts.filter(c => c.email)
    : contacts

  useEffect(() => { chargerInit() }, [])
  useEffect(() => {
    if (campagneId) chargerContacts(campagneId)
  }, [campagneId])

  async function chargerInit() {
    setLoading(true)
    const [{ data: camp }, { data: mod }, { data: profil }] = await Promise.all([
      supabase.from('campagnes').select('id, nom, statut').order('created_at', { ascending: false }),
      supabase.from('modeles_comm').select('*').eq('actif', true).order('updated_at', { ascending: false }),
      supabase.from('profils').select('prenom, nom, telephone').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle()
    ])
    setCampagnes(camp ?? [])
    setModeles(mod ?? [])
    if (profil) {
      setConsultant(`${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim())
      setTelConsultant(profil.telephone ?? '')
    }
    setLoading(false)
  }

  async function chargerContacts(cid: string) {
    // Jointure contacts_campagne → biens pour récupérer adresse + score
    const { data } = await supabase
      .from('contacts_campagne')
      .select(`
        id, statut,
        prenom, nom, email, telephone,
        bien_id,
        biens (adresse, ville, code_postal, score_global, classe_risque, alea_principal)
      `)
      .eq('campagne_id', cid)

    const mapped: Contact[] = (data ?? []).map((r: any) => {
      const bien = Array.isArray(r.biens) ? r.biens[0] : r.biens
      return {
        id: r.id,
        prenom: r.prenom,
        nom: r.nom,
        email: r.email,
        telephone: r.telephone,
        adresse: bien?.adresse ?? null,
        ville: bien?.ville ?? null,
        code_postal: bien?.code_postal ?? null,
        score_risque: bien?.score_global ?? null,
        classe_risque: bien?.classe_risque ?? null,
        alea_principal: bien?.alea_principal ?? null,
        statut: r.statut,
      }
    })
    setContacts(mapped)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function lancerExport() {
    if (!modeleSelectionne) return
    setExporting(true)

    try {
      if (typeExport === 'csv_brevo') {
        exporterCSVBrevo(contactsValides, modeleSelectionne, consultant, telConsultant)
      } else {
        exporterPDFCourriers(contactsValides, modeleSelectionne, consultant, telConsultant)
      }

      // Incrémenter usage_count + logger export
      await supabase
        .from('modeles_comm')
        .update({ usage_count: (modeleSelectionne.usage_count ?? 0) + 1 })
        .eq('id', modeleId)

      await supabase.from('publipostage_exports').insert({
        campagne_id: campagneId,
        modele_id: modeleId,
        type_export: typeExport,
        nb_contacts: contactsValides.length,
        nom_fichier: typeExport === 'csv_brevo'
          ? `brevo_export_${new Date().toISOString().slice(0, 10)}.csv`
          : `courriers_${new Date().toISOString().slice(0, 10)}.pdf`,
      })

      showToast('ok', `Export réussi · ${contactsValides.length} contact${contactsValides.length > 1 ? 's' : ''} traité${contactsValides.length > 1 ? 's' : ''}`)
      setEtape(4)
    } catch {
      showToast('err', 'Erreur lors de l\'export')
    }
    setExporting(false)
  }

  if (loading) return (
    <div style={{ padding: 40, color: '#78716C', fontSize: 13 }}>Chargement…</div>
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>
          Publipostage
        </h1>
        <p style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
          Exportez vos contacts avec variables de fusion vers Brevo ou en courriers PDF
        </p>
      </div>

      {/* Stepper */}
      <Stepper etape={etape} />

      {/* Contenu par étape */}
      <div style={{
        background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
        padding: 28, marginTop: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>

        {/* Étape 1 — Sélection campagne */}
        {etape === 1 && (
          <div>
            <h2 style={titreEtape}>1. Sélectionnez une campagne</h2>
            <p style={sousTitreEtape}>Choisissez la campagne dont vous souhaitez exporter les contacts.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {campagnes.length === 0 && (
                <p style={{ color: '#78716C', fontSize: 13 }}>Aucune campagne disponible.</p>
              )}
              {campagnes.map(c => (
                <button key={c.id} onClick={() => setCampagneId(c.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10, textAlign: 'left',
                  border: `2px solid ${campagneId === c.id ? '#0F6E56' : '#E5E1DA'}`,
                  background: campagneId === c.id ? '#ECFDF5' : '#F8F7F4',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Users size={16} color={campagneId === c.id ? '#0F6E56' : '#78716C'} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1F2937' }}>{c.nom}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#78716C' }}>Statut : {c.statut}</p>
                    </div>
                  </div>
                  {campagneId === c.id && <CheckCircle size={16} color="#0F6E56" />}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <BtnSuivant disabled={!campagneId} onClick={() => setEtape(2)} />
            </div>
          </div>
        )}

        {/* Étape 2 — Sélection modèle + type export */}
        {etape === 2 && (
          <div>
            <h2 style={titreEtape}>2. Choisissez un modèle</h2>

            {/* Type export */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', display: 'block', marginBottom: 8 }}>
                Format d'export
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {([
                  { key: 'csv_brevo', label: 'CSV Brevo', icon: <Send size={14} />, desc: 'Import direct dans Brevo' },
                  { key: 'pdf_courrier', label: 'Courriers PDF', icon: <FileText size={14} />, desc: '1 courrier par contact' }
                ] as const).map(opt => (
                  <button key={opt.key} onClick={() => setTypeExport(opt.key)} style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10, textAlign: 'left',
                    border: `2px solid ${typeExport === opt.key ? '#0F6E56' : '#E5E1DA'}`,
                    background: typeExport === opt.key ? '#ECFDF5' : '#F8F7F4',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: typeExport === opt.key ? '#0F6E56' : '#78716C' }}>{opt.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>{opt.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#78716C' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filtrage modèles par type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modeles
                .filter(m => m.type === (typeExport === 'csv_brevo' ? 'email' : 'courrier'))
                .map(m => (
                  <button key={m.id} onClick={() => setModeleId(m.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 10, textAlign: 'left',
                    border: `2px solid ${modeleId === m.id ? '#0F6E56' : '#E5E1DA'}`,
                    background: modeleId === m.id ? '#ECFDF5' : '#F8F7F4',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Mail size={15} color={modeleId === m.id ? '#0F6E56' : '#78716C'} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1F2937' }}>{m.nom}</p>
                        {m.objet && <p style={{ margin: 0, fontSize: 11, color: '#78716C' }}>Objet : {m.objet}</p>}
                      </div>
                    </div>
                    {modeleId === m.id && <CheckCircle size={16} color="#0F6E56" />}
                  </button>
                ))}
              {modeles.filter(m => m.type === (typeExport === 'csv_brevo' ? 'email' : 'courrier')).length === 0 && (
                <p style={{ fontSize: 13, color: '#78716C' }}>
                  Aucun modèle de type «{typeExport === 'csv_brevo' ? 'email' : 'courrier'}» disponible.
                  <a href="/metier/modeles-comm" style={{ color: '#0F6E56', marginLeft: 6 }}>
                    Créer un modèle →
                  </a>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <BtnRetour onClick={() => setEtape(1)} />
              <BtnSuivant disabled={!modeleId} onClick={() => setEtape(3)} />
            </div>
          </div>
        )}

        {/* Étape 3 — Confirmation + aperçu */}
        {etape === 3 && modeleSelectionne && (
          <div>
            <h2 style={titreEtape}>3. Confirmation</h2>

            {/* Récapitulatif */}
            <div style={{
              background: '#F8F7F4', borderRadius: 10, padding: 20,
              border: '1px solid #E5E1DA', marginBottom: 20
            }}>
              <RecapLigne label="Campagne" value={campagneSelectionnee?.nom ?? ''} />
              <RecapLigne label="Modèle" value={modeleSelectionne.nom} />
              <RecapLigne label="Format" value={typeExport === 'csv_brevo' ? 'CSV Brevo' : 'Courriers PDF'} />
              <RecapLigne
                label="Contacts traités"
                value={`${contactsValides.length} / ${contacts.length}${typeExport === 'csv_brevo' ? ' (avec email)' : ''}`}
              />
            </div>

            {/* Alerte si contacts sans email */}
            {typeExport === 'csv_brevo' && contacts.length !== contactsValides.length && (
              <div style={{
                display: 'flex', gap: 10, padding: '12px 16px',
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#92400E'
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {contacts.length - contactsValides.length} contact{contacts.length - contactsValides.length > 1 ? 's' : ''} sans email exclu{contacts.length - contactsValides.length > 1 ? 's' : ''} de l'export CSV.
              </div>
            )}

            {/* Aperçu premier contact */}
            {contactsValides.length > 0 && (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#78716C' }}>
                    APERÇU — PREMIER CONTACT
                  </p>
                  <button
                    onClick={() => setApercuContact(contactsValides[0])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', border: '1px solid #E5E1DA',
                      borderRadius: 6, background: '#fff', cursor: 'pointer',
                      fontSize: 11, color: '#78716C'
                    }}>
                    <Eye size={12} /> Plein écran
                  </button>
                </div>
                <div style={{
                  background: '#F8F7F4', borderRadius: 8, padding: 16,
                  border: '1px solid #E5E1DA', fontSize: 12, lineHeight: 1.8,
                  color: '#1F2937', maxHeight: 200, overflowY: 'auto'
                }}>
                  {modeleSelectionne.type === 'email' && modeleSelectionne.objet && (
                    <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                      Objet : {fusionner(modeleSelectionne.objet, contactsValides[0], consultant, telConsultant)}
                    </p>
                  )}
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {fusionner(
                      [modeleSelectionne.bloc_entete, modeleSelectionne.bloc_corps, modeleSelectionne.bloc_signature]
                        .filter(Boolean).join('\n\n'),
                      contactsValides[0], consultant, telConsultant
                    )}
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <BtnRetour onClick={() => setEtape(2)} />
              <button onClick={lancerExport} disabled={exporting || contactsValides.length === 0} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 24px', border: 'none', borderRadius: 8,
                background: exporting || contactsValides.length === 0 ? '#9CA3AF' : '#0F6E56',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: exporting || contactsValides.length === 0 ? 'default' : 'pointer'
              }}>
                <FileDown size={16} />
                {exporting ? 'Export en cours…' : `Exporter ${contactsValides.length} contacts`}
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 — Succès */}
        {etape === 4 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#ECFDF5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <CheckCircle size={32} color="#0F6E56" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: '0 0 8px' }}>
              Export réalisé avec succès
            </h2>
            <p style={{ fontSize: 13, color: '#78716C', margin: '0 0 28px' }}>
              {contactsValides.length} contact{contactsValides.length > 1 ? 's' : ''} exporté{contactsValides.length > 1 ? 's' : ''} ·{' '}
              {typeExport === 'csv_brevo'
                ? 'Importez le fichier CSV dans votre compte Brevo pour lancer la campagne.'
                : 'Les courriers sont prêts à être imprimés.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { setEtape(1); setCampagneId(''); setModeleId('') }} style={{
                padding: '10px 20px', border: '1px solid #E5E1DA',
                borderRadius: 8, background: '#fff', color: '#78716C',
                fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}>
                Nouvel export
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale aperçu contact */}
      {apercuContact && modeleSelectionne && (
        <ApercuContactModale
          contact={apercuContact}
          modele={modeleSelectionne}
          consultant={consultant}
          tel={telConsultant}
          onClose={() => setApercuContact(null)}
        />
      )}
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Stepper({ etape }: { etape: Etape }) {
  const etapes = ['Campagne', 'Modèle', 'Confirmation', 'Export']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {etapes.map((label, i) => {
        const num = (i + 1) as Etape
        const done = etape > num
        const active = etape === num
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                background: done ? '#2F7D5C' : active ? '#0F6E56' : '#E5E1DA',
                color: done || active ? '#fff' : '#78716C',
                flexShrink: 0
              }}>
                {done ? <CheckCircle size={14} /> : num}
              </div>
              <span style={{
                fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? '#1F2937' : done ? '#2F7D5C' : '#78716C',
                whiteSpace: 'nowrap'
              }}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div style={{
                flex: 1, height: 2, margin: '0 12px',
                background: done ? '#2F7D5C' : '#E5E1DA'
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function RecapLigne({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '8px 0', borderBottom: '1px solid #E5E1DA',
      fontSize: 13
    }}>
      <span style={{ color: '#78716C' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1F2937' }}>{value}</span>
    </div>
  )
}

function BtnSuivant({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 20px', border: 'none', borderRadius: 8,
      background: disabled ? '#9CA3AF' : '#0F6E56',
      color: '#fff', fontSize: 13, fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer'
    }}>
      Suivant <ChevronRight size={15} />
    </button>
  )
}

function BtnRetour({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', border: '1px solid #E5E1DA',
      borderRadius: 8, background: '#fff', color: '#78716C',
      fontSize: 13, fontWeight: 500, cursor: 'pointer'
    }}>
      ← Retour
    </button>
  )
}

function ApercuContactModale({
  contact, modele, consultant, tel, onClose
}: {
  contact: Contact
  modele: ModeleComm
  consultant: string
  tel: string
  onClose: () => void
}) {
  const corps = fusionner(
    [modele.bloc_entete, modele.bloc_corps, modele.bloc_signature].filter(Boolean).join('\n\n'),
    contact, consultant, tel
  )
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 560, maxHeight: '80vh', overflowY: 'auto',
        background: '#fff', borderRadius: 16, zIndex: 301,
        boxShadow: '0 20px 60px rgba(0,0,0,0.20)', padding: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            Aperçu — {contact.prenom} {contact.nom}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{
          background: '#F8F7F4', borderRadius: 10, padding: 20,
          border: '1px solid #E5E1DA', fontSize: 13, lineHeight: 1.8, color: '#1F2937'
        }}>
          {modele.type === 'email' && modele.objet && (
            <p style={{ margin: '0 0 12px', fontWeight: 600 }}>
              Objet : {fusionner(modele.objet, contact, consultant, tel)}
            </p>
          )}
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{corps}</p>
        </div>
      </div>
    </>
  )
}

// Styles utilitaires
const titreEtape: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#1F2937', margin: '0 0 4px' }
const sousTitreEtape: React.CSSProperties = { fontSize: 13, color: '#78716C', margin: '0 0 16px' }
