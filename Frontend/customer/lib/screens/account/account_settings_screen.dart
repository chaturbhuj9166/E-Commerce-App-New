import 'package:flutter/material.dart';
import '../../l10n/tr.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import 'edit_profile_screen.dart';

class AccountSettingsScreen extends StatelessWidget {
  const AccountSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('account.settings_page.title'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _row(context.tr('account.settings_page.name'), user?.name ?? context.tr('account.common.default_name')),
                  const Divider(height: 20),
                  _row(context.tr('account.settings_page.email'), user?.email ?? context.tr('account.settings_page.not_added')),
                  const Divider(height: 20),
                  _row(context.tr('account.settings_page.phone'), user?.phone ?? context.tr('account.settings_page.not_added')),
                ],
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EditProfileScreen())),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: Text(context.tr('account.settings_page.edit_name_photo')),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            ),
            const SizedBox(height: 24),
            Text(
              context.tr('account.settings_page.note'),
              style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          Flexible(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5))),
        ],
      );
}
