import 'package:flutter/material.dart';
import '../models/user.dart';

const _tones = [
  Color(0xFF2B49A8), // ink
  Color(0xFF0F766E), // teal
  Color(0xFFB45309), // amber
  Color(0xFFBE123C), // rose
  Color(0xFF0369A1), // sky
  Color(0xFF047857), // emerald
  Color(0xFFC2410C), // orange
];

/// Same muted colour for the same name every time.
Color toneFor(String name) {
  var hash = 0;
  for (final c in name.codeUnits) {
    hash = (hash * 31 + c) & 0x7fffffff;
  }
  return _tones[hash % _tones.length];
}

const presenceColors = {
  Presence.online: Color(0xFF22C55E),
  Presence.away: Color(0xFFF59E0B),
  Presence.busy: Color(0xFFEF4444),
  Presence.offline: Color(0xFFA8A29E),
};

const presenceLabels = {
  Presence.online: 'Online',
  Presence.away: 'Away',
  Presence.busy: 'Busy',
  Presence.offline: 'Offline',
};

/// Initials avatar, or a photo when [imageAsset] is given.
class Avatar extends StatelessWidget {
  final String name;
  final double size;
  final Presence? presence;
  final String? imageAsset;
  final Color? ringColor;

  const Avatar({super.key, required this.name, this.size = 40, this.presence, this.imageAsset, this.ringColor});

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
    return parts.map((p) => p[0].toUpperCase()).join();
  }

  @override
  Widget build(BuildContext context) {
    final dot = size * 0.28;
    return Semantics(
      label: presence == null ? name : '$name, ${presenceLabels[presence]}',
      image: true,
      excludeSemantics: true,
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: toneFor(name),
                border: ringColor == null ? null : Border.all(color: ringColor!, width: 2.5),
                image: imageAsset == null ? null : DecorationImage(image: AssetImage(imageAsset!), fit: BoxFit.cover),
              ),
              alignment: Alignment.center,
              child: imageAsset != null
                  ? null
                  : Text(
                      _initials,
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: size * 0.36),
                    ),
            ),
            if (presence != null)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: dot,
                  height: dot,
                  decoration: BoxDecoration(
                    color: presenceColors[presence],
                    shape: BoxShape.circle,
                    border: Border.all(color: Theme.of(context).colorScheme.surface, width: 2),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
