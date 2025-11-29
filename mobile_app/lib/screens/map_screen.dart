import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class MapScreen extends StatefulWidget {
  final Function(LatLng, String) onLocationSelected;

  const MapScreen({super.key, required this.onLocationSelected});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  LatLng _currentCenter = const LatLng(51.509364, -0.128928); // Default London
  LatLng? _selectedPosition;

  void _handleTap(TapPosition tapPosition, LatLng point) {
    setState(() {
      _selectedPosition = point;
    });
  }

  void _confirmSelection() {
    if (_selectedPosition != null) {
      // In a real app, you'd reverse geocode here to get address
      widget.onLocationSelected(_selectedPosition!, "${_selectedPosition!.latitude}, ${_selectedPosition!.longitude}");
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Location'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _selectedPosition != null ? _confirmSelection : null,
          ),
        ],
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: _currentCenter,
          initialZoom: 13.0,
          onTap: _handleTap,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.app',
          ),
          if (_selectedPosition != null)
            MarkerLayer(
              markers: [
                Marker(
                  point: _selectedPosition!,
                  width: 80,
                  height: 80,
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.red,
                    size: 40,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
