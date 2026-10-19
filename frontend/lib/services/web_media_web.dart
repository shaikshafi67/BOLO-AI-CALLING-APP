import 'dart:async';
import 'dart:js_interop';
import 'package:dart_webrtc/dart_webrtc.dart' show MediaStreamTrackWeb;
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:web/web.dart' as web;
import '../models/video_filter.dart';

/// Starts the hidden <audio> element flutter_webrtc uses for the other
/// person's voice. Browsers block sound that starts without a click, so this
/// returns false when the user still has to tap to hear them.
Future<bool> playRemoteAudio(RTCVideoRenderer renderer) async {
  final element = web.document.getElementById('audio_RTCVideoRenderer-${renderer.textureId}');
  if (element == null) return true;
  final audio = element as web.HTMLAudioElement;
  audio.muted = false;
  try {
    await audio.play().toDart;
    return true;
  } catch (e) {
    debugPrint('[call] remote audio blocked until a tap: $e');
    return false;
  }
}

const bool videoFiltersSupported = true;

/// Draws the camera through a canvas with the chosen [VideoFilter] and
/// exposes the result as a video track to send instead of the raw camera.
class FilteredVideo {
  FilteredVideo._(this._video, this._canvas, this._ctx, this.track, this._filter);

  final web.HTMLVideoElement _video;
  final web.HTMLCanvasElement _canvas;
  final web.CanvasRenderingContext2D _ctx;
  final MediaStreamTrack track;
  VideoFilter _filter;
  Timer? _timer;

  set filter(VideoFilter value) => _filter = value;

  static Future<FilteredVideo> start(MediaStreamTrack camera, VideoFilter filter) async {
    final source = (camera as MediaStreamTrackWeb).jsTrack;
    final video = web.HTMLVideoElement()
      ..muted = true
      ..autoplay = true
      ..playsInline = true
      ..srcObject = web.MediaStream([source].toJS);
    await video.play().toDart;

    final settings = source.getSettings();
    final width = settings.width;
    final height = settings.height;
    final canvas = web.HTMLCanvasElement()
      ..width = width > 0 ? width : 1280
      ..height = height > 0 ? height : 720;
    final ctx = canvas.getContext('2d') as web.CanvasRenderingContext2D;
    final output = canvas.captureStream(30).getVideoTracks().toDart.first;

    final pipeline = FilteredVideo._(video, canvas, ctx, MediaStreamTrackWeb(output), filter);
    pipeline._timer = Timer.periodic(const Duration(milliseconds: 33), (_) => pipeline._draw());
    return pipeline;
  }

  void _draw() {
    final w = _canvas.width;
    final h = _canvas.height;
    if (_video.readyState < 2) return;
    final base = _filter.css ?? 'none';
    _ctx
      ..globalAlpha = 1
      ..filter = base
      ..drawImage(_video, 0, 0, w, h);
    final smoothing = _filter.smoothing;
    if (smoothing > 0) {
      // A blurred copy on top softens skin and noise without losing detail.
      _ctx
        ..globalAlpha = smoothing
        ..filter = '${_filter.css ?? ''} blur(${(w / 640).clamp(1, 3).toStringAsFixed(1)}px)'
        ..drawImage(_video, 0, 0, w, h)
        ..globalAlpha = 1;
    }
  }

  Future<void> dispose() async {
    _timer?.cancel();
    await track.stop();
    _video.srcObject = null;
  }
}
