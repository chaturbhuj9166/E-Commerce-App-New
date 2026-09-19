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
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final token = await _token();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  static const _tokenKey = 'ntsa-token';

  static String _defaultBaseUrl() {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;
    // A real device reaches the dev server through `adb reverse tcp:4000
    // tcp:4000`, which forwards the device's own localhost:4000 to this
    // machine's. (An AVD emulator instead needs 10.0.2.2 -- run `adb -s
    // <emulator-id> reverse tcp:4000 tcp:4000` there too, or pass
    // --dart-define=API_BASE_URL=http://10.0.2.2:4000/api.)
    return 'http://localhost:4000/api';
  }

  Future<String?> _token() async => (await SharedPreferences.getInstance()).getString(_tokenKey);

  Future<void> saveToken(String token) async => (await SharedPreferences.getInstance()).setString(_tokenKey, token);

  Future<void> clearToken() async => (await SharedPreferences.getInstance()).remove(_tokenKey);

  Future<bool> get hasToken async => (await _token()) != null;

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) => _unwrap(_dio.get(path, queryParameters: query));

  Future<dynamic> post(String path, {Object? data}) => _unwrap(_dio.post(path, data: data));

  Future<dynamic> put(String path, {Object? data}) => _unwrap(_dio.put(path, data: data));

  Future<dynamic> patch(String path, {Object? data}) => _unwrap(_dio.patch(path, data: data));

  Future<dynamic> delete(String path) => _unwrap(_dio.delete(path));

  Future<dynamic> _unwrap(Future<Response> request) async {
    try {
      final response = await request;
      return response.data;
    } on DioException catch (e) {
      final message = e.response?.data is Map ? (e.response?.data['error'] ?? 'Request failed') : 'Could not reach the NTSA server';
      throw ApiException(message.toString());
    }
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
