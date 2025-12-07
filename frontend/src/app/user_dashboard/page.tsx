// user_dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './user_dashboard.module.css';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
  FaWrench,
} from 'react-icons/fa';

const MapModal = dynamic(() => import('@/app/components/MapModal'), { ssr: false });

// Maximum possible score for the Health Index (13 parameters * max score of 6)
const MAX_DEFECT_SUM = 13 * 6; // This is 78.00

// --- Type Definitions and Helpers ---

interface Parameter {
  name: string;
  score: number;
  requiredAction: string;
}

type UserRole = "admin" | "user" | "suspended" | "guest";

const getRequiredAction = (componentName: string, score: number): string => {
  const cleanName = componentName.toLowerCase().replace(/_/g, ' ').replace(' score', '').trim();

  switch (true) {
    case cleanName.includes("bushing") || cleanName.includes("insulator contamination") || cleanName.includes("dust accumulation"):
      if (score <= 3) return "Clean";
      if (score >= 4 && score <= 6) return "Replace Onsite";
      break;

    case cleanName.includes("corrosion") || cleanName.includes("rust") || cleanName.includes("paint fading"):
      if (score === 3) return "Paint";
      if (score === 4) return "Weld Onsite";
      if (score >= 5 && score <= 6) return "Repair at Workshop (TSW)";
      break;

    case cleanName.includes("deformed tank / bent fins"):
      if (score === 3) return "Paint";
      if (score === 4) return "Weld Onsite";
      if (score >= 5 && score <= 6) return "Repair at Workshop (TSW)";
      break;

    case cleanName.includes("gasket") && cleanName.includes("leakage"):
      if (score >= 4 && score <= 6) return "Onsite Replacement";
      break;

    case cleanName.includes("oil leakage"):
      if (score === 4) return "Top-up Oil Onsite";
      if (score === 6) return "Top-up Oil Onsite (Critical)";
      break;

    case cleanName.includes("broken connectors") || cleanName.includes("loose or unsafe wiring") || cleanName.includes("burnt marks / overheating"):
      if (score === 3) return "Tighten";
      if (score === 5) return "Replace Lug";
      if (score === 6) return "Replace Connector";
      break;

    case cleanName.includes("damaged or bent pole structure"):
      if (score >= 3 && score <= 5) return "Re-align or Repair";
      if (score === 6) return "Replace Structure, Grounding: Correct per SOP";
      break;

    default:
      if (score >= 4) return "Check Maintenance SOP";
      return "No Immediate Action";
  }
  return "No Action Required";
};


