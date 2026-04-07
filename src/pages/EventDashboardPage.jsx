import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Package, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useRealtime } from '../hooks/useRealtime';
import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import PageWrapper from '../components/layout/PageWrapper';
import SearchBar from '../components/ui/SearchBar';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import SyncIndicator from '../components/ui/SyncIndicator';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

export default function EventDashboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { syncStatus } = useSync();
  const isOnline = syncStatus !== 'offline';
  const { getLocalData, saveLocal } = useOfflineSync();

  const [event, setEvent] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSuppliers: 0,
    totalProducts: 0,
    inShortlist: 0,
  });

  // Listen for real-time supplier updates
  useRealtime(
    'suppliers',
    'event_id',
    eventId,
    (newSupplier) => {
      setSuppliers((prev) => {
        const exists = prev.find((s) => s.id === newSupplier.id);
        if (exists) return prev.map((s) => (s.id === newSupplier.id ? newSupplier : s));
        return [...prev, newSupplier];
      });
    },
    (updatedSupplier) => {
      setSuppliers((prev) => prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s)));
    },
    (deletedSupplier) => {
      setSuppliers((prev) => prev.filter((s) => s.id !== deletedSupplier.id));
    }
  );

  // Load event details
  useEffect(() => {
    const loadEvent = async () => {
      try {
        if (isOnline) {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

          if (error) throw error;
          setEvent(data);
          await saveLocal('events', eventId, data);
        } else {
          const localEvent = await getLocalData('events', eventId);
          if (localEvent) setEvent(localEvent);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Erro ao carregar evento');
      }
    };

    loadEvent();
  }, [eventId, isOnline]);

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);

        let data;
        if (isOnline) {
          const { data: result, error } = await supabase
            .from('suppliers')
            .select(
              `
              *,
              products:products(id)
            `
            )
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          data = result;
          await saveLocal('suppliers', `${eventId}_list`, data);
        } else {
          data = await getLocalData('suppliers', `${eventId}_list`);
          if (!data) {
            data = [];
          }
        }

        setSuppliers(data || []);
        calculateMetrics(data || []);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        toast.error('Erro ao carregar fornecedores');
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, [eventId, isOnline]);

  // Filter suppliers based on search
  useEffect(() => {
    const filtered = suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm]);

  const calculateMetrics = (supplierList) => {
    const totalProducts = supplierList.reduce(
      (sum, s) => sum + (s.products?.length || 0),
      0
    );
    const inShortlist = supplierList.filter((s) => s.in_shortlist).length;

    setMetrics({
      totalSuppliers: supplierList.length,
      totalProducts,
      inShortlist,
    });
  };

  const handleAddSupplier = () => {
    navigate(`/events/${eventId}/suppliers/new`);
  };

  const handleSupplierClick = (supplierId) => {
    navigate(`/events/${eventId}/suppliers/${supplierId}`);
  };

  if (!event) {
    return (
      <PageWrapper>
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Header
        title={event.name}
        subtitle="Fornecedores"
        rightContent={<SyncIndicator eventId={eventId} />}
      />

      <div className="space-y-6 pb-24">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3 px-4">
          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <div className="flex justify-center mb-2">
              <Users size={20} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.totalSuppliers}
            </div>
            <div className="text-sm text-gray-400">Fornecedores</div>
          </div>

          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <div className="flex justify-center mb-2">
              <Package size={20} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.totalProducts}
            </div>
            <div className="text-sm text-gray-400">Produtos</div>
          </div>

          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <div className="flex justify-center mb-2">
              <Star size={20} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.inShortlist}
            </div>
            <div className="text-sm text-gray-400">Shortlist</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4">
          <SearchBar
            placeholder="Buscar fornecedor..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        {/* Suppliers List */}
        <div className="px-4 space-y-3">
          {loading ? (
            // Skeleton Cards
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </>
          ) : filteredSuppliers.length === 0 ? (
            // Empty State
            <div className="rounded-lg bg-gray-800 p-12 text-center">
              <div className="text-gray-400 mb-4">Nenhum fornecedor cadastrado</div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSupplier}
              >
                Adicionar Primeiro Fornecedor
              </Button>
            </div>
          ) : (
            // Supplier Cards
            filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-lg bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors p-4"
                onClick={() => handleSupplierClick(supplier.id)}
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gray-700 overflow-hidden">
                    {supplier.photos && supplier.photos[0] ? (
                      <img
                        src={supplier.photos[0]}
                        alt={supplier.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Package size={20} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white truncate">
                          {supplier.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Stand {supplier.stand_number || '—'} • {supplier.country || '—'}
                        </p>
                      </div>
                      {supplier.products && supplier.products.length > 0 && (
                        <span className="bg-amber-500/20 text-amber-400 text-xs font-medium px-2 py-1 rounded whitespace-nowrap ml-2">
                          {supplier.products.length} produtos
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <StarRating
                        value={supplier.rating || 0}
                        readOnly
                        size="sm"
                      />
                      <span className="text-sm text-gray-400">
                        {supplier.rating?.toFixed(1) || '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleAddSupplier}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg transition-colors z-10"
        aria-label="Adicionar fornecedor"
      >
        <Plus size={24} />
      </button>

      <BottomNav eventId={eventId} />
    </PageWrapper>
  );
}
