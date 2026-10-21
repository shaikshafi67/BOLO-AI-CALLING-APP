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

// ---- Live translation: microphone capture and translated voice ----

/// Runs inside the browser's audio thread: averages the mic signal down to
/// 16 kHz mono 16-bit PCM (what Speech-to-Text expects) and posts ~100 ms chunks.
const _pcmWorklet = r'''
class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;
    this.pos = 0; this.sum = 0; this.count = 0;
    this.out = new Int16Array(1600); this.n = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i]; this.count++; this.pos++;
      if (this.pos >= this.step) {
        this.pos -= this.step;
        const v = Math.max(-1, Math.min(1, this.sum / this.count));
        this.out[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        this.sum = 0; this.count = 0;
        if (this.n === this.out.length) {
          this.port.postMessage(this.out.buffer, [this.out.buffer]);
          this.out = new Int16Array(1600); this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pcm-downsampler', PcmDownsampler);
''';

/// Streams the microphone as 16 kHz PCM chunks for live translation.
class MicStreamer {
  MicStreamer._(this._context, this._source, this._node);

  static const bool supported = true;

  final web.AudioContext _context;
  final web.MediaStreamAudioSourceNode _source;
  final web.AudioWorkletNode _node;

  static Future<MicStreamer> start(MediaStreamTrack microphone, void Function(Uint8List pcm) onChunk) async {
    final context = web.AudioContext();
    final blob = web.Blob([_pcmWorklet.toJS].toJS, web.BlobPropertyBag(type: 'application/javascript'));
    final url = web.URL.createObjectURL(blob);
    try {
      await context.audioWorklet.addModule(url).toDart;
    } finally {
      web.URL.revokeObjectURL(url);
    }
    final source = context.createMediaStreamSource(web.MediaStream([(microphone as MediaStreamTrackWeb).jsTrack].toJS));
    final node = web.AudioWorkletNode(context, 'pcm-downsampler');
    node.port.onmessage = ((web.MessageEvent e) {
      final data = e.data;
      if (data.isA<JSArrayBuffer>()) onChunk((data as JSArrayBuffer).toDart.asUint8List());
    }).toJS;
    source.connect(node);
    // Browsers only run nodes connected to the output; a silent gain keeps it
    // running without playing your own voice back to you.
    final silent = context.createGain()..gain.value = 0;
    node.connect(silent);
    silent.connect(context.destination);
    final streamer = MicStreamer._(context, source, node);
    await streamer.resume();
    return streamer;
  }

  /// Audio may only start after a user gesture; call again from a tap.
  Future<void> resume() async {
    if (_context.state == 'suspended') {
      try {
        await _context.resume().toDart;
      } catch (_) {}
    }
  }

  Future<void> stop() async {
    _node.port.onmessage = null;
    _source.disconnect();
    _node.disconnect();
    try {
      await _context.close().toDart;
    } catch (_) {}
  }
}

Future<void> _translationQueue = Future.value();

/// Plays one translated sentence (MP3), one after another, turning the other
/// person's original voice down while it plays.
Future<void> playTranslation(RTCVideoRenderer remote, Uint8List mp3) {
  final next = _translationQueue.then((_) => _play(remote, mp3));
  _translationQueue = next.catchError((Object _) {});
  return next;
}

Future<void> _play(RTCVideoRenderer remote, Uint8List mp3) async {
  final url = web.URL.createObjectURL(web.Blob([mp3.toJS].toJS, web.BlobPropertyBag(type: 'audio/mpeg')));
  final voice = web.HTMLAudioElement()..src = url;
  final original = web.document.getElementById('audio_RTCVideoRenderer-${remote.textureId}') as web.HTMLAudioElement?;
  final done = Completer<void>();
  voice.onended = ((web.Event _) {
    if (!done.isCompleted) done.complete();
  }).toJS;
  voice.onerror = ((web.Event _) {
    if (!done.isCompleted) done.complete();
  }).toJS;
  original?.volume = 0.2;
  try {
    await voice.play().toDart;
    await done.future.timeout(const Duration(seconds: 30));
  } catch (e) {
    debugPrint('[call] translated voice did not play: $e');
  } finally {
    original?.volume = 1;
    web.URL.revokeObjectURL(url);
  }
}
