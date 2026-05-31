import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T = any>(url: string | null, deps: any[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!url) { setLoading(false); setData(null); return; }
    setLoading(true);
    setError(null);
    api.get(url)
      .then((res) => { if (mountedRef.current) setData(res.data as T); })
      .catch((err) => {
        if (!mountedRef.current) return;
        const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar dados';
        setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
      })
      .finally(() => { if (mountedRef.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);

  return { data, loading, error, refetch: () => setNonce((n) => n + 1) };
}

export function useAsyncAction(onSuccess?: () => void) {
  const [isMutating, setIsMutating] = useState(false);

  async function trigger(action: () => Promise<void>) {
    setIsMutating(true);
    try {
      await action();
      onSuccess?.();
    } finally {
      setIsMutating(false);
    }
  }

  return { trigger, isMutating };
}

export function extractList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  return [];
}
