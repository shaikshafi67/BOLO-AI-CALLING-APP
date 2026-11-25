import { RecognitionResult, TranslationEngine } from '../src/translation/engine';
import { LivePipeline, PipelineOutput, STABLE_MS } from '../src/translation/livePipeline';

/// Audio chunks are plain text here: "final:..." ends a sentence, anything
/// else is interim text. "fail" makes recognition error out.
function fakeEngine(overrides: Partial<TranslationEngine> = {}): TranslationEngine & { opened: string[] } {
  const opened: string[] = [];
  return {
    opened,
    available: () => true,
    startRecognition(language, onResult: (r: RecognitionResult) => void, onError) {
      opened.push(language);
      return {
        write(chunk) {
          const text = chunk.toString();
          if (text === 'fail') return onError(Object.assign(new Error('PERMISSION_DENIED'), { code: 7 }));
          onResult(text.startsWith('final:') ? { text: text.slice(6), final: true } : { text, final: false });
        },
        end() {},
      };
    },
    translate: async (text, _from, to) => `[${to}] ${text}`,
    synthesize: async (text) => Buffer.from(`mp3:${text}`),
    ...overrides,
  };
}

function recorder() {
  const events: { to: string; event: string; payload: any }[] = [];
  const out: PipelineOutput = {
    toRoom: (room, event, payload) => events.push({ to: `room:${room}`, event, payload }),
    toOthers: (_socket, room, event, payload) => events.push({ to: `others:${room}`, event, payload }),
    toSocket: (socket, event, payload) => events.push({ to: `socket:${socket}`, event, payload }),
  };
  return { events, out };
}

const shafi = { socketId: 's1', uid: 'u1', name: 'Shafi', language: 'hi', roomCode: 'BOLO-1234' };
const flush = () => new Promise((r) => setTimeout(r, 0));

