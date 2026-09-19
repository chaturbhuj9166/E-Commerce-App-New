import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/app_colors.dart';
import '../providers/auth_provider.dart';
import '../widgets/bottom_nav_shell.dart';
import '../widgets/ntsa_logo.dart';
import 'onboarding_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1400), _next);
  }

  Future<void> _next() async {
    final signedIn = await context.read<AuthProvider>().restoreSession();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(
      builder: (_) => signedIn ? const BottomNavShell() : const OnboardingScreen(),
    ));
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
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
