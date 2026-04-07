import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  Star,
  Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useSaveWithSync } from '../hooks/useOfflineSync';
import { useRealtime } from '../hooks/useRealtime';

import Header from '../components/layout/Header';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Select from '../components/ui/Select';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { formatDate, formatPrice } from '../lib/utils';

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

export default function ProductDetailPage() {
  const { eventId, productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const saveWithSync = useSaveWithSync('product_comments');

  // State
  const [product, setProduct] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shortlistStatus, setShortlistStatus] = useState(null);
  const [isInShortlist, setIsInShortlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load product, supplier, and comments
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load product
        const productData = await db.products.get(productId);
        if (productData) {
          setProduct(productData);

          // Load supplier
          if (productData.supplier_id) {
            const supplierData = await db.suppliers.get(productData.supplier_id);
            if (supplierData) {
              setSupplier(supplierData);
            }
          }
        }

        // Load comments with real-time updates
        const commentsData = await db.product_comments
          .where('product_id')
          .equals(productId)
          .toArray();
        setComments(commentsData || []);

        // Check shortlist status
        if (user?.id) {
          const shortlistData = await db.shortlist
            .where('product_id')
            .equals(productId)
            .first();
          if (shortlistData) {
            setIsInShortlist(true);
            setShortlistStatus(shortlistData.status || 'new');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar dados do produto');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      loadData();
    }
  }, [productId, user?.id]);

  // Real-time comments subscription
  useRealtime(
    'product_comments',
    'product_id',
    productId,
    (newCommentData) => {
      setComments(prev => {
        const exists = prev.find(c => c.id === newCommentData.id);
        if (exists) return prev.map(c => (c.id === newCommentData.id ? newCommentData : c));
        return [newCommentData, ...prev];
      });
    },
    null,
    (deletedComment) => {
      setComments(prev => prev.filter(c => c.id !== deletedComment.id));
    }
  );

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Comentário não pode estar vazio');
      return;
    }

    setIsSubmittingComment(true);

    try {
      const commentPayload = {
        product_id: productId,
        event_id: eventId,
        user_id: user?.id,
        user_name: user?.name || user?.email,
        user_avatar: user?.avatar_url,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      };

      await saveWithSync(commentPayload);

      setNewComment('');
      toast.success('Comentário adicionado');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleShortlist = async () => {
    if (!user?.id) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      if (isInShortlist) {
        // Remove from shortlist
        await db.shortlist.where('product_id').equals(productId).delete();
        setIsInShortlist(false);
        setShortlistStatus(null);
        toast.success('Removido da shortlist');
      } else {
        // Add to shortlist
        const shortlistItem = {
          id: `${user.id}_${productId}`,
          user_id: user.id,
          event_id: eventId,
          product_id: productId,
          supplier_id: product?.supplier_id,
          status: 'new',
          created_at: new Date().toISOString(),
        };

        await db.shortlist.put(shortlistItem);
        setIsInShortlist(true);
        setShortlistStatus('new');
        toast.success('Adicionado à shortlist');
      }
    } catch (error) {
      console.error('Error toggling shortlist:', error);
      toast.error('Erro ao atualizar shortlist');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!isInShortlist) return;

    try {
      const shortlistItem = await db.shortlist
        .where('product_id')
        .equals(productId)
        .first();

      if (shortlistItem) {
        await db.shortlist.update(shortlistItem.id, { status: newStatus });
        setShortlistStatus(newStatus);
        toast.success('Status atualizado');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handlePreviousPhoto = () => {
    setPhotoIndex(prev =>
      prev === 0 ? (product?.photos?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextPhoto = () => {
    setPhotoIndex(prev =>
      prev === (product?.photos?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  if (isLoading) {
    return (
      <PageWrapper className="bg-[#0f1117] flex items-center justify-center">
        <div className="text-[#c9d1d9]">Carregando...</div>
      </PageWrapper>
    );
  }

  if (!product) {
    return (
      <PageWrapper className="bg-[#0f1117]">
        <Header
          title="Produto não encontrado"
          leftAction={{
            icon: ChevronLeft,
            onClick: () => navigate(-1),
          }}
        />
        <div className="p-4 text-center text-[#c9d1d9]">
          O produto solicitado não foi encontrado.
        </div>
      </PageWrapper>
    );
  }

  const photos = product.photos || [];
  const currentPhoto = photos[photoIndex] || null;

  return (
    <PageWrapper className="bg-[#0f1117]">
      <Header
        title={product.name}
        subtitle={supplier?.name}
        leftAction={{
          icon: ChevronLeft,
          onClick: () => navigate(-1),
        }}
        rightAction={{
          icon: Edit2,
          onClick: () =>
            navigate(
              `/events/${eventId}/products/${productId}/edit`
            ),
        }}
        className="border-b border-[#30363d]"
      />

      <div className="space-y-6 pb-8">
        {/* Photo Carousel */}
        {photos.length > 0 && (
          <section className="relative h-96 w-full bg-[#1a1d27]">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={`${product.name} - foto ${photoIndex + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#242836] text-[#c9d1d9]">
                Sem foto
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePreviousPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPhotoIndex(idx)}
                      className={`h-2 w-2 rounded-full transition ${
                        idx === photoIndex ? 'bg-[#f59e0b]' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Product Info Section */}
        <section className="space-y-4 px-4">
          {/* Price */}
          <div className="rounded-lg bg-[#1a1d27] p-4">
            <div className="text-3xl font-bold text-[#f59e0b]">
              {formatPrice(product.unit_price, product.price_currency)}
            </div>
            {product.price_fob && (
              <div className="mt-2 text-sm text-[#8b949e]">
                FOB: {formatPrice(product.price_fob, product.price_currency)}
              </div>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {product.moq && (
              <div className="rounded bg-[#1a1d27] p-3">
                <div className="text-xs text-[#8b949e]">MOQ</div>
                <div className="text-lg font-semibold text-[#c9d1d9]">
                  {product.moq}
                </div>
              </div>
            )}
            {product.lead_time && (
              <div className="rounded bg-[#1a1d27] p-3">
                <div className="text-xs text-[#8b949e]">Prazo</div>
                <div className="text-lg font-semibold text-[#c9d1d9]">
                  {product.lead_time}
                </div>
              </div>
            )}
            {product.sku && (
              <div className="rounded bg-[#1a1d27] p-3">
                <div className="text-xs text-[#8b949e]">SKU</div>
                <div className="text-sm font-semibold text-[#c9d1d9]">
                  {product.sku}
                </div>
              </div>
            )}
            {supplier?.stand_number && (
              <div className="rounded bg-[#1a1d27] p-3">
                <div className="text-xs text-[#8b949e]">Stand</div>
                <div className="text-lg font-semibold text-[#c9d1d9]">
                  {supplier.stand_number}
                </div>
              </div>
            )}
          </div>

          {/* Supplier Link */}
          {supplier && (
            <button
              onClick={() =>
                navigate(
                  `/events/${eventId}/suppliers/${product.supplier_id}`
                )
              }
              className="text-sm text-[#f59e0b] transition hover:text-[#fbbf24]"
            >
              Ver fornecedor: {supplier.name}
            </button>
          )}

          {/* Rating */}
          {product.rating > 0 && (
            <div className="rounded bg-[#1a1d27] p-3">
              <div className="text-xs text-[#8b949e] mb-2">Avaliação</div>
              <StarRating value={product.rating} readOnly size="md" />
            </div>
          )}
        </section>

        {/* Shortlist Section */}
        <section className="border-t border-[#30363d] px-4 py-4">
          <div className="space-y-3">
            {isInShortlist && shortlistStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8b949e]">Status:</span>
                <Badge
                  className={`${STATUS_COLORS[shortlistStatus]} border`}
                  label={STATUS_LABELS[shortlistStatus]}
                />
              </div>
            )}

            <Button
              onClick={handleToggleShortlist}
              variant={isInShortlist ? 'secondary' : 'primary'}
              className="w-full"
            >
              {isInShortlist ? 'Remover da Shortlist' : 'Adicionar à Shortlist'}
            </Button>

            {isInShortlist && (
              <Select
                value={shortlistStatus || 'new'}
                onChange={handleStatusChange}
                options={SHORTLIST_STATUS_OPTIONS}
              />
            )}
          </div>
        </section>

        {/* Tags Section */}
        {product.tags && product.tags.length > 0 && (
          <section className="border-t border-[#30363d] px-4 py-4">
            <div className="text-sm font-semibold text-[#c9d1d9] mb-3">
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {product.tags.map(tag => (
                <Badge key={tag} label={tag} variant="secondary" />
              ))}
            </div>
          </section>
        )}

        {/* Details Section */}
        {(product.payment_terms ||
          product.variations ||
          product.dimensions ||
          product.weight) && (
          <section className="border-t border-[#30363d] px-4 py-4">
            <div className="space-y-4">
              {product.payment_terms && (
                <div>
                  <div className="text-sm font-semibold text-[#8b949e] mb-1">
                    Condições de Pagamento
                  </div>
                  <div className="text-[#c9d1d9]">{product.payment_terms}</div>
                </div>
              )}

              {product.variations && (
                <div>
                  <div className="text-sm font-semibold text-[#8b949e] mb-1">
                    Variações Disponíveis
                  </div>
                  <div className="text-[#c9d1d9] whitespace-pre-wrap">
                    {product.variations}
                  </div>
                </div>
              )}

              {product.dimensions && (
                <div>
                  <div className="text-sm font-semibold text-[#8b949e] mb-1">
                    Dimensões
                  </div>
                  <div className="text-[#c9d1d9]">{product.dimensions}</div>
                </div>
              )}

              {product.weight && (
                <div>
                  <div className="text-sm font-semibold text-[#8b949e] mb-1">
                    Peso
                  </div>
                  <div className="text-[#c9d1d9]">{product.weight}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notes Section */}
        {product.notes && (
          <section className="border-t border-[#30363d] px-4 py-4">
            <div className="text-sm font-semibold text-[#8b949e] mb-2">
              Observações
            </div>
            <div className="text-[#c9d1d9] whitespace-pre-wrap">
              {product.notes}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="border-t border-[#30363d] px-4 py-4">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle size={18} className="text-[#f59e0b]" />
            <h3 className="text-sm font-semibold text-[#c9d1d9]">
              Comentários ({comments.length})
            </h3>
          </div>

          {/* Comments List */}
          <div className="mb-4 space-y-3 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center text-sm text-[#8b949e] py-4">
                Nenhum comentário ainda
              </div>
            ) : (
              comments.map(comment => (
                <div
                  key={comment.id}
                  className="rounded bg-[#1a1d27] p-3 border border-[#30363d]"
                >
                  <div className="flex items-start gap-2 mb-2">
                    {comment.user_avatar ? (
                      <img
                        src={comment.user_avatar}
                        alt={comment.user_name}
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-[#242836] flex items-center justify-center text-xs text-[#8b949e]">
                        {comment.user_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#c9d1d9]">
                        {comment.user_name}
                      </div>
                      <div className="text-xs text-[#8b949e]">
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-[#c9d1d9] whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          {user && (
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                onKeyPress={e =>
                  e.key === 'Enter' && !isSubmittingComment && handleAddComment()
                }
                disabled={isSubmittingComment}
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmittingComment || !newComment.trim()}
                variant="primary"
                size="sm"
                className="px-3"
              >
                <Send size={16} />
              </Button>
            </div>
          )}
        </section>

        {/* Info Footer */}
        <section className="border-t border-[#30363d] px-4 py-4 text-xs text-[#8b949e]">
          {product.created_by && product.created_at && (
            <>
              Cadastrado por {product.created_by} em{' '}
              {formatDate(product.created_at)}
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
