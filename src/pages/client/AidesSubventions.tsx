import React from "react"

interface Aide {
  id: string
  nom: string
  icon: string
  couleur: string
  fond: string
  accroche: string
  description: string
  eligibilite: string[]
  cumul: string
  lien: string
  lienLabel: string
}

const AIDES: Aide[] = [
  {
    id: "cee",
    nom: "Certificats d'Économies d'Énergie (CEE)",
    icon: "ti-bolt",
    couleur: "#D97706",
    fond: "#FFFBEB",
    accroche: "Prime énergie versée par les fournisseurs d'énergie",
    description:
      "Dispositif imposé par l'État aux fournisseurs d'énergie (EDF, TotalEnergies, Engie…), qui doivent financer des travaux d'économies d'énergie chez leurs clients. Il finance l'isolation, le chauffage performant et la ventilation, selon des fiches d'opérations standardisées. La 6ᵉ période court du 1ᵉʳ janvier 2026 au 31 décembre 2030.",
    eligibilite: [
      "Travaux réalisés par un artisan certifié RGE (Reconnu Garant de l'Environnement)",
      "Demande de prime déposée avant la signature du devis — obligatoire",
      "Cumulable avec MaPrimeRénov', l'éco-PTZ et la TVA à taux réduit",
    ],
    cumul: "Cumul possible avec MaPrimeRénov' et l'éco-PTZ, dans la limite de 90 % (ménages très modestes) ou 80 % (autres ménages) du coût TTC des travaux.",
    lien: "https://france-renov.gouv.fr/aides/cee",
    lienLabel: "france-renov.gouv.fr",
  },
  {
    id: "rga",
    nom: "Fonds de Prévention Argile (RGA)",
    icon: "ti-layers",
    couleur: "#991B1B",
    fond: "#FEF2F2",
    accroche: "Aide au diagnostic et aux travaux préventifs contre le retrait-gonflement des argiles",
    description:
      "Dispositif expérimental de l'État finançant, sous conditions de ressources, le diagnostic de vulnérabilité et les travaux préventifs contre le RGA pour les propriétaires occupants en zone d'exposition forte. Actuellement expérimenté dans 11 départements (Allier, Alpes-de-Haute-Provence, Dordogne, Gers, Indre, Lot-et-Garonne, Meurthe-et-Moselle, Nord, Puy-de-Dôme, Tarn, Tarn-et-Garonne).",
    eligibilite: [
      "Propriétaire occupant de sa résidence principale, en zone d'exposition forte au RGA",
      "Conditions de ressources (plafonds ANAH, revenu fiscal de référence N-1)",
      "Logement de 3 niveaux maximum (sous-sol et combles compris)",
      "Non éligible si une demande d'indemnisation catastrophe naturelle est en cours sur le logement",
    ],
    cumul: "Aide versée en 2 phases : diagnostic de vulnérabilité, puis travaux si le diagnostic est concluant.",
    lien: "https://fonds-prevention-argile.beta.gouv.fr/",
    lienLabel: "fonds-prevention-argile.beta.gouv.fr",
  },
  {
    id: "maprimerenov",
    nom: "MaPrimeRénov' (ANAH)",
    icon: "ti-home-check",
    couleur: "#0F6E56",
    fond: "#ECFDF5",
    accroche: "Aide principale de l'État pour la rénovation énergétique du logement",
    description:
      "Aide versée par l'ANAH pour financer les travaux d'amélioration de la performance énergétique (isolation, chauffage, ventilation). Son montant est calculé selon les revenus du foyer et le gain de performance obtenu. Cumulable avec les CEE sur la quasi-totalité des opérations.",
    eligibilite: [
      "Propriétaire occupant, bailleur ou copropriété, selon le parcours",
      "Logement de plus de 15 ans (parcours par geste) ou sans condition d'âge (parcours accompagné)",
      "Travaux réalisés par un professionnel certifié RGE",
    ],
    cumul: "Cumulable avec les CEE et l'éco-PTZ. Le total des aides publiques ne peut dépasser le coût TTC des travaux.",
    lien: "https://www.service-public.gouv.fr/particuliers/vosdroits/F35247",
    lienLabel: "service-public.gouv.fr",
  },
]

export default function AidesSubventions() {
  return (
    <div style={{ maxWidth: "820px" }}>

      <div style={{
        background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "8px",
        padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#0369A1",
        display: "flex", gap: "8px", alignItems: "flex-start",
      }}>
        <i className="ti ti-info-circle" style={{ marginTop: "1px" }} />
        <span>
          Ces informations sont données à titre indicatif et peuvent évoluer. Vérifiez toujours
          votre éligibilité et les montants sur les sites officiels avant d'engager une démarche.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {AIDES.map(aide => (
          <div key={aide.id} style={{
            background: "#FFFFFF", border: "1px solid #E5E1DA", borderRadius: "12px",
            padding: "20px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "12px" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "10px", background: aide.fond,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <i className={`ti ${aide.icon}`} style={{ fontSize: "20px", color: aide.couleur }} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#1F2937" }}>{aide.nom}</div>
                <div style={{ fontSize: "13px", color: "#78716C", marginTop: "2px" }}>{aide.accroche}</div>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#1F2937", lineHeight: 1.6, marginBottom: "14px" }}>
              {aide.description}
            </p>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                Conditions principales
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {aide.eligibilite.map((e, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "#1F2937", lineHeight: 1.5 }}>{e}</li>
                ))}
              </ul>
            </div>

            <div style={{
              background: "#F8F7F4", borderRadius: "8px", padding: "10px 14px",
              fontSize: "12px", color: "#78716C", marginBottom: "14px",
            }}>
              <i className="ti ti-arrows-diagonal" style={{ marginRight: "6px" }} />
              {aide.cumul}
            </div>

            <a
              href={aide.lien}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontSize: "13px", fontWeight: 500, color: aide.couleur,
                textDecoration: "none",
              }}
            >
              <i className="ti ti-external-link" style={{ fontSize: "14px" }} />
              Vérifier mon éligibilité sur {aide.lienLabel}
            </a>
          </div>
        ))}
      </div>

    </div>
  )
}