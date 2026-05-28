import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import Papa from "papaparse"
import * as XLSX from "xlsx"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  soumise:          { label: "Soumise",          color: "#64748B", bg: "#F1F5F9", icon: "ti-clock" },
  en_qualification: { label: "En qualification", color: "#92400E", bg: "#FFFBEB", icon: "ti-search" },
  validee:          { label: "Validée",           color: "#065F46", bg: "#ECFDF5", icon: "ti-circle-check" },
  en_cours:         { label: "En cours",          color: "#0369A1", bg: "#EFF6FF", icon: "ti-rocket" },
  terminee:         { label: "Terminée",          color: "#475569", bg: "#F1F5F9", icon: "ti-check" },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sensibilisation: { label: "Sensibilisation", color: "#065F46", bg: "#ECFDF5" },
  scoring:         { label: "Scoring",         color: "#1E40AF", bg: "#EFF6FF" },
  pre_diagnostic:  { label: "Pré-diagnostic",  color: "#5B21B6", bg: "#F5F3FF" },
}

const ETAPES_SUIVI = ["Soumise", "En qualification", "Validée", "En cours", "Terminée"]

const COLONNES_TEMPLATE = [
  "nom", "adresse", "ville", "code_postal",
  "type_batiment", "surface", "annee_construction",
  "valeur_marche", "type_bien", "telephone_client",
  "email_client", "nom_proprietaire", "score_climatique"
]

interface FormCampagne {
  nom: string
  type_campagne: string
  zone_geo: string
  date_debut: string
  date_fin: string
  description: string
}

interface ActifImporte {
  nom: string
  adresse: string
  ville: string
  code_postal: string
  type_batiment?: string
  surface?: number
  annee_construction?: number
  valeur_marche?: number
  type_bien?: string
  telephone_client?: string
  email_client?: string
nom_proprietaire?: string
  score_climatique?: number
  _erreur?: string
}

