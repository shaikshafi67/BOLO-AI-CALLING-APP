import 'package:flutter/material.dart';

/// BoloAI brand palette. Mirrors the web app (web/src/index.css) so both
/// apps look like the same product: warm paper tones, one ink-blue brand
/// colour and a marigold accent. No gradients.
class Brand {
  static const ink50 = Color(0xFFEEF2FC);
  static const ink100 = Color(0xFFDCE4F8);
  static const ink200 = Color(0xFFB8C7F0);
  static const ink300 = Color(0xFF8EA4E3);
  static const ink400 = Color(0xFF6380D3);
  static const ink500 = Color(0xFF3F5FC2);
  static const ink600 = Color(0xFF2B49A8);
  static const ink700 = Color(0xFF1F3595);
  static const ink800 = Color(0xFF1B2C74);

  static const marigold100 = Color(0xFFFDF0D5);
  static const marigold300 = Color(0xFFF6C66B);
  static const marigold400 = Color(0xFFF0AD3A);
  static const marigold500 = Color(0xFFE8950F);
  static const marigold600 = Color(0xFFC27A08);

  static const success = Color(0xFF15803D);
  static const successBright = Color(0xFF22C55E);
  static const warning = Color(0xFFD97706);
  static const danger = Color(0xFFDC2626);

  /// The call screen is always dark, whatever the app theme.
  static const callBackground = Color(0xFF0C0A09);
  static const callSurface = Color(0xFF1C1917);
}

/// Font families bundled in assets/fonts (see pubspec.yaml).
class Fonts {
  static const sans = 'DMSans';
  static const serif = 'InstrumentSerif';
}

/// Neutral surface colours that change between light and dark mode.
/// Read them with `context.colors`.
@immutable
class BoloColors extends ThemeExtension<BoloColors> {
  final Color canvas;
  final Color surface;
  final Color surface2;
  final Color line;
  final Color fg;
  final Color muted;
  final Color subtle;

  const BoloColors({
    required this.canvas,
    required this.surface,
    required this.surface2,
    required this.line,
    required this.fg,
    required this.muted,
    required this.subtle,
  });

  static const light = BoloColors(
    canvas: Color(0xFFF8F5EF),
    surface: Color(0xFFFFFDF9),
    surface2: Color(0xFFF1ECE3),
    line: Color(0xFFE6DFD3),
    fg: Color(0xFF1C1917),
    muted: Color(0xFF57534E),
    subtle: Color(0xFF8A837A),
  );

  static const dark = BoloColors(
    canvas: Color(0xFF141311),
    surface: Color(0xFF1C1B18),
    surface2: Color(0xFF26241F),
    line: Color(0xFF34312B),
    fg: Color(0xFFF3EFE8),
    muted: Color(0xFFB3ACA1),
    subtle: Color(0xFF7D766C),
  );

  @override
  BoloColors copyWith({Color? canvas, Color? surface, Color? surface2, Color? line, Color? fg, Color? muted, Color? subtle}) {
    return BoloColors(
      canvas: canvas ?? this.canvas,
      surface: surface ?? this.surface,
      surface2: surface2 ?? this.surface2,
      line: line ?? this.line,
      fg: fg ?? this.fg,
      muted: muted ?? this.muted,
      subtle: subtle ?? this.subtle,
    );
  }

