import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../models/category.dart';

/// The client hasn't supplied per-category icon artwork, so each category
/// gets its own solid brand color (matching the multi-colored icon grid in
/// the approved layout) instead of a generic single-tint badge.
/// Backend stores a Material icon name string per category (e.g.
/// "electronics", "shopping_bag"). Keep this map in sync with whatever the
/// admin panel lets a super admin pick when creating a category.
IconData iconForCategory(String key) {
  switch (key) {
    case 'electronics':
      return Icons.devices_other_rounded;
    case 'fashion':
      return Icons.checkroom_rounded;
    case 'grocery':
      return Icons.local_grocery_store_rounded;
    case 'beauty':
      return Icons.face_retouching_natural_rounded;
    case 'home_kitchen':
    case 'home':
      return Icons.kitchen_rounded;
    case 'mobiles':
      return Icons.smartphone_rounded;
    case 'appliances':
      return Icons.blender_rounded;
    case 'furniture':
      return Icons.chair_rounded;
    case 'toys':
      return Icons.toys_rounded;
    case 'sports':
      return Icons.sports_basketball_rounded;
    case 'books':
      return Icons.menu_book_rounded;
    case 'health':
      return Icons.favorite_rounded;
    case 'shoes':
      return Icons.hiking_rounded;
    case 'lawn_garden':
    case 'garden':
      return Icons.yard_rounded;
    default:
      return Icons.shopping_bag_rounded;
  }
}

const Map<String, Color> _categoryColors = {
  'electronics': Color(0xFF3B82F6),
  'fashion': Color(0xFFEC4899),
  'grocery': Color(0xFF22C55E),
  'beauty': Color(0xFFA855F7),
  'home_kitchen': Color(0xFFF97316),
  'home': Color(0xFFF97316),
  'mobiles': Color(0xFF6366F1),
  'appliances': Color(0xFF14B8A6),
  'furniture': Color(0xFFB45309),
  'toys': Color(0xFFF43F5E),
  'sports': Color(0xFF10B981),
  'books': Color(0xFFEAB308),
  'health': Color(0xFFEF4444),
  'shoes': Color(0xFF0EA5E9),
  'lawn_garden': Color(0xFF16A34A),
  'garden': Color(0xFF16A34A),
};

Color colorForCategory(String key) => _categoryColors[key] ?? AppColors.iconAccent;

/// The admin-picked icon wins; 'shopping_bag' is the backend default (i.e.
/// nothing picked), so fall back to a key derived from the category name.
String categoryIconKey(ShopCategory c) =>
    c.icon.isNotEmpty && c.icon != 'shopping_bag' ? c.icon : c.name.toLowerCase().replaceAll(' & ', '_').replaceAll(' ', '_');

class CategoryIcon extends StatelessWidget {
  const CategoryIcon({super.key, required this.icon, required this.label, this.onTap, this.size = 52});

  final String icon;
  final String label;
  final VoidCallback? onTap;
  final double size;

  @override
  Widget build(BuildContext context) {
    final color = colorForCategory(icon);
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(color: color.withValues(alpha: AppColors.isDark ? 0.22 : 0.13), borderRadius: BorderRadius.circular(size * 0.3)),
            child: Icon(iconForCategory(icon), color: color, size: size * 0.46),
          ),
          const SizedBox(height: 6),
          SizedBox(
            width: size + 14,
            child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
