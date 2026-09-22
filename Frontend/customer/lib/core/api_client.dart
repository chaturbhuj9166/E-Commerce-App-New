import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Talks to the NTSA Backend (Backend/src). Base URL points at the local
/// dev server; override with --dart-define=API_BASE_URL=... for a real host.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _defaultBaseUrl(),
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _token();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        options.extra['token'] = token;
        handler.next(options);
      },
      onError: (e, handler) async {
        final options = e.requestOptions;
        final sentToken = options.extra['token'];
        // Only the first 401 for the current token fires the hook: once it
        // clears the token, late 401s from the same stale session are ignored.
        if (e.response?.statusCode == 401 &&
            sentToken != null &&
            options.extra['notifyUnauthorized'] != false &&
            !options.path.startsWith('/auth/') &&
            await _token() == sentToken) {
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ));
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  /// Called when a signed-in request gets 401 (expired / revoked session).
  static void Function()? onUnauthorized;

  static const _tokenKey = 'ntsa-token';
  // A customer's token, parked while they use the wholesale portal.
  static const _customerTokenKey = 'ntsa-customer-token';

  static String _defaultBaseUrl() {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;
    // A real device reaches the dev server through `adb reverse tcp:4000
    // tcp:4000`, which forwards the device's own localhost:4000 to this
    // machine's. (An AVD emulator instead needs 10.0.2.2 -- run `adb -s
    // <emulator-id> reverse tcp:4000 tcp:4000` there too, or pass
    // --dart-define=API_BASE_URL=http://10.0.2.2:4000/api.)
    // 127.0.0.1 rather than "localhost", which on Windows can resolve to IPv6
    // ::1 first and reach a different local server bound there.
    return 'http://127.0.0.1:4000/api';
  }

  Future<String?> _token() async => (await SharedPreferences.getInstance()).getString(_tokenKey);

  Future<void> saveToken(String token) async => (await SharedPreferences.getInstance()).setString(_tokenKey, token);

  Future<void> clearToken() async => (await SharedPreferences.getInstance()).remove(_tokenKey);

  Future<bool> get hasToken async => (await _token()) != null;

  /// Copies the current (customer) token aside before a vendor login.
  Future<void> stashCustomerToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    token == null ? await prefs.remove(_customerTokenKey) : await prefs.setString(_customerTokenKey, token);
  }

  /// Puts the stashed customer token back as the session token. Returns false
  /// (and clears the session token) when nothing was stashed.
  Future<bool> restoreCustomerToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_customerTokenKey);
    await prefs.remove(_customerTokenKey);
    if (token == null) {
      await prefs.remove(_tokenKey);
      return false;
    }
    await prefs.setString(_tokenKey, token);
    return true;
  }

  Future<void> clearCustomerToken() async => (await SharedPreferences.getInstance()).remove(_customerTokenKey);

  /// Whether the backend runs in DEMO_MODE (GET /health, served at the API
  /// origin rather than under /api). Any failure counts as "no".
  Future<bool> demoMode() async {
    try {
      final base = _dio.options.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');
      final response = await Dio(BaseOptions(connectTimeout: const Duration(seconds: 10), receiveTimeout: const Duration(seconds: 10))).get('$base/health');
      return response.data is Map && response.data['demo'] == true;
    } catch (_) {
      return false;
    }
  }

  /// [notifyUnauthorized] false keeps a 401 from triggering [onUnauthorized]
  /// (e.g. the splash screen's own session check).
  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool notifyUnauthorized = true}) =>
      _unwrap(_dio.get(path, queryParameters: query, options: Options(extra: {'notifyUnauthorized': notifyUnauthorized})));

  Future<dynamic> post(String path, {Object? data}) => _unwrap(_dio.post(path, data: data));

  Future<dynamic> put(String path, {Object? data}) => _unwrap(_dio.put(path, data: data));

  Future<dynamic> patch(String path, {Object? data}) => _unwrap(_dio.patch(path, data: data));

  Future<dynamic> delete(String path, {Map<String, dynamic>? query}) => _unwrap(_dio.delete(path, queryParameters: query));

  Future<dynamic> _unwrap(Future<Response> request) async {
    try {
      final response = await request;
      return response.data;
    } on DioException catch (e) {
      final response = e.response;
      if (response == null) throw ApiException('Could not reach the NTSA server');
      final data = response.data;
      final message = data is Map && data['error'] != null ? data['error'].toString() : 'Request failed (${response.statusCode})';
      throw ApiException(message, statusCode: response.statusCode);
    }
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});
  final String message;
  /// HTTP status, or null when the server couldn't be reached.
  final int? statusCode;
  @override
  String toString() => message;
}
