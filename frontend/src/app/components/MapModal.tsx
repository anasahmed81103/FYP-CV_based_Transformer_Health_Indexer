'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import styles from './map_modal.module.css';

interface MapModalProps {
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  currentCoords?: [number, number];
}

export default function MapModal({ onClose, onLocationSelect, currentCoords }: MapModalProps) {
  const [position, setPosition] = useState<[number, number] | null>(currentCoords || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const customIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  // Map event handler for clicking
  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        setErrorMessage('');
      },
    });
    return position ? <Marker position={position} icon={customIcon}></Marker> : null;
  }

  // Center map dynamically when user searches location
  function FlyToPosition({ coords }: { coords: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
      if (coords) map.flyTo(coords, 13, { animate: true });
    }, [coords, map]);
    return null;
  }

  // Reverse geocode (for Confirm button)
  const getAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch {
      return `${lat}, ${lng}`;
    }
  };

  const handleConfirm = async () => {
    if (!position) {
      alert('Please select a location first.');
      return;
    }
    const addr = await getAddressFromCoords(position[0], position[1]);
    onLocationSelect(position[0], position[1], addr);
    onClose();
  };

  // Search for locations
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (lat: number, lon: number) => {
    const latNum = parseFloat(lat.toString());
    const lonNum = parseFloat(lon.toString());
    setPosition([latNum, lonNum]);
    setSearchResults([]);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popupBox}>
        <div className={styles.header}>
          <h2>📍 Select Transformer Location</h2>
          <p className={styles.subText}>
            Click on the map or search your city/location below to pinpoint where the photo was taken.
          </p>
        </div>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        {/* 🔍 Search bar */}
        <div className={styles.searchWrapper}>
          <h3 className={styles.searchHeading}>Search Location</h3>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Enter city or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
          </div>

          {searchResults.length > 0 && (
            <ul className={styles.searchResults}>
              {searchResults.map((item, idx) => (
                <li key={idx} onClick={() => handleSelectSearchResult(item.lat, item.lon)}>
                  {item.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 🗺️ Map */}
        <div className={styles.mapWrapper}>
          <MapContainer
            center={position || [30.3753, 69.3451]} // Default Pakistan center
            zoom={position ? 13 : 5}
            style={{
              height: '350px',
              width: '100%',
              borderRadius: '12px',
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker />
            <FlyToPosition coords={position} />
          </MapContainer>
        </div>

        <div className={styles.actions}>
          <button onClick={handleConfirm} disabled={!position}>
            Confirm
          </button>
          <button onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
