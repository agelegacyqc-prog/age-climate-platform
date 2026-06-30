// GED.tsx — Gestion Électronique de Documents
// Module P2-08 — Vue liste + arborescence + versioning

import React, { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import {
  Upload, Search, FolderOpen, List, ChevronDown, ChevronRight,
  Download, Trash2, Eye, Plus, FileText, Clock, CheckCircle,
  AlertTriangle, History, X, RotateCcw
} from "lucide-react"

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_FICHIER_CONFIG: Record<string, { label: string; couleur: string; fond: string; icon: string }> = {
  pdf:   { label: "PDF",  couleur: "#991B1B", fond: "#FEF2F2", icon: "ti-file-type-pdf" },
  csv:   { label: "CSV",  couleur: "#065F46", fond: "#ECFDF5", icon: "ti-file-type-csv" },
  xlsx:  { label: "XLSX", couleur: "#1E40AF", fond: "#EFF6FF", icon: "ti-file-spreadsheet" },
  autre: { label: "Autre",couleur: "#5B21B6", fond: "#F5F3FF", icon: "ti-file" },
}

const CATEGORIE_CONFIG: Record<string, { label: string; couleur: string; fond: string; icone: string }> = {
  contrat:        { label: "Contrat",        couleur: "#92400E", fond: "#FFFBEB", icone: "ti-file-certificate" },
  mandat:         { label: "Mandat",         couleur: "#1E40AF", fond: "#EFF6FF", icone: "ti-writing" },
  rapport:        { label: "Rapport",        couleur: "#065F46", fond: "#ECFDF5", icone: "ti-file-analytics" },
  donnees:        { label: "Données",        couleur: "#5B21B6", fond: "#F5F3FF", icone: "ti-database" },
  facture:        { label: "Facture",        couleur: "#B25C2A", fond: "#FDF0E8", icone: "ti-receipt" },
  photo:          { label: "Photo",          couleur: "#0369A1", fond: "#EFF6FF", icone: "ti-photo" },
  diagnostic:     { label: "Diagnostic",     couleur: "#0F6E56", fond: "#ECFDF5", icone: "ti-stethoscope" },
  plan_action:    { label: "Plan d'action",  couleur: "#7C3AED", fond: "#F5F3FF", icone: "ti-list-check" },
  correspondance: { label: "Correspondance", couleur: "#475569", fond: "#F1F5F9", icone: "ti-mail" },
  autre:          { label: "Autre",          couleur: "#64748B", fond: "#F1F5F9", icone: "ti-file" },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string
  nom: string
  nom_fichier: string
  type_fichier: string
  categorie: string
  taille_octets: number
  url: string
  storage_path: string
  consultant_id: string
  client_id: string | null
  actif_id: string | null
  bien_id: string | null
  created_at: string
  version: number
  document_parent_id: string | null
  est_version_courante: boolean
  region_code: string | null
  note: string | null
  actif?: { nom: string; adresse: string } | null
}

interface Actif {
  id: string
  nom: string
  adresse: string
}

type VueType = 'liste' | 'arborescence'

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formatTaille(octets: number): string {
  if (!octets) return "—"
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
}

function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function detectType(fichier: File): string {
  if (fichier.type === "application/pdf") return "pdf"
  if (fichier.type === "text/csv") return "csv"
  if (fichier.type.includes("spreadsheetml") || fichier.name.endsWith(".xlsx")) return "xlsx"
  return "autre"
}

function sanitizeFilename(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function GED() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [actifs, setActifs] = useState<Actif[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userId, setUserId] = useState("")
  const [userRegion, setUserRegion] = useState("")
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Vue
  const [vue, setVue] = useState<VueType>('liste')

  // Filtres
  const [recherche, setRecherche] = useState("")
  const [filtreCategorie, setFiltreCategorie] = useState("tous")
  const [filtreType, setFiltreType] = useState("tous")
  const [filtreActif, setFiltreActif] = useState("tous")
  const [afficherVersions, setAfficherVersions] = useState(false)

  // Upload
  const [uploadFichier, setUploadFichier] = useState<File | null>(null)
  const [uploadCategorie, setUploadCategorie] = useState("rapport")
  const [uploadActifId, setUploadActifId] = useState("")
  const [uploadNote, setUploadNote] = useState("")
  const [uploadParentId, setUploadParentId] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)

  // Historique versions
  const [versionsDoc, setVersionsDoc] = useState<Document | null>(null)
  const [versions, setVersions] = useState<Document[]>([])

  // Arborescence
  const [dossiersOuverts, setDossiersOuverts] = useState<Set<string>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profil } = await supabase.from("profils").select("role, region").eq("id", user.id).maybeSingle()
    if (profil) { setUserRole(profil.role); setUserRegion(profil.region ?? "") }
    await Promise.all([loadDocuments(), loadActifs()])
    setLoading(false)
  }

  async function loadDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*, actif:actif_id(nom, adresse)")
      .order("created_at", { ascending: false })
    setDocuments(data ?? [])
  }

  async function loadActifs() {
    const { data } = await supabase.from("actifs").select("id, nom, adresse").order("nom")
    setActifs(data ?? [])
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) { setUploadFichier(f); setShowUploadForm(true) }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setUploadFichier(f); setShowUploadForm(true) }
  }

  async function handleUpload() {
    if (!uploadFichier) return
    setUploading(true)
    try {
      const { data: profil } = await supabase.from("profils").select("region").eq("id", userId).maybeSingle()
      const nomSanitize = sanitizeFilename(uploadFichier.name)
      const path = `ged/${userId}/${uploadActifId || "general"}/${Date.now()}_${nomSanitize}`

      const { error: storageError } = await supabase.storage
        .from("documents-clients")
        .upload(path, uploadFichier)
      if (storageError) throw storageError

      // Calculer numéro de version si nouvelle version d'un doc existant
      let version = 1
      if (uploadParentId) {
        const { data: parent } = await supabase.from("documents")
          .select("version").eq("id", uploadParentId).maybeSingle()
        version = (parent?.version ?? 1) + 1
        // Marquer ancienne version comme non courante
        await supabase.from("documents")
          .update({ est_version_courante: false })
          .eq("id", uploadParentId)
        // Marquer toutes les versions précédentes
        await supabase.from("documents")
          .update({ est_version_courante: false })
          .eq("document_parent_id", uploadParentId)
      }

      await supabase.from("documents").insert({
        nom: uploadFichier.name,
        nom_fichier: nomSanitize,
        type_fichier: detectType(uploadFichier),
        categorie: uploadCategorie,
        taille_octets: uploadFichier.size,
        url: path,
        storage_path: path,
        consultant_id: userId,
        actif_id: uploadActifId || null,
        version,
        document_parent_id: uploadParentId,
        est_version_courante: true,
        region_code: profil?.region ?? null,
        note: uploadNote.trim() || null,
      })

      showToast('ok', uploadParentId ? `Version ${version} enregistrée` : 'Document enregistré')
      resetUpload()
      await loadDocuments()
    } catch (err: any) {
      showToast('err', err.message ?? 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  function resetUpload() {
    setUploadFichier(null); setUploadActifId(""); setUploadNote("")
    setUploadCategorie("rapport"); setUploadParentId(null); setShowUploadForm(false)
  }

  // ── Téléchargement ──────────────────────────────────────────────────────────

  async function telecharger(doc: Document) {
    const { data } = await supabase.storage
      .from("documents-clients")
      .createSignedUrl(doc.storage_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  // ── Suppression ─────────────────────────────────────────────────────────────

  async function handleDelete(doc: Document) {
    if (!confirm(`Supprimer "${doc.nom}" (v${doc.version}) ?`)) return
    if (doc.storage_path) {
      await supabase.storage.from("documents-clients").remove([doc.storage_path])
    }
    await supabase.from("documents").delete().eq("id", doc.id)

    // Si c'était la version courante, remettre la précédente comme courante
    if (doc.est_version_courante && doc.document_parent_id) {
      await supabase.from("documents")
        .update({ est_version_courante: true })
        .eq("id", doc.document_parent_id)
    }
    showToast('ok', 'Document supprimé')
    await loadDocuments()
    if (versionsDoc?.id === doc.id) setVersionsDoc(null)
  }

  // ── Historique versions ─────────────────────────────────────────────────────

  async function voirVersions(doc: Document) {
    setVersionsDoc(doc)
    // Trouver le document racine
    const rootId = doc.document_parent_id ?? doc.id
    const { data } = await supabase.from("documents")
      .select("*")
      .or(`id.eq.${rootId},document_parent_id.eq.${rootId}`)
      .order("version", { ascending: false })
    setVersions(data ?? [])
  }

  // ── Filtres ─────────────────────────────────────────────────────────────────

  const documentsFiltres = documents.filter(d => {
    if (!afficherVersions && !d.est_version_courante) return false
    if (filtreCategorie !== "tous" && d.categorie !== filtreCategorie) return false
    if (filtreType !== "tous" && d.type_fichier !== filtreType) return false
    if (filtreActif !== "tous" && d.actif_id !== filtreActif) return false
    if (recherche && !d.nom?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  // ── Arborescence par actif ──────────────────────────────────────────────────

  const parActif: Record<string, Document[]> = {}
  documentsFiltres.forEach(d => {
    const key = d.actif_id ?? "general"
    if (!parActif[key]) parActif[key] = []
    parActif[key].push(d)
  })

  function toggleDossier(key: string) {
    setDossiersOuverts(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1000,
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 18px", borderRadius: 10,
          background: toast.type === "ok" ? "#ECFDF5" : "#FEF2F2",
          border: `1px solid ${toast.type === "ok" ? "#6EE7B7" : "#FECACA"}`,
          color: toast.type === "ok" ? "#065F46" : "#991B1B",
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.10)"
        }}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1F2937", margin: 0 }}>Documents</h1>
          <p style={{ fontSize: 13, color: "#78716C", marginTop: 4 }}>
            <span style={{ fontWeight: 600, color: "#1F2937" }}>{documentsFiltres.length}</span> document{documentsFiltres.length > 1 ? "s" : ""}
            {!afficherVersions && documents.filter(d => !d.est_version_courante).length > 0 && (
              <span style={{ marginLeft: 8, color: "#78716C" }}>
                · {documents.filter(d => !d.est_version_courante).length} version{documents.filter(d => !d.est_version_courante).length > 1 ? "s" : ""} archivée{documents.filter(d => !d.est_version_courante).length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Toggle vue */}
          <div style={{ display: "flex", border: "1px solid #E5E1DA", borderRadius: 8, overflow: "hidden" }}>
            {([
              { key: "liste" as VueType, icon: <List size={15} />, label: "Liste" },
              { key: "arborescence" as VueType, icon: <FolderOpen size={15} />, label: "Dossiers" },
            ]).map(v => (
              <button key={v.key} onClick={() => setVue(v.key)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 12px", border: "none", cursor: "pointer",
                background: vue === v.key ? "#0F6E56" : "#fff",
                color: vue === v.key ? "#fff" : "#78716C",
                fontSize: 12, fontWeight: 500
              }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowUploadForm(!showUploadForm); setUploadParentId(null) }} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#0F6E56", color: "white", border: "none",
            padding: "8px 16px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}>
            <Plus size={15} /> Nouveau document
          </button>
        </div>
      </div>

      {/* Zone Upload */}
      {showUploadForm && (
        <div style={{
          background: "#fff", border: "1px solid #E5E1DA", borderRadius: 12, padding: 20,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#78716C", letterSpacing: "0.05em" }}>
              {uploadParentId ? "NOUVELLE VERSION" : "NOUVEAU DOCUMENT"}
            </p>
            <button onClick={resetUpload} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#78716C" }}>
              <X size={18} />
            </button>
          </div>

          {uploadParentId && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, marginBottom: 14,
              fontSize: 12, color: "#1E40AF"
            }}>
              <RotateCcw size={13} />
              Nouvelle version de : <strong>{documents.find(d => d.id === uploadParentId)?.nom}</strong>
              <button onClick={() => setUploadParentId(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "#1E40AF" }}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* Zone drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#0F6E56" : uploadFichier ? "#6EE7B7" : "#E5E1DA"}`,
              borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer",
              background: dragOver ? "#ECFDF5" : uploadFichier ? "#F0FDF4" : "#F8F7F4",
              marginBottom: 16, transition: "all 0.15s"
            }}>
            <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx"
              onChange={handleFileInput} style={{ display: "none" }} />
            {uploadFichier ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <CheckCircle size={22} color="#0F6E56" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{uploadFichier.name}</div>
                  <div style={{ fontSize: 11, color: "#78716C" }}>{formatTaille(uploadFichier.size)}</div>
                </div>
              </div>
            ) : (
              <div>
                <Upload size={28} color="#9CA3AF" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: "#78716C" }}>
                  Glissez un fichier ici ou cliquez pour parcourir
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>PDF, CSV, XLSX — 10 Mo max</div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Catégorie */}
            <div>
              <label style={labelStyle}>Catégorie *</label>
              <select value={uploadCategorie} onChange={e => setUploadCategorie(e.target.value)} style={selectStyle}>
                {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {/* Actif */}
            <div>
              <label style={labelStyle}>Actif associé</label>
              <select value={uploadActifId} onChange={e => setUploadActifId(e.target.value)} style={selectStyle}>
                <option value="">— Aucun —</option>
                {actifs.map(a => <option key={a.id} value={a.id}>{a.nom || a.adresse}</option>)}
              </select>
            </div>
            {/* Note */}
            <div>
              <label style={labelStyle}>Note (optionnel)</label>
              <input value={uploadNote} onChange={e => setUploadNote(e.target.value)}
                placeholder="Ex : version signée client"
                style={{ ...selectStyle, background: "#fff" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={resetUpload} style={{
              padding: "8px 16px", border: "1px solid #E5E1DA", borderRadius: 8,
              background: "#fff", color: "#78716C", fontSize: 13, cursor: "pointer"
            }}>
              Annuler
            </button>
            <button onClick={handleUpload} disabled={!uploadFichier || uploading} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", border: "none", borderRadius: 8,
              background: uploadFichier && !uploading ? "#0F6E56" : "#9CA3AF",
              color: "white", fontSize: 13, fontWeight: 600,
              cursor: uploadFichier && !uploading ? "pointer" : "not-allowed"
            }}>
              <Upload size={14} />
              {uploading ? "Envoi…" : uploadParentId ? "Enregistrer la version" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{
        background: "#fff", border: "1px solid #E5E1DA", borderRadius: 12, padding: "14px 20px",
        display: "flex", gap: 12, flexWrap: "wrap" as const, alignItems: "center"
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input type="text" placeholder="Rechercher un document…"
            value={recherche} onChange={e => setRecherche(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #E5E1DA", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
        </div>
        <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)} style={selectStyle}>
          <option value="tous">Toutes catégories</option>
          {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={selectStyle}>
          <option value="tous">Tous types</option>
          {Object.entries(TYPE_FICHIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtreActif} onChange={e => setFiltreActif(e.target.value)} style={selectStyle}>
          <option value="tous">Tous les actifs</option>
          {actifs.map(a => <option key={a.id} value={a.id}>{a.nom || a.adresse}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#78716C", cursor: "pointer", whiteSpace: "nowrap" as const }}>
          <input type="checkbox" checked={afficherVersions} onChange={e => setAfficherVersions(e.target.checked)}
            style={{ accentColor: "#0F6E56" }} />
          Afficher les versions archivées
        </label>
      </div>

      {/* Vue Liste */}
      {vue === "liste" && (
        <div style={{ background: "#fff", border: "1px solid #E5E1DA", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
            <thead>
              <tr style={{ background: "#F8F7F4", borderBottom: "1px solid #E5E1DA" }}>
                {["Nom", "Type", "Catégorie", "Actif", "Version", "Taille", "Date", "Note", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "10px 16px", textAlign: "left" as const,
                    fontSize: 10, fontWeight: 700, color: "#78716C",
                    letterSpacing: "0.06em", textTransform: "uppercase" as const
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documentsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: "center" as const, color: "#78716C" }}>
                    <FileText size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <p style={{ margin: 0 }}>Aucun document trouvé</p>
                  </td>
                </tr>
              ) : (
                documentsFiltres.map(doc => {
                  const type = TYPE_FICHIER_CONFIG[doc.type_fichier] ?? TYPE_FICHIER_CONFIG.autre
                  const cat = CATEGORIE_CONFIG[doc.categorie] ?? CATEGORIE_CONFIG.autre
                  return (
                    <tr key={doc.id}
                      style={{ borderBottom: "1px solid #F1F5F9", opacity: doc.est_version_courante ? 1 : 0.6 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                      onMouseLeave={e => (e.currentTarget.style.background = "white")}>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <i className={`ti ${type.icon}`} style={{ fontSize: 16, color: type.couleur, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>
                            {doc.nom || doc.nom_fichier || "—"}
                          </span>
                          {!doc.est_version_courante && (
                            <span style={{
                              fontSize: 9, padding: "1px 6px", borderRadius: 4,
                              background: "#F1F5F9", color: "#78716C", fontWeight: 600
                            }}>ARCHIVÉ</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: type.fond, color: type.couleur,
                          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600
                        }}>
                          {type.label}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: cat.fond, color: cat.couleur,
                          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                          display: "flex", alignItems: "center", gap: 4, width: "fit-content"
                        }}>
                          <i className={`ti ${cat.icone}`} style={{ fontSize: 11 }} />
                          {cat.label}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#78716C" }}>
                        {(doc.actif as any)?.nom || (doc.actif as any)?.adresse || "—"}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
                          padding: "2px 8px", borderRadius: 4,
                          background: doc.est_version_courante ? "#ECFDF5" : "#F1F5F9",
                          color: doc.est_version_courante ? "#0F6E56" : "#78716C"
                        }}>
                          v{doc.version ?? 1}
                          {doc.est_version_courante && " ✓"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono, monospace" }}>
                        {formatTaille(doc.taille_octets)}
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#78716C", whiteSpace: "nowrap" as const }}>
                        {doc.created_at ? formatDateCourte(doc.created_at) : "—"}
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#78716C", fontStyle: "italic" as const, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {doc.note ?? "—"}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <BtnIcone onClick={() => telecharger(doc)} title="Télécharger">
                            <Download size={13} />
                          </BtnIcone>
                          {doc.est_version_courante && (
                            <BtnIcone
                              onClick={() => {
                                setUploadParentId(doc.id)
                                setUploadCategorie(doc.categorie)
                                setUploadActifId(doc.actif_id ?? "")
                                setShowUploadForm(true)
                              }}
                              title="Nouvelle version">
                              <History size={13} />
                            </BtnIcone>
                          )}
                          <BtnIcone onClick={() => voirVersions(doc)} title="Versions">
                            <Eye size={13} />
                          </BtnIcone>
                          {(userRole === "admin" || userRole === "admin_national" || doc.consultant_id === userId) && (
                            <BtnIcone onClick={() => handleDelete(doc)} title="Supprimer" danger>
                              <Trash2 size={13} />
                            </BtnIcone>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Vue Arborescence */}
      {vue === "arborescence" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(parActif).map(([actifKey, docs]) => {
            const actif = actifs.find(a => a.id === actifKey)
            const label = actif ? (actif.nom || actif.adresse) : "Documents généraux"
            const ouvert = dossiersOuverts.has(actifKey)
            return (
              <div key={actifKey} style={{
                background: "#fff", border: "1px solid #E5E1DA", borderRadius: 12,
                overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                {/* En-tête dossier */}
                <div
                  onClick={() => toggleDossier(actifKey)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "14px 20px", cursor: "pointer",
                    background: ouvert ? "#F0FDF4" : "#F8F7F4",
                    borderBottom: ouvert ? "1px solid #E5E1DA" : "none",
                    transition: "background 0.15s"
                  }}>
                  {ouvert ? <ChevronDown size={16} color="#0F6E56" /> : <ChevronRight size={16} color="#78716C" />}
                  <FolderOpen size={18} color={ouvert ? "#0F6E56" : "#78716C"} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: ouvert ? "#0F6E56" : "#1F2937", flex: 1 }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                    background: ouvert ? "#0F6E56" : "#E5E1DA",
                    color: ouvert ? "#fff" : "#78716C"
                  }}>
                    {docs.length} doc{docs.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Contenu dossier */}
                {ouvert && (
                  <div>
                    {/* Groupe par catégorie */}
                    {Object.entries(CATEGORIE_CONFIG).map(([catKey, catCfg]) => {
                      const docsCateg = docs.filter(d => d.categorie === catKey)
                      if (docsCateg.length === 0) return null
                      return (
                        <div key={catKey} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <div style={{
                            padding: "8px 20px 6px 20px",
                            display: "flex", alignItems: "center", gap: 6,
                            background: "#FAFAFA"
                          }}>
                            <i className={`ti ${catCfg.icone}`} style={{ fontSize: 12, color: catCfg.couleur }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: catCfg.couleur, letterSpacing: "0.05em" }}>
                              {catCfg.label.toUpperCase()} ({docsCateg.length})
                            </span>
                          </div>
                          {docsCateg.map(doc => {
                            const type = TYPE_FICHIER_CONFIG[doc.type_fichier] ?? TYPE_FICHIER_CONFIG.autre
                            return (
                              <div key={doc.id} style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 20px 10px 36px",
                                borderBottom: "1px solid #F8F7F4"
                              }}>
                                <i className={`ti ${type.icon}`} style={{ fontSize: 15, color: type.couleur, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                                    {doc.nom}
                                  </p>
                                  <p style={{ margin: 0, fontSize: 11, color: "#78716C" }}>
                                    {formatDateCourte(doc.created_at)} · {formatTaille(doc.taille_octets)}
                                    {doc.note && ` · ${doc.note}`}
                                  </p>
                                </div>
                                <span style={{
                                  fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700,
                                  padding: "1px 6px", borderRadius: 4,
                                  background: doc.est_version_courante ? "#ECFDF5" : "#F1F5F9",
                                  color: doc.est_version_courante ? "#0F6E56" : "#78716C",
                                  flexShrink: 0
                                }}>
                                  v{doc.version ?? 1}
                                </span>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                  <BtnIcone onClick={() => telecharger(doc)} title="Télécharger">
                                    <Download size={13} />
                                  </BtnIcone>
                                  <BtnIcone onClick={() => voirVersions(doc)} title="Versions">
                                    <Eye size={13} />
                                  </BtnIcone>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {Object.keys(parActif).length === 0 && (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              border: "2px dashed #E5E1DA", borderRadius: 12, color: "#78716C"
            }}>
              <FolderOpen size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontWeight: 500 }}>Aucun document</p>
            </div>
          )}
        </div>
      )}

      {/* Drawer historique versions */}
      {versionsDoc && (
        <>
          <div onClick={() => setVersionsDoc(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200
          }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
            background: "#fff", zIndex: 201, overflowY: "auto",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)"
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #E5E1DA",
              position: "sticky", top: 0, background: "#fff", zIndex: 10
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1F2937" }}>
                    Historique des versions
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#78716C" }}>
                    {versionsDoc.nom}
                  </p>
                </div>
                <button onClick={() => setVersionsDoc(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#78716C" }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {versions.length === 0 ? (
                <p style={{ fontSize: 13, color: "#78716C" }}>Une seule version disponible.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {versions.map((v, i) => (
                    <div key={v.id} style={{
                      padding: "14px 16px", borderRadius: 10,
                      border: `1px solid ${v.est_version_courante ? "#6EE7B7" : "#E5E1DA"}`,
                      background: v.est_version_courante ? "#F0FDF4" : "#F8F7F4"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700,
                          color: v.est_version_courante ? "#0F6E56" : "#78716C"
                        }}>
                          v{v.version ?? 1}
                        </span>
                        {v.est_version_courante && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: "#0F6E56", color: "#fff"
                          }}>
                            ACTUELLE
                          </span>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "#78716C" }}>
                          {formatDate(v.created_at)}
                        </span>
                      </div>
                      {v.note && (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#78716C", fontStyle: "italic" }}>
                          {v.note}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => telecharger(v)} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "5px 10px", border: "1px solid #E5E1DA", borderRadius: 6,
                          background: "#fff", fontSize: 11, color: "#78716C", cursor: "pointer"
                        }}>
                          <Download size={12} /> Télécharger
                        </button>
                        {(userRole === "admin" || userRole === "admin_national" || v.consultant_id === userId) && !v.est_version_courante && (
                          <button onClick={() => handleDelete(v)} style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "5px 10px", border: "1px solid #FECACA", borderRadius: 6,
                            background: "#FEF2F2", fontSize: 11, color: "#B91C1C", cursor: "pointer"
                          }}>
                            <Trash2 size={12} /> Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Micro-composants ──────────────────────────────────────────────────────────

function BtnIcone({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, border: "1px solid #E5E1DA", borderRadius: 6,
      background: "#fff", cursor: "pointer",
      color: danger ? "#B91C1C" : "#78716C"
    }}>
      {children}
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#78716C",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 6
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #E5E1DA",
  borderRadius: 8, fontSize: 13, color: "#1F2937",
  fontFamily: "inherit", outline: "none", background: "#F8F7F4",
  cursor: "pointer", boxSizing: "border-box" as const
}