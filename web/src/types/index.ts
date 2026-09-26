// Shared domain types for the BoloAI web app.
// Shapes are kept close to the backend (backend/src/models) so real API
// responses can replace mock data without touching the UI.

/** ISO 639-1 codes for languages BoloAI plans to support. */
export type LanguageCode = 'en' | 'hi' | 'te' | 'gu' | 'ta' | 'kn' | 'ml' | 'bn' | 'mr';

/**
 * `available`: supported by the backend pipeline design (still depends on the
 * connected AI services). `planned`: on the roadmap, not wired up yet.
 */
export type LanguageStatus = 'available' | 'planned';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  status: LanguageStatus;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface User {
  id: string;
  fullName: string;
  email: string;
  preferredLanguage: LanguageCode;
  country: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  fullName: string;
  email: string;
  preferredLanguage: LanguageCode;
  status: PresenceStatus;
  avatarUrl?: string;
  lastCallAt?: string;
  location?: string;
}

export type CallStatus = 'completed' | 'missed' | 'declined' | 'failed';
export type CallDirection = 'incoming' | 'outgoing';

export interface Call {
  id: string;
  roomCode: string;
  contact: Pick<Contact, 'id' | 'fullName' | 'avatarUrl'>;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  direction: CallDirection;
  status: CallStatus;
  startedAt: string;
  durationSeconds: number;
  translatedSegments: number;
}

export interface Participant {
  id: string;
  name: string;
  language: LanguageCode;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
}

/** One utterance flowing through the STT → Translation → TTS pipeline. */
export interface Translation {
  id: string;
  speakerId: string;
  speakerName: string;
  isLocal: boolean;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  originalText: string;
  translatedText?: string;
  timestamp: string;
  status: TranslationStatus;
}

export type TranslationStatus = 'idle' | 'processing' | 'completed' | 'unavailable';

export type NotificationType = 'incoming_call' | 'call_ended' | 'missed_call' | 'system' | 'contact_request';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actorName?: string;
}

export interface CallSettings {
  myLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  voiceTranslation: boolean;
  liveCaptions: boolean;
  autoDetectLanguage: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
}

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unstable'
  | 'ended';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
}
