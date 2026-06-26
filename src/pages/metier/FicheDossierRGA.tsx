import React, { useEffect, useState, useRef } from "react";
import PreDiagDrawer from "./PreDiagDrawer";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft, ChevronRight, Home, MapPin, User, Phone, Mail,
  Calendar, FileText, Download, Upload, AlertTriangle,
  CheckCircle, OctagonX, Clock, Wrench, Layers, Waves,
  Shield, ExternalLink, Trash2, Sparkles
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bien {
  id: string;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  type_bien: string | null;
  score_risque: number | null;
  niveau_risque: string | null;
  zone_rga: boolean | null;
  zone_ppri: boolean | null;
  nom_client: string | null;
  type_client: string | null;
  client_id: string | null;
  categorie: string | null;
}

interface Dossier {
  id: string;
  bien_id: string;
  statut: Statut;
  contact_date: string | null;
  rdv_date: string | null;
  diagnostic_date: string | null;
  financement_statut: string | null;
  travaux_statut: string | null;
  created_at: string;
  client_id: string | null;
}

interface Document {
  id: string;
  nom: string;
  nom_fichier: string | null;
  type: string | null;
  type_fichier: string | null;
  categorie: string | null;
  url: string | null;
  storage_path: string | null;
  taille_octets: number | null;
  created_at: string;
}

type Statut = "a_contacter" | "diagnostic" | "travaux" | "termine";

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUTS: {
  key: Statut;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  dateKey: keyof Dossier | null;
  dateLabel: string | null;
}[] = [
  {
    key: "a_contacter",
    label: "À contacter",
    icon: <Phone size={14} />,
    color: "#0369A1",
    bg: "#EFF6FF",
    dateKey: "contact_date",
    dateLabel: "Date de contact",
  },
  {
    key: "diagnostic",
    label: "Diagnostic",
    icon: <Layers size={14} />,
    color: "#7C3AED",
    bg: "#F5F3FF",
    dateKey: "rdv_date",
    dateLabel: "Date RDV",
  },
  {
    key: "travaux",
    label: "Travaux",
    icon: <Wrench size={14} />,
    color: "#D97706",
    bg: "#FFFBEB",
    dateKey: "diagnostic_date",
    dateLabel: "Date diagnostic",
  },
  {
    key: "termine",
    label: "Terminé",
    icon: <CheckCircle size={14} />,
    color: "#2F7D5C",
    bg: "#F0FDF4",
    dateKey: null,
    dateLabel: null,
  },
];

const STATUT_INDEX: Record<Statut, number> = {
  a_contacter: 0,
  diagnostic: 1,
  travaux: 2,
  termine: 3,
};

const FINANCEMENT_LABELS: Record<string, string> = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  obtenu: "Obtenu",
  refuse: "Refusé",
};

