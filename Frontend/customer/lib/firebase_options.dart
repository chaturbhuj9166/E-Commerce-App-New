// Firebase configuration for this app.
//
// Only Android is wired up (the app ships as an APK). The values mirror
// android/app/google-services.json for project ntsa-app-cc7fc. Web/iOS throw,
// so main.dart only initialises Firebase on Android and the web build keeps
// using the demo login.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Firebase is not configured for web in this app.');
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        throw UnsupportedError('Firebase is only configured for Android in this app.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCPmC4sBr5jMQYrYipklw45APysMXZ1DAE',
    appId: '1:242025312302:android:cb4d7cdbb035c4b1956fbf',
    messagingSenderId: '242025312302',
    projectId: 'ntsa-app-cc7fc',
    storageBucket: 'ntsa-app-cc7fc.firebasestorage.app',
  );
}
