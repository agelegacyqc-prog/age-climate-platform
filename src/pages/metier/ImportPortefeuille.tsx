import React, { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

type CibleImport = "biens" | "actifs"
type ModeImport  = "libre" | "campagne"
type Etape       = 1 | 2 | 3 | 4

interface Campagne {
  id: string
  nom: string
  zone_geo: string | null
  date_debut: string | null
}

interface LigneBrute {
  [key: string]: string
}

interface LigneMappee {
  index: number
  donnees: Record<string, string | number | boolean | null>
  erreurs: string[]
  statut: "ok" | "erreur" | "doublon"
  doublonId?: string
  actionDoublon: "ignorer" | "mettre_a_jour"
}

interface ResultatImport {
  inseres: number
  mis_a_jour: number
  ignores: number
  erreurs: number
}

// ─── Colonnes attendues par table ─────────────────────────────────────────────

const COLONNES_BIENS = [
  { champ: "adresse",      label: "Adresse",      obligatoire: true,  type: "text"   },
  { champ: "ville",        label: "Ville",        obligatoire: true,  type: "text"   },
  { champ: "code_postal",  label: "Code postal",  obligatoire: true,  type: "text"   },
  { champ: "type_bien",    label: "Type de bien", obligatoire: true,  type: "text"   },
  { champ: "nom_client",   label: "Nom client",   obligatoire: false, type: "text"   },
  { champ: "type_client",  label: "Type client",  obligatoire: false, type: "text"   },
  { champ: "categorie",    label: "Catégorie",    obligatoire: false, type: "text"   },
  { champ: "priorite",     label: "Priorité",     obligatoire: false, type: "number" },
]

const COLONNES_ACTIFS = [
  { champ: "nom",               label: "Nom",               obligatoire: true,  type: "text"   },
  { champ: "adresse",           label: "Adresse",           obligatoire: true,  type: "text"   },
  { champ: "ville",             label: "Ville",             obligatoire: true,  type: "text"   },
  { champ: "code_postal",       label: "Code postal",       obligatoire: true,  type: "text"   },
  { champ: "type_bien",         label: "Type de bien",      obligatoire: true,  type: "text"   },
  { champ: "siren",             label: "SIREN",             obligatoire: false, type: "text"   },
  { champ: "raison_sociale",    label: "Raison sociale",    obligatoire: false, type: "text"   },
  { champ: "surface",           label: "Surface (m²)",      obligatoire: false, type: "number" },
  { champ: "annee_construction",label: "Année construction",obligatoire: false, type: "number" },
  { champ: "valeur_marche",     label: "Valeur marché (€)", obligatoire: false, type: "number" },
  { champ: "secteur_activite",  label: "Secteur activité",  obligatoire: false, type: "text"   },
  { champ: "nom_client",        label: "Nom client",        obligatoire: false, type: "text"   },
  { champ: "email_client",      label: "Email client",      obligatoire: false, type: "text"   },
  { champ: "telephone_client",  label: "Téléphone client",  obligatoire: false, type: "text"   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliser(s: string) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}

function parseNombre(s: string): number | null {
  const n = parseFloat(s.replace(",", ".").replace(/\s/g, ""))
  return isNaN(n) ? null : n
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ImportPortefeuille() {
  const navigate = useNavigate()

  // Wizard state
  const [etape, setEtape]               = useState<Etape>(1)
  const [cible, setCible]               = useState<CibleImport>("biens")
  const [mode, setMode]                 = useState<ModeImport>("libre")
  const [campagnes, setCampagnes]       = useState<Campagne[]>([])
  const [campagneId, setCampagneId]     = useState<string>("")
  const [roleAGE, setRoleAGE]           = useState<string>("")
  const [userId, setUserId]             = useState<string>("")

  // Fichier
  const [fichier, setFichier]           = useState<File | null>(null)
  const [lignesBrutes, setLignesBrutes] = useState<LigneBrute[]>([])
  const [entetes, setEntetes]           = useState<string[]>([])
  const [mapping, setMapping]           = useState<Record<string, string>>({})
  const [isDragOver, setIsDragOver]     = useState(false)
  const fileRef                         = useRef<HTMLInputElement>(null)

  // Prévisualisation
  const [lignesMappees, setLignesMappees] = useState<LigneMappee[]>([])
  const [pagePreview, setPagePreview]     = useState(0)
  const PAGE_SIZE = 20

  // Import
  const [importEnCours, setImportEnCours] = useState(false)
  const [resultat, setResultat]           = useState<ResultatImport | null>(null)
  const [toast, setToast]                 = useState<{ message: string; type: "success" | "error" } | null>(null)

  const colonnes = cible === "biens" ? COLONNES_BIENS : COLONNES_ACTIFS

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Chargement profil + campagnes ──
  React.useEffect(() => {
    chargerContexte()
  }, [])

  async function chargerContexte() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profil } = await supabase
      .from("profils")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (profil) setRoleAGE(profil.role)

    const { data: camps } = await supabase
      .from("campagnes")
      .select("id, nom, zone_geo, date_debut")
      .eq("statut", "en_cours")
      .order("date_debut", { ascending: false })
    setCampagnes(camps || [])
  }

  // ── Étape 1 → 2 : validation config ──
  function validerEtape1() {
    if (mode === "campagne" && !campagneId) {
      showToast("Veuillez sélectionner une campagne", "error")
      return
    }
    setEtape(2)
  }

  // ── Parsing fichier ──
  async function parserFichier(file: File) {
    setFichier(file)
    const Papa = (await import("papaparse")).default
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
     complete: (results: any) => {
  // Ignorer la ligne 2 si elle contient des libellés (détection : valeur contient " *")
  let rows = results.data as LigneBrute[]
  const headers = results.meta.fields as string[]
  if (rows.length > 0) {
    const firstRow = Object.values(rows[0])
    const estLigneLibelles = firstRow.some(v => String(v || "").includes(" *") || String(v || "").toLowerCase() === headers[0]?.toLowerCase())
    if (estLigneLibelles) rows = rows.slice(1)
  }
  setLignesBrutes(rows)
        setEntetes(headers)
        // Auto-mapping : correspondance insensible à la casse
        const autoMap: Record<string, string> = {}
        colonnes.forEach(col => {
          const match = headers.find(h =>
            normaliser(h) === normaliser(col.champ) ||
            normaliser(h) === normaliser(col.label)
          )
          if (match) autoMap[col.champ] = match
        })
        setMapping(autoMap)
        setEtape(3)
      },
      error: () => showToast("Erreur de lecture du fichier", "error"),
    })
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parserFichier(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parserFichier(file)
  }

  // ── Étape 3 : générer prévisualisation ──
  async function genererPrevisualisation() {
    // Vérifier colonnes obligatoires mappées
    const manquantes = colonnes
      .filter(c => c.obligatoire && !mapping[c.champ])
      .map(c => c.label)
    if (manquantes.length > 0) {
      showToast(`Colonnes obligatoires non mappées : ${manquantes.join(", ")}`, "error")
      return
    }

    // Charger existants pour déduplication
    let existants: { id: string; adresse: string; code_postal: string; siren?: string }[] = []
    if (cible === "biens") {
      const { data } = await supabase.from("biens").select("id, adresse, code_postal")
      existants = data || []
    } else {
      const { data } = await supabase.from("actifs").select("id, adresse, code_postal, siren")
      existants = data || []
    }

    const lignes: LigneMappee[] = lignesBrutes.map((row, idx) => {
      const donnees: Record<string, string | number | boolean | null> = {}
      const erreurs: string[] = []

      colonnes.forEach(col => {
        const header = mapping[col.champ]
        if (!header) return
        const valeur = (row[header] || "").trim()
        if (col.obligatoire && !valeur) {
          erreurs.push(`${col.label} manquant`)
          return
        }
        if (col.type === "number" && valeur) {
          const n = parseNombre(valeur)
          if (n === null) erreurs.push(`${col.label} : valeur numérique invalide`)
          else donnees[col.champ] = n
        } else {
          donnees[col.champ] = valeur || null
        }
      })

      // Déduplication
      let statut: LigneMappee["statut"] = erreurs.length > 0 ? "erreur" : "ok"
      let doublonId: string | undefined

      if (statut === "ok") {
        const adresse = normaliser(donnees.adresse as string || "")
        const cp      = normaliser(donnees.code_postal as string || "")
        const siren   = normaliser(donnees.siren as string || "")

        const doublon = existants.find(e => {
          const matchAdresse = normaliser(e.adresse) === adresse && normaliser(e.code_postal) === cp
          if (cible === "actifs" && siren && e.siren) {
            return normaliser(e.siren) === siren && matchAdresse
          }
          return matchAdresse
        })
        if (doublon) {
          statut    = "doublon"
          doublonId = doublon.id
        }
      }

      return { index: idx, donnees, erreurs, statut, doublonId, actionDoublon: "ignorer" }
    })

    setLignesMappees(lignes)
    setPagePreview(0)
    setEtape(4)
  }

  function toggleActionDoublon(index: number) {
    setLignesMappees(prev => prev.map(l =>
      l.index === index
        ? { ...l, actionDoublon: l.actionDoublon === "ignorer" ? "mettre_a_jour" : "ignorer" }
        : l
    ))
  }

  // ── Étape 4 : import ──
  async function lancerImport() {
    setImportEnCours(true)
    const res: ResultatImport = { inseres: 0, mis_a_jour: 0, ignores: 0, erreurs: 0 }
    try {

    for (const ligne of lignesMappees) {
      if (ligne.statut === "erreur") { res.erreurs++; continue }

      const payload = {
        ...ligne.donnees,
        client_id: userId,
      }

      if (ligne.statut === "doublon") {
        if (ligne.actionDoublon === "ignorer") {
          res.ignores++
          // Si mode campagne : rattacher quand même à la campagne
          if (mode === "campagne" && campagneId && ligne.doublonId) {
            await supabase.from("contacts_campagne").upsert({
              campagne_id: campagneId,
              bien_id: ligne.doublonId,
              client_id: userId,
              statut: "importe",
            }, { onConflict: "campagne_id,bien_id" })
          }
          continue
        }
        // Mise à jour
        const { error } = await supabase
          .from(cible)
          .update(payload)
          .eq("id", ligne.doublonId!)
        if (error) { res.erreurs++; continue }
        res.mis_a_jour++
        if (mode === "campagne" && campagneId && ligne.doublonId) {
          await supabase.from("contacts_campagne").upsert({
            campagne_id: campagneId,
            bien_id: ligne.doublonId,
            client_id: userId,
            statut: "importe",
          }, { onConflict: "campagne_id,bien_id" })
        }
        continue
      }

      // Insertion
      const { data: inserted, error } = await supabase
        .from(cible)
        .insert(payload)
        .select("id")
        .single()

      if (error || !inserted) { res.erreurs++; continue }
      res.inseres++

      // Mode campagne : créer contact_campagne
      if (mode === "campagne" && campagneId) {
        await supabase.from("contacts_campagne").insert({
          campagne_id: campagneId,
          bien_id: inserted.id,
          client_id: userId,
          statut: "importe",
        })
      }
    }
 setResultat(res)
    } catch (e) {
      console.error("Import error:", e)
      showToast("Erreur inattendue lors de l'import", "error")
    } finally {
      setImportEnCours(false)
    }
  }

  // ── Stats prévisualisation ──
  const statsPreview = {
    total:    lignesMappees.length,
    ok:       lignesMappees.filter(l => l.statut === "ok").length,
    doublons: lignesMappees.filter(l => l.statut === "doublon").length,
    erreurs:  lignesMappees.filter(l => l.statut === "erreur").length,
  }
  const lignesPage = lignesMappees.slice(pagePreview * PAGE_SIZE, (pagePreview + 1) * PAGE_SIZE)
  const nbPages    = Math.ceil(lignesMappees.length / PAGE_SIZE)

  const isAGE = ["admin", "admin_national", "consultant", "responsable_regional"].includes(roleAGE)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-wrapper">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
          background: toast.type === "success" ? "#2F7D5C" : "#B91C1C",
          color: "white", padding: "12px 20px", borderRadius: "8px",
          fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "16px" }} />
          {toast.message}
        </div>
      )}

      {/* En-tête */}
      <div style={{ marginBottom: "24px" }}>
        <button
         onClick={() => navigate(
            cible === "biens"
              ? "/metier/campagnes"
              : isAGE ? "/metier/portefeuille" : "/client/actifs"
          )}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "12px", padding: 0, display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit", marginBottom: "12px" }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: "13px" }} />
          {cible === "biens" ? "Campagnes" : isAGE ? "Portefeuille" : "Mes actifs"}
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Import portefeuille
        </h1>
        <p style={{ fontSize: "13px", color: "#6B7280" }}>
          Importez vos biens ou actifs depuis un fichier CSV ou Excel
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "28px" }}>
        {[
          { n: 1, label: "Configuration" },
          { n: 2, label: "Fichier"       },
          { n: 3, label: "Mapping"       },
          { n: 4, label: "Import"        },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700,
                background: etape > s.n ? "#2F7D5C" : etape === s.n ? "#B25C2A" : "#E2DDD8",
                color: etape >= s.n ? "white" : "#9CA3AF",
                flexShrink: 0,
              }}>
                {etape > s.n ? <i className="ti ti-check" style={{ fontSize: "13px" }} /> : s.n}
              </div>
              <span style={{
                fontSize: "12px", fontWeight: etape === s.n ? 600 : 400,
                color: etape === s.n ? "#B25C2A" : etape > s.n ? "#2F7D5C" : "#9CA3AF",
              }}>
                {s.label}
              </span>
            </div>
            {i < 3 && (
              <div style={{ flex: 1, height: "1px", background: etape > s.n ? "#2F7D5C" : "#E2DDD8", margin: "0 8px" }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── ÉTAPE 1 — Configuration ── */}
      {etape === 1 && (
        <div className="card" style={{ padding: "24px", maxWidth: "640px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "20px" }}>
            Configuration de l'import
          </div>

          {/* Cible */}
          <div style={{ marginBottom: "20px" }}>
            <label style={lStyle}>Table cible</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {([
                { val: "biens",  label: "Biens",  desc: "Portefeuille campagnes AGE", icon: "ti-home" },
                { val: "actifs", label: "Actifs", desc: "Patrimoine client B2B",       icon: "ti-building" },
              ] as const).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setCible(opt.val)}
                  style={{
                    padding: "14px 16px", borderRadius: "8px", cursor: "pointer",
                    border: `2px solid ${cible === opt.val ? "#B25C2A" : "#E2DDD8"}`,
                    background: cible === opt.val ? "#F9F0EA" : "#FFFFFF",
                    textAlign: "left", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <i className={`ti ${opt.icon}`} style={{ fontSize: "15px", color: cible === opt.val ? "#B25C2A" : "#9CA3AF" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: cible === opt.val ? "#B25C2A" : "#111827" }}>
                      {opt.label}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div style={{ marginBottom: "20px" }}>
            <label style={lStyle}>Mode d'import</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {([
                { val: "libre",    label: "Import libre",                desc: "Les biens/actifs sont ajoutés au portefeuille général",         icon: "ti-database" },
                { val: "campagne", label: "Rattaché à une campagne",     desc: "Les lignes sont automatiquement ajoutées au pipeline de suivi", icon: "ti-speakerphone" },
              ] as const).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setMode(opt.val)}
                  style={{
                    padding: "14px 16px", borderRadius: "8px", cursor: "pointer",
                    border: `2px solid ${mode === opt.val ? "#B25C2A" : "#E2DDD8"}`,
                    background: mode === opt.val ? "#F9F0EA" : "#FFFFFF",
                    textAlign: "left", fontFamily: "inherit",
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    transition: "all 0.15s",
                  }}
                >
                  <i className={`ti ${opt.icon}`} style={{ fontSize: "16px", color: mode === opt.val ? "#B25C2A" : "#9CA3AF", marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: mode === opt.val ? "#B25C2A" : "#111827", marginBottom: "2px" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sélecteur campagne */}
          {mode === "campagne" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={lStyle}>Campagne cible</label>
              {campagnes.length === 0 ? (
                <div style={{ padding: "12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", fontSize: "12px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: "14px", color: "#D97706" }} />
                  Aucune campagne en cours
                </div>
              ) : (
                <select
                  value={campagneId}
                  onChange={e => setCampagneId(e.target.value)}
                  style={{ ...iStyle, cursor: "pointer" }}
                >
                  <option value="">Choisir une campagne…</option>
                  {campagnes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom}{c.zone_geo ? ` — ${c.zone_geo}` : ""}{c.date_debut ? ` (${formatDate(c.date_debut)})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-primary" onClick={validerEtape1}>
              Continuer
              <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} />
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 — Upload fichier ── */}
      {etape === 2 && (
        <div style={{ maxWidth: "640px" }}>
          {/* Zone de drop */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? "#B25C2A" : "#E2DDD8"}`,
              borderRadius: "12px",
              padding: "48px 32px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragOver ? "#F9F0EA" : "#FAFAF9",
              transition: "all 0.15s",
              marginBottom: "16px",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <i className="ti ti-file-spreadsheet" style={{ fontSize: "40px", color: isDragOver ? "#B25C2A" : "#C9C3BB", display: "block", marginBottom: "12px" }} />
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
              {isDragOver ? "Déposez le fichier ici" : "Glissez votre fichier ou cliquez pour parcourir"}
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
              Formats acceptés : CSV (UTF-8), Excel (.xlsx, .xls) · Taille max 50 Mo
            </div>
          </div>

          {/* Modèle à télécharger */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-download" style={{ fontSize: "14px", color: "#2F7D5C" }} />
              <span style={{ fontSize: "12px", color: "#0F6E56", fontWeight: 500 }}>
                Téléchargez le modèle CSV pour {cible === "biens" ? "les biens" : "les actifs"}
              </span>
            </div>
            <button
              onClick={() => telechargerModele()}
              style={{ fontSize: "11px", color: "#2F7D5C", background: "none", border: "1px solid #2F7D5C", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
            >
              Télécharger
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
            <button className="btn-ghost" onClick={() => setEtape(1)}>
              <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 — Mapping colonnes ── */}
      {etape === 3 && (
        <div style={{ maxWidth: "800px" }}>
          <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Correspondance des colonnes</div>
                <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                  {lignesBrutes.length} ligne{lignesBrutes.length > 1 ? "s" : ""} détectée{lignesBrutes.length > 1 ? "s" : ""} · {entetes.length} colonne{entetes.length > 1 ? "s" : ""}
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "#6B7280", background: "#F4F3F0", padding: "3px 10px", borderRadius: "6px" }}>
                {fichier?.name}
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F4F3F0" }}>
                  <th style={thStyle}>Champ plateforme</th>
                  <th style={thStyle}>Obligatoire</th>
                  <th style={thStyle}>Colonne CSV</th>
                  <th style={thStyle}>Aperçu</th>
                </tr>
              </thead>
              <tbody>
                {colonnes.map(col => {
                  const header = mapping[col.champ]
                  const apercu = header ? lignesBrutes[0]?.[header] : null
                  return (
                    <tr key={col.champ} style={{ borderBottom: "1px solid #E2DDD8" }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>
                        {col.label}
                      </td>
                      <td style={tdStyle}>
                        {col.obligatoire
                          ? <span style={{ fontSize: "10px", color: "#B91C1C", fontWeight: 600 }}>Requis</span>
                          : <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Optionnel</span>
                        }
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={mapping[col.champ] || ""}
                          onChange={e => setMapping(prev => ({ ...prev, [col.champ]: e.target.value }))}
                          style={{ ...iStyle, fontSize: "12px", padding: "5px 8px" }}
                        >
                          <option value="">— Non mappé —</option>
                          {entetes.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, fontSize: "11px", color: "#6B7280", fontFamily: "JetBrains Mono, monospace", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {apercu || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setEtape(2)}>
              <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
            </button>
            <button className="btn-primary" onClick={genererPrevisualisation}>
              Prévisualiser
              <i className="ti ti-eye" style={{ fontSize: "14px" }} />
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 — Prévisualisation + import ── */}
      {etape === 4 && !resultat && (
        <div>
          {/* Stats */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {[
              { label: "Total",    value: statsPreview.total,    icon: "ti-file-text",   color: "#111827", bg: "#F4F3F0"  },
              { label: "À importer", value: statsPreview.ok,     icon: "ti-circle-check",color: "#2F7D5C", bg: "#F0FDF4" },
              { label: "Doublons", value: statsPreview.doublons, icon: "ti-copy",        color: "#D97706", bg: "#FFFBEB" },
              { label: "Erreurs",  value: statsPreview.erreurs,  icon: "ti-alert-circle",color: "#B91C1C", bg: "#FEF2F2" },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", minWidth: "120px" }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: "16px", color: k.color }} />
                <div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "18px", fontWeight: 700, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: "10px", color: "#9CA3AF" }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau prévisualisation */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>
                Prévisualisation — {Math.min(PAGE_SIZE, lignesMappees.length)} / {lignesMappees.length} lignes
              </span>
              <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                Les doublons sont ignorés par défaut — cliquez sur la ligne pour choisir
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F4F3F0" }}>
                    <th style={{ ...thStyle, width: "40px" }}>#</th>
                    <th style={thStyle}>Statut</th>
                    {colonnes.filter(c => mapping[c.champ]).map(c => (
                      <th key={c.champ} style={thStyle}>{c.label}</th>
                    ))}
                    <th style={thStyle}>Action doublon</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesPage.map(ligne => {
                    const rowBg = ligne.statut === "erreur" ? "#FEF2F2" : ligne.statut === "doublon" ? "#FFFBEB" : "transparent"
                    return (
                      <tr key={ligne.index} style={{ borderBottom: "1px solid #E2DDD8", background: rowBg }}>
                        <td style={{ ...tdStyle, color: "#9CA3AF", fontSize: "11px" }}>{ligne.index + 1}</td>
                        <td style={tdStyle}>
                          {ligne.statut === "ok" && (
                            <span style={{ fontSize: "10px", color: "#2F7D5C", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                              <i className="ti ti-circle-check" /> OK
                            </span>
                          )}
                          {ligne.statut === "doublon" && (
                            <span style={{ fontSize: "10px", color: "#D97706", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                              <i className="ti ti-copy" /> Doublon
                            </span>
                          )}
                          {ligne.statut === "erreur" && (
                            <span style={{ fontSize: "10px", color: "#B91C1C", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }} title={ligne.erreurs.join(", ")}>
                              <i className="ti ti-alert-circle" /> Erreur
                            </span>
                          )}
                        </td>
                        {colonnes.filter(c => mapping[c.champ]).map(c => (
                          <td key={c.champ} style={{ ...tdStyle, fontSize: "12px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {String(ligne.donnees[c.champ] ?? "—")}
                          </td>
                        ))}
                        <td style={tdStyle}>
                          {ligne.statut === "doublon" ? (
                            <button
                              onClick={() => toggleActionDoublon(ligne.index)}
                              style={{
                                fontSize: "10px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", border: "none",
                                background: ligne.actionDoublon === "ignorer" ? "#F4F3F0" : "#E6F1FB",
                                color: ligne.actionDoublon === "ignorer" ? "#6B7280" : "#0369A1",
                              }}
                            >
                              {ligne.actionDoublon === "ignorer" ? "Ignorer" : "Mettre à jour"}
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {nbPages > 1 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Page {pagePreview + 1} / {nbPages}</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => setPagePreview(p => Math.max(0, p - 1))} disabled={pagePreview === 0} style={btnPageStyle}>
                    <i className="ti ti-chevron-left" style={{ fontSize: "12px" }} />
                  </button>
                  <button onClick={() => setPagePreview(p => Math.min(nbPages - 1, p + 1))} disabled={pagePreview === nbPages - 1} style={btnPageStyle}>
                    <i className="ti ti-chevron-right" style={{ fontSize: "12px" }} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {statsPreview.erreurs > 0 && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "12px", color: "#991B1B", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="ti ti-alert-circle" style={{ fontSize: "14px" }} />
              {statsPreview.erreurs} ligne{statsPreview.erreurs > 1 ? "s" : ""} en erreur seront ignorées à l'import.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => setEtape(3)}>
              <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
            </button>
            <button
              className="btn-primary"
              onClick={lancerImport}
              disabled={importEnCours || statsPreview.ok + statsPreview.doublons === 0}
            >
              {importEnCours
                ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: "14px" }} /> Import en cours…</>
                : <><i className="ti ti-upload" style={{ fontSize: "14px" }} /> Lancer l'import ({statsPreview.ok + lignesMappees.filter(l => l.statut === "doublon" && l.actionDoublon === "mettre_a_jour").length} lignes)</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Résultat import ── */}
      {resultat && (
        <div style={{ maxWidth: "480px" }}>
          <div className="card" style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "28px", color: "#2F7D5C" }} />
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
              Import terminé
            </div>
            <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px" }}>
              {mode === "campagne" && campagneId
                ? `Les lignes importées ont été ajoutées au pipeline de la campagne sélectionnée.`
                : `Les données ont été ajoutées au portefeuille.`
              }
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "24px" }}>
              {[
                { label: "Insérés",      value: resultat.inseres,    color: "#2F7D5C", bg: "#F0FDF4" },
                { label: "Mis à jour",   value: resultat.mis_a_jour, color: "#0369A1", bg: "#EFF6FF" },
                { label: "Ignorés",      value: resultat.ignores,    color: "#D97706", bg: "#FFFBEB" },
                { label: "Erreurs",      value: resultat.erreurs,    color: "#B91C1C", bg: "#FEF2F2" },
              ].map((k, i) => (
                <div key={i} style={{ background: k.bg, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "22px", fontWeight: 700, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              {mode === "campagne" && campagneId && (
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/metier/campagnes/${campagneId}/pipeline`)}
                >
                  <i className="ti ti-layout-kanban" style={{ fontSize: "14px" }} />
                  Voir le pipeline
                </button>
              )}
              <button
                  className="btn-ghost"
                  onClick={() => navigate(
                    cible === "biens"
                      ? "/metier/campagnes"
                      : isAGE ? "/metier/portefeuille" : "/client/actifs"
                  )}
                >
                  {cible === "biens" ? "Campagnes" : isAGE ? "Portefeuille" : "Mes actifs"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── Téléchargement modèle CSV ──
  function telechargerModele() {
    const headers = colonnes.map(c => c.champ)
    const exemple = colonnes.map(c => {
      if (c.champ === "adresse")           return "12 rue de la Paix"
      if (c.champ === "ville")             return "Bordeaux"
      if (c.champ === "code_postal")       return "33000"
      if (c.champ === "type_bien")         return "Bureaux"
      if (c.champ === "nom")               return "Siège social Bordeaux"
      if (c.champ === "surface")           return "1200"
      if (c.champ === "valeur_marche")     return "850000"
      if (c.champ === "annee_construction")return "1985"
      if (c.champ === "siren")             return "123456789"
      return ""
    })
    const csv = [headers.join(";"), exemple.join(";")].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `modele_import_${cible}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const lStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, color: "#6B7280",
  marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.07em",
}

const iStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #E2DDD8",
  borderRadius: "7px", fontSize: "13px", color: "#111827",
  background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px", fontSize: "11px", fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.06em",
  color: "#6B7280", textAlign: "left", whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "10px 16px", fontSize: "13px", color: "#111827",
}

const btnPageStyle: React.CSSProperties = {
  width: "28px", height: "28px", border: "1px solid #E2DDD8",
  borderRadius: "6px", background: "#F4F3F0", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6B7280",
}