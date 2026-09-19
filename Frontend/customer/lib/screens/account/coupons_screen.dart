import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/shop_provider.dart';

class CouponsScreen extends StatefulWidget {
  const CouponsScreen({super.key});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ShopProvider>().loadCoupons());
  }

  @override
  Widget build(BuildContext context) {
    final shop = context.watch<ShopProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Offers & Coupons')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => context.read<ShopProvider>().loadCoupons(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('MEGA SALE', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                    const Text('Use a coupon at checkout', style: TextStyle(color: AppColors.orange, fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.orange, minimumSize: const Size(110, 36)),
                      child: const Text('Shop Now'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const Text('Available Coupons', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 10),
              if (shop.coupons.isEmpty)
                Padding(padding: const EdgeInsets.symmetric(vertical: 20), child: Text('No active coupons right now. Check back soon!', style: TextStyle(color: AppColors.textMuted))),
              ...shop.coupons.map((c) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                    child: Row(
                      children: [
                        const Icon(Icons.local_offer_rounded, color: AppColors.orange),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c.code, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                              Text(c.description.isNotEmpty ? c.description : c.summary, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: c.code));
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Coupon code copied')));
                          },
                          child: const Text('Copy'),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}
