import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileSpreadsheet, File } from 'lucide-react';
import toast from 'react-hot-toast';

import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { exportEventToExcel } from '../lib/exportExcel';
import { exportEventToPdf } from '../lib/exportPdf';

export default function ExportPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSync();

  // Excel state
  const [excelScope, setExcelScope] = useState('complete');
  const [selectedSupplierExcel, setSelectedSupplierExcel] = useState('');
  const [generatingExcel, setGeneratingExcel] = useState(false);

  // PDF state
  const [pdfScope, setPdfScope] = useState('complete');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Data state
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);

  // Load suppliers on mount
  React.useEffect(() => {
    const loadSuppliers = async () => {
      try {
        let suppliersData = await db.suppliers
          .where('event_id')
          .equals(eventId)
          .toArray();

        if (!suppliersData || suppliersData.length === 0) {
          if (isOnline) {
            const { data, error } = await supabase
              .from('suppliers')
              .select('*')
              .eq('event_id', eventId);

            if (error) throw error;
            suppliersData = data || [];

            // Cache in Dexie
            for (const supplier of suppliersData) {
              await db.suppliers.put(supplier);
            }
          }
        }

        setSuppliers(suppliersData || []);
        setSuppliersLoaded(true);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        setSuppliersLoaded(true);
      }
    };

    if (eventId) {
      loadSuppliers();
    }
  }, [eventId, isOnline]);

  const handleGenerateExcel = async () => {
    try {
      setGeneratingExcel(true);

      // Fetch all necessary data
      let productsData = await db.products
        .where('event_id')
        .equals(eventId)
        .toArray();

      let shortlistData = [];
      if (excelScope === 'shortlist') {
        shortlistData = await db.shortlist
          .where('event_id')
          .equals(eventId)
          .toArray();
        // Filter products to only shortlisted ones
        const shortlistProductIds = shortlistData.map((i) => i.product_id);
        productsData = productsData.filter((p) =>
          shortlistProductIds.includes(p.id)
        );
      } else if (excelScope === 'supplier') {
        if (!selectedSupplierExcel) {
          toast.error('Selecione um fornecedor');
          setGeneratingExcel(false);
          return;
        }
        productsData = productsData.filter(
          (p) => p.supplier_id === selectedSupplierExcel
        );
      }

      // Get event and suppliers data
      const event = await db.events.get(eventId);
      let suppliersForExport = suppliers;
      if (excelScope === 'supplier') {
        suppliersForExport = suppliers.filter((s) => s.id === selectedSupplierExcel);
      }

      // Call export function
      await exportEventToExcel(event, suppliersForExport, productsData);
      toast.success('Excel exportado com sucesso');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Erro ao gerar Excel');
    } finally {
      setGeneratingExcel(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);

      // Fetch all necessary data
      let productsData = await db.products
        .where('event_id')
        .equals(eventId)
        .toArray();

      if (pdfScope === 'shortlist') {
        const shortlistData = await db.shortlist
          .where('event_id')
          .equals(eventId)
          .toArray();
        const shortlistProductIds = shortlistData.map((i) => i.product_id);
        productsData = productsData.filter((p) =>
          shortlistProductIds.includes(p.id)
        );
      }

      // Get event and suppliers data
      const event = await db.events.get(eventId);

      // Call export function
      await exportEventToPdf(event, suppliers, productsData);
      toast.success('PDF exportado com sucesso');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <PageWrapper className="bg-[#0f1117]">
      <Header
        title="Exportar"
        leftAction={{
          icon: ChevronLeft,
          onClick: () => navigate(`/events/${eventId}`),
        }}
        className="border-b border-[#30363d]"
      />

      <div className="space-y-6 p-4 pb-24">
        {/* Excel Export Section */}
        <div className="rounded-lg border border-[#30363d] bg-[#1a1d27] p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <FileSpreadsheet size={28} className="text-[#f59e0b] flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-[#c9d1d9]">
                Exportar Excel (.xlsx)
              </h2>
              <p className="text-sm text-[#8b949e]">
                Exporte os dados em formato de planilha
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="excelScope"
                value="complete"
                checked={excelScope === 'complete'}
                onChange={(e) => {
                  setExcelScope(e.target.value);
                  setSelectedSupplierExcel('');
                }}
                className="rounded border-[#30363d] bg-[#242836]"
              />
              <span className="text-[#c9d1d9]">Evento completo</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="excelScope"
                value="shortlist"
                checked={excelScope === 'shortlist'}
                onChange={(e) => {
                  setExcelScope(e.target.value);
                  setSelectedSupplierExcel('');
                }}
                className="rounded border-[#30363d] bg-[#242836]"
              />
              <span className="text-[#c9d1d9]">Apenas shortlist</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="excelScope"
                value="supplier"
                checked={excelScope === 'supplier'}
                onChange={(e) => {
                  setExcelScope(e.target.value);
                }}
                className="rounded border-[#30363d] bg-[#242836]"
              />
              <span className="text-[#c9d1d9]">Fornecedor específico</span>
            </label>
          </div>

          {/* Supplier Select */}
          {excelScope === 'supplier' && suppliersLoaded && suppliers.length > 0 && (
            <Select
              value={selectedSupplierExcel}
              onChange={setSelectedSupplierExcel}
              options={[
                { value: '', label: 'Selecionar fornecedor...' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateExcel}
            disabled={
              generatingExcel ||
              (excelScope === 'supplier' && !selectedSupplierExcel)
            }
            loading={generatingExcel}
            className="w-full"
          >
            {generatingExcel ? 'Gerando...' : 'Gerar Excel'}
          </Button>
        </div>

        {/* PDF Export Section */}
        <div className="rounded-lg border border-[#30363d] bg-[#1a1d27] p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <File size={28} className="text-[#f59e0b] flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-[#c9d1d9]">
                Relatório Executivo (PDF)
              </h2>
              <p className="text-sm text-[#8b949e]">
                Exporte um relatório em formato PDF
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="pdfScope"
                value="complete"
                checked={pdfScope === 'complete'}
                onChange={(e) => setPdfScope(e.target.value)}
                className="rounded border-[#30363d] bg-[#242836]"
              />
              <span className="text-[#c9d1d9]">Evento completo</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="pdfScope"
                value="shortlist"
                checked={pdfScope === 'shortlist'}
                onChange={(e) => setPdfScope(e.target.value)}
                className="rounded border-[#30363d] bg-[#242836]"
              />
              <span className="text-[#c9d1d9]">Apenas shortlist</span>
            </label>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            loading={generatingPdf}
            className="w-full"
          >
            {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-[#1a1d27] border border-[#30363d] p-4">
          <p className="text-sm text-[#8b949e]">
            Os arquivos serão gerados automaticamente e baixados para seu dispositivo.
          </p>
        </div>
      </div>

      <BottomNav eventId={eventId} />
    </PageWrapper>
  );
}
