import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Tags,
  AlertTriangle,
  X,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { useSync } from '../context/SyncContext';

import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { formatDate } from '../lib/utils';

export default function SettingsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useSync();

  // Form state
  const [event, setEvent] = useState(null);
  const [eventName, setEventName] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Tags state
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deleteStep, setDeleteStep] = useState(1); // 1 or 2 (confirmation)

  const [loading, setLoading] = useState(true);

  // Load event and members
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load event
        let eventData = await db.events.get(eventId);
        if (!eventData && isOnline) {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

          if (error) throw error;
          eventData = data;
          if (eventData) {
            await db.events.put(eventData);
          }
        }

        if (eventData) {
          setEvent(eventData);
          setEventName(eventData.name || '');
          setLocation(eventData.location || '');
          setCountry(eventData.country || '');
          setCurrency(eventData.currency || 'USD');
          setStartDate(eventData.start_date?.split('T')[0] || '');
          setEndDate(eventData.end_date?.split('T')[0] || '');
        }

        // Load members
        let membersData = await db.event_members
          .where('event_id')
          .equals(eventId)
          .toArray();

        if (!membersData || membersData.length === 0) {
          if (isOnline) {
            const { data, error } = await supabase
              .from('event_members')
              .select('*')
              .eq('event_id', eventId);

            if (error) throw error;
            membersData = data || [];

            // Cache in Dexie
            for (const member of membersData) {
              await db.event_members.put(member);
            }
          }
        }

        setMembers(membersData || []);

        // Load tags
        let tagsData = await db.event_tags
          .where('event_id')
          .equals(eventId)
          .toArray();

        if (!tagsData || tagsData.length === 0) {
          if (isOnline) {
            const { data, error } = await supabase
              .from('event_tags')
              .select('*')
              .eq('event_id', eventId);

            if (error) throw error;
            tagsData = data || [];

            // Cache in Dexie
            for (const tag of tagsData) {
              await db.event_tags.put(tag);
            }
          }
        }

        const tagNames = (tagsData || []).map((t) => t.name).filter(Boolean);
        setTags(tagNames);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadData();
    }
  }, [eventId, isOnline]);

  const handleSaveEvent = async () => {
    if (!eventName.trim()) {
      toast.error('Nome do evento é obrigatório');
      return;
    }

    try {
      setIsSavingEvent(true);

      const updates = {
        name: eventName,
        location: location || null,
        country: country || null,
        currency: currency || 'USD',
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      // Update in Dexie
      if (event) {
        await db.events.update(eventId, updates);
        setEvent((prev) => ({ ...prev, ...updates }));
      }

      // Sync to Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', eventId);

        if (error) throw error;
      }

      toast.success('Evento atualizado');
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erro ao salvar evento');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    try {
      setIsInviting(true);

      const newMember = {
        id: `${eventId}_${inviteEmail}`,
        event_id: eventId,
        invited_email: inviteEmail.trim(),
        role: 'member',
        created_at: new Date().toISOString(),
      };

      // Save in Dexie
      await db.event_members.put(newMember);
      setMembers((prev) => [...prev, newMember]);

      // Sync to Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('event_members')
          .insert([newMember]);

        if (error && error.code !== '23505') {
          // 23505 is unique violation, which is okay if the member already exists
          throw error;
        }
      }

      setInviteEmail('');
      toast.success(`Convite enviado para ${inviteEmail}`);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Erro ao enviar convite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      toast.error('Tag não pode estar vazia');
      return;
    }

    if (tags.includes(newTag.trim())) {
      toast.error('Esta tag já existe');
      return;
    }

    try {
      setIsAddingTag(true);

      const tag = {
        id: `${eventId}_${newTag.trim()}`,
        event_id: eventId,
        name: newTag.trim(),
        created_at: new Date().toISOString(),
      };

      // Save in Dexie
      await db.event_tags.put(tag);
      setTags((prev) => [...prev, newTag.trim()].sort());

      // Sync to Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('event_tags')
          .insert([tag]);

        if (error && error.code !== '23505') {
          throw error;
        }
      }

      setNewTag('');
      toast.success('Tag adicionada');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Erro ao adicionar tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    try {
      const tagId = `${eventId}_${tagToRemove}`;

      // Delete from Dexie
      await db.event_tags.delete(tagId);
      setTags((prev) => prev.filter((t) => t !== tagToRemove));

      // Sync to Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('event_tags')
          .delete()
          .eq('id', tagId);

        if (error) throw error;
      }

      toast.success('Tag removida');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Erro ao remover tag');
    }
  };

  const handleDeleteEvent = async () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }

    // Verify confirmation text
    if (confirmDeleteText !== eventName) {
      toast.error('Nome do evento não coincide');
      return;
    }

    try {
      // Delete event and all related data
      // In a real app, this would be a cascade delete on the backend

      // Delete from Dexie
      await db.events.delete(eventId);
      await db.suppliers.where('event_id').equals(eventId).delete();
      await db.products.where('event_id').equals(eventId).delete();
      await db.product_comments.where('event_id').equals(eventId).delete();
      await db.event_members.where('event_id').equals(eventId).delete();
      await db.event_tags.where('event_id').equals(eventId).delete();
      await db.shortlist.where('event_id').equals(eventId).delete();

      // Delete from Supabase if online
      if (isOnline) {
        // Cascade deletes should be handled by Supabase policies
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);

        if (error) throw error;
      }

      toast.success('Evento excluído');
      navigate('/');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento');
      setDeleteStep(1);
      setConfirmDeleteText('');
    }
  };

  if (loading) {
    return (
      <PageWrapper className="bg-[#0f1117]">
        <Header
          title="Configurações"
          leftAction={{
            icon: ChevronLeft,
            onClick: () => navigate(`/events/${eventId}`),
          }}
        />
        <div className="flex items-center justify-center py-16 text-[#c9d1d9]">
          Carregando...
        </div>
        <BottomNav eventId={eventId} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-[#0f1117]">
      <Header
        title="Configurações"
        leftAction={{
          icon: ChevronLeft,
          onClick: () => navigate(`/events/${eventId}`),
        }}
        className="border-b border-[#30363d]"
      />

      <div className="space-y-6 p-4 pb-24">
        {/* Event Info Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#c9d1d9]">
            Informações do Evento
          </h2>

          <Input
            label="Nome"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Nome do evento"
          />

          <Input
            label="Local"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Local do evento"
          />

          <Input
            label="País"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="País"
          />

          <Input
            label="Moeda"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
          />

          <Input
            label="Data Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="Data Fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <Button
            onClick={handleSaveEvent}
            disabled={isSavingEvent}
            loading={isSavingEvent}
            className="w-full"
          >
            Salvar Alterações
          </Button>
        </div>

        {/* Members Section */}
        <div className="border-t border-[#30363d] pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#f59e0b]" />
            <h2 className="text-lg font-semibold text-[#c9d1d9]">Membros</h2>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-[#8b949e]">Nenhum membro convidado</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1a1d27] border border-[#30363d]"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[#242836] flex items-center justify-center text-[#c9d1d9] font-semibold text-sm">
                      {(member.invited_email || member.user_id || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[#c9d1d9]">
                        {member.invited_email || member.user_id}
                      </p>
                      {member.invited_email && (
                        <p className="text-xs text-[#8b949e]">Convite pendente</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      label={member.role === 'admin' ? 'Admin' : 'Membro'}
                      variant={
                        member.role === 'admin' ? 'primary' : 'secondary'
                      }
                    />
                    {user?.id === member.user_id && (
                      <Badge label="(você)" variant="ghost" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Invite Section */}
          <div className="space-y-2 pt-2 border-t border-[#30363d]">
            <p className="text-sm font-medium text-[#c9d1d9]">
              Convidar Membro
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="flex-1"
              />
              <Button
                onClick={handleInviteMember}
                disabled={isInviting}
                loading={isInviting}
                size="sm"
              >
                Convidar
              </Button>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="border-t border-[#30363d] pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Tags size={20} className="text-[#f59e0b]" />
            <h2 className="text-lg font-semibold text-[#c9d1d9]">
              Tags Padrão
            </h2>
          </div>

          {/* Tags List */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1d27] border border-[#30363d]"
              >
                <span className="text-sm text-[#c9d1d9]">{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[#8b949e] hover:text-[#c9d1d9] transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Tag */}
          <div className="flex gap-2 pt-2 border-t border-[#30363d]">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nova tag..."
              className="flex-1"
            />
            <Button
              onClick={handleAddTag}
              disabled={isAddingTag}
              loading={isAddingTag}
              size="sm"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-red-900/30 pt-6 rounded-lg bg-red-950/20 border border-red-900/50 p-4 space-y-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Zona de Perigo</h3>
              <p className="text-sm text-red-300/80">
                Esta ação é irreversível
              </p>
            </div>
          </div>

          <Button
            variant="danger"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteStep(1);
              setConfirmDeleteText('');
            }}
            className="w-full"
          >
            Excluir Evento
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteStep(1);
          setConfirmDeleteText('');
        }}
        title={deleteStep === 1 ? 'Excluir Evento' : 'Confirmar Exclusão'}
      >
        {deleteStep === 1 ? (
          <div className="space-y-4">
            <p className="text-[#c9d1d9]">
              Tem certeza? Todos os dados serão perdidos permanentemente.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteEvent}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[#c9d1d9]">
              Digite o nome do evento para confirmar:
            </p>
            <Input
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder={eventName}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteStep(1);
                  setConfirmDeleteText('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteEvent}
                disabled={confirmDeleteText !== eventName}
                className="flex-1"
              >
                Excluir Permanentemente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <BottomNav eventId={eventId} />
    </PageWrapper>
  );
}
