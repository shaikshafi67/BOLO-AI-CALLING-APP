/// Speech in and out of the AI pipeline.
///
/// TODO: Connect Speech-to-Text API — stream 16 kHz PCM from the microphone
/// to the backend over WebSocket; it forwards to Google Cloud Speech-to-Text
/// streaming recognition and returns interim + final transcripts.
///
/// TODO: Connect Text-to-Speech API — the backend synthesises each
/// translation with Google Cloud Text-to-Speech and streams the audio back;
/// play it while lowering the original remote audio.
class SpeechService {
  bool get isAvailable => false;
}
