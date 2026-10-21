import dotenv from 'dotenv';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleTranslationEngine } from '../src/translation/googleEngine';

dotenv.config();

/// Checks the live-translation services with the configured key:
///   npm run check:translation
/// Translates a sentence, speaks it, and runs speech recognition on
/// generated speech, so no microphone is needed.
async function main() {
  const engine = new GoogleTranslationEngine();
  if (!engine.available()) {
    console.log('✗ No key found. Put the service-account JSON at the path in GOOGLE_APPLICATION_CREDENTIALS');
    console.log(`  (currently: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ?? 'not set'})`);
    process.exit(1);
  }

  const sentence = 'Hello, how are you today?';
  for (const to of ['hi', 'te', 'ta']) {
    console.log(`✓ Translation en → ${to}: ${await engine.translate(sentence, 'en', to)}`);
  }

  const mp3 = await engine.synthesize('नमस्ते, आप कैसे हैं?', 'hi');
  console.log(`✓ Text-to-Speech (Hindi): ${mp3.length} bytes of MP3`);

  // Speech-to-Text: feed it generated English speech as 16 kHz PCM.
  const tts = new TextToSpeechClient({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
  const [speech] = await tts.synthesizeSpeech({
    input: { text: sentence },
    voice: { languageCode: 'en-IN' },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 16000 },
  });
  const wav = Buffer.from(speech.audioContent as Uint8Array);
  const pcm = wav.subarray(44); // skip the WAV header

  const heard = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no result within 20 s')), 20_000);
    const stream = engine.startRecognition(
      'en',
      (r) => {
        if (r.final) {
          clearTimeout(timer);
          resolve(r.text);
        }
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
    for (let i = 0; i < pcm.length; i += 3200) stream.write(pcm.subarray(i, i + 3200));
    stream.end();
  });
  console.log(`✓ Speech-to-Text heard: "${heard}"`);
  console.log('All live-translation services are working.');
}

main().catch((err) => {
  console.error('✗ Check failed:', err.message ?? err);
  console.error('  Common causes: billing not linked to the project, an API not enabled, or the wrong key file.');
  process.exit(1);
});
