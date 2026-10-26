import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ntsa_customer/l10n/app_languages.dart';
import 'package:ntsa_customer/l10n/translations.dart';
import 'package:ntsa_customer/providers/locale_provider.dart';
import 'package:ntsa_customer/screens/language/language_select_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _app({WidgetBuilder? next}) => ChangeNotifierProvider(
      create: (_) => LocaleProvider(),
      child: Consumer<LocaleProvider>(
        builder: (context, locale, _) => MaterialApp(
          locale: locale.locale,
          supportedLocales: [for (final l in kLanguages) Locale(l.code)],
          localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
          home: LanguageSelectScreen(next: next),
        ),
      ),
    );

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('tapping a language switches the whole screen to it, and it is remembered', (tester) async {
    await tester.pumpWidget(_app(next: (_) => const Scaffold(body: Text('HOME'))));
    await tester.pumpAndSettle();
    expect(find.text('Choose your language'), findsOneWidget);

    await tester.tap(find.text('हिन्दी'));
    await tester.pumpAndSettle();
    expect(find.text('Choose your language'), findsNothing);
    expect(find.text(kTranslations['hi']!['lang.choose_title']!), findsOneWidget);
    expect((await SharedPreferences.getInstance()).getString('ntsa-language'), 'hi');

    // Continue lands on the screen that follows sign-in.
    await tester.tap(find.text(kTranslations['hi']!['lang.continue']!));
    await tester.pumpAndSettle();
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('search finds a language by its native or English name', (tester) async {
    await tester.pumpWidget(_app(next: (_) => const SizedBox()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'tamil');
    await tester.pumpAndSettle();
    expect(find.text('தமிழ்'), findsOneWidget);
    expect(find.text('हिन्दी'), findsNothing);

    await tester.enterText(find.byType(TextField), 'zzzz');
    await tester.pumpAndSettle();
    expect(find.text('No language found'), findsOneWidget);
  });

  testWidgets('Arabic flips the layout to right-to-left', (tester) async {
    await tester.pumpWidget(_app(next: (_) => const SizedBox()));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'arabic');
    await tester.pumpAndSettle();
    await tester.tap(find.text('العربية'));
    await tester.pumpAndSettle();
    expect(Directionality.of(tester.element(find.byType(LanguageSelectScreen))), TextDirection.rtl);
    expect(find.text(kTranslations['ar']!['lang.choose_title']!), findsOneWidget);
  });
}
