import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import FormBienFinance from "../../components/FormBienFinance"

interface FicheClient {
  id: string
  email: string
  prenom: string | null
  nom: string | null
  type_client: string
  sous_profil: string | null
  actif: boolean
  onboarding_complete: boolean
  created_at: string
  responsable_commercial_id: string | null
  region: string | null
  actifs: any[]
  campagnes: any[]
  demandes: any[]
  rapports: any[]
}

const TYPE_LABELS: Record<string, string> = {
  banque: "Banque", banque_assurance: "Banque / Assurance",
  assurance: "Assurance", assureur: "Assurance",
  entreprise: "Entreprise", collectivite: "Collectivité",
  proprietaire: "Particulier", particulier: "Particulier",
}

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  banque:           { bg: "#EFF6FF", color: "#1E40AF" },
  banque_assurance: { bg: "#EFF6FF", color: "#1E40AF" },
  assurance:        { bg: "#F0F9FF", color: "#0369A1" },
  assureur:         { bg: "#F0F9FF", color: "#0369A1" },
  entreprise:       { bg: "#F9F0EA", color: "#B25C2A" },
  collectivite:     { bg: "#F0FDF4", color: "#2F7D5C" },
  proprietaire:     { bg: "#FFFBEB", color: "#D97706" },
  particulier:      { bg: "#FFFBEB", color: "#D97706" },
}

const ONGLETS = [
  { id: "infos",       label: "Informations", icon: "ti-user" },
  { id: "actifs",      label: "Actifs",       icon: "ti-building" },
  { id: "campagnes",   label: "Campagnes",    icon: "ti-speakerphone" },
  { id: "demandes",    label: "Demandes",     icon: "ti-clipboard-list" },
  { id: "rapports",    label: "Documents",    icon: "ti-file-analytics" },
  { id: "financement", label: "Financement",  icon: "ti-cash" },
]

const actionBtnStyle: React.CSSProperties = {
  width: "30px", height: "30px", border: "1px solid #E2DDD8",
  background: "#F4F3F0", borderRadius: "6px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6B7280", transition: "all 0.1s",
}

