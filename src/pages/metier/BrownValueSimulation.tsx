/**
 * BrownValueSimulation.tsx
 * Point d'entrée du module Brown Value depuis le menu Finance (P3-14)
 * 3 modes : actif existant / saisie libre d'adresse / import CSV multi-adresses
 */

import React, { useState, useEffect, useRef } from "react"
import { Home, MapPin, UploadCloud, Search, ArrowLeft, CheckCircle2, FileWarning, History, Eye, Pencil, Save, Paperclip } from "lucide-react"
import { supabase } from "../../lib/supabase"
import BrownValueWizard from "../../components/BrownValueWizard"
import { getImpactNetStyle, formatPct, formatEuros } from "../../lib/brownValueEngine"

// ─── Tokens (socle + module Brown Value) ───────────────────────────────────
const T = {
  brown: "#B25C2A", brownLight: "#FDF3EC", brownBorder: "#E8C9B0",
  slate: "#1F2937", offWhite: "#F8F7F4", white: "#FFFFFF",
  stone: "#E5E1DA", stone500: "#78716C",
}

type Mode = "choix" | "actif" | "libre" | "csv"

interface ActifLite {
  id: string
  nom: string
  ville: string | null
  valeur_marche: string | number | null
}

// Mode CSV dédié (option B) — parsing local, aucune écriture dans biens/actifs,
// distinct du wizard d'import portefeuille P1-02 (ImportPortefeuille.tsx) qui crée
// réellement des lignes en base et n'est donc pas réutilisable ici tel quel.
interface LigneCSV {
  nomBien: string
  adresse: string
  codePostal: string
  ville: string
  valeurMarche: string
  valide: boolean
  erreur?: string
}

function normaliserEntete(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}

