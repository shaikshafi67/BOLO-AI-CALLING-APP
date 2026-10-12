enum TranslationStatus { idle, processing, completed, unavailable }

/// One utterance moving through Speech-to-Text → Translation → Text-to-Speech.
class TranslationEntry {
  final String id;
  final bool isLocal;
  final String speakerName;
  final String sourceLanguage;
  final String targetLanguage;
  final String originalText;
  final String translatedText;
  final DateTime timestamp;

  const TranslationEntry({
    required this.id,
    required this.isLocal,
    required this.speakerName,
    required this.sourceLanguage,
    required this.targetLanguage,
    required this.originalText,
    required this.translatedText,
    required this.timestamp,
  });
}
