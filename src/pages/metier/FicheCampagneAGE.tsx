import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function FicheCampagneAGE() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campagne, setCampagne] = useState<any>(null)
  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: c } = await supabase.from("campagnes").select("*").eq("id", id).single()
    setCampagne(c)
    const { data: s } = await supabase
      .from("campagnes_suivi_biens")
      .select("*, actif:actif_id(id, nom, adresse, ville, surface, telephone_client, email_client, nom_proprietaire, score_climatique)")
      .eq("campagne_id", id)
    setBiens(s || [])
    console.log("biens:", s)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Chargement...</div>
  if (!campagne) return <div style={{ padding: "2rem", color: "#64748B", fontSize: "14px" }}>Campagne introuvable</div>

return (
  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

    <button onClick={() => navigate("/metier/campagnes")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #E2E8F0", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", color: "#64748B", fontSize: "13px", fontFamily: "inherit", width: "fit-content" }}>
      <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} /> Retour
    </button>

    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" as const }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: 44, height: 44, borderRadius: "9px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-speakerphone" style={{ fontSize: "22px", color: "#0369A1" }} />
        </div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#0F172A", marginBottom: "4px" }}>{campagne.nom}</div>
          <div style={{ fontSize: "12px", color: "#64748B", display: "flex", gap: "12px" }}>
            {campagne.date_debut && <span>{campagne.date_debut} - {campagne.date_fin || "..."}</span>}
            {campagne.zone_geo && <span>{campagne.zone_geo}</span>}
          </div>
        </div>
      </div>
      <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "8px 16px", borderRadius: "7px", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
        <i className="ti ti-mail-forward" style={{ fontSize: "14px" }} /> Envoyer courriers
      </button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
      {[
        { label: "Courriers",   val: biens.filter(b => b.courrier_envoye_le).length,            icon: "ti-mail",             color: "#0F172A" },
        { label: "Appels IA",   val: biens.filter(b => b.appel_ia_statut !== "en_attente").length, icon: "ti-phone-call",    color: "#D97706" },
        { label: "RDV",         val: biens.filter(b => b.rdv_date).length,                      icon: "ti-calendar-check",   color: "#0369A1" },
        { label: "Diagnostics", val: biens.filter(b => b.diagnostic_statut === "vendu" || b.diagnostic_statut === "realise").length, icon: "ti-clipboard-check", color: "#065F46" },
      ].map((k, i) => (
        <div key={i} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <i className={"ti " + k.icon} style={{ fontSize: "14px", color: "#94A3B8" }} />
            <span style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{k.label}</span>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 500, color: k.color }}>{k.val}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>sur {biens.length} biens</div>
        </div>
      ))}
    </div>
<div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#94A3B8" }} />
          <input placeholder="Rechercher un bien..." style={{ width: "100%", padding: "6px 9px 6px 28px", border: "1px solid #E2E8F0", borderRadius: "7px", fontSize: "12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }} />
        </div>
      </div>

      {biens.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
          <i className="ti ti-building" style={{ fontSize: "32px", display: "block", marginBottom: "12px" }} />
          Aucun bien suivi dans cette campagne
        </div>
      ) : biens.map((b, idx) => {
        const actif = b.actif
        const isLast = idx === biens.length - 1
        const etapes = [
          { label: "Courrier",   done: !!b.courrier_envoye_le,                       info: b.courrier_envoye_le || "En attente",         active: !b.courrier_envoye_le },
          { label: "Appel IA",  done: b.appel_ia_statut !== "en_attente",             info: b.appel_ia_statut || "En attente",            active: !!b.courrier_envoye_le && b.appel_ia_statut === "en_attente" },
          { label: "RDV",       done: b.rdv_statut === "honore",                      info: b.rdv_date ? new Date(b.rdv_date).toLocaleDateString("fr-FR") : "En attente", active: b.appel_ia_statut === "rdv_fixe" && b.rdv_statut !== "honore" },
          { label: "Diagnostic",done: b.diagnostic_statut === "vendu" || b.diagnostic_statut === "realise", info: b.diagnostic_statut || "En attente", active: b.rdv_statut === "honore" && b.diagnostic_statut === "non_vendu" },
        ]
        return (
          <div key={b.id} style={{ padding: "14px 16px", borderBottom: isLast ? "none" : "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="ti ti-building" style={{ fontSize: "18px", color: "#64748B" }} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A", marginBottom: "2px" }}>
                    {actif?.nom_proprietaire ? actif.nom_proprietaire + " - " : ""}{actif?.nom || "Bien sans nom"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", display: "flex", gap: "8px" }}>
                    {actif?.adresse && <span>{actif.adresse}, {actif.ville}</span>}
                    {actif?.telephone_client && <span>· {actif.telephone_client}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {etapes.map((e, i) => (
                <div key={i} style={{ background: e.done ? "#ECFDF5" : e.active ? "#EFF6FF" : "#F8FAFC", borderRadius: "8px", padding: "8px 10px", opacity: !e.done && !e.active ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: e.done ? "#0F6E56" : e.active ? "white" : "#F1F5F9", border: e.active ? "1.5px solid #0369A1" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {e.done && <i className="ti ti-check" style={{ fontSize: "9px", color: "white" }} />}
                      {e.active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0369A1" }} />}
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: e.done ? "#065F46" : e.active ? "#0369A1" : "#94A3B8" }}>{e.label}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: e.done ? "#065F46" : e.active ? "#0369A1" : "#94A3B8" }}>{e.info}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  </div>
)
}