import React, { useEffect, useState, useRef } from "react"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Actif {
  id: string
  nom: string
  adresse: string | null
  ville: string | null
  code_postal: string | null
}

interface CarnetInfos {
  id: string
  actif_id: string
  type_logement: "neuf" | "existant" | null
  date_permis_construire: string | null
  plans_surface_url: string | null
  plans_reseaux_url: string | null
  dpe_document_id: string | null
  dpe_document_url: string | null
}

interface Travaux {
  id: string
  carnet_id: string
  type_travaux: string
  date_travaux: string | null
  description: string | null
  materiaux_equipements: { texte?: string } | null
  document_url: string | null
  created_at: string
}

// ─── Référentiels ────────────────────────────────────────────────────────────

const TYPES_TRAVAUX: Record<string, string> = {
  isolation_toiture: "Isolation — toiture",
  isolation_murs: "Isolation — murs donnant sur l'extérieur",
  isolation_parois_vitrees_portes: "Isolation — parois vitrées et portes extérieures",
  isolation_plancher_bas: "Isolation — plancher bas",
  chauffage_refroidissement_ventilation: "Chauffage / refroidissement / ventilation",
  production_ecs: "Production d'eau chaude sanitaire",
  ecs_chauffage_energie_renouvelable: "Chauffage ou ECS — énergie renouvelable",
}

