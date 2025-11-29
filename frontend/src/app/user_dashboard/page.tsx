// user_dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import styles from './user_dashboard.module.css';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const MapModal = dynamic(() => import('@/app/components/MapModal'), { ssr: false });

import {
  FaPlus,
  FaMapMarkerAlt,
  FaHistory,
  FaTimes,
  FaBolt,
  FaCalendarAlt,
  FaClock,
  FaCrown,
  FaSignOutAlt,
} from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

interface Parameter {
  name: string;
  score: number;
}

type UserRole = "admin" | "user" | "suspended" | "guest";

export default function UserDashboard() {
  const router = useRouter();

  // --- STATE FOR AUTHORIZATION ---
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Define the fixed Master Admin Email
  const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

  // ------------------------------------

  const [transformerId, setTransformerId] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    gradcamImages: string[];
    healthIndex: number;
    topParameters: Parameter[];
  } | null>(null);

  // --- Authorization Check Effect ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user/role");
        const data = await res.json();
        const role: UserRole = data.role;
        const email: string | null = data.email;

        setCurrentUserRole(role);
        setCurrentUserEmail(email);

        if (role === "suspended" || role === "guest") {
          router.replace("/login");
        } else {
          setIsAuthLoading(false);
        }

      } catch (error) {
        console.error("Error fetching user role:", error);
        router.replace("/login");
      }
    };
    checkAuth();

    if (!coords && !location) {
      setShowLocationPrompt(true);
    }
  }, [coords, location, router]);


  if (isAuthLoading) {
    return <div className={styles.container}>Loading Dashboard...</div>;
  }

  // --- CALCULATE ACCESS HERE ---
  const canAccessAdminTools = currentUserRole === 'admin' || currentUserEmail === MASTER_ADMIN_EMAIL;

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
      router.replace('/login');
    }
  };

  // --- All other handlers and helper functions ---
  const handleLocationAccess = async () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setShowLocationPrompt(false);
    setLocationPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords([latitude, longitude]);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setLocation(data.display_name || `${latitude}, ${longitude}`);
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }

        setLocationPermissionDenied(false);
      },
      (err) => {
        console.warn("User denied or error:", err.message);

        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermissionDenied(true);
          alert(
            "Location access is blocked. Please enable it manually in your browser settings."
          );
        } else {
          alert("Unable to access location. Try again.");
        }

        setShowLocationPrompt(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!transformerId.trim() || !location || !date || !time || images.length === 0) {
      alert('Please fill all fields and upload at least one image.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('transformer_id', transformerId);
    formData.append('location', location);
    formData.append('date', date);
    formData.append('time', time);
    images.forEach((img) => formData.append('files', img));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Analysis failed.');
      const data = await res.json();

      setAnalysisResult({
        gradcamImages: data.gradcam_paths || [],
        healthIndex: data.health_index || 0,
        topParameters: data.top_params || [],
      });
    } catch (err: any) {
      console.error(err);
      alert('Failed to analyze transformer images.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getHealthClass = (value: number) => {
    if (value > 80) return styles.high;
    if (value > 60) return styles.medium;
    return styles.low;
  };


  return (
    <div className={styles.container}>
      {/* --- CONDITIONAL ADMIN/HISTORY BUTTONS (MASTER ADMIN CHECK) --- */}
      <div className={styles.adminButtons}>

        {/* History Button (Visible if authorized) */}
        {canAccessAdminTools && (
          <Link href="/user_history" className={styles.historyButton}>
            <FaHistory size={16} />
            <span>History</span>
          </Link>
        )}

        {/* Admin Page Button (Visible if authorized) */}
        {canAccessAdminTools && (
          <Link href="/admin" className={styles.adminButton}>
            <FaCrown size={16} />
            <span>Admin Page</span>
          </Link>
        )}

        {/* Logout Button (Always Visible) */}
        <button onClick={handleLogout} className={styles.adminButton} title="Logout">
          <FaSignOutAlt size={16} />
          <span>Logout</span>
        </button>
      </div>

      {/* --- Header --- */}
      <div className={styles.header}>
        <h1 className={styles.title}>Transformer Health Dashboard</h1>
        <p className={styles.subtitle}>AI-powered Transformer Condition Analysis</p>
      </div>

      {/* ... rest of the component content ... */}
      <div className={styles.card}>
        <div className={styles.formSection}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FaBolt className={styles.icon} /> Transformer ID{' '}
              <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Transformer ID"
              value={transformerId}
              onChange={(e) => setTransformerId(e.target.value)}
              className={styles.input}
            />
          </div>

          {showLocationPrompt && (
            <div className={styles.locationPopupOverlay}>
              <div className={styles.locationPopup}>
                <h3>Allow Location Access</h3>
                <p>
                  To automatically detect where the transformer photo was taken, please allow access to your
                  device location.
                </p>
                <div className={styles.popupActions}>
                  <button className={styles.allowBtn} onClick={handleLocationAccess}>
                    Allow Access
                  </button>
                  <button
                    className={styles.denyBtn}
                    onClick={() => {
                      setShowLocationPrompt(false);
                      setLocationPermissionDenied(true);
                    }}
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          )}

          {locationPermissionDenied && (
            <div className={styles.locationDenied}>
              <p>
                ⚠️ Location access denied. You can still select a location manually using the map button.
              </p>
            </div>
          )}


          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FaMapMarkerAlt className={styles.icon} /> Location
            </label>
            <div className={styles.locationRow}>
              <input
                type="text"
                value={location}
                readOnly
                placeholder="Fetching your location..."
                className={styles.input}
              />
              <button
                type="button"
                title="Select location from map"
                className={styles.mapButton}
                onClick={() => setShowMap(true)}
              >
                <FaMapMarkerAlt size={18} />
              </button>

            </div>
          </div>

          {showMap && (
            <MapModal
              onClose={() => setShowMap(false)}
              currentCoords={coords || undefined}
              onLocationSelect={(lat, lng, addr) => {
                setCoords([lat, lng]);
                setLocation(addr);
                setLocationPermissionDenied(false);
              }}
            />
          )}


          <div className={styles.datetimeContainer}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaCalendarAlt className={styles.icon} /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaClock className={styles.icon} /> Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div
            className={`${styles.uploadSection} ${images.length > 0 ? styles.hasImages : ''
              }`}
          >
            <h3 className={styles.uploadHeading}>Upload Transformer Images</h3>

            <label htmlFor="fileInput" className={styles.uploadBox}>
              <FaPlus className={styles.plusIcon} />
            </label>
            <input
              type="file"
              id="fileInput"
              multiple
              accept="image/*"
              className={styles.fileInput}
              onChange={handleImageUpload}
            />

            <div className={styles.previewGrid}>
              {images.map((img, index) => (
                <div key={index} className={styles.previewItem}>
                  <img src={URL.createObjectURL(img)} alt={`upload-${index}`} />
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeImage(index)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            className={styles.analyzeButton}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Health Index'}
          </button>
        </div>
      </div>

      <div className={styles.analysisSection}>
        <h2 className={styles.sectionTitle}>AI Analysis Results</h2>

        {isAnalyzing ? (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Analyzing Transformer Health...</p>
          </div>
        ) : analysisResult ? (
          <>
            <div className={styles.gradcamContainer}>
              <h2 className={styles.gradcamHeading}>Grad-CAM Results</h2>
              <div className={styles.gradcamGrid}>
                {analysisResult.gradcamImages.length > 0 ? (
                  analysisResult.gradcamImages.map((imgUrl, index) => (
                    <div key={index} className={styles.gradcamBox}>
                      <Image
                        src={imgUrl.startsWith('http') ? imgUrl : `http://127.0.0.1:8000/${imgUrl}`}
                        alt={`GradCAM-${index}`}
                        width={200}
                        height={200}
                      />
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#9ca3af' }}>No GradCAM results available</p>
                )}
              </div>
            </div>

            <div className={styles.overallHealth}>
              <h3 className={styles.overallHealthHeading}>Overall Health Index</h3>
              <div className={styles.healthBarContainer}>
                <div
                  className={`${styles.healthBar} ${getHealthClass(
                    analysisResult.healthIndex
                  )}`}
                  style={{ width: `${analysisResult.healthIndex}%` }}
                ></div>
              </div>
              <p className={styles.healthValue}>
                {analysisResult.healthIndex.toFixed(1)}%
              </p>
            </div>

            <div className={styles.parameters}>
              <h3>Top 3 Affected Parameters</h3>
              <ul>
                {analysisResult.topParameters.map((param, idx) => (
                  <li key={idx}>
                    <span>{param.name}</span>
                    <div className={styles.paramBarContainer}>
                      <div
                        className={`${styles.paramBar} ${getHealthClass(param.score)}`}
                        style={{ width: `${param.score}%` }}
                      ></div>
                      <strong>{param.score}%</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>No analysis yet</div>
        )}
      </div>
    </div>
  );
}