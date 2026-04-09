import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import PageWrapper from '../components/layout/PageWrapper';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import PhotoUploader from '../components/ui/PhotoUploader';
import TextArea from '../components/ui/TextArea';
import BusinessCardScanner from '../components/ui/BusinessCardScanner';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

const COUNTRIES = [
  'China', 'Vietnã', 'Tailândia', 'Índia', 'Bangladesh',
  'Paquistão', 'Hong Kong', 'Indonésia', 'Malásia', 'Filipinas',
  'Taiwan', 'Japão', 'Coreia do Sul', 'Outros',
];

/** Convert photos[] + photo_annotations[] from DB into PhotoUploader format */
const mergePhotosWithAnnotations = (photoUrls = [], annotations = []) =>
  (photoUrls || []).map((url, i) => ({
    url,
    annotation: (annotations || [])[i] || '',
  }));

export default function SupplierFormPage() {
  const { eventId, supplierId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { syncStatus } = useSync();
  const isOnline = syncStatus !== 'offline';
  const { getLocalData, saveLocal } = useOfflineSync();
  const nameInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    stand_number: '',
    country: '',
    category: '',
    rating: 0,
    contact_name: '',
    phone: '',
    email: '',
    wechat: '',
    website: '',
    notes: '',
    // photos: array of { url?, preview?, file?, annotation }
    photos: [],
  });

  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // ── Load supplier for edit mode ──────────────────────────────────────────
  useEffect(() => {
    if (supplierId && supplierId !== 'new') {
      loadSupplier();
    }
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, [supplierId]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      let supplier;
      if (isOnline) {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();
        if (error) throw error;
        supplier = data;
        await saveLocal('suppliers', supplierId, supplier);
      } else {
        supplier = await getLocalData('suppliers', supplierId);
      }

      if (supplier) {
        setIsEditMode(true);
        setFormData({
          name: supplier.name || '',
          stand_number: supplier.stand_number || '',
          country: supplier.country || '',
          category: supplier.category || '',
          rating: supplier.rating || 0,
          contact_name: supplier.contact_name || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          wechat: supplier.wechat || '',
          website: supplier.website || '',
          notes: supplier.notes || '',
          photos: mergePhotosWithAnnotations(
            supplier.photos,
            supplier.photo_annotations
          ),
        });
      }
    } catch (error) {
      console.error('Error loading supplier:', error);
      toast.error('Erro ao carregar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  // ── Form field handlers ──────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handlePhotosChange = (photos) => {
    setFormData((prev) => ({ ...prev, photos }));
  };

  // ── Business card scanner callback ───────────────────────────────────────
  const handleCardExtracted = (data) => {
    if (!data) return;
    toast.success('Dados do cartão preenchidos!');
    setFormData((prev) => ({
      ...prev,
      // Only fill empty fields to avoid overwriting what the user typed
      name: prev.name || data.name || prev.name,
      contact_name: prev.contact_name || data.name || prev.contact_name,
      phone: prev.phone || data.phone || '',
      email: prev.email || data.email || '',
      website: prev.website || data.website || '',
      wechat: prev.wechat || data.wechat || '',
      // Merge notes from card
      notes: prev.notes
        ? prev.notes
        : [
            data.company && `Empresa: ${data.company}`,
            data.title && `Cargo: ${data.title}`,
            data.address && `Endereço: ${data.address}`,
            data.notes,
          ]
            .filter(Boolean)
            .join('\n') || '',
    }));
  };

  // ── Save supplier ────────────────────────────────────────────────────────
  const saveSupplier = async (navigateToProducts = false) => {
    if (!formData.name.trim()) {
      toast.error('Nome do fornecedor é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Split photos into URLs + annotations
      const photoUrls = [];
      const photoAnnotations = [];

      if (isOnline) {
        for (const photo of formData.photos) {
          const file =
            photo instanceof File
              ? photo
              : photo?.file instanceof File
              ? photo.file
              : null;
          const existingUrl = typeof photo === 'string' ? photo : photo?.url || null;
          const annotation = photo?.annotation || '';

          if (existingUrl) {
            photoUrls.push(existingUrl);
            photoAnnotations.push(annotation);
          } else if (file) {
            try {
              const ext = file.name?.split('.').pop() || 'jpg';
              const fileName = `${eventId}/${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}.${ext}`;
              const { error: uploadError } = await supabase.storage
                .from('supplier_photos')
                .upload(fileName, file);
              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from('supplier_photos')
                .getPublicUrl(fileName);

              photoUrls.push(urlData.publicUrl);
              photoAnnotations.push(annotation);
            } catch (err) {
              console.error('Photo upload error:', err);
              toast.error('Erro no upload de foto');
            }
          } else if (photo?.preview) {
            // blob preview — keep annotation only (no persistent URL)
            photoAnnotations.push(annotation);
          }
        }
      }

      const supplierData = {
        event_id: eventId,
        name: formData.name.trim(),
        stand_number: formData.stand_number || null,
        country: formData.country || null,
        category: formData.category || null,
        rating: formData.rating || 0,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        email: formData.email || null,
        wechat: formData.wechat || null,
        website: formData.website || null,
        notes: formData.notes || null,
        photos: photoUrls,
        photo_annotations: photoAnnotations,
        in_shortlist: false,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      let savedSupplierId = supplierId;

      if (isOnline) {
        if (isEditMode) {
          const { error } = await supabase
            .from('suppliers')
            .update(supplierData)
            .eq('id', supplierId);
          if (error) throw error;
          toast.success('Fornecedor atualizado com sucesso');
        } else {
          const { data, error } = await supabase
            .from('suppliers')
            .insert([supplierData])
            .select('id')
            .single();
          if (error) throw error;
          savedSupplierId = data.id;
          toast.success('Fornecedor criado com sucesso');
        }
        // Update local cache
        await saveLocal('suppliers', savedSupplierId, {
          ...supplierData,
          id: savedSupplierId,
        });
      } else {
        // Offline path — store with preview URLs + annotations in Dexie
        const offlineData = {
          ...supplierData,
          photos: formData.photos
            .map((p) => p?.preview || p?.url || (typeof p === 'string' ? p : null))
            .filter(Boolean),
          photo_annotations: formData.photos.map((p) => p?.annotation || ''),
          id: supplierId || crypto.randomUUID(),
          sync_status: 'pending',
        };

        if (isEditMode) {
          await db.suppliers.put(offlineData);
        } else {
          savedSupplierId = offlineData.id;
          await db.suppliers.put(offlineData);
          await db.sync_queue.add({
            table: 'suppliers',
            action: 'create',
            record_id: savedSupplierId,
            created_at: new Date().toISOString(),
          });
        }
        toast.success('Fornecedor salvo offline');
      }

      if (navigateToProducts) {
        navigate(`/events/${eventId}/suppliers/${savedSupplierId}/products/new`);
      } else {
        navigate(`/events/${eventId}`);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <Header
        title={isEditMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        leftContent={
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <ArrowLeft size={22} />
          </button>
        }
      />

      {loading && isEditMode ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="pb-32">
          <div className="space-y-5 px-4 py-6">

            {/* ── Scan Business Card ── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Início rápido
              </p>
              <BusinessCardScanner onExtracted={handleCardExtracted} />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Ou preencha manualmente abaixo
              </p>
            </div>

            <hr className="border-gray-700" />

            {/* ── Dados do Fornecedor ── */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Fornecedor *
              </label>
              <Input
                ref={nameInputRef}
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Guangzhou ABC Trading Co."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número do Stand
              </label>
              <Input
                type="text"
                name="stand_number"
                value={formData.stand_number}
                onChange={handleInputChange}
                placeholder="Ex: Hall 11.2 / A-B12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                País de Origem
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              >
                <option value="">Selecione um país</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoria / Segmento
              </label>
              <Input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Ex: Eletrônicos, Têxtil, Embalagens"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avaliação
              </label>
              <StarRating value={formData.rating} onChange={handleRatingChange} size="lg" />
            </div>

            <hr className="border-gray-700" />

            {/* ── Contato ── */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Contato
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Contato
              </label>
              <Input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleInputChange}
                placeholder="Ex: Zhang Wei"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telefone / WhatsApp
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Ex: +86 139 0000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-mail
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Ex: sales@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                WeChat
              </label>
              <Input
                type="text"
                name="wechat"
                value={formData.wechat}
                onChange={handleInputChange}
                placeholder="Ex: zhangwei_trade"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website
              </label>
              <Input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://www.empresa.com"
              />
            </div>

            <hr className="border-gray-700" />

            {/* ── Observações ── */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Observações
              </label>
              <TextArea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Impressões gerais, termos discutidos, follow-ups..."
                rows={4}
              />
            </div>

            {/* ── Fotos do Stand ── */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fotos do Stand
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  — adicione uma anotação a cada foto (preço, MOQ, prazo...)
                </span>
              </label>
              <PhotoUploader
                photos={formData.photos}
                onPhotosChange={handlePhotosChange}
                maxPhotos={20}
              />
            </div>
          </div>

          {/* ── Sticky bottom buttons ── */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pt-4 pb-6 px-4 flex gap-3 z-40 max-w-xl mx-auto">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => saveSupplier(false)}
              loading={loading}
            >
              Salvar
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => saveSupplier(true)}
              loading={loading}
            >
              Salvar + Produtos
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
