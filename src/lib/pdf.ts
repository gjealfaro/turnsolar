import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Offer } from './supabase'

const teal = [15, 92, 122] as [number, number, number]
const green = [125, 191, 46] as [number, number, number]
const dark = [30, 30, 30] as [number, number, number]
const lightGray = [243, 247, 249] as [number, number, number]
const white = [255, 255, 255] as [number, number, number]
const darkGray = [50, 70, 80] as [number, number, number]

// Draws the TurnSolar logo text in the PDF header — no image file needed
function drawLogo(doc: jsPDF, x: number, y: number) {
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...white)
  doc.text('turn', x, y)
  const turnWidth = doc.getTextWidth('turn')
  doc.setTextColor(...green)
  doc.text('solar', x + turnWidth, y)
  // sun dot
  const solarWidth = doc.getTextWidth('solar')
  const sunX = x + turnWidth + solarWidth + 3
  const sunY = y - 5
  doc.setFillColor(...green)
  doc.circle(sunX, sunY, 1.5, 'F')
  // sun rays
  doc.setDrawColor(...green)
  doc.setLineWidth(0.5)
  const rays = [
    [sunX, sunY - 3, sunX, sunY - 4.5],
    [sunX, sunY + 3, sunX, sunY + 4.5],
    [sunX - 3, sunY, sunX - 4.5, sunY],
    [sunX + 3, sunY, sunX + 4.5, sunY],
    [sunX - 2.1, sunY - 2.1, sunX - 3.2, sunY - 3.2],
    [sunX + 2.1, sunY + 2.1, sunX + 3.2, sunY + 3.2],
    [sunX + 2.1, sunY - 2.1, sunX + 3.2, sunY - 3.2],
    [sunX - 2.1, sunY + 2.1, sunX - 3.2, sunY + 3.2],
  ]
  rays.forEach(([x1, y1, x2, y2]) => doc.line(x1, y1, x2, y2))
}

