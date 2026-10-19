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
