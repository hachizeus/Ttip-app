import { useState, useEffect, useCallback, useMemo } from 'react';
import { NetworkManager } from '../lib/network-manager';
import { OfflineStorage } from '../lib/offline-storage';

interface UseOptimizedDataOptions<T> {
  key: string;
  fetchFn: () => Promise<T>;
  fallbackData?: T;
  cacheTime?: number;
}

export function useOptimizedData<T>({
  key,
  fetchFn,
  fallbackData,
  cacheTime = 5 * 60 * 1000 // 5 minutes default
}: UseOptimizedDataOptions<T>) {
  const [data, setData] = useState<T | undefined>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(NetworkManager.getIsOnline());

  // Memoized cache key
  const cacheKey = useMemo(() => `cache_${key}`, [key]);

  // Network status listener
  useEffect(() => {
    const unsubscribe = NetworkManager.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  // Load data with offline fallback
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await NetworkManager.makeRequest(
        fetchFn,
        async () => {
          // Offline fallback
          const offlineData = await OfflineStorage.getUserData();
          return offlineData?.[key] || fallbackData;
        }
      );

      if (result) {
        setData(result);
        
        // Cache data if online
        if (isOnline) {
          await OfflineStorage.storeUserData({ [key]: result });
        }
      }
    } catch (err) {
      setError(err as Error);
      
      // Try to load from cache on error
      try {
        const cachedData = await OfflineStorage.getUserData();
        if (cachedData?.[key]) {
          setData(cachedData[key]);
        }
      } catch (cacheError) {
        console.error('Failed to load cached data:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, key, fallbackData, isOnline]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Retry function
  const retry = useCallback(() => {
    loadData();
  }, [loadData]);

  // Memoized return value
  return useMemo(() => ({
    data,
    loading,
    error,
    retry,
    isOnline
  }), [data, loading, error, retry, isOnline]);
}