import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  List,
  Grid3X3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import PageWrapper from '../components/layout/PageWrapper';
import SearchBar from '../components/ui/SearchBar';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import TagChips from '../components/ui/TagChips';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { formatPrice } from '../lib/utils';

const RATING_OPTIONS = [
  { value: 1, label: '1★' },
  { value: 2, label: '2★' },
  { value: 3, label: '3★' },
  { value: 4, label: '4★' },
  { value: 5, label: '5★' },
];

export default function ExplorePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useSync();

  // State
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [showFilters, setShowFilters] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [onlyShortlist, setOnlyShortlist] = useState(false);

  // Load products and suppliers
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

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
        toast.error('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadData();
    }
  }, [eventId, isOnline]);

  // Filter products based on all criteria
  const filteredProducts = useMemo(() => {
    let result = products;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(term))
      );

      // Also check supplier name
      result = result.filter((p) => {
        const supplier = suppliers.find((s) => s.id === p.supplier_id);
        return supplier?.name?.toLowerCase().includes(term);
      });
    }

    // Supplier filter
    if (selectedSuppliers.length > 0) {
      result = result.filter((p) => selectedSuppliers.includes(p.supplier_id));
    }

    // Rating filter
    if (minRating > 0) {
      result = result.filter((p) => (p.rating || 0) >= minRating);
    }

    // Price filter
    if (minPrice) {
      const min = parseFloat(minPrice);
      result = result.filter((p) => (p.unit_price || 0) >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      result = result.filter((p) => (p.unit_price || 0) <= max);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      result = result.filter((p) =>
        selectedTags.some((tag) => p.tags?.includes(tag))
      );
    }

    // Shortlist filter
    if (onlyShortlist) {
      result = result.filter((p) => p.is_shortlisted);
    }

    return result;
  }, [
    products,
    searchTerm,
    selectedSuppliers,
    minRating,
    minPrice,
    maxPrice,
    selectedTags,
    onlyShortlist,
    suppliers,
  ]);

  // Get all unique tags from products
  const allTags = useMemo(() => {
    const tags = new Set();
    products.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  if (loading) {
    return (
      <PageWrapper className="bg-[#0f1117]">
        <Header
          title="Explorar"
          leftAction={{
            icon: ChevronLeft,
            onClick: () => navigate(`/events/${eventId}`),
          }}
        />
        <div className="flex items-center justify-center py-16 text-[#c9d1d9]">
          Carregando produtos...
        </div>
        <BottomNav eventId={eventId} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-[#0f1117]">
      <Header
        title="Explorar"
        leftAction={{
          icon: ChevronLeft,
          onClick: () => navigate(`/events/${eventId}`),
        }}
        className="border-b border-[#30363d]"
      />

      <div className="space-y-4 pb-24">
        {/* Search Bar */}
        <div className="px-4 pt-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar produtos, SKU, tags..."
          />
        </div>

        {/* Filters Toggle */}
        <div className="px-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-[#1a1d27] border border-[#30363d] text-[#c9d1d9] hover:bg-[#242836] transition"
          >
            <span className="text-sm font-medium">Filtros</span>
            {showFilters ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="space-y-4 px-4 pb-4 border-b border-[#30363d]">
            {/* Supplier Filter */}
            {suppliers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2">
                  Fornecedor
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {suppliers.map((supplier) => (
                    <label
                      key={supplier.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(supplier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSuppliers([
                              ...selectedSuppliers,
                              supplier.id,
                            ]);
                          } else {
                            setSelectedSuppliers(
                              selectedSuppliers.filter((id) => id !== supplier.id)
                            );
                          }
                        }}
                        className="rounded border-[#30363d] bg-[#1a1d27]"
                      />
                      <span className="text-sm text-[#c9d1d9]">
                        {supplier.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Rating Filter */}
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] mb-2">
                Avaliação Mínima
              </label>
              <div className="flex gap-2 flex-wrap">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setMinRating(minRating === option.value ? 0 : option.value)
                    }
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      minRating === option.value
                        ? 'bg-[#f59e0b] text-gray-900 font-semibold'
                        : 'bg-[#1a1d27] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] mb-2">
                Faixa de Preço
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mín."
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Máx."
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#8b949e] mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(
                            selectedTags.filter((t) => t !== tag)
                          );
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        selectedTags.includes(tag)
                          ? 'bg-[#f59e0b] text-gray-900 font-semibold'
                          : 'bg-[#1a1d27] text-[#c9d1d9] border border-[#30363d]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shortlist Filter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyShortlist}
                onChange={(e) => setOnlyShortlist(e.target.checked)}
                className="rounded border-[#30363d] bg-[#1a1d27]"
              />
              <span className="text-sm text-[#c9d1d9]">Apenas shortlist</span>
            </label>
          </div>
        )}

        {/* View Toggle and Results Count */}
        <div className="px-4 flex items-center justify-between">
          <div className="text-sm text-[#8b949e]">
            {filteredProducts.length} produtos encontrados
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition ${
                viewMode === 'list'
                  ? 'bg-[#f59e0b] text-gray-900'
                  : 'bg-[#1a1d27] text-[#c9d1d9] border border-[#30363d]'
              }`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition ${
                viewMode === 'grid'
                  ? 'bg-[#f59e0b] text-gray-900'
                  : 'bg-[#1a1d27] text-[#c9d1d9] border border-[#30363d]'
              }`}
            >
              <Grid3X3 size={18} />
            </button>
          </div>
        </div>

        {/* Results */}
        {filteredProducts.length === 0 ? (
          <div className="px-4">
            <EmptyState
              title="Nenhum produto encontrado"
              description="Tente ajustar seus filtros de busca"
            />
          </div>
        ) : (
          <>
            {/* List View */}
            {viewMode === 'list' && (
              <div className="px-4 space-y-3">
                {filteredProducts.map((product) => {
                  const supplier = suppliers.find(
                    (s) => s.id === product.supplier_id
                  );
                  return (
                    <button
                      key={product.id}
                      onClick={() =>
                        navigate(
                          `/events/${eventId}/products/${product.id}`
                        )
                      }
                      className="w-full flex gap-3 p-3 rounded-lg bg-[#1a1d27] border border-[#30363d] hover:border-[#f59e0b] transition text-left"
                    >
                      {/* Photo */}
                      {product.photos?.[0] ? (
                        <img
                          src={product.photos[0]}
                          alt={product.name}
                          className="w-16 h-16 rounded object-cover flex-shrink-0 bg-[#242836]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-[#242836] flex-shrink-0 flex items-center justify-center text-[#8b949e] text-xs">
                          Sem foto
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#c9d1d9] truncate">
                          {product.name}
                        </h3>
                        <p className="text-sm text-[#8b949e] truncate">
                          {supplier?.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-[#f59e0b] font-semibold">
                            {formatPrice(
                              product.unit_price,
                              product.price_currency
                            )}
                          </div>
                          {product.rating > 0 && (
                            <StarRating
                              value={product.rating}
                              readOnly
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="px-4 grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => {
                  const supplier = suppliers.find(
                    (s) => s.id === product.supplier_id
                  );
                  return (
                    <button
                      key={product.id}
                      onClick={() =>
                        navigate(
                          `/events/${eventId}/products/${product.id}`
                        )
                      }
                      className="flex flex-col p-3 rounded-lg bg-[#1a1d27] border border-[#30363d] hover:border-[#f59e0b] transition text-left"
                    >
                      {/* Photo */}
                      {product.photos?.[0] ? (
                        <img
                          src={product.photos[0]}
                          alt={product.name}
                          className="w-full h-32 rounded object-cover mb-2 bg-[#242836]"
                        />
                      ) : (
                        <div className="w-full h-32 rounded bg-[#242836] mb-2 flex items-center justify-center text-[#8b949e] text-xs">
                          Sem foto
                        </div>
                      )}

                      {/* Info */}
                      <h3 className="font-semibold text-[#c9d1d9] text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-[#8b949e] line-clamp-1 mb-2">
                        {supplier?.name}
                      </p>
                      <div className="mt-auto">
                        <div className="text-[#f59e0b] font-semibold text-sm">
                          {formatPrice(
                            product.unit_price,
                            product.price_currency
                          )}
                        </div>
                        {product.rating > 0 && (
                          <div className="mt-1">
                            <StarRating
                              value={product.rating}
                              readOnly
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav eventId={eventId} />
    </PageWrapper>
  );
}
