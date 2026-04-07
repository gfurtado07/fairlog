import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtime = (
  table,
  filterColumn,
  filterValue,
  onInsert,
  onUpdate,
  onDelete
) => {
  const subscriptionRef = useRef(null);

  useEffect(() => {
    // Only subscribe if online
    if (!navigator.onLine) {
      return;
    }

    const channel = supabase
      .channel(`${table}-${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          onInsert?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          onUpdate?.(payload.new, payload.old);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          onDelete?.(payload.old);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [table, filterColumn, filterValue, onInsert, onUpdate, onDelete]);
};
