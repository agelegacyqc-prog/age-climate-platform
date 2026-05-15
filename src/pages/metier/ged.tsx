import React, { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"

const TYPE_FICHIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pdf:   { label: "PDF",  color: "#991B1B", bg: "#FEF2F2", icon: "ti-file-type-pdf" },
  csv:   { label: "CSV",  color: "#065F46", bg: "#ECFDF5", icon: "ti-file-type-csv" },
  xlsx:  { label: "XLSX", color: "#1E40AF", bg: "#EFF6FF", icon: "ti-file-spreadsheet" },
  autre: { label: "Autre",color: "#5B21B6", bg: "#F5F3FF", icon: "ti-file" },
}

const CATEGORIE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  contrat:  { label: "Contrat",  color: "#92400E", bg: "#FFFBEB" },
  mandat:   { label: "Mandat",   color: "#1E40AF", bg: "#EFF6FF" },
  rapport:  { label: "Rapport",  color: "#065F46", bg: "#ECFDF5" },
  donnees:  { label: "Données",  color: "#5B21B6", bg: "#F5F3FF" },
  autre:    { label: "Autre",    color: "#64748B", bg: "#F1F5F9" },
}

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
  client_id: string
  actif_id: string
  created_at: string
  actif?: { nom: string; adresse: string }
}

interface Actif {
  id: string
  nom: string
  adresse: string
}

interface ProfilClient {
  id: string
  type_client: string
}

function formatTaille(octets: number): string {
  if (!octets) return "—"
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  })
}

function detectType(fichier: File): string {
  if (fichier.type === "application/pdf") return "pdf"
  if (fichier.type === "text/csv") return "csv"
  if (fichier.type.includes("spreadsheetml") || fichier.name.endsWith(".xlsx")) return "xlsx"
  return "autre"
}

