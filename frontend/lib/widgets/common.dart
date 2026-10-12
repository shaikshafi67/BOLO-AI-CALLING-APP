import 'package:flutter/material.dart';
import '../config/supported_languages.dart';
import '../core/theme.dart';

/// Page heading in the editorial serif, with optional subtitle and actions.
class PageHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  const PageHeader({super.key, required this.title, this.subtitle, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTheme.serif(36, color: context.colors.fg)),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(subtitle!, style: TextStyle(color: context.colors.muted, fontSize: 15)),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Small coloured caption above a section heading.
class Kicker extends StatelessWidget {
  final String text;
  const Kicker(this.text, {super.key});

  @override
  Widget build(BuildContext context) =>
      Text(text, style: TextStyle(color: context.accent, fontWeight: FontWeight.w600, fontSize: 13));
}

/// Bordered surface card.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  const AppCard({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
    );
  }
}

enum Tone { neutral, brand, success, warning, danger }

/// Pill-shaped status label: "Completed", "Missed", "UI ready"…
class StatusBadge extends StatelessWidget {
  final String label;
  final Tone tone;
  final IconData? icon;
  final bool dot;
  const StatusBadge(this.label, {super.key, this.tone = Tone.neutral, this.icon, this.dot = false});

  @override
  Widget build(BuildContext context) {
    final dark = context.isDark;
    final (bg, fg) = switch (tone) {
      Tone.brand => (dark ? const Color(0xFF1E2A55) : Brand.ink50, dark ? Brand.ink200 : Brand.ink700),
      Tone.success => (dark ? const Color(0xFF12301F) : const Color(0xFFDCFCE7), dark ? const Color(0xFF86EFAC) : const Color(0xFF166534)),
      Tone.warning => (dark ? const Color(0xFF3A2A0C) : Brand.marigold100, dark ? Brand.marigold300 : const Color(0xFF8A5203)),
      Tone.danger => (dark ? const Color(0xFF3B1414) : const Color(0xFFFEE2E2), dark ? const Color(0xFFFCA5A5) : const Color(0xFF991B1B)),
      Tone.neutral => (context.colors.surface2, context.colors.muted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(width: 6, height: 6, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
            const SizedBox(width: 6),
          ],
          if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)],
          Text(label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// "Backend coming soon" tag for features that need services not yet connected.
class ComingSoonTag extends StatelessWidget {
  final String label;
  const ComingSoonTag({super.key, this.label = 'Backend coming soon'});

  @override
  Widget build(BuildContext context) => StatusBadge(label, tone: Tone.warning, icon: Icons.construction_rounded);
}

/// Capstone honesty notice: marks simulated features.
class PrototypeNotice extends StatelessWidget {
  final String message;
  final String title;
  const PrototypeNotice({
    super.key,
    this.title = 'Prototype.',
    this.message = 'Calls, speech recognition, translation and voice are simulated with sample data. Backend integration is coming soon.',
  });

  @override
  Widget build(BuildContext context) {
    final dark = context.isDark;
    return Semantics(
      container: true,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: dark ? const Color(0xFF2A2010) : const Color(0xFFFFF8E8),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: dark ? const Color(0xFF5A4012) : const Color(0xFFF3D9A4)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.science_outlined, size: 18, color: dark ? Brand.marigold300 : const Color(0xFF8A5203)),
            const SizedBox(width: 10),
            Expanded(
              child: Text.rich(
                TextSpan(children: [
                  TextSpan(text: '$title ', style: const TextStyle(fontWeight: FontWeight.w700)),
                  TextSpan(text: message),
                ]),
                style: TextStyle(fontSize: 13, height: 1.4, color: dark ? const Color(0xFFF5DDB0) : const Color(0xFF6B4204)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Hindi → English"
class LanguagePairText extends StatelessWidget {
  final String from;
  final String to;
  final TextStyle? style;
  const LanguagePairText({super.key, required this.from, required this.to, this.style});

  @override
  Widget build(BuildContext context) {
    final s = style ?? TextStyle(color: context.colors.muted, fontSize: 14);
    return Text('${languageFor(from).label} → ${languageFor(to).label}', style: s);
  }
}

/// Language dropdown. Planned languages appear but are disabled unless [allowPlanned].
class LanguageDropdown extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final bool allowPlanned;
  final bool enabled;

  const LanguageDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.allowPlanned = false,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: allLanguages.any((l) => l.code == value) ? value : supportedLanguages.first.code,
      isExpanded: true,
      decoration: InputDecoration(labelText: label, prefixIcon: const Icon(Icons.translate_rounded, size: 20)),
      items: [
        for (final l in allLanguages)
          DropdownMenuItem(
            value: l.code,
            enabled: allowPlanned || l.isAvailable,
            child: Text(
              '${l.label} · ${l.nativeName}${l.isAvailable ? '' : '  (planned)'}',
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: allowPlanned || l.isAvailable ? null : context.colors.subtle),
            ),
          ),
      ],
      onChanged: enabled ? (v) => v == null ? null : onChanged(v) : null,
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.title, this.message, this.action});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(color: context.colors.surface2, borderRadius: BorderRadius.circular(16)),
            child: Icon(icon, color: context.colors.subtle),
          ),
          const SizedBox(height: 14),
          Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
          if (message != null) ...[
            const SizedBox(height: 4),
            Text(message!, style: TextStyle(color: context.colors.muted), textAlign: TextAlign.center),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    );
  }
}

/// Centers content and caps its width on tablets/desktop.
class ContentWidth extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  const ContentWidth({super.key, required this.child, this.maxWidth = 1100});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: child),
    );
  }
}

void showToast(BuildContext context, String message, {IconData icon = Icons.info_outline_rounded}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Row(children: [Icon(icon, color: Colors.white, size: 18), const SizedBox(width: 10), Expanded(child: Text(message))]),
        duration: const Duration(seconds: 3),
      ),
    );
}
