import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../widgets/avatar.dart';

/// The other participant's camera.
///
/// In a real call [renderer] carries their WebRTC video; while there is none
/// (not connected yet, audio-only, camera off) their avatar shows instead.
/// Demo mode passes no renderer and plays the contact's stock footage.
class RemoteVideo extends StatefulWidget {
  final AppUser contact;
  final bool speaking;
  final RTCVideoRenderer? renderer;
  final bool hasVideo;

  /// Show the whole picture (a shared screen) instead of filling the frame.
  final bool contain;
  const RemoteVideo({super.key, required this.contact, this.speaking = false, this.renderer, this.hasVideo = false, this.contain = false});

  @override
  State<RemoteVideo> createState() => _RemoteVideoState();
}

class _RemoteVideoState extends State<RemoteVideo> {
  VideoPlayerController? _controller;

  /// video_player has no Windows/Linux implementation; those show the poster.
  bool get _platformSupportsVideo =>
      kIsWeb || defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS;

  @override
  void initState() {
    super.initState();
    final src = widget.contact.demoVideo;
    if (widget.renderer == null && src != null && _platformSupportsVideo) {
      final c = VideoPlayerController.asset(src);
      _controller = c;
      c.initialize().then((_) {
        if (!mounted) return;
        c
          ..setVolume(0)
          ..setLooping(true)
          ..play();
        setState(() {});
      }).catchError((Object _) {
        // Fall back to the still image if the clip can't play.
        if (mounted) setState(() => _controller = null);
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    final poster = widget.renderer == null ? widget.contact.demoPoster : null;

    Widget content;
    if (widget.renderer != null && widget.hasVideo) {
      content = Container(
        color: const Color(0xFF1C1917),
        child: RTCVideoView(
          widget.renderer!,
          objectFit: widget.contain ? RTCVideoViewObjectFit.RTCVideoViewObjectFitContain : RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
        ),
      );
    } else if (c != null && c.value.isInitialized) {
      content = FittedBox(
        fit: BoxFit.cover,
        clipBehavior: Clip.hardEdge,
        child: SizedBox(width: c.value.size.width, height: c.value.size.height, child: VideoPlayer(c)),
      );
    } else if (poster != null) {
      content = Image.asset(poster, fit: BoxFit.cover);
    } else {
      // No video from this person yet (or camera off).
      content = Container(
        color: const Color(0xFF292524),
        alignment: Alignment.center,
        child: Avatar(name: widget.contact.name, size: 120, ringColor: widget.speaking ? Brand.marigold400 : null),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        Semantics(label: '${widget.contact.name}’s video', image: true, child: content),
        if (widget.speaking)
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(border: Border.all(color: Brand.marigold400, width: 3), borderRadius: BorderRadius.circular(18)),
            ),
          ),
      ],
    );
  }
}
