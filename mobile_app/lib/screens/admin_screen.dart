import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  List<dynamic>? _users;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    try {
      final data = await ApiService.getAllUsers();
      if (mounted) {
        setState(() {
          _users = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        if (e.toString().contains("Unauthorized")) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Session expired. Please login again.')),
          );
          Navigator.pushNamedAndRemoveUntil(
              context, '/login', (route) => false);
        } else {
          setState(() {
            _error = e.toString();
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Panel'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : _users == null || _users!.isEmpty
                  ? const Center(child: Text('No users found'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _users!.length,
                      itemBuilder: (context, index) {
                        final user = _users![index];
                        return Card(
                          color: const Color(0xFF1E293B),
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Color(0xFF6366F1),
                              child: Icon(Icons.person, color: Colors.white),
                            ),
                            title: Text(user['name'] ?? 'Unknown Name',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user['email'] ?? 'No Email'),
                                Text('Role: ${user['role'] ?? 'User'}'),
                              ],
                            ),
                            onTap: () {
                              showDialog(
                                context: context,
                                builder: (context) => AlertDialog(
                                  backgroundColor: const Color(0xFF1E293B),
                                  title: const Text('Update Role',
                                      style: TextStyle(color: Colors.white)),
                                  content: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _buildRoleOption(
                                          user['id'], 'admin', 'Admin'),
                                      _buildRoleOption(
                                          user['id'], 'user', 'User'),
                                      _buildRoleOption(
                                          user['id'], 'suspended', 'Suspended'),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
    );
  }

  Widget _buildRoleOption(int userId, String roleValue, String roleLabel) {
    return ListTile(
      title: Text(roleLabel, style: const TextStyle(color: Colors.white)),
      onTap: () async {
        Navigator.pop(context);
        setState(() => _isLoading = true);
        try {
          await ApiService.updateUserRole(userId, roleValue);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Role updated to $roleLabel')),
          );
          _loadUsers(); // Refresh list
        } catch (e) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      },
    );
  }
}
