import 'package:flutter/material.dart';
import '../core/app_colors.dart';
import '../widgets/ntsa_logo.dart';
import 'auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingPage {
  const _OnboardingPage(this.image, this.title, this.description);
  final String image;
  final String title;
  final String description;
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _pages = [
    _OnboardingPage('assets/images/onboarding_shop.png', 'Shop Everything', 'From electronics to groceries, fashion to furniture — all in one app.'),
    _OnboardingPage('assets/images/onboarding_deals.png', 'Unbeatable Deals', 'Best prices, exclusive offers and exciting discounts everyday.'),
    _OnboardingPage('assets/images/onboarding_delivery.png', 'Fast & Reliable Delivery', 'Your favorites, delivered with care — right to your doorstep.'),
  ];

  void _goToLogin() => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));

  @override
  Widget build(BuildContext context) {
    final isLast = _page == _pages.length - 1;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const NtsaLogo(size: 22),
                  TextButton(onPressed: _goToLogin, child: Text('Skip', style: TextStyle(color: AppColors.textMuted))),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) {
                  final page = _pages[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(height: 220, child: Image.asset(page.image, fit: BoxFit.contain)),
                        const SizedBox(height: 28),
                        Text(page.title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 12),
                        Text(page.description, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.5)),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _page ? 20 : 7,
                    height: 7,
                    decoration: BoxDecoration(color: i == _page ? AppColors.orange : AppColors.border, borderRadius: BorderRadius.circular(4)),
                  )),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Align(
                alignment: Alignment.centerRight,
                child: FloatingActionButton(
                  backgroundColor: AppColors.navy,
                  onPressed: () {
                    if (isLast) {
                      _goToLogin();
                    } else {
                      _controller.nextPage(duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
                    }
                  },
                  child: Icon(isLast ? Icons.check : Icons.arrow_forward_rounded, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
