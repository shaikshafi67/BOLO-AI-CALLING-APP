import type { LanguageCode } from '../types';

// TODO: Connect Speech-to-Text API
// Plan: stream microphone audio (MediaRecorder / AudioWorklet, 16 kHz PCM)
// to the backend over WebSocket; the backend forwards it to Google Cloud
// Speech-to-Text streaming recognition and returns interim + final transcripts.

// TODO: Connect Text-to-Speech API
// Plan: backend calls Google Cloud Text-to-Speech for each final translation
// and streams audio back; play it through an <audio> element / AudioContext
// while ducking the original remote audio.

export interface TranscriptEvent {
  text: string;
  language: LanguageCode;
  isFinal: boolean;
}

export const speechService = {
  /** Whether a real STT backend is connected. False in the prototype. */
  isAvailable(): boolean {
    return false;
  },

  /** Start streaming recognition. Not implemented in the prototype. */
  startRecognition(_language: LanguageCode, _onTranscript: (e: TranscriptEvent) => void): () => void {
    console.info('[speechService] Speech-to-Text not connected yet.');
    return () => undefined;
  },

  /** Speak translated text. Not implemented in the prototype. */
  async synthesize(_text: string, _language: LanguageCode): Promise<void> {
    console.info('[speechService] Text-to-Speech not connected yet.');
  },
};