export default function GED() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [actifs, setActifs] = useState<Actif[]>([])
  const [clients, setClients] = useState<ProfilClient[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  const [userId, setUserId] = useState<string>("")

  const [recherche, setRecherche] = useState("")
  const [filtreCategorie, setFiltreCategorie] = useState("tous")
  const [filtreType, setFiltreType] = useState("tous")
  const [filtreActif, setFiltreActif] = useState("tous")

  const [uploadFichier, setUploadFichier] = useState<File | null>(null)
  const [uploadCategorie, setUploadCategorie] = useState("contrat")
  const [uploadActifId, setUploadActifId] = useState("")
  const [uploadClientId, setUploadClientId] = useState("")
  const [showUploadForm, setShowUploadForm] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profil } = await supabase
      .from("profils")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profil) setUserRole(profil.role)
    await Promise.all([loadDocuments(), loadActifs(), loadClients()])
    setLoading(false)
  }

  async function loadDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*, actif:actif_id(nom, adresse)")
      .order("created_at", { ascending: false })
    setDocuments(data || [])
  }

  async function loadActifs() {
    const { data } = await supabase
      .from("actifs")
      .select("id, nom, adresse")
      .order("nom")
    setActifs(data || [])
  }

  async function loadClients() {
    const { data } = await supabase
      .from("profils_client")
      .select("id, type_client")
    setClients(data || [])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const fichier = e.dataTransfer.files[0]
    if (fichier) { setUploadFichier(fichier); setShowUploadForm(true) }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (fichier) { setUploadFichier(fichier); setShowUploadForm(true) }
  }

  async function handleUpload() {
    if (!uploadFichier) return
    setUploading(true)
    try {
      const path = `${userId}/${uploadActifId || "general"}/${Date.now()}_${uploadFichier.name}`
      const { error: storageError } = await supabase.storage
        .from("documents-clients")
        .upload(path, uploadFichier)
      if (storageError) throw storageError
      const { data: urlData } = supabase.storage
        .from("documents-clients")
        .getPublicUrl(path)
      await supabase.from("documents").insert({
        nom: uploadFichier.name,
        nom_fichier: uploadFichier.name,
        type_fichier: detectType(uploadFichier),
        categorie: uploadCategorie,
        taille_octets: uploadFichier.size,
        url: urlData.publicUrl,
        storage_path: path,
        consultant_id: userId,
        actif_id: uploadActifId || null,
        client_id: uploadClientId || null,
      })
      await loadDocuments()
      setUploadFichier(null)
      setUploadActifId("")
      setUploadClientId("")
      setUploadCategorie("contrat")
      setShowUploadForm(false)
    } catch (err) {
      console.error("Erreur upload:", err)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Supprimer "${doc.nom}" ?`)) return
    if (doc.storage_path) {
      await supabase.storage.from("documents-clients").remove([doc.storage_path])
    }
    await supabase.from("documents").delete().eq("id", doc.id)
    await loadDocuments()
  }

  const documentsFiltres = documents.filter(d => {
    if (filtreCategorie !== "tous" && d.categorie !== filtreCategorie) return false
    if (filtreType !== "tous" && d.type_fichier !== filtreType) return false
    if (filtreActif !== "tous" && d.actif_id !== filtreActif) return false
    if (recherche && !d.nom?.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1px solid #E2E8F0",
    borderRadius: "7px",
    fontSize: "13px",
    color: "#0F172A",
    fontFamily: "inherit",
    outline: "none",
    background: "#F8FAFC",
    cursor: "pointer",
  }

  if (loading) return (
    <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{documentsFiltres.length}</span>
          {" "}document{documentsFiltres.length > 1 ? "s" : ""}
          {documentsFiltres.length !== documents.length && <span> sur {documents.length}</span>}
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "#0F6E56", color: "white", border: "none",
            padding: "8px 16px", borderRadius: "7px",
            fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouveau document
        </button>
      </div>

      {/* Zone Upload */}
      {showUploadForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" }}>
            Ajouter un document
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#0F6E56" : uploadFichier ? "#A7F3D0" : "#E2E8F0"}`,
              borderRadius: "8px", padding: "28px", textAlign: "center", cursor: "pointer",
              background: dragOver ? "#ECFDF5" : uploadFichier ? "#F0FDF4" : "#F8FAFC",
              transition: "all 0.15s", marginBottom: "16px",
            }}>
            <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx" onChange={handleFileInput} style={{ display: "none" }} />
            {uploadFichier ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <i className="ti ti-file-check" style={{ fontSize: "22px", color: "#0F6E56" }} aria-hidden="true" />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{uploadFichier.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>{formatTaille(uploadFichier.size)}</div>
                </div>
              </div>
            ) : (
              <div>
                <i className="ti ti-cloud-upload" style={{ fontSize: "28px", color: "#94A3B8", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#64748B" }}>Glissez un fichier ici ou cliquez pour parcourir</div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>PDF, CSV, XLSX — 10 Mo maximum</div>
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>Catégorie *</label>
              <select value={uploadCategorie} onChange={e => setUploadCategorie(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>Actif associé</label>
              <select value={uploadActifId} onChange={e => setUploadActifId(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                <option value="">— Aucun —</option>
                {actifs.map(a => <option key={a.id} value={a.id}>{a.nom || a.adresse}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>Client associé</label>
              <select value={uploadClientId} onChange={e => setUploadClientId(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                <option value="">— Aucun —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.type_client} — {c.id.slice(0, 8)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              onClick={() => { setShowUploadForm(false); setUploadFichier(null) }}
              style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#64748B", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFichier || uploading}
              style={{
                padding: "8px 16px", borderRadius: "7px", border: "none",
                background: uploadFichier && !uploading ? "#0F6E56" : "#94A3B8",
                color: "white", fontSize: "13px", fontWeight: 500,
                cursor: uploadFichier && !uploading ? "pointer" : "not-allowed",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px",
              }}>
              {uploading
                ? <><i className="ti ti-loader-2" style={{ fontSize: "14px" }} />Envoi…</>
                : <><i className="ti ti-upload" style={{ fontSize: "14px" }} />Enregistrer</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
            <input
              type="text" placeholder="Rechercher un document…"
              value={recherche} onChange={e => setRecherche(e.target.value)}
              style={{ width: "100%", padding: "7px 12px 7px 32px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", color: "#0F172A", fontFamily: "inherit", outline: "none", background: "#F8FAFC" }}
            />
          </div>
          <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)} style={inputStyle}>
            <option value="tous">Toutes catégories</option>
            {Object.entries(CATEGORIE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={inputStyle}>
            <option value="tous">Tous types</option>
            {Object.entries(TYPE_FICHIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtreActif} onChange={e => setFiltreActif(e.target.value)} style={inputStyle}>
            <option value="tous">Tous les actifs</option>
            {actifs.map(a => <option key={a.id} value={a.id}>{a.nom || a.adresse}</option>)}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              {["Nom du fichier", "Type", "Catégorie", "Actif associé", "Taille", "Date", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documentsFiltres.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>
                  <i className="ti ti-file-off" style={{ fontSize: "28px", display: "block", marginBottom: "8px" }} aria-hidden="true" />
                  Aucun document trouvé
                </td>
              </tr>
            ) : (
              documentsFiltres.map(doc => {
                const type = TYPE_FICHIER_CONFIG[doc.type_fichier] || TYPE_FICHIER_CONFIG.autre
                const cat  = CATEGORIE_CONFIG[doc.categorie] || CATEGORIE_CONFIG.autre
                return (
                  <tr key={doc.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <i className={`ti ${type.icon}`} style={{ fontSize: "16px", color: type.color, flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{doc.nom || doc.nom_fichier || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: type.bg, color: type.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{type.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: cat.bg, color: cat.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{cat.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>
                      {(doc.actif as any)?.nom || (doc.actif as any)?.adresse || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#94A3B8", fontFamily: "'DM Mono', monospace" }}>
                      {formatTaille(doc.taille_octets)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#94A3B8" }}>
                      {doc.created_at ? formatDate(doc.created_at) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        
                          <a href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", color: "#0F6E56", border: "1px solid #A7F3D0", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500, textDecoration: "none" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#ECFDF5" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent" }}
                        >
                          <i className="ti ti-download" style={{ fontSize: "13px" }} aria-hidden="true" />
                        </a>
                        {(userRole === "admin" || doc.consultant_id === userId) && (
                          <button
                            onClick={() => handleDelete(doc)}
                            style={{ display: "flex", alignItems: "center", background: "transparent", color: "#991B1B", border: "1px solid #FECACA", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                          >
                            <i className="ti ti-trash" style={{ fontSize: "13px" }} aria-hidden="true" />
                          </button>
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
    </div>
  )
}