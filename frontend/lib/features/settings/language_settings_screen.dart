import 'package:flutter/material.dart';
import '../../config/supported_languages.dart';

class LanguageSettingsScreen extends StatefulWidget {
  const LanguageSettingsScreen({super.key});

  @override
  State<LanguageSettingsScreen> createState() => _LanguageSettingsScreenState();
}

class _LanguageSettingsScreenState extends State<LanguageSettingsScreen> {
  String _selected = supportedLanguages.first.code;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Language settings')),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Choose your preferred language. This is used as your default in new calls and can be changed per call.'),
          ),
          RadioGroup<String>(
            groupValue: _selected,
            onChanged: (value) {
              setState(() => _selected = value ?? _selected);
              // TODO(Phase 4): persist preferredLanguage to backend/user profile.
            },
            child: Column(
              children: supportedLanguages
                  .map((lang) => RadioListTile<String>(value: lang.code, title: Text(lang.label)))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}
