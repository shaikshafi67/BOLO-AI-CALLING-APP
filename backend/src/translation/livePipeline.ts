import { RecognitionStream, TranslationEngine } from './engine';

/// Who is talking, as the signaling server knows them.
export interface Speaker {
  socketId: string;
  uid: string;
  name: string;
  language: string;
  roomCode: string;
}

/// One finished, translated sentence (stored as text only, never audio).
export interface TranslatedLine {
  roomCode: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  /// Final transcript -> translated caption.
  translateMs: number;
  /// Final transcript -> translated voice ready; null when no voice was made.
  voiceMs: number | null;
}

export interface PipelineOutput {
  /// Captions go to everyone in the room (the speaker sees their own words too).
  toRoom(roomCode: string, event: string, payload: unknown): void;
  /// The translated voice goes to the listener only.
  toOthers(socketId: string, roomCode: string, event: string, payload: unknown): void;
  toSocket(socketId: string, event: string, payload: unknown): void;
  translated?(line: TranslatedLine): void;
}

interface SpeakerState {
  speaker: Speaker;
  listenerLanguage: string;
  stream: RecognitionStream | null;
  startedAt: number;
  sentence: number;
  pausedUntil: number;
  /// Words of the current recognition result already translated early (see STABLE_MS).
  consumed: string[];
  /// Fires when the interim words stop changing.
  stableTimer?: ReturnType<typeof setTimeout>;
}

/// Google closes streaming recognition after ~5 minutes; start a fresh
/// stream a little before that.
const STREAM_MAX_MS = 240_000;
/// After a service error (billing, permissions...) wait before trying again.
const ERROR_PAUSE_MS = 30_000;
/// Translate a sentence once its words have stopped changing for this long,
/// instead of waiting for the recognizer to notice a pause (slow in a noisy
/// room, e.g. with a fan running).
export const STABLE_MS = 1000;

/// Words compared loosely: punctuation and case are ignored, since the
/// recognizer adds punctuation only to its final result.
const words = (text: string) => text.split(/\s+/).filter(Boolean);
const loose = (word: string) => word.toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu, '');

/// [text] without the leading [consumed] words, when it starts with them.
function remainder(text: string, consumed: string[]): string {
  const w = words(text);
  if (consumed.length === 0 || w.length < consumed.length) return consumed.length === 0 ? text : '';
  for (let i = 0; i < consumed.length; i++) if (loose(w[i]) !== loose(consumed[i])) return text;
  return w.slice(consumed.length).join(' ');
}

/// Live translation for calls: speech → captions → translation → voice.
///
///   audio chunk ─▶ streaming recognition ─▶ interim caption (to room)
///                                        └▶ final sentence ─▶ translate ─▶ caption (to room)
///                                                                       └▶ voice MP3 (to listener)
///
/// Any failure only stops translation; the WebRTC call itself is untouched.
export class LivePipeline {
  private readonly speakers = new Map<string, SpeakerState>();

  constructor(
    private readonly engine: TranslationEngine,
    private readonly out: PipelineOutput,
    private readonly now: () => number = Date.now,
  ) {}

  /// A chunk of 16 kHz PCM from [speaker], heard by someone speaking [listenerLanguage].
  audio(speaker: Speaker, listenerLanguage: string, chunk: Buffer) {
    let state = this.speakers.get(speaker.socketId);
    if (!state) {
      state = { speaker, listenerLanguage, stream: null, startedAt: 0, sentence: 0, pausedUntil: 0, consumed: [] };
      this.speakers.set(speaker.socketId, state);
    }
    // Languages can change mid-call (language:update); a new stream picks them up.
    const languageChanged = state.speaker.language !== speaker.language;
    state.speaker = speaker;
    state.listenerLanguage = listenerLanguage;
    if (this.now() < state.pausedUntil) return;

    if (state.stream && (languageChanged || this.now() - state.startedAt > STREAM_MAX_MS)) {
      state.stream.end();
      state.stream = null;
    }
    state.stream ??= this.open(state);
    state.stream?.write(chunk);
  }

  /// The speaker muted, paused translation or left.
  stop(socketId: string) {
    const state = this.speakers.get(socketId);
    clearTimeout(state?.stableTimer);
    state?.stream?.end();
    this.speakers.delete(socketId);
  }

