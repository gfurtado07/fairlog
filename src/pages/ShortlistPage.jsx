import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import StarRating from '../components/ui/StarRating';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { formatPrice } from '../lib/utils';

const SHORTLIST_STATUS_OPTIONS = [
  { value: 'new', label: 'Novo' },
  { value: 'sample_requested', label: 'Amostra Pedida' },
  { value: 'quote', label: 'Cotação' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'discarded', label: 'Descartado' },
];

const STATUS_COLORS = {
  new: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sample_requested: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  quote: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  discarded: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_LABELS = {
  new: 'Novo',
  sample_requested: 'Amostra Pedida',
  quote: 'Cotação',
  approved: 'Aprovado',
  discarded: 'Descartado',
};

const STATUS_ORDER = ['new', 'sample_requested', 'quote', 'approved', 'discarded'];

export default function ShortlistPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useSync();

  // State
  const [shortlistItems, setShortlistItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    new: true,
    sample_requested: true,
    quote: true,
    approved: true,
    discarded: true,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load shortlist items
        let shortlistData = await db.shortlist
          .where('event_id')
          .equals(eventId)
          .toArray();

        if (!shortlistData || shortlistData.length === 0) {
          if (isOnline) {
            const { data, error } = await supabase
              .from('shortlist')
              .select('*')
              .eq('event_id', eventId);

            if (error) throw error;
            shortlistData = data || [];

            // Cache in Dexie
            for (const item of shortlistData) {
              await db.shortlist.put(item);
            }
          }
        }

        setShortlistItems(shortlistData || []);

        // Load products
        let productsData = await db.products
          .where('event_id')
          .equals(eventId)
          .toArray();

        if (!productsData || productsData.length === 0) {
          if (isOnline) {
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .eq('event_id', eventId);

            if (error) throw error;
            productsData = data || [];

            // Cache in Dexie
            for (const product of productsData) {
              await db.products.put(product);
            }
          }
        }

        setProducts(productsData || []);

        // Load suppliers
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
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar shortlist');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadData();
    }
  }, [eventId, isOnline]);

  // Group and filter shortlist items
  const groupedItems = useMemo(() => {
    const groups = {
      new: [],
      sample_requested: [],
      quote: [],
      approved: [],
      discarded: [],
    };

    shortlistItems.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return;

      const status = item.status || 'new';
      if (groups[status]) {
        groups[status].push({
          ...item,
          product,
          supplier: suppliers.find((s) => s.id === product.supplier_id),
        });
      }
    });

    // Apply supplier filter
    if (selectedSupplier) {
      Object.keys(groups).forEach((status) => {
        groups[status] = groups[status].filter(
          (item) => item.supplier?.id === selectedSupplier
        );
      });
    }

    return groups;
  }, [shortlistItems, products, suppliers, selectedSupplier]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      new: groupedItems.new.length,
      sample_requested: groupedItems.sample_requested.length,
      quote: groupedItems.quote.length,
      approved: groupedItems.approved.length,
      discarded: groupedItems.discarded.length,
    };
  }, [groupedItems]);

  const handleStatusChange = async (shortlistId, newStatus) => {
    try {
      const item = shortlistItems.find((i) => i.id === shortlistId);
      if (!item) return;

      // Update in Dexie
      await db.shortlist.update(shortlistId, { status: newStatus });

      // Update in state
      setShortlistItems((prev) =>
        prev.map((i) =>
          i.id === shortlistId ? { ...i, status: newStatus } : i
        )
      );

      // Sync to Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('shortlist')
          .update({ status: newStatus })
          .eq('id', shortlistId);

        if (error) throw error;
      }

      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const toggleSection = (status) => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const totalItems = shortlistItems.length;
  const emptyShortlist = totalItems === 0;

  if (loading) {
    return (
      <PageWrapper className="bg-[#0f1117]">
        <Header
          title="Shortlist"
          leftAction={{
            icon: ChevronLeft,
            onClick: () => navigate(`/events/${eventId}`),
          }}
        />
        <div className="flex items-center justify-center py-16 text-[#c9d1d9]">
          Carregando shortlist...
        </div>
        <BottomNav eventId={eventId} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-[#0f1117]">
      <Header
        title="Shortlist"
        leftAction={{
          icon: ChevronLeft,
          onClick: () => navigate(`/events/${eventId}`),
        }}
        className="border-b border-[#30363d]"
      />

      <div className="space-y-4 pb-24">
        {/* Status Counts */}
        {!emptyShortlist && (
          <div className="px-4 pt-4 overflow-x-auto">
            <div className="flex gap-2 pb-2 min-w-min">
              {STATUS_ORDER.map((status) => (
                <div
                  key={status}
                  className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
                    STATUS_COLORS[status]
                  } border`}
                >
                  <span>{STATUS_LABELS[status]}</span>
                  <span className="bg-black/30 px-2 rounded-full text-xs font-bold">
                    {statusCounts[status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supplier Filter */}
        {!emptyShortlist && suppliers.length > 0 && (
          <div className="px-4">
            <Select
              value={selectedSupplier}
              onChange={setSelectedSupplier}
              options={[
                { value: '', label: 'Todos os fornecedores' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          </div>
        )}

        {/* Empty State */}
        {emptyShortlist ? (
          <div className="px-4 py-8">
            <EmptyState
              title="Nenhum produto na shortlist"
              description="Adicione produtos na tela Explorar"
            />
          </div>
        ) : (
          <>
            {/* Shortlist Items Grouped by Status */}
            {STATUS_ORDER.map((status) => {
              const items = groupedItems[status];

              if (items.length === 0) return null;

              return (
                <section key={status} className="px-4">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(status)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1d27] border border-[#30363d] hover:bg-[#242836] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#c9d1d9]">
                        {STATUS_LABELS[status]}
                      </span>
                      <Badge
                        label={items.length.toString()}
                        className="bg-[#f59e0b] text-gray-900"
                      />
                    </div>
                    {expandedSections[status] ? (
                      <ChevronUp size={18} className="text-[#8b949e]" />
                    ) : (
                      <ChevronDown size={18} className="text-[#8b949e]" />
                    )}
                  </button>

                  {/* Section Items */}
                  {expandedSections[status] && (
                    <div className="mt-2 space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg bg-[#1a1d27] border border-[#30363d] space-y-2"
                        >
                          {/* Product Info */}
                          <button
                            onClick={() =>
                              navigate(
                                `/events/${eventId}/products/${item.product_id}`
                              )
                            }
                            className="w-full text-left flex gap-3 pb-3 border-b border-[#30363d] hover:opacity-80 transition"
                          >
                            {/* Photo */}
                            {item.product.photos?.[0] ? (
                              <img
                                src={item.product.photos[0]}
                                alt={item.product.name}
                                className="w-12 h-12 rounded object-cover bg-[#242836] flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-[#242836] flex-shrink-0 flex items-center justify-center text-[#8b949e] text-xs">
                                Sem foto
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#c9d1d9] truncate">
                                {item.product.name}
                              </h4>
                              <p className="text-sm text-[#8b949e] truncate">
                                {item.supplier?.name}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-[#f59e0b] font-semibold text-sm">
                                  {formatPrice(
                                    item.product.unit_price,
                                    item.product.price_currency
                                  )}
                                </div>
                                {item.product.rating > 0 && (
                                  <StarRating
                                    value={item.product.rating}
                                    readOnly
                                    size="sm"
                                  />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Status Selector */}
                          <Select
                            value={item.status || 'new'}
                            onChange={(newStatus) =>
                              handleStatusChange(item.id, newStatus)
                            }
                            options={SHORTLIST_STATUS_OPTIONS}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>

      <BottomNav eventId={eventId} />
    </PageWrapper>
  );
}
