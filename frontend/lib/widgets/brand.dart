import 'package:flutter/material.dart';
import '../core/theme.dart';

/// The BoloAI mark: an ink speech bubble with a marigold sound wave.
/// Drawn in code (same shape as web/public/favicon.svg), so no image asset.
class LogoMark extends StatelessWidget {
  final double size;
  const LogoMark({super.key, this.size = 36});

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(dimension: size, child: CustomPaint(painter: _LogoPainter()));
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 40; // designed on a 40×40 grid
    canvas.drawRRect(
      RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(11 * s)),
      Paint()..color = Brand.ink700,
    );

    final bubble = Path()
      ..moveTo(14 * s, 10 * s)
      ..lineTo(26 * s, 10 * s)
      ..arcToPoint(Offset(30 * s, 14 * s), radius: Radius.circular(4 * s))
      ..lineTo(30 * s, 22 * s)
      ..arcToPoint(Offset(26 * s, 26 * s), radius: Radius.circular(4 * s))
      ..lineTo(20 * s, 26 * s)
      ..lineTo(14.5 * s, 30.5 * s)
      ..lineTo(14.5 * s, 26 * s)
      ..lineTo(14 * s, 26 * s)
      ..arcToPoint(Offset(10 * s, 22 * s), radius: Radius.circular(4 * s))
      ..lineTo(10 * s, 14 * s)
      ..arcToPoint(Offset(14 * s, 10 * s), radius: Radius.circular(4 * s))
      ..close();
    canvas.drawPath(bubble, Paint()..color = const Color(0xFFFAF7F2));

    final wave = Paint()
      ..color = Brand.marigold500
      ..strokeWidth = 2 * s
      ..strokeCap = StrokeCap.round;
    for (final (x, y1, y2) in [(15.5, 16.5, 18.5), (19.0, 14.5, 20.5), (22.5, 15.5, 19.5), (26.0, 17.0, 18.0)]) {
      canvas.drawLine(Offset(x * s, y1 * s), Offset(x * s, y2 * s), wave);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Logo extends StatelessWidget {
  final double size;
  final Color? textColor;
  const Logo({super.key, this.size = 34, this.textColor});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'BoloAI',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          LogoMark(size: size),
          SizedBox(width: size * 0.3),
          Text(
            'BoloAI',
            style: TextStyle(
              fontSize: size * 0.58,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              color: textColor ?? context.colors.fg,
            ),
          ),
        ],
      ),
    );
  }
}
