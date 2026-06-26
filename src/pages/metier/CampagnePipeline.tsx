import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

type Statut =
  | "importe"
  | "a_contacter"
  | "message_envoye"
  | "ouvert"
  | "interesse"
  | "non_interesse"
  | "rdv_propose"
  | "rdv_confirme"
  | "mandat_signe"
  | "diagnostic_lance"
  | "cloture"

interface Campagne {
  id: string
  nom: string
  type_campagne: string
  statut: string
  zone_geo: string | null
  date_debut: string | null
  date_fin: string | null
}

interface Bien {
  id: string
  adresse: string
  ville: string
  type_bien: string
  niveau_risque: string | null
  score_risque: number | null
}

interface Contact {
  id: string
  campagne_id: string
  bien_id: string
  client_id: string | null
  statut: Statut
  statut_updated_at: string
  consultant_id: string | null
  note: string | null
  created_at: string
  bien?: Bien
}

// ─── Config colonnes pipeline ─────────────────────────────────────────────────

const COLONNES: { statut: Statut; label: string; icon: string; color: string; bg: string; border: string }[] = [
  { statut: "importe",         label: "Importé",         icon: "ti-inbox",          color: "#78716C", bg: "#F4F3F0", border: "#E2DDD8" },
  { statut: "a_contacter",     label: "À contacter",     icon: "ti-phone",          color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE" },
  { statut: "message_envoye",  label: "Message envoyé",  icon: "ti-mail",           color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { statut: "ouvert",          label: "Ouvert",          icon: "ti-mail-opened",    color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { statut: "interesse",       label: "Intéressé",       icon: "ti-thumb-up",       color: "#2F7D5C", bg: "#F0FDF4", border: "#BBF7D0" },
  { statut: "non_interesse",   label: "Non intéressé",   icon: "ti-thumb-down",     color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
  { statut: "rdv_propose",     label: "RDV proposé",     icon: "ti-calendar-plus",  color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE" },
  { statut: "rdv_confirme",    label: "RDV confirmé",    icon: "ti-calendar-check", color: "#2F7D5C", bg: "#F0FDF4", border: "#BBF7D0" },
  { statut: "mandat_signe",    label: "Mandat signé",    icon: "ti-file-check",     color: "#B25C2A", bg: "#F9F0EA", border: "#F0DDD0" },
  { statut: "diagnostic_lance",label: "Diagnostic lancé",icon: "ti-clipboard-list", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { statut: "cloture",         label: "Clôturé",         icon: "ti-circle-check",   color: "#2F7D5C", bg: "#F0FDF4", border: "#BBF7D0" },
]

const STATUT_ORDRE = COLONNES.map(c => c.statut)

const RISQUE_CONFIG: Record<string, { color: string; bg: string }> = {
  faible:   { color: "#2F7D5C", bg: "#F0FDF4" },
  modere:   { color: "#D97706", bg: "#FFFBEB" },
  eleve:    { color: "#B91C1C", bg: "#FEF2F2" },
  critique: { color: "#7C3AED", bg: "#F5F3FF" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function statutSuivant(s: Statut): Statut | null {
  // non_interesse et cloture sont terminaux
  if (s === "non_interesse" || s === "cloture") return null
  const idx = STATUT_ORDRE.indexOf(s)
  // Sauter non_interesse dans le flux normal
  const next = STATUT_ORDRE[idx + 1]
  if (next === "non_interesse") return STATUT_ORDRE[idx + 2] ?? null
  return next ?? null
}

// ─── Composant carte contact ──────────────────────────────────────────────────

interface CarteContactProps {
  key?: string
  contact: Contact
  onAvancer: (id: string, statut: Statut) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, contact: Contact) => void
  onOpenNote: (contact: Contact) => void
}

function CarteContact({
  contact,
  onAvancer,
  onDragStart,
  onOpenNote,
}: CarteContactProps) {
  const col = COLONNES.find(c => c.statut === contact.statut)!
  const suivant = statutSuivant(contact.statut)
  const suivantCol = suivant ? COLONNES.find(c => c.statut === suivant) : null
  const risque = contact.bien?.niveau_risque
  const risqueCfg = risque ? RISQUE_CONFIG[risque] : null

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, contact)}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2DDD8",
        borderRadius: "10px",
        padding: "12px",
        cursor: "grab",
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)"
        e.currentTarget.style.transform = "translateY(-1px)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {/* Adresse bien */}
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827", marginBottom: "2px", lineHeight: 1.3 }}>
        {contact.bien?.adresse || "—"}
      </div>
      <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "8px" }}>
        {contact.bien?.ville || ""}
        {contact.bien?.type_bien ? ` · ${contact.bien.type_bien}` : ""}
      </div>

      {/* Score risque */}
      {contact.bien?.score_risque != null && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px",
            background: risqueCfg?.bg || "#F4F3F0",
            color: risqueCfg?.color || "#78716C",
          }}>
            Score {contact.bien.score_risque}
          </span>
          {risque && (
            <span style={{ fontSize: "10px", color: risqueCfg?.color || "#78716C", fontWeight: 500 }}>
              {risque.charAt(0).toUpperCase() + risque.slice(1)}
            </span>
          )}
        </div>
      )}

      {/* Note */}
      {contact.note && (
        <div style={{
          fontSize: "11px", color: "#6B7280", background: "#F9F7F4",
          borderRadius: "6px", padding: "6px 8px", marginBottom: "8px",
          borderLeft: "2px solid #E2DDD8", lineHeight: 1.4,
        }}>
          {contact.note.length > 60 ? contact.note.slice(0, 60) + "…" : contact.note}
        </div>
      )}

      {/* Date mise à jour */}
      <div style={{ fontSize: "10px", color: "#C9C3BB", marginBottom: "8px" }}>
        <i className="ti ti-clock" style={{ fontSize: "10px", marginRight: "3px" }} />
        {formatDate(contact.statut_updated_at)}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "4px" }}>
        {/* Bouton note */}
        <button
          onClick={e => { e.stopPropagation(); onOpenNote(contact) }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "26px", height: "26px", borderRadius: "6px",
            border: "1px solid #E2DDD8", background: "#F4F3F0",
            color: contact.note ? "#B25C2A" : "#9CA3AF",
            cursor: "pointer", flexShrink: 0,
          }}
          title="Ajouter une note"
        >
          <i className="ti ti-note" style={{ fontSize: "12px" }} />
        </button>

        {/* Bouton avancer */}
        {suivantCol && (
          <button
            onClick={e => { e.stopPropagation(); onAvancer(contact.id, suivant!) }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: "4px", padding: "4px 8px", borderRadius: "6px", border: "none",
              background: suivantCol.bg, color: suivantCol.color,
              fontSize: "10px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            title={`Passer à : ${suivantCol.label}`}
          >
            <i className={`ti ${suivantCol.icon}`} style={{ fontSize: "11px" }} />
            {suivantCol.label}
          </button>
        )}

        {/* Bouton Non intéressé (si pas déjà dans un état terminal) */}
        {contact.statut !== "non_interesse" && contact.statut !== "cloture" && contact.statut !== "mandat_signe" && contact.statut !== "diagnostic_lance" && (
          <button
            onClick={e => { e.stopPropagation(); onAvancer(contact.id, "non_interesse") }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "26px", height: "26px", borderRadius: "6px",
              border: "1px solid #FECACA", background: "#FEF2F2",
              color: "#B91C1C", cursor: "pointer", flexShrink: 0,
            }}
            title="Non intéressé"
          >
            <i className="ti ti-x" style={{ fontSize: "12px" }} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Composant colonne kanban ─────────────────────────────────────────────────

function Colonne({
  config,
  contacts,
  onDragStart,
  onDrop,
  onDragOver,
  onAvancer,
  onOpenNote,
}: {
  key?: Statut
  config: typeof COLONNES[0]
  contacts: Contact[]
  onDragStart: (e: React.DragEvent, contact: Contact) => void
  onDrop: (e: React.DragEvent, statut: Statut) => void
  onDragOver: (e: React.DragEvent) => void
  onAvancer: (id: string, statut: Statut) => void
  onOpenNote: (contact: Contact) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", minWidth: "220px", maxWidth: "220px",
        background: isDragOver ? config.bg : "#F9F7F4",
        borderRadius: "12px", border: `1.5px solid ${isDragOver ? config.color : "#E2DDD8"}`,
        transition: "background 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(e) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { setIsDragOver(false); onDrop(e, config.statut) }}
    >
      {/* En-tête colonne */}
      <div style={{
        padding: "10px 12px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "1px solid #E2DDD8",
        background: config.bg,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <i className={`ti ${config.icon}`} style={{ fontSize: "13px", color: config.color }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: config.color, letterSpacing: "0.02em" }}>
            {config.label}
          </span>
        </div>
        <span style={{
          background: "rgba(0,0,0,0.06)", color: config.color,
          fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "10px",
        }}>
          {contacts.length}
        </span>
      </div>

      {/* Cartes */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "8px",
        display: "flex", flexDirection: "column", gap: "6px",
        minHeight: "120px",
      }}>
        {contacts.length === 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "80px", color: "#C9C3BB", fontSize: "11px",
            border: `1.5px dashed ${isDragOver ? config.color : "#E2DDD8"}`,
            borderRadius: "8px", transition: "border-color 0.15s",
          }}>
            {isDragOver ? "Déposer ici" : "Aucun contact"}
          </div>
        )}
        {contacts.map(c => (
          <CarteContact
            key={c.id}
            contact={c}
            onAvancer={onAvancer}
            onDragStart={onDragStart}
            onOpenNote={onOpenNote}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CampagnePipeline() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [campagne, setCampagne]     = useState<Campagne | null>(null)
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Modal note
  const [noteModal, setNoteModal]   = useState<Contact | null>(null)
  const [noteTexte, setNoteTexte]   = useState("")
  const [noteSaving, setNoteSaving] = useState(false)

  // Drag
  const dragContact = useRef<Contact | null>(null)

  // Stats funnel
  const funnel = COLONNES.map(col => ({
    ...col,
    count: contacts.filter(c => c.statut === col.statut).length,
  }))
  const total        = contacts.length
  const interesses   = contacts.filter(c => ["interesse","rdv_propose","rdv_confirme","mandat_signe","diagnostic_lance","cloture"].includes(c.statut)).length
  const mandats      = contacts.filter(c => c.statut === "mandat_signe" || c.statut === "diagnostic_lance" || c.statut === "cloture").length
  const tauxConversion = total > 0 ? Math.round((mandats / total) * 100) : 0

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { if (id) charger() }, [id])

  async function charger() {
    setLoading(true)
    // Campagne
    const { data: camp } = await supabase
      .from("campagnes")
      .select("id, nom, type_campagne, statut, zone_geo, date_debut, date_fin")
      .eq("id", id)
      .maybeSingle()
    setCampagne(camp)

    // Contacts pipeline
    const { data: cts } = await supabase
      .from("contacts_campagne")
      .select("*")
      .eq("campagne_id", id)
      .order("created_at", { ascending: true })

    if (!cts || cts.length === 0) { setContacts([]); setLoading(false); return }

    // Enrichir avec les biens
    const bienIds = [...new Set(cts.map((c: Contact) => c.bien_id))]
    const { data: biens } = await supabase
      .from("biens")
      .select("id, adresse, ville, type_bien, niveau_risque, score_risque")
      .in("id", bienIds)

    const enriched = cts.map((c: Contact) => ({
      ...c,
      bien: biens?.find((b: Bien) => b.id === c.bien_id) || undefined,
    }))
    setContacts(enriched)
    setLoading(false)
  }

  // ── Changer statut ──
  async function changerStatut(contactId: string, nouveauStatut: Statut) {
    const { error } = await supabase
      .from("contacts_campagne")
      .update({ statut: nouveauStatut, statut_updated_at: new Date().toISOString() })
      .eq("id", contactId)

    if (error) { showToast("Erreur lors de la mise à jour", "error"); return }

    setContacts(prev => prev.map(c =>
      c.id === contactId
        ? { ...c, statut: nouveauStatut, statut_updated_at: new Date().toISOString() }
        : c
    ))
    showToast(`Statut mis à jour : ${COLONNES.find(col => col.statut === nouveauStatut)?.label}`)
  }

  // ── Drag & drop ──
  function handleDragStart(e: React.DragEvent, contact: Contact) {
    dragContact.current = contact
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  function handleDrop(e: React.DragEvent, statut: Statut) {
    e.preventDefault()
    if (!dragContact.current) return
    if (dragContact.current.statut === statut) return
    changerStatut(dragContact.current.id, statut)
    dragContact.current = null
  }

  // ── Note ──
  function openNote(contact: Contact) {
    setNoteModal(contact)
    setNoteTexte(contact.note || "")
  }

  async function sauvegarderNote() {
    if (!noteModal) return
    setNoteSaving(true)
    const { error } = await supabase
      .from("contacts_campagne")
      .update({ note: noteTexte || null })
      .eq("id", noteModal.id)

    if (!error) {
      setContacts(prev => prev.map(c =>
        c.id === noteModal.id ? { ...c, note: noteTexte || null } : c
      ))
      showToast("Note enregistrée")
    } else {
      showToast("Erreur lors de l'enregistrement", "error")
    }
    setNoteSaving(false)
    setNoteModal(null)
  }

  // ── Contacts par colonne ──
  function contactsPourStatut(statut: Statut) {
    return contacts.filter(c => c.statut === statut)
  }

  // ── Render ──
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#9CA3AF", fontSize: "14px" }}>
      <i className="ti ti-loader-2 ti-spin" style={{ fontSize: "20px", marginRight: "8px" }} />
      Chargement du pipeline…
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
          background: toast.type === "success" ? "#2F7D5C" : "#B91C1C",
          color: "white", padding: "12px 20px", borderRadius: "8px",
          fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: "16px" }} />
          {toast.message}
        </div>
      )}

      {/* En-tête */}
      <div style={{ padding: "0 0 16px 0", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <button
            onClick={() => navigate("/metier/campagnes")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "12px", padding: 0, display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit" }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: "13px" }} />
            Campagnes
          </button>
          <i className="ti ti-chevron-right" style={{ fontSize: "11px", color: "#C9C3BB" }} />
          <span style={{ fontSize: "12px", color: "#6B7280" }}>{campagne?.nom || "—"}</span>
          <i className="ti ti-chevron-right" style={{ fontSize: "11px", color: "#C9C3BB" }} />
          <span style={{ fontSize: "12px", color: "#B25C2A", fontWeight: 600 }}>Pipeline</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: "4px" }}>
              {campagne?.nom}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {campagne?.zone_geo && (
                <span style={{ fontSize: "12px", color: "#6B7280", display: "flex", alignItems: "center", gap: "3px" }}>
                  <i className="ti ti-map-pin" style={{ fontSize: "12px" }} />
                  {campagne.zone_geo}
                </span>
              )}
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                {formatDate(campagne?.date_debut ?? null)} → {formatDate(campagne?.date_fin ?? null)}
              </span>
            </div>
          </div>

          {/* KPIs rapides */}
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            {[
              { label: "Total",       value: total,          icon: "ti-users",      color: "#111827" },
              { label: "Intéressés",  value: interesses,     icon: "ti-thumb-up",   color: "#2F7D5C" },
              { label: "Mandats",     value: mandats,        icon: "ti-file-check", color: "#B25C2A" },
              { label: "Conversion",  value: `${tauxConversion} %`, icon: "ti-trending-up", color: "#0369A1" },
            ].map((k, i) => (
              <div key={i} style={{
                background: "#FFFFFF", border: "1px solid #E2DDD8", borderRadius: "8px",
                padding: "8px 12px", textAlign: "center", minWidth: "72px",
              }}>
                <div style={{ fontSize: "10px", color: "#9CA3AF", marginBottom: "2px", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: "10px", color: k.color }} />
                  {k.label}
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 700, color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel barre */}
        <div style={{ marginTop: "12px", display: "flex", height: "6px", borderRadius: "4px", overflow: "hidden", background: "#F4F3F0", gap: "1px" }}>
          {funnel.filter(f => f.count > 0).map(f => (
            <div
              key={f.statut}
              title={`${f.label} : ${f.count}`}
              style={{
                flex: f.count,
                background: f.color,
                transition: "flex 0.3s",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
          {funnel.filter(f => f.count > 0).map(f => (
            <span key={f.statut} style={{ fontSize: "10px", color: "#9CA3AF", display: "flex", alignItems: "center", gap: "3px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: f.color, display: "inline-block" }} />
              {f.label} ({f.count})
            </span>
          ))}
        </div>
      </div>

      {/* Message vide */}
      {contacts.length === 0 && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "#9CA3AF", gap: "12px",
        }}>
          <i className="ti ti-inbox" style={{ fontSize: "40px" }} />
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#6B7280" }}>Aucun contact dans ce pipeline</div>
          <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
            Ajoutez des biens depuis l'onglet Campagnes pour démarrer le suivi.
          </div>
        </div>
      )}

      {/* Kanban */}
      {contacts.length > 0 && (
        <div style={{
          flex: 1, overflowX: "auto", overflowY: "hidden",
          display: "flex", gap: "8px", paddingBottom: "16px",
          alignItems: "flex-start",
        }}>
          {COLONNES.map(col => (
            <Colonne
              key={col.statut}
              config={col}
              contacts={contactsPourStatut(col.statut)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onAvancer={changerStatut}
              onOpenNote={openNote}
            />
          ))}
        </div>
      )}

      {/* Modal note */}
      {noteModal && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 500 }}
            onClick={() => setNoteModal(null)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#FFFFFF", borderRadius: "12px",
            padding: "24px", width: "400px", maxWidth: "90vw",
            zIndex: 501, boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
          }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
              Note de suivi
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "16px" }}>
              {noteModal.bien?.adresse} — {noteModal.bien?.ville}
            </div>
            <textarea
              value={noteTexte}
              onChange={e => setNoteTexte(e.target.value)}
              rows={4}
              placeholder="Observations, contexte, prochain contact…"
              autoFocus
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid #E2DDD8", borderRadius: "8px",
                fontSize: "13px", color: "#111827", fontFamily: "inherit",
                resize: "vertical", outline: "none", boxSizing: "border-box",
                lineHeight: 1.5,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#B25C2A")}
              onBlur={e => (e.currentTarget.style.borderColor = "#E2DDD8")}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
              <button
                onClick={() => setNoteModal(null)}
                style={{
                  padding: "8px 16px", borderRadius: "7px", border: "1px solid #E2DDD8",
                  background: "#F4F3F0", color: "#6B7280", fontSize: "13px",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Annuler
              </button>
              <button
                onClick={sauvegarderNote}
                disabled={noteSaving}
                style={{
                  padding: "8px 16px", borderRadius: "7px", border: "none",
                  background: "#B25C2A", color: "white", fontSize: "13px",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                }}
              >
                {noteSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
