import 'package:flutter/material.dart';

/// Palette matched to the client-approved layout (REAL-NTSA-1.png).
///
/// Every screen was written against `AppColors.textPrimary` etc. as plain
/// color values. Rather than thread a BuildContext through 119 call sites to
/// pick a light/dark variant, these are getters backed by a single flag that
/// ThemeProvider flips -- every existing call site keeps working, and now
/// resolves to a color that's actually visible against the current
/// background. True brand colors (navy, orange, success...) are unaffected.
class AppColors {
  AppColors._();

  static bool _dark = false;
  static bool get isDark => _dark;
  static void setDark(bool value) => _dark = value;

  static const navy = Color(0xFF13224A);
  static const navyDark = Color(0xFF0C1730);
  static const orange = Color(0xFFF5841F);
  static const orangeDark = Color(0xFFE06D0A);

  static const success = Color(0xFF1FAA59);
  static const danger = Color(0xFFE1443C);
  static const star = Color(0xFFFFB800);

  // Fixed variants -- use these (not the adaptive getters below) when
  // building each named ThemeData in app_theme.dart, since that code must
  // describe "the light theme" and "the dark theme" independent of whichever
  // mode happens to be active when it runs.
  static const lightBackground = Color(0xFFF7F8FA);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightBorder = Color(0xFFE7E9EF);
  static const lightTextPrimary = Color(0xFF14172B);
  static const lightTextSecondary = Color(0xFF6B7280);
  static const lightTextMuted = Color(0xFF9CA3AF);

  static const darkBackground = Color(0xFF0B1220);
  static const darkSurface = Color(0xFF141C30);
  static const darkBorder = Color(0xFF232C42);
  static const darkTextSecondary = Color(0xFFB7BDCC);
  static const darkTextMuted = Color(0xFF8891A5);

  // Adaptive -- for screen/widget code, which should always reflect
  // whichever mode is currently active.
  static Color get background => _dark ? darkBackground : lightBackground;
  static Color get surface => _dark ? darkSurface : lightSurface;
  static Color get border => _dark ? darkBorder : lightBorder;
  static Color get textPrimary => _dark ? Colors.white : lightTextPrimary;
  static Color get textSecondary => _dark ? darkTextSecondary : lightTextSecondary;
  static Color get textMuted => _dark ? darkTextMuted : lightTextMuted;

  /// Small icon badges (category circles, etc.) are tinted navy on a light
  /// card; navy-on-near-black has no contrast, so dark mode swaps to orange.
  static Color get iconAccent => _dark ? orange : navy;
  static Color get iconAccentSoft => _dark ? orange.withValues(alpha: 0.16) : navy.withValues(alpha: 0.06);
}
