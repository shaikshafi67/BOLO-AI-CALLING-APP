import 'package:flutter_test/flutter_test.dart';

import 'package:boloai_app/main.dart';

void main() {
  testWidgets('App boots to the splash screen with BoloAI branding', (WidgetTester tester) async {
    await tester.pumpWidget(const BoloAIApp());
    await tester.pump();

    expect(find.text('BoloAI'), findsOneWidget);
    expect(find.text('Your Voice, Any Language.'), findsOneWidget);

    // Let the splash screen's navigation timer fire so it doesn't leak past this test.
    await tester.pump(const Duration(milliseconds: 1300));
  });
}
