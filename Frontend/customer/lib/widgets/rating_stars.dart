import 'package:flutter/material.dart';
import '../core/app_colors.dart';

class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.rating, this.reviewCount, this.size = 13});

  final double? rating;
  final int? reviewCount;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (rating == null) return const SizedBox.shrink();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.star_rounded, color: AppColors.star, size: size + 3),
        const SizedBox(width: 2),
        Text(rating!.toStringAsFixed(1), style: TextStyle(fontSize: size, fontWeight: FontWeight.w600)),
        if (reviewCount != null) ...[
          const SizedBox(width: 3),
          Text('($reviewCount)', style: TextStyle(fontSize: size - 1, color: AppColors.textMuted)),
        ],
      ],
    );
  }
}
