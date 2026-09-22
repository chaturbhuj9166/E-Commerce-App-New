import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../core/api_client.dart';
import '../core/image_upload.dart';
import '../models/user.dart';

/// Real customer sign-in goes through Firebase (phone OTP / Google) once the
/// client hands over those credentials -> Backend's POST /auth/firebase.
/// Until then we use the Backend's built-in POST /auth/demo so the rest of
/// the app can be built and tested end-to-end today.
class AuthProvider extends ChangeNotifier {
  AppUser? user;
  /// 'CUSTOMER' | 'VENDOR' for the restored/stored session token.
  String? role;
  bool loading = false;
  String? error;

  bool get isSignedIn => user != null;

  /// True only for a customer session; see [restore] for vendor sessions.
  Future<bool> restoreSession() async {
    try {
      return (await restore())?['role'] == 'CUSTOMER';
    } catch (_) {
      return false;
    }
  }

  /// Checks the stored token against GET /me and returns that body (with its
  /// `role`), or null when there's no valid session. Only a 401/403 clears the
  /// token; other failures (e.g. offline) rethrow so the session survives.
  Future<Map<String, dynamic>?> restore() async {
    if (!await ApiClient.instance.hasToken) return null;
    try {
      final me = await ApiClient.instance.get('/me', notifyUnauthorized: false) as Map<String, dynamic>;
      role = me['role'] as String? ?? 'CUSTOMER';
      user = role == 'CUSTOMER' ? AppUser.fromJson(me) : null;
      notifyListeners();
      return me;
    } on ApiException catch (e) {
      if (e.statusCode != 401 && e.statusCode != 403) rethrow;
      await ApiClient.instance.clearToken();
      return null;
    }
  }

  /// Forgets the customer in memory without touching the stored token, e.g.
  /// once a vendor login has replaced it.
  void clearUser() {
    user = null;
    role = null;
    notifyListeners();
  }

  /// Asks the Backend for a demo OTP for [phone] (10 digits). Until real SMS
  /// is wired in, the demo Backend returns the code itself as `demoOtp` so the
  /// OTP screen can show it; returns that response, or null with [error] set.
  Future<Map<String, dynamic>?> requestOtp(String phone) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      return await ApiClient.instance.post('/auth/demo/otp', data: {'phone': phone}) as Map<String, dynamic>;
    } catch (e) {
      error = e.toString();
      return null;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// [phone] + [otp] sign in that number's own account (the OTP comes from
  /// [requestOtp]). Omit both (e.g. for the Google/Apple buttons, which have no
  /// number to key off) to use the single shared demo account.
  Future<bool> continueWithDemo({String? phone, String? otp}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await ApiClient.instance.post('/auth/demo', data: {if (phone != null && phone.isNotEmpty) 'phone': phone, 'otp': ?otp}) as Map<String, dynamic>;
      await ApiClient.instance.saveToken(data['token'] as String);
      role = 'CUSTOMER';
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
  Future<bool> updateProfile({String? name, XFile? photo}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      if (photo != null) {
        final form = FormData.fromMap({'photo': await imagePart(photo)});
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
    role = null;
    notifyListeners();
  }
}
