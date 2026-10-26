import 'package:flutter/material.dart';
import '../../core/app_colors.dart';
import '../../l10n/tr.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/bottom_nav_shell.dart';
import 'order_tracking_screen.dart';

class OrderPlacedScreen extends StatelessWidget {
  const OrderPlacedScreen({super.key, required this.orderId, this.continueLabel, this.onContinue});

  final String orderId;
  /// Overrides the default "Continue Shopping" label (null = default).
  final String? continueLabel;
  /// Defaults to popping back to the customer Home tab; the wholesale
  /// checkout flow passes its own callback to return to the vendor catalog.
  final VoidCallback? onContinue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                child: const Icon(Icons.check_rounded, color: Colors.white, size: 54),
              ),
              const SizedBox(height: 24),
              Text(context.tr('orders.placed.title'), textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(context.tr('orders.placed.thanks'), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5)),
              const SizedBox(height: 6),
              Text(context.tr('orders.placed.order_id', {'id': orderId.substring(0, orderId.length.clamp(0, 8)).toUpperCase()}), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 32),
              PrimaryButton(
                label: context.tr('orders.placed.track'),
                orange: true,
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderTrackingScreen(orderId: orderId))),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: onContinue ??
                    () => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const BottomNavShell()), (route) => false),
                child: Text(continueLabel ?? context.tr('orders.placed.continue')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
