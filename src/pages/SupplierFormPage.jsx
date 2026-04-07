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

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

const COUNTRIES = [
  'China',
  'Vietnã',
  'Tailândia',
  'Índia',
  'Bangladesh',
  'Paquistão',
  'Hong Kong',
  'Indonésia',
  'Malásia',
  'Filipinas',
  'Taiwan',
  'Outros',
];

export default function SupplierFormPage() {
  const { eventId, supplierId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useSync();
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
    photos: [],
    offline_photos: [],
  });

  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalPhotoUrls, setOriginalPhotoUrls] = useState([]);

  // Load supplier data if in edit mode
  useEffect(() => {
    if (supplierId && supplierId !== 'new') {
      loadSupplier();
    }
    // Auto-focus name input
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
          photos: supplier.photos || [],
          offline_photos: [],
        });
        setOriginalPhotoUrls(supplier.photos || []);
      }
    } catch (error) {
      console.error('Error loading supplier:', error);
      toast.error('Erro ao carregar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating,
    }));
  };

  const handlePhotosChange = (photos) => {
    setFormData((prev) => ({
      ...prev,
      photos,
    }));
  };

  const handleOfflinePhotosChange = (offlinePhotos) => {
    setFormData((prev) => ({
      ...prev,
      offline_photos: offlinePhotos,
    }));
  };

  const saveSupplier = async (navigateToProducts = false) => {
    try {
      setLoading(true);

      // Validation
      if (!formData.name.trim()) {
        toast.error('Nome do fornecedor é obrigatório');
        return;
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
        photos: formData.photos,
        in_shortlist: isEditMode ? formData.in_shortlist : false,
        created_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      let savedSupplierId = supplierId;

      if (isOnline) {
        // Handle photo uploads to Supabase Storage
        const uploadedPhotos = [];

        for (const photo of formData.photos) {
          if (!photo.startsWith('http') && !photo.startsWith('data:')) {
            // Local file path - upload to storage
            try {
              const fileName = `${eventId}/${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}`;
              const { data, error } = await supabase.storage
                .from('supplier_photos')
                .upload(fileName, photo);

              if (error) throw error;

              const { data: urlData } = supabase.storage
                .from('supplier_photos')
                .getPublicUrl(fileName);

              uploadedPhotos.push(urlData.publicUrl);
            } catch (error) {
              console.error('Error uploading photo:', error);
              toast.error('Erro ao fazer upload de fotos');
            }
          } else {
            // Already a URL or data URL
            uploadedPhotos.push(photo);
          }
        }

        supplierData.photos = uploadedPhotos;

        if (isEditMode) {
          // Update existing supplier
          const { error } = await supabase
            .from('suppliers')
            .update(supplierData)
            .eq('id', supplierId);

          if (error) throw error;
          toast.success('Fornecedor atualizado com sucesso');
        } else {
          // Create new supplier
          const { data, error } = await supabase
            .from('suppliers')
            .insert([supplierData])
            .select('id')
            .single();

          if (error) throw error;
          savedSupplierId = data.id;
          toast.success('Fornecedor criado com sucesso');
        }
      } else {
        // Offline mode - save to Dexie
        const offlineData = {
          ...supplierData,
          offline_photos: formData.offline_photos,
        };

        if (isEditMode) {
          await db.suppliers.update(supplierId, offlineData);
        } else {
          const result = await db.suppliers.add(offlineData);
          savedSupplierId = result;
        }

        toast.success('Fornecedor salvo offline');
      }

      // Navigate based on user action
      if (navigateToProducts) {
        navigate(`/events/${eventId}/suppliers/${savedSupplierId}/products/new`);
      } else {
        navigate(`/events/${eventId}`);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Erro ao salvar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <Header
        title={isEditMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        leftContent={
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        }
      />

      {loading && !isEditMode ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="pb-32">
          <form className="space-y-4 px-4 py-6">
            {/* Nome * */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome *
              </label>
              <Input
                ref={nameInputRef}
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Fabrica ABC Ltda"
                autoFocus
              />
            </div>

            {/* Número do Stand */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número do Stand
              </label>
              <Input
                type="text"
                name="stand_number"
                value={formData.stand_number}
                onChange={handleInputChange}
                placeholder="Ex: A12"
              />
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                País
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              >
                <option value="">Selecione um país</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoria
              </label>
              <Input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Ex: Eletrônicos, Têxtil"
              />
            </div>

            {/* Avaliação */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avaliação
              </label>
              <StarRating
                value={formData.rating}
                onChange={handleRatingChange}
                size="lg"
              />
            </div>

            {/* Nome do Contato */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Contato
              </label>
              <Input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleInputChange}
                placeholder="Ex: João Silva"
              />
            </div>

            {/* Telefone/WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telefone / WhatsApp
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Ex: +55 11 99999-9999"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-mail
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Ex: contato@empresa.com"
              />
            </div>

            {/* WeChat */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                WeChat
              </label>
              <Input
                type="text"
                name="wechat"
                value={formData.wechat}
                onChange={handleInputChange}
                placeholder="Ex: username_wechat"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website
              </label>
              <Input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="Ex: https://www.empresa.com"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Observações
              </label>
              <TextArea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Ex: Notas sobre a fábrica, qualidade, etc..."
                rows={4}
              />
            </div>

            {/* Fotos do Stand */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fotos do Stand
              </label>
              <PhotoUploader
                onPhotosChange={handlePhotosChange}
                onOfflinePhotosChange={handleOfflinePhotosChange}
                initialPhotos={originalPhotoUrls}
              />
            </div>
          </form>

          {/* Sticky Bottom Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent pt-4 pb-4 px-4 flex gap-3 z-40 max-w-xl mx-auto">
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
              Salvar e ir para Produtos
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
