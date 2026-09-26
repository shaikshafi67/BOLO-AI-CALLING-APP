// Central place for service configuration. Values come from Vite env vars
// (see web/.env.example) so the backend can be connected without code changes.

export const serviceConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  signalingUrl: import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:4000',
  /** true while services return mock data. Flip once real integrations land. */
  useMocks: true,
};

/** Simulates network latency for mock responses. */
export function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
