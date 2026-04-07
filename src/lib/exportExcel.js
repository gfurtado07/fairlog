import * as XLSX from 'xlsx'

/**
 * Export event data to Excel workbook
 * @param {object} event - Event data
 * @param {array} suppliers - Suppliers list
 * @param {array} products - Products list
 * @param {object} options - Export options (shortlistOnly, supplierId)
 */
export async function exportEventToExcel(event, suppliers, products, options = {}) {
  const { shortlistOnly = false, supplierId = null } = options

  const workbook = XLSX.utils.book_new()

  // Filter data based on options
  let filteredSuppliers = suppliers
  let filteredProducts = products

  if (supplierId) {
    filteredSuppliers = suppliers.filter((s) => s.id === supplierId)
    filteredProducts = products.filter((p) => p.supplier_id === supplierId)
  }

  if (shortlistOnly) {
    filteredProducts = filteredProducts.filter((p) => p.is_shortlisted)
  }

  // Create summary sheet with all data
  const summaryData = []

  for (const product of filteredProducts) {
    const supplier = filteredSuppliers.find((s) => s.id === product.supplier_id)

    if (supplier) {
      summaryData.push({
        Evento: event.name || '',
        Fornecedor: supplier.name || '',
        Stand: supplier.stand || '',
        País: supplier.country || '',
        Contato: supplier.contact_email || '',
        Produto: product.name || '',
        SKU: product.sku || '',
        'Preço Unit.': product.unit_price ? `${product.unit_price}` : '',
        FOB: product.fob_price ? `${product.fob_price}` : '',
        MOQ: product.moq || '',
        Prazo: product.lead_time || '',
        Avaliação: product.rating || '',
        Tags: product.tags ? product.tags.join(', ') : '',
        Observações: product.notes || '',
        Shortlist: product.is_shortlisted ? 'Sim' : 'Não',
        Status: product.sync_status || '',
        'Foto Principal': product.photo_url || '',
      })
    }
  }

  // Add summary sheet
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Evento
    { wch: 20 }, // Fornecedor
    { wch: 12 }, // Stand
    { wch: 12 }, // País
    { wch: 25 }, // Contato
    { wch: 20 }, // Produto
    { wch: 15 }, // SKU
    { wch: 12 }, // Preço Unit.
    { wch: 12 }, // FOB
    { wch: 10 }, // MOQ
    { wch: 12 }, // Prazo
    { wch: 10 }, // Avaliação
    { wch: 20 }, // Tags
    { wch: 30 }, // Observações
    { wch: 10 }, // Shortlist
    { wch: 12 }, // Status
    { wch: 20 }, // Foto Principal
  ]

  summarySheet['!cols'] = columnWidths

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo')

  // Create one sheet per supplier
  for (const supplier of filteredSuppliers) {
    const supplierProducts = filteredProducts.filter((p) => p.supplier_id === supplier.id)

    if (supplierProducts.length > 0) {
      const supplierData = supplierProducts.map((product) => ({
        Produto: product.name || '',
        SKU: product.sku || '',
        Categoria: product.category || '',
        'Preço Unit.': product.unit_price ? `${product.unit_price}` : '',
        FOB: product.fob_price ? `${product.fob_price}` : '',
        MOQ: product.moq || '',
        Prazo: product.lead_time || '',
        Avaliação: product.rating || '',
        Tags: product.tags ? product.tags.join(', ') : '',
        Observações: product.notes || '',
        Shortlist: product.is_shortlisted ? 'Sim' : 'Não',
      }))

      const supplierSheet = XLSX.utils.json_to_sheet(supplierData)

      const supplierColumnWidths = [
        { wch: 20 }, // Produto
        { wch: 15 }, // SKU
        { wch: 15 }, // Categoria
        { wch: 12 }, // Preço Unit.
        { wch: 12 }, // FOB
        { wch: 10 }, // MOQ
        { wch: 12 }, // Prazo
        { wch: 10 }, // Avaliação
        { wch: 20 }, // Tags
        { wch: 30 }, // Observações
        { wch: 10 }, // Shortlist
      ]

      supplierSheet['!cols'] = supplierColumnWidths

      const sheetName = supplier.name
        .substring(0, 31)
        .replace(/[/\\?*[\]]/g, '')

      XLSX.utils.book_append_sheet(workbook, supplierSheet, sheetName)
    }
  }

  // Generate filename
  const filename = `${event.name || 'evento'}_catalogo_${new Date().toISOString().split('T')[0]}.xlsx`

  // Download
  XLSX.writeFile(workbook, filename)
}

export default {
  exportEventToExcel,
}
