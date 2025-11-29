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

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final data = await ApiService.getHistory();
      if (mounted) {
        setState(() {
          _history = data;
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
    );
  }
}
