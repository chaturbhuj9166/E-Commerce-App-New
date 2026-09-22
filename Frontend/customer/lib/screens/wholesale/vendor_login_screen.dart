import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/vendor_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/primary_button.dart';
import 'wholesale_home_screen.dart';

/// Gate in front of the wholesale catalog. The ID/password here is issued by
/// the super admin (Backend POST /admin/vendors) only after verifying the
/// buyer personally/by call, per the client's brief -- this screen doesn't
/// let anyone self-register as a wholesaler.
class VendorLoginScreen extends StatefulWidget {
  const VendorLoginScreen({super.key});

  @override
  State<VendorLoginScreen> createState() => _VendorLoginScreenState();
}

class _VendorLoginScreenState extends State<VendorLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final vendor = context.read<VendorProvider>();
    final ok = await vendor.login(_username.text, _password.text);
    if (!mounted) return;
    if (ok) {
      // The vendor token now replaces the customer's, so drop retail state
      // and the retail shell underneath instead of leaving them reachable.
      context.read<CartProvider>().clear();
      context.read<WishlistProvider>().clear();
      context.read<AuthProvider>().clearUser();
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const WholesaleHomeScreen()), (_) => false);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(vendor.error ?? 'Login failed')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<VendorProvider>().loading;
    return Scaffold(
      appBar: AppBar(title: const Text('Wholesale Login')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 12),
              Icon(Icons.storefront_rounded, size: 56, color: AppColors.navy),
              const SizedBox(height: 16),
              const Text('Wholesale Buyer Login', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(
                'Use the ID and password given to you by NTSA after verification. Don\'t have one yet? Contact NTSA support to register as a wholesale buyer.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 28),
              TextFormField(
                controller: _username,
                decoration: const InputDecoration(labelText: 'Wholesale ID', prefixIcon: Icon(Icons.badge_outlined)),
                validator: (v) => v!.trim().isEmpty ? 'Enter your wholesale ID' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                validator: (v) => v!.isEmpty ? 'Enter your password' : null,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              PrimaryButton(label: 'Login', loading: loading, onPressed: _submit),
            ],
          ),
        ),
      ),
    );
  }
}
