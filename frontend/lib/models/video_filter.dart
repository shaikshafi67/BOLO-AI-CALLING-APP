/// Looks for your camera picture, applied to the video the other person sees.
enum VideoFilter {
  none('Original', null),
  natural('Natural', 'brightness(1.08) contrast(1.03) saturate(1.08)'),
  glow('Soft glow', 'brightness(1.12) contrast(0.97) saturate(1.05)'),
  warm('Warm', 'sepia(0.22) saturate(1.2) brightness(1.06)'),
  cool('Cool', 'hue-rotate(-12deg) saturate(1.05) brightness(1.06)'),
  vivid('Vivid', 'saturate(1.45) contrast(1.08)'),
  mono('B&W', 'grayscale(1) contrast(1.12)');

  const VideoFilter(this.label, this.css);

  final String label;

  /// CSS canvas filter for the colour adjustment (null: untouched).
  final String? css;

  /// Natural and Soft glow also smooth the picture slightly ("beauty" look).
  double get smoothing => switch (this) {
        VideoFilter.natural => 0.32,
        VideoFilter.glow => 0.45,
        _ => 0,
      };
}