export default function MesCampagnes() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [campagnes, setCampagnes]           = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [etape, setEtape]                   = useState(1)
  const [showForm, setShowForm]             = useState(false)
  const [loadingForm, setLoadingForm]       = useState(false)
  const [succes, setSucces]                 = useState(false)
  const [selected, setSelected]             = useState<string | null>(null)
  const [actifsImportes, setActifsImportes] = useState<ActifImporte[]>([])
  const [importErreur, setImportErreur]     = useState("")
  const [importLoading, setImportLoading]   = useState(false)
  const [form, setForm] = useState<FormCampagne>({
    nom: "", type_campagne: "", zone_geo: "", date_debut: "", date_fin: "", description: "",
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("campagnes")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
    setCampagnes(data || [])
    setLoading(false)
  }

  function downloadTemplate() {
    const csvContent = COLONNES_TEMPLATE.join(",") + "\n" +
     "Résidence Les Pins,12 rue des Lilas,Dax,40100,appartement,65,1998,180000,résidentiel,0612345678,marie.dupont@email.fr,Dupont Marie,42"
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template_actifs_age.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFichier(file: File) {
    setImportErreur("")
    setActifsImportes([])
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (ext === "csv") {
      Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  encoding: "UTF-8",
        complete: (result) => { traiterLignes(result.data as Record<string, string>[]) },
        error: () => setImportErreur("Erreur lors de la lecture du fichier CSV."),
      })
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, string>[]
        traiterLignes(rows)
      }
      reader.readAsArrayBuffer(file)
    } else {
      setImportErreur("Format non supporté. Utilisez un fichier CSV ou Excel (.xlsx).")
    }
  }

  function traiterLignes(rows: Record<string, string>[]) {
    if (rows.length === 0) { setImportErreur("Le fichier est vide."); return }
    if (rows.length > 500) { setImportErreur("Maximum 500 lignes par import."); return }
    const actifs: ActifImporte[] = rows.map((row, i) => {
      const erreurs: string[] = []
      if (!row.nom) erreurs.push("nom manquant")
      if (!row.adresse) erreurs.push("adresse manquante")
      if (!row.ville) erreurs.push("ville manquante")
      if (!row.code_postal) erreurs.push("code postal manquant")
     return {
  nom:               row.nom || "",
  adresse:           row.adresse || "",
  ville:             row.ville || "",
  code_postal:       row.code_postal || "",
  type_batiment:     row.type_batiment || undefined,
  surface:           row.surface ? parseInt(row.surface) : undefined,
  annee_construction: row.annee_construction ? parseInt(row.annee_construction) : undefined,
  valeur_marche:     row.valeur_marche ? parseFloat(row.valeur_marche) : undefined,
  type_bien:         row.type_bien || undefined,
  telephone_client:  row.telephone_client || undefined,
  email_client:      row.email_client || undefined,
  nom_proprietaire:  row.nom_proprietaire || undefined,
  score_climatique:  row.score_climatique ? parseInt(row.score_climatique) : undefined,
  _erreur:           erreurs.length > 0 ? `Ligne ${i + 2} : ${erreurs.join(", ")}` : undefined,
}
    })
    setActifsImportes(actifs)
  }

  async function handleSoumettre() {
    if (!form.nom || !form.type_campagne) return
    setLoadingForm(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingForm(false); return }

    // Créer la campagne
    const { error: errCampagne } = await supabase.from("campagnes").insert({
      nom:           form.nom,
      type_campagne: form.type_campagne,
      zone_geo:      form.zone_geo || null,
      date_debut:    form.date_debut || null,
      date_fin:      form.date_fin || null,
      description:   form.description || null,
      statut:        "soumise",
      origine:       "client",
      client_id:     user.id,
    })

    if (errCampagne) {
      console.error("Erreur création campagne:", errCampagne)
      setLoadingForm(false)
      return
    }

    // Récupérer l'ID de la campagne créée
    const { data: campagneData } = await supabase
      .from("campagnes")
      .select("id")
      .eq("client_id", user.id)
      .eq("nom", form.nom)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Importer les actifs valides si présents
    const actifsValides = actifsImportes.filter(a => !a._erreur)
    if (campagneData && actifsValides.length > 0) {
      setImportLoading(true)
      for (const actif of actifsValides) {
        const { _erreur, ...actifData } = actif
        const { data: nouvelActif, error: errActif } = await supabase
          .from("actifs")
          .insert({
            ...actifData,
            user_id:        user.id,
            client_id:      user.id,
            statut_analyse: "en_attente",
            categorie:      "import_csv",
          })
          .select("id")
          .single()

        if (errActif) {
          console.error("Erreur création actif:", errActif)
          continue
        }

        if (nouvelActif) {
          const { error: errLiaison } = await supabase.from("campagnes_actifs").insert({
            campagne_id: campagneData.id,
            actif_id:    nouvelActif.id,
          })
          if (errLiaison) console.error("Erreur liaison campagne_actif:", errLiaison)
        }
      }
      setImportLoading(false)
    }

    await load()
    setSucces(true)
    setLoadingForm(false)
  }

  async function supprimerCampagne(id: string) {
    if (!confirm("Supprimer cette campagne ? Cette action est irréversible.")) return
    await supabase.from("campagnes").delete().eq("id", id)
    setCampagnes(campagnes.filter(c => c.id !== id))
  }

  function resetForm() {
    setForm({ nom: "", type_campagne: "", zone_geo: "", date_debut: "", date_fin: "", description: "" })
    setEtape(1)
    setSucces(false)
    setShowForm(false)
    setActifsImportes([])
    setImportErreur("")
  }

  function etapeIndex(statut: string): number {
    const map: Record<string, number> = { soumise: 0, en_qualification: 1, validee: 2, en_cours: 3, terminee: 4 }
    return map[statut] ?? 0
  }

  const nbErreurs = actifsImportes.filter(a => a._erreur).length
  const nbValides = actifsImportes.filter(a => !a._erreur).length

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0",
    borderRadius: "7px", fontSize: "13px", color: "#0F172A",
    background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  }

  const lStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 600, color: "#94A3B8",
    marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.07em",
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} aria-hidden="true" /> Retour
        </button>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{campagnes.length}</span> campagne{campagnes.length > 1 ? "s" : ""}
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEtape(1); setSucces(false) }}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Nouvelle campagne
        </button>
      </div>

      {/* Formulaire 4 étapes */}
      {showForm && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "24px" }}>
          {succes ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "40px", color: "#0F6E56", display: "block", marginBottom: "12px" }} aria-hidden="true" />
              <div style={{ fontSize: "16px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Campagne soumise !</div>
              {nbValides > 0 && (
                <div style={{ fontSize: "13px", color: "#065F46", marginBottom: "6px" }}>
                  <i className="ti ti-building" style={{ fontSize: "14px" }} aria-hidden="true" /> {nbValides} actif{nbValides > 1 ? "s" : ""} importé{nbValides > 1 ? "s" : ""} et liés à la campagne.
                </div>
              )}
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Notre équipe AGE va qualifier votre demande et vous recontacter sous 48h.</div>
              <button onClick={resetForm} style={{ background: "#0F6E56", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
                Nouvelle campagne
              </button>
            </div>
          ) : (
            <>
              {/* Stepper 4 étapes */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
                {["Périmètre", "Configuration", "Import actifs", "Confirmation"].map((e, i) => {
                  const num = i + 1
                  const done = etape > num
                  const active = etape === num
                  return (
                    <React.Fragment key={i}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#0F6E56" : active ? "#ECFDF5" : "#F1F5F9", border: `2px solid ${done ? "#0F6E56" : active ? "#0F6E56" : "#E2E8F0"}`, fontSize: "13px", fontWeight: 600, color: done ? "white" : active ? "#0F6E56" : "#94A3B8" }}>
                          {done ? <i className="ti ti-check" style={{ fontSize: "14px" }} /> : num}
                        </div>
                        <span style={{ fontSize: "11px", color: done || active ? "#0F6E56" : "#94A3B8", fontWeight: done || active ? 600 : 400, whiteSpace: "nowrap" }}>{e}</span>
                      </div>
                      {i < 3 && <div style={{ flex: 1, height: "2px", background: done ? "#0F6E56" : "#E2E8F0", margin: "0 8px 16px" }} />}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Étape 1 */}
              {etape === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={lStyle}>Nom de la campagne *</label>
                    <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Campagne prévention inondation 2026" style={iStyle} />
                  </div>
                  <div>
                    <label style={lStyle}>Type de campagne *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                        <div key={k} onClick={() => setForm({ ...form, type_campagne: k })} style={{ padding: "14px", borderRadius: "9px", border: `1px solid ${form.type_campagne === k ? "#0F6E56" : "#E2E8F0"}`, background: form.type_campagne === k ? "#ECFDF5" : "white", cursor: "pointer", textAlign: "center", transition: "all 0.12s" }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: form.type_campagne === k ? "#065F46" : "#0F172A", marginBottom: "4px" }}>{v.label}</div>
                          <div style={{ fontSize: "11px", color: form.type_campagne === k ? "#0F6E56" : "#94A3B8" }}>
                            {k === "sensibilisation" && "Informer vos clients sur les risques"}
                            {k === "scoring" && "Évaluer l'exposition climatique"}
                            {k === "pre_diagnostic" && "Premier niveau de diagnostic terrain"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                    <button onClick={() => setEtape(2)} disabled={!form.nom || !form.type_campagne} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: form.nom && form.type_campagne ? "#0F6E56" : "#94A3B8", color: "white", fontSize: "13px", fontWeight: 500, cursor: form.nom && form.type_campagne ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      Suivant <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 2 */}
              {etape === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={lStyle}>Zone géographique</label>
                    <input value={form.zone_geo} onChange={e => setForm({ ...form, zone_geo: e.target.value })} placeholder="Ex : Nouvelle-Aquitaine, Dax, National…" style={iStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={lStyle}>Date de début souhaitée</label>
                      <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={iStyle} />
                    </div>
                    <div>
                      <label style={lStyle}>Date de fin souhaitée</label>
                      <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={iStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={lStyle}>Description & objectifs</label>
                    <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez vos objectifs, le périmètre visé, les contraintes éventuelles…" style={{ ...iStyle, resize: "vertical" as const }} />
                  </div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setEtape(1)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
                    </button>
                    <button onClick={() => setEtape(3)} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      Suivant <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 3 — Import actifs */}
              {etape === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>Import CSV / Excel</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px" }}>Importez vos actifs depuis un fichier CSV ou Excel. Cette étape est optionnelle.</div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-download" style={{ fontSize: "14px" }} aria-hidden="true" />
                        Télécharger le template
                      </button>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
                        <i className="ti ti-upload" style={{ fontSize: "14px" }} aria-hidden="true" />
                        Importer un fichier
                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFichier(e.target.files[0]) }} />
                      </label>
                    </div>
                  </div>

                  {importErreur && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#991B1B" }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: "15px" }} aria-hidden="true" />{importErreur}
                    </div>
                  )}

                  {actifsImportes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{actifsImportes.length} ligne{actifsImportes.length > 1 ? "s" : ""} détectée{actifsImportes.length > 1 ? "s" : ""}</span>
                        {nbValides > 0 && <span style={{ background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px" }}>{nbValides} valide{nbValides > 1 ? "s" : ""}</span>}
                        {nbErreurs > 0 && <span style={{ background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px" }}>{nbErreurs} erreur{nbErreurs > 1 ? "s" : ""}</span>}
                      </div>
                      <div style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                              {["Nom", "Adresse", "Ville", "CP", "Type", "Surface", "Statut"].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {actifsImportes.map((a, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #F1F5F9", background: a._erreur ? "#FEF2F2" : "white" }}>
                                <td style={{ padding: "8px 12px", color: "#0F172A", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nom || "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#64748B", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.adresse || "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#64748B" }}>{a.ville || "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#64748B" }}>{a.code_postal || "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#64748B" }}>{a.type_batiment || "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#64748B" }}>{a.surface ? `${a.surface} m²` : "—"}</td>
                                <td style={{ padding: "8px 12px" }}>
                                  {a._erreur
                                    ? <span style={{ color: "#991B1B", fontSize: "11px" }} title={a._erreur}><i className="ti ti-alert-triangle" style={{ fontSize: "13px" }} aria-hidden="true" /> Erreur</span>
                                    : <span style={{ color: "#065F46", fontSize: "11px" }}><i className="ti ti-check" style={{ fontSize: "13px" }} aria-hidden="true" /> OK</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {nbErreurs > 0 && (
                        <div style={{ fontSize: "12px", color: "#991B1B" }}>
                          {actifsImportes.filter(a => a._erreur).map((a, i) => (
                            <div key={i}>{a._erreur}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setEtape(2)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
                    </button>
                    <button onClick={() => setEtape(4)} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      Suivant <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 4 — Confirmation */}
              {etape === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>Récapitulatif</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {[
                        { label: "Nom",               val: form.nom },
                        { label: "Type",              val: TYPE_CONFIG[form.type_campagne]?.label || form.type_campagne },
                        { label: "Zone géographique", val: form.zone_geo || "Non spécifiée" },
                        { label: "Période",           val: form.date_debut ? `${form.date_debut} → ${form.date_fin || "—"}` : "Non spécifiée" },
                        { label: "Description",       val: form.description || "Aucune" },
                        { label: "Actifs à importer", val: nbValides > 0 ? `${nbValides} actif${nbValides > 1 ? "s" : ""} valide${nbValides > 1 ? "s" : ""}${nbErreurs > 0 ? ` (${nbErreurs} ignoré${nbErreurs > 1 ? "s" : ""})` : ""}` : "Aucun" },
                      ].map(({ label, val }, i) => (
                        <div key={i} style={{ display: "flex", gap: "16px" }}>
                          <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, minWidth: "160px" }}>{label}</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <i className="ti ti-info-circle" style={{ fontSize: "16px", color: "#0F6E56" }} aria-hidden="true" />
                    <span style={{ fontSize: "13px", color: "#065F46" }}>Votre demande sera transmise à l'équipe AGE qui vous recontactera sous 48h pour qualification.</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={() => setEtape(3)} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                      <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
                    </button>
                    <button
                      onClick={handleSoumettre}
                      disabled={loadingForm || importLoading}
                      style={{ padding: "8px 20px", borderRadius: "7px", border: "none", background: "#0F6E56", color: "white", fontSize: "13px", fontWeight: 500, cursor: loadingForm || importLoading ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", opacity: loadingForm || importLoading ? 0.7 : 1 }}>
                      <i className="ti ti-send" style={{ fontSize: "14px" }} />
                      {loadingForm || importLoading ? "Import en cours…" : "Soumettre la campagne"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Liste campagnes */}
      {campagnes.length === 0 && !showForm ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-speakerphone" style={{ fontSize: "32px", color: "#94A3B8", display: "block", marginBottom: "12px" }} aria-hidden="true" />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "6px" }}>Aucune campagne</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Lancez votre première campagne de prévention climatique</div>
          <button onClick={() => setShowForm(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "14px" }} /> Nouvelle campagne
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {campagnes.map(c => {
            const statut   = STATUT_CONFIG[c.statut] || STATUT_CONFIG.soumise
            const type     = TYPE_CONFIG[c.type_campagne]
            const etapeIdx = etapeIndex(c.statut)
            const isOpen   = selected === c.id
            return (
              <div key={c.id} style={{ background: "#FFFFFF", border: `1px solid ${isOpen ? "#A7F3D0" : "#E2E8F0"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.12s" }}>
                <div onClick={() => setSelected(isOpen ? null : c.id)} style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "8px", background: statut.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${statut.icon}`} style={{ fontSize: "17px", color: statut.color }} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "3px" }}>{c.nom || "Campagne sans nom"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {type && <span style={{ background: type.bg, color: type.color, padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 500 }}>{type.label}</span>}
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ background: statut.bg, color: statut.color, padding: "3px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                    {c.statut === "soumise" && (
                      <button
                        onClick={e => { e.stopPropagation(); supprimerCampagne(c.id) }}
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", padding: "5px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-trash" style={{ fontSize: "13px" }} aria-hidden="true" />
                        Supprimer
                      </button>
                    )}
                    <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: "16px", color: "#94A3B8" }} aria-hidden="true" />
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #E2E8F0", padding: "20px" }}>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Progression</div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {ETAPES_SUIVI.map((e, i) => {
                          const done   = i < etapeIdx
                          const active = i === etapeIdx
                          return (
                            <React.Fragment key={i}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? "#0F6E56" : active ? "#ECFDF5" : "#F1F5F9", border: `2px solid ${done ? "#0F6E56" : active ? "#0F6E56" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {done ? <i className="ti ti-check" style={{ fontSize: "12px", color: "white" }} /> : <div style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#0F6E56" : "#CBD5E1" }} />}
                                </div>
                                <span style={{ fontSize: "10px", color: done || active ? "#0F6E56" : "#94A3B8", fontWeight: done || active ? 600 : 400, whiteSpace: "nowrap" }}>{e}</span>
                              </div>
                              {i < ETAPES_SUIVI.length - 1 && <div style={{ flex: 1, height: "2px", background: done ? "#0F6E56" : "#E2E8F0", marginBottom: "14px" }} />}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {c.zone_geo && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Zone</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{c.zone_geo}</div>
                        </div>
                      )}
                      {(c.date_debut || c.date_fin) && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Période</div>
                          <div style={{ fontSize: "13px", color: "#0F172A" }}>{c.date_debut || "—"} → {c.date_fin || "—"}</div>
                        </div>
                      )}
                      {c.description && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Description</div>
                          <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>{c.description}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}