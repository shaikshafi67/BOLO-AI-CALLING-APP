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
}

/// Google closes streaming recognition after ~5 minutes; start a fresh
/// stream a little before that.
const STREAM_MAX_MS = 240_000;
/// After a service error (billing, permissions...) wait before trying again.
const ERROR_PAUSE_MS = 30_000;

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
      state = { speaker, listenerLanguage, stream: null, startedAt: 0, sentence: 0, pausedUntil: 0 };
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
    this.speakers.get(socketId)?.stream?.end();
    this.speakers.delete(socketId);
  }

  private open(state: SpeakerState): RecognitionStream | null {
    let stream: RecognitionStream;
    try {
      stream = this.engine.startRecognition(
        state.speaker.language,
        (result) => {
          if (state.stream !== stream) return;
          if (result.final) {
            // Number the sentence now: the next one's interim text can
            // arrive while this one is still being translated.
            void this.finish(state, result.text, state.sentence++);
          } else {
            this.caption(state, state.sentence, result.text, null, false);
          }
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
    this.caption(state, sentence, text, translated, true, this.now() - started);
    this.out.translated?.({
      roomCode: speaker.roomCode,
      sourceLanguage: speaker.language,
      targetLanguage: listenerLanguage,
      sourceText: text,
      translatedText: translated,
    });
    if (sameLanguage) return;

    try {
      const audio = await this.engine.synthesize(translated, listenerLanguage);
      this.out.toOthers(speaker.socketId, speaker.roomCode, 'translation:audio', { id, audio, mime: 'audio/mpeg' });
      console.log(`[translation] ${speaker.roomCode} ${speaker.language}→${listenerLanguage} ready in ${this.now() - started} ms`);
    } catch (error) {
      // Captions still work without the voice.
      console.error('[translation] speech synthesis failed', error);
    }
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
