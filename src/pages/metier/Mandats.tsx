// Mandats.tsx — Gestion des mandats RGA (CERFA 17596*01)
// Module P2-06 · M12

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, FileText, CheckCircle, AlertTriangle, Clock,
  XCircle, Eye, Download, Link, X, ChevronRight,
  User, Building, MapPin, Calendar
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type StatutMandat = 'brouillon' | 'envoye' | 'signe' | 'annule'

interface Mandat {
  id: string
  created_at: string
  type_mandat: string
  statut: StatutMandat
  mandant_nom: string
  mandant_prenom: string
  mandant_commune: string
  mandant_adresse: string
  numero_dossier: string | null
  bien_id: string | null
  yousign_url: string | null
  signe_le: string | null
  pdf_path: string | null
  pdf_generated_at: string | null
  fait_le: string | null
  consultant_id: string
}

interface FormMandat {
  // Mandant
  mandant_civilite: 'M' | 'Mme'
  mandant_nom: string
  mandant_prenom: string
  mandant_adresse: string
  mandant_code_postal: string
  mandant_commune: string
  mandant_email: string
  mandant_telephone: string
  numero_dossier: string
  // Mandataire
  mandataire_civilite: 'M' | 'Mme'
  mandataire_nom: string
  mandataire_prenom: string
  mandataire_raison_sociale: string
  mandataire_adresse: string
  mandataire_code_postal: string
  mandataire_commune: string
  mandataire_email: string
  mandataire_telephone: string
  mandataire_agrement: string
  // Cases CERFA
  mandat_admin_etudes: boolean
  mandat_admin_travaux: boolean
  mandat_fin_etudes: boolean
  mandat_fin_travaux: boolean
  // Attestations
  atteste: boolean
  engage: boolean
  informe: boolean
  apres_signature: boolean
  // Signature
  fait_a: string
  fait_le: string
  // Liens
  bien_id: string
  dossier_id: string
  contact_id: string
  yousign_url: string
}

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutMandat, {
  label: string; couleur: string; fond: string; icon: React.ReactNode
}> = {
  brouillon: { label: 'Brouillon',  couleur: '#78716C', fond: '#F8F7F4', icon: <FileText size={13} /> },
  envoye:    { label: 'Envoyé',     couleur: '#D97706', fond: '#FFFBEB', icon: <Clock size={13} /> },
  signe:     { label: 'Signé',      couleur: '#0F6E56', fond: '#ECFDF5', icon: <CheckCircle size={13} /> },
  annule:    { label: 'Annulé',     couleur: '#B91C1C', fond: '#FEF2F2', icon: <XCircle size={13} /> },
}

