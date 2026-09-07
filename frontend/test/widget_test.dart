import 'package:flutter_test/flutter_test.dart';

import 'package:boloai_app/main.dart';

void main() {
  testWidgets('SplashScreen shows BoloAI branding', (WidgetTester tester) async {
    await tester.pumpWidget(const BoloAIApp());

    expect(find.text('BoloAI'), findsOneWidget);
    expect(find.text('Your Voice, Any Language.'), findsOneWidget);
  });
}
