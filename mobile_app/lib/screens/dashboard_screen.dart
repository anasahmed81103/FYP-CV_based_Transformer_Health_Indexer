import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../models/analysis_result.dart';
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

  final List<XFile> _images = [];
  bool _isAnalyzing = false;
  AnalysisResult? _analysisResult;
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
              if (context.mounted) {
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
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
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
                          color: Colors.grey.withValues(alpha: 0.3),
                          style: BorderStyle.solid),
                    ),
                    child: const Icon(Icons.add_a_photo, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 12),
                ..._images.asMap().entries.map((entry) {
                  return Stack(
                    children: [
                      GestureDetector(
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

    final result = _analysisResult!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('AI Analysis Results',
            style:
                GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),

        // GradCAM
        if (result.gradCamImages.isNotEmpty) ...[
          const Text('Grad-CAM Results', style: TextStyle(fontSize: 16)),
          const SizedBox(height: 8),
          SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: result.gradCamImages.length,
              itemBuilder: (context, index) {
                final path = result.gradCamImages[index];
                // Path from backend is like "outputs/gradcam/filename.jpg"
                // Construct full URL
                final url = '${ApiService.imageBaseUrl}/$path';

                return Container(
                  margin: const EdgeInsets.only(right: 12),
                  width: 200,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border:
                        Border.all(color: Colors.white.withValues(alpha: 0.1)),
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
        ] else ...[
          const Text('No Grad-CAM images generated (Non-PMT or Error)',
              style: TextStyle(color: Colors.grey)),
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
                value:
                    result.healthIndex / 100, // Health Index 0-100 assumption?
                // User said "0 to 78" in example? Wait.
                // User request: "Overall Defect Sum (0 to 78)"
                // But frontend usually displays percentage.
                // Let's assume the value is raw defect sum and we might want to normalize it or just show it.
                // Wait, previous frontend code: AnalysisResult.healthIndex.toFixed(2)
                // And progress bar: value={analysisResult.healthIndex / MAX_DEFECT_SUM * 100}
                // MAX_DEFECT_SUM was 78 (13 params * 6).
                // So percentage = (healthIndex / 78) * 100 ?
                // Or maybe healthIndex IS the percentage?
                // Example: "healthIndex": 45.58.
                // If max is 78, 45.58 is high defect?
                // The prompt says "Display the Health Index as a single percentage figure".
                // If the backend returns a sum (0-78), we should behave like the web frontend.
                // In web frontend page.tsx: `getHealthPercentage(analysisResult.healthIndex)` was used.
                // Function: `const getHealthPercentage = (score: number) => ((score / 78) * 100).toFixed(1);`
                // Wait, usually small score is good health?
                // If it's "Defect Sum", high score = high defect = bad health.
                // So "Health Percentage" might be (1 - score/78) * 100?
                // Web frontend code: `(100 - (score / 78) * 100).toFixed(1)` or just `((score/78)*100)`?
                // Let's check previous web code snippet if possible.
                // I don't see `getHealthPercentage` implementation in snippets, but I see usage: `{getHealthPercentage(analysisResult.healthIndex)}%`.
                // And the variable is `healthIndex`.
                // If `healthIndex` is 45.58 (out of 78), that's ~58% defect.
                // If I am to show "Health Index", usually 100% is good.
                // Let's assume Health = 100 - Defect%.
                // Defect% = (healthIndex / 78) * 100.
                // Health% = 100 - Defect%.
                // I'll implement this logic.

                backgroundColor: Colors.grey[800],
                valueColor: AlwaysStoppedAnimation<Color>(
                  _getHealthColor(result.healthIndex),
                ),
                minHeight: 10,
                borderRadius: BorderRadius.circular(5),
              ),
              const SizedBox(height: 8),
              // We will show the raw value and maybe the calculated percentage?
              // "Display the Health Index as a single percentage figure"
              Text(
                  '${_calculateHealthPercentage(result.healthIndex).toStringAsFixed(1)}% Health',
                  style: const TextStyle(
                      fontSize: 24, fontWeight: FontWeight.bold)),
              Text(
                  '(Defect Score: ${result.healthIndex.toStringAsFixed(2)} / 78.0)',
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Parameters List
        const Text('Parameter Analysis',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ...result.paramsScores.entries.map((entry) {
          final name = entry.key;
          final score = entry.value;
          final action = _getRequiredAction(name, score);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(name.replaceAll('_', ' '),
                          style: const TextStyle(fontWeight: FontWeight.w500)),
                    ),
                    Text(score.toStringAsFixed(2),
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _getScoreColor(score))),
                  ],
                ),
                const SizedBox(height: 6),
                LinearProgressIndicator(
                  value: score / 6.0, // Score is 0-6
                  backgroundColor: Colors.grey[800],
                  valueColor:
                      AlwaysStoppedAnimation<Color>(_getScoreColor(score)),
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
                if (action != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            color: Colors.red, size: 14),
                        const SizedBox(width: 4),
                        Text(action,
                            style: const TextStyle(
                                color: Colors.red,
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  )
                ]
              ],
            ),
          );
        }).toList(),
      ],
    );
  }

  double _calculateHealthPercentage(double defectSum) {
    // Max defect sum is 13 params * 6.0 max score = 78.0
    // Defect% = (defectSum / 78.0) * 100
    // Health% = 100 - Defect%
    // If defectSum is 0, Health is 100%.
    // If defectSum is 78, Health is 0%.
    const maxDefect = 78.0;
    double health = 100.0 - ((defectSum / maxDefect) * 100.0);
    return health.clamp(0.0, 100.0);
  }

  Color _getHealthColor(double defectSum) {
    // Low defect = Good = Green
    // High defect = Bad = Red
    // Thresholds?
    final healthPct = _calculateHealthPercentage(defectSum);
    if (healthPct >= 80) return Colors.green;
    if (healthPct >= 50) return Colors.orange;
    return Colors.red;
  }

  Color _getScoreColor(double score) {
    // Score 0-6. High score is bad.
    if (score < 1.0) return Colors.green;
    if (score < 3.0) return Colors.yellow; // Or orangeAccent
    if (score < 4.0) return Colors.orange;
    return Colors.red;
  }

  String? _getRequiredAction(String paramName, double score) {
    // Logic: If Component Name contains "Bushing" and score >= 4, Required Action is "Replace Onsite"
    // We can infer components from param names.
    // e.g. "Bushing_cracks_score" -> Bushing
    // "Oil_leakage_score" -> Main Tank?

    if (score < 3.0)
      return null; // No action for low scores? Or maybe "Monitor"?

    // Specific rules
    final nameLower = paramName.toLowerCase();

    if (nameLower.contains('bushing') && score >= 4.0) {
      return "Replace Onsite";
    }

    if (nameLower.contains('oil') && score >= 4.0) {
      return "Filter Oil / Fix Leak";
    }

    if (nameLower.contains('silica') && score >= 4.0) {
      // e.g. breather/silica
      return "Replace Silica Gel";
    }

    if (score >= 5.0) {
      return "Immediate Attention / Replacement";
    }

    if (score >= 4.0) {
      return "Schedule Maintenance";
    }

    if (score >= 3.0) {
      return "Monitor Closely";
    }

    return null;
  }
}