const FORM_VIDE: FormMandat = {
  mandant_civilite: 'M',
  mandant_nom: '', mandant_prenom: '', mandant_adresse: '',
  mandant_code_postal: '', mandant_commune: '',
  mandant_email: '', mandant_telephone: '', numero_dossier: '',
  mandataire_civilite: 'M',
  mandataire_nom: '', mandataire_prenom: '',
  mandataire_raison_sociale: 'AGE Legacy QC',
  mandataire_adresse: '', mandataire_code_postal: '',
  mandataire_commune: '', mandataire_email: '',
  mandataire_telephone: '', mandataire_agrement: '',
  mandat_admin_etudes: false, mandat_admin_travaux: false,
  mandat_fin_etudes: false, mandat_fin_travaux: false,
  atteste: false, engage: false, informe: false, apres_signature: false,
  fait_a: '', fait_le: new Date().toISOString().slice(0, 10),
  bien_id: '', dossier_id: '', contact_id: '', yousign_url: '',
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function sanitizeFilename(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

// ── Générateur PDF CERFA ──────────────────────────────────────────────────────

function genererHTMLCerfa(form: FormMandat): string {
  const checkbox = (checked: boolean) => checked
    ? '&#9745;'
    : '&#9744;'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Mandat CERFA 17596*01</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .rf { font-size: 9pt; font-weight: bold; }
  .cerfa-num { font-size: 11pt; font-weight: bold; }
  h1 { text-align: center; font-size: 18pt; font-weight: bold; margin: 12px 0 4px; }
  .sous-titre { text-align: center; font-size: 10pt; margin-bottom: 4px; }
  .et-ou { text-align: center; color: #cc6600; font-weight: bold; font-size: 11pt; }
  .prop-occ { text-align: center; color: #cc6600; font-weight: bold; font-size: 10pt; margin-bottom: 8px; }
  .ref-legale { text-align: center; font-size: 8pt; margin-bottom: 4px; }
  .avertissement-orange { text-align: center; color: #cc6600; font-weight: bold; font-size: 9pt; margin-bottom: 10px; }
  .encadre { border: 1px solid #cc6600; padding: 10px; margin-bottom: 14px; font-size: 9pt; line-height: 1.5; }
  .section-titre { font-weight: bold; font-size: 10pt; margin: 14px 0 6px; }
  .champ-ligne { display: flex; align-items: baseline; gap: 6px; margin-bottom: 5px; font-size: 9pt; }
  .champ-label { white-space: nowrap; flex-shrink: 0; }
  .champ-valeur { border-bottom: 1px solid #999; flex: 1; min-width: 60px; padding: 1px 4px; background: #e8f0fe; }
  .champ-valeur-long { border: 1px solid #999; width: 100%; padding: 3px 6px; margin-bottom: 5px; background: #e8f0fe; font-size: 9pt; }
  .row2 { display: flex; gap: 16px; margin-bottom: 5px; }
  .row2 .champ-ligne { flex: 1; }
  .checkbox-section { margin: 10px 0; font-size: 9pt; line-height: 1.6; }
  .checkbox-ligne { display: flex; gap: 8px; margin-bottom: 4px; }
  .cb-label { flex: 1; }
  h2 { font-size: 11pt; font-weight: bold; margin: 14px 0 6px; }
  h2 span { color: #cc6600; }
  .orange { color: #cc6600; }
  .bullet-titre { display: flex; align-items: center; gap: 6px; font-weight: bold; margin: 12px 0 4px; font-size: 10pt; }
  .indent { padding-left: 16px; font-size: 9pt; line-height: 1.6; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
  .sig-bloc { border-top: 1px solid #000; padding-top: 10px; }
  .sig-titre { font-weight: bold; font-size: 9pt; margin-bottom: 8px; }
  .sig-zone { border: 1px solid #aac4ff; background: #dbe9ff; height: 80px; margin-top: 12px; }
  .fait-a { display: flex; gap: 20px; margin: 16px 0 10px; font-size: 9pt; }
  .fait-champ { border-bottom: 1px solid #999; min-width: 200px; padding: 1px 4px; background: #e8f0fe; }
  hr { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>

<!-- En-tête -->
<div class="header">
  <div class="rf">
    🇫🇷<br/>RÉPUBLIQUE<br/>FRANÇAISE<br/><em>Liberté<br/>Égalité<br/>Fraternité</em>
  </div>
  <div style="text-align:right">
    <div style="font-size:14pt;font-weight:bold;font-style:italic;color:#666">cerfa</div>
    <div class="cerfa-num">N° cerfa : 17596*01</div>
  </div>
</div>

<h1>MANDAT</h1>
<div class="sous-titre">
  <strong>• Administratif :</strong> pour la constitution d'une demande de prime et sa demande de paiement
</div>
<div class="et-ou">et/ou</div>
<div class="sous-titre">
  <strong>• Financier :</strong> pour la perception de la prime
</div>
<div class="prop-occ">PROPRIÉTAIRE OCCUPANT</div>

<div class="ref-legale">
  Articles 1984 et suivants du code civil / Décret n°2025-920 du 06 septembre 2025<br/>
  Arrêté du 06 septembre 2025 relatif aux aides du fonds de prévention retrait-gonflement des sols argileux dans la construction
</div>
<div class="avertissement-orange">Ce document est émis par le Ministère en charge de la construction.</div>

<div class="encadre">
  Ce formulaire doit <strong>obligatoirement</strong> être utilisé si vous voulez désigner <strong>un mandataire</strong> pour effectuer les démarches relatives au fonds de prévention RGA. Vous pouvez choisir l'une ou l'ensemble des démarches proposées en cochant les cases ci-dessous, à savoir :<br/>
  – la constitution d'une demande de prime et d'une demande de paiement <strong>(mandat administratif)</strong>,<br/>
  – la perception de la prime <strong>(mandat financier)</strong>.<br/>
  Le mandataire s'identifie obligatoirement auprès du représentant de l'État dans votre département (Direction Départementale des Territoires et de la Mer), préalablement à la validation de votre demande de mandat.<br/>
  Pour être valable, ce mandat doit être <strong>daté et signé par vous-même</strong> (le mandant) <strong>et par la personne que vous désignez</strong> (votre mandataire). <strong>Tous les champs sont obligatoires. Ce mandat reste valide tant qu'il n'a pas été révoqué par l'une ou l'autre des parties.</strong>
</div>

<!-- MANDANT -->
<div class="section-titre">Je, soussigné (vous, le mandant) :</div>
<div class="row2">
  <div class="champ-ligne"><span class="champ-label">${checkbox(form.mandant_civilite === 'M')} M</span></div>
  <div class="champ-ligne"><span class="champ-label">${checkbox(form.mandant_civilite === 'Mme')} Mme</span></div>
  <div class="champ-ligne" style="flex:2"><span class="champ-label">N° dossier :</span><span class="champ-valeur">${form.numero_dossier}</span></div>
</div>
<div class="row2">
  <div class="champ-ligne"><span class="champ-label">Nom :</span><span class="champ-valeur">${form.mandant_nom}</span></div>
  <div class="champ-ligne"><span class="champ-label">Prénom :</span><span class="champ-valeur">${form.mandant_prenom}</span></div>
</div>
<div class="champ-ligne" style="font-size:9pt">
  ${checkbox(true)} Propriétaire occupant d'une maison individuelle à titre de résidence principale (indiquer l'adresse postale complète)
</div>
<div class="champ-ligne"><span class="champ-label">Adresse postale :</span><span class="champ-valeur">${form.mandant_adresse}</span></div>
<div class="row2">
  <div class="champ-ligne"><span class="champ-label">Code postal :</span><span class="champ-valeur">${form.mandant_code_postal}</span></div>
  <div class="champ-ligne"><span class="champ-label">Commune :</span><span class="champ-valeur">${form.mandant_commune}</span></div>
</div>
<div class="champ-ligne"><span class="champ-label">Adresse mail :</span><span class="champ-valeur">${form.mandant_email}</span></div>
<div class="champ-ligne"><span class="champ-label">Téléphone :</span><span class="champ-valeur">${form.mandant_telephone}</span></div>

<!-- MANDATAIRE -->
<div class="section-titre" style="margin-top:16px">Donne MANDAT à (votre mandataire) :</div>
<div class="row2">
  <div class="champ-ligne"><span class="champ-label">${checkbox(form.mandataire_civilite === 'M')} M</span></div>
  <div class="champ-ligne"><span class="champ-label">${checkbox(form.mandataire_civilite === 'Mme')} Mme</span></div>
  <div class="champ-ligne" style="flex:3;font-size:8pt;color:#555">(si personne morale, nom et prénom du représentant ayant délégation de signature)</div>
</div>
<div class="row2">
  <div class="champ-ligne"><span class="champ-label">Nom :</span><span class="champ-valeur">${form.mandataire_nom}</span></div>
  <div class="champ-ligne"><span class="champ-label">Prénom :</span><span class="champ-valeur">${form.mandataire_prenom}</span></div>
</div>
<div class="champ-ligne"><span class="champ-label">Raison sociale :</span><span class="champ-valeur">${form.mandataire_raison_sociale}</span></div>
<div class="champ-ligne"><span class="champ-label">Adresse postale :</span><span class="champ-valeur">${form.mandataire_adresse}</span></div>
<div class="row2">
  <div class="champ-ligne"><span class="champ-label">Code postal :</span><span class="champ-valeur">${form.mandataire_code_postal}</span></div>
  <div class="champ-ligne"><span class="champ-label">Commune :</span><span class="champ-valeur">${form.mandataire_commune}</span></div>
</div>
<div class="champ-ligne"><span class="champ-label">Adresse mail :</span><span class="champ-valeur">${form.mandataire_email}</span></div>
<div class="champ-ligne"><span class="champ-label">Téléphone :</span><span class="champ-valeur">${form.mandataire_telephone}</span></div>
<div class="champ-ligne"><span class="champ-label" style="font-size:8pt">Date d'agrément (art. L.365-1 CCH) :</span><span class="champ-valeur">${form.mandataire_agrement}</span></div>

<!-- OBJET DU MANDAT -->
<div class="section-titre" style="margin-top:16px">Pour effectuer <u>en mon nom et pour mon compte</u> l'une ou l'ensemble des démarches suivantes (cocher la ou les cases concernées) :</div>

<h2>1/ Mandat <span style="color:#000">ADMINISTRATIF</span> : constituer mon dossier de demande <span>d'aides du fonds de prévention RGA</span> à ma place :</h2>
<div class="checkbox-section">
  <div class="checkbox-ligne">
    <span>${checkbox(form.mandat_admin_etudes || form.mandat_admin_travaux)}</span>
    <span class="cb-label"><strong>Je donne mandat pour la constitution et le dépôt en ligne de mon dossier de demandes d'aides et de demande de paiements, ainsi que pour la réception et le traitement de toute correspondance avec le représentant de l'État dans le département.</strong></span>
  </div>
  <div class="indent">
    <div>${checkbox(form.mandat_admin_etudes)} <strong>Pour la phase études</strong> (réalisation du diagnostic de vulnérabilité de ma maison)</div>
    <div>${checkbox(form.mandat_admin_travaux)} <strong>Pour la phase travaux</strong> (réalisation des travaux de prévention)</div>
  </div>
</div>

<h2>2/ Mandat <span>FINANCIER</span> : <span class="orange">PERCEVOIR</span> <span>les aides du fonds de prévention RGA</span> à ma place :</h2>
<div class="checkbox-section">
  <div class="checkbox-ligne">
    <span>${checkbox(form.mandat_fin_etudes || form.mandat_fin_travaux)}</span>
    <span class="cb-label"><strong>Je donne mandat pour que les sommes versées par le représentant de l'État dans mon département, relatives au <span class="orange">fonds de prévention RGA</span> le soient directement sur le compte bancaire de mon mandataire.</strong> Je reste cependant seul(e) bénéficiaire des aides.</span>
  </div>
  <div class="indent">
    <div>${checkbox(form.mandat_fin_etudes)} <strong>Pour la phase études</strong> (réalisation du diagnostic de vulnérabilité de ma maison)</div>
    <div>${checkbox(form.mandat_fin_travaux)} <strong>Pour la phase travaux</strong> (réalisation des travaux)</div>
  </div>
</div>

<!-- ATTESTATIONS -->
<div class="bullet-titre">${checkbox(form.atteste)} J'ATTESTE :</div>
<div class="indent">
  - ne pas avoir commencé le diagnostic de vulnérabilité de ma maison, les travaux et/ou prestations avant le dépôt en ligne de la demande d'aides du fonds de prévention RGA ;<br/>
  - avoir un projet de diagnostic de vulnérabilité et de travaux sur une maison individuelle achevée depuis <strong>au moins 15 ans</strong> ;<br/>
  - être <strong>propriétaire occupant</strong> d'une maison individuelle située en <strong>zone d'exposition forte au RGA, non mitoyenne, deux niveaux maximums</strong>, <strong>sans fissures</strong> ou avec <strong>quelques fissures sur les murs intérieurs</strong> ;<br/>
  - avoir déclaré les ressources de <strong>l'ensemble des membres de mon foyer</strong>.
</div>

<div class="bullet-titre">${checkbox(form.engage)} JE M'ENGAGE À :</div>
<div class="indent">
  - faire réaliser le diagnostic de vulnérabilité de ma maison éligible au fonds de prévention RGA par <strong>un expert technique en RGA</strong> ;<br/>
  - faire réaliser les travaux et/ou prestations éligibles au fonds de prévention RGA par <strong>une ou plusieurs entreprises</strong> en capacité de réaliser les travaux ;<br/>
  - justifier de l'achèvement du diagnostic et des travaux <strong>dans les délais impartis</strong>.
</div>

<div class="bullet-titre">${checkbox(form.informe)} JE SUIS INFORMÉ(E) DES ÉLÉMENTS SUIVANTS :</div>
<div class="indent">
  - le représentant de l'État dans mon département peut effectuer à tout moment des contrôles ;<br/>
  - toute fraude, tentative de fraude, fausse déclaration entraîne le retrait et le reversement des aides.
</div>

<div class="bullet-titre">${checkbox(form.apres_signature)} APRÈS LA SIGNATURE DE CE DOCUMENT :</div>
<div class="indent">
  - Je conserve l'original du présent mandat et <strong>téléverse</strong> sa copie dans mon dossier personnel sur la plateforme <strong>Démarches Simplifiées</strong>.<br/>
  - Mon mandataire et moi pouvons révoquer le présent mandat à tout moment avant le dépôt de la demande de solde.
</div>

<hr/>
<div style="font-size:9pt;margin:10px 0;line-height:1.5">
  Le représentant de l'État dans mon département décline toute responsabilité en cas de mauvaise exécution du présent mandat par votre mandataire. Cette circonstance ne pourra en aucun cas vous exonérer de vos obligations et du respect des engagements que vous avez pris vis-à-vis du représentant de l'État dans votre département.
</div>

<!-- SIGNATURES -->
<div class="fait-a">
  <span>Fait à</span>
  <span class="fait-champ">${form.fait_a}</span>
  <span>Le</span>
  <span class="fait-champ">${form.fait_le ? new Date(form.fait_le).toLocaleDateString('fr-FR') : ''}</span>
</div>

<div class="signatures">
  <div class="sig-bloc">
    <div class="sig-titre">Partie réservée au MANDANT (vous-même)</div>
    <div class="champ-ligne"><span class="champ-label">Nom et Prénom :</span><span class="champ-valeur">${form.mandant_nom} ${form.mandant_prenom}</span></div>
    <div style="font-weight:bold;margin-top:12px;font-size:9pt">Signature</div>
    <div class="sig-zone"></div>
  </div>
  <div class="sig-bloc">
    <div class="sig-titre">Partie réservée au MANDATAIRE qui s'engage à informer le mandant des démarches relatives au présent mandat</div>
    <div class="champ-ligne"><span class="champ-label">Nom et Prénom / Raison sociale :</span></div>
    <div class="champ-valeur" style="margin-bottom:4px">${form.mandataire_nom} ${form.mandataire_prenom} / ${form.mandataire_raison_sociale}</div>
    <div style="font-weight:bold;margin-top:12px;font-size:9pt">Signature</div>
    <div class="sig-zone"></div>
  </div>
</div>

</body>
</html>`
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function Mandats() {
  const [mandats, setMandats] = useState<Mandat[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormMandat>(FORM_VIDE)
  const [saving, setSaving] = useState(false)
  const [etape, setEtape] = useState<1 | 2 | 3>(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [yousignInput, setYousignInput] = useState('')
  const [filtreStatut, setFiltreStatut] = useState<StatutMandat | 'tous'>('tous')

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from('mandats')
      .select('*')
      .order('created_at', { ascending: false })
    setMandats(data ?? [])
    setLoading(false)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function update(k: keyof FormMandat, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function ouvrirCreation() {
    setEditId(null)
    setForm(FORM_VIDE)
    setEtape(1)
    setDrawerOpen(true)
  }

  async function sauvegarder(statut: 'brouillon' | 'envoye' = 'brouillon') {
    if (!form.mandant_nom.trim() || !form.mandant_prenom.trim()) {
      showToast('err', 'Nom et prénom du mandant obligatoires')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase
      .from('profils').select('region').eq('id', user?.id ?? '').maybeSingle()

    // Annuler mandat précédent si même bien
    if (form.bien_id && statut === 'envoye') {
      await supabase.from('mandats')
        .update({ statut: 'annule' })
        .eq('bien_id', form.bien_id)
        .neq('statut', 'annule')
        .neq('id', editId ?? '')
    }

    const payload = {
      ...form,
      statut,
      consultant_id: user?.id,
      region_code: profil?.region ?? null,
      bien_id: form.bien_id || null,
      dossier_id: form.dossier_id || null,
      contact_id: form.contact_id || null,
    }

    const { data: saved, error } = editId
      ? await supabase.from('mandats').update(payload).eq('id', editId).select().maybeSingle()
      : await supabase.from('mandats').insert(payload).select().maybeSingle()

    setSaving(false)
    if (error) { showToast('err', 'Erreur lors de la sauvegarde'); return }

    showToast('ok', statut === 'envoye' ? 'Mandat enregistré et marqué Envoyé' : 'Brouillon sauvegardé')
    setDrawerOpen(false)
    charger()
  }

  async function genererEtTelecharger(mandat: Mandat) {
    // Récupérer le mandat complet
    const { data } = await supabase.from('mandats').select('*').eq('id', mandat.id).maybeSingle()
    if (!data) return

    const html = genererHTMLCerfa(data as unknown as FormMandat)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      setTimeout(() => w.print(), 600)
    }

    // Mettre à jour pdf_generated_at
    await supabase.from('mandats').update({
      pdf_generated_at: new Date().toISOString()
    }).eq('id', mandat.id)
    charger()
  }

  async function sauvegarderYousign(id: string) {
    if (!yousignInput.trim()) return
    await supabase.from('mandats').update({
      yousign_url: yousignInput.trim(),
      statut: 'envoye'
    }).eq('id', id)
    showToast('ok', 'Lien Yousign enregistré')
    setDetailId(null)
    setYousignInput('')
    charger()
  }

  async function marquerSigne(id: string) {
    await supabase.from('mandats').update({
      statut: 'signe',
      signe_le: new Date().toISOString().slice(0, 10)
    }).eq('id', id)
    showToast('ok', 'Mandat marqué signé')
    setDetailId(null)
    charger()
  }

  async function annuler(id: string) {
    if (!confirm('Annuler ce mandat ?')) return
    await supabase.from('mandats').update({ statut: 'annule' }).eq('id', id)
    showToast('ok', 'Mandat annulé')
    charger()
  }

  const mandatsFiltres = mandats.filter(m =>
    filtreStatut === 'tous' || m.statut === filtreStatut
  )
  const mandatDetail = mandats.find(m => m.id === detailId)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', margin: 0 }}>Mandats</h1>
          <p style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
            CERFA 17596*01 — Mandat RGA propriétaire occupant
          </p>
        </div>
        <button onClick={ouvrirCreation} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: '#0F6E56', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>
          <Plus size={16} /> Nouveau mandat
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {(Object.entries(STATUT_CONFIG) as [StatutMandat, typeof STATUT_CONFIG[StatutMandat]][]).map(([key, cfg]) => (
          <div key={key} style={{
            background: '#fff', border: '1px solid #E5E1DA', borderRadius: 10,
            padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ color: cfg.couleur }}>{cfg.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#78716C' }}>{cfg.label}</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: cfg.couleur }}>
              {mandats.filter(m => m.statut === key).length}
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['tous', 'brouillon', 'envoye', 'signe', 'annule'] as const).map(f => (
          <button key={f} onClick={() => setFiltreStatut(f)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            border: `1px solid ${filtreStatut === f ? '#0F6E56' : '#E5E1DA'}`,
            background: filtreStatut === f ? '#ECFDF5' : '#fff',
            color: filtreStatut === f ? '#0F6E56' : '#78716C',
            cursor: 'pointer'
          }}>
            {f === 'tous' ? 'Tous' : STATUT_CONFIG[f as StatutMandat]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p style={{ color: '#78716C', fontSize: 13 }}>Chargement…</p>
      ) : mandatsFiltres.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          border: '2px dashed #E5E1DA', borderRadius: 12, color: '#78716C'
        }}>
          <FileText size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontWeight: 500 }}>Aucun mandat</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Créez votre premier mandat CERFA RGA.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mandatsFiltres.map(m => {
            const cfg = STATUT_CONFIG[m.statut]
            return (
              <div key={m.id} style={{
                background: '#fff', border: '1px solid #E5E1DA', borderRadius: 12,
                padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', gap: 16
              }}>
                {/* Statut */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 8,
                  background: cfg.fond, color: cfg.couleur,
                  fontSize: 11, fontWeight: 700, flexShrink: 0
                }}>
                  {cfg.icon} {cfg.label}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
                    {m.mandant_nom} {m.mandant_prenom}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78716C' }}>
                    {m.mandant_adresse} · {m.mandant_commune}
                    {m.numero_dossier && ` · N° ${m.numero_dossier}`}
                  </p>
                </div>

                {/* Dates */}
                <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 11, color: '#78716C' }}>
                  <div>Créé le {formatDate(m.created_at)}</div>
                  {m.signe_le && <div style={{ color: '#0F6E56' }}>Signé le {formatDate(m.signe_le)}</div>}
                  {m.pdf_generated_at && <div>PDF généré le {formatDate(m.pdf_generated_at)}</div>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <BtnAction onClick={() => setDetailId(m.id)} title="Détail">
                    <Eye size={14} />
                  </BtnAction>
                  <BtnAction onClick={() => genererEtTelecharger(m)} title="Générer PDF">
                    <Download size={14} />
                  </BtnAction>
                  {m.statut !== 'annule' && m.statut !== 'signe' && (
                    <BtnAction onClick={() => annuler(m.id)} title="Annuler" danger>
                      <XCircle size={14} />
                    </BtnAction>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Drawer création */}
      {drawerOpen && (
        <DrawerCreationMandat
          form={form} update={update} saving={saving}
          etape={etape} setEtape={setEtape}
          onClose={() => setDrawerOpen(false)}
          onSaveBrouillon={() => sauvegarder('brouillon')}
          onSaveEnvoye={() => sauvegarder('envoye')}
        />
      )}

      {/* Drawer détail */}
      {mandatDetail && (
        <DrawerDetailMandat
          mandat={mandatDetail}
          yousignInput={yousignInput}
          setYousignInput={setYousignInput}
          onClose={() => { setDetailId(null); setYousignInput('') }}
          onGenerer={() => genererEtTelecharger(mandatDetail)}
          onYousign={() => sauvegarderYousign(mandatDetail.id)}
          onSigne={() => marquerSigne(mandatDetail.id)}
          onAnnuler={() => { annuler(mandatDetail.id); setDetailId(null) }}
        />
      )}
    </div>
  )
}

// ── Drawer Création ───────────────────────────────────────────────────────────

function DrawerCreationMandat({
  form, update, saving, etape, setEtape, onClose, onSaveBrouillon, onSaveEnvoye
}: {
  form: FormMandat
  update: (k: keyof FormMandat, v: string | boolean) => void
  saving: boolean
  etape: 1 | 2 | 3
  setEtape: (e: 1 | 2 | 3) => void
  onClose: () => void
  onSaveBrouillon: () => void
  onSaveEnvoye: () => void
}) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 560,
        background: '#fff', zIndex: 201, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid #E5E1DA',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
                Nouveau mandat CERFA 17596*01
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#78716C' }}>
                Mandat RGA — Propriétaire occupant
              </p>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C' }}>
              <X size={20} />
            </button>
          </div>
          {/* Stepper */}
          <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
            {[
              { n: 1 as const, label: 'Mandant' },
              { n: 2 as const, label: 'Mandataire' },
              { n: 3 as const, label: 'Cases & Signature' },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  onClick={() => setEtape(s.n)}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    background: etape > s.n ? '#2F7D5C' : etape === s.n ? '#0F6E56' : '#E5E1DA',
                    color: etape >= s.n ? '#fff' : '#78716C'
                  }}>
                    {etape > s.n ? '✓' : s.n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: etape === s.n ? 600 : 400,
                    color: etape === s.n ? '#1F2937' : '#78716C' }}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: etape > s.n ? '#2F7D5C' : '#E5E1DA', margin: '0 8px' }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 28 }}>

          {/* Étape 1 — Mandant */}
          {etape === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionTitre icon={<User size={14} />} label="Mandant (propriétaire)" />

              <div style={{ display: 'flex', gap: 12 }}>
                {(['M', 'Mme'] as const).map(c => (
                  <BtnCivilite key={c} label={c} selected={form.mandant_civilite === c}
                    onClick={() => update('mandant_civilite', c)} />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ChampTexte label="Nom *" value={form.mandant_nom} onChange={v => update('mandant_nom', v)} />
                <ChampTexte label="Prénom *" value={form.mandant_prenom} onChange={v => update('mandant_prenom', v)} />
              </div>
              <ChampTexte label="Adresse postale *" value={form.mandant_adresse} onChange={v => update('mandant_adresse', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                <ChampTexte label="Code postal *" value={form.mandant_code_postal} onChange={v => update('mandant_code_postal', v)} />
                <ChampTexte label="Commune *" value={form.mandant_commune} onChange={v => update('mandant_commune', v)} />
              </div>
              <ChampTexte label="Email" value={form.mandant_email} onChange={v => update('mandant_email', v)} type="email" />
              <ChampTexte label="Téléphone" value={form.mandant_telephone} onChange={v => update('mandant_telephone', v)} />
              <ChampTexte label="N° dossier RGA" value={form.numero_dossier} onChange={v => update('numero_dossier', v)}
                placeholder="Numéro du dossier RGA correspondant" />
            </div>
          )}

          {/* Étape 2 — Mandataire */}
          {etape === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionTitre icon={<Building size={14} />} label="Mandataire (AGE / représentant)" />

              <div style={{ display: 'flex', gap: 12 }}>
                {(['M', 'Mme'] as const).map(c => (
                  <BtnCivilite key={c} label={c} selected={form.mandataire_civilite === c}
                    onClick={() => update('mandataire_civilite', c)} />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ChampTexte label="Nom *" value={form.mandataire_nom} onChange={v => update('mandataire_nom', v)} />
                <ChampTexte label="Prénom *" value={form.mandataire_prenom} onChange={v => update('mandataire_prenom', v)} />
              </div>
              <ChampTexte label="Raison sociale" value={form.mandataire_raison_sociale}
                onChange={v => update('mandataire_raison_sociale', v)} />
              <ChampTexte label="Adresse postale *" value={form.mandataire_adresse}
                onChange={v => update('mandataire_adresse', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                <ChampTexte label="Code postal *" value={form.mandataire_code_postal}
                  onChange={v => update('mandataire_code_postal', v)} />
                <ChampTexte label="Commune *" value={form.mandataire_commune}
                  onChange={v => update('mandataire_commune', v)} />
              </div>
              <ChampTexte label="Email" value={form.mandataire_email}
                onChange={v => update('mandataire_email', v)} type="email" />
              <ChampTexte label="Téléphone" value={form.mandataire_telephone}
                onChange={v => update('mandataire_telephone', v)} />
              <ChampTexte label="Date d'agrément (art. L.365-1 CCH)" value={form.mandataire_agrement}
                onChange={v => update('mandataire_agrement', v)}
                placeholder="Ex : 01/01/2024" />
            </div>
          )}

          {/* Étape 3 — Cases + Signature */}
          {etape === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Mandat administratif */}
              <div>
                <SectionTitre icon={<FileText size={14} />} label="1/ Mandat ADMINISTRATIF" />
                <CaseACocher
                  checked={form.mandat_admin_etudes}
                  onChange={v => update('mandat_admin_etudes', v)}
                  label="Pour la phase études (diagnostic de vulnérabilité)"
                />
                <CaseACocher
                  checked={form.mandat_admin_travaux}
                  onChange={v => update('mandat_admin_travaux', v)}
                  label="Pour la phase travaux (travaux de prévention)"
                />
              </div>

              {/* Mandat financier */}
              <div>
                <SectionTitre icon={<FileText size={14} />} label="2/ Mandat FINANCIER" />
                <CaseACocher
                  checked={form.mandat_fin_etudes}
                  onChange={v => update('mandat_fin_etudes', v)}
                  label="Pour la phase études"
                />
                <CaseACocher
                  checked={form.mandat_fin_travaux}
                  onChange={v => update('mandat_fin_travaux', v)}
                  label="Pour la phase travaux"
                />
              </div>

              {/* Attestations */}
              <div>
                <SectionTitre icon={<CheckCircle size={14} />} label="Attestations" />
                <CaseACocher checked={form.atteste} onChange={v => update('atteste', v)}
                  label="J'atteste (conditions propriétaire occupant RGA)" />
                <CaseACocher checked={form.engage} onChange={v => update('engage', v)}
                  label="Je m'engage à (réalisation diagnostic et travaux)" />
                <CaseACocher checked={form.informe} onChange={v => update('informe', v)}
                  label="Je suis informé(e) des éléments suivants" />
                <CaseACocher checked={form.apres_signature} onChange={v => update('apres_signature', v)}
                  label="Après la signature de ce document" />
              </div>

              {/* Lieu et date */}
              <div>
                <SectionTitre icon={<MapPin size={14} />} label="Fait à / Le" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <ChampTexte label="Fait à" value={form.fait_a} onChange={v => update('fait_a', v)}
                    placeholder="Ville" />
                  <ChampTexte label="Le" value={form.fait_le} onChange={v => update('fait_le', v)}
                    type="date" />
                </div>
              </div>

              {/* Rattachement optionnel */}
              <div>
                <SectionTitre icon={<Link size={14} />} label="Rattachement (optionnel)" />
                <ChampTexte label="ID Bien" value={form.bien_id} onChange={v => update('bien_id', v)}
                  placeholder="UUID du bien" />
                <div style={{ height: 8 }} />
                <ChampTexte label="ID Dossier RGA" value={form.dossier_id} onChange={v => update('dossier_id', v)}
                  placeholder="UUID du dossier RGA" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {etape > 1 && (
              <button onClick={() => setEtape((etape - 1) as 1 | 2 | 3)} style={{
                padding: '10px 16px', border: '1px solid #E5E1DA', borderRadius: 8,
                background: '#fff', color: '#78716C', fontSize: 13, cursor: 'pointer'
              }}>
                ← Retour
              </button>
            )}
            {etape < 3 ? (
              <button onClick={() => setEtape((etape + 1) as 2 | 3)} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: 8,
                background: '#0F6E56', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
                Suivant <ChevronRight size={15} />
              </button>
            ) : (
              <>
                <button onClick={onSaveBrouillon} disabled={saving} style={{
                  flex: 1, padding: '10px', border: '1px solid #E5E1DA', borderRadius: 8,
                  background: '#fff', color: '#78716C', fontSize: 13, cursor: 'pointer'
                }}>
                  Sauvegarder brouillon
                </button>
                <button onClick={onSaveEnvoye} disabled={saving} style={{
                  flex: 2, padding: '10px', border: 'none', borderRadius: 8,
                  background: saving ? '#9CA3AF' : '#0F6E56', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer'
                }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer & Envoyer'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Drawer Détail ─────────────────────────────────────────────────────────────

function DrawerDetailMandat({
  mandat, yousignInput, setYousignInput,
  onClose, onGenerer, onYousign, onSigne, onAnnuler
}: {
  mandat: Mandat
  yousignInput: string
  setYousignInput: (v: string) => void
  onClose: () => void
  onGenerer: () => void
  onYousign: () => void
  onSigne: () => void
  onAnnuler: () => void
}) {
  const cfg = STATUT_CONFIG[mandat.statut]
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#fff', zIndex: 201, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E5E1DA',
          background: cfg.fond, position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: cfg.couleur }}>{cfg.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: cfg.couleur }}>
                  {cfg.label.toUpperCase()}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
                {mandat.mandant_nom} {mandat.mandant_prenom}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78716C' }}>
                {mandat.mandant_adresse} · {mandat.mandant_commune}
              </p>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Infos */}
          <div style={{ background: '#F8F7F4', borderRadius: 10, padding: 16, fontSize: 13 }}>
            <InfoRow label="N° dossier" value={mandat.numero_dossier ?? '—'} />
            <InfoRow label="Créé le" value={formatDate(mandat.created_at)} />
            {mandat.signe_le && <InfoRow label="Signé le" value={formatDate(mandat.signe_le)} />}
            {mandat.pdf_generated_at && <InfoRow label="PDF généré" value={formatDate(mandat.pdf_generated_at)} />}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onGenerer} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px', border: 'none', borderRadius: 8,
              background: '#0F6E56', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>
              <Download size={16} /> Générer / Imprimer le PDF CERFA
            </button>

            {mandat.statut !== 'signe' && mandat.statut !== 'annule' && (
              <>
                {/* Yousign */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', display: 'block', marginBottom: 6 }}>
                    Lien Yousign (optionnel)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={yousignInput} onChange={e => setYousignInput(e.target.value)}
                      placeholder="https://app.yousign.com/..."
                      style={{ flex: 1, padding: '9px 12px', border: '1px solid #E5E1DA',
                        borderRadius: 8, fontSize: 12, outline: 'none' }} />
                    <button onClick={onYousign} style={{
                      padding: '9px 14px', border: 'none', borderRadius: 8,
                      background: '#0369A1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <Link size={13} />
                    </button>
                  </div>
                  {mandat.yousign_url && (
                    <a href={mandat.yousign_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#0369A1', display: 'block', marginTop: 6 }}>
                      Ouvrir le lien Yousign →
                    </a>
                  )}
                </div>

                <button onClick={onSigne} style={{
                  padding: '10px', border: '1px solid #6EE7B7', borderRadius: 8,
                  background: '#ECFDF5', color: '#065F46', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  ✓ Marquer comme signé
                </button>

                <button onClick={onAnnuler} style={{
                  padding: '10px', border: '1px solid #FECACA', borderRadius: 8,
                  background: '#FEF2F2', color: '#B91C1C', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                }}>
                  Annuler ce mandat
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Micro-composants ──────────────────────────────────────────────────────────

function ChampTexte({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 5 }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          padding: '9px 12px', fontSize: 13, fontFamily: 'inherit',
          border: '1px solid #E5E1DA', borderRadius: 8,
          background: '#fff', color: '#1F2937', outline: 'none'
        }} />
    </div>
  )
}

function CaseACocher({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      cursor: 'pointer', fontSize: 12, color: '#1F2937', marginBottom: 8,
      padding: '8px 10px', borderRadius: 6,
      background: checked ? '#ECFDF5' : '#F8F7F4',
      border: `1px solid ${checked ? '#6EE7B7' : '#E5E1DA'}`
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: '#0F6E56' }} />
      {label}
    </label>
  )
}

function SectionTitre({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, fontWeight: 700, color: '#78716C',
      letterSpacing: '0.05em', marginBottom: 10
    }}>
      {icon} {label.toUpperCase()}
    </div>
  )
}

function BtnCivilite({ label, selected, onClick }: {
  key?: string; label: string; selected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
      border: `2px solid ${selected ? '#0F6E56' : '#E5E1DA'}`,
      background: selected ? '#ECFDF5' : '#fff',
      color: selected ? '#0F6E56' : '#78716C', cursor: 'pointer'
    }}>
      {label}
    </button>
  )
}

function BtnAction({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, border: '1px solid #E5E1DA', borderRadius: 6,
      background: '#fff', cursor: 'pointer',
      color: danger ? '#B91C1C' : '#78716C'
    }}>
      {children}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '6px 0', borderBottom: '1px solid #E5E1DA', fontSize: 12
    }}>
      <span style={{ color: '#78716C' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#1F2937' }}>{value}</span>
    </div>
  )
}