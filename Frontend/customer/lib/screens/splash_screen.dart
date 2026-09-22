import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../providers/auth_provider.dart';
import '../providers/vendor_provider.dart';
import '../widgets/bottom_nav_shell.dart';
import '../widgets/ntsa_logo.dart';
import 'onboarding_screen.dart';
import 'wholesale/wholesale_home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1400), _next);
  }

  Future<void> _next() async {
    if (_offline) setState(() => _offline = false);
    final vendor = context.read<VendorProvider>();
    Map<String, dynamic>? me;
    try {
      me = await context.read<AuthProvider>().restore();
    } catch (_) {
      // Server unreachable: keep the stored session and let the user retry.
      if (mounted) setState(() => _offline = true);
      return;
    }
    if (!mounted) return;
    final Widget next;
    if (me?['role'] == 'VENDOR') {
      vendor.restore(me!);
      next = const WholesaleHomeScreen();
    } else {
      next = me != null ? const BottomNavShell() : const OnboardingScreen();
    }
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => next));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/images/splash_background.png', fit: BoxFit.cover),
          ),
          SafeArea(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const NtsaLogo(light: true, size: 76),
                  const SizedBox(height: 8),
                  const Text('Shop Smarter, Live Better', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 40),
                  Text('Everything You Need\nIn One Place', textAlign: TextAlign.center, style: TextStyle(color: AppColors.orange, fontSize: 14, fontWeight: FontWeight.w600, height: 1.5)),
                  if (_offline) ...[
                    const SizedBox(height: 32),
                    const Text('Could not reach the NTSA server', style: TextStyle(color: Colors.white, fontSize: 13)),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: _next,
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white70)),
                      child: const Text('Retry'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
