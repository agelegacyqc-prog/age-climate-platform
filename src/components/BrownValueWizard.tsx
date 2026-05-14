/**
 * BrownValueWizard.tsx
 * Workflow 5 étapes — module Brown Value
 * Couleur primaire module : #B25C2A
 */

import React, { useState, useCallback, useMemo } from "react"
import {
  calculerBrownValue,
  getImpactNetStyle,
  formatEuros,
  formatPct,
  HAZARDS_DEFAUT,
  INPUTS_DEFAUT,
  type BrownValueInputs,
  type HazardInput,
  type MethodeFinale,
  type BrownValueResult,
} from "../lib/brownValueEngine"

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  brown: "#B25C2A",
  brownLight: "#FDF3EC",
  brownBorder: "#E8C9B0",
  forest: "#2F7D5C",
  amber: "#D97706",
  crimson: "#B91C1C",
  sky: "#0369A1",
  slate: "#1F2937",
  offWhite: "#F8F7F4",
  white: "#FFFFFF",
  stone: "#E5E1DA",
  stone500: "#78716C",
}

// ─── Icônes SVG ───────────────────────────────────────────────────────────────
const Icon = {
  thermometer: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>
  ),
  waves: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>
  ),
  wind: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  layers: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  ),
  flame: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  cloudLightning: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>
    </svg>
  ),
  thermometerSun: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9a4 4 0 0 0-2 7.5"/><path d="M12 3v2"/><path d="m6.6 18.4-1.4 1.4"/><path d="M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><path d="M4 13H2"/><path d="m6.6 7-1.4-1.4"/><path d="M12 21v-3"/><path d="m17.4 7 1.4-1.4"/><path d="M20 13h2"/>
    </svg>
  ),
  checkCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  alertTriangle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
    </svg>
  ),
  octagonX: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
    </svg>
  ),
  check: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  chevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  chevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
}

const HAZARD_ICONS = [
  Icon.waves,
  Icon.wind,
  Icon.layers,
  Icon.flame,
  Icon.cloudLightning,
  Icon.thermometerSun,
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumber(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${focused ? T.brown : T.stone}`,
    outline: focused ? `2px solid ${T.brown}` : "none",
    outlineOffset: "1px",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', monospace",
    color: T.slate,
    background: T.white,
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s, outline 0.15s",
  }
}

function labelStyle(): React.CSSProperties {
  return {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: T.stone500,
    marginBottom: "6px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  }
}

// ─── Composants ───────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "number", unit, hint, min, max, step }: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: "text" | "number"
  unit?: string
  hint?: string
  min?: number
  max?: number
  step?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={labelStyle()}>
        {label}
        {unit && <span style={{ color: T.brown, marginLeft: 4 }}>{unit}</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        min={min} max={max} step={step}
        style={inputStyle(focused)}
      />
      {hint && (
        <div style={{ fontSize: "11px", color: T.stone500, marginTop: 4 }}>
          <Icon.info /> {hint}
        </div>
      )}
    </div>
  )
}

function Select({ label, value, onChange, options, hint }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  hint?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={labelStyle()}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputStyle(focused), cursor: "pointer", fontFamily: "inherit" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && (
        <div style={{ fontSize: "11px", color: T.stone500, marginTop: 4 }}>
          <Icon.info /> {hint}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color }: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div style={{ background: T.white, borderRadius: "12px", padding: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: `1px solid ${T.stone}` }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: T.stone500, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 800, color: color || T.slate, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: T.stone500, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const ETAPES = [
  { id: 1, label: "Bien" },
  { id: 2, label: "Hypothèses" },
  { id: 3, label: "Aléas" },
  { id: 4, label: "Synthèse" },
  { id: 5, label: "Export" },
]

function Stepper({ etape }: { etape: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
      {ETAPES.map((e, i) => (
        <React.Fragment key={e.id}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "13px",
              background: etape > e.id ? T.forest : etape === e.id ? T.brown : T.stone,
              color: etape >= e.id ? T.white : T.stone500,
            }}>
              {etape > e.id ? <Icon.check /> : e.id}
            </div>
            <div style={{ fontSize: "11px", fontWeight: etape === e.id ? 700 : 500, color: etape === e.id ? T.brown : T.stone500, marginTop: 4 }}>
              {e.label}
            </div>
          </div>
          {i < ETAPES.length - 1 && (
            <div style={{ flex: 2, height: 2, background: etape > e.id ? T.forest : T.stone }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Bandeau impact ───────────────────────────────────────────────────────────

function BandeauImpact({ result }: { result: BrownValueResult }) {
  const style = getImpactNetStyle(result.impactNet)
  const IconImpact = style.icon === "check-circle" ? Icon.checkCircle
    : style.icon === "alert-triangle" ? Icon.alertTriangle
    : Icon.octagonX
  return (
    <div style={{ background: style.background, border: `1px solid ${style.color}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
      <div style={{ color: style.color }}><IconImpact /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: style.color, fontSize: "14px" }}>{style.label}</div>
        <div style={{ color: T.slate, fontSize: "13px" }}>
          Impact net : <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatPct(result.impactNet)}</strong>
          {" — "}Valeur ajustée : <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(result.valeurAjustee)}</strong>
        </div>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: style.color, fontFamily: "'JetBrains Mono', monospace" }}>
        {formatPct(result.impactNet)}
      </div>
    </div>
  )
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

