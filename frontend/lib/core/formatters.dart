import 'dart:math';

/// 762s → "12:42", 3725s → "1:02:05"
String formatDuration(Duration d) {
  String two(int n) => n.toString().padLeft(2, '0');
  final h = d.inHours;
  final m = d.inMinutes.remainder(60);
  final s = d.inSeconds.remainder(60);
  return h > 0 ? '$h:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// "Today", "Yesterday" or "Sep 26, 2026"
String formatCallDate(DateTime t) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(t.year, t.month, t.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) return 'Today';
  if (diff == 1) return 'Yesterday';
  return '${_months[t.month - 1]} ${t.day}, ${t.year}';
}

/// "9:05 AM"
String formatTime(DateTime t) {
  final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final m = t.minute.toString().padLeft(2, '0');
  return '$h:$m ${t.hour < 12 ? 'AM' : 'PM'}';
}

/// "just now", "5m ago", "3h ago", "2d ago", then a date.
String formatRelative(DateTime t) {
  final diff = DateTime.now().difference(t);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inHours < 1) return '${diff.inMinutes}m ago';
  if (diff.inDays < 1) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatCallDate(t);
}

String greeting([DateTime? now]) {
  final h = (now ?? DateTime.now()).hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

final roomCodePattern = RegExp(r'^BOLO-\d{4}$');

String generateRoomCode() => 'BOLO-${1000 + Random().nextInt(9000)}';

/// Accepts "bolo 4829", "4829", "BOLO-4829" → "BOLO-4829".
String normalizeRoomCode(String input) {
  final cleaned = input.trim().toUpperCase().replaceAll(RegExp(r'\s+'), '');
  final digits = cleaned.replaceFirst(RegExp(r'^BOLO-?'), '');
  return RegExp(r'^\d{4}$').hasMatch(digits) ? 'BOLO-$digits' : cleaned;
}

final emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

class PasswordRule {
  final String label;
  final bool Function(String) test;
  const PasswordRule(this.label, this.test);
}

final passwordRules = [
  PasswordRule('At least 8 characters', (v) => v.length >= 8),
  PasswordRule('One uppercase letter', (v) => RegExp('[A-Z]').hasMatch(v)),
  PasswordRule('One number', (v) => RegExp(r'\d').hasMatch(v)),
  PasswordRule('One special character', (v) => RegExp('[^A-Za-z0-9]').hasMatch(v)),
];
