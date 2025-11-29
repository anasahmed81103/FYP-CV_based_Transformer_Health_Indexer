import 'dart:io';
import 'package:flutter/foundation.dart'; // Added for kIsWeb
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import 'map_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _transformerIdController = TextEditingController();
  final _locationController = TextEditingController();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();

  List<XFile> _images = [];
  bool _isAnalyzing = false;
  Map<String, dynamic>? _analysisResult;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    // Set default date/time
    final now = DateTime.now();
    _dateController.text = DateFormat('yyyy-MM-dd').format(now);
    _timeController.text = DateFormat('HH:mm').format(now);
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return;
    }

    Position position = await Geolocator.getCurrentPosition();
    setState(() {
      _locationController.text = '${position.latitude}, ${position.longitude}';
    });
  }

  Future<void> _pickImages() async {
    final List<XFile> selectedImages = await _picker.pickMultiImage();
    if (selectedImages.isNotEmpty) {
      setState(() {
        _images.addAll(selectedImages);
      });
    }
  }

  Future<void> _analyze() async {
    if (_transformerIdController.text.isEmpty || _images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill ID and upload images')),
      );
      return;
    }

    setState(() {
      _isAnalyzing = true;
      _analysisResult = null;
    });

    try {
      final result = await ApiService.analyze(
        _transformerIdController.text,
        _locationController.text,
        _dateController.text,
        _timeController.text,
        _images,
      );

      setState(() {
        _analysisResult = result;
      });
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
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    } finally {
      setState(() {
        _isAnalyzing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transformer Health Dashboard'),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => Navigator.pushNamed(context, '/history'),
            tooltip: 'History',
          ),
          IconButton(
            icon: const Icon(Icons.admin_panel_settings),
            onPressed: () => Navigator.pushNamed(context, '/admin'),
            tooltip: 'Admin',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ApiService.logout();
              if (mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              }
            },
            tooltip: 'Logout',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildFormSection(),
            const SizedBox(height: 24),
            _buildAnalysisSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildFormSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInput(
            label: 'Transformer ID',
            icon: Icons.bolt,
            controller: _transformerIdController,
            hint: 'Enter ID',
          ),
          const SizedBox(height: 16),
          _buildInput(
            label: 'Location',
            icon: Icons.location_on,
            controller: _locationController,
            hint: 'Fetching location...',
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.map, color: Color(0xFF6366F1)),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => MapScreen(
                          onLocationSelected: (latlng, address) {
                            setState(() {
                              _locationController.text = address;
                            });
                          },
                        ),
                      ),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.my_location, color: Color(0xFF6366F1)),
                  onPressed: _getCurrentLocation,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildInput(
                  label: 'Date',
                  icon: Icons.calendar_today,
                  controller: _dateController,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildInput(
                  label: 'Time',
                  icon: Icons.access_time,
                  controller: _timeController,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Image Upload
          const Text('Upload Transformer Images',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                GestureDetector(
                  onTap: _pickImages,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: Colors.grey.withOpacity(0.3),
                          style: BorderStyle.solid),
                    ),
                    child: const Icon(Icons.add_a_photo, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 12),
                ..._images.asMap().entries.map((entry) {
                  return Stack(
                    children: [
                      Container(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _images.removeAt(entry.key);
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close,
                                size: 12, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ],
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isAnalyzing ? null : _analyze,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFF6366F1),
              ),
              child: _isAnalyzing
                  ? const Text('Analyzing...')
                  : const Text('Analyze Health Index',
                      style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput({
    required String label,
    required IconData icon,
    TextEditingController? controller,
    String? hint,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, color: Colors.grey),
            suffixIcon: suffixIcon,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildAnalysisSection() {
    if (_analysisResult == null) return const SizedBox.shrink();

    final healthIndex = (_analysisResult!['health_index'] as num).toDouble();
    final gradcamPaths =
        (_analysisResult!['gradcam_paths'] as List).cast<String>();
    final topParams = (_analysisResult!['top_params'] as List);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('AI Analysis Results',
            style:
                GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),

        // GradCAM
        if (gradcamPaths.isNotEmpty) ...[
          const Text('Grad-CAM Results', style: TextStyle(fontSize: 16)),
          const SizedBox(height: 8),
          SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: gradcamPaths.length,
              itemBuilder: (context, index) {
                // Use Python backend URL for static images
                final path = gradcamPaths[index];
                final url = path.startsWith('http')
                    ? path
                    : '${ApiService.imageBaseUrl}/$path';

                return Container(
                  margin: const EdgeInsets.only(right: 12),
                  width: 200,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      url,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Center(
                            child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.broken_image, color: Colors.red),
                            const SizedBox(height: 4),
                            Text('Failed to load',
                                style: TextStyle(
                                    color: Colors.grey[400], fontSize: 10)),
                          ],
                        ));
                      },
                    ),
                  ),
                );
              },
            ),
          ),
        ],
        const SizedBox(height: 24),

        // Health Index
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              const Text('Overall Health Index',
                  style: TextStyle(fontSize: 16)),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: healthIndex / 100,
                backgroundColor: Colors.grey[800],
                valueColor: AlwaysStoppedAnimation<Color>(
                  healthIndex > 80
                      ? Colors.green
                      : (healthIndex > 60 ? Colors.orange : Colors.red),
                ),
                minHeight: 10,
                borderRadius: BorderRadius.circular(5),
              ),
              const SizedBox(height: 8),
              Text('${healthIndex.toStringAsFixed(1)}%',
                  style: const TextStyle(
                      fontSize: 24, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Parameters
        const Text('Top Affected Parameters', style: TextStyle(fontSize: 16)),
        const SizedBox(height: 12),
        ...topParams.map((param) {
          final score = (param['score'] as num).toDouble();
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(param['name'],
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    Text('${score.toStringAsFixed(1)}%',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                LinearProgressIndicator(
                  value: score / 100,
                  backgroundColor: Colors.grey[800],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    score > 80
                        ? Colors.green
                        : (score > 60 ? Colors.orange : Colors.red),
                  ),
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
              ],
            ),
          );
        }).toList(),
      ],
    );
  }
}
