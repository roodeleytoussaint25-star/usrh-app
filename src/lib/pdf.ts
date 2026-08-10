import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtG(n: number) {
  // Évite l'espace fine insécable (U+202F) de fr-FR qui s'affiche en '/' dans jsPDF
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' HTG'
}
function shortRef(id: string) { return 'VE-' + id.slice(0, 6).toUpperCase() }

// ── COULEURS MLA ──────────────────────────────────────────────────────────────
const GREEN  = '#4DD119'
const NAVY   = '#1C2B6E'
const YELLOW = '#F5C518'

function addHeader(doc: jsPDF, subtitle: string) {
  // Bande verte en haut
  doc.setFillColor(GREEN)
  doc.rect(0, 0, 210, 18, 'F')

  // Logo texte (remplacé par image si dispo)
  doc.setTextColor('#FFFFFF')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('MANNO LAVI AGRIKOL', 14, 11)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Intrants Agricoles • Hinche & Saint-Raphaël', 14, 16)

  // Sous-titre à droite
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(subtitle, 210 - 14, 11, { align: 'right' })

  // Ligne marine sous header
  doc.setDrawColor(NAVY)
  doc.setLineWidth(0.5)
  doc.line(0, 18, 210, 18)
}

function addFooter(doc: jsPDF) {
  const pageH = doc.internal.pageSize.height
  doc.setDrawColor(GREEN)
  doc.setLineWidth(0.3)
  doc.line(14, pageH - 12, 196, pageH - 12)
  doc.setTextColor('#888888')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Manno Lavi Agrikol  •  +509 4241 6260 / 5581 0917  •  emmanuelclaivil077@gmail.com', 105, pageH - 7, { align: 'center' })
}

// ── REÇU DE VENTE ─────────────────────────────────────────────────────────────

export interface ReceiptData {
  id: string
  total: number
  nom_client?: string | null
  montant_paye: number
  created_at: string
  employe_nom?: string | null
  lignes: { nom: string; quantite: number; prix_unitaire: number; sous_total: number }[]
}

