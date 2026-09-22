import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ntsa_customer/main.dart';

void main() {
  testWidgets('App boots to the splash screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const NtsaApp());
    // The logo is an image, so check the splash tagline instead.
    expect(find.text('Shop Smarter, Live Better'), findsOneWidget);
    // Let the splash delay run out (no stored session -> onboarding).
    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(seconds: 1));
  });
}
