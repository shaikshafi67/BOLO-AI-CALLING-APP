import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../widgets/avatar.dart';

/// The other participant's "camera".
///
/// TODO: Connect WebRTC signaling server — replace the demo footage with an
/// RTCVideoView bound to the remote MediaStream from flutter_webrtc.
class RemoteVideo extends StatefulWidget {
  final AppUser contact;
  final bool speaking;
  const RemoteVideo({super.key, required this.contact, this.speaking = false});

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
    if (src != null && _platformSupportsVideo) {
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
    final poster = widget.contact.demoPoster;

    Widget content;
    if (c != null && c.value.isInitialized) {
      content = FittedBox(
        fit: BoxFit.cover,
        clipBehavior: Clip.hardEdge,
        child: SizedBox(width: c.value.size.width, height: c.value.size.height, child: VideoPlayer(c)),
      );
    } else if (poster != null) {
      content = Image.asset(poster, fit: BoxFit.cover);
    } else {
      // No footage for this contact: placeholder until WebRTC provides a stream.
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
