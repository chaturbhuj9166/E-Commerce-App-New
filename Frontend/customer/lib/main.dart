import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'l10n/app_languages.dart';
import 'l10n/tr.dart';
import 'core/api_client.dart';
import 'core/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/saved_for_later_provider.dart';
import 'providers/shop_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/vendor_provider.dart';
import 'providers/wishlist_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/splash_screen.dart';

final navigatorKey = GlobalKey<NavigatorState>();
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Firebase powers real phone-OTP sign-in on Android. The web build has no
  // Firebase config, so it skips init and keeps the demo login working.
  if (!kIsWeb) {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    } catch (e) {
      debugPrint('Firebase init failed, falling back to demo login: $e');
    }
  }
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
    final ctx = navigatorKey.currentContext;
    // The navigator's own context is still valid here: it outlives these awaits.
    // ignore: use_build_context_synchronously
    scaffoldMessengerKey.currentState?.showSnackBar(SnackBar(content: Text(ctx != null ? ctx.tr('common.session_expired') : 'Session expired, please sign in again')));
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
        ChangeNotifierProvider(create: (_) => SavedForLaterProvider()..restore()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
        ChangeNotifierProvider(create: (_) => VendorProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()..restore()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()..restore()),
      ],
      child: Consumer2<ThemeProvider, LocaleProvider>(
        builder: (context, theme, localeProvider, _) => MaterialApp(
          title: 'NTSA',
          debugShowCheckedModeBanner: false,
          navigatorKey: navigatorKey,
          scaffoldMessengerKey: scaffoldMessengerKey,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: theme.isDark ? ThemeMode.dark : ThemeMode.light,
          // The shopper picks the language after signing in (or from Account).
          // The Global* delegates give Material widgets, dates and right-to-left
          // layout for every language in kLanguages.
          locale: localeProvider.locale,
          supportedLocales: [for (final l in kLanguages) Locale(l.code)],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const SplashScreen(),
        ),
      ),
    );
  }
}
