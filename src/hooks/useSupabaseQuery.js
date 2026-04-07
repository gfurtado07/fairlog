import { useState, useEffect } from 'react';
import { db } from '../lib/db';

export const useSupabaseQuery = (queryFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);

      // Cache in Dexie for offline access
      // Use a simple cache table with query hash as key
      const queryHash = queryFn.toString();
      await db.query_cache.put({
        key: queryHash,
        data: result,
        cached_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err);

      // Try to get cached data from Dexie
      try {
        const queryHash = queryFn.toString();
        const cached = await db.query_cache.get(queryHash);
        if (cached) {
          setData(cached.data);
          setError(null); // Clear error if we have cached data
        }
      } catch (cacheErr) {
        console.error('Error getting cached data:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, deps);

  return {
    data,
    loading,
    error,
    refetch,
  };
};
