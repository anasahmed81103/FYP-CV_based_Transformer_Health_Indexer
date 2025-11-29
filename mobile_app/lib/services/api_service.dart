import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Android Emulator: 10.0.2.2
  // iOS Simulator: 127.0.0.1
  // Real Device: Your PC's IP address
  // Web: localhost
  static String get baseUrl {
    if (kIsWeb) {
      return dotenv.env['API_URL_WEB'] ?? 'http://localhost:3000/api';
    }
    return dotenv.env['API_URL_ANDROID'] ?? 'http://10.0.2.2:3000/api';
  }

  static String get imageBaseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    return Platform.isAndroid
        ? 'http://10.0.2.2:8000'
        : 'http://localhost:8000';
  }

  static String? _authToken;
  static const String _tokenKey = 'auth_token';

  // Load token from persistent storage
  static Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString(_tokenKey);
    if (kDebugMode && _authToken != null) {
      print('Token loaded from storage: $_authToken');
    }
  }

  // Save token to persistent storage
  static Future<void> _saveToken(String token) async {
    _authToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    if (kDebugMode) {
      print('Token saved to storage: $token');
    }
  }

  // Clear token from persistent storage
  static Future<void> clearToken() async {
    _authToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    if (kDebugMode) {
      print('Token cleared from storage');
    }
  }

  static Map<String, String> get _headers {
    final headers = {'Content-Type': 'application/json'};
    if (_authToken != null) {
      // Use Authorization header instead of Cookie for Flutter Web compatibility
      // Browsers block setting Cookie headers from JavaScript
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        // 1. Try to get token from response body (Best for Mobile)
        if (data['token'] != null) {
          await _saveToken(data['token']);
        }
        // 2. Fallback: Extract token from Set-Cookie header (Best for Web/Browsers)
        else {
          final setCookie = response.headers['set-cookie'];
          if (setCookie != null) {
            final tokenMatch = RegExp(r'token=([^;]+)').firstMatch(setCookie);
            if (tokenMatch != null) {
              final token = tokenMatch.group(1)!;
              await _saveToken(token);
            }
          }
        }
        return data;
      } else {
        throw Exception(data['error'] ?? 'Login failed');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<Map<String, dynamic>> signup(
      Map<String, String> userData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/signup'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(userData),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Auto-login if token is provided
        if (data['token'] != null) {
          await _saveToken(data['token']);
        }
        return data;
      } else {
        throw Exception(data['error'] ?? 'Signup failed');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<void> logout() async {
    await clearToken();
  }

  static Future<Map<String, dynamic>> getUserRole() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/user/role'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get user role');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<List<dynamic>> getHistory() async {
    try {
      if (kDebugMode) {
        print('Fetching history with token: $_authToken');
      }

      final response = await http.get(
        Uri.parse('$baseUrl/history'),
        headers: _headers,
      );

      if (kDebugMode) {
        print('History response status: ${response.statusCode}');
        print('History response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - Please log in again');
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['error'] ?? 'Failed to fetch history');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<List<dynamic>> getAllUsers() async {
    try {
      if (kDebugMode) {
        print('Fetching users with token: $_authToken');
      }

      final response = await http.get(
        Uri.parse('$baseUrl/admin/users'),
        headers: _headers,
      );

      if (kDebugMode) {
        print('Users response status: ${response.statusCode}');
        print('Users response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - Please log in again');
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['error'] ?? 'Failed to fetch users');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<Map<String, dynamic>> analyze(String transformerId,
      String location, String date, String time, List<XFile> images) async {
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/analyze'));

    // Add headers manually for MultipartRequest
    if (_authToken != null) {
      // Use Authorization header instead of Cookie for Flutter Web compatibility
      request.headers['Authorization'] = 'Bearer $_authToken';
      if (kDebugMode) {
        print('Analyzing with token: $_authToken');
      }
    } else {
      if (kDebugMode) {
        print('WARNING: No auth token available for analyze request');
      }
    }

    request.fields['transformer_id'] = transformerId;
    request.fields['location'] = location;
    request.fields['date'] = date;
    request.fields['time'] = time;

    try {
      if (kIsWeb) {
        for (var image in images) {
          final bytes = await image.readAsBytes();
          request.files.add(http.MultipartFile.fromBytes(
            'files',
            bytes,
            filename: image.name,
          ));
        }
      } else {
        for (var image in images) {
          request.files
              .add(await http.MultipartFile.fromPath('files', image.path));
        }
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (kDebugMode) {
        print('Analyze response status: ${response.statusCode}');
        print('Analyze response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - Please log in again');
      } else {
        final errorBody = response.body;
        try {
          final errorData = jsonDecode(errorBody);
          throw Exception(
              'Analysis failed: ${errorData['error'] ?? errorBody}');
        } catch (_) {
          throw Exception('Analysis failed: $errorBody');
        }
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<void> updateUserRole(int userId, String newRole) async {
    if (_authToken == null) await loadToken();
    final token = _authToken;
    if (token == null) throw Exception('Not authenticated');

    final response = await http.put(
      Uri.parse('$baseUrl/admin/users/$userId/role'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'newRole': newRole}),
    );

    if (response.statusCode != 200) {
      final data = jsonDecode(response.body);
      throw Exception(data['error'] ?? 'Failed to update role');
    }
  }

  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return data;
      } else {
        throw Exception(data['error'] ?? 'Request failed');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<Map<String, dynamic>> resetPassword(
      String token, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': token, 'newPassword': newPassword}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return data;
      } else {
        throw Exception(data['error'] ?? 'Reset failed');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  static Future<Map<String, dynamic>> verifyEmail(String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify-email'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': token}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return data;
      } else {
        throw Exception(data['error'] ?? 'Verification failed');
      }
    } catch (e) {
      throw Exception(e.toString());
    }
  }
}