export default function UserDashboard() {
  const router = useRouter();

  // --- Authorization State ---
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";

  // --- Form/Analysis State ---
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
    healthIndex: number; // Raw Defect Sum (0-78)
    allParameters: Parameter[];
    nonPmtImages: string[];
  } | null>(null);

  // --- Memoized Values (Hooks MUST be defined before conditional returns) ---

  // Hook 1: Determine admin access
  const canAccessAdminTools = useMemo(() => {
    return currentUserRole === 'admin' || currentUserEmail === MASTER_ADMIN_EMAIL;
  }, [currentUserRole, currentUserEmail, MASTER_ADMIN_EMAIL]);

  // Hook 2: Calculate Health Percentage (Function for display)
  const getHealthPercentage = useCallback((defectSum: number) => {
    const healthPercentage = Math.max(0, 100 - (defectSum / MAX_DEFECT_SUM) * 100);
    return healthPercentage.toFixed(2);
  }, []);

  // --- Effects (Hooks MUST be defined before conditional returns) ---

  // Effect 1: Authorization check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user/role");
        const data = await res.json();
        const role: UserRole = data.role;
        const email: string | null = data.email;

        setCurrentUserRole(role);
        setCurrentUserEmail(email);

        if (role === "suspended" || role === "guest") router.replace("/login");
        else setIsAuthLoading(false);
      } catch {
        router.replace("/login");
      }
    };
    checkAuth();
    if (!coords && !location) setShowLocationPrompt(true);
  }, [coords, location, router]);

  // --- Conditional Return (Comes AFTER all Hooks) ---
  if (isAuthLoading) return <div className={styles.container}>Loading Dashboard...</div>;

  // --- Handlers ---

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  const handleLocationAccess = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }
    setShowLocationPrompt(false);
    setLocationPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setCoords([latitude, longitude]);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setLocation(data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setLocation(`${latitude}, ${longitude}`);
          console.error("Nominatim request failed, likely due to CORS or network issues.");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermissionDenied(true);
          alert("Location access denied. Enable it in browser settings.");
        } else alert("Unable to access location. Try again.");
        setShowLocationPrompt(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages((prev) => [...prev, ...(Array.from(e.target.files || []))]);
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  // --- ANALYZE ---
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
      // *** FIX: Changed API path from /api/analyze to the full FastAPI endpoint path ***
      const res = await fetch('http://127.0.0.1:8000/predict', { method: 'POST', body: formData });

      if (!res.ok) throw new Error('Analysis failed.');
      const data = await res.json();

      console.log('Backend response:', data); // IMPORTANT: Check this for debugging!

      const nonPmt = (data.predictions || [])
        .filter((p: any) => p.status === 'non-pmt')
        .map((p: any) => p.image || 'Unknown Image');

      // Process Parameters and Add Required Action
      const processedParameters = Object.entries(data.paramsScores || {}).map(
        ([name, score]) => {
          const s = Number(score);
          const cleanName = name.replace(/_/g, ' ').replace('score', '').trim(); // Clean name
          return {
            name: cleanName,
            score: s, // Raw Defect Score (0-6)
            requiredAction: getRequiredAction(cleanName, Math.round(s)),
          };
        }
      );

      setAnalysisResult({
        gradcamImages: data.gradCamImages || [],
        healthIndex: Number(data.healthIndex || 0), // Raw Defect Sum (0-78)
        allParameters: processedParameters,
        nonPmtImages: nonPmt,
      });

    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert('Failed to analyze transformer images. Check backend server and console logs.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- RENDER ---
  return (
    <div className={styles.container}>
      <div className={styles.adminButtons}>
        {canAccessAdminTools && (
          <>
            <Link href="/user_history" className={styles.historyButton}><FaHistory size={16} /><span>History</span></Link>
            <Link href="/admin" className={styles.adminButton}><FaCrown size={16} /><span>Admin Page</span></Link>
          </>
        )}
        <button onClick={handleLogout} className={styles.adminButton}><FaSignOutAlt size={16} /><span>Logout</span></button>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Transformer Health Dashboard</h1>
        <p className={styles.subtitle}>AI-powered Transformer Condition Analysis</p>
      </div>

      <div className={styles.card}>
        <div className={styles.formSection}>
          {/* Transformer ID */}
          <div className={styles.inputGroup}>
            <label className={styles.label}><FaBolt className={styles.icon} /> Transformer ID <span className={styles.required}>*</span></label>
            <input type="text" placeholder="Enter Transformer ID" value={transformerId} onChange={(e) => setTransformerId(e.target.value)} className={styles.input} />
          </div>

          {/* Location Prompt */}
          {showLocationPrompt && (
            <div className={styles.locationPopupOverlay}>
              <div className={styles.locationPopup}>
                <h3>Allow Location Access</h3>
                <p>To detect transformer location, please allow access.</p>
                <div className={styles.popupActions}>
                  <button className={styles.allowBtn} onClick={handleLocationAccess}>Allow Access</button>
                  <button className={styles.denyBtn} onClick={() => { setShowLocationPrompt(false); setLocationPermissionDenied(true); }}>Deny</button>
                </div>
              </div>
            </div>
          )}

          {locationPermissionDenied && <div className={styles.locationDenied}><p>⚠️ Location access denied. You can select manually using the map button.</p></div>}

          {/* Location Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}><FaMapMarkerAlt className={styles.icon} /> Location</label>
            <div className={styles.locationRow}>
              <input type="text" value={location} readOnly placeholder="Fetching location..." className={styles.input} />
              <button type="button" title="Select location from map" className={styles.mapButton} onClick={() => setShowMap(true)}><FaMapMarkerAlt size={18} /></button>
            </div>
          </div>

          {showMap && (
            <MapModal
              onClose={() => setShowMap(false)}
              currentCoords={coords || undefined}
              onLocationSelect={(lat, lng, addr) => { setCoords([lat, lng]); setLocation(addr); setLocationPermissionDenied(false); }}
            />
          )}

          {/* Date & Time */}
          <div className={styles.datetimeContainer}>
            <div className={styles.inputGroup}><label className={styles.label}><FaCalendarAlt className={styles.icon} /> Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} /></div>
            <div className={styles.inputGroup}><label className={styles.label}><FaClock className={styles.icon} /> Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={styles.input} /></div>
          </div>

          {/* Image Upload */}
          <div className={`${styles.uploadSection} ${images.length ? styles.hasImages : ''}`}>
            <h3 className={styles.uploadHeading}>Upload Transformer Images</h3>
            <label htmlFor="fileInput" className={styles.uploadBox}><FaPlus className={styles.plusIcon} /></label>
            <input type="file" id="fileInput" multiple accept="image/*" className={styles.fileInput} onChange={handleImageUpload} />
            <div className={styles.previewGrid}>
              {images.map((img, i) => (
                <div key={i} className={styles.previewItem}>
                  <img src={URL.createObjectURL(img)} alt={`upload-${i}`} />
                  <button type="button" className={styles.removeButton} onClick={() => removeImage(i)}><FaTimes /></button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAnalyze} className={styles.analyzeButton} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Health Index'}
          </button>
        </div>
      </div>

      {/* --- Analysis Results --- */}
      <div className={styles.analysisSection}>
        <h2 className={styles.sectionTitle}>AI Analysis Results</h2>

        {analysisResult?.nonPmtImages && analysisResult.nonPmtImages.length > 0 && (
          <div className={styles.warningBox}>
            <p>⚠️ The following images were identified as Non-PMT and skipped:</p>
            <ul>
              {analysisResult.nonPmtImages.map((img, i) => (
                <li key={i}>{img}</li>
              ))}
            </ul>
          </div>
        )}

        {isAnalyzing ? (
          <div className={styles.loaderContainer}><div className={styles.loader}></div><p>Analyzing Transformer Health...</p></div>
        ) : analysisResult ? (
          <>
            {/* Grad-CAM */}
            <div className={styles.gradcamContainer}>
              <h2 className={styles.gradcamHeading}>Grad-CAM Results</h2>
              <p className={styles.gradcamSubheading}>Highlights the most critical defect area identified by the model.</p>
              <div className={styles.gradcamGrid}>
                {analysisResult.gradcamImages.length ? (
                  analysisResult.gradcamImages.map((imgUrl, i) => {
                    const fullUrl = imgUrl.startsWith('http') ? imgUrl : `http://127.0.0.1:8000/${imgUrl}`;
                    console.log(`Grad-CAM Image ${i}: ${fullUrl}`);

                    return (
                      <div key={i} className={styles.gradcamBox}>
                        <img
                          src={fullUrl}
                          alt={`GradCAM-${i}`}
                          className={styles.gradcamImage}
                          onError={(e) => {
                            console.error(`Failed to load Grad-CAM image: ${fullUrl}`);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<p style="color: #ef4444; padding: 1rem;">Failed to load image<br/><small>${imgUrl}</small></p>`;
                          }}
                          onLoad={() => console.log(`Successfully loaded: ${fullUrl}`)}
                        />
                      </div>
                    );
                  })
                ) : <p style={{ color: '#9ca3af' }}>No GradCAM results available (Images might be Non-PMT or analysis failed)</p>}
              </div>
            </div>

            {/* Overall Health - SHOWS PERCENTAGE */}
            <div className={styles.overallHealth}>
              <h3 className={styles.overallHealthHeading}>Overall Health Index</h3>
              <div className={styles.healthBarContainer}>
                {(() => {
                  const goodHealthPercentage = parseFloat(getHealthPercentage(analysisResult.healthIndex));
                  let barColor = '#ef4444'; // Red (Bad)
                  if (goodHealthPercentage > 80) barColor = '#22c55e'; // Green (Good)
                  else if (goodHealthPercentage > 40) barColor = '#facc15'; // Yellow (Medium)

                  return (
                    <div className={`${styles.healthBar}`} style={{
                      width: `${goodHealthPercentage}%`,
                      backgroundColor: barColor,
                    }}>
                    </div>
                  );
                })()}
              </div>
              {/* Display single percentage figure */}
              <p
                className={styles.healthValue}
                style={{
                  textAlign: 'center',
                  fontSize: '3rem',
                  fontWeight: 'bold'
                }}
              >
                {/* Remove the span and just output the value directly in the centered, large container */}
                {analysisResult.healthIndex.toFixed(2)}
              </p>
            </div>

            {/* All Parameters + Required Action */}
            <div className={styles.parameters}>
              <h3>Parameter Detail & Required Action</h3>
              <div className={styles.paramGridHeader}>
                <span className={styles.paramNameHeader}>Component</span>
                <span className={styles.paramScoreHeader}>Defect Score (0-6)</span>
                <span className={styles.paramActionHeader}>Required Action</span>
              </div>
              <ul>
                {analysisResult.allParameters.map((param, idx) => (
                  <li key={idx} className={styles.paramItem}>
                    <div className={styles.paramDetailRow}>
                      <span className={styles.paramName}>{param.name}</span>
                      <div className={styles.paramScoreBlock}>
                        <strong className={styles.scoreValue}>{param.score.toFixed(2)}</strong>
                        {/* Visual bar for defect severity: Width = (score/6)*100. Color: Low score = Green (Good), High score = Red (Bad) */}
                        <div className={styles.paramBarContainer}>
                          <div className={styles.paramBar} style={{
                            width: `${(param.score / 6) * 100}%`,
                            backgroundColor: param.score < 2 ? '#22c55e' : param.score < 4 ? '#facc15' : '#ef4444'
                          }}></div>
                        </div>
                      </div>
                      <span className={styles.requiredAction}>
                        <FaWrench className={styles.actionIcon} size={14} /> {param.requiredAction}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : <div className={styles.placeholder}>No analysis yet. Fill the form and upload images to begin.</div>}
      </div>
    </div>
  );
}


