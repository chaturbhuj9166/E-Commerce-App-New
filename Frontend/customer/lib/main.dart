import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_client.dart';
import 'core/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/shop_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/vendor_provider.dart';
import 'providers/wishlist_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/splash_screen.dart';

final navigatorKey = GlobalKey<NavigatorState>();
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

void main() {
  ApiClient.onUnauthorized = _sessionExpired;
  runApp(const NtsaApp());
}

bool _expiring = false;

/// A customer or vendor token expired / was revoked mid-session: drop all
/// session state and send the user back to sign in.
Future<void> _sessionExpired() async {
  final context = navigatorKey.currentContext;
  if (_expiring || context == null) return;
  _expiring = true;
  try {
    context.read<CartProvider>().clear();
    context.read<WishlistProvider>().clear();
    context.read<VendorProvider>().reset();
    final auth = context.read<AuthProvider>();
    await ApiClient.instance.clearCustomerToken();
    await auth.signOut();
    navigatorKey.currentState?.pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
    scaffoldMessengerKey.currentState?.showSnackBar(const SnackBar(content: Text('Session expired, please sign in again')));
  } finally {
    _expiring = false;
  }
}

class NtsaApp extends StatelessWidget {
  const NtsaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ShopProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
        ChangeNotifierProvider(create: (_) => VendorProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()..restore()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, theme, _) => MaterialApp(
          title: 'NTSA',
          debugShowCheckedModeBanner: false,
          navigatorKey: navigatorKey,
          scaffoldMessengerKey: scaffoldMessengerKey,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: theme.isDark ? ThemeMode.dark : ThemeMode.light,
          home: const SplashScreen(),
        ),
      ),
    );
  }
}
