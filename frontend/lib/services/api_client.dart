import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'device_session.dart';

/// A failed request to the BoloAI backend.
class ApiException implements Exception {
  final int status;
  final String code;
  const ApiException(this.status, this.code);

  bool get notFound => status == 404;

  @override
  String toString() => 'ApiException($status, $code)';
}

/// Signed-in requests to the BoloAI REST API. Every request carries the
/// Firebase ID token and this device's session id (docs/sessions.md).
class ApiClient {
  ApiClient._();

  static const _timeout = Duration(seconds: 10);

  static Future<dynamic> get(String path) => _send('GET', path);
  static Future<dynamic> post(String path, Map<String, dynamic> body) => _send('POST', path, body);
  static Future<dynamic> patch(String path, Map<String, dynamic> body) => _send('PATCH', path, body);

  static Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw const ApiException(401, 'signed_out');

    final request = http.Request(method, Uri.parse('$apiBaseUrl$path'))
      ..headers.addAll({
        'Authorization': 'Bearer ${await user.getIdToken()}',
        'X-Session-Id': DeviceSession.instance.sessionId,
        'Content-Type': 'application/json',
      });
    if (body != null) request.body = jsonEncode(body);

    final http.Response res;
    try {
      res = await http.Response.fromStream(await request.send().timeout(_timeout));
    } catch (_) {
      throw const ApiException(0, 'unreachable');
    }

    final decoded = res.body.isEmpty ? null : _tryDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return decoded;
    final code = decoded is Map && decoded['error'] is String ? decoded['error'] as String : 'http_${res.statusCode}';
    throw ApiException(res.statusCode, code);
  }

  static dynamic _tryDecode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}
