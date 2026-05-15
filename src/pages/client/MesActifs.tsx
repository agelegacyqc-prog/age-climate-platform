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
  const [actifs, setActifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState("tous")

  useEffect(() => { loadActifs() }, [])

  async function loadActifs() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("actifs")
      .select("*, actifs_reglementaire(id, statut)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
    setActifs(data || [])
    setLoading(false)
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
          onClick={() => navigate("/client/actifs/nouveau")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
          <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
          Créer un actif
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
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className="ti ti-building" style={{ fontSize: "24px", color: "#0F6E56" }} aria-hidden="true" />
          </div>
          <div style={{ fontWeight: 500, color: "#0F172A", marginBottom: "6px", fontSize: "15px" }}>Aucun actif trouvé</div>
          <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Créez votre premier actif pour démarrer l'analyse climatique.</div>
          <button onClick={() => navigate("/client/actifs/nouveau")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "9px 20px", borderRadius: "7px", cursor: "pointer", fontWeight: 500, fontSize: "13px", fontFamily: "inherit" }}>
            <i className="ti ti-plus" style={{ fontSize: "15px" }} aria-hidden="true" />
            Créer un actif
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {actifsFiltres.map((a, i) => {
            const statut = STATUT_CONFIG[a.statut_analyse || "en_attente"]
            const nbObligatoires = a.actifs_reglementaire?.filter((r: any) => r.statut === "eligible").length || 0
            const nbTotal = a.actifs_reglementaire?.length || 0
            const scoreColor = (a.score_climatique || 0) >= 70 ? "#991B1B" : (a.score_climatique || 0) >= 40 ? "#D97706" : "#065F46"

            return (
              <div key={i}
                onClick={() => navigate("/client/actifs/" + a.id)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#A7F3D0")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", cursor: "pointer", transition: "border-color 0.12s", display: "grid", gridTemplateColumns: "40px 1fr auto", gap: "16px", alignItems: "center" }}>

                {/* Icône */}
                <div style={{ width: 40, height: 40, borderRadius: "9px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="ti ti-building" style={{ fontSize: "20px", color: "#0F6E56" }} aria-hidden="true" />
                </div>

                {/* Infos */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>{a.nom}</span>
                    <span style={{ background: statut.bg, color: statut.color, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>{statut.label}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "5px" }}>
                    <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true" />
                    {a.ville} · {a.type_batiment || "—"} · {a.surface ? `${a.surface} m²` : "—"}
                  </div>
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
                </div>

                {/* Score + action */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  {a.score_climatique && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: 600, color: scoreColor, fontFamily: "'DM Mono', monospace" }}>{a.score_climatique}</div>
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>/ 100</div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#0F6E56", fontSize: "13px", fontWeight: 500 }}>
                    Voir
                    <i className="ti ti-arrow-right" style={{ fontSize: "14px" }} aria-hidden="true" />
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