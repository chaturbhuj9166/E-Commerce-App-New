import 'package:flutter/material.dart';
import '../../core/app_colors.dart';
import '../../widgets/primary_button.dart';

/// No membership/subscription model exists in the Backend yet -- UI-only
/// preview of the "NTSA Gold" tier until that billing feature is scoped.
class PremiumScreen extends StatelessWidget {
  const PremiumScreen({super.key});

  static const _benefits = [
    'Free & Faster Delivery on all orders',
    'Exclusive Member Deals',
    'Early Access to Sales',
    'Extra Cashback',
    'Priority Customer Support',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NTSA Gold')),
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
                  const Text('NTSA Gold', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  const Text('More Shopping, More Benefits', style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                  const SizedBox(height: 18),
                  ..._benefits.map((b) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(children: [
                          const Icon(Icons.check_circle_rounded, color: AppColors.orange, size: 16),
                          const SizedBox(width: 8),
                          Expanded(child: Text(b, style: const TextStyle(color: Colors.white, fontSize: 13))),
                        ]),
                      )),
                  const SizedBox(height: 16),
                  const Text('₹999 / year', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Upgrade to Gold',
              orange: true,
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('NTSA Gold billing is coming soon'))),
            ),
          ],
        ),
      ),
    );
  }
}
