import React, { useState } from "react"

const utilisateurs = [
  { id: 1, nom: "Khouader", prenom: "Amine", email: "akhouader@agelegacy-qc.com", role: "admin",     statut: "actif" },
  { id: 2, nom: "Dupont",   prenom: "Marie",  email: "mdupont@age.fr",             role: "operateur", statut: "actif" },
  { id: 3, nom: "Martin",   prenom: "Paul",   email: "pmartin@assurance.fr",       role: "client",    statut: "actif" },
  { id: 4, nom: "Bernard",  prenom: "Sophie", email: "sbernard@banque.fr",         role: "client",    statut: "inactif" },
]

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin:     { label: "Admin",     color: "#5B21B6", bg: "#F5F3FF" },
  operateur: { label: "Opérateur", color: "#1E40AF", bg: "#EFF6FF" },
  client:    { label: "Client",    color: "#065F46", bg: "#ECFDF5" },
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  actif:   { label: "Actif",   color: "#065F46", bg: "#ECFDF5" },
  inactif: { label: "Inactif", color: "#991B1B", bg: "#FEF2F2" },
}

const ONGLETS = [
  { id: "utilisateurs", label: "Utilisateurs",  icon: "ti-users" },
  { id: "parametres",   label: "Paramètres",     icon: "ti-settings" },
  { id: "workflows",    label: "Workflows",      icon: "ti-git-branch" },
  { id: "documents",    label: "Modèles",        icon: "ti-file-text" },
]

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
  const [onglet, setOnglet] = useState("utilisateurs")

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
            background: onglet === o.id ? "#ECFDF5" : "transparent",
            color: onglet === o.id ? "#065F46" : "#64748B",
            transition: "all 0.12s",
          }}>
            <i className={`ti ${o.icon}`} style={{ fontSize: "15px" }} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>

      {/* Utilisateurs */}
      {onglet === "utilisateurs" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A" }}>
              Utilisateurs <span style={{ fontSize: "13px", color: "#94A3B8", fontWeight: 400 }}>({utilisateurs.length})</span>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}>
              <i className="ti ti-plus" style={{ fontSize: "14px" }} aria-hidden="true" />
              Ajouter
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                {["Utilisateur", "Email", "Rôle", "Statut", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u, i) => {
                const role   = ROLE_CONFIG[u.role]
                const statut = STATUT_CONFIG[u.statut]
                return (
                  <tr key={u.id}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFFFE")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ECFDF5", color: "#065F46", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>
                          {u.prenom[0]}{u.nom[0]}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{u.prenom} {u.nom}</div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748B" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: role.bg, color: role.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{role.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: statut.bg, color: statut.color, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>{statut.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>
                        <i className="ti ti-pencil" style={{ fontSize: "13px" }} aria-hidden="true" />
                        Modifier
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
                    <span style={{ background: "#ECFDF5", color: "#065F46", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 500 }}>Actif</span>
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
            <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0F6E56", color: "white", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: 500, fontFamily: "inherit" }}>
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
    </div>
  )
}