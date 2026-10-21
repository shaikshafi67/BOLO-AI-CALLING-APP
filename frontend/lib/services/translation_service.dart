import '../config/supported_languages.dart';

/// Translation of final transcripts.
///
/// TODO: Connect Translation API — the backend calls Google Cloud Translation
/// for each final Speech-to-Text result and pushes
/// { originalText, translatedText, languages } to both participants over the
/// signaling socket. The call screen already renders that shape
/// (TranslationEntry).
class TranslationService {
  /// False until the AI pipeline is connected.
  bool get isAvailable => false;

  bool isLanguageSupported(String code) => supportedLanguages.any((l) => l.code == code);
}
