import { RecognitionResult, TranslationEngine } from '../src/translation/engine';
import { LivePipeline, PipelineOutput } from '../src/translation/livePipeline';

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

describe('LivePipeline', () => {
  test('interim words caption the room; a finished sentence is translated and voiced for the listener', async () => {
    const engine = fakeEngine();
    const { events, out } = recorder();
    const pipeline = new LivePipeline(engine, out);

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
    const pipeline = new LivePipeline(fakeEngine({ translate }), out);
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
    const pipeline = new LivePipeline(engine, out, () => now);

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
    const pipeline = new LivePipeline(fakeEngine({ translate: async () => Promise.reject(new Error('quota')) }), out);
    pipeline.audio(shafi, 'te', Buffer.from('final:namaste'));
    await flush();
    expect(events[0]).toMatchObject({ event: 'caption', payload: { original: 'namaste', translated: null, final: true } });
    expect(events[1]).toMatchObject({ event: 'translation:status', payload: { available: false } });
  });

  test('restarts recognition when the speaker changes language', () => {
    const engine = fakeEngine();
    const pipeline = new LivePipeline(engine, recorder().out);
    pipeline.audio(shafi, 'te', Buffer.from('a'));
    pipeline.audio({ ...shafi, language: 'ta' }, 'te', Buffer.from('b'));
    expect(engine.opened).toEqual(['hi', 'ta']);
  });
});
