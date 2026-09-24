import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../models/product.dart';
import 'app_network_image.dart';
import 'price_tag.dart';
import 'rating_stars.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, required this.onTap, this.onWishlist, this.wished = false});

  final Product product;
  final VoidCallback onTap;
  final VoidCallback? onWishlist;
  final bool wished;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                    child: SizedBox.expand(
                      child: product.image.isEmpty
                          ? Container(color: AppColors.background, child: Icon(Icons.image_outlined, color: AppColors.textMuted))
                          : AppNetworkImage(product.image, fit: BoxFit.cover),
                    ),
                  ),
                  if (!product.isNewStock)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(color: AppColors.orange, borderRadius: BorderRadius.circular(6)),
                        child: Text(product.conditionLabel, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: GestureDetector(
                      onTap: onWishlist,
                      child: CircleAvatar(
                        radius: 14,
                        backgroundColor: Colors.white,
                        child: Icon(wished ? Icons.favorite : Icons.favorite_border, size: 15, color: wished ? AppColors.danger : AppColors.textMuted),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 4),
                  PriceTag(pricePaise: product.pricePaise, mrpPaise: product.mrpPaise, size: 14),
                  if (product.rating != null) ...[
                    const SizedBox(height: 4),
                    RatingStars(rating: product.rating, reviewCount: product.reviewCount, size: 11),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
