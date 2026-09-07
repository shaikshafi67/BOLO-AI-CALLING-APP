class AppLanguage {
  final String code;
  final String label;
  const AppLanguage(this.code, this.label);
}

/// Central list of languages BoloAI supports. Add new languages here only —
/// nothing else in the app should hard-code a language list.
const List<AppLanguage> supportedLanguages = [
  AppLanguage('en', 'English'),
  AppLanguage('hi', 'Hindi'),
  AppLanguage('te', 'Telugu'),
  AppLanguage('ta', 'Tamil'),
];
