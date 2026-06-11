import jsPDF from "jspdf"

const LOGO_B64 = "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"

function formatEur(val: number) {
  const rounded = Math.round(val * 100) / 100
  const parts = rounded.toFixed(2).split(".")
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return intPart + "," + parts[1] + " EUR"
}

function formatDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function exportFacturePDF(facture: any, lignes: any[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W = 210
  const margin = 18
  let y = 18

  // ── Logo ──────────────────────────────────────────────────────────────────
  try {
    doc.addImage("data:image/png;base64," + LOGO_B64, "PNG", margin, y, 40, 14)
  } catch (e) {
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(26, 58, 42)
    doc.text("AGE Climate", margin, y + 10)
  }

  // ── Titre FACTURE ─────────────────────────────────────────────────────────
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("FACTURE", W - margin, y + 6, { align: "right" })

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(178, 92, 42)
  doc.text(facture.numero || "", W - margin, y + 13, { align: "right" })

  y += 26

  // ── Ligne séparatrice ─────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Statut + dates ────────────────────────────────────────────────────────
  const statutLabels: Record<string, string> = {
    brouillon: "Brouillon", emise: "Emise", payee: "Payee", en_retard: "En retard",
  }
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Statut : " + (statutLabels[facture.statut] || facture.statut), margin, y)
  doc.text("Emise le : " + formatDate(facture.date_emission), W - margin - 60, y)
  doc.text("Echeance : " + formatDate(facture.date_echeance), W - margin - 60, y + 5)
  y += 12

  // ── Ligne séparatrice ─────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, W - margin, y)
  y += 8

  // ── Émetteur / Destinataire ───────────────────────────────────────────────
  const colMid = W / 2 + 2

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(148, 163, 184)
  doc.text("EMETTEUR", margin, y)
  doc.text("DESTINATAIRE", colMid, y)
  y += 5

  const drawParty = (x: number, rs: string, siren: string, tva: string, adresse: string, startY: number) => {
    let py = startY
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text(rs || "—", x, py)
    py += 5
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    if (siren) { doc.text("SIREN : " + siren, x, py); py += 4 }
    if (tva)   { doc.text("TVA : " + tva, x, py);   py += 4 }
    if (adresse) {
      const lines = doc.splitTextToSize(adresse, 75)
      doc.text(lines, x, py)
      py += lines.length * 4
    }
    return py
  }

  const yEm   = drawParty(margin, facture.emetteur_raison_sociale, facture.emetteur_siren, facture.emetteur_tva_intracom, facture.emetteur_adresse, y)
  const yDest = drawParty(colMid, facture.destinataire_raison_sociale, facture.destinataire_siren, facture.destinataire_tva_intracom, facture.destinataire_adresse, y)
  y = Math.max(yEm, yDest) + 8

  // ── Ligne séparatrice ─────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Tableau des lignes ────────────────────────────────────────────────────
  const colW = { desc: 72, qte: 12, unite: 16, pu: 24, tva: 14, ht: 24, ttc: 24 }
  const colX = {
    desc:  margin,
    qte:   margin + colW.desc,
    unite: margin + colW.desc + colW.qte,
    pu:    margin + colW.desc + colW.qte + colW.unite,
    tva:   margin + colW.desc + colW.qte + colW.unite + colW.pu,
    ht:    margin + colW.desc + colW.qte + colW.unite + colW.pu + colW.tva,
    ttc:   margin + colW.desc + colW.qte + colW.unite + colW.pu + colW.tva + colW.ht,
  }

  // En-tête tableau
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y, W - margin * 2, 7, "F")
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(148, 163, 184)
  const headers = [
    { label: "DESIGNATION", x: colX.desc + 1, align: "left" },
    { label: "QTE",         x: colX.qte + colW.qte - 1,     align: "right" },
    { label: "UNITE",       x: colX.unite + colW.unite - 1,  align: "right" },
    { label: "PU HT",       x: colX.pu + colW.pu - 1,       align: "right" },
    { label: "TVA",         x: colX.tva + colW.tva - 1,      align: "right" },
    { label: "HT",          x: colX.ht + colW.ht - 1,        align: "right" },
    { label: "TTC",         x: colX.ttc + colW.ttc - 1,      align: "right" },
  ]
  headers.forEach(h => doc.text(h.label, h.x, y + 4.5, { align: h.align as any }))
  y += 7

  // Lignes
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  lignes.forEach((l, i) => {
    const ht  = (l.montant_ht  !== undefined && l.montant_ht  !== null) ? l.montant_ht  : l.quantite * l.prix_unitaire_ht
    const ttc = (l.montant_ttc !== undefined && l.montant_ttc !== null) ? l.montant_ttc : ht + ht * l.taux_tva / 100

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y, W - margin * 2, 7, "F")
    }
    doc.setTextColor(15, 23, 42)
    const descLines = doc.splitTextToSize(l.designation || "", colW.desc - 2)
    doc.text(descLines[0] || "", colX.desc + 1, y + 4.5)
    doc.setTextColor(100, 116, 139)
    doc.text(String(l.quantite || 0),                           colX.qte   + colW.qte - 1,   y + 4.5, { align: "right" })
    doc.text(l.unite || "",                                     colX.unite + colW.unite - 1, y + 4.5, { align: "right" })
    doc.setTextColor(15, 23, 42)
    doc.text(formatEur(l.prix_unitaire_ht || 0),                colX.pu  + colW.pu - 1,  y + 4.5, { align: "right" })
    doc.setTextColor(100, 116, 139)
    doc.text((l.taux_tva || 0) + "%",                           colX.tva + colW.tva - 1, y + 4.5, { align: "right" })
    doc.setTextColor(15, 23, 42)
    doc.text(formatEur(ht),                                     colX.ht  + colW.ht - 1,  y + 4.5, { align: "right" })
    doc.setFont("helvetica", "bold")
    doc.text(formatEur(ttc),                                    colX.ttc + colW.ttc - 1, y + 4.5, { align: "right" })
    doc.setFont("helvetica", "normal")
    y += 7
  })

  y += 4

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totX = W - margin - 70
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(totX, y, W - margin, y)
  y += 5

  const totals = [
    { label: "Total HT",  val: facture.total_ht,  bold: false },
    { label: "Total TVA", val: facture.total_tva, bold: false },
    { label: "Total TTC", val: facture.total_ttc, bold: true  },
  ]

  totals.forEach((t, i) => {
    doc.setFontSize(i === 2 ? 11 : 9)
    doc.setFont("helvetica", t.bold ? "bold" : "normal")
    doc.setTextColor(t.bold ? 178 : 100, t.bold ? 92 : 116, t.bold ? 42 : 139)
    doc.text(t.label, totX + 2, y)
    doc.setTextColor(15, 23, 42)
    doc.text(formatEur(t.val || 0), W - margin, y, { align: "right" })
    y += i === 2 ? 7 : 5
  })

  y += 4
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, W - margin, y)
  y += 8

  // ── Mentions légales ──────────────────────────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)

  const mentions = [
    { label: "Conditions de paiement : ", val: facture.conditions_paiement || "" },
    { label: "Penalites de retard : ",    val: facture.taux_penalites       || "" },
    { label: "Escompte : ",               val: facture.escompte             || "" },
  ]
  mentions.forEach(m => {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    const lw = doc.getTextWidth(m.label)
    doc.text(m.label, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(m.val, margin + lw, y)
    y += 5
  })

  if (facture.notes) {
    doc.setFont("helvetica", "bold")
    const lw = doc.getTextWidth("Notes : ")
    doc.text("Notes : ", margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(facture.notes, margin + lw, y)
    y += 5
  }

  // ── Pied de page ─────────────────────────────────────────────────────────
  const pageH = 297
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, pageH - 14, W - margin, pageH - 14)
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text("AGE Climate Platform — Document genere automatiquement", W / 2, pageH - 9, { align: "center" })

  // ── Téléchargement ────────────────────────────────────────────────────────
  doc.save((facture.numero || "facture") + ".pdf")
}