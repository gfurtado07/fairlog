import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

// Hook principal para salvar/atualizar/deletar com suporte offline
export const useSaveWithSync = (table) => {
  const [isSaving, setIsSaving] = useState(false);

  const isOnline = navigator.onLine;

  const save = async (id, record) => {
    setIsSaving(true);
    try {
      // Se id é null, é um CREATE
      if (id === null) {
        if (isOnline) {
          const { data, error } = await supabase
            .from(table)
            .insert([record])
            .select()
            .single();

          if (error) throw error;

          await db[table].put({ ...data, sync_status: 'synced' });
          return data;
        } else {
          const newId = record.id || crypto.randomUUID();
          const recordWithId = { ...record, id: newId, sync_status: 'pending' };
          await db[table].put(recordWithId);
          await db.sync_queue.add({
            table,
            action: 'create',
            record_id: newId,
            created_at: new Date().toISOString(),
          });
          return recordWithId;
        }
      } else {
        // É um UPDATE
        return await update(id, record);
      }
    } catch (error) {
      console.error('Error in save:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id, changes) => {
    setIsSaving(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from(table)
          .update(changes)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        await db[table].update(id, { ...changes, sync_status: 'synced' });
        return data;
      } else {
        await db[table].update(id, { ...changes, sync_status: 'pending' });
        await db.sync_queue.add({
          table,
          action: 'update',
          record_id: id,
          created_at: new Date().toISOString(),
        });
        return await db[table].get(id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    setIsSaving(true);
    try {
      if (isOnline) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        await db[table].delete(id);
      } else {
        await db[table].update(id, { sync_status: 'pending', _deleted: true });
        await db.sync_queue.add({
          table,
          action: 'delete',
          record_id: id,
          created_at: new Date().toISOString(),
        });
      }
      return { success: true };
    } finally {
      setIsSaving(false);
    }
  };

  return { save, update, remove, isSaving };
};

// Hook auxiliar com getLocalData / saveLocal para compatibilidade
export const useOfflineSync = () => {
  const getLocalData = async (table, id) => {
    try {
      if (!db[table]) return null;
      return await db[table].get(id) || null;
    } catch {
      return null;
    }
  };

  const saveLocal = async (table, key, data) => {
    try {
      if (!db[table]) return;
      await db[table].put({ ...data, id: key, sync_status: 'synced' });
    } catch (error) {
      console.error('useOfflineSync.saveLocal error:', error);
    }
  };

  return { getLocalData, saveLocal };
};
