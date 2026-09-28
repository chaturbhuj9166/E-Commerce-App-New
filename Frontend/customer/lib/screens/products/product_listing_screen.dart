import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../models/product.dart';
import '../../providers/shop_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/product_card.dart';
import 'product_details_screen.dart';

enum _SortBy { relevance, priceLowHigh, priceHighLow, rating }

/// Popped by the Price sheet's "Clear" button -- real prices are never
/// negative, so this is unambiguous against an actual chosen range, and
/// against the plain `null` a dismissed (tapped outside) sheet pops.
const _clearPriceRange = RangeValues(-1, -1);

/// Matches [Product.conditionLabel] for a bare condition code, for the
/// filter chips, which only have the code (not a whole Product) to work with.
String _conditionLabel(String condition) => const {
      'REFURBISHED': 'Refurbished',
      'OPEN_BOX': 'Open box',
      'USED': 'Used',
    }[condition] ?? 'New';

/// What "Filter" narrows the list down to. Every field left at its default
/// (null / false) means "don't filter on this".
class _Filters {
  const _Filters({this.minRating, this.minDiscount, this.condition, this.inStockOnly = false});
  final double? minRating;
  final int? minDiscount;
  final String? condition;
  final bool inStockOnly;

  bool get isActive => minRating != null || minDiscount != null || condition != null || inStockOnly;

  bool matches(Product p) {
    if (minRating != null && (p.rating ?? 0) < minRating!) return false;
    if (minDiscount != null) {
      final mrp = p.mrpPaise;
      final discount = (mrp == null || mrp <= p.pricePaise) ? 0 : (((mrp - p.pricePaise) * 100) / mrp).round();
      if (discount < minDiscount!) return false;
    }
    if (condition != null && p.condition != condition) return false;
    if (inStockOnly && p.stock <= 0) return false;
    return true;
  }
}

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
  // What the server returned, untouched -- Price/Filter/Sort only ever
  // re-derive [_products] from this, so clearing a filter never needs a
  // re-fetch.
  List<Product> _fetched = [];
  List<Product> _products = [];
  bool _loading = true;
  String? _error;
  _SortBy _sort = _SortBy.relevance;
  RangeValues? _priceRange;
  _Filters _filters = const _Filters();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final shop = context.read<ShopProvider>();
    try {
      final query = widget.searchQuery?.trim();
      final results = query != null || widget.categoryId != null
          ? await shop.searchProducts(query == null || query.length <= 100 ? query ?? '' : query.substring(0, 100), categoryId: widget.categoryId)
          : (widget.dealsOnly ? shop.deals : shop.latest);
      if (!mounted) return;
      // A copy, so sorting never reorders ShopProvider's own lists.
      setState(() => _fetched = List.of(results));
      _recompute();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleWishlist(String id) async {
    final error = await context.read<WishlistProvider>().toggleOrReport(id);
    if (error != null && mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
  }

  /// Filters, then sorts, [_fetched] into what is actually shown -- run
  /// again whenever the price range, the filter sheet or the sort changes.
  void _recompute() {
    setState(() {
      final range = _priceRange;
      _products = _fetched.where((p) {
        if (range != null && (p.pricePaise < range.start * 100 || p.pricePaise > range.end * 100)) return false;
        return _filters.matches(p);
      }).toList();
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
                        _recompute();
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChipButton(
                    label: _priceRange == null ? 'Price' : '₹${_priceRange!.start.round()} – ₹${_priceRange!.end.round()}',
                    icon: Icons.expand_more_rounded,
                    active: _priceRange != null,
                    onTap: () async {
                      final ceiling = _fetched.isEmpty ? 100000.0 : (_fetched.map((p) => p.pricePaise).reduce((a, b) => a > b ? a : b) / 100).ceilToDouble();
                      final chosen = await showModalBottomSheet<RangeValues>(
                        context: context,
                        isScrollControlled: true,
                        builder: (_) => _PriceSheet(ceiling: ceiling, current: _priceRange),
                      );
                      if (!context.mounted || chosen == null) return; // dismissed without choosing -- leave it as it was
                      setState(() => _priceRange = chosen == _clearPriceRange ? null : chosen);
                      _recompute();
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChipButton(
                    label: 'Filter',
                    icon: Icons.tune_rounded,
                    active: _filters.isActive,
                    onTap: () async {
                      final conditions = _fetched.map((p) => p.condition).where((c) => c != 'NEW').toSet();
                      final chosen = await showModalBottomSheet<_Filters>(
                        context: context,
                        isScrollControlled: true,
                        builder: (_) => _FilterSheet(current: _filters, availableConditions: conditions),
                      );
                      if (chosen != null) {
                        setState(() => _filters = chosen);
                        _recompute();
                      }
                    },
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(mainAxisSize: MainAxisSize.min, children: [
                            Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger))),
                            const SizedBox(height: 12),
                            OutlinedButton(onPressed: _fetch, child: const Text('Retry')),
                          ]),
                        )
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
                              onWishlist: () => _toggleWishlist(p.id),
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
  const _FilterChipButton({required this.label, required this.icon, this.onTap, this.active = false});
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  // Highlighted once a price range or a filter is actually applied, so the
  // chip itself shows something is narrowing the list.
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.navy : AppColors.textSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? AppColors.navy : AppColors.border),
          color: active ? AppColors.navy.withValues(alpha: 0.06) : null,
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: active ? AppColors.navy : null)),
          const SizedBox(width: 3),
          Icon(icon, size: 16, color: color),
        ]),
      ),
    );
  }
}

