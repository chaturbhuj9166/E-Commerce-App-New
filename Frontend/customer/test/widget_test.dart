import 'package:flutter_test/flutter_test.dart';

import 'package:ntsa_customer/main.dart';

void main() {
  testWidgets('App boots to the splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const NtsaApp());
    expect(find.text('NTSA'), findsOneWidget);
  });
}
