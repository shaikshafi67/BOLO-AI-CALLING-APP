// Central place for service configuration. Values come from Vite env vars
// (see web/.env.example); the defaults point at the local BoloAI backend.

export const serviceConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  signalingUrl: import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:4000',
};
