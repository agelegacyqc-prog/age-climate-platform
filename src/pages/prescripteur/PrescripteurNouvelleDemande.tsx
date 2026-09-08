import React, { useState } from "react"
import { supabase } from "../../lib/supabase"
import { REGIONS_FRANCE } from "../../lib/ageadaptRegions"

export default function PrescripteurNouvelleDemande() {
  const [typeDemande, setTypeDemande] = useState<"preventif" | "post_desordre">("preventif")
  const [form, setForm] = useState({
    nom_client: "", telephone_client: "", email_client: "",
    ville_bien: "", adresse_bien: "", notes: "", region_code: "",
  })
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState("")
  const [reference, setReference] = useState<string | null>(null)

  function genererReference() {
    const annee = new Date().getFullYear()
    const suffixe = Math.floor(10000 + Math.random() * 90000)
    return `DIAG-${annee}-${suffixe}`
  }

  async function handleSoumettre() {
    if (!form.nom_client || !form.telephone_client || !form.ville_bien || !form.adresse_bien || !form.region_code) {
      setErreur("Nom, téléphone, ville, adresse et région du bien sont obligatoires.")
      return
    }
    setLoading(true); setErreur("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Session expirée, reconnectez-vous.")

      const { data: prescripteur } = await supabase
        .from("prescripteurs").select("id").eq("user_id", user.id).maybeSingle()
      if (!prescripteur) throw new Error("Profil prescripteur introuvable.")

      const ref = genererReference()
      const { error } = await supabase.from("demandes_diagnostic").insert({
        reference: ref,
        prescripteur_id: prescripteur.id,
        nom_client: form.nom_client,
        telephone_client: form.telephone_client,
        email_client: form.email_client || null,
        ville_bien: form.ville_bien,
        adresse_bien: form.adresse_bien,
        notes: form.notes || null,
        type_demande: typeDemande,
        region_code: form.region_code,
      })
      if (error) throw error

      setReference(ref)
      setForm({ nom_client: "", telephone_client: "", email_client: "", ville_bien: "", adresse_bien: "", notes: "", region_code: "" })
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de l'envoi de la demande.")
    } finally {
      setLoading(false)
    }
  }

  if (reference) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "28px" }}>
        <div style={{ fontSize: "13px", color: "#8B5E34", fontFamily: "JetBrains Mono, monospace", marginBottom: "12px" }}>
          Référence {reference}
        </div>
        <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Demande enregistrée</div>
        <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px" }}>Le client sera contacté sous 48h ouvrées.</div>
        <button
          onClick={() => setReference(null)}
          style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2DDD8", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Envoyer une nouvelle demande
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={{ fontSize: "17px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Demande de diagnostic RGA</div>
        <div style={{ fontSize: "13px", color: "#6B7280" }}>Renseignez les coordonnées de votre client — nous prenons le relais pour la prise de rendez-vous.</div>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "10px", padding: "20px" }}>
        {erreur && (
          <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: "14px" }} />
            {erreur}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
          <button
            type="button" onClick={() => setTypeDemande("preventif")}
            style={{
              padding: "9px 16px", borderRadius: "20px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
              border: typeDemande === "preventif" ? "1px solid #A9713F" : "1px solid #E2DDD8",
              background: typeDemande === "preventif" ? "#F5ECE1" : "white",
              color: typeDemande === "preventif" ? "#8B5E34" : "#6B7280",
              fontWeight: typeDemande === "preventif" ? 500 : 400,
            }}
          >
            Préventif — avant travaux
          </button>
          <button
            type="button" onClick={() => setTypeDemande("post_desordre")}
            style={{
              padding: "9px 16px", borderRadius: "20px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
              border: typeDemande === "post_desordre" ? "1px solid #A9713F" : "1px solid #E2DDD8",
              background: typeDemande === "post_desordre" ? "#F5ECE1" : "white",
              color: typeDemande === "post_desordre" ? "#8B5E34" : "#6B7280",
              fontWeight: typeDemande === "post_desordre" ? 500 : 400,
            }}
          >
            Post-désordre — fissures visibles
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Nom du client <span style={{ color: "#B91C1C" }}>*</span></label>
            <input className="input" value={form.nom_client} onChange={e => setForm({ ...form, nom_client: e.target.value })} placeholder="Ex : M. et Mme Lefèvre" />
          </div>
          <div>
            <label style={labelStyle}>Téléphone <span style={{ color: "#B91C1C" }}>*</span></label>
            <input className="input" value={form.telephone_client} onChange={e => setForm({ ...form, telephone_client: e.target.value })} placeholder="06 00 00 00 00" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input className="input" type="email" value={form.email_client} onChange={e => setForm({ ...form, email_client: e.target.value })} placeholder="client@exemple.fr" />
          </div>
          <div>
            <label style={labelStyle}>Ville du bien <span style={{ color: "#B91C1C" }}>*</span></label>
            <input className="input" value={form.ville_bien} onChange={e => setForm({ ...form, ville_bien: e.target.value })} placeholder="Ex : Dax" />
          </div>
          <div>
            <label style={labelStyle}>Région <span style={{ color: "#B91C1C" }}>*</span></label>
            <select className="input" value={form.region_code} onChange={e => setForm({ ...form, region_code: e.target.value })}>
              <option value="">Sélectionner…</option>
              {REGIONS_FRANCE.map(r => <option key={r.code} value={r.code}>{r.nom}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Adresse du bien <span style={{ color: "#B91C1C" }}>*</span></label>
            <input className="input" value={form.adresse_bien} onChange={e => setForm({ ...form, adresse_bien: e.target.value })} placeholder="Numéro, rue, code postal" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Notes (contexte, urgence, sinistre en cours…)</label>
            <textarea
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #E2DDD8", borderRadius: "8px", fontSize: "14px", fontFamily: "Inter, sans-serif", color: "#111827", background: "white", outline: "none", resize: "none", height: "80px", boxSizing: "border-box" as const }}
              placeholder="Ex : sinistre déclaré en juillet 2026, indemnisation contestée"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={handleSoumettre} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "7px", border: "none", background: "#A9713F", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-send" style={{ fontSize: "14px" }} />
              {loading ? "Envoi…" : "Envoyer la demande"}
            </button>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>Le client sera contacté sous 48h ouvrées.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "6px" }