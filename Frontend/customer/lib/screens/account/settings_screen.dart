import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/theme_provider.dart';
import 'about_screen.dart';
import 'account_settings_screen.dart';
import 'language_screen.dart';
import 'notification_preferences_screen.dart';
import 'privacy_policy_screen.dart';
import 'terms_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            // Not const: SettingsScreen already rebuilds on every dark-mode
            // toggle (it watches ThemeProvider above), but a `const` child
            // widget is the same canonicalized object every time, so Flutter
            // skips rebuilding it and its colors stay frozen from the first
            // render. Plain (non-const) instances re-render every time.
            _SettingsTile(icon: Icons.account_circle_outlined, label: 'Account Settings', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AccountSettingsScreen()))),
            _SettingsTile(icon: Icons.notifications_none_rounded, label: 'Notification Preferences', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationPreferencesScreen()))),
            _SettingsTile(icon: Icons.language_rounded, label: 'Language', trailing: 'English', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LanguageScreen()))),
            SwitchListTile(
              secondary: Icon(Icons.dark_mode_outlined, color: AppColors.iconAccent),
              title: Text('Dark Mode', style: TextStyle(color: AppColors.textPrimary)),
              value: theme.isDark,
              activeThumbColor: AppColors.orange,
              onChanged: (v) => context.read<ThemeProvider>().setDark(v),
            ),
            _SettingsTile(icon: Icons.privacy_tip_outlined, label: 'Privacy Policy', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()))),
            _SettingsTile(icon: Icons.description_outlined, label: 'Terms & Conditions', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TermsScreen()))),
            _SettingsTile(icon: Icons.info_outline_rounded, label: 'About NTSA', trailing: 'v1.0.0', onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AboutScreen()))),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({required this.icon, required this.label, required this.onTap, this.trailing});
  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.iconAccent),
      title: Text(label, style: TextStyle(fontSize: 14, color: AppColors.textPrimary)),
      trailing: trailing != null
          ? Text(trailing!, style: TextStyle(color: AppColors.textMuted, fontSize: 12.5))
          : Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
      onTap: onTap,
    );
  }
}
