/// The AI services behind live translation, kept behind an interface so the
/// signaling server can be tested without Google Cloud.

export interface RecognitionResult {
  text: string;
  /// True once the speaker finished the sentence (no more changes coming).
  final: boolean;
}

/// One open speech-recognition stream for one speaker.
export interface RecognitionStream {
  /// 16 kHz, mono, 16-bit little-endian PCM.
  write(chunk: Buffer): void;
  end(): void;
}

export interface TranslationEngine {
  /// Whether the services are configured (credentials present).
  available(): boolean;
  startRecognition(
    language: string,
    onResult: (result: RecognitionResult) => void,
    onError: (error: Error) => void,
  ): RecognitionStream;
  translate(text: string, from: string, to: string): Promise<string>;
  /// Spoken audio for [text] as MP3.
  synthesize(text: string, language: string): Promise<Buffer>;
}

/// BoloAI language codes → Google locale codes (Indian English and Indian languages).
export const GOOGLE_LOCALES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
};

export const localeFor = (code: string) => GOOGLE_LOCALES[code] ?? 'en-IN';
