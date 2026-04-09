import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useSaveWithSync } from '../hooks/useOfflineSync';

import Header from '../components/layout/Header';
import PageWrapper from '../components/layout/PageWrapper';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import TagChips from '../components/ui/TagChips';
import PhotoUploader from '../components/ui/PhotoUploader';
import TextArea from '../components/ui/TextArea';
import Select from '../components/ui/Select';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { cn } from '../lib/utils';

const PREDEFINED_TAGS = [
  'Premium',
  'Eco-friendly',
  'Customizable',
  'Fast Delivery',
  'Bulk Discount',
  'Certified',
  'New',
  'Sale',
];

export default function ProductFormPage() {
  const { eventId, supplierId, productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { save: saveProduct } = useSaveWithSync('products');

  // Form state
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unit_price: '',
    price_currency: '',
    price_fob: '',
    moq: '',
    lead_time: '',
    rating: 0,
    tags: [],
    notes: '',
    payment_terms: '',
    variations: '',
    dimensions: '',
    weight: '',
  });

  const [supplier, setSupplier] = useState(null);
  const [eventCurrency, setEventCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [actualSupplierId, setActualSupplierId] = useState(supplierId);

  // Load supplier and event data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get event currency
        const eventData = await db.events.get(eventId);
        if (eventData?.default_currency) {
          setEventCurrency(eventData.default_currency);
          setFormData(prev => ({
            ...prev,
            price_currency: eventData.default_currency,
          }));
        }

        // If editing (productId exists), load product data first to get supplierId
        let loadedSupplierId = supplierId;
        if (productId) {
          const productData = await db.products.get(productId);
          if (productData) {
            loadedSupplierId = productData.supplier_id;
            setActualSupplierId(loadedSupplierId);
            setFormData({
              name: productData.name || '',
              sku: productData.sku || '',
              unit_price: productData.unit_price || '',
              price_currency: productData.price_currency || eventCurrency,
              price_fob: productData.price_fob || '',
              moq: productData.moq || '',
              lead_time: productData.lead_time || '',
              rating: productData.rating || 0,
              tags: productData.tags || [],
              notes: productData.notes || '',
              payment_terms: productData.payment_terms || '',
              variations: productData.variations || '',
              dimensions: productData.dimensions || '',
              weight: productData.weight || '',
            });

            // Load photos — restore with annotations if available
            if (productData.photos && Array.isArray(productData.photos)) {
              const annotations = productData.photo_annotations || [];
              setPhotos(
                productData.photos.map((url, i) => ({
                  url,
                  annotation: annotations[i] || '',
                }))
              );
            }
          }
        }

        // Get supplier data
        if (loadedSupplierId) {
          const supplierData = await db.suppliers.get(loadedSupplierId);
          if (supplierData) {
            setSupplier(supplierData);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar dados');
      }
    };

    if (eventId) {
      loadData();
    }
  }, [eventId, supplierId, productId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCurrencyChange = (value) => {
    setFormData(prev => ({
      ...prev,
      price_currency: value,
    }));
  };

  const handleRatingChange = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating,
    }));
  };

  const handleTagsChange = (newTags) => {
    setFormData(prev => ({
      ...prev,
      tags: newTags,
    }));
  };

  const handlePhotosChange = (newPhotos) => {
    setPhotos(newPhotos);
  };

  const handleSave = async (addAnother = false) => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      // Upload new photos and build URLs
      const photoUrls = [];
      const photoAnnotations = [];

      for (const photo of photos) {
        const annotation = typeof photo === 'string' ? '' : photo?.annotation || '';

        if (typeof photo === 'string') {
          // Already a URL
          photoUrls.push(photo);
          photoAnnotations.push(annotation);
        } else if (photo?.url) {
          // Has existing URL
          photoUrls.push(photo.url);
          photoAnnotations.push(annotation);
        } else if (photo?.file instanceof File) {
          // New file — upload it
          try {
            const ext = photo.file.name?.split('.').pop() || 'jpg';
            const fileName = `${eventId}/${Date.now()}_${Math.random()
              .toString(36)
              .slice(2)}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from('fairlog-photos')
              .upload(fileName, photo.file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from('fairlog-photos')
              .getPublicUrl(fileName);

            photoUrls.push(urlData.publicUrl);
            photoAnnotations.push(annotation);
          } catch (err) {
            console.error('Photo upload error:', err);
            toast.error('Erro ao fazer upload de foto');
            throw err;
          }
        } else if (photo?.preview) {
          // Blob preview without file — can't upload
          console.warn('Photo has preview but no file, skipping:', photo);
        }
      }

      const productPayload = {
        event_id: eventId,
        supplier_id: actualSupplierId,
        created_by: user?.id,
        ...formData,
        photos: photoUrls.length > 0 ? photoUrls : null,
        photo_annotations: photoAnnotations.length > 0 ? photoAnnotations : null,
      };

      if (productId) {
        productPayload.id = productId;
      }

      const savedProduct = await saveProduct(productId || null, productPayload);

      toast.success(
        productId ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!'
      );

      if (addAnother) {
        // Reset form but keep supplier
        setFormData({
          name: '',
          sku: '',
          unit_price: '',
          price_currency: eventCurrency,
          price_fob: '',
          moq: '',
          lead_time: '',
          rating: 0,
          tags: [],
          notes: '',
          payment_terms: '',
          variations: '',
          dimensions: '',
          weight: '',
        });
        setPhotos([]);
        window.scrollTo(0, 0);
      } else {
        // Navigate to supplier detail
        navigate(`/events/${eventId}/suppliers/${actualSupplierId}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditMode = !!productId;
  const headerTitle = isEditMode ? 'Editar Produto' : 'Novo Produto';

  return (
    <PageWrapper className="bg-[#0f1117]">
      <Header
        title={headerTitle}
        subtitle={supplier?.name}
        leftAction={{
          icon: ChevronLeft,
          onClick: () => navigate(`/events/${eventId}/suppliers/${supplierId}`),
        }}
        className="border-b border-[#30363d]"
      />

      <div className="min-h-screen pb-32">
        {/* Photos Section */}
        <section className="px-4 py-6">
          <div className="rounded-lg bg-[#1a1d27] p-4">
            <PhotoUploader
              photos={photos}
              onPhotosChange={handlePhotosChange}
              maxPhotos={10}
            />
          </div>
        </section>

        {/* Main Form */}
        <section className="space-y-4 px-4 pb-6">
          {/* Product Name */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">
              Nome do produto <span className="text-red-500">*</span>
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Digite o nome do produto"
              className="mt-1"
              autoFocus
            />
          </div>

          {/* SKU */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">
              Código/SKU
            </label>
            <Input
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              placeholder="Ex: SKU-12345"
              className="mt-1"
            />
          </div>

          {/* Unit Price with Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-sm font-medium text-[#c9d1d9]">
                Preço unitário
              </label>
              <Input
                name="unit_price"
                type="number"
                value={formData.unit_price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#c9d1d9]">
                Moeda
              </label>
              <Select
                value={formData.price_currency}
                onChange={handleCurrencyChange}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'CNY', label: 'CNY' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'BRL', label: 'BRL' },
                ]}
                className="mt-1"
              />
            </div>
          </div>

          {/* FOB Price */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">
              Preço FOB
            </label>
            <Input
              name="price_fob"
              type="number"
              value={formData.price_fob}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              className="mt-1"
            />
          </div>

          {/* MOQ */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">MOQ</label>
            <Input
              name="moq"
              type="number"
              value={formData.moq}
              onChange={handleInputChange}
              placeholder="Pedido mínimo"
              className="mt-1"
            />
          </div>

          {/* Lead Time */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">
              Prazo de entrega
            </label>
            <Input
              name="lead_time"
              value={formData.lead_time}
              onChange={handleInputChange}
              placeholder="Ex: 30 dias"
              className="mt-1"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">
              Avaliação
            </label>
            <div className="mt-2">
              <StarRating
                value={formData.rating}
                onChange={handleRatingChange}
                size="lg"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">Tags</label>
            <div className="mt-2">
              <TagChips
                selectedTags={formData.tags}
                onTagsChange={handleTagsChange}
                availableTags={PREDEFINED_TAGS}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-[#c9d1d9]">
              Observações
            </label>
            <TextArea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Informações adicionais sobre o produto"
              rows={4}
              className="mt-1"
            />
          </div>

          {/* More Details Section */}
          <details className="mt-4" open={moreDetailsOpen}>
            <summary
              className="cursor-pointer font-medium text-[#c9d1d9] py-2"
              onClick={(e) => {
                e.preventDefault();
                setMoreDetailsOpen(!moreDetailsOpen);
              }}
            >
              Mais detalhes
            </summary>
            <div className="space-y-4 pt-4">
              {/* Payment Terms */}
              <div>
                <label className="text-sm font-medium text-[#c9d1d9]">
                  Condições de pagamento
                </label>
                <Input
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  placeholder="Ex: 50% adiantado, 50% na entrega"
                  className="mt-1"
                />
              </div>

              {/* Variations */}
              <div>
                <label className="text-sm font-medium text-[#c9d1d9]">
                  Variações disponíveis
                </label>
                <TextArea
                  name="variations"
                  value={formData.variations}
                  onChange={handleInputChange}
                  placeholder="Cores, tamanhos, materiais..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="text-sm font-medium text-[#c9d1d9]">
                  Dimensões
                </label>
                <Input
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  placeholder="Ex: 10x10x5cm"
                  className="mt-1"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="text-sm font-medium text-[#c9d1d9]">
                  Peso
                </label>
                <Input
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="Ex: 500g"
                  className="mt-1"
                />
              </div>
            </div>
          </details>
        </section>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#30363d] bg-[#0f1117] px-4 py-3 flex gap-2">
        <Button
          onClick={() => handleSave(false)}
          disabled={isLoading}
          variant="primary"
          className="flex-1"
        >
          {isLoading ? 'Salvando...' : 'Salvar Produto'}
        </Button>
        {!isEditMode && (
          <Button
            onClick={() => handleSave(true)}
            disabled={isLoading}
            variant="secondary"
            className="flex-1"
          >
            {isLoading ? 'Salvando...' : 'Salvar e Adicionar Outro'}
          </Button>
        )}
      </div>
    </PageWrapper>
  );
}
