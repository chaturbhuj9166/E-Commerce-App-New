import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/vendor_provider.dart';
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
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  Future<void> _submit() async {
    final vendor = context.read<VendorProvider>();
    final ok = await vendor.login(_username.text, _password.text);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const WholesaleHomeScreen()));
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
            TextField(controller: _username, decoration: const InputDecoration(labelText: 'Wholesale ID', prefixIcon: Icon(Icons.badge_outlined))),
            const SizedBox(height: 14),
            TextField(
              controller: _password,
              obscureText: _obscure,
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
    );
  }
}
