import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic>? _history;
  bool _isLoading = true;
  String? _error;

  int _currentPage = 1;
  int _totalPages = 1;
  int _totalCount = 0;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory({int page = 1}) async {
    setState(() {
      _isLoading = true;
      _currentPage = page;
    });
    
    try {
      final roleData = await ApiService.getUserRole();
      final role = roleData['role'];
      final email = roleData['email'];
      const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

      final isGlobalAdmin = role == "admin" || email == MASTER_ADMIN_EMAIL;

      if (!isGlobalAdmin) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Access Denied: Only admins can view history.')),
          );
          Navigator.pop(context);
        }
        return;
      }

      final data = await ApiService.getHistory(page: page);
      if (mounted) {
        setState(() {
          _history = data['logs'];
          _totalPages = data['pagination']['totalPages'];
          _totalCount = data['pagination']['totalCount'];
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
        title: const Text('Analysis History'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : _history == null || _history!.isEmpty
                  ? const Center(child: Text('No history found'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _history!.length,
                      itemBuilder: (context, index) {
                        final item = _history![index];
                        final healthIndex = item['healthIndexScore'] ?? 0;
                        final status = item['status'] ?? 'Unknown';

                        return Card(
                          color: const Color(0xFF1E293B),
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: healthIndex > 80
                                  ? Colors.green
                                  : (healthIndex > 60
                                      ? Colors.orange
                                      : Colors.red),
                              child: Text('${healthIndex.toStringAsFixed(0)}',
                                  style: const TextStyle(color: Colors.white)),
                            ),
                            title: Text(item['transformerId'] ?? 'Unknown ID',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Location: ${item['location'] ?? 'N/A'}'),
                                Text(
                                    'Date: ${item['inferenceDate']} ${item['inferenceTime']}'),
                                Text('Status: $status',
                                    style: TextStyle(
                                      color: status == 'Healthy'
                                          ? Colors.green
                                          : (status == 'Moderate'
                                              ? Colors.orange
                                              : Colors.red),
                                    )),
                              ],
                            ),
                            isThreeLine: true,
                          ),
                        );
                      },
                    ),
      bottomNavigationBar: _isLoading || _history == null || _history!.isEmpty
          ? null
          : Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFF0F172A),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Page $_currentPage of $_totalPages ($_totalCount)',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios,
                            color: Colors.white, size: 18),
                        onPressed: _currentPage > 1
                            ? () => _loadHistory(page: _currentPage - 1)
                            : null,
                        tooltip: 'Previous Page',
                      ),
                      IconButton(
                        icon: const Icon(Icons.arrow_forward_ios,
                            color: Colors.white, size: 18),
                        onPressed: _currentPage < _totalPages
                            ? () => _loadHistory(page: _currentPage + 1)
                            : null,
                        tooltip: 'Next Page',
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
