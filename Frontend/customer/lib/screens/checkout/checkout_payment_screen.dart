import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_colors.dart';
import '../../widgets/checkout_stepper.dart';
import '../../widgets/price_tag.dart';
import '../../widgets/primary_button.dart';
import 'order_summary_screen.dart';

enum PaymentMethod { razorpay, wallet, cod }

class CheckoutPaymentScreen extends StatefulWidget {
  const CheckoutPaymentScreen({super.key, required this.addressId});

  final String addressId;

  @override
  State<CheckoutPaymentScreen> createState() => _CheckoutPaymentScreenState();
}

class _CheckoutPaymentScreenState extends State<CheckoutPaymentScreen> {
  PaymentMethod _method = PaymentMethod.razorpay;
  int _walletBalance = 0;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.get('/wallet').then((data) {
      if (data != null && mounted) setState(() => _walletBalance = (data['balancePaise'] as num?)?.toInt() ?? 0);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SafeArea(
        child: Column(
          children: [
            const CheckoutStepper(step: 2),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Align(alignment: Alignment.centerLeft, child: Text('Select Payment Method', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _PaymentTile(
                    icon: Icons.qr_code_rounded,
                    title: 'UPI (Google Pay, PhonePe, etc.)',
                    selected: _method == PaymentMethod.razorpay,
                    onTap: () => setState(() => _method = PaymentMethod.razorpay),
                  ),
                  _PaymentTile(
                    icon: Icons.credit_card_rounded,
                    title: 'Credit / Debit Card',
                    selected: false,
                    onTap: () => setState(() => _method = PaymentMethod.razorpay),
                  ),
                  _PaymentTile(
                    icon: Icons.account_balance_rounded,
                    title: 'Net Banking',
                    selected: false,
                    onTap: () => setState(() => _method = PaymentMethod.razorpay),
                  ),
                  _PaymentTile(
                    icon: Icons.account_balance_wallet_rounded,
                    title: 'Wallet (NTSA Wallet)',
                    subtitle: 'Balance: ${formatPaise(_walletBalance)}',
                    selected: _method == PaymentMethod.wallet,
                    onTap: () => setState(() => _method = PaymentMethod.wallet),
                  ),
                  _PaymentTile(
                    icon: Icons.payments_outlined,
                    title: 'Cash on Delivery',
                    selected: _method == PaymentMethod.cod,
                    onTap: () => setState(() => _method = PaymentMethod.cod),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
                    child: const Row(children: [
                      Icon(Icons.verified_user_rounded, color: AppColors.success, size: 18),
                      SizedBox(width: 8),
                      Expanded(child: Text('100% Secure Payments — your data is always protected', style: TextStyle(fontSize: 12, color: AppColors.success))),
                    ]),
                  ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                child: PrimaryButton(
                  label: 'Continue',
                  orange: true,
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => OrderSummaryScreen(addressId: widget.addressId, method: _method),
                  )),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({required this.icon, required this.title, required this.selected, required this.onTap, this.subtitle});
  final IconData icon;
  final String title;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? AppColors.navy : AppColors.border, width: selected ? 1.6 : 1),
          ),
          child: Row(
            children: [
              Icon(icon, color: AppColors.navy, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                    if (subtitle != null) Text(subtitle!, style: TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
                  ],
                ),
              ),
              Icon(selected ? Icons.check_circle_rounded : Icons.circle_outlined, color: selected ? AppColors.navy : AppColors.border),
            ],
          ),
        ),
      ),
    );
  }
}
