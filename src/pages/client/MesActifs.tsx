import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: "En attente", color: "#92400E", bg: "#FFFBEB" },
  en_cours:   { label: "En cours",   color: "#1E40AF", bg: "#EFF6FF" },
  complete:   { label: "Analysé",    color: "#065F46", bg: "#ECFDF5" },
}

export default function MesActifs() {
  const navigate = useNavigate()
  const [actifs, setActifs]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [filtre, setFiltre]           = useState("tous")
  const [typeClient, setTypeClient]   = useState<string | null>(null)

  useEffect(() => { loadActifs() }, [])

  async function loadActifs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profilAGE } = await supabase
      .from("profils")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const { data: profilClient } = await supabase
      .from("profils_client")
      .select("type_client")
      .eq("id", user.id)
      .maybeSingle()

    setTypeClient(profilClient?.type_client || null)

    let query = supabase
      .from("actifs")
      .select("*, actifs_reglementaire(id, statut)")
      .order("created_at", { ascending: false })

    if (profilAGE?.role === "admin") {
      // Admin voit tout
    } else if (profilClient?.type_client === "banque" || profilClient?.type_client === "assurance") {
      query = query
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .eq("categorie", "patrimoine_propre")
    } else {
      query = query
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .neq("categorie", "import_csv")
      query = query.eq("actif", true)
    }

    const { data } = await query
    setActifs(data || [])
    setLoading(false)
  }

  function routeNouveau(): string {
    return typeClient === "proprietaire"
      ? "/client/actifs/nouveau-particulier"
      : "/client/actifs/nouveau"
  }

  async function desactiverActif(id: string) {
    if (!confirm("Désactiver cet actif ? Il ne sera plus visible mais restera en base.")) return
    await supabase.from("actifs").update({ actif: false }).eq("id", id)
    setActifs(actifs.filter(a => a.id !== id))
  }

  async function supprimerActif(id: string) {
    if (!confirm("Supprimer cet actif ? Cette action est irréversible.")) return
    await supabase.from("actifs").delete().eq("id", id)
    setActifs(actifs.filter(a => a.id !== id))
  }

  const actifsFiltres = filtre === "tous"
    ? actifs
    : actifs.filter(a => a.statut_analyse === filtre)

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement…</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", color: "#64748B" }}>
          <span style={{ fontWeight: 500, color: "#0F172A" }}>{actifs.length}</span> actif{actifs.length > 1 ? "s" : ""} enregistré{actifs.length > 1 ? "s" : ""}
        </div>
        <button
          onClick={() => navigate(routeNouveau())}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}
        >
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          {typeClient === "proprietaire" ? "Ajouter un bien" : "Créer un actif"}
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[
          { id: "tous",       label: "Tous" },
          { id: "en_attente", label: "En attente" },
          { id: "en_cours",   label: "En cours" },
          { id: "complete",   label: "Analysés" },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)} style={{
            padding: "5px 14px", borderRadius: "6px",
            border: filtre === f.id ? "1px solid #0F6E56" : "1px solid #E2E8F0",
            background: filtre === f.id ? "#ECFDF5" : "#FFFFFF",
            color: filtre === f.id ? "#065F46" : "#64748B",
            fontSize: "12px", fontWeight: filtre === f.id ? 600 : 400,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {actifsFiltres.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "48px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: typeClient === "proprietaire" ? "#FFF7ED" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className={`ti ${typeClient === "proprietaire" ? "ti-home" : "ti-building"}`} style={{ fontSize: "24px", color: typeClient === "proprietaire" ? "#B25C2A" : "#0F6E56" }} aria-hidden="true" />
          </div>
          <div style={{ fontWeight: 500, color: "#0F172A", marginBottom: "6px", fontSize: "15px" }}>
            {typeClient === "proprietaire" ? "Aucun bien enregistré" : "Aucun actif trouvé"}
          </div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>
            {typeClient === "proprietaire"
              ? "Ajoutez votre premier bien pour démarrer l'analyse climatique et RGA."
              : "Créez votre premier actif pour démarrer l'analyse climatique."}
          </div>
          <button
            onClick={() => navigate(routeNouveau())}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: typeClient === "proprietaire" ? "#B25C2A" : "#0F6E56", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}
          >
            <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
            {typeClient === "proprietaire" ? "Ajouter un bien" : "Créer un actif"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {actifsFiltres.map((a, i) => {
            const statut = STATUT_CONFIG[a.statut_analyse || "en_attente"]
            const nbObligatoires = a.actifs_reglementaire?.filter((r: any) => r.statut === "eligible").length || 0
            const nbTotal = a.actifs_reglementaire?.length || 0
            const scoreColor = (a.score_climatique || 0) >= 70 ? "#991B1B" : (a.score_climatique || 0) >= 40 ? "#D97706" : "#065F46"
            const estParticulier = typeClient === "proprietaire"

            return (
              <div
                key={i}
                onClick={() => navigate(typeClient === "proprietaire" ? `/client/actifs-particulier/${a.id}` : `/client/actifs/${a.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = estParticulier ? "#F5D0B0" : "#A7F3D0")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", cursor: "pointer", transition: "border-color 0.12s", display: "grid", gridTemplateColumns: "40px 1fr auto", gap: "16px", alignItems: "center" }}
              >
                {/* Icône */}
                <div style={{ width: 40, height: 40, borderRadius: "9px", background: estParticulier ? "#FFF7ED" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`ti ${estParticulier ? "ti-home" : "ti-building"}`} style={{ fontSize: "20px", color: estParticulier ? "#B25C2A" : "#0F6E56" }} aria-hidden="true" />
                </div>

                {/* Infos */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{a.nom}</span>
                    <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                    {a.exposition_rga && (
                      <span style={{
                        padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500,
                        background: a.exposition_rga === "forte" ? "#FEF2F2" : a.exposition_rga === "moyenne" ? "#FFF7ED" : "#F8F7F4",
                        color: a.exposition_rga === "forte" ? "#B91C1C" : a.exposition_rga === "moyenne" ? "#D97706" : "#78716C",
                      }}>
                        RGA {a.exposition_rga}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "5px" }}>
                    <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true" />
                    {a.ville} · {a.type_batiment || a.type_bien || "—"} · {a.surface ? `${a.surface} m²` : "—"}
                  </div>
                  {!estParticulier && (
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        <span style={{ color: "#94A3B8" }}>Effectifs </span>
                        <span style={{ fontWeight: 500, color: "#0F172A" }}>{a.effectifs ? `${a.effectifs} salariés` : "—"}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>
                        <span style={{ color: "#94A3B8" }}>Réglementations </span>
                        <span style={{ fontWeight: 500, color: "#0F172A" }}>
                          {nbTotal > 0 ? `${nbObligatoires} obligatoire${nbObligatoires > 1 ? "s" : ""} / ${nbTotal}` : "—"}
                        </span>
                      </div>
                    </div>
                  )}
                  {estParticulier && a.annee_construction && (
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      <span style={{ color: "#94A3B8" }}>Construit en </span>
                      <span style={{ fontWeight: 500, color: "#0F172A" }}>{a.annee_construction}</span>
                      {a.valeur_marche && (
                        <>
                          <span style={{ color: "#94A3B8", marginLeft: "12px" }}>Valeur estimée </span>
                          <span style={{ fontWeight: 500, color: "#0F172A" }}>{parseInt(a.valeur_marche).toLocaleString("fr-FR")} €</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Score + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  {a.score_climatique && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: 600, color: scoreColor, fontFamily: "'DM Mono', monospace" }}>{a.score_climatique}</div>
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>/ 100</div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={e => { e.stopPropagation(); desactiverActif(a.id) }}
                      style={{ display: "flex", alignItems: "center", gap: "4px", background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A", padding: "5px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <i className="ti ti-eye-off" style={{ fontSize: "13px" }} aria-hidden="true" />
                      Désactiver
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); supprimerActif(a.id) }}
                      style={{ display: "flex", alignItems: "center", gap: "4px", background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", padding: "5px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: "13px" }} aria-hidden="true" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