// Every pipeline is stopped after its test, so no "words stopped changing" timer outlives it.
const pipelines: LivePipeline[] = [];
const track = (p: LivePipeline) => (pipelines.push(p), p);
afterEach(() => pipelines.splice(0).forEach((p) => ['s1', 's2'].forEach((id) => p.stop(id))));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('LivePipeline', () => {
  test('a sentence is translated once its words stop changing, without waiting for the pause', async () => {
    const engine = fakeEngine();
    const { events, out } = recorder();
    const pipeline = track(new LivePipeline(engine, out));

    pipeline.audio(shafi, 'te', Buffer.from('namaste'));
    pipeline.audio(shafi, 'te', Buffer.from('namaste dost'));
    expect(events.filter((e) => e.payload.final)).toHaveLength(0);

    await wait(STABLE_MS + 100);
    const finals = events.filter((e) => e.event === 'caption' && e.payload.final);
    expect(finals).toHaveLength(1);
    expect(finals[0].payload).toMatchObject({ id: 'u1-0', original: 'namaste dost', translated: '[te] namaste dost' });

    // The recognizer's own final for the same words (now punctuated) adds nothing.
    pipeline.audio(shafi, 'te', Buffer.from('final:Namaste dost.'));
    await flush();
    expect(events.filter((e) => e.event === 'caption' && e.payload.final)).toHaveLength(1);
  });

  test('words spoken after an early translation become the next sentence', async () => {
    const { events, out } = recorder();
    const pipeline = track(new LivePipeline(fakeEngine(), out));

    pipeline.audio(shafi, 'te', Buffer.from('aap kaise'));
    await wait(STABLE_MS + 100);
    // The recognizer keeps the earlier words in its result; only the new ones are shown.
    pipeline.audio(shafi, 'te', Buffer.from('aap kaise ho bhai'));
    expect(events[events.length - 1].payload).toMatchObject({ id: 'u1-1', original: 'ho bhai', final: false });
    pipeline.audio(shafi, 'te', Buffer.from('final:aap kaise ho bhai?'));
    await flush();
    const finals = events.filter((e) => e.event === 'caption' && e.payload.final).map((e) => e.payload.original);
    expect(finals).toEqual(['aap kaise', 'ho bhai?']);
  });

  test('measures how long each sentence takes to caption and to voice', async () => {
    let clock = 1000;
    const lines: any[] = [];
    const { out } = recorder();
    const engine = fakeEngine({
      translate: async (text) => {
        clock += 300;
        return `[te] ${text}`;
      },
      synthesize: async (text) => {
        clock += 500;
        return Buffer.from(text);
      },
    });
    const pipeline = track(new LivePipeline(engine, { ...out, translated: (line) => lines.push(line) }, () => clock));

    pipeline.audio(shafi, 'te', Buffer.from('final:namaste'));
    await flush();
    expect(lines).toEqual([
      expect.objectContaining({ sourceText: 'namaste', translatedText: '[te] namaste', translateMs: 300, voiceMs: 800 }),
    ]);

    // Same language: no voice is made.
    pipeline.audio(shafi, 'hi', Buffer.from('final:kaise ho'));
    await flush();
    expect(lines[1]).toMatchObject({ translateMs: 0, voiceMs: null });
  });

  test('interim words caption the room; a finished sentence is translated and voiced for the listener', async () => {
    const engine = fakeEngine();
    const { events, out } = recorder();
    const pipeline = track(new LivePipeline(engine, out));

    pipeline.audio(shafi, 'te', Buffer.from('namaste'));
    pipeline.audio(shafi, 'te', Buffer.from('final:namaste dost'));
    await flush();

    expect(engine.opened).toEqual(['hi']);
    expect(events[0]).toMatchObject({ to: 'room:BOLO-1234', event: 'caption', payload: { id: 'u1-0', original: 'namaste', translated: null, final: false } });
    expect(events[1]).toMatchObject({
      to: 'room:BOLO-1234',
      event: 'caption',
      payload: { id: 'u1-0', original: 'namaste dost', translated: '[te] namaste dost', final: true, sourceLanguage: 'hi', targetLanguage: 'te' },
    });
    expect(events[2]).toMatchObject({ to: 'others:BOLO-1234', event: 'translation:audio', payload: { id: 'u1-0', mime: 'audio/mpeg' } });
    expect(events[2].payload.audio.toString()).toBe('mp3:[te] namaste dost');

    // The next sentence gets the next id.
    pipeline.audio(shafi, 'te', Buffer.from('aur'));
    expect(events[3].payload.id).toBe('u1-1');
  });

  test('same language: captions only, no translation or voice', async () => {
    const translate = jest.fn();
    const { events, out } = recorder();
    const pipeline = track(new LivePipeline(fakeEngine({ translate }), out));
    pipeline.audio(shafi, 'hi', Buffer.from('final:kaise ho'));
    await flush();
    expect(translate).not.toHaveBeenCalled();
    expect(events.map((e) => e.event)).toEqual(['caption']);
    expect(events[0].payload.translated).toBe('kaise ho');
  });

  test('a service error pauses translation for that speaker and tells them', async () => {
    const engine = fakeEngine();
    const { events, out } = recorder();
    let now = 1_000;
    const pipeline = track(new LivePipeline(engine, out, () => now));

    pipeline.audio(shafi, 'te', Buffer.from('fail'));
    expect(events).toEqual([{ to: 'socket:s1', event: 'translation:status', payload: { available: false, reason: 'recognition_failed' } }]);

    pipeline.audio(shafi, 'te', Buffer.from('hello'));
    expect(engine.opened).toHaveLength(1); // still paused

    now += 31_000;
    pipeline.audio(shafi, 'te', Buffer.from('hello'));
    expect(engine.opened).toHaveLength(2); // tries again
  });

  test('a translation failure still shows the original words', async () => {
    const { events, out } = recorder();
    const pipeline = track(new LivePipeline(fakeEngine({ translate: async () => Promise.reject(new Error('quota')) }), out));
    pipeline.audio(shafi, 'te', Buffer.from('final:namaste'));
    await flush();
    expect(events[0]).toMatchObject({ event: 'caption', payload: { original: 'namaste', translated: null, final: true } });
    expect(events[1]).toMatchObject({ event: 'translation:status', payload: { available: false } });
  });

  test('restarts recognition when the speaker changes language', () => {
    const engine = fakeEngine();
    const pipeline = track(new LivePipeline(engine, recorder().out));
    pipeline.audio(shafi, 'te', Buffer.from('a'));
    pipeline.audio({ ...shafi, language: 'ta' }, 'te', Buffer.from('b'));
    expect(engine.opened).toEqual(['hi', 'ta']);
  });
});
