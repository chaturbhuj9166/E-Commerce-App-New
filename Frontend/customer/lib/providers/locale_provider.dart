import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../l10n/app_languages.dart';

/// Which language the app is showing, remembered on this device.
class LocaleProvider extends ChangeNotifier {
  static const _prefKey = 'ntsa-language';

  String _code = 'en';

  String get code => _code;
  Locale get locale => Locale(_code);
  AppLanguage get language => languageFor(_code);

  Future<void> restore() async {
    final saved = (await SharedPreferences.getInstance()).getString(_prefKey);
    if (saved != null && kLanguages.any((l) => l.code == saved) && saved != _code) {
      _code = saved;
      notifyListeners();
    }
  }

  Future<void> setLanguage(String code) async {
    if (!kLanguages.any((l) => l.code == code)) return;
    if (code != _code) {
      _code = code;
      notifyListeners();
    }
    await (await SharedPreferences.getInstance()).setString(_prefKey, code);
  }
}
