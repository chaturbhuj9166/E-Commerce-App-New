import 'package:flutter_test/flutter_test.dart';
import 'package:ntsa_customer/l10n/app_languages.dart';
import 'package:ntsa_customer/l10n/app_strings.dart';
import 'package:ntsa_customer/l10n/en/all.dart';
import 'package:ntsa_customer/l10n/translations.dart';

String placeholders(String s) => (RegExp(r'\{(\w+)\}').allMatches(s).map((m) => m.group(1)!).toList()..sort()).join(',');

void main() {
  final others = kLanguages.where((l) => l.code != 'en');

  test('English has no empty strings', () {
    expect(kEnglish.entries.where((e) => e.value.trim().isEmpty), isEmpty);
  });

  test('every listed language has a translation table', () {
    expect(others.where((l) => !kTranslations.containsKey(l.code)).map((l) => l.code), isEmpty);
  });

  for (final lang in others) {
    test('${lang.code} (${lang.englishName}) covers every key with matching placeholders', () {
      final table = kTranslations[lang.code]!;
      final missing = kEnglish.keys.where((k) => !table.containsKey(k)).toList();
      expect(missing, isEmpty, reason: '${lang.code} is missing ${missing.length} keys, e.g. ${missing.take(5)}');
      final unknown = table.keys.where((k) => !kEnglish.containsKey(k)).toList();
      expect(unknown, isEmpty, reason: '${lang.code} has keys that no longer exist: ${unknown.take(5)}');
      final broken = kEnglish.keys.where((k) => placeholders(table[k]!) != placeholders(kEnglish[k]!)).toList();
      expect(broken, isEmpty, reason: '${lang.code} placeholders differ in: ${broken.take(5)}');
    });
  }

  test('lookup fills placeholders, falls back to English, then to the key', () {
    expect(AppStrings.lookup('hi', 'lang.title'), isNot('Language'));
    expect(AppStrings.lookup('en', 'lang.changed', {'name': 'Hindi'}), 'Language changed to Hindi');
    expect(AppStrings.lookup('xx', 'lang.title'), 'Language');
    expect(AppStrings.lookup('hi', 'no.such.key'), 'no.such.key');
  });
}
