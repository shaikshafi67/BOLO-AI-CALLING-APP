import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../models/video_filter.dart';

// Native apps. Live translation uses the Android helpers in MainActivity.kt
// (channels "boloai/mic" and "boloai/audio"); other platforms report it as
// unsupported.

/// Native apps play remote audio themselves.
Future<bool> playRemoteAudio(RTCVideoRenderer renderer) async => true;

const bool videoFiltersSupported = false;

/// Not available outside the browser.
class FilteredVideo {
  FilteredVideo._();

  static Future<FilteredVideo> start(MediaStreamTrack camera, VideoFilter filter) =>
      throw UnsupportedError('Video filters are only available in the browser.');

  MediaStreamTrack get track => throw UnsupportedError('');
  set filter(VideoFilter value) {}
  Future<void> dispose() async {}
}

const _audio = MethodChannel('boloai/audio');
const _pcm = EventChannel('boloai/mic');

bool get _android => defaultTargetPlatform == TargetPlatform.android;

/// Streams the call's microphone as 16 kHz PCM chunks for live translation.
/// On Android the samples are tapped from the WebRTC track itself, so the call
/// keeps the microphone.
class MicStreamer {
  MicStreamer._(this._chunks);

  final StreamSubscription<dynamic> _chunks;

  static bool get supported => _android;

  static Future<MicStreamer> start(MediaStreamTrack microphone, void Function(Uint8List pcm) onChunk) async {
    if (!_android) throw UnsupportedError('Live translation capture is not available on this platform.');
    final chunks = _pcm.receiveBroadcastStream().listen((data) {
      if (data is Uint8List) onChunk(data);
    });
    try {
      await _audio.invokeMethod<void>('startMic', {'trackId': microphone.id});
    } catch (_) {
      await chunks.cancel();
      rethrow;
    }
    return MicStreamer._(chunks);
  }

  /// Browsers need a tap before audio starts; native apps don't.
  Future<void> resume() async {}

  Future<void> stop() async {
    await _chunks.cancel();
    try {
      await _audio.invokeMethod<void>('stopMic');
    } catch (_) {}
  }
}

Future<void> _translationQueue = Future.value();

/// Plays one translated sentence (MP3), one after another, turning the other
/// person's original voice down while it plays.
Future<void> playTranslation(RTCVideoRenderer remote, Uint8List mp3) {
  if (!_android) return Future.value();
  final next = _translationQueue.then((_) => _play(remote, mp3));
  _translationQueue = next.catchError((Object _) {});
  return next;
}

Future<void> _play(RTCVideoRenderer remote, Uint8List mp3) async {
  final original = remote.srcObject?.getAudioTracks() ?? const <MediaStreamTrack>[];
  Future<void> setVolume(double v) async {
    for (final t in original) {
      try {
        await Helper.setVolume(v, t);
      } catch (_) {}
    }
  }

  await setVolume(0.2);
  try {
    await _audio.invokeMethod<void>('playMp3', {'bytes': mp3}).timeout(const Duration(seconds: 30));
  } catch (e) {
    debugPrint('[call] translated voice did not play: $e');
  } finally {
    await setVolume(1);
  }
}
