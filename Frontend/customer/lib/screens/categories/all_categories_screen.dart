import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/shop_provider.dart';
import '../../widgets/category_icon.dart';
import '../products/product_listing_screen.dart';

class AllCategoriesScreen extends StatefulWidget {
  const AllCategoriesScreen({super.key, this.embedded = false});

  /// true when hosted as a bottom-nav tab (screen 7); false when pushed on
  /// top of another screen, where it needs its own back arrow.
  final bool embedded;

  @override
  State<AllCategoriesScreen> createState() => _AllCategoriesScreenState();
}

class _AllCategoriesScreenState extends State<AllCategoriesScreen> {
  @override
  void initState() {
    super.initState();
    // Always refetch (not just when empty) -- a category the admin just
    // added wouldn't otherwise show up until the whole app restarts, since
    // ShopProvider's list is loaded once and cached in memory.
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ShopProvider>().loadCategories());
  }

  @override
  Widget build(BuildContext context) {
    final categories = context.watch<ShopProvider>().categories;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !widget.embedded,
        title: const Text('All Categories'),
      ),
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
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductListingScreen(title: c.name, categoryId: c.id))),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
