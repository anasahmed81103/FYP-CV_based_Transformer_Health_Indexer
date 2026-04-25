import 'package:flutter/material.dart';
import 'dart:ui';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Background Effects (consistent with other screens)
          Positioned(
            top: -100,
            left: -100,
            child: _buildOrb(Colors.purple),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: _buildOrb(Colors.blue),
          ),

          SafeArea(
            child: CustomScrollView(
              slivers: [
                // App Bar
                SliverAppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  pinned: true,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  title: const Text(
                    'How It Works',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),

                // Main Content Body
                SliverPadding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      const Text(
                        'A deep dive into how our AI-powered Computer Vision engine securely processes, evaluates, and logs Pole Mounted Transformer conditions.',
                        style: TextStyle(
                            color: Colors.white70, fontSize: 16, height: 1.5),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 48),

                      // PIPELINE SECTION
                      _buildSectionHeader(Icons.account_tree,
                          'The Core Evaluation Pipeline', Colors.indigoAccent),
                      const SizedBox(height: 24),

                      _buildPipelineStep(
                        icon: Icons.camera_alt,
                        color: Colors.purpleAccent,
                        title: '1. Data Acquisition',
                        desc:
                            'Technicians upload transformer field images alongside high-precision GPS coordinates, timestamps, and manual observation notes.',
                      ),
                      _buildArrow(),
                      _buildPipelineStep(
                        icon: Icons.image_search,
                        color: Colors.blueAccent,
                        title: '2. PMT Image Verification',
                        desc:
                            'The PMT Classifier Model instantly filters incoming media, verifying that the subject is actually a Pole Mounted Transformer before permitting heavy computation.',
                      ),
                      _buildArrow(),
                      _buildPipelineStep(
                        icon: Icons.analytics,
                        color: Colors.tealAccent,
                        title: '3. Intelligent Health Analysis',
                        desc:
                            'Approved images are securely routed to the EfficientNet-B0 Engine. It evaluates 13 critical hardware parameters (e.g., Oil Leakage, Rust, Bushing Cracks) to compute a Health Defect Score.',
                      ),
                      _buildArrow(),
                      _buildPipelineStep(
                        icon: Icons.center_focus_strong,
                        color: Colors.orangeAccent,
                        title: '4. Defect Visualization',
                        desc:
                            'Alongside numerical scores, the system generates interactive Grad-CAM Heatmaps, visually painting a red highlight directly over the most critical structural defects on the image.',
                      ),
                      _buildArrow(),
                      _buildPipelineStep(
                        icon: Icons.storage,
                        color: Colors.redAccent,
                        title: '5. Secure Archiving',
                        desc:
                            'All parameter scores, health percentages, uploaded images, heatmaps, and textual technician feedback are permanently encrypted and archived within our local PostgreSQL data lake.',
                      ),
                      _buildArrow(),
                      _buildPipelineStep(
                        icon: Icons.people_alt,
                        color: Colors.pinkAccent,
                        title: '6. Human-in-the-Loop & RL',
                        desc:
                            'Through the User Dashboard, master technicians can override AI predictions via score correction forms. These verified human inputs are fed back into our Reinforcement Learning Continuous Pipeline, dynamically retraining the core EfficientNet model over time to adapt to novel defect patterns and edge cases.',
                      ),

                      const SizedBox(height: 48),
                      const Divider(color: Colors.white24, thickness: 1),
                      const SizedBox(height: 32),

                      // HISTORY SECTION
                      _buildSectionHeader(Icons.history,
                          'History & Logging Dashboard', Colors.amberAccent),
                      const SizedBox(height: 16),
                      Text(
                        'The History Module securely records every inspection footprint across the timeline. It natively stores:\n\n'
                        '• Raw uploaded field imagery & AI generated Grad-CAM heatmaps\n'
                        '• AI-calculated Health Index percentages & Expert Corrected Scores\n'
                        '• Smart Interactive Maps with GPS location verification & timestamps\n'
                        '• Synchronized technician manual feedback & voice-processed textual notes',
                        style: TextStyle(
                            color: Colors.grey[400], height: 1.6, fontSize: 15),
                      ),

                      const SizedBox(height: 40),

                      // RBAC SECTION
                      _buildSectionHeader(Icons.security,
                          'Role-Based Access Control', Colors.greenAccent),
                      const SizedBox(height: 16),
                      _buildRoleCard(
                          'Admin',
                          'Complete organizational access. View history enterprise-wide and safely manage network roles and permissions.',
                          Colors.purple),
                      const SizedBox(height: 12),
                      _buildRoleCard(
                          'User',
                          'Validated field technicians permitted to run active AI evaluation pipelines and view their own localized history.',
                          Colors.blue),
                      const SizedBox(height: 12),
                      _buildRoleCard(
                          'Suspended',
                          'Revoked credentials completely preventing active network logins, executions, or dashboard access.',
                          Colors.red),

                      const SizedBox(height: 40),

                      // API SECTION
                      _buildSectionHeader(Icons.router,
                          'Core Network Interfaces', Colors.cyanAccent),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                              child: _buildApiBox(
                                  'Authentic\nGateway', Icons.vpn_key)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: _buildApiBox(
                                  'Analysis\nBridge', Icons.upload_file)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: _buildApiBox(
                                  'Admin\nEngine', Icons.admin_panel_settings)),
                        ],
                      ),

                      const SizedBox(height: 60),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrb(Color color) {
    return Container(
      width: 300,
      height: 300,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.2),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.2),
            blurRadius: 100,
            spreadRadius: 5,
          ),
        ],
      ),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
        child: Container(color: Colors.transparent),
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
                fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _buildPipelineStep(
      {required IconData icon,
      required Color color,
      required String title,
      required String desc}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 30),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white)),
                const SizedBox(height: 8),
                Text(desc,
                    style: const TextStyle(
                        color: Colors.white70, height: 1.4, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArrow() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Center(
        child: Icon(Icons.arrow_downward, color: Colors.white30, size: 30),
      ),
    );
  }

  Widget _buildRoleCard(String title, String desc, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 40,
            decoration: BoxDecoration(
                color: color, borderRadius: BorderRadius.circular(10)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white)),
                const SizedBox(height: 4),
                Text(desc,
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 13, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApiBox(String title, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.white54, size: 30),
          const SizedBox(height: 12),
          Text(title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
