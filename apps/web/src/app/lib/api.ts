import axios from 'axios';

export const TOKEN_KEY = 'medicano_token';
export const USER_KEY = 'medicano_user';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* localStorage indisponível (ex.: modo privado) */ }
}

export function getStoredUser<T = unknown>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function setStoredUser(user: unknown | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch { /* localStorage indisponível (ex.: modo privado) */ }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

let isRedirecting = false;
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && !isRedirecting && typeof window !== 'undefined') {
      isRedirecting = true;
      setToken(null);
      setStoredUser(null);
      if (window.location.pathname !== '/login') window.location.href = '/login';
      setTimeout(() => { isRedirecting = false; }, 1000);
    }
    return Promise.reject(error);
  }
);

// Consumes the SSE stream from the Vercel AI SDK (toDataStreamResponse format)
// Text delta lines look like: data: 0:"chunk"
export function streamChatMessage(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onDone?: () => void,
  onError?: (err: unknown) => void,
): { cancel: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${baseURL}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ content: message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          // AI SDK data stream format: 0:"chunk text"
          if (line.startsWith('0:')) {
            try {
              const text: string = JSON.parse(line.slice(2));
              onChunk(text);
            } catch { /* ignore malformed */ }
          }
        }
      }

      onDone?.();
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') onError?.(err);
    }
  })();

  return { cancel: () => controller.abort() };
}
