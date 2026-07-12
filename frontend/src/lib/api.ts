import axios from 'axios';

const backend = (import.meta.env.VITE_BACKEND_URL as string) || (import.meta.env.REACT_APP_BACKEND_URL as string) || '';

export const api = axios.create({
  baseURL: `${backend}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = localStorage.getItem('ff_access_token');

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  if (token) localStorage.setItem('ff_access_token', token);
  else localStorage.removeItem('ff_access_token');
};

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshInFlight: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      if (!refreshInFlight) {
        refreshInFlight = api
          .post('/auth/refresh')
          .then((r) => {
            const t = (r.data.accessToken ?? r.data.access_token) as string | undefined;
            if (t) setAccessToken(t);
            return t ?? null;
          })
          .catch(() => null)
          .finally(() => {
            refreshInFlight = null;
          });
      }
      const newToken = await refreshInFlight;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export const BACKEND_URL = backend;
