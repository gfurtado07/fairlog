import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pencil,
  MapPin,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  Plus,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useRealtime } from '../hooks/useRealtime';
import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

export default function SupplierDetailPage() {
  const { eventId, supplierId } = useParams();
  const navigate = useNavigate();
  const { syncStatus } = useSync();
  const isOnline = syncStatus !== 'offline';
  const { getLocalData, saveLocal } = useOfflineSync();

  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [wechatCopied, setWechatCopied] = useState(false);

  // Listen for real-time product updates
  useRealtime(
    'products',
    'supplier_id',
    supplierId,
    (newProduct) => {
      setProducts((prev) => {
        const exists = prev.find((p) => p.id === newProduct.id);
        if (exists) return prev.map((p) => (p.id === newProduct.id ? newProduct : p));
        return [...prev, newProduct];
      });
    },
    (updatedProduct) => {
      setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    },
    (deletedProduct) => {
      setProducts((prev) => prev.filter((p) => p.id !== deletedProduct.id));
    }
  );

  // Load supplier and products
  useEffect(() => {
    const loadSupplierData = async () => {
      try {
        setLoading(true);

        let supplierData;
        if (isOnline) {
          const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', supplierId)
            .single();

          if (error) throw error;
          supplierData = data;
          await saveLocal('suppliers', supplierId, supplierData);
        } else {
          supplierData = await getLocalData('suppliers', supplierId);
        }

        setSupplier(supplierData);

        // Load products
        let productsData;
        if (isOnline) {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('supplier_id', supplierId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          productsData = data;
          await saveLocal('products', `${supplierId}_list`, productsData);
        } else {
          productsData = await getLocalData('products', `${supplierId}_list`);
        }

        setProducts(productsData || []);
      } catch (error) {
        console.error('Error loading supplier data:', error);
        toast.error('Erro ao carregar fornecedor');
      } finally {
        setLoading(false);
      }
    };

    loadSupplierData();
  }, [supplierId, isOnline]);

  const handleEditSupplier = () => {
    navigate(`/events/${eventId}/suppliers/${supplierId}/edit`);
  };

  const handleAddProduct = () => {
    navigate(`/events/${eventId}/suppliers/${supplierId}/products/new`);
  };

  const handleProductClick = (productId) => {
    navigate(`/events/${eventId}/products/${productId}`);
  };

  const handleWhatsAppClick = () => {
    if (supplier?.phone) {
      const phoneNumber = supplier.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  const handleEmailClick = () => {
    if (supplier?.email) {
      window.location.href = `mailto:${supplier.email}`;
    }
  };

  const handleWechatCopy = async () => {
    if (supplier?.wechat) {
      try {
        await navigator.clipboard.writeText(supplier.wechat);
        setWechatCopied(true);
        toast.success('Copiado para área de transferência');
        setTimeout(() => setWechatCopied(false), 2000);
      } catch (error) {
        toast.error('Erro ao copiar');
      }
    }
  };

  const handleWebsiteClick = () => {
    if (supplier?.website) {
      window.open(supplier.website, '_blank');
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      </PageWrapper>
    );
  }

  if (!supplier) {
    return (
      <PageWrapper>
        <div className="text-center py-8 text-gray-400">Fornecedor não encontrado</div>
      </PageWrapper>
    );
  }

  const photoGallery = supplier.photos || [];

  return (
    <PageWrapper>
      <Header
        title={supplier.name}
        rightContent={
          <button
            onClick={handleEditSupplier}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Pencil size={24} />
          </button>
        }
      />

      <div className="space-y-6 pb-24">
        {/* Supplier Info Section */}
        <Card className="mx-4 p-4 space-y-3">
          {/* Stand & Country */}
          <div className="flex items-start gap-3">
            <MapPin size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-400 text-sm">Stand</p>
              <p className="text-white font-medium">
                {supplier.stand_number || 'Não informado'}
              </p>
            </div>
          </div>

          {/* Country & Category */}
          <div className="flex gap-3">
            {supplier.country && (
              <Badge variant="secondary">{supplier.country}</Badge>
            )}
            {supplier.category && (
              <Badge variant="secondary">{supplier.category}</Badge>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3 pt-2">
            <StarRating value={supplier.rating || 0} readOnly />
            <span className="text-gray-400 text-sm">
              {supplier.rating?.toFixed(1) || '0'}
            </span>
          </div>
        </Card>

        {/* Contact Section */}
        <Card className="mx-4 p-4">
          <h3 className="text-white font-bold mb-4">Contato</h3>
          <div className="space-y-3">
            {supplier.contact_name && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Nome</p>
                <p className="text-white">{supplier.contact_name}</p>
              </div>
            )}

            {/* Contact Action Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {supplier.phone && (
                <button
                  onClick={handleWhatsAppClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="WhatsApp"
                >
                  <Phone size={20} className="text-amber-500" />
                  <span className="text-xs text-gray-400">WhatsApp</span>
                </button>
              )}

              {supplier.email && (
                <button
                  onClick={handleEmailClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Email"
                >
                  <Mail size={20} className="text-amber-500" />
                  <span className="text-xs text-gray-400">Email</span>
                </button>
              )}

              {supplier.wechat && (
                <button
                  onClick={handleWechatCopy}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                    wechatCopied
                      ? 'bg-green-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title="WeChat"
                >
                  <Copy
                    size={20}
                    className={wechatCopied ? 'text-green-400' : 'text-amber-500'}
                  />
                  <span className="text-xs text-gray-400">WeChat</span>
                </button>
              )}

              {supplier.website && (
                <button
                  onClick={handleWebsiteClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Website"
                >
                  <ExternalLink size={20} className="text-amber-500" />
                  <span className="text-xs text-gray-400">Site</span>
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Photo Gallery */}
        {photoGallery.length > 0 && (
          <Card className="mx-4 p-4">
            <h3 className="text-white font-bold mb-3">Fotos do Stand</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photoGallery.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src={photo}
                    alt={`Stand ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Notes Section */}
        {supplier.notes && (
          <Card className="mx-4 p-4">
            <h3 className="text-white font-bold mb-2">Observações</h3>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">
              {supplier.notes}
            </p>
          </Card>
        )}

        {/* Products Section */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">
              Produtos ({products.length})
            </h3>
            <button
              onClick={handleAddProduct}
              className="text-amber-500 hover:text-amber-400 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          {products.length === 0 ? (
            // Empty State
            <Card className="text-center py-12">
              <Package size={32} className="mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400 mb-4">Nenhum produto cadastrado</p>
              <Button variant="primary" size="sm" onClick={handleAddProduct}>
                Adicionar Primeiro Produto
              </Button>
            </Card>
          ) : (
            // Products List
            <div className="space-y-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:bg-gray-700 transition-colors p-4"
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="flex gap-4">
                    {/* Photo Thumbnail */}
                    {product.photos && product.photos[0] ? (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                        <img
                          src={product.photos[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500">
                        <Package size={20} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate mb-1">
                        {product.name}
                      </h4>

                      {/* Price & Rating */}
                      <div className="flex items-center justify-between mb-2">
                        {product.price && (
                          <p className="text-amber-400 font-medium">
                            ${parseFloat(product.price).toFixed(2)}
                          </p>
                        )}
                        <StarRating
                          value={product.rating || 0}
                          readOnly
                          size="sm"
                        />
                      </div>

                      {/* Shortlist Badge */}
                      {product.in_shortlist && (
                        <Badge variant="primary" size="sm">
                          Na Shortlist
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhotoIndex !== null && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPhotoIndex(null)}
          title={`Foto ${selectedPhotoIndex + 1} de ${photoGallery.length}`}
        >
          <img
            src={photoGallery[selectedPhotoIndex]}
            alt={`Stand ${selectedPhotoIndex + 1}`}
            className="w-full h-auto rounded-lg"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() =>
                setSelectedPhotoIndex((prev) =>
                  prev > 0 ? prev - 1 : photoGallery.length - 1
                )
              }
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() =>
                setSelectedPhotoIndex((prev) =>
                  prev < photoGallery.length - 1 ? prev + 1 : 0
                )
              }
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Próxima
            </button>
          </div>
        </Modal>
      )}

      <BottomNav eventId={eventId} />
    </PageWrapper>
  );
}
