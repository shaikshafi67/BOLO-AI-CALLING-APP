import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CallSettings } from '../types';

const STORAGE_KEY = 'boloai-call-settings';

export const defaultCallSettings: CallSettings = {
  myLanguage: 'hi',
  targetLanguage: 'en',
  voiceTranslation: true,
  liveCaptions: true,
  autoDetectLanguage: false,
  micEnabled: true,
  cameraEnabled: true,
  speakerEnabled: true,
};

interface CallSettingsContextValue {
  settings: CallSettings;
  update: (changes: Partial<CallSettings>) => void;
  reset: () => void;
}

const CallSettingsContext = createContext<CallSettingsContextValue | null>(null);

function load(): CallSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultCallSettings, ...(JSON.parse(raw) as Partial<CallSettings>) };
  } catch {
    /* ignore */
  }
  return defaultCallSettings;
}

export function CallSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CallSettings>(load);

  const update = useCallback((changes: Partial<CallSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...changes };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => update(defaultCallSettings), [update]);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <CallSettingsContext.Provider value={value}>{children}</CallSettingsContext.Provider>;
}

export function useCallSettings(): CallSettingsContextValue {
  const ctx = useContext(CallSettingsContext);
  if (!ctx) throw new Error('useCallSettings must be used inside CallSettingsProvider');
  return ctx;
}