interface BrownValueWizardProps {
  actifId?: string
  valeurMarcheInitiale?: number
  onClose?: () => void
}

export default function BrownValueWizard({ actifId, valeurMarcheInitiale, onClose }: BrownValueWizardProps) {
  const [etape, setEtape] = useState(1)

  // Étape 1
  const [valeurMarche, setValeurMarche] = useState(String(valeurMarcheInitiale || INPUTS_DEFAUT.valeurMarche))
  const [surface, setSurface] = useState(String(INPUTS_DEFAUT.surface))
  const [typeBien, setTypeBien] = useState(INPUTS_DEFAUT.typeBien)
  const [etageVal, setEtageVal] = useState(String(INPUTS_DEFAUT.etage))
  const [anneeConstruction, setAnneeConstruction] = useState(String(INPUTS_DEFAUT.anneeConstruction))
  const [rdcVulnerable, setRdcVulnerable] = useState<"Oui" | "Non">("Oui")
  const [fondations, setFondations] = useState(INPUTS_DEFAUT.fondations)
  const [tensionMarche, setTensionMarche] = useState(INPUTS_DEFAUT.tensionMarcheLocal)
  const [delaiVente, setDelaiVente] = useState(String(INPUTS_DEFAUT.delaiVenteLocal))

  // Étape 2
  const [horizon, setHorizon] = useState(String(INPUTS_DEFAUT.horizonAnnees))
  const [tauxActu, setTauxActu] = useState(String(INPUTS_DEFAUT.tauxActualisation * 100))
  const [croissanceRisque, setCroissanceRisque] = useState(String(INPUTS_DEFAUT.croissanceRisque * 100))
  const [primeAssurance, setPrimeAssurance] = useState(String(INPUTS_DEFAUT.primeAssuranceActuelle))
  const [surprime, setSurprime] = useState(String(INPUTS_DEFAUT.surprimeAnnuelle))
  const [coutPortage, setCoutPortage] = useState(String(INPUTS_DEFAUT.coutPortage))
  const [surcroitDelai, setSurcroitDelai] = useState(String(INPUTS_DEFAUT.surcroitDelai))
  const [capDecote, setCapDecote] = useState(String(INPUTS_DEFAUT.capDecote))
  const [poidsDCF, setPoidsDCF] = useState(String(INPUTS_DEFAUT.poidsDCF * 100))
  const [methode, setMethode] = useState<MethodeFinale>(INPUTS_DEFAUT.methodeFinale)
  const [decoteMarcheCible, setDecoteMarcheCible] = useState(String(INPUTS_DEFAUT.decoteMarcheCible))
  const [primeAversion, setPrimeAversion] = useState(String(INPUTS_DEFAUT.primeAversion))
  const [greenPremium, setGreenPremium] = useState(String(INPUTS_DEFAUT.greenPremium))

  // Étape 3
  const [hazards, setHazards] = useState<HazardInput[]>(HAZARDS_DEFAUT.map(h => ({ ...h })))

  const updateHazard = useCallback((i: number, field: keyof HazardInput, value: string | boolean) => {
    setHazards(prev => {
      const next = [...prev]
      if (field === "adaptationRealisee") {
        next[i] = { ...next[i], [field]: value as boolean }
      } else {
        next[i] = { ...next[i], [field]: parseNumber(value as string) }
      }
      return next
    })
  }, [])

  // Calcul live
  const inputs: BrownValueInputs = useMemo(() => ({
    valeurMarche: parseNumber(valeurMarche),
    surface: parseNumber(surface),
    typeBien,
    etage: parseNumber(etageVal),
    anneeConstruction: parseNumber(anneeConstruction),
    rdcVulnerable: rdcVulnerable === "Oui",
    fondations,
    tensionMarcheLocal: tensionMarche,
    delaiVenteLocal: parseNumber(delaiVente),
    horizonAnnees: parseNumber(horizon),
    tauxActualisation: parseNumber(tauxActu) / 100,
    croissanceRisque: parseNumber(croissanceRisque) / 100,
    primeAssuranceActuelle: parseNumber(primeAssurance),
    surprimeAnnuelle: parseNumber(surprime),
    coutPortage: parseNumber(coutPortage),
    surcroitDelai: parseNumber(surcroitDelai),
    capDecote: parseNumber(capDecote),
    poidsDCF: parseNumber(poidsDCF) / 100,
    methodeFinale: methode,
    decoteMarcheCible: parseNumber(decoteMarcheCible),
    primeAversion: parseNumber(primeAversion),
    greenPremium: parseNumber(greenPremium),
    hazards,
  }), [valeurMarche, surface, typeBien, etageVal, anneeConstruction, rdcVulnerable,
      fondations, tensionMarche, delaiVente, horizon, tauxActu, croissanceRisque,
      primeAssurance, surprime, coutPortage, surcroitDelai, capDecote, poidsDCF,
      methode, decoteMarcheCible, primeAversion, greenPremium, hazards])

  const result = useMemo(() => calculerBrownValue(inputs), [inputs])
  const impactStyle = getImpactNetStyle(result.impactNet)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: T.slate, background: T.offWhite, borderRadius: "16px", padding: "28px" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "10px", background: T.brownLight, display: "flex", alignItems: "center", justifyContent: "center", color: T.brown, border: `1px solid ${T.brownBorder}` }}>
          <Icon.thermometer />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "17px" }}>Brown Value</div>
          <div style={{ fontSize: "12px", color: T.stone500 }}>Décote climatique — v1.0</div>
        </div>
        {actifId && (
          <div style={{ marginLeft: "auto", fontSize: "11px", color: T.stone500, background: T.white, border: `1px solid ${T.stone}`, borderRadius: "6px", padding: "4px 10px" }}>
            Actif #{actifId.slice(0, 8)}
          </div>
        )}
      </div>

      <Stepper etape={etape} />

      {/* Bandeau résultat live */}
      {etape <= 3 && (
        <div style={{ background: T.white, border: `1px solid ${T.stone}`, borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: T.stone500, fontWeight: 600, textTransform: "uppercase" }}>Live</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "15px", color: impactStyle.color }}>
            {formatPct(result.impactNet)}
          </div>
          <div style={{ color: T.stone500, fontSize: "13px" }}>
            Décote : <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(result.decoteFinale)}</strong>
            {" → "}<strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(result.valeurAjustee)}</strong>
          </div>
          <div style={{ marginLeft: "auto", color: T.stone500, fontSize: "12px" }}>
            Méthode : <strong>{methode}</strong>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 1 ── */}
      {etape === 1 && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "20px", color: T.brown }}>
            Étape 1 — Caractéristiques du bien
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Valeur de marché actuelle (€) soit V" value={valeurMarche} onChange={setValeurMarche} unit="€" hint="Valeur d'entrée pour le calcul de la décote" />
              <Field label="Surface (m²)" value={surface} onChange={setSurface} unit="m²" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Select label="Type de bien" value={typeBien} onChange={setTypeBien} options={[
                { value: "Maison", label: "Maison" },
                { value: "Appartement", label: "Appartement" },
                { value: "Immeuble", label: "Immeuble" },
                { value: "Local commercial", label: "Local commercial" },
                { value: "Entrepôt", label: "Entrepôt" },
              ]} />
              <Field label="Étage (si appartement)" value={etageVal} onChange={setEtageVal} min={0} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Année de construction" value={anneeConstruction} onChange={setAnneeConstruction} min={1800} max={2025} />
              <Select label="RDC vulnérable (Oui/Non)" value={rdcVulnerable} onChange={v => setRdcVulnerable(v as "Oui" | "Non")} options={[{ value: "Oui", label: "Oui" }, { value: "Non", label: "Non" }]} hint="Paramètre influençant le facteur de vulnérabilité v" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Select label="Fondations" value={fondations} onChange={setFondations} options={[
                { value: "Superficielles", label: "Superficielles" },
                { value: "Profondes", label: "Profondes" },
                { value: "Semi-profondes", label: "Semi-profondes" },
              ]} hint="Peut influer sur l'aléa RGA via le facteur v" />
              <Select label="Tension du marché local" value={tensionMarche} onChange={setTensionMarche} options={[
                { value: "Faible", label: "Faible" },
                { value: "Moyenne", label: "Moyenne" },
                { value: "Forte", label: "Forte" },
              ]} />
            </div>
            <Field label="Délai moyen de vente local (jours)" value={delaiVente} onChange={setDelaiVente} unit="jours" hint="Base pour estimer le surcroît de délai lié au risque" min={0} />
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 ── */}
      {etape === 2 && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "20px", color: T.brown }}>
            Étape 2 — Hypothèses financières et de marché
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Horizon d'analyse (années, nb n)" value={horizon} onChange={setHorizon} unit="ans" hint="Durée d'actualisation des flux" min={1} max={50} />
              <Field label="Taux d'actualisation r (%)" value={tauxActu} onChange={setTauxActu} unit="%" step={0.1} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Croissance annuelle du risque g (%)" value={croissanceRisque} onChange={setCroissanceRisque} unit="%" step={0.1} />
              <Field label="Prime d'assurance actuelle (€/an)" value={primeAssurance} onChange={setPrimeAssurance} unit="€/an" hint="Information contextuelle" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Surprime annuelle liée au risque (€/an)" value={surprime} onChange={setSurprime} unit="€/an" hint="Flux annuel actualisé avec le facteur PV" />
              <Field label="Coût de portage (charges+intérêts) (€/mois)" value={coutPortage} onChange={setCoutPortage} unit="€/mois" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Surcroît délai de vente dû au risque (jours)" value={surcroitDelai} onChange={setSurcroitDelai} unit="jours" min={0} />
              <Field label="Décote marché max (cap) (%)" value={capDecote} onChange={setCapDecote} unit="%" hint="Plafond DCF : cap × V" min={0} max={100} />
            </div>
            <div style={{ borderTop: `1px solid ${T.stone}`, paddingTop: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: T.stone500, textTransform: "uppercase", marginBottom: "12px" }}>Méthode et calibration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Select label="Méthode finale" value={methode} onChange={v => setMethode(v as MethodeFinale)} options={[
                  { value: "DCF", label: "DCF" },
                  { value: "Marché", label: "Marché" },
                  { value: "MAX", label: "MAX (DCF, Marché)" },
                  { value: "Pondérée", label: "Pondérée" },
                ]} />
                <Field label="Poids méthode DCF vs Marché (w, 0-100)" value={poidsDCF} onChange={setPoidsDCF} unit="%" hint="Utilisé si méthode Pondérée" min={0} max={100} step={5} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                <Field label="Décote marché cible (%) (si vous avez une calibration locale)" value={decoteMarcheCible} onChange={setDecoteMarcheCible} unit="%" step={0.5} />
                <Field label="Prime d'aversion / réputation (%) [optionnel]" value={primeAversion} onChange={setPrimeAversion} unit="%" step={0.5} />
              </div>
              <div style={{ marginTop: "16px" }}>
                <Field label="Bonus de valeur (Green premium) (%) [optionnel]" value={greenPremium} onChange={setGreenPremium} unit="%" step={0.5} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 ── */}
      {etape === 3 && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px", color: T.brown }}>
            Étape 3 — Aléas climatiques
          </h3>
          <p style={{ fontSize: "13px", color: T.stone500, marginBottom: "20px" }}>
            6 aléas fixes. Renseignez probabilité, dommage, part non assurée, vulnérabilité et adaptation.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {hazards.map((h, i) => {
              const HazardIcon = HAZARD_ICONS[i]
              const hazResult = result.hazardResults[i]
              return (
                <div key={i} style={{ background: T.white, borderRadius: "12px", border: `1px solid ${T.stone}`, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: `1px solid ${T.stone}`, background: T.brownLight }}>
                    <div style={{ color: T.brown }}><HazardIcon /></div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: T.brown, flex: 1 }}>{h.aleas}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: T.stone500 }}>
                      NPV : <strong style={{ color: T.slate }}>{formatEuros(hazResult.coutTotalAlea, 2)}</strong>
                    </div>
                  </div>
                  <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(5, 1fr) 160px", gap: "12px", alignItems: "end" }}>
                    <Field label="Prob. annuelle (%)" value={h.probAnnuelle} onChange={v => updateHazard(i, "probAnnuelle", v)} step={0.1} min={0} />
                    <Field label="Dommage moyen si événement (€)" value={h.dommageMoyen} onChange={v => updateHazard(i, "dommageMoyen", v)} min={0} />
                    <Field label="% non assuré" value={h.partNonAssuree} onChange={v => updateHazard(i, "partNonAssuree", v)} unit="%" min={0} max={100} />
                    <Field label="Facteur vulnérabilité" value={h.facteurVulnerabilite} onChange={v => updateHazard(i, "facteurVulnerabilite", v)} step={0.1} min={0} />
                    <Field label="Coût adaptation (€) (one-off)" value={h.coutAdaptation} onChange={v => updateHazard(i, "coutAdaptation", v)} min={0} />
                    <div>
                      <Field label="Réduction risque si adaptation (%)" value={h.reductionRisque} onChange={v => updateHazard(i, "reductionRisque", v)} min={0} max={100} />
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "8px" }}>
                        <input
                          type="checkbox"
                          checked={h.adaptationRealisee}
                          onChange={e => updateHazard(i, "adaptationRealisee", e.target.checked)}
                          style={{ accentColor: T.brown, width: 14, height: 14 }}
                        />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: h.adaptationRealisee ? T.forest : T.stone500 }}>
                          Adaptation réalisée
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 ── */}
      {etape === 4 && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "16px", color: T.brown }}>
            Étape 4 — Synthèse
          </h3>
          <BandeauImpact result={result} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            <KpiCard label="Valeur de marché (V)" value={formatEuros(inputs.valeurMarche)} />
            <KpiCard label="Décote DCF capée" value={formatEuros(result.decoteDCFCapee)} sub={`Cap : ${formatEuros(result.capDecoteEuros)}`} />
            <KpiCard label="Décote Marché" value={formatEuros(result.decoteMarche)} sub={`${inputs.decoteMarcheCible} % × V`} />
            <KpiCard label={`Décote finale (${methode})`} value={formatEuros(result.decoteFinale)} color={impactStyle.color} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div style={{ background: T.white, borderRadius: "12px", padding: "16px", border: `1px solid ${T.stone}` }}>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>Décomposition de la décote DCF</div>
              {[
                ["NPV pertes aléas", formatEuros(result.npvPertesTotal, 2)],
                ["NPV adaptations", formatEuros(result.npvAdaptationsTotal, 2)],
                ["NPV surprime", formatEuros(result.npvSurprime, 2)],
                ["Pénalité liquidité", formatEuros(result.penaliteLiquidite, 2)],
                ["Décote aversion", formatEuros(result.decoteAversion, 2)],
                ["Facteur PV", result.facteurPV.toFixed(6)],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.offWhite}` }}>
                  <span style={{ fontSize: "13px", color: T.stone500 }}>{k}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>Décote DCF brute</span>
                <span style={{ fontWeight: 800, fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", color: T.brown }}>{formatEuros(result.decoteDCF, 2)}</span>
              </div>
            </div>
            <div style={{ background: T.white, borderRadius: "12px", padding: "16px", border: `1px solid ${T.stone}` }}>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>Contribution par aléa (NPV €)</div>
              {result.hazardResults.map((h, i) => {
                const HazardIcon = HAZARD_ICONS[i]
                const pct = result.npvPertesTotal > 0 ? (h.npvPertes / result.npvPertesTotal) * 100 : 0
                return (
                  <div key={i} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: T.stone500 }}>
                        <span style={{ color: T.brown }}><HazardIcon /></span>
                        <span>{h.aleas.split("(")[0].trim()}</span>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(h.coutTotalAlea, 0)}</span>
                    </div>
                    <div style={{ background: T.offWhite, borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                      <div style={{ background: T.brown, width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "4px" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ background: impactStyle.background, border: `2px solid ${impactStyle.color}`, borderRadius: "12px", padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", color: T.stone500, textTransform: "uppercase", fontWeight: 600 }}>Valeur de marché (V)</div>
              <div style={{ fontSize: "22px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{formatEuros(inputs.valeurMarche)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: T.stone500, textTransform: "uppercase", fontWeight: 600 }}>Décote finale</div>
              <div style={{ fontSize: "22px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: T.crimson }}>− {formatEuros(result.decoteFinale)}</div>
              {result.bonusGreenPremium > 0 && (
                <div style={{ fontSize: "13px", color: T.forest, fontWeight: 600 }}>+ {formatEuros(result.bonusGreenPremium)} green premium</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: T.stone500, textTransform: "uppercase", fontWeight: 600 }}>Valeur ajustée climat</div>
              <div style={{ fontSize: "26px", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: impactStyle.color }}>{formatEuros(result.valeurAjustee)}</div>
              <div style={{ fontSize: "13px", color: impactStyle.color, fontWeight: 700 }}>Impact net : {formatPct(result.impactNet)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 5 ── */}
      {etape === 5 && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "16px", color: T.brown }}>
            Étape 5 — Export
          </h3>
          <BandeauImpact result={result} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { label: "Export PDF", desc: "Rapport complet avec hypothèses et décomposition par aléa", icon: "📄" },
              { label: "Export Excel", desc: "Fichier XLSX avec toutes les données et formules", icon: "📊" },
            ].map((e, i) => (
              <div key={i} style={{ background: T.white, borderRadius: "12px", padding: "20px", border: `1px solid ${T.stone}`, display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "2rem" }}>{e.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>{e.label}</div>
                <div style={{ fontSize: "13px", color: T.stone500 }}>{e.desc}</div>
                <button
                  style={{ background: T.brown, color: T.white, border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px", opacity: actifId ? 1 : 0.5 }}
                  onClick={() => actifId && alert(`Export ${e.label} — implémentation serveur requise`)}>
                  {e.label}
                </button>
                {!actifId && (
                  <div style={{ fontSize: "11px", color: T.amber }}>⚠ Sauvegardez le dossier pour activer l'export</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "20px", borderTop: `1px solid ${T.stone}` }}>
        <button
          onClick={() => etape > 1 ? setEtape(e => e - 1) : onClose?.()}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: T.white, color: T.slate, border: `1px solid ${T.stone}`, padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
          <Icon.chevronLeft /> {etape === 1 ? "Fermer" : "Précédent"}
        </button>
        <div style={{ fontSize: "12px", color: T.stone500 }}>Étape {etape} / {ETAPES.length}</div>
        {etape < ETAPES.length ? (
          <button
            onClick={() => setEtape(e => e + 1)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: T.brown, color: T.white, border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
            Suivant <Icon.chevronRight />
          </button>
        ) : (
          <button
            onClick={() => onClose?.()}
            style={{ background: T.forest, color: T.white, border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
            Terminer
          </button>
        )}
      </div>
    </div>
  )
}