import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../widgets/avatar.dart';

/// The other participant's camera. [renderer] carries their WebRTC video;
/// while there is none (not connected yet, audio-only, camera off) their
/// avatar shows instead.
class RemoteVideo extends StatelessWidget {
  final AppUser contact;
  final bool speaking;
  final RTCVideoRenderer? renderer;
  final bool hasVideo;

  /// Show the whole picture (a shared screen) instead of filling the frame.
  final bool contain;
  const RemoteVideo({super.key, required this.contact, this.speaking = false, this.renderer, this.hasVideo = false, this.contain = false});

  @override
  Widget build(BuildContext context) {
    final Widget content;
    if (renderer != null && hasVideo) {
      content = Container(
        color: const Color(0xFF1C1917),
        child: RTCVideoView(
          renderer!,
          objectFit: contain ? RTCVideoViewObjectFit.RTCVideoViewObjectFitContain : RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
        ),
      );
    } else {
      content = Container(
        color: const Color(0xFF292524),
        alignment: Alignment.center,
        child: Avatar(name: contact.name, size: 120, ringColor: speaking ? Brand.marigold400 : null),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        Semantics(label: '${contact.name}\u2019s video', image: true, child: content),
        if (speaking)
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(border: Border.all(color: Brand.marigold400, width: 3), borderRadius: BorderRadius.circular(18)),
            ),
          ),
      ],
    );
  }
}
