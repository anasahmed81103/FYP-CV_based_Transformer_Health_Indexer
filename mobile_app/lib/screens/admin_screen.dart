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

  String? _currentUserRole;
  String? _currentUserEmail;
  bool _hasShownPopup = false;
  static const String MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final roleData = await ApiService.getUserRole();
      final role = roleData['role'];
      final email = roleData['email'];
      
      const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";
      bool isGlobalAdmin = role == "admin" || email == MASTER_ADMIN_EMAIL;
      
      if (!isGlobalAdmin) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Access Denied: Only admins can view the admin panel.')),
          );
          Navigator.pop(context);
        }
        return;
      }

      final usersData = await ApiService.getAllUsers();
      if (mounted) {
        setState(() {
          _currentUserRole = role;
          _currentUserEmail = email;
          _users = usersData;
          _isLoading = false;
        });

        bool isMasterAdmin = _currentUserEmail == MASTER_ADMIN_EMAIL;
        if (!isMasterAdmin && _currentUserRole == 'admin' && !_hasShownPopup) {
          _hasShownPopup = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: const Color(0xFF1E293B),
                  title: const Text('Access Notice', style: TextStyle(color: Colors.white)),
                  content: const Text(
                      'You can only see this page and individual history button but cant change roles.',
                      style: TextStyle(color: Colors.white70)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('OK', style: TextStyle(color: Color(0xFF6366F1))),
                    ),
                  ],
                ),
              );
            }
          });
        }
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
                              bool isMasterAdmin = _currentUserEmail == MASTER_ADMIN_EMAIL;

                              // Mobile layout check or default admin logic
                              if (!isMasterAdmin) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('You are not authorized to change roles. Only Master Admin can do this.')),
                                );
                                return;
                              }

                              if (user['email'] == MASTER_ADMIN_EMAIL) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Master Admin role is fixed and cannot be changed.')),
                                );
                                return;
                              }

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
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Role updated to $roleLabel')),
          );
          _loadData(); // Refresh list
        } catch (e) {
          if (!mounted) return;
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      },
    );
  }
}
