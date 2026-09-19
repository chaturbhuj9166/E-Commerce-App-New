import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/shop_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/product_card.dart';
import 'product_details_screen.dart';

enum _SortBy { relevance, priceLowHigh, priceHighLow, rating }

class ProductListingScreen extends StatefulWidget {
  const ProductListingScreen({super.key, required this.title, this.categoryId, this.dealsOnly = false, this.searchQuery});

  final String title;
  final String? categoryId;
  final bool dealsOnly;
  final String? searchQuery;

  @override
  State<ProductListingScreen> createState() => _ProductListingScreenState();
}

class _ProductListingScreenState extends State<ProductListingScreen> {
  List<Product> _products = [];
  bool _loading = true;
  _SortBy _sort = _SortBy.relevance;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    final shop = context.read<ShopProvider>();
    var results = widget.searchQuery != null || widget.categoryId != null
        ? await shop.searchProducts(widget.searchQuery ?? '', categoryId: widget.categoryId)
        : (widget.dealsOnly ? shop.deals : shop.latest);
    if (widget.dealsOnly && widget.categoryId == null && widget.searchQuery == null) results = shop.deals;
    setState(() {
      _products = results;
      _loading = false;
    });
    _applySort();
  }

  void _applySort() {
    setState(() {
      switch (_sort) {
        case _SortBy.priceLowHigh:
          _products.sort((a, b) => a.pricePaise.compareTo(b.pricePaise));
        case _SortBy.priceHighLow:
          _products.sort((a, b) => b.pricePaise.compareTo(a.pricePaise));
        case _SortBy.rating:
          _products.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
        case _SortBy.relevance:
          break;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = context.watch<WishlistProvider>();
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
              child: Row(
                children: [
                  _FilterChipButton(
                    label: 'Sort',
                    icon: Icons.swap_vert_rounded,
                    onTap: () async {
                      final choice = await showModalBottomSheet<_SortBy>(
                        context: context,
                        builder: (_) => _SortSheet(current: _sort),
                      );
                      if (choice != null) {
                        _sort = choice;
                        _applySort();
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  const _FilterChipButton(label: 'Price', icon: Icons.expand_more_rounded),
                  const SizedBox(width: 8),
                  const _FilterChipButton(label: 'Filter', icon: Icons.tune_rounded),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _products.isEmpty
                      ? Center(child: Text('No products found', style: TextStyle(color: AppColors.textMuted)))
                      : GridView.builder(
                          padding: const EdgeInsets.all(14),
                          itemCount: _products.length,
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.63),
                          itemBuilder: (context, i) {
                            final p = _products[i];
                            return ProductCard(
                              product: p,
                              wished: wishlist.contains(p.id),
                              onWishlist: () => context.read<WishlistProvider>().toggle(p.id),
                              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: p.id))),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({required this.label, required this.icon, this.onTap});
  final String label;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500)),
          const SizedBox(width: 3),
          Icon(icon, size: 16, color: AppColors.textSecondary),
        ]),
      ),
    );
  }
}

class _SortSheet extends StatelessWidget {
  const _SortSheet({required this.current});
  final _SortBy current;

  @override
  Widget build(BuildContext context) {
    const labels = {
      _SortBy.relevance: 'Relevance',
      _SortBy.priceLowHigh: 'Price: Low to High',
      _SortBy.priceHighLow: 'Price: High to Low',
      _SortBy.rating: 'Customer Rating',
    };
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: labels.entries
            .map((e) => RadioListTile<_SortBy>(
                  value: e.key,
                  groupValue: current,
                  title: Text(e.value),
                  activeColor: AppColors.navy,
                  onChanged: (v) => Navigator.of(context).pop(v),
                ))
            .toList(),
      ),
    );
  }
}
