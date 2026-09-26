import { useEffect, useState } from 'react';
import type { Translation, TranslationStatus } from '../types';
import { translationService } from '../services/translationService';

interface Options {
  /** Only run while the call is connected. */
  active: boolean;
  /** User toggled translation on. */
  enabled: boolean;
  /** Presenter forced the "service unavailable" state. */
  forceUnavailable: boolean;
}

/**
 * Drives the scripted demo conversation so the panel can show its
 * processing → completed states. Replace with a subscription to the real
 * translation stream (see translationService TODOs) when the backend exists.
 */
export function useDemoTranslation({ active, enabled, forceUnavailable }: Options) {
  const [entries, setEntries] = useState<Translation[]>(() => translationService.getDemoTranscript());
  const [current, setCurrent] = useState<Translation | undefined>(() => entries[entries.length - 1]);
  const [pipelineStatus, setPipelineStatus] = useState<TranslationStatus>('completed');
  const [queueIndex, setQueueIndex] = useState(0);

  useEffect(() => {
    if (!active || !enabled || forceUnavailable) return;
    let cancelled = false;

    // Wait a few seconds between lines, then show "processing" before "ready".
    const pause = setTimeout(async () => {
      const line = await translationService.nextDemoLine(queueIndex);
      if (cancelled || !line) return;
      const pending: Translation = { ...line, id: `live_${queueIndex}`, timestamp: new Date().toISOString(), status: 'processing' };
      setCurrent(pending);
      setPipelineStatus('processing');

      setTimeout(() => {
        if (cancelled) return;
        const done = { ...pending, status: 'completed' as const };
        setCurrent(done);
        setEntries((prev) => [...prev, done]);
        setPipelineStatus('completed');
        setQueueIndex((i) => i + 1);
      }, 1800);
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(pause);
    };
  }, [active, enabled, forceUnavailable, queueIndex]);

  const status: TranslationStatus = forceUnavailable ? 'unavailable' : !enabled ? 'idle' : pipelineStatus;

  return { entries, current, status };
}
