import 'package:flutter/widgets.dart';
import 'app_strings.dart';

/// `context.tr('login.title')` gives the string in the language the app is
/// showing. `{name}` placeholders are filled from [args]:
///
///     context.tr('cart.items', {'n': '3'})   // "{n} items" -> "3 items"
///
/// It reads the locale through [Localizations], so every widget that calls it
/// rebuilds on its own when the shopper changes language -- no extra wiring.
/// A key missing in a language falls back to English, and a key missing
/// everywhere shows the key itself (easy to spot while developing).
extension AppTr on BuildContext {
  String tr(String key, [Map<String, String>? args]) =>
      AppStrings.lookup(Localizations.localeOf(this).languageCode, key, args);
}