  @override
  BoloColors lerp(BoloColors? other, double t) {
    if (other == null) return this;
    return BoloColors(
      canvas: Color.lerp(canvas, other.canvas, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surface2: Color.lerp(surface2, other.surface2, t)!,
      line: Color.lerp(line, other.line, t)!,
      fg: Color.lerp(fg, other.fg, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      subtle: Color.lerp(subtle, other.subtle, t)!,
    );
  }
}

extension BoloThemeX on BuildContext {
  /// Falls back to the default palette when used outside AppTheme (e.g. in tests).
  BoloColors get colors => Theme.of(this).extension<BoloColors>() ?? (isDark ? BoloColors.dark : BoloColors.light);
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  /// Brand colour that stays readable on the current background.
  Color get brand => isDark ? Brand.ink300 : Brand.ink700;
  Color get accent => isDark ? Brand.marigold400 : Brand.marigold600;
}

class AppTheme {
  static ThemeData get light => _build(Brightness.light, BoloColors.light);
  static ThemeData get dark => _build(Brightness.dark, BoloColors.dark);

  /// Editorial serif used for big headlines only.
  static TextStyle serif(double size, {Color? color, bool italic = false, double height = 1.05}) => TextStyle(
        fontFamily: Fonts.serif,
        fontSize: size,
        height: height,
        letterSpacing: -0.3,
        fontWeight: FontWeight.w400,
        fontStyle: italic ? FontStyle.italic : FontStyle.normal,
        color: color,
      );

  static ThemeData _build(Brightness brightness, BoloColors c) {
    final isDark = brightness == Brightness.dark;
    final primary = isDark ? Brand.ink400 : Brand.ink700;

    final scheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: Colors.white,
      primaryContainer: isDark ? const Color(0xFF1E2A55) : Brand.ink50,
      onPrimaryContainer: isDark ? Brand.ink100 : Brand.ink800,
      secondary: Brand.marigold500,
      onSecondary: const Color(0xFF1C1917),
      secondaryContainer: isDark ? const Color(0xFF3A2A0C) : Brand.marigold100,
      onSecondaryContainer: isDark ? Brand.marigold300 : const Color(0xFF6B4204),
      error: Brand.danger,
      onError: Colors.white,
      surface: c.surface,
      onSurface: c.fg,
      onSurfaceVariant: c.muted,
      surfaceContainerLowest: c.canvas,
      surfaceContainerLow: c.surface,
      surfaceContainer: c.surface,
      surfaceContainerHigh: c.surface2,
      surfaceContainerHighest: c.surface2,
      outline: c.line,
      outlineVariant: c.line,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      fontFamily: Fonts.sans,
      scaffoldBackgroundColor: c.canvas,
      extensions: [c],
      splashFactory: InkSparkle.splashFactory,
    );

    final text = base.textTheme.apply(bodyColor: c.fg, displayColor: c.fg);
    final radius = BorderRadius.circular(10);

    return base.copyWith(
      textTheme: text.copyWith(
        titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.2),
        titleMedium: text.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        bodyMedium: text.bodyMedium?.copyWith(color: c.fg, height: 1.45),
        bodySmall: text.bodySmall?.copyWith(color: c.muted, height: 1.4),
        labelLarge: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: c.canvas,
        surfaceTintColor: Colors.transparent,
        foregroundColor: c.fg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(fontFamily: Fonts.sans, fontSize: 18, fontWeight: FontWeight.w600, color: c.fg),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: c.line)),
      ),
      dividerTheme: DividerThemeData(color: c.line, space: 1, thickness: 1),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 50),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontFamily: Fonts.sans, fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.fg,
          backgroundColor: c.surface,
          minimumSize: const Size(0, 50),
          padding: const EdgeInsets.symmetric(horizontal: 18),
          side: BorderSide(color: c.line),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontFamily: Fonts.sans, fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: isDark ? Brand.ink300 : Brand.ink700,
          textStyle: const TextStyle(fontFamily: Fonts.sans, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        hintStyle: TextStyle(color: c.subtle),
        labelStyle: TextStyle(color: c.muted),
        prefixIconColor: c.subtle,
        suffixIconColor: c.subtle,
        border: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: c.line)),
        enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: c.line)),
        focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: primary, width: 1.6)),
        errorBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Brand.danger)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: radius, borderSide: const BorderSide(color: Brand.danger, width: 1.6)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.white : c.subtle),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? primary : c.surface2),
        trackOutlineColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? primary : c.line),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: isDark ? const Color(0xFF1E2A55) : Brand.ink50,
        height: 68,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => TextStyle(
            fontFamily: Fonts.sans,
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
            color: s.contains(WidgetState.selected) ? c.fg : c.subtle,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(color: s.contains(WidgetState.selected) ? primary : c.subtle, size: 24),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: c.surface,
        indicatorColor: isDark ? const Color(0xFF1E2A55) : Brand.ink50,
        selectedIconTheme: IconThemeData(color: primary),
        unselectedIconTheme: IconThemeData(color: c.subtle),
        selectedLabelTextStyle: TextStyle(fontFamily: Fonts.sans, fontWeight: FontWeight.w600, color: c.fg),
        unselectedLabelTextStyle: TextStyle(fontFamily: Fonts.sans, color: c.muted),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? c.surface2 : const Color(0xFF292524),
        contentTextStyle: const TextStyle(fontFamily: Fonts.sans, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: c.surface,
        side: BorderSide(color: c.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: TextStyle(fontFamily: Fonts.sans, color: c.fg, fontWeight: FontWeight.w500),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
      ),
      dialogTheme: DialogThemeData(backgroundColor: c.surface, surfaceTintColor: Colors.transparent),
      listTileTheme: ListTileThemeData(iconColor: c.muted, textColor: c.fg),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(color: const Color(0xFF292524), borderRadius: BorderRadius.circular(6)),
        textStyle: const TextStyle(fontFamily: Fonts.sans, color: Colors.white, fontSize: 12),
      ),
    );
  }
}