class _PriceSheet extends StatefulWidget {
  const _PriceSheet({required this.ceiling, required this.current});
  final double ceiling;
  final RangeValues? current;

  @override
  State<_PriceSheet> createState() => _PriceSheetState();
}

class _PriceSheetState extends State<_PriceSheet> {
  late RangeValues _range = widget.current ?? RangeValues(0, widget.ceiling);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Price range', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                Text('₹${_range.start.round()} – ₹${_range.end.round()}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
              ],
            ),
            RangeSlider(
              values: _range,
              min: 0,
              max: widget.ceiling <= 0 ? 1 : widget.ceiling,
              divisions: 20,
              activeColor: AppColors.navy,
              labels: RangeLabels('₹${_range.start.round()}', '₹${_range.end.round()}'),
              onChanged: (v) => setState(() => _range = v),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (widget.current != null)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(_clearPriceRange),
                      child: const Text('Clear'),
                    ),
                  ),
                if (widget.current != null) const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
                    onPressed: () => Navigator.of(context).pop(_range),
                    child: const Text('Apply'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.current, required this.availableConditions});
  final _Filters current;
  // Only the conditions actually present among the results on screen are
  // offered -- a Grocery listing has no "Refurbished" item to filter to.
  final Set<String> availableConditions;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late double? _minRating = widget.current.minRating;
  late int? _minDiscount = widget.current.minDiscount;
  late String? _condition = widget.current.condition;
  late bool _inStockOnly = widget.current.inStockOnly;

  @override
  Widget build(BuildContext context) {
    Widget section(String title, Widget child) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              child,
            ],
          ),
        );
    Widget chip(String label, bool selected, VoidCallback onTap) => ChoiceChip(
          label: Text(label),
          selected: selected,
          onSelected: (_) => onTap(),
          selectedColor: AppColors.navy.withValues(alpha: 0.12),
          labelStyle: TextStyle(color: selected ? AppColors.navy : AppColors.textPrimary, fontWeight: selected ? FontWeight.w600 : FontWeight.w400),
          side: BorderSide(color: selected ? AppColors.navy : AppColors.border),
        );

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Filter', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            section(
              'Customer rating',
              Wrap(spacing: 8, children: [
                chip('Any', _minRating == null, () => setState(() => _minRating = null)),
                chip('4★ & up', _minRating == 4, () => setState(() => _minRating = 4)),
                chip('3★ & up', _minRating == 3, () => setState(() => _minRating = 3)),
              ]),
            ),
            section(
              'Discount',
              Wrap(spacing: 8, children: [
                chip('Any', _minDiscount == null, () => setState(() => _minDiscount = null)),
                chip('25% or more', _minDiscount == 25, () => setState(() => _minDiscount = 25)),
                chip('50% or more', _minDiscount == 50, () => setState(() => _minDiscount = 50)),
              ]),
            ),
            if (widget.availableConditions.isNotEmpty)
              section(
                'Condition',
                Wrap(spacing: 8, children: [
                  chip('Any', _condition == null, () => setState(() => _condition = null)),
                  for (final c in widget.availableConditions)
                    chip(_conditionLabel(c), _condition == c, () => setState(() => _condition = c)),
                ]),
              ),
            CheckboxListTile(
              value: _inStockOnly,
              onChanged: (v) => setState(() => _inStockOnly = v ?? false),
              title: const Text('In stock only', style: TextStyle(fontSize: 13.5)),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.navy,
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(const _Filters()),
                    child: const Text('Clear all'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
                    onPressed: () => Navigator.of(context).pop(_Filters(minRating: _minRating, minDiscount: _minDiscount, condition: _condition, inStockOnly: _inStockOnly)),
                    child: const Text('Apply'),
                  ),
                ),
              ],
            ),
          ],
        ),
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
      child: RadioGroup<_SortBy>(
        groupValue: current,
        onChanged: (v) => Navigator.of(context).pop(v),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: labels.entries.map((e) => RadioListTile<_SortBy>(value: e.key, title: Text(e.value), activeColor: AppColors.navy)).toList(),
        ),
      ),
    );
  }
}