function typeLabel(type: string) { return TYPE_LABELS[type] || type }
function typeBadge(type: string) { return TYPE_BADGE[type] || { bg: "#F4F3F0", color: "#6B7280" } }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FicheClient() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [fiche, setFiche] = useState<FicheClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("infos")

  const [responsables, setResponsables] = useState<{ id: string; prenom: string; nom: string; role: string; region: string | null }[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  const [biensFinancables, setBiensFinancables] = useState<{ id: string; nom: string; valeur_marche: number }[]>([])
  const [biensFinancesMap, setBiensFinancesMap] = useState<Record<string, { id: string; encours_credit: number; lgd_avant: number; notes: string | null }>>({})
  const [actifSelectionne, setActifSelectionne] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    charger()
  }, [id])

  async function charger() {
    setLoading(true)
    try {
      const { data: profil } = await supabase
        .from("profils_client")
        .select("id, type_client, sous_profil, actif, onboarding_complete, created_at, responsable_commercial_id, region, prenom, nom")
        .eq("id", id)
        .maybeSingle()

      if (!profil) { setLoading(false); return }

      let email = "—"
      try {
        const { data: emailsData } = await supabase.rpc("get_users_emails", { user_ids: [id] })
        if (emailsData && emailsData[0]) email = emailsData[0].email
      } catch { /* noop */ }

      const [{ data: actifs }, { data: campagnes }, { data: demandes }, { data: rapports }, { data: resps }] = await Promise.all([
        supabase.from("actifs").select("id, nom, score_climatique, categorie, ville").eq("user_id", id).eq("categorie", "patrimoine_propre").order("created_at", { ascending: false }),
        supabase.from("campagnes").select("id, nom, statut, created_at").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("demandes_marketplace").select("id, titre, statut, created_at").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("rapports_client").select("id, type_rapport, statut, created_at, fichier_url").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("profils").select("id, prenom, nom, role, region").in("role", ["admin", "admin_national", "responsable_regional"]),
      ])

      setFiche({
        id: profil.id, email,
        prenom: profil.prenom, nom: profil.nom, type_client: profil.type_client,
        sous_profil: profil.sous_profil, actif: profil.actif !== false,
        onboarding_complete: profil.onboarding_complete || false,
        created_at: profil.created_at,
        responsable_commercial_id: profil.responsable_commercial_id,
        region: profil.region || null,
        actifs: actifs || [], campagnes: campagnes || [], demandes: demandes || [], rapports: rapports || [],
      })
      setResponsables(resps || [])

      if (profil.type_client === "banque") {
        await chargerFinancement(id!)
      }
    } finally {
      setLoading(false)
    }
  }

  async function chargerFinancement(clientId: string) {
    const { data: biensFin } = await supabase
      .from("actifs")
      .select("id, nom, valeur_marche")
      .eq("client_id", clientId)
    setBiensFinancables(biensFin || [])

    const { data: bf } = await supabase
      .from("biens_finances")
      .select("id, actif_id, encours_credit, lgd_avant, notes")
      .eq("client_id", clientId)
    const map: Record<string, any> = {}
    ;(bf || []).forEach((row: any) => { map[row.actif_id] = row })
    setBiensFinancesMap(map)
  }

  async function toggleActif() {
    if (!fiche) return
    const nouvelle_valeur = !fiche.actif
    await supabase.from("profils_client").update({ actif: nouvelle_valeur }).eq("id", fiche.id)
    setFiche(prev => prev ? { ...prev, actif: nouvelle_valeur } : null)
  }

  async function assignerResponsable(responsable_id: string) {
    if (!fiche) return
    setAssignLoading(true)
    try {
      await supabase.from("profils_client").update({ responsable_commercial_id: responsable_id }).eq("id", fiche.id)
      setFiche(prev => prev ? { ...prev, responsable_commercial_id: responsable_id } : null)
      setAssignSuccess(true)
      setTimeout(() => setAssignSuccess(false), 2000)
    } finally {
      setAssignLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#78716C" }}>
      Chargement…
    </div>
  )

  if (!fiche) return (
    <div style={{ padding: 32, color: "#B91C1C" }}>Client introuvable.</div>
  )

  const badge = typeBadge(fiche.type_client)

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Fil d'Ariane ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "#78716C" }}>
        <button onClick={() => navigate("/metier/clients")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#78716C", padding: 0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Clients
        </button>
        <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
        <span style={{ color: "#1F2937", fontWeight: 500 }}>
          {fiche.prenom && fiche.nom ? `${fiche.prenom} ${fiche.nom}` : fiche.email}
        </span>
      </div>

      {/* ── Header ── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E1DA", padding: "24px 28px", marginBottom: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: badge.color }}>
              {(fiche.prenom?.[0] || fiche.email[0] || "?").toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1F2937" }}>
                {fiche.prenom && fiche.nom ? `${fiche.prenom} ${fiche.nom}` : fiche.email}
              </h1>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badge.bg, color: badge.color, border: `1px solid ${badge.color}30` }}>
                  {typeLabel(fiche.type_client)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: fiche.actif ? "#F0FDF4" : "#F4F3F0", color: fiche.actif ? "#2F7D5C" : "#78716C", border: `1px solid ${fiche.actif ? "#BBF7D0" : "#E5E1DA"}` }}>
                  {fiche.actif ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={toggleActif} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${fiche.actif ? "#FECACA" : "#BBF7D0"}`,
            background: fiche.actif ? "#FEF2F2" : "#F0FDF4",
            color: fiche.actif ? "#B91C1C" : "#2F7D5C",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <i className={`ti ${fiche.actif ? "ti-user-off" : "ti-user-check"}`} style={{ fontSize: 14 }} />
            {fiche.actif ? "Désactiver le compte" : "Activer le compte"}
          </button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E5E1DA", marginBottom: 20, overflowX: "auto" }}>
        {ONGLETS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", borderBottom: activeTab === tab.id ? "2px solid #1D9E75" : "2px solid transparent",
            padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "#1D9E75" : "#78716C", marginBottom: -1, whiteSpace: "nowrap"
          }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E1DA", padding: "24px 28px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>

        {activeTab === "infos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Email", value: fiche.email },
                { label: "Prénom", value: fiche.prenom || "—" },
                { label: "Nom", value: fiche.nom || "—" },
                { label: "Type", value: typeLabel(fiche.type_client) },
                { label: "Onboarding", value: fiche.onboarding_complete ? "Complété" : "En cours" },
                { label: "Client depuis", value: formatDate(fiche.created_at) },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #F4F3F0" }}>
                  <span style={{ fontSize: 12, color: "#78716C" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 8 }}>Responsable commercial</p>
              {assignSuccess && (
                <div style={{ padding: "8px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, fontSize: 12, color: "#2F7D5C", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 13 }} /> Responsable assigné
                </div>
              )}
              <select className="input" value={fiche.responsable_commercial_id || ""} onChange={e => assignerResponsable(e.target.value)} disabled={assignLoading}>
                <option value="">Sélectionner un responsable…</option>
                {responsables.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.prenom} {r.nom}{r.region ? ` — ${r.region}` : r.role === "admin" || r.role === "admin_national" ? " — National" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === "actifs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fiche.actifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                <i className="ti ti-building-off" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                Aucun actif enregistré
              </div>
            ) : fiche.actifs.map((a: any) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F9F0EA", borderRadius: 8, border: "1px solid #F0DDD0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-building" style={{ fontSize: 16, color: "#B25C2A" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>{a.nom}</div>
                    <div style={{ fontSize: 11, color: "#78716C" }}>{a.ville || "—"}</div>
                  </div>
                </div>
                {a.score_climatique != null && (
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 600, color: a.score_climatique >= 70 ? "#B91C1C" : a.score_climatique >= 40 ? "#D97706" : "#2F7D5C" }}>
                    {a.score_climatique}/100
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "campagnes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fiche.campagnes.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                <i className="ti ti-speakerphone-off" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                Aucune campagne
              </div>
            ) : fiche.campagnes.map((c: any) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F4F3F0", borderRadius: 8, border: "1px solid #E2DDD8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-speakerphone" style={{ fontSize: 15, color: "#78716C" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>{c.nom}</div>
                    <div style={{ fontSize: 11, color: "#78716C" }}>{formatDate(c.created_at)}</div>
                  </div>
                </div>
                <span className={c.statut === "en_cours" ? "badge badge--success" : c.statut === "soumise" ? "badge badge--warning" : "badge badge--neutral"} style={{ fontSize: 10 }}>
                  {c.statut}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "demandes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fiche.demandes.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                <i className="ti ti-clipboard-off" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                Aucune demande
              </div>
            ) : fiche.demandes.map((d: any) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F4F3F0", borderRadius: 8, border: "1px solid #E2DDD8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-clipboard-list" style={{ fontSize: 15, color: "#78716C" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>{d.titre || "Demande"}</div>
                    <div style={{ fontSize: 11, color: "#78716C" }}>{formatDate(d.created_at)}</div>
                  </div>
                </div>
                <span className="badge badge--neutral" style={{ fontSize: 10 }}>{d.statut}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rapports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fiche.rapports.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                <i className="ti ti-file-off" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                Aucun document
              </div>
            ) : fiche.rapports.map((r: any) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F4F3F0", borderRadius: 8, border: "1px solid #E2DDD8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-file-analytics" style={{ fontSize: 15, color: "#B25C2A" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1F2937" }}>{r.type_rapport}</div>
                    <div style={{ fontSize: 11, color: "#78716C" }}>{formatDate(r.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={r.statut === "disponible" ? "badge badge--success" : "badge badge--warning"} style={{ fontSize: 10 }}>
                    {r.statut}
                  </span>
                  {r.statut === "disponible" && r.fichier_url && (
                    <a href={r.fichier_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", padding: "4px 8px", borderRadius: 5, background: "#B25C2A", color: "white", fontSize: 11, textDecoration: "none" }}>
                      <i className="ti ti-download" style={{ fontSize: 12 }} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "financement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "#78716C" }}>
              Encours crédit et LGD pour chaque bien financé par {fiche.prenom || fiche.email}.
            </p>
            {biensFinancables.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                <i className="ti ti-building-off" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                Aucun bien financé rattaché
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {biensFinancables.map(actif => {
                  const bf = biensFinancesMap[actif.id]
                  return (
                    <div key={actif.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8F7F4", borderRadius: 10, border: "1px solid #E5E1DA" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#1F2937" }}>{actif.nom}</div>
                        <div style={{ fontSize: 12, color: "#78716C" }}>
                          {bf ? `Encours : ${bf.encours_credit.toLocaleString("fr-FR")} € · LGD avant : ${bf.lgd_avant} %` : "Non configuré"}
                        </div>
                      </div>
                      <button onClick={() => setActifSelectionne(actif.id)} style={actionBtnStyle}>
                        <i className="ti ti-edit" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {actifSelectionne && (
              <div style={{ marginTop: 4, paddingTop: 20, borderTop: "1px solid #E5E1DA" }}>
                <FormBienFinance
                  organisationId={fiche.id}
                  actif={biensFinancables.find(a => a.id === actifSelectionne)!}
                  bienFinanceExistant={biensFinancesMap[actifSelectionne] ?? null}
                  onSaved={async () => {
                    setActifSelectionne(null)
                    await chargerFinancement(fiche.id)
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}