  private open(state: SpeakerState): RecognitionStream | null {
    let stream: RecognitionStream;
    try {
      stream = this.engine.startRecognition(
        state.speaker.language,
        (result) => {
          if (state.stream !== stream) return;
          this.onResult(state, result.text, result.final);
        },
        (error) => this.failed(state, stream, error),
      );
    } catch (error) {
      this.paused(state, error as Error);
      return null;
    }
    state.startedAt = this.now();
    return stream;
  }

  /// Interim words are captioned as they come; a sentence is translated when
  /// the recognizer finalizes it or its words stop changing for STABLE_MS.
  private onResult(state: SpeakerState, text: string, final: boolean) {
    clearTimeout(state.stableTimer);
    // Words of this result that were already translated early are dropped.
    const rest = remainder(text, state.consumed).trim();
    if (final) {
      state.consumed = [];
      // Number the sentence now: the next one's interim text can arrive
      // while this one is still being translated.
      if (rest) void this.finish(state, rest, state.sentence++);
      return;
    }
    if (!rest) return;
    this.caption(state, state.sentence, rest, null, false);
    state.stableTimer = setTimeout(() => {
      if (!this.speakers.has(state.speaker.socketId)) return;
      state.consumed = words(text);
      void this.finish(state, rest, state.sentence++);
    }, STABLE_MS);
  }

  private caption(state: SpeakerState, sentence: number, original: string, translated: string | null, final: boolean, latencyMs?: number) {
    const { speaker } = state;
    this.out.toRoom(speaker.roomCode, 'caption', {
      id: `${speaker.uid}-${sentence}`,
      speakerUid: speaker.uid,
      speakerName: speaker.name,
      sourceLanguage: speaker.language,
      targetLanguage: state.listenerLanguage,
      original,
      translated,
      final,
      ...(latencyMs === undefined ? {} : { latencyMs }),
    });
  }

  /// A finished sentence: translate it, caption it, and voice it for the listener.
  private async finish(state: SpeakerState, text: string, sentence: number) {
    const { speaker, listenerLanguage } = state;
    const id = `${speaker.uid}-${sentence}`;
    const started = this.now();
    const sameLanguage = speaker.language === listenerLanguage;
    let translated: string;
    try {
      translated = sameLanguage ? text : await this.engine.translate(text, speaker.language, listenerLanguage);
    } catch (error) {
      console.error('[translation] translate failed', error);
      this.caption(state, sentence, text, null, true);
      this.out.toRoom(speaker.roomCode, 'translation:status', { available: false, reason: 'translate_failed' });
      return;
    }
    const translateMs = this.now() - started;
    this.caption(state, sentence, text, translated, true, translateMs);

    let voiceMs: number | null = null;
    if (!sameLanguage) {
      try {
        const audio = await this.engine.synthesize(translated, listenerLanguage);
        this.out.toOthers(speaker.socketId, speaker.roomCode, 'translation:audio', { id, audio, mime: 'audio/mpeg' });
        voiceMs = this.now() - started;
      } catch (error) {
        // Captions still work without the voice.
        console.error('[translation] speech synthesis failed', error);
      }
    }
    // Logged per sentence and saved with the call (requirements: latency is measured, not promised).
    console.log(
      `[translation] ${speaker.roomCode} ${speaker.language}→${listenerLanguage} caption ${translateMs} ms` +
        (voiceMs === null ? '' : `, voice ${voiceMs} ms`),
    );
    this.out.translated?.({
      roomCode: speaker.roomCode,
      sourceLanguage: speaker.language,
      targetLanguage: listenerLanguage,
      sourceText: text,
      translatedText: translated,
      translateMs,
      voiceMs,
    });
  }

  private failed(state: SpeakerState, stream: RecognitionStream, error: Error & { code?: number }) {
    if (state.stream !== stream) return;
    state.stream = null;
    // 11 = OUT_OF_RANGE: Google's idle/length limit. Reopen on the next chunk.
    if (error.code === 11) return;
    this.paused(state, error);
  }

  private paused(state: SpeakerState, error: Error) {
    console.error('[translation] speech recognition unavailable', error.message);
    state.pausedUntil = this.now() + ERROR_PAUSE_MS;
    this.out.toSocket(state.speaker.socketId, 'translation:status', { available: false, reason: 'recognition_failed' });
  }
}