// ─── Écran de choix du point d'entrée ──────────────────────────────────────
function EcranChoix({ onChoisir, onHistorique }: { onChoisir: (m: Mode) => void; onHistorique: () => void }) {
  const cartes = [
    { mode: "actif" as Mode, icon: Search, titre: "Actif existant", desc: "Sélectionner un bien déjà présent dans le portefeuille" },
    { mode: "libre" as Mode, icon: MapPin, titre: "Adresse libre", desc: "Simuler sur une adresse sans actif rattaché" },
    { mode: "csv" as Mode, icon: UploadCloud, titre: "Import CSV", desc: "Traiter plusieurs adresses à la suite depuis un fichier" },
  ]
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "10px", background: T.brownLight, display: "flex", alignItems: "center", justifyContent: "center", color: T.brown, border: `1px solid ${T.brownBorder}` }}>
          <Home size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "17px", color: T.slate }}>Brown Value</div>
          <div style={{ fontSize: "12px", color: T.stone500 }}>Décote climatique — choisir un point d'entrée</div>
        </div>
        <button
          onClick={onHistorique}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px",
            background: T.white, border: `1px solid ${T.stone}`, borderRadius: "8px",
            padding: "8px 14px", fontSize: "12px", fontWeight: 600, color: T.slate,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <History size={14} /> Historique
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {cartes.map(c => {
          const Icn = c.icon
          return (
            <button
              key={c.mode}
              onClick={() => onChoisir(c.mode)}
              style={{
                textAlign: "left", background: T.white, border: `1px solid ${T.stone}`,
                borderRadius: "12px", padding: "20px", cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)", fontFamily: "inherit",
                display: "flex", flexDirection: "column", gap: "12px",
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)")}
            >
              <div style={{ width: 36, height: 36, borderRadius: "8px", background: T.brownLight, display: "flex", alignItems: "center", justifyContent: "center", color: T.brown }}>
                <Icn size={18} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: T.slate }}>{c.titre}</div>
              <div style={{ fontSize: "12px", color: T.stone500, lineHeight: 1.4 }}>{c.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sélection d'un actif existant ──────────────────────────────────────────
function EcranSelectionActif({ onSelect, onRetour }: { onSelect: (actif: ActifLite) => void; onRetour: () => void }) {
  const [recherche, setRecherche] = useState("")
  const [actifs, setActifs] = useState<ActifLite[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let annule = false
    async function chercher() {
      setLoading(true)
      let q = supabase.from("actifs").select("id, nom, ville, valeur_marche").eq("actif", true).limit(20)
      if (recherche.trim()) q = q.ilike("nom", `%${recherche.trim()}%`)
      const { data } = await q
      if (!annule) { setActifs(data || []); setLoading(false) }
    }
    const t = setTimeout(chercher, 250)
    return () => { annule = true; clearTimeout(t) }
  }, [recherche])

  return (
    <div>
      <BoutonRetour onRetour={onRetour} />
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "16px", color: T.brown }}>Sélectionner un actif</h3>
      <input
        type="text" placeholder="Rechercher par nom…" value={recherche}
        onChange={e => setRecherche(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.stone}`, borderRadius: "8px", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" }}
      />
      {loading && <div style={{ color: T.stone500, fontSize: "13px" }}>Recherche…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {actifs.map(a => (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", background: T.white, border: `1px solid ${T.stone}`,
              borderRadius: "8px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "13px", color: T.slate }}>{a.nom}</div>
              <div style={{ fontSize: "12px", color: T.stone500 }}>{a.ville || "—"}</div>
            </div>
            <div style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: T.stone500 }}>
              {a.valeur_marche ? `${Number(a.valeur_marche).toLocaleString("fr-FR")} €` : ""}
            </div>
          </button>
        ))}
        {!loading && actifs.length === 0 && (
          <div style={{ color: T.stone500, fontSize: "13px", padding: "20px", textAlign: "center" }}>Aucun actif trouvé.</div>
        )}
      </div>
    </div>
  )
}

// ─── Saisie libre d'adresse ─────────────────────────────────────────────────
function EcranAdresseLibre({ onValider, onRetour }: {
  onValider: (champs: { nomBien: string; adresse: string; codePostal: string; ville: string; valeurMarche: string }) => void
  onRetour: () => void
}) {
  const [nomBien, setNomBien] = useState("")
  const [adresse, setAdresse] = useState("")
  const [codePostal, setCodePostal] = useState("")
  const [ville, setVille] = useState("")
  const [valeurMarche, setValeurMarche] = useState("")

  const champStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: `1px solid ${T.stone}`, borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: T.stone500, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }

  const valide = nomBien.trim() && adresse.trim() && codePostal.trim() && ville.trim()

  return (
    <div>
      <BoutonRetour onRetour={onRetour} />
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "16px", color: T.brown }}>Saisie libre d'adresse</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
        <div>
          <label style={labelStyle}>Nom du bien</label>
          <input style={champStyle} value={nomBien} onChange={e => setNomBien(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Adresse</label>
          <input style={champStyle} value={adresse} onChange={e => setAdresse(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Code postal</label>
            <input style={champStyle} value={codePostal} onChange={e => setCodePostal(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input style={champStyle} value={ville} onChange={e => setVille(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Valeur de marché estimée (€)</label>
          <input style={champStyle} type="number" value={valeurMarche} onChange={e => setValeurMarche(e.target.value)} />
        </div>
        <button
          disabled={!valide}
          onClick={() => onValider({ nomBien, adresse, codePostal, ville, valeurMarche })}
          style={{
            background: valide ? T.brown : T.stone, color: T.white, border: "none",
            padding: "12px 20px", borderRadius: "8px", fontWeight: 700, fontSize: "14px",
            cursor: valide ? "pointer" : "not-allowed", alignSelf: "flex-start",
          }}
        >
          Lancer la simulation
        </button>
      </div>
    </div>
  )
}

// ─── Import CSV dédié (option B) ────────────────────────────────────────────
// Parsing local uniquement — 5 colonnes (nom, adresse, code_postal, ville,
// valeur_marche) — ne crée aucune ligne dans biens/actifs. Distinct du wizard
// P1-02 (ImportPortefeuille.tsx), qui persiste réellement des actifs.
function EcranImportCSV({ onLancer, onRetour }: {
  onLancer: (lignes: LigneCSV[]) => void
  onRetour: () => void
}) {
  const [lignes, setLignes] = useState<LigneCSV[] | null>(null)
  const [nomFichier, setNomFichier] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [erreurLecture, setErreurLecture] = useState<string | null>(null)

  async function parserFichier(file: File) {
    setErreurLecture(null)
    setNomFichier(file.name)
    const Papa = (await import("papaparse")).default
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results: any) => {
        const headers = (results.meta.fields as string[]) || []
        const trouver = (candidats: string[]) =>
          headers.find(h => candidats.includes(normaliserEntete(h)))

        const hNom     = trouver(["nom", "nom du bien", "nom_bien", "nombien"])
        const hAdresse = trouver(["adresse"])
        const hCP      = trouver(["code postal", "code_postal", "cp"])
        const hVille   = trouver(["ville"])
        const hValeur  = trouver(["valeur marche", "valeur_marche", "valeur de marché (€)", "valeur"])

        const parsed: LigneCSV[] = (results.data as Record<string, string>[]).map(row => {
          const nomBien      = hNom ? (row[hNom] || "").trim() : ""
          const adresse      = hAdresse ? (row[hAdresse] || "").trim() : ""
          const codePostal   = hCP ? (row[hCP] || "").trim() : ""
          const ville        = hVille ? (row[hVille] || "").trim() : ""
          const valeurMarche = hValeur ? (row[hValeur] || "").trim() : ""
          const manquants = [
            !nomBien && "nom", !adresse && "adresse", !codePostal && "code postal", !ville && "ville",
          ].filter(Boolean) as string[]
          return {
            nomBien, adresse, codePostal, ville, valeurMarche,
            valide: manquants.length === 0,
            erreur: manquants.length ? `Champs manquants : ${manquants.join(", ")}` : undefined,
          }
        })
        setLignes(parsed)
      },
      error: () => setErreurLecture("Erreur de lecture du fichier."),
    })
  }

  const nbValides = lignes?.filter(l => l.valide).length ?? 0
  const nbErreurs = lignes?.filter(l => !l.valide).length ?? 0

  return (
    <div>
      <BoutonRetour onRetour={onRetour} />
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px", color: T.brown }}>Import CSV multi-adresses</h3>
      <p style={{ fontSize: "12px", color: T.stone500, marginBottom: "16px" }}>
        Colonnes attendues : <strong>nom</strong>, <strong>adresse</strong>, <strong>code_postal</strong>, <strong>ville</strong> (obligatoires), <strong>valeur_marche</strong> (optionnel).
        Ce parsing est local et ne crée aucun actif en base — chaque ligne est traitée par le wizard Brown Value l'une après l'autre.
      </p>

      {!lignes && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) parserFichier(f) }}
          onClick={() => document.getElementById("bv-csv-input")?.click()}
          style={{
            border: `2px dashed ${isDragOver ? T.brown : T.stone}`, borderRadius: "12px",
            padding: "40px 24px", textAlign: "center", cursor: "pointer",
            background: isDragOver ? T.brownLight : T.white,
          }}
        >
          <input
            id="bv-csv-input" type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) parserFichier(f) }}
          />
          <UploadCloud size={32} color={isDragOver ? T.brown : T.stone500} style={{ marginBottom: "10px" }} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: T.slate }}>
            {isDragOver ? "Déposez le fichier ici" : "Glissez un CSV ou cliquez pour parcourir"}
          </div>
          {erreurLecture && <div style={{ fontSize: "12px", color: "#B91C1C", marginTop: "8px" }}>{erreurLecture}</div>}
        </div>
      )}

      {lignes && (
        <div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: "#2F7D5C", fontWeight: 600 }}>
              {nbValides} ligne{nbValides > 1 ? "s" : ""} prête{nbValides > 1 ? "s" : ""}
            </div>
            {nbErreurs > 0 && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: "#B91C1C", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <FileWarning size={13} /> {nbErreurs} ligne{nbErreurs > 1 ? "s" : ""} ignorée{nbErreurs > 1 ? "s" : ""}
              </div>
            )}
            <div style={{ marginLeft: "auto", fontSize: "11px", color: T.stone500, alignSelf: "center" }}>{nomFichier}</div>
          </div>

          <div style={{ maxHeight: "260px", overflowY: "auto", border: `1px solid ${T.stone}`, borderRadius: "8px", marginBottom: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: T.offWhite, position: "sticky", top: 0 }}>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Nom</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Adresse</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Ville</th>
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.stone}`, background: l.valide ? "transparent" : "#FEF2F2" }}>
                    <td style={{ padding: "8px 12px" }}>{l.nomBien || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{l.adresse || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{l.ville || "—"}</td>
                    <td style={{ padding: "8px 12px", color: l.valide ? "#2F7D5C" : "#B91C1C", fontWeight: 600 }}>
                      {l.valide ? "OK" : l.erreur}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            disabled={nbValides === 0}
            onClick={() => onLancer(lignes.filter(l => l.valide))}
            style={{
              background: nbValides > 0 ? T.brown : T.stone, color: T.white, border: "none",
              padding: "12px 20px", borderRadius: "8px", fontWeight: 700, fontSize: "14px",
              cursor: nbValides > 0 ? "pointer" : "not-allowed",
            }}
          >
            Lancer les {nbValides} simulation{nbValides > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Historique des dossiers ────────────────────────────────────────────────
// Réutilise getImpactNetStyle/formatPct/formatEuros de brownValueEngine.ts —
// mêmes seuils de couleur d'impact que dans le wizard (PARTIE 3 du socle).
interface LigneHistorique {
  id: string
  created_at: string
  actif_id: string | null
  nom_bien: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  contexte: string
  finalise: boolean
  impact_net: number | null
  valeur_ajustee: number | null
  pdf_justificatif_path: string | null
  actifs: { nom: string } | { nom: string }[] | null
}

function sanitizePdfFilename(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_")
}

const thHist: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#78716C", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.04em" }
const tdHist: React.CSSProperties = { padding: "8px 12px" }

// ─── Détail d'un dossier (Voir) ─────────────────────────────────────────────
function EcranDetailDossier({ caseId, onRetour }: { caseId: string; onRetour: () => void }) {
  const [dossier, setDossier] = useState<any>(null)
  const [hazards, setHazards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data: c } = await supabase.from("brown_value_cases").select("*").eq("id", caseId).maybeSingle()
      const { data: h } = await supabase.from("brown_value_hazards").select("*").eq("case_id", caseId).order("ordre", { ascending: true })
      setDossier(c)
      setHazards(h || [])
      setLoading(false)
    }
    charger()
  }, [caseId])

  if (loading) return <div style={{ color: T.stone500, fontSize: "13px" }}>Chargement…</div>
  if (!dossier) return <div style={{ color: T.stone500, fontSize: "13px" }}>Dossier introuvable.</div>

  const impactStyle = dossier.impact_net != null ? getImpactNetStyle(Number(dossier.impact_net)) : null

  return (
    <div>
      <BoutonRetour onRetour={onRetour} />
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px", color: T.brown }}>
        {dossier.nom_bien || "Dossier"}
      </h3>
      <div style={{ fontSize: "12px", color: T.stone500, marginBottom: "20px" }}>
        {dossier.adresse ? `${dossier.adresse}, ${dossier.code_postal || ""} ${dossier.ville || ""}` : "—"}
        {" — "}Contexte : {dossier.contexte} — {dossier.finalise ? "Finalisé" : "Brouillon"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: T.white, border: `1px solid ${T.stone}`, borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: T.stone500, textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>Valeur de marché</div>
          <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(Number(dossier.valeur_marche || 0))}</div>
        </div>
        <div style={{ background: T.white, border: `1px solid ${T.stone}`, borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: T.stone500, textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>Décote finale ({dossier.methode_finale})</div>
          <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(Number(dossier.decote_finale || 0))}</div>
        </div>
        <div style={{ background: impactStyle?.background || T.white, border: `2px solid ${impactStyle?.color || T.stone}`, borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", color: T.stone500, textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>Impact net</div>
          <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: impactStyle?.color }}>
            {dossier.impact_net != null ? formatPct(Number(dossier.impact_net)) : "—"}
          </div>
        </div>
      </div>

      <div style={{ background: T.white, border: `1px solid ${T.stone}`, borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>Contribution par aléa</div>
        {hazards.map((h, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.offWhite}` }}>
            <span style={{ fontSize: "13px", color: T.stone500 }}>{h.aleas}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(Number(h.cout_total_alea || 0))}</span>
          </div>
        ))}
        {hazards.length === 0 && <div style={{ fontSize: "12px", color: T.stone500 }}>Aucun détail par aléa enregistré.</div>}
      </div>
    </div>
  )
}

// ─── Modification des champs libres (Modifier — dossiers sans actif_id) ────
// Édition des seuls champs nom/adresse/code_postal/ville, sans recalcul :
// un dossier sans actif_id n'a pas de moteur à rejouer, ce sont des métadonnées.
function EcranEditLibre({ dossier, onRetour, onSaved }: {
  dossier: LigneHistorique
  onRetour: () => void
  onSaved: () => void
}) {
  const [nomBien, setNomBien] = useState(dossier.nom_bien || "")
  const [adresse, setAdresse] = useState(dossier.adresse || "")
  const [codePostal, setCodePostal] = useState(dossier.code_postal || "")
  const [ville, setVille] = useState(dossier.ville || "")
  const [saving, setSaving] = useState(false)

  const champStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: `1px solid ${T.stone}`, borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: T.stone500, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }
  const valide = nomBien.trim() && adresse.trim() && codePostal.trim() && ville.trim()

  async function enregistrer() {
    setSaving(true)
    await supabase
      .from("brown_value_cases")
      .update({ nom_bien: nomBien, adresse, code_postal: codePostal, ville })
      .eq("id", dossier.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div>
      <BoutonRetour onRetour={onRetour} />
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px", color: T.brown }}>Modifier les champs du dossier</h3>
      <p style={{ fontSize: "12px", color: T.stone500, marginBottom: "16px" }}>
        Ce dossier n'est rattaché à aucun actif — seuls les champs d'identification sont modifiables ici. Le calcul (décote, impact net) n'est pas rejoué.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
        <div>
          <label style={labelStyle}>Nom du bien</label>
          <input style={champStyle} value={nomBien} onChange={e => setNomBien(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Adresse</label>
          <input style={champStyle} value={adresse} onChange={e => setAdresse(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Code postal</label>
            <input style={champStyle} value={codePostal} onChange={e => setCodePostal(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input style={champStyle} value={ville} onChange={e => setVille(e.target.value)} />
          </div>
        </div>
        <button
          disabled={!valide || saving}
          onClick={enregistrer}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: valide ? T.brown : T.stone, color: T.white, border: "none",
            padding: "12px 20px", borderRadius: "8px", fontWeight: 700, fontSize: "14px",
            cursor: valide ? "pointer" : "not-allowed", alignSelf: "flex-start",
          }}
        >
          <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  )
}

function EcranHistorique({ onRetour, onOuvrirActif }: {
  onRetour: () => void
  onOuvrirActif: (actif: ActifLite) => void
}) {
  const [lignes, setLignes] = useState<LigneHistorique[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editCase, setEditCase] = useState<LigneHistorique | null>(null)
  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null)
  const [uploadingPdfId, setUploadingPdfId] = useState<string | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from("brown_value_cases")
      .select("id, created_at, actif_id, nom_bien, adresse, code_postal, ville, contexte, finalise, impact_net, valeur_ajustee, pdf_justificatif_path, actifs(nom)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
    setLignes((data as any) || [])
    setLoading(false)
  }

  function declencherUploadPdf(caseId: string) {
    setPdfTargetId(caseId)
    pdfInputRef.current?.click()
  }

  async function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pdfTargetId) return
    setUploadingPdfId(pdfTargetId)
    const nomSanitize = sanitizePdfFilename(file.name)
    const path = `brown-value/${pdfTargetId}/${Date.now()}_${nomSanitize}`
    const { error } = await supabase.storage.from("documents-clients").upload(path, file)
    if (!error) {
      await supabase.from("brown_value_cases").update({ pdf_justificatif_path: path }).eq("id", pdfTargetId)
      await charger()
    }
    setUploadingPdfId(null)
    setPdfTargetId(null)
    if (pdfInputRef.current) pdfInputRef.current.value = ""
  }

  async function ouvrirPdf(path: string) {
    const { data } = await supabase.storage.from("documents-clients").createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  if (detailId) {
    return <EcranDetailDossier caseId={detailId} onRetour={() => setDetailId(null)} />
  }

  if (editCase) {
    return (
      <EcranEditLibre
        dossier={editCase}
        onRetour={() => setEditCase(null)}
        onSaved={() => { setEditCase(null); charger() }}
      />
    )
  }

  return (
    <div>
      <BoutonRetour onRetour={onRetour} />
      <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px", color: T.brown }}>Historique des dossiers</h3>
      <p style={{ fontSize: "12px", color: T.stone500, marginBottom: "16px" }}>
        50 derniers dossiers, tous points d'entrée confondus.
      </p>

      {loading && <div style={{ color: T.stone500, fontSize: "13px" }}>Chargement…</div>}
      {!loading && lignes && lignes.length === 0 && (
        <div style={{ color: T.stone500, fontSize: "13px", padding: "20px", textAlign: "center" }}>Aucun dossier.</div>
      )}
      {!loading && lignes && lignes.length > 0 && (
        <div style={{ border: `1px solid ${T.stone}`, borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: T.offWhite }}>
                <th style={thHist}>Bien</th>
                <th style={thHist}>Ville</th>
                <th style={thHist}>Contexte</th>
                <th style={thHist}>Statut</th>
                <th style={thHist}>Impact net</th>
                <th style={thHist}>Valeur ajustée</th>
                <th style={thHist}>Date</th>
                <th style={thHist}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => {
                const actifRel = Array.isArray(l.actifs) ? l.actifs[0] : l.actifs
                const nom = l.nom_bien || actifRel?.nom || "—"
                const impactStyle = l.impact_net != null ? getImpactNetStyle(Number(l.impact_net)) : null
                return (
                  <tr key={l.id} style={{ borderTop: `1px solid ${T.stone}` }}>
                    <td style={tdHist}>{nom}</td>
                    <td style={tdHist}>{l.ville || "—"}</td>
                    <td style={tdHist}>{l.contexte}</td>
                    <td style={tdHist}>{l.finalise ? "Finalisé" : "Brouillon"}</td>
                    <td style={{ ...tdHist, fontFamily: "'JetBrains Mono', monospace", color: impactStyle?.color || T.slate, fontWeight: 700 }}>
                      {l.impact_net != null ? formatPct(Number(l.impact_net)) : "—"}
                    </td>
                    <td style={{ ...tdHist, fontFamily: "'JetBrains Mono', monospace" }}>
                      {l.valeur_ajustee != null ? formatEuros(Number(l.valeur_ajustee)) : "—"}
                    </td>
                    <td style={tdHist}>{new Date(l.created_at).toLocaleDateString("fr-FR")}</td>
                    <td style={tdHist}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => setDetailId(l.id)}
                          title="Voir le détail"
                          style={{ background: "none", border: `1px solid ${T.stone}`, borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: T.stone500 }}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (l.actif_id) {
                              onOuvrirActif({ id: l.actif_id, nom, ville: l.ville, valeur_marche: null })
                            } else {
                              setEditCase(l)
                            }
                          }}
                          title={l.actif_id ? "Rouvrir le wizard complet" : "Modifier les champs libres"}
                          style={{ background: "none", border: `1px solid ${T.stone}`, borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: T.brown }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => l.pdf_justificatif_path ? ouvrirPdf(l.pdf_justificatif_path) : declencherUploadPdf(l.id)}
                          disabled={uploadingPdfId === l.id}
                          title={l.pdf_justificatif_path ? "Voir le PDF justificatif" : "Attacher un PDF justificatif"}
                          style={{
                            background: l.pdf_justificatif_path ? T.brownLight : "none",
                            border: `1px solid ${l.pdf_justificatif_path ? T.brownBorder : T.stone}`,
                            borderRadius: "6px", padding: "4px 6px",
                            cursor: uploadingPdfId === l.id ? "wait" : "pointer",
                            color: l.pdf_justificatif_path ? T.brown : T.stone500,
                          }}
                        >
                          <Paperclip size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handlePdfSelected} />
    </div>
  )
}

function BoutonRetour({ onRetour }: { onRetour: () => void }) {
  return (
    <button
      onClick={onRetour}
      style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: T.stone500, fontSize: "13px", cursor: "pointer", marginBottom: "16px", padding: 0 }}
    >
      <ArrowLeft size={14} /> Changer de point d'entrée
    </button>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function BrownValueSimulation() {
  const [vue, setVue] = useState<"simulation" | "historique">("simulation")
  const [mode, setMode] = useState<Mode>("choix")
  const [actifCourant, setActifCourant] = useState<ActifLite | null>(null)
  const [champsLibres, setChampsLibres] = useState<{ nomBien: string; adresse: string; codePostal: string; ville: string; valeurMarche: string } | null>(null)

  // Mode CSV séquentiel — lignes déjà filtrées valides, traitées une à une
  const [csvLignes, setCsvLignes] = useState<LigneCSV[] | null>(null)
  const [csvIndex, setCsvIndex] = useState(0)
  const [csvTraitees, setCsvTraitees] = useState(0)
  const [csvTermine, setCsvTermine] = useState(false)

  function reinitialiser() {
    setMode("choix")
    setActifCourant(null)
    setChampsLibres(null)
    setCsvLignes(null)
    setCsvIndex(0)
    setCsvTraitees(0)
    setCsvTermine(false)
  }

  function avancerCSV(completed: boolean) {
    if (completed) setCsvTraitees(t => t + 1)
    if (!csvLignes) return
    if (csvIndex + 1 >= csvLignes.length) {
      setCsvTermine(true)
    } else {
      setCsvIndex(i => i + 1)
    }
  }

  return (
    <div style={{ background: T.offWhite, borderRadius: "16px", padding: "28px", minHeight: "400px" }}>
      {vue === "historique" && (
        <EcranHistorique
          onRetour={() => setVue("simulation")}
          onOuvrirActif={(actif) => {
            setVue("simulation")
            setMode("actif")
            setActifCourant(actif)
          }}
        />
      )}

      {vue === "simulation" && (
        <>
      {mode === "choix" && <EcranChoix onChoisir={setMode} onHistorique={() => setVue("historique")} />}

      {mode === "actif" && !actifCourant && (
        <EcranSelectionActif onSelect={setActifCourant} onRetour={reinitialiser} />
      )}
      {mode === "actif" && actifCourant && (
        <BrownValueWizard
          actifId={actifCourant.id}
          valeurMarcheInitiale={actifCourant.valeur_marche ? Number(actifCourant.valeur_marche) : undefined}
          onClose={() => reinitialiser()}
        />
      )}

      {mode === "libre" && !champsLibres && (
        <EcranAdresseLibre onValider={setChampsLibres} onRetour={reinitialiser} />
      )}
      {mode === "libre" && champsLibres && (
        <BrownValueWizard
          nomBien={champsLibres.nomBien}
          adresse={champsLibres.adresse}
          codePostal={champsLibres.codePostal}
          ville={champsLibres.ville}
          valeurMarcheInitiale={champsLibres.valeurMarche ? Number(champsLibres.valeurMarche) : undefined}
          onClose={() => reinitialiser()}
        />
      )}

      {mode === "csv" && !csvLignes && (
        <EcranImportCSV onLancer={setCsvLignes} onRetour={reinitialiser} />
      )}

      {mode === "csv" && csvLignes && !csvTermine && (
        <div key={csvIndex}>
          <div style={{ marginBottom: "16px", fontSize: "12px", color: T.stone500, fontWeight: 600 }}>
            Adresse {csvIndex + 1} / {csvLignes.length} — {csvLignes[csvIndex].nomBien}
          </div>
          <BrownValueWizard
            nomBien={csvLignes[csvIndex].nomBien}
            adresse={csvLignes[csvIndex].adresse}
            codePostal={csvLignes[csvIndex].codePostal}
            ville={csvLignes[csvIndex].ville}
            valeurMarcheInitiale={csvLignes[csvIndex].valeurMarche ? Number(csvLignes[csvIndex].valeurMarche) : undefined}
            onClose={avancerCSV}
          />
        </div>
      )}

      {mode === "csv" && csvLignes && csvTermine && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <CheckCircle2 size={40} color="#2F7D5C" style={{ marginBottom: "12px" }} />
          <div style={{ fontWeight: 700, fontSize: "16px", color: T.slate, marginBottom: "6px" }}>Import terminé</div>
          <div style={{ fontSize: "13px", color: T.stone500, marginBottom: "20px" }}>
            {csvTraitees} / {csvLignes.length} simulation{csvLignes.length > 1 ? "s" : ""} finalisée{csvTraitees > 1 ? "s" : ""}
          </div>
          <button
            onClick={reinitialiser}
            style={{ background: T.brown, color: T.white, border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
          >
            Nouvel import
          </button>
        </div>
      )}
        </>
      )}
    </div>
  )
}