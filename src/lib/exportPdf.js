import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ACCENT_COLOR = [245, 158, 11] // Amber #f59e0b
const BG_COLOR = [15, 17, 23] // Dark background #0f1117
const TEXT_COLOR = [255, 255, 255] // White text
const SURFACE_COLOR = [26, 29, 39] // Surface #1a1d27

/**
 * Export event data to PDF report
 * @param {object} event - Event data
 * @param {array} suppliers - Suppliers list
 * @param {array} products - Products list
 * @param {object} options - Export options (shortlistOnly, supplierId)
 */
export async function exportEventToPdf(event, suppliers, products, options = {}) {
  const { shortlistOnly = false, supplierId = null } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Filter data
  let filteredSuppliers = suppliers
  let filteredProducts = products

  if (supplierId) {
    filteredSuppliers = suppliers.filter((s) => s.id === supplierId)
    filteredProducts = products.filter((p) => p.supplier_id === supplierId)
  }

  if (shortlistOnly) {
    filteredProducts = filteredProducts.filter((p) => p.is_shortlisted)
  }

  let currentPage = 1

  // Cover page
  doc.setFillColor(...SURFACE_COLOR)
  doc.rect(0, 0, 210, 297, 'F')

  // Title
  doc.setFontSize(48)
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('FairLog', 105, 80, { align: 'center', maxWidth: 180 })

  // Event name
  doc.setFontSize(24)
  doc.setTextColor(...TEXT_COLOR)
  doc.text(event.name || 'Catálogo de Fornecedores', 105, 110, { align: 'center', maxWidth: 180 })

  // Event details
  doc.setFontSize(12)
  doc.setTextColor(200, 200, 200)

  let yPosition = 140
  if (event.country) {
    doc.text(`País: ${event.country}`, 105, yPosition, { align: 'center' })
    yPosition += 8
  }

  if (event.start_date) {
    const startDate = new Date(event.start_date).toLocaleDateString('pt-BR')
    const endDate = event.end_date ? new Date(event.end_date).toLocaleDateString('pt-BR') : ''
    const dateRange = endDate ? `${startDate} a ${endDate}` : startDate
    doc.text(`Datas: ${dateRange}`, 105, yPosition, { align: 'center' })
    yPosition += 8
  }

  // Generation date
  doc.setFontSize(10)
  const generationDate = new Date().toLocaleDateString('pt-BR')
  doc.text(`Relatório gerado em ${generationDate}`, 105, 250, { align: 'center' })

  // Metrics summary page
  doc.addPage()
  currentPage++

  doc.setFillColor(...SURFACE_COLOR)
  doc.rect(0, 0, 210, 297, 'F')

  doc.setFontSize(20)
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('Resumo Executivo', 20, 20)

  doc.setFontSize(12)
  doc.setTextColor(...TEXT_COLOR)

  const metrics = [
    { label: 'Fornecedores', value: filteredSuppliers.length },
    { label: 'Produtos', value: filteredProducts.length },
    {
      label: 'Produtos na Shortlist',
      value: filteredProducts.filter((p) => p.is_shortlisted).length,
    },
  ]

  let metricY = 50
  for (const metric of metrics) {
    doc.setFontSize(11)
    doc.setTextColor(200, 200, 200)
    doc.text(metric.label, 20, metricY)

    doc.setFontSize(24)
    doc.setTextColor(...ACCENT_COLOR)
    doc.text(metric.value.toString(), 100, metricY)

    metricY += 30
  }

  // Supplier pages with products
  for (const supplier of filteredSuppliers) {
    const supplierProducts = filteredProducts.filter((p) => p.supplier_id === supplier.id)

    if (supplierProducts.length === 0) continue

    // New page for each supplier
    doc.addPage()
    currentPage++

    doc.setFillColor(...SURFACE_COLOR)
    doc.rect(0, 0, 210, 297, 'F')

    // Supplier header
    doc.setFontSize(18)
    doc.setTextColor(...ACCENT_COLOR)
    doc.text(supplier.name || 'Fornecedor', 20, 20)

    // Supplier details
    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)

    let detailY = 35
    if (supplier.country) {
      doc.text(`País: ${supplier.country}`, 20, detailY)
      detailY += 6
    }
    if (supplier.stand) {
      doc.text(`Stand: ${supplier.stand}`, 20, detailY)
      detailY += 6
    }
    if (supplier.contact_email) {
      doc.text(`Contato: ${supplier.contact_email}`, 20, detailY)
      detailY += 6
    }

    // Products table
    const tableData = supplierProducts.map((product) => [
      product.name || '',
      product.category || '',
      product.sku || '',
      product.unit_price ? `$${product.unit_price}` : '',
      product.moq || '',
      product.is_shortlisted ? 'Sim' : 'Não',
    ])

    autoTable(doc, {
      head: [['Produto', 'Categoria', 'SKU', 'Preço Unit.', 'MOQ', 'Shortlist']],
      body: tableData,
      startY: detailY + 10,
      margin: 20,
      theme: 'grid',
      headStyles: {
        fillColor: ACCENT_COLOR,
        textColor: BG_COLOR,
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: {
        textColor: TEXT_COLOR,
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: SURFACE_COLOR,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 60 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
      },
    })
  }

  // Shortlist summary page
  const shortlistProducts = filteredProducts.filter((p) => p.is_shortlisted)
  if (shortlistProducts.length > 0) {
    doc.addPage()
    currentPage++

    doc.setFillColor(...SURFACE_COLOR)
    doc.rect(0, 0, 210, 297, 'F')

    doc.setFontSize(20)
    doc.setTextColor(...ACCENT_COLOR)
    doc.text('Shortlist de Produtos', 20, 20)

    const shortlistTableData = shortlistProducts.map((product) => {
      const supplier = filteredSuppliers.find((s) => s.id === product.supplier_id)
      return [
        supplier ? supplier.name : '',
        product.name || '',
        product.category || '',
        product.unit_price ? `$${product.unit_price}` : '',
        product.notes || '',
      ]
    })

    autoTable(doc, {
      head: [['Fornecedor', 'Produto', 'Categoria', 'Preço', 'Observações']],
      body: shortlistTableData,
      startY: 35,
      margin: 20,
      theme: 'grid',
      headStyles: {
        fillColor: ACCENT_COLOR,
        textColor: BG_COLOR,
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: {
        textColor: TEXT_COLOR,
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: SURFACE_COLOR,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 35 },
        1: { halign: 'left', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'left', cellWidth: 50 },
      },
    })
  }

  // Generate filename
  const filename = `${event.name || 'evento'}_relatorio_${new Date().toISOString().split('T')[0]}.pdf`

  // Save PDF
  doc.save(filename)
}

export default {
  exportEventToPdf,
}
