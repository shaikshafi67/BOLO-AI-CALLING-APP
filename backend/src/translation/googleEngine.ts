import fs from 'fs';
import path from 'path';
import { SpeechClient } from '@google-cloud/speech';
import { v2 as translateV2 } from '@google-cloud/translate';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { localeFor, RecognitionStream, TranslationEngine } from './engine';

/// Google Cloud Speech-to-Text (streaming), Translation (basic) and
/// Text-to-Speech, authenticated with the service-account key named by
/// GOOGLE_APPLICATION_CREDENTIALS (e.g. ./secrets/gcp-service-account.json).
export class GoogleTranslationEngine implements TranslationEngine {
  private speech?: SpeechClient;
  private translator?: translateV2.Translate;
  private tts?: TextToSpeechClient;

  private get keyFile(): string | null {
    const configured = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (!configured) return null;
    const resolved = path.resolve(configured);
    return fs.existsSync(resolved) ? resolved : null;
  }

  available(): boolean {
    return this.keyFile !== null;
  }

  private clients() {
    const keyFilename = this.keyFile;
    if (!keyFilename) throw new Error('Google Cloud credentials are not configured');
    this.speech ??= new SpeechClient({ keyFilename });
    this.translator ??= new translateV2.Translate({ keyFilename });
    this.tts ??= new TextToSpeechClient({ keyFilename });
    return { speech: this.speech, translator: this.translator, tts: this.tts };
  }

  startRecognition(
    language: string,
    onResult: (result: { text: string; final: boolean }) => void,
    onError: (error: Error) => void,
  ): RecognitionStream {
    const stream = this.clients().speech.streamingRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: localeFor(language),
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    });
    stream.on('data', (data: { results?: { alternatives?: { transcript?: string }[]; isFinal?: boolean }[] }) => {
      const result = data.results?.[0];
      const text = result?.alternatives?.[0]?.transcript?.trim();
      if (text) onResult({ text, final: result?.isFinal === true });
    });
    stream.on('error', onError);
    let ended = false;
    return {
      write: (chunk) => {
        if (!ended && stream.writable) stream.write(chunk);
      },
      end: () => {
        if (ended) return;
        ended = true;
        stream.end();
      },
    };
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    const [translated] = await this.clients().translator.translate(text, { from, to });
    return translated;
  }

  async synthesize(text: string, language: string): Promise<Buffer> {
    const [response] = await this.clients().tts.synthesizeSpeech({
      input: { text },
      voice: { languageCode: localeFor(language) },
      audioConfig: { audioEncoding: 'MP3' },
    });
    return Buffer.from(response.audioContent as Uint8Array);
  }
}
