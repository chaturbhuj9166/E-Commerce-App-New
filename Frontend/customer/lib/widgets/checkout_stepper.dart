import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class CheckoutStepper extends StatelessWidget {
  const CheckoutStepper({super.key, required this.step});

  /// 1 = Address, 2 = Payment, 3 = Review.
  final int step;

  static const _labels = ['Address', 'Payment', 'Review'];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      child: Column(
        children: [
          Row(
            children: List.generate(3, (i) {
              final n = i + 1;
              final done = n < step;
              final active = n == step;
              final color = done || active ? AppColors.navy : AppColors.border;
              return Expanded(
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 13,
                      backgroundColor: color,
                      child: done
                          ? const Icon(Icons.check, size: 14, color: Colors.white)
                          : Text('$n', style: TextStyle(color: active ? Colors.white : AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                    if (n != 3) Expanded(child: Container(height: 2, color: done ? AppColors.navy : AppColors.border)),
                  ],
                ),
              );
            }),
          ),
          const SizedBox(height: 6),
          Row(
            children: _labels.asMap().entries.map((e) {
              final n = e.key + 1;
              return Expanded(
                child: Text(
                  e.value,
                  textAlign: n == 1 ? TextAlign.left : (n == 3 ? TextAlign.right : TextAlign.center),
                  style: TextStyle(fontSize: 11.5, fontWeight: n == step ? FontWeight.w600 : FontWeight.w400, color: n == step ? AppColors.navy : AppColors.textMuted),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
