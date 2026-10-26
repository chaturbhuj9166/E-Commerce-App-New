import 'en/all.dart';
import 'translations.dart';

class AppStrings {
  /// Looks [key] up in [lang], then English, then falls back to the key.
  static String lookup(String lang, String key, [Map<String, String>? args]) {
    var text = kTranslations[lang]?[key] ?? kEnglish[key] ?? key;
    if (args != null) {
      args.forEach((name, value) => text = text.replaceAll('{$name}', value));
    }
    return text;
  }
}
