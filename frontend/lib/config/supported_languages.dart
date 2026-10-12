enum LanguageStatus { available, planned }

class AppLanguage {
  final String code;
  final String label;
  final String nativeName;
  final LanguageStatus status;

  const AppLanguage(this.code, this.label, this.nativeName, [this.status = LanguageStatus.available]);

  bool get isAvailable => status == LanguageStatus.available;
}

/// Languages the backend accepts today. Mirrors
/// backend/src/config/supportedLanguages.ts — keep both in sync.
const List<AppLanguage> supportedLanguages = [
  AppLanguage('en', 'English', 'English'),
  AppLanguage('hi', 'Hindi', 'हिन्दी'),
  AppLanguage('te', 'Telugu', 'తెలుగు'),
  AppLanguage('ta', 'Tamil', 'தமிழ்'),
];

/// Planned languages: shown in the UI as "Planned", not selectable for calls.
const List<AppLanguage> plannedLanguages = [
  AppLanguage('gu', 'Gujarati', 'ગુજરાતી', LanguageStatus.planned),
  AppLanguage('kn', 'Kannada', 'ಕನ್ನಡ', LanguageStatus.planned),
  AppLanguage('ml', 'Malayalam', 'മലയാളം', LanguageStatus.planned),
  AppLanguage('bn', 'Bengali', 'বাংলা', LanguageStatus.planned),
  AppLanguage('mr', 'Marathi', 'मराठी', LanguageStatus.planned),
];

const List<AppLanguage> allLanguages = [...supportedLanguages, ...plannedLanguages];

AppLanguage languageFor(String code) =>
    allLanguages.firstWhere((l) => l.code == code, orElse: () => supportedLanguages.first);