export function genererRecuPDF(data: ReceiptData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })

  addHeader(doc, 'REÇU DE VENTE')

  // Infos vente
  doc.setTextColor(NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Réf : ${shortRef(data.id)}`, 14, 26)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date : ${fmtDate(data.created_at)}`, 14, 31)
  if (data.employe_nom) doc.text(`Vendeur : ${data.employe_nom}`, 14, 36)
  if (data.nom_client) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Client : ${data.nom_client}`, 14, data.employe_nom ? 41 : 36)
    doc.setFont('helvetica', 'normal')
  }

  const tableStartY = data.nom_client ? 48 : 42

  autoTable(doc, {
    startY: tableStartY,
    head: [['Article', 'Qté', 'Prix unit.', 'Total']],
    body: data.lignes.map(l => [l.nom, l.quantite, fmtG(l.prix_unitaire), fmtG(l.sous_total)]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: '#FFFFFF', fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: { fillColor: '#F8FFF3' },
    margin: { left: 14, right: 14 },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

  // Totaux
  const totalY = finalY
  doc.setFillColor(NAVY)
  doc.roundedRect(14, totalY - 4, 182, 10, 2, 2, 'F')
  doc.setTextColor('#FFFFFF')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL :', 18, totalY + 3)
  doc.text(fmtG(data.total), 192, totalY + 3, { align: 'right' })

  // Crédit
  if (data.montant_paye < data.total) {
    const resteY = totalY + 14
    doc.setFillColor(YELLOW)
    doc.roundedRect(14, resteY - 4, 182, 10, 2, 2, 'F')
    doc.setTextColor(NAVY)
    doc.setFontSize(9)
    doc.text('Montant payé :', 18, resteY + 3)
    doc.text(fmtG(data.montant_paye), 192, resteY + 3, { align: 'right' })
    const resteY2 = resteY + 13
    doc.setFillColor('#FEE2E2')
    doc.roundedRect(14, resteY2 - 4, 182, 10, 2, 2, 'F')
    doc.setTextColor('#DC2626')
    doc.setFont('helvetica', 'bold')
    doc.text('Reste à payer :', 18, resteY2 + 3)
    doc.text(fmtG(data.total - data.montant_paye), 192, resteY2 + 3, { align: 'right' })
  }

  // Mention
  const pageH = doc.internal.pageSize.height
  doc.setTextColor('#888888')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Marchandise ni reprise ni échangée. Merci de votre confiance !', 105, pageH - 18, { align: 'center' })

  addFooter(doc)

  doc.save(`recu_${shortRef(data.id)}.pdf`)
}

// ── PROFORMA ──────────────────────────────────────────────────────────────────

export interface ProformaLigne {
  description: string
  quantite: number
  prix_unitaire: number
}

export interface ProformaData {
  numero: string
  date: string
  client_nom: string
  client_contact?: string
  lignes: ProformaLigne[]
  validite_jours?: number
}

export function genererProformaPDF(data: ProformaData): void {
  // Letter 8.5×11 pouces = 215.9×279.4 mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W = 215.9
  const L = 25.4  // marge gauche
  const R = W - L // marge droite = 190.5

  // ── EN-TÊTE ──────────────────────────────────────────────────────────
  // Bande noire
  doc.setFillColor(20, 20, 20)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('MANNO LAVI AGRIKOL', L, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('+509 4241 6260 / 5581 0917  •  emmanuelclaivil077@gmail.com', R, 13, { align: 'right' })

  // Titre FACTURE PROFORMA
  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('FACTURE PROFORMA', L, 32)

  // Ligne séparatrice
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.6)
  doc.line(L, 35, R, 35)

  // ── BLOC INFOS (deux colonnes) ────────────────────────────────────────
  // Colonne gauche — n° + date
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  doc.text('N° DE PROFORMA', L, 43)
  doc.text('DATE D\'ÉMISSION', L, 51)
  doc.text('VALABLE JUSQU\'AU', L, 59)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 20)
  doc.text(data.numero, 78, 43)
  doc.text(data.date, 78, 51)

  // Calcul date d'expiration
  const parts = data.date.split('/')
  const dateEmis = new Date(+parts[2], +parts[1] - 1, +parts[0])
  dateEmis.setDate(dateEmis.getDate() + (data.validite_jours ?? 30))
  const expStr = `${pad(dateEmis.getDate())}/${pad(dateEmis.getMonth() + 1)}/${dateEmis.getFullYear()}`
  doc.text(expStr, 78, 59)

  // Colonne droite — client (cadre)
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.4)
  doc.rect(125, 37, R - 125, 26)
  doc.setFillColor(240, 240, 240)
  doc.rect(125, 37, R - 125, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(20, 20, 20)
  doc.text('DESTINATAIRE', 128, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(data.client_nom, 128, 50)
  if (data.client_contact) doc.text(data.client_contact, 128, 57)

  // ── TABLEAU ───────────────────────────────────────────────────────────
  // Content width = 215.9 - 25.4*2 = 165.1 mm
  const total = data.lignes.reduce((a, l) => a + l.quantite * l.prix_unitaire, 0)

  autoTable(doc, {
    startY: 70,
    head: [['Description', 'Qte', 'Prix unit. HTG', 'Montant HTG']],
    body: data.lignes.map(l => [
      l.description,
      String(l.quantite),
      fmtG(l.prix_unitaire),
      fmtG(l.quantite * l.prix_unitaire),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: [20, 20, 20],
      lineColor: [20, 20, 20],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 38, halign: 'right' },
    },
    margin: { left: L, right: L },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // ── TOTAL ─────────────────────────────────────────────────────────────
  const totalBoxX = R - 90  // commence à 90mm du bord droit
  doc.setFillColor(20, 20, 20)
  doc.rect(totalBoxX, finalY + 4, 90, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('TOTAL :', totalBoxX + 4, finalY + 12)
  doc.text(fmtG(total), R - 3, finalY + 12, { align: 'right' })

  // ── CONDITIONS ────────────────────────────────────────────────────────
  const condY = finalY + 24
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.rect(L, condY, R - L, 26)
  doc.setFillColor(245, 245, 245)
  doc.rect(L, condY, R - L, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(20, 20, 20)
  doc.text('CONDITIONS', L + 3, condY + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.text(`• Ce document est valable ${data.validite_jours ?? 30} jours à compter de la date d'émission.`, L + 3, condY + 11)
  doc.text('• Les prix sont en Gourdes haïtiennes (HTG).', L + 3, condY + 17)
  doc.text('• Ce document n\'est pas une facture définitive.', L + 3, condY + 23)

  // ── SIGNATURE ─────────────────────────────────────────────────────────
  const sigY = condY + 36
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.3)
  doc.line(L, sigY, L + 65, sigY)
  doc.setTextColor(80, 80, 80)
  doc.setFontSize(8)
  doc.text('Signature / Cachet', L + 32, sigY + 5, { align: 'center' })

  // ── PIED DE PAGE ──────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.2)
  doc.line(L, pageH - 14, R, pageH - 14)
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Manno Lavi Agrikol  •  +509 4241 6260 / 5581 0917  •  emmanuelclaivil077@gmail.com', W / 2, pageH - 9, { align: 'center' })

  // ── OUVRIR DANS UN NOUVEL ONGLET (compatible Android) ─────────────────
  const blobUrl = doc.output('bloburl')
  window.open(blobUrl, '_blank')
}
