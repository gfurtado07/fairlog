import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncAll } from '../lib/sync';
import { getPendingCount } from '../lib/db';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState('online');
  const [pendingCount, setPendingCount] = useState(0);

  // Poll pending count every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch (error) {
        console.error('Error getting pending count:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('syncing');
      try {
        await syncAll();
        setSyncStatus('online');
        // Reset pending count after sync
        const count = await getPendingCount();
        setPendingCount(count);
      } catch (error) {
        console.error('Error syncing:', error);
        setSyncStatus('online'); // Still consider it online even if sync had issues
      }
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    // Set initial status
    setSyncStatus(navigator.onLine ? 'online' : 'offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    setSyncStatus('syncing');
    try {
      await syncAll();
      setSyncStatus('online');
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error syncing:', error);
      setSyncStatus('online');
      throw error;
    }
  };

  const value = {
    syncStatus,
    pendingCount,
    triggerSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
