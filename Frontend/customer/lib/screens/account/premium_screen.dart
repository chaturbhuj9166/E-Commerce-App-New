import 'package:flutter/material.dart';
import '../../l10n/tr.dart';
import '../../core/app_colors.dart';
import '../../widgets/primary_button.dart';

/// No membership/subscription model exists in the Backend yet -- UI-only
/// preview of the "NTSA Gold" tier until that billing feature is scoped.
class PremiumScreen extends StatelessWidget {
  const PremiumScreen({super.key});

  static const _benefits = [
    'account.premium.benefit1',
    'account.premium.benefit2',
    'account.premium.benefit3',
    'account.premium.benefit4',
    'account.premium.benefit5',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('account.premium.title'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.navy, AppColors.navyDark], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.workspace_premium_rounded, color: AppColors.orange, size: 36),
                  const SizedBox(height: 10),
                  Text(context.tr('account.premium.title'), style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  Text(context.tr('account.premium.subtitle'), style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                  const SizedBox(height: 18),
                  ..._benefits.map((b) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(children: [
                          const Icon(Icons.check_circle_rounded, color: AppColors.orange, size: 16),
                          const SizedBox(width: 8),
                          Expanded(child: Text(context.tr(b), style: const TextStyle(color: Colors.white, fontSize: 13))),
                        ]),
                      )),
                  const SizedBox(height: 16),
                  Text(context.tr('account.premium.price_per_year', {'price': '₹999'}), style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: context.tr('account.premium.upgrade'),
              orange: true,
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.tr('account.premium.billing_soon')))),
            ),
          ],
        ),
      ),
    );
  }
}
