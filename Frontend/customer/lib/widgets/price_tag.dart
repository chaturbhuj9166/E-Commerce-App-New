import 'package:flutter/material.dart';
import '../core/app_colors.dart';

/// Whole rupees print without decimals; anything with paise shows both
/// digits (rounding ₹99.50 up to ₹100 would misstate the price).
String formatPaise(int paise) => '${paise < 0 ? '-' : ''}₹${(paise.abs() / 100).toStringAsFixed(paise % 100 == 0 ? 0 : 2)}';

class PriceTag extends StatelessWidget {
  const PriceTag({super.key, required this.pricePaise, this.mrpPaise, this.size = 16});

  final int pricePaise;
  final int? mrpPaise;
  final double size;

  @override
  Widget build(BuildContext context) {
    final hasDiscount = mrpPaise != null && mrpPaise! > pricePaise;
    final percentOff = hasDiscount ? (((mrpPaise! - pricePaise) / mrpPaise!) * 100).round() : 0;
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      children: [
        Text(formatPaise(pricePaise), style: TextStyle(fontSize: size, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        if (hasDiscount)
          Text(
            formatPaise(mrpPaise!),
            style: TextStyle(fontSize: size - 3, color: AppColors.textMuted, decoration: TextDecoration.lineThrough),
          ),
        if (hasDiscount)
          Text('$percentOff% OFF', style: TextStyle(fontSize: size - 4, fontWeight: FontWeight.w700, color: AppColors.success)),
      ],
    );
  }
}
