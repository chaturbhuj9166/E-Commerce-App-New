import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/shop_provider.dart';
import '../../widgets/category_icon.dart';
import 'wholesale_category_products_screen.dart';

class WholesaleCategoriesScreen extends StatefulWidget {
  const WholesaleCategoriesScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<WholesaleCategoriesScreen> createState() => _WholesaleCategoriesScreenState();
}

class _WholesaleCategoriesScreenState extends State<WholesaleCategoriesScreen> {
  bool _loaded = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final shop = context.read<ShopProvider>();
    String? error;
    try {
      await shop.loadCategories();
      error = shop.categoriesError;
    } catch (e) {
      error = e.toString();
    }
    if (mounted) {
      setState(() {
        _loaded = true;
        _error = error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = context.watch<ShopProvider>().categories;
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: const Text('All Categories')),
      body: SafeArea(
        child: categories.isEmpty
            ? Center(
                child: !_loaded
                    ? const CircularProgressIndicator()
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Text(_error ?? 'No categories available', textAlign: TextAlign.center, style: TextStyle(color: _error != null ? AppColors.danger : AppColors.textMuted)),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton(
                            onPressed: () {
                              setState(() => _loaded = false);
                              _load();
                            },
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: GridView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: categories.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, mainAxisSpacing: 18, crossAxisSpacing: 8, childAspectRatio: 0.85),
                  itemBuilder: (context, i) {
                    final c = categories[i];
                    return CategoryIcon(
                      icon: c.name.toLowerCase().replaceAll(' & ', '_').replaceAll(' ', '_'),
                      label: c.name,
                      size: 60,
                      onTap: () => Navigator.of(context)
                          .push(MaterialPageRoute(builder: (_) => WholesaleCategoryProductsScreen(categoryId: c.id, title: c.name))),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
