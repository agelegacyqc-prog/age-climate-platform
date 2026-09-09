import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const utilisateurs = [
  { id: 1, nom: "Khouader", prenom: "Amine", email: "akhouader@agelegacy-qc.com", role: "admin",     statut: "actif" },
  { id: 2, nom: "Dupont",   prenom: "Marie",  email: "mdupont@age.fr",             role: "operateur", statut: "actif" },
  { id: 3, nom: "Martin",   prenom: "Paul",   email: "pmartin@assurance.fr",       role: "client",    statut: "actif" },
  { id: 4, nom: "Bernard",  prenom: "Sophie", email: "sbernard@banque.fr",         role: "client",    statut: "inactif" },
]

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin:     { label: "Admin",     color: "#5B21B6", bg: "#F5F3FF" },
  operateur: { label: "Opérateur", color: "#1E40AF", bg: "#EFF6FF" },
  client:    { label: "Client",    color: "#8C4720", bg: "#F9F0EA" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  actif:   { label: "Actif",   color: "#8C4720", bg: "#F9F0EA" },
  inactif: { label: "Inactif", color: "#991B1B", bg: "#FEF2F2" },
}

const ONGLETS = [
  { id: "partenaires",     label: "Partenaires",       icon: "ti-briefcase" },
  { id: "parametres",      label: "Paramètres",        icon: "ti-settings" },
  { id: "workflows",       label: "Workflows",         icon: "ti-git-branch" },
  { id: "documents",       label: "Modèles",           icon: "ti-file-text" },
  { id: "commissionnement", label: "Commissionnement", icon: "ti-coin" },
]

interface TauxCommission {
  id: string
  taux_eur: number
  date_effet: string
  date_fin: string | null
  motif: string | null
  created_at: string
}

const risques = ["RGA", "PPRI", "Feux de forêt", "Submersion", "Tempête"]

const parametres = [
  ["Conservation données", "5 ans"],
  ["Export par défaut",    "PDF"],
  ["Langue",               "Français"],
  ["Fuseau horaire",       "Europe/Paris"],
]

const workflows = [
  "Intégration données",
  "Campagne contact",
  "Diagnostic",
  "Financement",
  "Travaux",
  "Reporting",
]

const documents = [
  { nom: "Mandat client",        type: "Administratif" },
  { nom: "Consentement RGPD",    type: "Administratif" },
  { nom: "Rapport diagnostic",   type: "Diagnostic" },
  { nom: "Dossier subvention",   type: "Financement" },
  { nom: "Attestation travaux",  type: "Travaux" },
  { nom: "Rapport COMEX",        type: "Reporting" },
]

