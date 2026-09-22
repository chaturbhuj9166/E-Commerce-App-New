import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ntsa_logo.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/bottom_nav_shell.dart';
import 'otp_screen.dart';

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

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _continue({bool usePhone = false}) async {
    final phone = _phone.text.trim();
    // Indian mobile numbers: 10 digits starting with 6-9 (+91 is shown as a prefix).
    if (usePhone && !RegExp(r'^[6-9][0-9]{9}$').hasMatch(phone)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid 10-digit mobile number')));
      return;
    }
    final auth = context.read<AuthProvider>();
    if (usePhone) {
      final sent = await auth.requestOtp(phone);
      if (!mounted) return;
      if (sent == null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.error ?? 'Could not send OTP')));
        return;
      }
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => OtpScreen(phone: phone, demoOtp: sent['demoOtp'] as String?, resendInSeconds: (sent['resendInSeconds'] as num?)?.toInt() ?? 30)));
      return;
    }
    final ok = await auth.continueWithDemo();
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
              const Center(child: Text('Welcome Back!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800))),
              const SizedBox(height: 4),
              Center(child: Text('Sign in to continue', style: TextStyle(color: AppColors.textSecondary))),
              const SizedBox(height: 28),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                // prefixIcon rather than prefixText: prefixText only shows once the
                // field is focused, leaving a blank gap before the hint.
                decoration: const InputDecoration(
                  prefixIcon: Padding(padding: EdgeInsets.only(left: 16, right: 8), child: Text('+91', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
                  prefixIconConstraints: BoxConstraints(minWidth: 0, minHeight: 0),
                  hintText: 'Enter mobile number',
                  counterText: '',
                ),
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
