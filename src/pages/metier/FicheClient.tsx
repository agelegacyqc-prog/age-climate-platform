import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft, Building2, MapPin, Users, Briefcase, Globe,
  Phone, Mail, Hash, Edit2, Save, X, TrendingUp,
  Home, Megaphone, FolderOpen, AlertTriangle, CheckCircle,
  OctagonX, StickyNote, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Organisation {
  id: string;
  raison_sociale: string;
  siren: string | null;
  siret: string | null;
  type_client: string;
  secteur: string | null;
  code_naf: string | null;
  effectifs: number | null;
  nb_sites: number | null;
  ca_tranche: string | null;
  region: string | null;
  actif: boolean;
  notes_consultant: string | null;
  adresse: {
    rue?: string;
    code_postal?: string;
    ville?: string;
  } | null;
  contact: {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    fonction?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface ConsolideeData {
  nb_biens: number;
  nb_campagnes: number;
  nb_dossiers: number;
  score_moyen: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CLIENT_LABELS: Record<string, string> = {
  assureur: "Assureur",
  banque: "Banque",
  asset_manager: "Asset Manager",
  collectivite: "Collectivité",
  entreprise: "Entreprise",
  proprietaire: "Propriétaire",
  particulier: "Particulier",
};

const CA_OPTIONS = [
  "< 2 M€", "2–10 M€", "10–50 M€", "50–250 M€", "> 250 M€"
];

const EFFECTIFS_OPTIONS = [
  { label: "1–10", value: 1 },
  { label: "11–49", value: 11 },
  { label: "50–249", value: 50 },
  { label: "250–499", value: 250 },
  { label: "500–999", value: 500 },
  { label: "1 000+", value: 1000 },
];

function scoreColor(score: number | null): { color: string; icon: React.ReactElement } {
  if (score === null) return { color: "#78716C", icon: <AlertTriangle size={14} /> };
  if (score >= 70) return { color: "#2F7D5C", icon: <CheckCircle size={14} /> };
  if (score >= 40) return { color: "#D97706", icon: <AlertTriangle size={14} /> };
  return { color: "#B91C1C", icon: <OctagonX size={14} /> };
}

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("fr-FR");
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function FicheClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<Organisation | null>(null);
  const [consolide, setConsolide] = useState<ConsolideeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Organisation>>({});
  const [activeTab, setActiveTab] = useState<"identite" | "contact" | "notes">("identite");

  // ── Chargement organisation ──
  useEffect(() => {
    if (!id) return;
    loadOrg();
    loadConsolide();
  }, [id]);

  async function loadOrg() {
    setLoading(true);
    const { data, error } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) setError(error.message);
    else if (data) setOrg(data as Organisation);
    setLoading(false);
  }

  async function loadConsolide() {
    if (!id) return;
    const [biens, campagnes, dossiers, scores] = await Promise.all([
      supabase.from("biens").select("id", { count: "exact", head: true }).eq("client_id", id),
      supabase.from("campagnes").select("id", { count: "exact", head: true }).eq("client_id", id),
      supabase.from("dossiers").select("id", { count: "exact", head: true }).eq("client_id", id),
      supabase.from("actifs").select("score_climatique").eq("client_id", id).not("score_climatique", "is", null),
    ]);
    const scoreVals = (scores.data ?? []).map((r: { score_climatique: number }) => r.score_climatique);
    const scoreMoyen = scoreVals.length
      ? Math.round(scoreVals.reduce((a: number, b: number) => a + b, 0) / scoreVals.length)
      : null;
    setConsolide({
      nb_biens: biens.count ?? 0,
      nb_campagnes: campagnes.count ?? 0,
      nb_dossiers: dossiers.count ?? 0,
      score_moyen: scoreMoyen,
    });
  }

  // ── Édition ──
  function startEdit() {
    if (!org) return;
    setDraft({
      raison_sociale: org.raison_sociale,
      siren: org.siren,
      siret: org.siret,
      secteur: org.secteur,
      code_naf: org.code_naf,
      effectifs: org.effectifs,
      nb_sites: org.nb_sites,
      ca_tranche: org.ca_tranche,
      region: org.region,
      notes_consultant: org.notes_consultant,
      contact: org.contact ?? {},
      adresse: org.adresse ?? {},
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft({});
  }

  async function saveEdit() {
    if (!id || !org) return;
    setSaving(true);
    const { error } = await supabase
      .from("organisations")
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setError(error.message);
    } else {
      await loadOrg();
      setEditing(false);
      setDraft({});
    }
    setSaving(false);
  }

  function setDraftField<K extends keyof Organisation>(key: K, value: Organisation[K]) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function setContactField(key: string, value: string) {
    setDraft(d => ({ ...d, contact: { ...(d.contact ?? {}), [key]: value } }));
  }

  function setAdresseField(key: string, value: string) {
    setDraft(d => ({ ...d, adresse: { ...(d.adresse ?? {}), [key]: value } }));
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#78716C" }}>
      Chargement…
    </div>
  );

  if (!org) return (
    <div style={{ padding: 32, color: "#B91C1C" }}>Client introuvable.</div>
  );

  const sc = scoreColor(consolide?.score_moyen ?? null);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Fil d'Ariane ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "#78716C" }}>
        <button onClick={() => navigate("/metier/clients")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#78716C", padding: 0 }}>
          <ArrowLeft size={14} /> Clients
        </button>
        <ChevronRight size={12} />
        <span style={{ color: "#1F2937", fontWeight: 500 }}>{org.raison_sociale}</span>
      </div>

      {/* ── Header ── */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #E5E1DA",
        padding: "24px 28px", marginBottom: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Building2 size={26} color="#1D9E75" />
            </div>
            <div>
              {editing ? (
                <input
                  value={(draft.raison_sociale as string) ?? ""}
                  onChange={e => setDraftField("raison_sociale", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1F2937" }}>
                  {org.raison_sociale}
                </h1>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <Badge label={TYPE_CLIENT_LABELS[org.type_client] ?? org.type_client} color="#1D9E75" />
                {org.secteur && <Badge label={org.secteur} color="#0369A1" />}
                <Badge label={org.actif ? "Actif" : "Inactif"} color={org.actif ? "#2F7D5C" : "#78716C"} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {editing ? (
              <>
                <button onClick={cancelEdit} style={btnSecondary}>
                  <X size={14} /> Annuler
                </button>
                <button onClick={saveEdit} disabled={saving} style={btnPrimary}>
                  <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            ) : (
              <button onClick={startEdit} style={btnPrimary}>
                <Edit2 size={14} /> Modifier
              </button>
            )}
          </div>
        </div>

        {/* ── KPIs consolidés ── */}
        {consolide && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 24,
            borderTop: "1px solid #E5E1DA", paddingTop: 20
          }}>
            <KPI icon={<Home size={16} color="#1D9E75" />} label="Biens" value={fmt(consolide.nb_biens)}
              onClick={() => navigate(`/metier/portefeuille?client=${id}`)} />
            <KPI icon={<Megaphone size={16} color="#0369A1" />} label="Campagnes" value={fmt(consolide.nb_campagnes)}
              onClick={() => navigate(`/metier/campagnes?client=${id}`)} />
            <KPI icon={<FolderOpen size={16} color="#7C3AED" />} label="Dossiers" value={fmt(consolide.nb_dossiers)}
              onClick={() => navigate(`/metier/dossiers?client=${id}`)} />
            <KPI
              icon={<span style={{ color: sc.color }}>{sc.icon}</span>}
              label="Score moyen"
              value={consolide.score_moyen !== null ? `${consolide.score_moyen} / 100` : "—"}
              valueColor={sc.color}
            />
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#B91C1C", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E5E1DA", marginBottom: 20 }}>
        {(["identite", "contact", "notes"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #1D9E75" : "2px solid transparent",
            padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
            color: activeTab === tab ? "#1D9E75" : "#78716C", marginBottom: -1
          }}>
            {tab === "identite" ? "Identité" : tab === "contact" ? "Contact" : "Notes"}
          </button>
        ))}
      </div>

      {/* ── Contenu onglets ── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E1DA", padding: "24px 28px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>

        {/* ── ONGLET IDENTITÉ ── */}
        {activeTab === "identite" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Field label="SIREN" icon={<Hash size={14} />}
              value={org.siren} editing={editing}
              input={<input value={(draft.siren as string) ?? ""} onChange={e => setDraftField("siren", e.target.value)} style={inputStyle} maxLength={9} placeholder="123 456 789" />} />
            <Field label="SIRET" icon={<Hash size={14} />}
              value={org.siret} editing={editing}
              input={<input value={(draft.siret as string) ?? ""} onChange={e => setDraftField("siret", e.target.value)} style={inputStyle} maxLength={14} placeholder="123 456 789 00012" />} />
            <Field label="Code NAF" icon={<Briefcase size={14} />}
              value={org.code_naf} editing={editing}
              input={<input value={(draft.code_naf as string) ?? ""} onChange={e => setDraftField("code_naf", e.target.value)} style={inputStyle} placeholder="ex. 6419Z" />} />
            <Field label="Secteur d'activité" icon={<Briefcase size={14} />}
              value={org.secteur} editing={editing}
              input={<input value={(draft.secteur as string) ?? ""} onChange={e => setDraftField("secteur", e.target.value)} style={inputStyle} />} />
            <Field label="Effectifs" icon={<Users size={14} />}
              value={org.effectifs ? `${fmt(org.effectifs)} salariés` : null} editing={editing}
              input={
                <select value={draft.effectifs ?? ""} onChange={e => setDraftField("effectifs", Number(e.target.value) as unknown as Organisation["effectifs"])} style={inputStyle}>
                  <option value="">— Sélectionner</option>
                  {EFFECTIFS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              } />
            <Field label="Nombre de sites" icon={<MapPin size={14} />}
              value={org.nb_sites ? `${org.nb_sites} site${org.nb_sites > 1 ? "s" : ""}` : null} editing={editing}
              input={<input type="number" min={1} value={draft.nb_sites ?? ""} onChange={e => setDraftField("nb_sites", Number(e.target.value) as unknown as Organisation["nb_sites"])} style={inputStyle} />} />
            <Field label="Chiffre d'affaires" icon={<TrendingUp size={14} />}
              value={org.ca_tranche} editing={editing}
              input={
                <select value={(draft.ca_tranche as string) ?? ""} onChange={e => setDraftField("ca_tranche", e.target.value)} style={inputStyle}>
                  <option value="">— Sélectionner</option>
                  {CA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              } />
            <Field label="Région" icon={<Globe size={14} />}
              value={org.region} editing={editing}
              input={<input value={(draft.region as string) ?? ""} onChange={e => setDraftField("region", e.target.value)} style={inputStyle} />} />

            {/* Adresse pleine largeur */}
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={labelStyle}><MapPin size={14} /> Adresse</p>
              {editing ? (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                  <input placeholder="Rue" value={draft.adresse?.rue ?? ""} onChange={e => setAdresseField("rue", e.target.value)} style={inputStyle} />
                  <input placeholder="Code postal" value={draft.adresse?.code_postal ?? ""} onChange={e => setAdresseField("code_postal", e.target.value)} style={inputStyle} />
                  <input placeholder="Ville" value={draft.adresse?.ville ?? ""} onChange={e => setAdresseField("ville", e.target.value)} style={inputStyle} />
                </div>
              ) : (
                <p style={valueStyle}>
                  {org.adresse
                    ? [org.adresse.rue, org.adresse.code_postal, org.adresse.ville].filter(Boolean).join(", ")
                    : "—"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── ONGLET CONTACT ── */}
        {activeTab === "contact" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Field label="Nom" icon={<Users size={14} />}
              value={org.contact?.nom ?? null} editing={editing}
              input={<input value={draft.contact?.nom ?? ""} onChange={e => setContactField("nom", e.target.value)} style={inputStyle} />} />
            <Field label="Prénom" icon={<Users size={14} />}
              value={org.contact?.prenom ?? null} editing={editing}
              input={<input value={draft.contact?.prenom ?? ""} onChange={e => setContactField("prenom", e.target.value)} style={inputStyle} />} />
            <Field label="Fonction" icon={<Briefcase size={14} />}
              value={org.contact?.fonction ?? null} editing={editing}
              input={<input value={draft.contact?.fonction ?? ""} onChange={e => setContactField("fonction", e.target.value)} style={inputStyle} />} />
            <Field label="Email" icon={<Mail size={14} />}
              value={org.contact?.email ?? null} editing={editing}
              input={<input type="email" value={draft.contact?.email ?? ""} onChange={e => setContactField("email", e.target.value)} style={inputStyle} />} />
            <Field label="Téléphone" icon={<Phone size={14} />}
              value={org.contact?.telephone ?? null} editing={editing}
              input={<input value={draft.contact?.telephone ?? ""} onChange={e => setContactField("telephone", e.target.value)} style={inputStyle} />} />
          </div>
        )}

        {/* ── ONGLET NOTES ── */}
        {activeTab === "notes" && (
          <div>
            <p style={labelStyle}><StickyNote size={14} /> Notes consultant</p>
            {editing ? (
              <textarea
                rows={10}
                value={(draft.notes_consultant as string) ?? ""}
                onChange={e => setDraftField("notes_consultant", e.target.value)}
                placeholder="Notes internes, contexte, historique…"
                style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
              />
            ) : (
              <p style={{ ...valueStyle, whiteSpace: "pre-wrap", lineHeight: 1.7, minHeight: 80 }}>
                {org.notes_consultant || <span style={{ color: "#78716C", fontStyle: "italic" }}>Aucune note.</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer meta ── */}
      <p style={{ fontSize: 12, color: "#78716C", marginTop: 16, textAlign: "right" }}>
        Créé le {new Date(org.created_at).toLocaleDateString("fr-FR")} ·
        Mis à jour le {new Date(org.updated_at).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
      background: color + "18", color, border: `1px solid ${color}30`
    }}>{label}</span>
  );
}

function KPI({ icon, label, value, valueColor, onClick }: {
  icon: React.ReactNode; label: string; value: string;
  valueColor?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: "#F8F7F4", borderRadius: 10, padding: "14px 16px",
      cursor: onClick ? "pointer" : "default",
      border: "1px solid #E5E1DA",
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 12, color: "#78716C" }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: valueColor ?? "#1F2937", fontFamily: "JetBrains Mono, monospace" }}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, icon, value, editing, input }: {
  label: string; icon: React.ReactNode;
  value: string | null | undefined;
  editing: boolean; input: React.ReactNode;
}) {
  return (
    <div>
      <p style={labelStyle}>{icon} {label}</p>
      {editing ? input : <p style={valueStyle}>{value || "—"}</p>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid #E5E1DA", fontSize: 14, color: "#1F2937",
  background: "#fff", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  margin: "0 0 6px 0", fontSize: 12, fontWeight: 600,
  color: "#78716C", display: "flex", alignItems: "center", gap: 5,
  textTransform: "uppercase", letterSpacing: "0.04em"
};

const valueStyle: React.CSSProperties = {
  margin: 0, fontSize: 15, color: "#1F2937", fontWeight: 500
};

const btnPrimary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "#1D9E75", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
};

const btnSecondary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8,
  border: "1px solid #E5E1DA", background: "#fff",
  color: "#1F2937", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit"
};