export default function Administration() {
  const [onglet, setOnglet]           = useState("partenaires")
  const [partenaires, setPartenaires] = useState<any[]>([])
  const [loadingP, setLoadingP]       = useState(false)
  const [actionId, setActionId]       = useState<string | null>(null)

  const [tauxHistorique, setTauxHistorique] = useState<TauxCommission[]>([])
  const [loadingTaux, setLoadingTaux]       = useState(false)
  const [nouveauTaux, setNouveauTaux]       = useState("")
  const [dateEffet, setDateEffet]           = useState("")
  const [motif, setMotif]                   = useState("")
  const [erreurTaux, setErreurTaux]         = useState("")
  const [soumissionTaux, setSoumissionTaux] = useState(false)



 async function chargerPartenaires() {
  setLoadingP(true)
  const { data, error } = await supabase
    .from("prestataires_pro")
    .select("*")
    .order("created_at", { ascending: false })
  console.log("partenaires data:", data, "error:", error)
  setPartenaires(data || [])
  setLoadingP(false)
}
useEffect(() => {
  if (onglet === "partenaires") chargerPartenaires()
}, [onglet])
  async function validerPartenaire(id: string, userId: string) {
    setActionId(id)
    try {
      await supabase
        .from("prestataires_pro")
        .update({ statut: "valide", actif: true })
        .eq("id", id)
      await supabase
        .from("profils")
        .update({ role: "partenaire" })
        .eq("id", userId)
      chargerPartenaires()
    } finally {
      setActionId(null)
    }
  }

  async function rejeterPartenaire(id: string) {
    setActionId(id)
    try {
      await supabase
        .from("prestataires_pro")
        .update({ statut: "rejete", actif: false })
        .eq("id", id)
      chargerPartenaires()
    } finally {
      setActionId(null)
    }
  }

  async function chargerTauxHistorique() {
    setLoadingTaux(true)
    const { data } = await supabase
      .from("commissionnement_config")
      .select("*")
      .order("date_effet", { ascending: false })
    setTauxHistorique(data || [])
    setLoadingTaux(false)
  }

  useEffect(() => {
    if (onglet === "commissionnement") chargerTauxHistorique()
  }, [onglet])

  async function ajouterAvenant() {
    setErreurTaux("")
    const taux = parseFloat(nouveauTaux.replace(",", "."))
    if (Number.isNaN(taux) || taux <= 0) {
      setErreurTaux("Montant invalide.")
      return
    }
    if (!dateEffet) {
      setErreurTaux("Date d'effet requise.")
      return
    }
    setSoumissionTaux(true)
    const { error } = await supabase
      .from("commissionnement_config")
      .insert({ taux_eur: taux, date_effet: dateEffet, motif: motif || null })
    setSoumissionTaux(false)
    if (error) {
      setErreurTaux(error.message.includes("row-level security") ? "Droits insuffisants — réservé aux administrateurs." : error.message)
      return
    }
    setNouveauTaux("")
    setDateEffet("")
    setMotif("")
    chargerTauxHistorique()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Onglets */}
      <div style={{ display: "flex", gap: "4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 16px", borderRadius: "7px", border: "none",
            cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
            fontWeight: onglet === o.id ? 500 : 400,
            background: onglet === o.id ? "#F9F0EA" : "transparent",
            color: onglet === o.id ? "#065F46" : "#64748B",
            transition: "all 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>

{/* Partenaires */}
{onglet === "partenaires" && (
  <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", overflow: "hidden" }}>
    <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2DDD8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
        Candidatures partenaires
        {partenaires.filter(p => p.statut === "en_attente").length > 0 && (
          <span style={{ marginLeft: "8px", background: "#FEF2F2", color: "#B91C1C", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px" }}>
            {partenaires.filter(p => p.statut === "en_attente").length} en attente
          </span>
        )}
      </div>
    </div>
    {loadingP ? (
      <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>Chargement…</div>
    ) : partenaires.length === 0 ? (
      <div style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>
        <i className="ti ti-briefcase-off" style={{ fontSize: "24px", display: "block", marginBottom: "8px" }} />
        Aucune candidature
      </div>
    ) : (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F4F3F0", borderBottom: "1px solid #E2DDD8" }}>
            {["Partenaire", "Société", "Type", "Spécialités", "Statut", "Documents", "Actions"].map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {partenaires.map((p, i) => (
            <tr key={p.id}
              style={{ borderBottom: i < partenaires.length - 1 ? "1px solid #E2DDD8" : "none", background: p.statut === "en_attente" ? "#FFFBF7" : "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9F0EA")}
              onMouseLeave={e => (e.currentTarget.style.background = p.statut === "en_attente" ? "#FFFBF7" : "transparent")}
            >
              <td style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#F9F0EA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: "#B25C2A", flexShrink: 0 }}>
                    {(p.prenom?.[0] || "").toUpperCase()}{(p.nom?.[0] || "").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{p.prenom} {p.nom}</div>
                    <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{p.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6B7280" }}>{p.societe || "—"}</td>
              <td style={{ padding: "12px 16px", fontSize: "12px", color: "#6B7280" }}>{p.type_structure || "—"}</td>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {(p.specialites || []).slice(0, 2).map((s: string, j: number) => (
                    <span key={j} style={{ background: "#F4F3F0", color: "#6B7280", fontSize: "10px", padding: "2px 6px", borderRadius: "3px" }}>{s}</span>
                  ))}
                  {(p.specialites || []).length > 2 && (
                    <span style={{ fontSize: "10px", color: "#9CA3AF" }}>+{p.specialites.length - 2}</span>
                  )}
                </div>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span style={{
                  background: p.statut === "valide" ? "#F0FDF4" : p.statut === "rejete" ? "#FEF2F2" : "#FFFBEB",
                  color: p.statut === "valide" ? "#2F7D5C" : p.statut === "rejete" ? "#B91C1C" : "#D97706",
                  fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500,
                }}>
                  {p.statut === "valide" ? "Validé" : p.statut === "rejete" ? "Rejeté" : "En attente"}
                </span>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  {p.kbis_url && (
                    <a href={p.kbis_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#0369A1", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}>
                      <i className="ti ti-file" style={{ fontSize: "12px" }} /> Kbis
                    </a>
                  )}
                  {p.assurance_url && (
                    <a href={p.assurance_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#0369A1", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}>
                      <i className="ti ti-file" style={{ fontSize: "12px" }} /> Assurance
                    </a>
                  )}
                </div>
              </td>
              <td style={{ padding: "12px 16px" }}>
                {p.statut === "en_attente" && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => validerPartenaire(p.id, p.user_id)}
                      disabled={actionId === p.id}
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "#B25C2A", color: "white", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <i className="ti ti-check" style={{ fontSize: "12px" }} />
                      Valider
                    </button>
                    <button
                      onClick={() => rejeterPartenaire(p.id)}
                      disabled={actionId === p.id}
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <i className="ti ti-x" style={{ fontSize: "12px" }} />
                      Rejeter
                    </button>
                  </div>
                )}
                {p.statut !== "en_attente" && (
                  <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Traité</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
      {/* Paramètres */}
      {onglet === "parametres" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Types de risques</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {risques.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F8FAFC", borderRadius: "7px", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="ti ti-shield" style={{ fontSize: "14px", color: "#94A3B8" }} aria-hidden="true" />
                    <span style={{ fontSize: "13px", color: "#0F172A" }}>{r}</span>
                  </div>
                  <button style={{ background: "white", color: "#64748B", border: "1px solid #E2E8F0", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Modifier</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Paramètres généraux</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {parametres.map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F8FAFC", borderRadius: "7px", border: "1px solid #E2E8F0" }}>
                  <span style={{ fontSize: "13px", color: "#64748B" }}>{k}</span>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflows */}
      {onglet === "workflows" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Workflows configurés</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["#", "Workflow", "Statut"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workflows.map((w, i) => (
                <tr key={i}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                  style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#94A3B8", fontFamily: "'DM Mono', monospace", width: "40px" }}>{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <i className="ti ti-git-branch" style={{ fontSize: "15px", color: "#94A3B8" }} aria-hidden="true" />
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{w}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#F9F0EA", color: "#8C4720", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>Actif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modèles documents */}
      {onglet === "documents" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>Modèles de documents</div>
            <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#B25C2A", color: "white", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}>
              <i className="ti ti-plus" style={{ fontSize: "14px" }} aria-hidden="true" />
              Ajouter
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["Document", "Catégorie", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((d, i) => (
                <tr key={i}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}
                  style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "7px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="ti ti-file-text" style={{ fontSize: "16px", color: "#64748B" }} aria-hidden="true" />
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{d.nom}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#F1F5F9", color: "#475569", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>{d.type}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={{ background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Voir</button>
                      <button style={{ background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>Modifier</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commissionnement */}
      {onglet === "commissionnement" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Historique des taux</div>
            {loadingTaux ? (
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>Chargement…</div>
            ) : tauxHistorique.length === 0 ? (
              <div style={{ fontSize: "13px", color: "#94A3B8" }}>Aucun taux configuré.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {tauxHistorique.map(t => (
                  <div key={t.id} style={{ padding: "10px 12px", background: t.date_fin === null ? "#F9F0EA" : "#F8FAFC", borderRadius: "7px", border: `1px solid ${t.date_fin === null ? "#E9D9C5" : "#E2E8F0"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(t.taux_eur)}
                      </span>
                      {t.date_fin === null && (
                        <span style={{ background: "#F0FDF4", color: "#2F7D5C", fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>En vigueur</span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                      Depuis le {new Date(t.date_effet).toLocaleDateString("fr-FR")}
                      {t.date_fin && ` — jusqu'au ${new Date(t.date_fin).toLocaleDateString("fr-FR")}`}
                    </div>
                    {t.motif && <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>{t.motif}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", marginBottom: "16px" }}>Nouvel avenant</div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px" }}>
              Réservé aux rôles admin / admin national. Un nouvel avenant ferme automatiquement le taux précédent — il ne s'applique qu'aux diagnostics réalisés après la date d'effet.
            </div>
            {erreurTaux && <div style={{ fontSize: "12px", color: "#B91C1C", marginBottom: "12px" }}>{erreurTaux}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>Montant (€ / diagnostic réalisé)</label>
                <input
                  value={nouveauTaux}
                  onChange={e => setNouveauTaux(e.target.value)}
                  placeholder="180,00"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "'DM Mono', monospace", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>Date d'effet</label>
                <input
                  type="date"
                  value={dateEffet}
                  onChange={e => setDateEffet(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>Motif (optionnel)</label>
                <input
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  placeholder="Avenant trimestriel Q1 2027"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={ajouterAvenant}
                disabled={soumissionTaux}
                style={{ background: "#B25C2A", color: "white", border: "none", padding: "9px 16px", borderRadius: "7px", cursor: soumissionTaux ? "default" : "pointer", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", opacity: soumissionTaux ? 0.6 : 1 }}
              >
                {soumissionTaux ? "Enregistrement…" : "Enregistrer l'avenant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}