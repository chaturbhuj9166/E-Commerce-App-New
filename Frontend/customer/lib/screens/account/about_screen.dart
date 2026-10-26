import 'package:flutter/material.dart';
import '../../l10n/tr.dart';
import '../../core/app_colors.dart';
import '../../widgets/ntsa_logo.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('account.about.title'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Center(child: NtsaLogo(size: 56)),
            const SizedBox(height: 12),
            Text(context.tr('account.about.tagline'), textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(context.tr('account.about.version', {'v': '1.0.0'}), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
            const SizedBox(height: 24),
            const Divider(),
            _row(context, context.tr('account.about.app_version'), '1.0.0'),
            _row(context, context.tr('account.about.platform'), 'Android'),
            const Divider(),
            const SizedBox(height: 12),
            Text(
              context.tr('account.about.description'),
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      );
}
