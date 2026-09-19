import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ntsa_logo.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/bottom_nav_shell.dart';

/// Real sign-in is Firebase phone-OTP / Google (Backend POST /auth/firebase).
/// The client hasn't handed over Firebase credentials yet, so every button
/// here signs in through the Backend's POST /auth/demo for now -- swap
/// _continue() for a real Firebase flow once those credentials arrive.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();

  Future<void> _continue({bool usePhone = false}) async {
    if (usePhone && _phone.text.trim().length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid mobile number')));
      return;
    }
    final auth = context.read<AuthProvider>();
    final ok = await auth.continueWithDemo(phone: usePhone ? _phone.text.trim() : null);
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const BottomNavShell()), (route) => false);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.error ?? 'Could not sign in')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthProvider>().loading;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: ListView(
            children: [
              const SizedBox(height: 32),
              const Center(child: NtsaLogo(size: 60)),
              const SizedBox(height: 32),
              const Text('Welcome Back!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Sign in to continue', style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 28),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(prefixText: '+91  ', hintText: 'Enter mobile number'),
              ),
              const SizedBox(height: 18),
              PrimaryButton(label: 'Send OTP', loading: loading, onPressed: () => _continue(usePhone: true)),
              const SizedBox(height: 20),
              Row(children: [
                const Expanded(child: Divider()),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child: Text('or continue with', style: TextStyle(color: AppColors.textMuted, fontSize: 12))),
                const Expanded(child: Divider()),
              ]),
              const SizedBox(height: 20),
              OutlinedTextButtonRow(icon: const Icon(Icons.g_mobiledata_rounded, size: 24, color: Colors.redAccent), label: 'Continue with Google', onPressed: _continue),
              const SizedBox(height: 12),
              OutlinedTextButtonRow(icon: const Icon(Icons.apple_rounded, size: 22), label: 'Continue with Apple', onPressed: _continue),
              const SizedBox(height: 24),
              Text(
                'By continuing you agree to our Terms & Privacy Policy',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
