import 'package:flutter/material.dart';
import '../../core/app_colors.dart';

/// Shared layout for the Privacy Policy and Terms & Conditions screens.
class LegalTextScreen extends StatelessWidget {
  const LegalTextScreen({super.key, required this.title, required this.sections});

  final String title;
  final List<(String heading, String body)> sections;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: AppColors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Text(
                'Draft placeholder -- have this reviewed by a legal advisor before the app goes live.',
                style: const TextStyle(color: AppColors.orangeDark, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
            for (final (heading, body) in sections) ...[
              Text(heading, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 6),
              Text(body, style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.5)),
              const SizedBox(height: 18),
            ],
          ],
        ),
      ),
    );
  }
}
