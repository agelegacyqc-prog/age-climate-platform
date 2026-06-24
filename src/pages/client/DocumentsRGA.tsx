import React, { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Document {
  id: string
  nom_fichier: string
  categorie: "eligibilite" | "etudes" | "travaux" | "age"
  created_at: string
  statut_doc: "depose" | "lu" | "valide"
  taille_ko: number | null
  storage_path: string
  uploaded_by: string | null
}

type Onglet = "tous" | "eligibilite" | "etudes" | "travaux" | "age"

// ─── Référentiels ─────────────────────────────────────────────────────────────

const CATEGORIE_LABEL: Record<string, string> = {
  eligibilite: "Éligibilité",
  etudes:      "Études",
  travaux:     "Travaux",
  age:         "Documents AGE",
}

const CATEGORIE_ICONE: Record<string, string> = {
  eligibilite: "ti-id-badge",
  etudes:      "ti-search",
  travaux:     "ti-tools",
  age:         "ti-building",
}

const STATUT_DOC: Record<string, { label: string; color: string; bg: string }> = {
  depose: { label: "Déposé",  color: "#78716C", bg: "#F8F7F4" },
  lu:     { label: "Lu",      color: "#0369A1", bg: "#EFF6FF" },
  valide: { label: "Validé",  color: "#1D9E75", bg: "#ECFDF5" },
}

const ONGLETS: { key: Onglet; label: string }[] = [
  { key: "tous",        label: "Tous" },
  { key: "eligibilite", label: "Éligibilité" },
  { key: "etudes",      label: "Études" },
  { key: "travaux",     label: "Travaux" },
  { key: "age",         label: "Documents AGE" },
]

const FORMATS_ACCEPTES = ".pdf,.jpg,.jpeg,.png"
const TAILLE_MAX_KO    = 10 * 1024 // 10 Mo

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatTaille(ko: number | null): string {
  if (!ko) return ""
  if (ko < 1024) return `${ko} Ko`
  return `${(ko / 1024).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function extensionIcone(nom: string): string {
  const ext = nom.split(".").pop()?.toLowerCase()
  if (ext === "pdf")                    return "ti-file-type-pdf"
  if (["jpg", "jpeg", "png"].includes(ext || "")) return "ti-photo"
  return "ti-file"
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DocumentsRGA() {
  const navigate          = useNavigate()
  const { id }            = useParams<{ id: string }>()
  const fileInputRef      = useRef<HTMLInputElement>(null)
  const dropZoneRef       = useRef<HTMLDivElement>(null)

  const [documents, setDocuments]           = useState<Document[]>([])
  const [loading, setLoading]               = useState(true)
  const [onglet, setOnglet]                 = useState<Onglet>("tous")
  const [userId, setUserId]                 = useState<string | null>(null)
  const [nomDossier, setNomDossier]         = useState<string>("")

  // Upload
  const [uploading, setUploading]           = useState(false)
  const [uploadCategorie, setUploadCategorie] = useState<"eligibilite" | "etudes" | "travaux">("eligibilite")
  const [uploadErreur, setUploadErreur]     = useState<string | null>(null)
  const [uploadSucces, setUploadSucces]     = useState<string | null>(null)
  const [dragOver, setDragOver]             = useState(false)

  // Suppression
  const [supprimerConfirm, setSupprimerConfirm] = useState<Document | null>(null)
  const [suppression, setSuppression]           = useState(false)

  useEffect(() => { if (id) init(id) }, [id])

  async function init(dossierId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    // Nom du bien pour l'en-tête
    const { data: dossier } = await supabase
      .from("dossiers_rga")
      .select("actif:actif_id (nom, ville)")
      .eq("id", dossierId)
      .single()

    if (dossier?.actif) {
      const a = dossier.actif as unknown as { nom: string; ville: string }
      setNomDossier(`${a.nom} — ${a.ville}`)
    }

    await chargerDocuments(dossierId)
    setLoading(false)
  }

  async function chargerDocuments(dossierId: string) {
    const { data } = await supabase
      .from("documents_rga")
      .select("id, nom_fichier, categorie, created_at, statut_doc, taille_ko, storage_path, uploaded_by")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: false })

    setDocuments((data || []) as Document[])
  }

  // ─── Upload ──────────────────────────────────────────────────────────────────

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !id || !userId) return
    setUploadErreur(null)
    setUploadSucces(null)
    setUploading(true)

    const errors: string[] = []

    for (const file of Array.from(files)) {
      const tailleKo = Math.round(file.size / 1024)

      if (tailleKo > TAILLE_MAX_KO) {
        errors.push(`${file.name} dépasse 10 Mo.`)
        continue
      }

      const ext          = file.name.split(".").pop()?.toLowerCase()
      const formatsOk    = ["pdf", "jpg", "jpeg", "png"]
      if (!ext || !formatsOk.includes(ext)) {
        errors.push(`${file.name} : format non accepté (PDF, JPG, PNG uniquement).`)
        continue
      }

      const storagePath = `${id}/${uploadCategorie}/${Date.now()}_${file.name}`

      const { error: storageError } = await supabase.storage
        .from("documents-rga")
        .upload(storagePath, file, { upsert: false })

      if (storageError) {
        errors.push(`Erreur upload ${file.name} : ${storageError.message}`)
        continue
      }

      const { error: dbError } = await supabase
        .from("documents_rga")
        .insert({
          dossier_id:   id,
          uploaded_by:  userId,
          categorie:    uploadCategorie,
          nom_fichier:  file.name,
          taille_ko:    tailleKo,
          storage_path: storagePath,
          statut_doc:   "depose",
        })

      if (dbError) {
        errors.push(`Erreur enregistrement ${file.name} : ${dbError.message}`)
      }
    }

    if (errors.length > 0) {
      setUploadErreur(errors.join(" "))
    } else {
      setUploadSucces(`${files.length > 1 ? `${files.length} documents déposés` : "Document déposé"} avec succès.`)
    }

    await chargerDocuments(id)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ─── Téléchargement ──────────────────────────────────────────────────────────

  async function telecharger(doc: Document) {
    const { data } = await supabase.storage
      .from("documents-rga")
      .createSignedUrl(doc.storage_path, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  // ─── Suppression ─────────────────────────────────────────────────────────────

  async function confirmerSuppression() {
    if (!supprimerConfirm || !id) return
    setSuppression(true)

    await supabase.storage
      .from("documents-rga")
      .remove([supprimerConfirm.storage_path])

    await supabase
      .from("documents_rga")
      .delete()
      .eq("id", supprimerConfirm.id)

    setSupprimerConfirm(null)
    setSuppression(false)
    await chargerDocuments(id)
  }

  // ─── Filtrage ─────────────────────────────────────────────────────────────────

  const docsFiltres = onglet === "tous"
    ? documents
    : documents.filter(d => d.categorie === onglet)

  const compteurs: Record<Onglet, number> = {
    tous:        documents.length,
    eligibilite: documents.filter(d => d.categorie === "eligibilite").length,
    etudes:      documents.filter(d => d.categorie === "etudes").length,
    travaux:     documents.filter(d => d.categorie === "travaux").length,
    age:         documents.filter(d => d.categorie === "age").length,
  }

  // ─── Drag & drop ─────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave() { setDragOver(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94A3B8", fontSize: "14px" }}>
      Chargement des documents…
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Retour */}
      <button
        onClick={() => navigate(`/client/dossier-rga/${id}`)}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748B", fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "inherit", width: "fit-content" }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: "15px" }} aria-hidden="true" />
        Retour au dossier
      </button>

      {/* En-tête */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-files" style={{ fontSize: "22px", color: "#B25C2A" }} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0F172A", margin: 0, marginBottom: "3px" }}>Documents du dossier</h2>
            <div style={{ fontSize: "12px", color: "#64748B" }}>{nomDossier}</div>
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#94A3B8" }}>
          {documents.length} document{documents.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Zone d'upload */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "22px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
          Déposer un document
        </div>

        {/* Sélecteur catégorie */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
          {(["eligibilite", "etudes", "travaux"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setUploadCategorie(cat)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                background: uploadCategorie === cat ? "#B25C2A" : "#F8F7F4",
                color:      uploadCategorie === cat ? "white"    : "#44403C",
                border:     uploadCategorie === cat ? "none"     : "1px solid #E5E1DA",
              }}
            >
              <i className={`ti ${CATEGORIE_ICONE[cat]}`} style={{ fontSize: "13px" }} aria-hidden="true" />
              {CATEGORIE_LABEL[cat]}
            </button>
          ))}
        </div>

        {/* Zone glisser-déposer */}
        <div
          ref={dropZoneRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#B25C2A" : "#E5E1DA"}`,
            borderRadius: "10px",
            padding: "32px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "#FFF7ED" : "#F8F7F4",
            transition: "all 0.15s",
            marginBottom: "12px",
          }}
        >
          <i className="ti ti-upload" style={{ fontSize: "28px", color: dragOver ? "#B25C2A" : "#C4BDB6", marginBottom: "10px", display: "block" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#44403C", marginBottom: "4px" }}>
            Glissez vos fichiers ici ou <span style={{ color: "#B25C2A", textDecoration: "underline" }}>parcourir</span>
          </div>
          <div style={{ fontSize: "12px", color: "#94A3B8" }}>PDF, JPG, PNG — 10 Mo maximum par fichier</div>

          <input
            ref={fileInputRef}
            type="file"
            accept={FORMATS_ACCEPTES}
            multiple
            style={{ display: "none" }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Feedback upload */}
        {uploading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0369A1", padding: "10px 14px", background: "#EFF6FF", borderRadius: "8px" }}>
            <i className="ti ti-loader-2" style={{ fontSize: "15px" }} aria-hidden="true" />
            Envoi en cours…
          </div>
        )}
        {uploadSucces && !uploading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#065F46", padding: "10px 14px", background: "#ECFDF5", borderRadius: "8px", border: "1px solid #A7F3D0" }}>
            <i className="ti ti-circle-check" style={{ fontSize: "15px" }} aria-hidden="true" />
            {uploadSucces}
          </div>
        )}
        {uploadErreur && !uploading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#7F1D1D", padding: "10px 14px", background: "#FEF2F2", borderRadius: "8px", border: "1px solid #FECACA" }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />
            {uploadErreur}
          </div>
        )}
      </div>

      {/* Onglets + liste */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", overflow: "hidden" }}>

        {/* Onglets */}
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", overflowX: "auto" }}>
          {ONGLETS.map(o => (
            <button
              key={o.key}
              onClick={() => setOnglet(o.key)}
              style={{
                padding: "13px 18px", fontSize: "13px", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", border: "none", whiteSpace: "nowrap",
                background:    onglet === o.key ? "#FFFFFF" : "#F8F7F4",
                color:         onglet === o.key ? "#B25C2A" : "#64748B",
                borderBottom:  onglet === o.key ? "2px solid #B25C2A" : "2px solid transparent",
                transition:    "all 0.15s",
              }}
            >
              {o.label}
              {compteurs[o.key] > 0 && (
                <span style={{
                  marginLeft: "6px", fontSize: "11px", fontWeight: 600,
                  background: onglet === o.key ? "#FFF7ED" : "#F1F5F9",
                  color:      onglet === o.key ? "#B25C2A" : "#94A3B8",
                  padding: "1px 6px", borderRadius: "10px",
                }}>
                  {compteurs[o.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste documents */}
        <div style={{ padding: "16px" }}>
          {docsFiltres.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px", background: "#F8F7F4", borderRadius: "8px" }}>
              <i className="ti ti-file-off" style={{ fontSize: "20px", color: "#C4BDB6" }} aria-hidden="true" />
              <div style={{ fontSize: "13px", color: "#78716C" }}>
                Aucun document dans cette catégorie.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {docsFiltres.map(doc => {
                const statutStyle = STATUT_DOC[doc.statut_doc] || STATUT_DOC["depose"]
                const estClient   = doc.uploaded_by === userId
                const estAGE      = doc.categorie === "age"

                return (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: "10px",
                      border: "1px solid #E5E1DA",
                      background: estAGE ? "#F8F7F4" : "#FFFFFF",
                      gap: "12px",
                    }}
                  >
                    {/* Icône + infos */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "8px", background: estAGE ? "#ECFDF5" : "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`ti ${extensionIcone(doc.nom_fichier)}`} style={{ fontSize: "18px", color: estAGE ? "#1D9E75" : "#B25C2A" }} aria-hidden="true" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {doc.nom_fichier}
                        </div>
                        <div style={{ fontSize: "11px", color: "#78716C", marginTop: "2px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span>{CATEGORIE_LABEL[doc.categorie]}</span>
                          <span>·</span>
                          <span>{formatDate(doc.created_at)}</span>
                          {doc.taille_ko && <><span>·</span><span>{formatTaille(doc.taille_ko)}</span></>}
                          {estAGE && <><span>·</span><span style={{ color: "#1D9E75", fontWeight: 600 }}>AGE</span></>}
                        </div>
                      </div>
                    </div>

                    {/* Statut + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, color: statutStyle.color,
                        background: statutStyle.bg, padding: "3px 8px", borderRadius: "4px",
                      }}>
                        {statutStyle.label}
                      </span>

                      {/* Télécharger */}
                      <button
                        onClick={() => telecharger(doc)}
                        title="Télécharger"
                        style={{ width: 30, height: 30, borderRadius: "6px", border: "1px solid #E5E1DA", background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <i className="ti ti-download" style={{ fontSize: "14px", color: "#64748B" }} aria-hidden="true" />
                      </button>

                      {/* Supprimer — uniquement ses propres docs, hors catégorie AGE */}
                      {estClient && !estAGE && (
                        <button
                          onClick={() => setSupprimerConfirm(doc)}
                          title="Supprimer"
                          style={{ width: 30, height: 30, borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: "14px", color: "#B91C1C" }} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modale confirmation suppression */}
      {supprimerConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "28px 32px", maxWidth: "420px", width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-trash" style={{ fontSize: "20px", color: "#B91C1C" }} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A" }}>Supprimer ce document ?</div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Cette action est irréversible.</div>
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: "#F8F7F4", borderRadius: "8px", fontSize: "13px", color: "#44403C", marginBottom: "20px" }}>
              {supprimerConfirm.nom_fichier}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSupprimerConfirm(null)}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                disabled={suppression}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "#B91C1C", color: "white", fontSize: "13px", fontWeight: 500, cursor: suppression ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: suppression ? 0.7 : 1 }}
              >
                {suppression ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}