import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ShopProvider>().loadCategories());
  }

  @override
  Widget build(BuildContext context) {
    final categories = context.watch<ShopProvider>().categories;
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: !widget.embedded, title: const Text('All Categories')),
      body: SafeArea(
        child: categories.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () => context.read<ShopProvider>().loadCategories(),
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
