// Browser-only media features (remote audio playback, video filters).
// Other platforms get the stub, which reports them as unsupported.
export 'web_media_stub.dart' if (dart.library.js_interop) 'web_media_web.dart';
