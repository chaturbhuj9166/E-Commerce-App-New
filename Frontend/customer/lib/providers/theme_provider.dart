import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/app_colors.dart';

/// Screen 24 in the layout is a dark-mode variant of Home; this provider
/// backs the "Dark Mode" toggle on the Settings screen (screen 23).
class ThemeProvider extends ChangeNotifier {
  bool isDark = false;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    isDark = prefs.getBool('ntsa-dark-mode') ?? false;
    AppColors.setDark(isDark);
    notifyListeners();
  }

  Future<void> setDark(bool value) async {
    isDark = value;
    AppColors.setDark(value);
    notifyListeners();
    (await SharedPreferences.getInstance()).setBool('ntsa-dark-mode', value);
  }
}
