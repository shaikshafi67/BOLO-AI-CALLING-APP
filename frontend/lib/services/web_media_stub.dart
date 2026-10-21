import 'dart:typed_data';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../models/video_filter.dart';

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

/// Microphone capture for live translation (browser only for now).
class MicStreamer {
  MicStreamer._();

  static const bool supported = false;

  static Future<MicStreamer> start(MediaStreamTrack microphone, void Function(Uint8List pcm) onChunk) =>
      throw UnsupportedError('Live translation capture is only available in the browser.');

  Future<void> resume() async {}
  Future<void> stop() async {}
}

/// Plays one translated sentence (MP3). Not available outside the browser yet.
Future<void> playTranslation(RTCVideoRenderer remote, Uint8List mp3) async {}
