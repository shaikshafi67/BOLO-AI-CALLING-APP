import { ArrowLeftRight, AudioLines, Captions, ScanSearch } from 'lucide-react';
import { LanguageSelect } from '../translation/LanguageBits';
import { Toggle } from '../ui/FormControls';
import { ComingSoonTag } from '../ui/Misc';
import { useCallSettings } from '../../context/CallSettingsContext';

/** Shared translation preferences block used by Start Call, Join Call and Settings. */
export function CallLanguageSettings({ showToggles = true }: { showToggles?: boolean }) {
  const { settings, update } = useCallSettings();

  const swap = () => update({ myLanguage: settings.targetLanguage, targetLanguage: settings.myLanguage });

  return (
    <div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <LanguageSelect label="My Language" value={settings.myLanguage} onChange={(v) => update({ myLanguage: v })} disabled={settings.autoDetectLanguage} />
        <button
          type="button"
          onClick={swap}
          className="mx-auto mb-0.5 flex size-10 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:border-brand-300 hover:text-brand-600 sm:mb-0.5"
          aria-label="Swap languages"
          title="Swap languages"
        >
          <ArrowLeftRight className="size-4" />
        </button>
        <LanguageSelect label="Translate My Speech To" value={settings.targetLanguage} onChange={(v) => update({ targetLanguage: v })} />
      </div>
      {settings.myLanguage === settings.targetLanguage && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Both languages are the same, so translation will be skipped.</p>
      )}

      {showToggles && (
        <div className="mt-4 divide-y divide-line">
          <Toggle
            icon={<AudioLines className="size-4" />}
            label="AI Voice Translation"
            description="Listener hears your words spoken in their language"
            checked={settings.voiceTranslation}
            onChange={(v) => update({ voiceTranslation: v })}
            badge={<ComingSoonTag />}
          />
          <Toggle
            icon={<Captions className="size-4" />}
            label="Live Captions"
            description="Show translated subtitles during the call"
            checked={settings.liveCaptions}
            onChange={(v) => update({ liveCaptions: v })}
          />
          <Toggle
            icon={<ScanSearch className="size-4" />}
            label="Auto Language Detection"
            description="Detect the spoken language automatically"
            checked={settings.autoDetectLanguage}
            onChange={(v) => update({ autoDetectLanguage: v })}
            badge={<ComingSoonTag />}
          />
        </div>
      )}
    </div>
  );
}
