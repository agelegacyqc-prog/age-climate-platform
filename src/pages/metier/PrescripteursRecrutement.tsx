// src/pages/metier/PrescripteursRecrutement.tsx
import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const SEGMENTS: Record<string, string> = {
  courtiers_assurance:     "Courtiers assurance",
  avocats_catnat:          "Avocats CatNat",
  associations_sinistres:  "Associations sinistrés",
  courtiers_travaux:       "Courtiers travaux",
  notaires:                "Notaires",
  agents_immo:             "Agents immobiliers",
  diagnostiqueurs:         "Diagnostiqueurs",
  courtiers_credit:        "Courtiers crédit",
}

const ETAPES = [
  { id: "prospect",        label: "Prospect",        color: "#78716C", bg: "#F4F3F0" },
  { id: "contact_pris",    label: "Contact pris",     color: "#0369A1", bg: "#EFF6FF" },
  { id: "contrat_envoye",  label: "Contrat envoyé",   color: "#D97706", bg: "#FFFBEB" },
  { id: "contrat_signe",   label: "Contrat signé",    color: "#8B5E34", bg: "#F5ECE1" },
  { id: "compte_active",   label: "Compte activé",    color: "#2F7D5C", bg: "#F0FDF4" },
] as const

type EtapeId = typeof ETAPES[number]["id"]

interface Prescripteur {
  id: string
  user_id: string | null
  identifiant_prescripteur: string
  raison_sociale: string
  email: string
  telephone: string | null
  segment_prescripteur: string
  date_signature_contrat: string | null
  statut_compte: "actif" | "suspendu"
  etape_pipeline: EtapeId
  created_at: string
}

function etapeInfo(id: string) {
  return ETAPES.find(e => e.id === id) || ETAPES[0]
}

function genererIdentifiant() {
  const annee = new Date().getFullYear()
  const suffixe = Math.floor(1000 + Math.random() * 9000)
  return `PRE-${annee}-${suffixe}`
}

const iStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "7px", fontSize: "13px", color: "#111827", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }

export default function PrescripteursRecrutement() {
  const [prescripteurs, setPrescripteurs] = useState<Prescripteur[]>([])
  const [loading, setLoading] = useState(true)

  const [filtreEtape, setFiltreEtape] = useState<string>("")
  const [filtreSegment, setFiltreSegment] = useState<string>("")
  const [recherche, setRecherche] = useState("")

  const [ficheOuverte, setFicheOuverte] = useState<Prescripteur | null>(null)
  const [formNouveau, setFormNouveau] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data } = await supabase
      .from("prescripteurs")
      .select("*")
      .order("created_at", { ascending: false })
    setPrescripteurs(data || [])
    setLoading(false)
  }

  const filtres = prescripteurs.filter(p => {
    if (filtreEtape && p.etape_pipeline !== filtreEtape) return false
    if (filtreSegment && p.segment_prescripteur !== filtreSegment) return false
    if (recherche && !`${p.raison_sociale} ${p.email}`.toLowerCase().includes(recherche.toLowerCase())) return false
    return true
  })

  const kpisParEtape = ETAPES.map(e => ({
    ...e,
    count: prescripteurs.filter(p => p.etape_pipeline === e.id).length,
  }))

  async function creerProspect(payload: { raison_sociale: string; email: string; telephone: string; segment_prescripteur: string }) {
    const identifiant = genererIdentifiant()
    const { error } = await supabase.from("prescripteurs").insert({
      identifiant_prescripteur: identifiant,
      raison_sociale: payload.raison_sociale,
      email: payload.email,
      telephone: payload.telephone || null,
      segment_prescripteur: payload.segment_prescripteur,
      etape_pipeline: "prospect",
      statut_compte: "suspendu",
    })
    if (!error) { setFormNouveau(false); init() }
    return error
  }

  async function changerEtape(p: Prescripteur, nouvelleEtape: EtapeId, extra?: { user_id?: string; date_signature_contrat?: string }) {
    const payload: any = { etape_pipeline: nouvelleEtape }
    if (nouvelleEtape === "contrat_signe" && extra?.date_signature_contrat) payload.date_signature_contrat = extra.date_signature_contrat
    if (nouvelleEtape === "compte_active") {
      if (!extra?.user_id) return
      payload.user_id = extra.user_id
      payload.statut_compte = "actif"
    }
    const { error } = await supabase.from("prescripteurs").update(payload).eq("id", p.id)
    if (!error) { init(); setFicheOuverte(prev => prev ? { ...prev, ...payload } : null) }
    return error
  }

  async function modifierProspect(p: Prescripteur, payload: { raison_sociale: string; email: string; telephone: string; segment_prescripteur: string }) {
    const { error } = await supabase
      .from("prescripteurs")
      .update({
        raison_sociale: payload.raison_sociale,
        email: payload.email,
        telephone: payload.telephone || null,
        segment_prescripteur: payload.segment_prescripteur,
      })
      .eq("id", p.id)
    if (!error) { init(); setFicheOuverte(prev => prev ? { ...prev, ...payload } : null) }
    return error
  }

  if (loading) return <div style={{ color: "#6B7280", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Pipeline recrutement — Prescripteurs RGA</div>
          <div style={{ fontSize: "13px", color: "#6B7280" }}>Prospection jusqu'à l'activation du compte prescripteur.</div>
        </div>
        <button
          onClick={() => setFormNouveau(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "7px", border: "none", background: "#A9713F", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
        >
          <i className="ti ti-plus" style={{ fontSize: "14px" }} />
          Nouveau prospect
        </button>
      </div>

      {/* KPIs par étape */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
        {kpisParEtape.map(e => (
          <div
            key={e.id}
            onClick={() => setFiltreEtape(prev => prev === e.id ? "" : e.id)}
            style={{ background: filtreEtape === e.id ? e.bg : "#FFFFFF", border: `1px solid ${filtreEtape === e.id ? e.color : "#E2DDD8"}`, borderRadius: "10px", padding: "14px 16px", cursor: "pointer" }}
          >
            <div style={{ fontSize: "11px", fontWeight: 500, color: e.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{e.label}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 600, color: "#111827" }}>{e.count}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          placeholder="Rechercher par raison sociale ou email…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{ ...iStyle, maxWidth: "280px" }}
        />
        <select value={filtreSegment} onChange={e => setFiltreSegment(e.target.value)} style={{ ...iStyle, maxWidth: "220px" }}>
          <option value="">Tous les segments</option>
          {Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {filtreEtape && (
          <button onClick={() => setFiltreEtape("")} style={{ fontSize: "12px", color: "#A9713F", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-x" style={{ fontSize: "12px" }} /> Filtre étape : {etapeInfo(filtreEtape).label}
          </button>
        )}
      </div>

      {/* Tableau */}
      {filtres.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <i className="ti ti-users" style={{ fontSize: "32px", color: "#9CA3AF", display: "block", marginBottom: "12px" }} />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>Aucun prescripteur</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
                {["Raison sociale", "Segment", "Étape", "Email", "Téléphone", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtres.map((p, i) => {
                const e = etapeInfo(p.etape_pipeline)
                return (
                  <tr
                    key={p.id}
                    onClick={() => setFicheOuverte(p)}
                    style={{ borderBottom: i < filtres.length - 1 ? "1px solid #E2DDD8" : "none", height: "52px", cursor: "pointer" }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = "#F9F0EA")}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0 16px", fontSize: "14px", color: "#111827", fontWeight: 500 }}>{p.raison_sociale}</td>
                    <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{SEGMENTS[p.segment_prescripteur]}</td>
                    <td style={{ padding: "0 16px" }}>
                      <span style={{ background: e.bg, color: e.color, fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>{e.label}</span>
                    </td>
                    <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{p.email}</td>
                    <td style={{ padding: "0 16px", fontSize: "13px", color: "#6B7280" }}>{p.telephone || "—"}</td>
                    <td style={{ padding: "0 16px", textAlign: "right" }}>
                      <i className="ti ti-chevron-right" style={{ fontSize: "14px", color: "#9CA3AF" }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {formNouveau && <ModalNouveauProspect onFermer={() => setFormNouveau(false)} onCreer={creerProspect} />}
      {ficheOuverte && (
        <ModalFiche
          prescripteur={ficheOuverte}
          onFermer={() => setFicheOuverte(null)}
          onChangerEtape={changerEtape}
          onModifier={modifierProspect}
        />
      )}
    </div>
  )
}

function ModalNouveauProspect({ onFermer, onCreer }: { onFermer: () => void; onCreer: (p: any) => Promise<any> }) {
  const [form, setForm] = useState({ raison_sociale: "", email: "", telephone: "", segment_prescripteur: "courtiers_assurance" })
  const [erreur, setErreur] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreer() {
    if (!form.raison_sociale || !form.email) { setErreur("Raison sociale et email sont obligatoires."); return }
    setLoading(true)
    const error = await onCreer(form)
    if (error) setErreur(error.message)
    setLoading(false)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#FFFFFF", borderRadius: "12px", width: "420px", maxWidth: "90vw", padding: "24px" }}>
        <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>Nouveau prospect prescripteur</div>
        {erreur && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#B91C1C" }}>{erreur}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Raison sociale *</label>
            <input style={iStyle} value={form.raison_sociale} onChange={e => setForm({ ...form, raison_sociale: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input style={iStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input style={iStyle} value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Segment</label>
            <select style={iStyle} value={form.segment_prescripteur} onChange={e => setForm({ ...form, segment_prescripteur: e.target.value })}>
              {Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button onClick={onFermer} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={handleCreer} disabled={loading} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: "#A9713F", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            {loading ? "Création…" : "Créer le prospect"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalFiche({
  prescripteur,
  onFermer,
  onChangerEtape,
  onModifier,
}: {
  prescripteur: Prescripteur
  onFermer: () => void
  onChangerEtape: (p: Prescripteur, e: EtapeId, extra?: any) => Promise<any>
  onModifier: (p: Prescripteur, payload: { raison_sociale: string; email: string; telephone: string; segment_prescripteur: string }) => Promise<any>
}) {
  const [dateContrat, setDateContrat] = useState("")
  const [erreur, setErreur] = useState("")
  const etapeActuelleIndex = ETAPES.findIndex(e => e.id === prescripteur.etape_pipeline)

  const [edition, setEdition] = useState(false)
  const [formEdit, setFormEdit] = useState({
    raison_sociale: prescripteur.raison_sociale,
    email: prescripteur.email,
    telephone: prescripteur.telephone || "",
    segment_prescripteur: prescripteur.segment_prescripteur,
  })
  const [erreurEdition, setErreurEdition] = useState("")
  const [loadingEdition, setLoadingEdition] = useState(false)

  function ouvrirEdition() {
    setFormEdit({
      raison_sociale: prescripteur.raison_sociale,
      email: prescripteur.email,
      telephone: prescripteur.telephone || "",
      segment_prescripteur: prescripteur.segment_prescripteur,
    })
    setErreurEdition("")
    setEdition(true)
  }

  async function enregistrerEdition() {
    if (!formEdit.raison_sociale || !formEdit.email) { setErreurEdition("Raison sociale et email sont obligatoires."); return }
    setLoadingEdition(true)
    const error = await onModifier(prescripteur, formEdit)
    setLoadingEdition(false)
    if (error) { setErreurEdition(error.message); return }
    setEdition(false)
  }

  async function progresser() {
    const prochaine = ETAPES[etapeActuelleIndex + 1]
    if (!prochaine) return
    setErreur("")
    if (prochaine.id === "contrat_signe" && !dateContrat) { setErreur("Renseignez la date de signature du contrat."); return }

    if (prochaine.id === "compte_active") {
      const { data, error } = await supabase.functions.invoke("create-prescripteur-user", {
        body: { prescripteur_id: prescripteur.id, email: prescripteur.email },
      })
      if (error || data?.error) { setErreur(data?.error || error.message); return }
      const err2 = await onChangerEtape(prescripteur, "compte_active", { user_id: data.user_id })
      if (err2) setErreur(err2.message)
      return
    }

    const error = await onChangerEtape(prescripteur, prochaine.id, { date_signature_contrat: dateContrat })
    if (error) setErreur(error.message)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#FFFFFF", borderRadius: "12px", width: "480px", maxWidth: "90vw", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>{prescripteur.raison_sociale}</div>
            <div style={{ fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: "#8B5E34" }}>{prescripteur.identifiant_prescripteur}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!edition && (
              <button onClick={ouvrirEdition} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px solid #E2DDD8", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", color: "#6B7280", fontSize: "12px", fontFamily: "inherit" }}>
                <i className="ti ti-pencil" style={{ fontSize: "13px" }} />
                Modifier
              </button>
            )}
            <button onClick={onFermer} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><i className="ti ti-x" style={{ fontSize: "18px" }} /></button>
          </div>
        </div>

        {edition ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
            {erreurEdition && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#B91C1C" }}>{erreurEdition}</div>}
            <div>
              <label style={labelStyle}>Raison sociale *</label>
              <input style={iStyle} value={formEdit.raison_sociale} onChange={e => setFormEdit({ ...formEdit, raison_sociale: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={iStyle} type="email" value={formEdit.email} onChange={e => setFormEdit({ ...formEdit, email: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input style={iStyle} value={formEdit.telephone} onChange={e => setFormEdit({ ...formEdit, telephone: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Segment</label>
              <select style={iStyle} value={formEdit.segment_prescripteur} onChange={e => setFormEdit({ ...formEdit, segment_prescripteur: e.target.value })}>
                {Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setEdition(false)} style={{ padding: "7px 14px", borderRadius: "7px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={enregistrerEdition} disabled={loadingEdition} style={{ padding: "7px 14px", borderRadius: "7px", border: "none", background: "#A9713F", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                {loadingEdition ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#374151", marginBottom: "18px" }}>
            <div><i className="ti ti-mail" style={{ fontSize: "13px", color: "#9CA3AF", marginRight: "6px" }} />{prescripteur.email}</div>
            <div><i className="ti ti-phone" style={{ fontSize: "13px", color: "#9CA3AF", marginRight: "6px" }} />{prescripteur.telephone || "—"}</div>
            <div><i className="ti ti-tag" style={{ fontSize: "13px", color: "#9CA3AF", marginRight: "6px" }} />{SEGMENTS[prescripteur.segment_prescripteur]}</div>
          </div>
        )}

        {/* Stepper étapes */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
          {ETAPES.map((e, i) => (
            <React.Fragment key={e.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i <= etapeActuelleIndex ? e.color : "#E2DDD8" }}>
                  {i < etapeActuelleIndex ? <i className="ti ti-check" style={{ fontSize: "12px", color: "white" }} /> : <span style={{ fontSize: "10px", color: i <= etapeActuelleIndex ? "white" : "#9CA3AF" }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: "9px", color: i <= etapeActuelleIndex ? e.color : "#9CA3AF", textAlign: "center", width: "56px" }}>{e.label}</span>
              </div>
              {i < ETAPES.length - 1 && <div style={{ flex: 1, height: "2px", background: i < etapeActuelleIndex ? e.color : "#E2DDD8", marginBottom: "16px" }} />}
            </React.Fragment>
          ))}
        </div>

        {erreur && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#B91C1C" }}>{erreur}</div>}

        {ETAPES[etapeActuelleIndex + 1]?.id === "contrat_signe" && (
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Date de signature du contrat</label>
            <input type="date" style={iStyle} value={dateContrat} onChange={e => setDateContrat(e.target.value)} />
          </div>
        )}
        {ETAPES[etapeActuelleIndex + 1]?.id === "compte_active" && (
          <div style={{ marginBottom: "12px", background: "#F5ECE1", border: "1px solid #E9D5C0", borderRadius: "8px", padding: "12px 14px" }}>
            <div style={{ fontSize: "12px", color: "#8B5E34" }}>
              Un email d'invitation sera envoyé à <strong>{prescripteur.email}</strong> pour qu'il définisse son mot de passe.
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onFermer} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>
          {etapeActuelleIndex < ETAPES.length - 1 && !edition && (
            <button onClick={progresser} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: "#A9713F", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Passer à « {ETAPES[etapeActuelleIndex + 1].label} »
            </button>
          )}
        </div>
      </div>
    </div>
  )
}