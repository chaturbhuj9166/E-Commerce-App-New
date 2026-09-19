import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/vendor_provider.dart';
import '../../widgets/wholesale_product_grid.dart';
import 'wholesale_product_details_screen.dart';

class WholesaleCategoryProductsScreen extends StatelessWidget {
  const WholesaleCategoryProductsScreen({super.key, required this.categoryId, required this.title});

  final String categoryId;
  final String title;

  @override
  Widget build(BuildContext context) {
    final products = context.watch<VendorProvider>().products.where((p) => p.category?.id == categoryId).toList();
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: SingleChildScrollView(
          child: WholesaleProductGrid(
            products: products,
            onTapProduct: (p) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => WholesaleProductDetailsScreen(product: p))),
          ),
        ),
      ),
    );
  }
}