const TRAVAUX_LABELS: Record<string, string> = {
  non_demarre: "Non démarré",
  en_cours: "En cours",
  realises: "Réalisés",
  abandonne: "Abandonné",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function fmtTaille(octets: number | null): string {
  if (!octets) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function scoreColor(score: number | null): string {
  if (score === null) return "#78716C";
  if (score >= 70) return "#2F7D5C";
  if (score >= 40) return "#D97706";
  return "#B91C1C";
}

function scoreIcon(score: number | null): React.ReactNode {
  if (score === null) return <AlertTriangle size={14} />;
  if (score >= 70) return <CheckCircle size={14} />;
  if (score >= 40) return <AlertTriangle size={14} />;
  return <OctagonX size={14} />;
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function FicheDossierRGA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [bien, setBien] = useState<Bien | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prediagOpen, setPrediagOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmStatut, setConfirmStatut] = useState<Statut | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) load();
  }, [id]);

  // ── Chargement ──
  async function load() {
    setLoading(true);
    const { data: dos, error: e1 } = await supabase
      .from("dossiers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (e1 || !dos) { setError("Dossier introuvable."); setLoading(false); return; }
    setDossier(dos as Dossier);

    const { data: b } = await supabase
      .from("biens")
      .select("*")
      .eq("id", dos.bien_id)
      .maybeSingle();
    if (b) setBien(b as Bien);

    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("dossier_id", id)
      .order("created_at", { ascending: false });
    setDocuments((docs as Document[]) || []);

    setLoading(false);
  }

  // ── Toast ──
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Changement de statut ──
  async function changerStatut(statut: Statut) {
    if (!dossier) return;
    setSaving(true);
    const updates: Partial<Dossier> = { statut };
    // Remplir la date de l'étape si vide
    const idx = STATUT_INDEX[statut];
    const today = new Date().toISOString().split("T")[0];
    if (idx >= 1 && !dossier.contact_date) updates.contact_date = today;
    if (idx >= 2 && !dossier.rdv_date) updates.rdv_date = today;
    if (idx >= 3 && !dossier.diagnostic_date) updates.diagnostic_date = today;

    const { error } = await supabase
      .from("dossiers")
      .update(updates)
      .eq("id", dossier.id);
    if (error) showToast("Erreur lors de la mise à jour.", "error");
    else {
      setDossier(d => d ? { ...d, ...updates } : d);
      showToast(`Statut mis à jour : ${STATUTS[idx].label}`);
    }
    setConfirmStatut(null);
    setSaving(false);
  }

  // ── Mise à jour champ date ──
  async function updateDate(field: "contact_date" | "rdv_date" | "diagnostic_date", value: string) {
    if (!dossier) return;
    await supabase.from("dossiers").update({ [field]: value || null }).eq("id", dossier.id);
    setDossier(d => d ? { ...d, [field]: value || null } : d);
  }

  // ── Mise à jour financement / travaux ──
  async function updateSelect(field: "financement_statut" | "travaux_statut", value: string) {
    if (!dossier) return;
    await supabase.from("dossiers").update({ [field]: value || null }).eq("id", dossier.id);
    setDossier(d => d ? { ...d, [field]: value } : d);
  }

  // ── Upload document ──
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !dossier) return;
    setUploading(true);
   const safeName = file.name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `dossiers/${dossier.id}/${Date.now()}_${safeName}`;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const typeFileier = ["pdf","csv","xlsx"].includes(ext) ? ext : "autre";
    const { error: upErr } = await supabase.storage
      .from("documents-rga")
      .upload(path, file);
    if (upErr) {
      console.error("UPLOAD ERROR:", JSON.stringify(upErr));
      showToast(`Erreur upload : ${upErr.message}`, "error");
      setUploading(false);
      return;
    }

   const { data: signedData } = await supabase.storage
      .from("documents-rga")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 an
    const { error: dbErr } = await supabase.from("documents").insert({
      dossier_id: dossier.id,
      nom: file.name,
      nom_fichier: file.name,
      type_fichier: typeFileier,
      taille_octets: file.size,
      storage_path: path,
      url: signedData?.signedUrl ?? null,
      client_id: dossier.client_id,
    });
    if (dbErr) {
      console.error("DATABASE ERROR:", JSON.stringify(dbErr));
      showToast(`Erreur DB : ${dbErr.message}`, "error");
    } else {
      showToast("Document ajouté.");
      await load();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Suppression document ──
  async function supprimerDoc(doc: Document) {
    if (!window.confirm(`Supprimer « ${doc.nom} » ?`)) return;
    if (doc.storage_path) {
      await supabase.storage.from("documents-rga").remove([doc.storage_path]);
    }
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments(ds => ds.filter(d => d.id !== doc.id));
    showToast("Document supprimé.");
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#78716C" }}>
      Chargement…
    </div>
  );

  if (!dossier || !bien) return (
    <div style={{ padding: 32, color: "#B91C1C" }}>{error || "Dossier introuvable."}</div>
  );

  const statutIdx = STATUT_INDEX[dossier.statut];
  const sc = scoreColor(bien.score_risque);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px", fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: toast.type === "success" ? "#2F7D5C" : "#B91C1C",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <OctagonX size={15} />}
          {toast.msg}
        </div>
      )}

      {/* ── Fil d'Ariane ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "#78716C" }}>
        <button onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#78716C", padding: 0 }}>
          <ArrowLeft size={14} /> Dossiers RGA
        </button>
        <ChevronRight size={12} />
        <span style={{ color: "#1F2937", fontWeight: 500 }}>
          {bien.adresse || "—"}{bien.ville ? `, ${bien.ville}` : ""}
        </span>
      </div>

      {/* ── Header bien ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Home size={22} color="#1D9E75" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1F2937" }}>
                {bien.adresse || "Adresse inconnue"}
              </h1>
              <p style={{ margin: "4px 0 8px", fontSize: 14, color: "#78716C" }}>
                {[bien.code_postal, bien.ville].filter(Boolean).join(" ")}
                {bien.type_bien ? ` · ${bien.type_bien}` : ""}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {bien.zone_rga && <Badge label="Zone RGA" color="#D97706" icon={<Layers size={11} />} />}
                {bien.zone_ppri && <Badge label="Zone PPRI" color="#0369A1" icon={<Waves size={11} />} />}
                {bien.niveau_risque && <Badge label={`Risque ${bien.niveau_risque}`} color={sc} />}
              </div>
            </div>
          </div>

          {/* Score */}
          {bien.score_risque !== null && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                border: `3px solid ${sc}`,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: sc, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
                  {bien.score_risque}
                </span>
                <span style={{ fontSize: 9, color: "#78716C" }}>/100</span>
              </div>
              <p style={{ fontSize: 11, color: "#78716C", margin: "4px 0 0" }}>Score risque</p>
            </div>
          )}
        </div>

        {/* Propriétaire */}
        {bien.nom_client && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #E5E1DA", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <User size={14} color="#78716C" />
              <span style={{ fontSize: 13, color: "#1F2937", fontWeight: 500 }}>{bien.nom_client}</span>
            </div>
            {bien.type_client && (
              <span style={{ fontSize: 11, color: "#78716C" }}>{bien.type_client}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Pipeline statut ── */}
      <div style={{ ...card, marginTop: 16 }}>
        <p style={sectionTitle}>Avancement du dossier</p>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
          {STATUTS.map((s, i) => {
            const done = i < statutIdx;
            const active = i === statutIdx;
            const future = i > statutIdx;
            return (
              <React.Fragment key={s.key}>
                <button
                  onClick={() => {
                    if (i !== statutIdx) setConfirmStatut(s.key);
                  }}
                  disabled={saving}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: i !== statutIdx ? "pointer" : "default",
                    padding: "8px 12px", borderRadius: 8, flex: 1,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "#2F7D5C" : active ? s.bg : "#F8F7F4",
                    border: `2px solid ${done ? "#2F7D5C" : active ? s.color : "#E5E1DA"}`,
                    color: done ? "#fff" : active ? s.color : "#78716C",
                    transition: "all 0.2s",
                  }}>
                    {done ? <CheckCircle size={16} /> : s.icon}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: active ? 600 : 400,
                    color: done ? "#2F7D5C" : active ? s.color : "#78716C",
                  }}>
                    {s.label}
                  </span>
                </button>
                {i < STATUTS.length - 1 && (
                  <div style={{ height: 2, flex: 1, background: i < statutIdx ? "#2F7D5C" : "#E5E1DA", transition: "background 0.3s" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Confirmation changement statut */}
        {confirmStatut && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} color="#D97706" />
              <span style={{ fontSize: 13, color: "#92400E" }}>
                Passer à <strong>{STATUTS[STATUT_INDEX[confirmStatut]].label}</strong> ?
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmStatut(null)} style={btnSecondary}>Annuler</button>
              <button onClick={() => changerStatut(confirmStatut)} style={btnPrimary} disabled={saving}>
                {saving ? "…" : "Confirmer"}
              </button>
            </div>
          </div>
        )}

        {/* Dates clés */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
          <DateField label="Date de contact" value={dossier.contact_date}
            onChange={v => updateDate("contact_date", v)} />
          <DateField label="Date RDV" value={dossier.rdv_date}
            onChange={v => updateDate("rdv_date", v)} />
          <DateField label="Date diagnostic" value={dossier.diagnostic_date}
            onChange={v => updateDate("diagnostic_date", v)} />
        </div>
      </div>

      {/* ── Financement & Travaux ── */}
      <div style={{ ...card, marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <p style={sectionTitle}><Shield size={13} /> Financement</p>
          <select
            value={dossier.financement_statut || ""}
            onChange={e => updateSelect("financement_statut", e.target.value)}
            style={inputStyle}
          >
            <option value="">— Non renseigné</option>
            {Object.entries(FINANCEMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <p style={sectionTitle}><Wrench size={13} /> Travaux</p>
          <select
            value={dossier.travaux_statut || ""}
            onChange={e => updateSelect("travaux_statut", e.target.value)}
            style={inputStyle}
          >
            <option value="">— Non renseigné</option>
            {Object.entries(TRAVAUX_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Documents ── */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ ...sectionTitle, marginBottom: 0 }}><FileText size={13} /> Documents ({documents.length})</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPrediagOpen(true)}
              style={{ ...btnPrimary, background: "#7C3AED" }}
            >
              <Sparkles size={13} />
              Pré-diagnostic IA
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={btnPrimary}
            >
              <Upload size={13} />
              {uploading ? "Envoi…" : "Ajouter un document"}
            </button>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
          </div>
        </div>

        {documents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#78716C" }}>
            <FileText size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 13 }}>Aucun document</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map(doc => (
              <div key={doc.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 8,
                border: "1px solid #E5E1DA", background: "#F8F7F4",
              }}>
                <FileText size={16} color="#78716C" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.nom_fichier || doc.nom}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#78716C" }}>
                    {fmtDate(doc.created_at)}{doc.taille_octets ? ` · ${fmtTaille(doc.taille_octets)}` : ""}
                    {doc.categorie ? ` · ${doc.categorie}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {doc.storage_path && (
                    <a href="#" onClick={async e => {
                      e.preventDefault();
                      const { data } = await supabase.storage.from("documents-rga").createSignedUrl(doc.storage_path!, 300);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #E5E1DA", background: "#fff", color: "#1F2937", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>
                      <Download size={12} /> Ouvrir
                    </a>
                  )}
                  <button onClick={() => supprimerDoc(doc)}
                    style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", cursor: "pointer" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
{/* ── Meta ── */}
      <p style={{ fontSize: 12, color: "#78716C", marginTop: 16, textAlign: "right" }}>
        Dossier créé le {fmtDate(dossier.created_at)}
      </p>

      <PreDiagDrawer
        open={prediagOpen}
        onClose={() => setPrediagOpen(false)}
        source="bien"
        bien={bien ?? undefined}
      />
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Badge({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
      background: color + "18", color, border: `1px solid ${color}30`,
    }}>
      {icon}{label}
    </span>
  );
}

function DateField({ label, value, onChange }: {
  label: string; value: string | null; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}>
        <Calendar size={11} /> {label}
      </p>
      <input
        type="date"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#fff", borderRadius: 12, border: "1px solid #E5E1DA",
  padding: "20px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: "#78716C",
  textTransform: "uppercase", letterSpacing: "0.05em",
  display: "flex", alignItems: "center", gap: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid #E5E1DA", fontSize: 14, color: "#1F2937",
  background: "#fff", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "#1D9E75", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

const btnSecondary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid #E5E1DA", background: "#fff",
  color: "#1F2937", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};