const FORMATS_ACCEPTES = ".pdf,.jpg,.jpeg,.png"
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024 // 10 Mo
const BUCKET = "documents-carnet-logement"

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function sanitizeFilename(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function CarnetLogement() {
  const [actifs, setActifs] = useState<Actif[]>([])
  const [actifSelectionne, setActifSelectionne] = useState<string>("")
  const [carnet, setCarnet] = useState<CarnetInfos | null>(null)
  const [travaux, setTravaux] = useState<Travaux[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Bloc A — formulaire
  const [typeLogement, setTypeLogement] = useState<"neuf" | "existant" | "">("")
  const [datePermis, setDatePermis] = useState("")

  // Upload en cours (clé = champ)
  const [uploading, setUploading] = useState<string | null>(null)
  const inputPlansSurfaceRef = useRef<HTMLInputElement>(null)
  const inputPlansReseauxRef = useRef<HTMLInputElement>(null)
  const inputDpeRef = useRef<HTMLInputElement>(null)
  const inputTravauxDocRef = useRef<HTMLInputElement>(null)

  // Bloc B — ajout travaux
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const [typeTravauxForm, setTypeTravauxForm] = useState("")
  const [dateTravauxForm, setDateTravauxForm] = useState("")
  const [descriptionForm, setDescriptionForm] = useState("")
  const [materiauxForm, setMateriauxForm] = useState("")
  const [documentTravauxFile, setDocumentTravauxFile] = useState<File | null>(null)

  const [erreur, setErreur] = useState("")

  // ── Chargement initial ──────────────────────────────────────────────────
  useEffect(() => {
    chargerActifs()
  }, [])

  useEffect(() => {
    if (actifSelectionne) chargerCarnet(actifSelectionne)
  }, [actifSelectionne])

  async function chargerActifs() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from("actifs")
      .select("id, nom, adresse, ville, code_postal")
      .eq("user_id", user.id)
      .eq("actif", true)

    setActifs(data || [])
    if (data && data.length > 0) setActifSelectionne(data[0].id)
    setLoading(false)
  }

  async function chargerCarnet(actifId: string) {
    setLoading(true)
    const { data: carnetData } = await supabase
      .from("carnet_logement_infos")
      .select("*")
      .eq("actif_id", actifId)
      .maybeSingle()

    setCarnet(carnetData)
    setTypeLogement(carnetData?.type_logement || "")
    setDatePermis(carnetData?.date_permis_construire || "")

    if (carnetData) {
      const { data: travauxData } = await supabase
        .from("carnet_logement_travaux")
        .select("*")
        .eq("carnet_id", carnetData.id)
        .order("date_travaux", { ascending: false })
      setTravaux(travauxData || [])
    } else {
      setTravaux([])
    }

    setLoading(false)
  }

  // ── Upload générique vers le bucket ─────────────────────────────────────
  async function uploaderFichier(file: File, champ: string): Promise<string | null> {
    if (file.size > TAILLE_MAX_OCTETS) {
      setErreur("Fichier trop volumineux (10 Mo maximum).")
      return null
    }
    setUploading(champ)
    setErreur("")

    const chemin = `${actifSelectionne}/${Date.now()}_${sanitizeFilename(file.name)}`
    const { error } = await supabase.storage.from(BUCKET).upload(chemin, file)

    setUploading(null)
    if (error) {
      setErreur("Échec de l'envoi du fichier : " + error.message)
      return null
    }
    return chemin
  }

  async function urlSignee(chemin: string | null): Promise<string | null> {
    if (!chemin) return null
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, 3600)
    return data?.signedUrl || null
  }

  async function ouvrirDocument(chemin: string | null) {
    const url = await urlSignee(chemin)
    if (url) window.open(url, "_blank")
  }

  // ── Bloc A — sauvegarde fiche technique ─────────────────────────────────
  async function sauvegarderInfos() {
    setSaving(true)
    setErreur("")

    const payload = {
      actif_id: actifSelectionne,
      type_logement: typeLogement || null,
      date_permis_construire: typeLogement === "neuf" && datePermis ? datePermis : null,
    }

    const { data, error } = await supabase
      .from("carnet_logement_infos")
      .upsert(payload, { onConflict: "actif_id" })
      .select()
      .single()

    setSaving(false)
    if (error) {
      setErreur("Échec de l'enregistrement : " + error.message)
      return
    }
    setCarnet(data)
  }

  async function gererUploadInfos(e: React.ChangeEvent<HTMLInputElement>, champ: "plans_surface_url" | "plans_reseaux_url" | "dpe_document_url") {
    const file = e.target.files?.[0]
    if (!file) return

    if (!carnet) {
      setErreur("Enregistrez d'abord le type de logement avant d'ajouter des documents.")
      return
    }

    const chemin = await uploaderFichier(file, champ)
    if (!chemin) return

    const { data, error } = await supabase
      .from("carnet_logement_infos")
      .update({ [champ]: chemin })
      .eq("id", carnet.id)
      .select()
      .single()

    if (!error) setCarnet(data)
    e.target.value = ""
  }

  // ── Bloc B — ajout d'un travaux ──────────────────────────────────────────
  async function ajouterTravaux() {
    if (!carnet) {
      setErreur("Enregistrez d'abord la fiche technique du logement.")
      return
    }
    if (!typeTravauxForm) {
      setErreur("Sélectionnez un type de travaux.")
      return
    }

    setSaving(true)
    setErreur("")

    let cheminDoc: string | null = null
    if (documentTravauxFile) {
      cheminDoc = await uploaderFichier(documentTravauxFile, "travaux_doc")
    }

    const { data, error } = await supabase
      .from("carnet_logement_travaux")
      .insert({
        carnet_id: carnet.id,
        type_travaux: typeTravauxForm,
        date_travaux: dateTravauxForm || null,
        description: descriptionForm || null,
        materiaux_equipements: materiauxForm ? { texte: materiauxForm } : {},
        document_url: cheminDoc,
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      setErreur("Échec de l'ajout : " + error.message)
      return
    }

    setTravaux(prev => [data, ...prev])
    setAjoutOuvert(false)
    setTypeTravauxForm("")
    setDateTravauxForm("")
    setDescriptionForm("")
    setMateriauxForm("")
    setDocumentTravauxFile(null)
  }

  async function supprimerTravaux(id: string, documentUrl: string | null) {
    if (!confirm("Supprimer cette entrée de travaux ?")) return

    if (documentUrl) {
      await supabase.storage.from(BUCKET).remove([documentUrl])
    }
    const { error } = await supabase.from("carnet_logement_travaux").delete().eq("id", id)
    if (!error) setTravaux(prev => prev.filter(t => t.id !== id))
  }

  // ── Bloc C — export PDF ──────────────────────────────────────────────────
  async function exporterPDF() {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    const actif = actifs.find(a => a.id === actifSelectionne)

    let y = 20
    doc.setFontSize(16)
    doc.text("Carnet d'Information du Logement", 14, y)
    y += 10
    doc.setFontSize(10)
    doc.text(`Bien : ${actif?.nom || ""}`, 14, y)
    y += 6
    if (actif?.adresse) {
      doc.text(`${actif.adresse} ${actif.code_postal || ""} ${actif.ville || ""}`, 14, y)
      y += 6
    }
    doc.text(`Généré le ${formatDate(new Date().toISOString())}`, 14, y)
    y += 12

    doc.setFontSize(12)
    doc.text("Fiche technique", 14, y)
    y += 7
    doc.setFontSize(10)
    doc.text(`Type de logement : ${typeLogement === "neuf" ? "Neuf" : typeLogement === "existant" ? "Existant" : "Non renseigné"}`, 14, y)
    y += 6
    if (typeLogement === "neuf") {
      doc.text(`Date de permis de construire : ${formatDate(datePermis || null)}`, 14, y)
      y += 6
    }
    y += 8

    doc.setFontSize(12)
    doc.text("Historique des travaux", 14, y)
    y += 8

    if (travaux.length === 0) {
      doc.setFontSize(10)
      doc.text("Aucun travaux enregistré.", 14, y)
    } else {
      doc.setFontSize(10)
      travaux.forEach(t => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFont("helvetica", "bold")
        doc.text(TYPES_TRAVAUX[t.type_travaux] || t.type_travaux, 14, y)
        y += 5
        doc.setFont("helvetica", "normal")
        doc.text(`Date : ${formatDate(t.date_travaux)}`, 14, y)
        y += 5
        if (t.description) {
          const lignes = doc.splitTextToSize(t.description, 180)
          doc.text(lignes, 14, y)
          y += lignes.length * 5
        }
        if (t.materiaux_equipements?.texte) {
          const lignes = doc.splitTextToSize(`Matériaux/équipements : ${t.materiaux_equipements.texte}`, 180)
          doc.text(lignes, 14, y)
          y += lignes.length * 5
        }
        y += 6
      })
    }

    doc.save(`carnet-logement-${actif?.nom || "bien"}.pdf`)
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading && actifs.length === 0) {
    return <div style={{ padding: "2rem", color: "#78716C" }}>Chargement…</div>
  }

  if (actifs.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#78716C" }}>
        <i className="ti ti-notebook" style={{ fontSize: "32px", marginBottom: "12px", display: "block" }} />
        Aucun bien enregistré. Ajoutez d'abord un bien pour créer son carnet d'information.
      </div>
    )
  }

  const styleCarte: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E5E1DA",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  }

  const styleTitre: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1F2937",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }

  const styleInput: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #E5E1DA",
    borderRadius: "8px",
    fontSize: "13px",
    background: "#FFFFFF",
  }

  const styleBoutonPrimaire: React.CSSProperties = {
    background: "#0F6E56",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  }

  const styleBoutonSecondaire: React.CSSProperties = {
    background: "#F8F7F4",
    color: "#1F2937",
    border: "1px solid #E5E1DA",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  }

  return (
    <div style={{ maxWidth: "800px" }}>

      {actifs.length > 1 && (
        <div style={{ marginBottom: "20px" }}>
          <select
            value={actifSelectionne}
            onChange={e => setActifSelectionne(e.target.value)}
            style={{ ...styleInput, maxWidth: "320px" }}
          >
            {actifs.map(a => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>
      )}

      {erreur && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C",
          borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <i className="ti ti-alert-triangle" />
          {erreur}
        </div>
      )}

      <div style={{
        background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px",
        padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#0369A1",
        display: "flex", gap: "8px", alignItems: "flex-start",
      }}>
        <i className="ti ti-info-circle" style={{ marginTop: "1px" }} />
        <span>
          Le Carnet d'Information du Logement (CIL) est obligatoire depuis le 1ᵉʳ janvier 2023
          pour les logements neufs et pour les logements existants ayant fait l'objet de travaux
          de rénovation énergétique. Il doit être remis à l'acquéreur lors d'une vente.
        </span>
      </div>

      {/* ── Bloc A — Fiche technique ── */}
      <div style={styleCarte}>
        <div style={styleTitre}>
          <i className="ti ti-file-description" />
          Fiche technique du logement
        </div>

        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
              Type de logement
            </label>
            <select
              value={typeLogement}
              onChange={e => setTypeLogement(e.target.value as "neuf" | "existant" | "")}
              style={styleInput}
            >
              <option value="">Sélectionner…</option>
              <option value="neuf">Neuf</option>
              <option value="existant">Existant</option>
            </select>
          </div>

          {typeLogement === "neuf" && (
            <div>
              <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
                Date de permis de construire / déclaration préalable
              </label>
              <input
                type="date"
                value={datePermis}
                onChange={e => setDatePermis(e.target.value)}
                style={styleInput}
              />
            </div>
          )}
        </div>

        <button
          onClick={sauvegarderInfos}
          disabled={saving || !typeLogement}
          style={{ ...styleBoutonPrimaire, marginTop: "16px", opacity: saving || !typeLogement ? 0.6 : 1 }}
        >
          <i className="ti ti-check" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>

        {carnet && (
          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #E5E1DA" }}>
            <div style={{ fontSize: "12px", color: "#78716C", marginBottom: "10px" }}>Documents</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

              <DocumentLigne
                label="Plans de surface et coupes"
                chemin={carnet.plans_surface_url}
                uploading={uploading === "plans_surface_url"}
                onUpload={() => inputPlansSurfaceRef.current?.click()}
                onOuvrir={() => ouvrirDocument(carnet.plans_surface_url)}
              />
              <input ref={inputPlansSurfaceRef} type="file" accept={FORMATS_ACCEPTES} hidden
                onChange={e => gererUploadInfos(e, "plans_surface_url")} />

              <DocumentLigne
                label="Plans / schémas réseaux (eau, électricité, gaz, aération)"
                chemin={carnet.plans_reseaux_url}
                uploading={uploading === "plans_reseaux_url"}
                onUpload={() => inputPlansReseauxRef.current?.click()}
                onOuvrir={() => ouvrirDocument(carnet.plans_reseaux_url)}
              />
              <input ref={inputPlansReseauxRef} type="file" accept={FORMATS_ACCEPTES} hidden
                onChange={e => gererUploadInfos(e, "plans_reseaux_url")} />

              <DocumentLigne
                label="DPE (si disponible)"
                chemin={carnet.dpe_document_url}
                uploading={uploading === "dpe_document_url"}
                onUpload={() => inputDpeRef.current?.click()}
                onOuvrir={() => ouvrirDocument(carnet.dpe_document_url)}
              />
              <input ref={inputDpeRef} type="file" accept={FORMATS_ACCEPTES} hidden
                onChange={e => gererUploadInfos(e, "dpe_document_url")} />

            </div>
          </div>
        )}
      </div>

      {/* ── Bloc B — Historique des travaux ── */}
      <div style={styleCarte}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ ...styleTitre, marginBottom: 0 }}>
            <i className="ti ti-tools" />
            Historique des travaux
          </div>
          <button onClick={() => setAjoutOuvert(o => !o)} style={styleBoutonSecondaire}>
            <i className="ti ti-plus" />
            Ajouter des travaux
          </button>
        </div>

        {ajoutOuvert && (
          <div style={{
            background: "#F8F7F4", border: "1px solid #E5E1DA", borderRadius: "8px",
            padding: "16px", marginBottom: "16px", display: "grid", gap: "12px",
          }}>
            <div>
              <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
                Type de travaux
              </label>
              <select value={typeTravauxForm} onChange={e => setTypeTravauxForm(e.target.value)} style={styleInput}>
                <option value="">Sélectionner…</option>
                {Object.entries(TYPES_TRAVAUX).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
                Date des travaux (ou date du devis accepté)
              </label>
              <input type="date" value={dateTravauxForm} onChange={e => setDateTravauxForm(e.target.value)} style={styleInput} />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
                Description
              </label>
              <textarea
                value={descriptionForm}
                onChange={e => setDescriptionForm(e.target.value)}
                rows={2}
                style={{ ...styleInput, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
                Matériaux / équipements (nature, caractéristiques thermiques, surface…)
              </label>
              <textarea
                value={materiauxForm}
                onChange={e => setMateriauxForm(e.target.value)}
                rows={2}
                style={{ ...styleInput, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#78716C", display: "block", marginBottom: "6px" }}>
                Justificatif (devis, facture, attestation…)
              </label>
              <button onClick={() => inputTravauxDocRef.current?.click()} style={styleBoutonSecondaire}>
                <i className="ti ti-upload" />
                {documentTravauxFile ? documentTravauxFile.name : "Choisir un fichier"}
              </button>
              <input
                ref={inputTravauxDocRef}
                type="file"
                accept={FORMATS_ACCEPTES}
                hidden
                onChange={e => setDocumentTravauxFile(e.target.files?.[0] || null)}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={ajouterTravaux} disabled={saving} style={{ ...styleBoutonPrimaire, opacity: saving ? 0.6 : 1 }}>
                <i className="ti ti-check" />
                {saving ? "Ajout…" : "Ajouter"}
              </button>
              <button onClick={() => setAjoutOuvert(false)} style={styleBoutonSecondaire}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {travaux.length === 0 ? (
          <div style={{ color: "#78716C", fontSize: "13px", textAlign: "center", padding: "16px" }}>
            Aucun travaux enregistré pour ce logement.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {travaux.map(t => (
              <div key={t.id} style={{
                border: "1px solid #E5E1DA", borderRadius: "8px", padding: "12px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px",
              }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#1F2937" }}>
                    {TYPES_TRAVAUX[t.type_travaux] || t.type_travaux}
                  </div>
                  <div style={{ fontSize: "12px", color: "#78716C", marginTop: "2px" }}>
                    {formatDate(t.date_travaux)}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: "12px", color: "#1F2937", marginTop: "6px" }}>{t.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  {t.document_url && (
                    <button onClick={() => ouvrirDocument(t.document_url)} title="Voir le document"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#0369A1" }}>
                      <i className="ti ti-file-text" />
                    </button>
                  )}
                  <button onClick={() => supprimerTravaux(t.id, t.document_url)} title="Supprimer"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#B91C1C" }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bloc C — Export ── */}
      <div style={styleCarte}>
        <div style={styleTitre}>
          <i className="ti ti-download" />
          Export
        </div>
        <p style={{ fontSize: "13px", color: "#78716C", marginBottom: "16px" }}>
          Téléchargez votre carnet d'information consolidé, à remettre à l'acquéreur en cas de vente.
        </p>
        <button onClick={exporterPDF} disabled={!carnet} style={{ ...styleBoutonPrimaire, opacity: !carnet ? 0.6 : 1 }}>
          <i className="ti ti-file-download" />
          Télécharger mon carnet (PDF)
        </button>
      </div>

    </div>
  )
}

// ─── Sous-composant ligne document ─────────────────────────────────────────

function DocumentLigne({
  label, chemin, uploading, onUpload, onOuvrir,
}: {
  label: string
  chemin: string | null
  uploading: boolean
  onUpload: () => void
  onOuvrir: () => void
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#1F2937" }}>
        <i className={`ti ${chemin ? "ti-circle-check" : "ti-circle-dashed"}`} style={{ color: chemin ? "#2F7D5C" : "#78716C" }} />
        {label}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {chemin && (
          <button onClick={onOuvrir} style={{ background: "none", border: "none", cursor: "pointer", color: "#0369A1", fontSize: "12px" }}>
            Voir
          </button>
        )}
        <button onClick={onUpload} disabled={uploading} style={{ background: "none", border: "none", cursor: "pointer", color: "#0F6E56", fontSize: "12px" }}>
          {uploading ? "Envoi…" : chemin ? "Remplacer" : "Ajouter"}
        </button>
      </div>
    </div>
  )
}