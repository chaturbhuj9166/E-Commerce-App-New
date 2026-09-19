import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/user.dart';

/// Real customer sign-in goes through Firebase (phone OTP / Google) once the
/// client hands over those credentials -> Backend's POST /auth/firebase.
/// Until then we use the Backend's built-in POST /auth/demo so the rest of
/// the app can be built and tested end-to-end today.
class AuthProvider extends ChangeNotifier {
  AppUser? user;
  bool loading = false;
  String? error;

  bool get isSignedIn => user != null;

  Future<bool> restoreSession() async {
    if (!await ApiClient.instance.hasToken) return false;
    try {
      final me = await ApiClient.instance.get('/me');
      user = AppUser.fromJson(me as Map<String, dynamic>);
      notifyListeners();
      return true;
    } catch (_) {
      await ApiClient.instance.clearToken();
      return false;
    }
  }

  /// [phone] (digits only) lets the demo login stand in for real phone-OTP
  /// sign-in: a different number gets a different account, same as it would
  /// with real OTP verification. Omit it (e.g. for the Google/Apple buttons,
  /// which have no number to key off) to use the single shared demo account.
  Future<bool> continueWithDemo({String? phone}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.post('/auth/demo', data: {if (phone != null && phone.isNotEmpty) 'phone': phone}) as Map<String, dynamic>;
      await ApiClient.instance.saveToken(data['token'] as String);
      user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Lets the customer set their display name and/or profile photo (Account
  /// screen -> Edit Profile). Photo bytes go straight to the Backend, which
  /// hosts them the same way as product images (services/storage.js).
  Future<bool> updateProfile({String? name, String? photoPath}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      if (photoPath != null) {
        final form = FormData.fromMap({'photo': await MultipartFile.fromFile(photoPath)});
        final data = await ApiClient.instance.post('/me/photo', data: form) as Map<String, dynamic>;
        user = AppUser.fromJson(data);
      }
      if (name != null && name.trim().isNotEmpty) {
        final data = await ApiClient.instance.patch('/me', data: {'name': name.trim()}) as Map<String, dynamic>;
        user = AppUser.fromJson(data);
      }
      return true;
    } catch (e) {
      error = e.toString();
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await ApiClient.instance.clearToken();
    user = null;
    notifyListeners();
  }
}