function buildPDF(offer: Offer): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header bar
  doc.setFillColor(...teal)
  doc.rect(0, 0, 210, 30, 'F')

  // Green accent stripe
  doc.setFillColor(...green)
  doc.rect(0, 30, 210, 2, 'F')

  // Logo
  drawLogo(doc, 14, 19)

  // Offer meta top-right
  doc.setTextColor(...white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Offer No: ${offer.offer_number}  ·  v${offer.version}`, 196, 14, { align: 'right' })
  doc.text(`Date: ${offer.date}`, 196, 22, { align: 'right' })

  // Client box
  doc.setFillColor(...lightGray)
  doc.roundedRect(14, 38, 182, 40, 3, 3, 'F')
  doc.setDrawColor(...teal)
  doc.setLineWidth(0.4)
  doc.roundedRect(14, 38, 182, 40, 3, 3, 'S')

  doc.setTextColor(...teal)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT INFORMATION', 18, 45)

  doc.setDrawColor(...green)
  doc.setLineWidth(0.8)
  doc.line(18, 47, 58, 47)

  doc.setTextColor(...dark)
  doc.setFontSize(9)
  const left: [string, string][] = [
    ['Salutation', offer.salutation],
    ['Name', `${offer.first_name} ${offer.last_name}`],
    ['Address', offer.address],
    ['Postal Code', offer.postal_code],
  ]
  const right: [string, string][] = [
    ['Email', offer.email],
    ['Phone', offer.phone],
  ]
  let cy = 53
  left.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${l}:`, 18, cy)
    doc.setFont('helvetica', 'normal'); doc.text(v || '', 48, cy)
    cy += 6
  })
  cy = 53
  right.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${l}:`, 110, cy)
    doc.setFont('helvetica', 'normal'); doc.text(v || '', 128, cy)
    cy += 6
  })

  let yPos = 86
  const sections: Record<string, any[]> = {}
  offer.items.forEach(item => {
    const s = item.product.section
    if (!sections[s]) sections[s] = []
    sections[s].push(item)
  })
  const componentTotal = offer.items.reduce((s, i) => s + i.subtotal, 0)

  if (Object.keys(sections).length > 0) {
    doc.setFillColor(...teal)
    doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPONENTS', 18, yPos + 5.5)
    doc.text(`${componentTotal.toFixed(2)} €`, 196, yPos + 5.5, { align: 'right' })
    yPos += 12

    Object.entries(sections).forEach(([section, items]) => {
      const st = items.reduce((s: number, i: any) => s + i.subtotal, 0)
      doc.setFillColor(...green)
      doc.roundedRect(14, yPos, 182, 7, 2, 2, 'F')
      doc.setTextColor(...white)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.text(section, 18, yPos + 4.8)
      doc.text(`Subtotal: ${st.toFixed(2)} €`, 196, yPos + 4.8, { align: 'right' })
      yPos += 9
      autoTable(doc, {
        startY: yPos,
        head: [['Qty', 'Product', 'Capacity', 'Colour', 'Warranty', 'Key Features']],
        body: items.map((i: any) => [
          i.quantity.toString(), i.product.brand_model,
          i.product.capacity || '—', i.product.colour || '—',
          i.product.garantie ? `${i.product.garantie} yrs.` : '—', i.product.usp || '—',
        ]),
        theme: 'grid',
        headStyles: { fillColor: darkGray, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5, textColor: dark },
        alternateRowStyles: { fillColor: lightGray },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 52 },
          2: { cellWidth: 20 }, 3: { cellWidth: 20 }, 4: { cellWidth: 20 }, 5: { cellWidth: 58 },
        },
        margin: { left: 14, right: 14 },
      })
      yPos = (doc as any).lastAutoTable.finalY + 6
      if (yPos > 255) { doc.addPage(); yPos = 20 }
    })
  }

  const mp = offer.manpower
  const mpTotal = mp.days * mp.people * mp.daily_rate
  if (mpTotal > 0) {
    if (yPos > 230) { doc.addPage(); yPos = 20 }
    doc.setFillColor(...teal)
    doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('MANPOWER FEE', 18, yPos + 5.5)
    doc.text(`${mpTotal.toFixed(2)} €`, 196, yPos + 5.5, { align: 'right' })
    yPos += 12
    autoTable(doc, {
      startY: yPos,
      head: [['Days', 'People', 'Daily Rate (€)', 'Total (€)']],
      body: [[mp.days.toString(), mp.people.toString(), `${mp.daily_rate.toFixed(2)} €`, `${mpTotal.toFixed(2)} €`]],
      theme: 'grid',
      headStyles: { fillColor: darkGray, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, textColor: dark },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' }, 1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 60, halign: 'center' }, 3: { cellWidth: 62, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    })
    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  if (offer.mobilization_enabled && offer.mobilization_fee > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20 }
    doc.setFillColor(...teal)
    doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('MOBILIZATION FEE', 18, yPos + 5.5)
    doc.text(`${offer.mobilization_fee.toFixed(2)} €`, 196, yPos + 5.5, { align: 'right' })
    yPos += 12
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount (€)']],
      body: [['Mobilization & logistics fee', `${offer.mobilization_fee.toFixed(2)} €`]],
      theme: 'grid',
      headStyles: { fillColor: darkGray, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, textColor: dark },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 62, halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // Price summary
  if (yPos > 230) { doc.addPage(); yPos = 20 }
  yPos += 4
  doc.setFillColor(...teal)
  doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F')
  doc.setTextColor(...white)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRICE SUMMARY', 18, yPos + 5.5)
  yPos += 12

  const summaryRows: any[] = []
  if (componentTotal > 0) summaryRows.push({ label: 'Components', amount: `${componentTotal.toFixed(2)} €`, isTotal: false })
  if (mpTotal > 0) summaryRows.push({ label: 'Manpower Fee', amount: `${mpTotal.toFixed(2)} €`, isTotal: false })
  if (offer.mobilization_enabled && offer.mobilization_fee > 0) summaryRows.push({ label: 'Mobilization Fee', amount: `${offer.mobilization_fee.toFixed(2)} €`, isTotal: false })
  summaryRows.push({ label: 'TOTAL (excl. VAT)', amount: `${offer.total_price.toFixed(2)} €`, isTotal: true })

  autoTable(doc, {
    startY: yPos,
    body: summaryRows,
    columns: [{ dataKey: 'label', header: 'Description' }, { dataKey: 'amount', header: 'Amount' }],
    theme: 'grid',
    headStyles: { fillColor: darkGray, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: dark },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 62, halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data: any) => {
      if (data.row.raw?.isTotal) {
        data.cell.styles.fillColor = green
        data.cell.styles.textColor = white
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fontSize = 10
      }
    },
    margin: { left: 14, right: 14 },
  })

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...teal)
    doc.rect(0, 287, 210, 10, 'F')
    doc.setFillColor(...green)
    doc.rect(0, 285, 210, 2, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('TurnSolar Offer — Confidential', 14, 293)
    doc.text(`Page ${i} of ${pageCount}`, 196, 293, { align: 'right' })
  }

  return doc
}

export function downloadOfferPDF(offer: Offer) {
  const doc = buildPDF(offer)
  doc.save(`Offer_${offer.offer_number}_v${offer.version}_${offer.last_name}.pdf`)
}

export function getOfferPDFDataUri(offer: Offer): string {
  const doc = buildPDF(offer)
  return doc.output('datauristring')
}

export function getOfferPDFFilename(offer: Offer): string {
  return `Offer_${offer.offer_number}_v${offer.version}_${offer.last_name}.pdf`
}
