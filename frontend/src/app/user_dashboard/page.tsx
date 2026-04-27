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
  FaMicrophone,
  FaCommentDots,
  FaBookOpen,
} from 'react-icons/fa';

const MapModal = dynamic(() => import('@/app/components/MapModal'), { ssr: false });

// Cache for images across soft navigations
let cachedImages: File[] = [];

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
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [transformerId, setTransformerId] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    gradcamImages: string[];
    healthIndex: number; // Raw Defect Sum (0-78)
    allParameters: Parameter[];
    nonPmtImages: string[];
  } | null>(null);

  // --- Editable Parameters ---
  const [editableParameters, setEditableParameters] = useState<Parameter[] | null>(null);


  // --- Transformer Selector State ---
  const [existingTransformers, setExistingTransformers] = useState<{ transformerId: string; location: string }[]>([]);
  const [isLoadingTransformers, setIsLoadingTransformers] = useState(false);
  const [transformerPage, setTransformerPage] = useState(1);
  const [hasMoreTransformers, setHasMoreTransformers] = useState(false);
  const [isNewTransformer, setIsNewTransformer] = useState(true); // true = typing new ID, false = selecting existing
  const [showTransformerDropdown, setShowTransformerDropdown] = useState(false);

  // --- Verification State ---
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationScore, setVerificationScore] = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideLanguage, setGuideLanguage] = useState<'en' | 'ur'>('en');

  // Load state from sessionStorage and global cache on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('dashboardFormData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.transformerId) setTransformerId(parsed.transformerId);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.coords) setCoords(parsed.coords);
        if (parsed.locationPermissionDenied !== undefined) setLocationPermissionDenied(parsed.locationPermissionDenied);
        if (parsed.date) setDate(parsed.date);
        if (parsed.time) setTime(parsed.time);
        if (parsed.feedback) setFeedback(parsed.feedback);
      }
    } catch (e) {
      console.warn("Could not parse dashboardFormData", e);
    }
    setImages(cachedImages);
    setHasLoadedStorage(true);
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    if (hasLoadedStorage) {
      const dataToSave = {
        transformerId,
        location,
        coords,
        locationPermissionDenied,
        date,
        time,
        feedback
      };
      sessionStorage.setItem('dashboardFormData', JSON.stringify(dataToSave));
    }
  }, [hasLoadedStorage, transformerId, location, coords, locationPermissionDenied, date, time, feedback]);

  // Keep global image cache in sync
  useEffect(() => {
    cachedImages = images;
  }, [images]);

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

        if (role === "suspended" || role === "guest") {
          router.replace("/login");
        } else {
          setIsAuthLoading(false);
          // Request microphone permission on mount
          if ((role === "user" || role === "admin") && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then((stream) => {
                // Instantly stop the stream as we only needed to trigger the permission prompt
                stream.getTracks().forEach(track => track.stop());
              })
              .catch((err) => {
                console.warn("Microphone access permission was denied or not available.", err);
              });
          }
        }
      } catch {
        router.replace("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Effect 2: Location Prompt
  useEffect(() => {
    if (hasLoadedStorage) {
      if (!coords && !location && !locationPermissionDenied) {
        setShowLocationPrompt(true);
      } else {
        setShowLocationPrompt(false);
      }
    }
  }, [hasLoadedStorage, coords, location, locationPermissionDenied]);

  // --- Conditional Return (Comes AFTER all Hooks) ---
  if (isAuthLoading) return <div className={styles.container}>Loading Dashboard...</div>;

  // --- Handlers ---

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('dashboardFormData');
      cachedImages = [];
      await fetch('/api/logout', { method: 'POST' });
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  // Fetch existing transformers with pagination
  const fetchTransformers = async (page = 1, append = false) => {
    setIsLoadingTransformers(true);
    try {
      const res = await fetch(`/api/transformers?page=${page}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setExistingTransformers(prev => [...prev, ...data.transformers]);
        } else {
          setExistingTransformers(data.transformers);
        }
        setHasMoreTransformers(data.pagination.hasMore);
        setTransformerPage(page);
      }
    } catch (err) {
      console.error("Failed to fetch transformers:", err);
    } finally {
      setIsLoadingTransformers(false);
    }
  };

  // Handle selecting an existing transformer
  const handleSelectTransformer = (transformer: { transformerId: string; location: string }) => {
    setTransformerId(transformer.transformerId);
    if (transformer.location) {
      setLocation(transformer.location);
    }
    setShowTransformerDropdown(false);
    setIsNewTransformer(false);
  };

  // Load more transformers for pagination
  const handleLoadMoreTransformers = () => {
    fetchTransformers(transformerPage + 1, true);
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

  const startRecording = () => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please type your feedback.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFeedback((prev) => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
      alert("Microphone error: " + event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Recognition error:', e);
      setIsRecording(false);
    }
  };

  // --- ANALYZE ---
  // Verify transformer images against stored features
  const verifyTransformerImages = async (): Promise<{ proceed: boolean; requiresConfirmation: boolean; score: number }> => {
    // Skip verification for new transformers
    if (isNewTransformer) {
      return { proceed: true, requiresConfirmation: false, score: 1.0 };
    }

    try {
      // Fetch stored features for this transformer
      const featuresRes = await fetch(`/api/transformers/${encodeURIComponent(transformerId)}/features`);
      if (!featuresRes.ok) {
        console.warn('Could not fetch stored features, proceeding anyway');
        return { proceed: true, requiresConfirmation: false, score: 1.0 };
      }

      const featuresData = await featuresRes.json();
      const storedFeatures = featuresData.features || [];

      // If no stored features, allow (first analysis for this transformer)
      if (!storedFeatures || storedFeatures.length === 0) {
        return { proceed: true, requiresConfirmation: false, score: 1.0 };
      }

      // Call backend verification endpoint
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
      const verifyFormData = new FormData();
      images.forEach((img) => verifyFormData.append('files', img));
      verifyFormData.append('stored_features', JSON.stringify(storedFeatures));

      const verifyRes = await fetch(`${backendUrl}/verify-transformer`, {
        method: 'POST',
        body: verifyFormData
      });

      if (!verifyRes.ok) {
        console.warn('Verification failed, proceeding anyway');
        return { proceed: true, requiresConfirmation: false, score: 1.0 };
      }

      const verifyResult = await verifyRes.json();
      console.log('Verification result:', verifyResult);

      if (verifyResult.status === 'match') {
        return { proceed: true, requiresConfirmation: false, score: verifyResult.score };
      } else if (verifyResult.status === 'grey_zone') {
        return { proceed: false, requiresConfirmation: true, score: verifyResult.score };
      } else {
        // reject
        alert(`❌ ${verifyResult.message}`);
        return { proceed: false, requiresConfirmation: false, score: verifyResult.score };
      }
    } catch (err) {
      console.error('Verification error:', err);
      // On error, allow to proceed
      return { proceed: true, requiresConfirmation: false, score: 1.0 };
    }
  };

  // Proceed with actual analysis (after verification)
  const proceedWithAnalysis = async () => {
    setShowVerificationModal(false);
    setPendingAnalysis(false);
    
    const formData = new FormData();
    formData.append('transformer_id', transformerId);
    formData.append('location', location);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('is_new_transformer', isNewTransformer.toString());
    if (feedback) formData.append('feedback', feedback);
    images.forEach((img) => formData.append('files', img));

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });

      // Handle duplicate transformer ID error
      if (res.status === 409) {
        const errData = await res.json();
        alert(`⚠️ ${errData.message || 'Transformer ID already exists. Please select from existing records.'}`);
        setIsAnalyzing(false);
        return;
      }

      if (!res.ok) throw new Error('Analysis failed.');
      const data = await res.json();

      console.log('Backend response:', data);

      // Show appropriate success message based on database action
      if (data.dbAction === 'updated') {
        alert('✅ Transformer information updated successfully!');
      } else if (data.dbAction === 'created') {
        alert('✅ New transformer record created successfully!');
      }

      const nonPmt = (data.predictions || [])
        .filter((p: any) => p.status === 'non-pmt')
        .map((p: any) => p.image || 'Unknown Image');

      // Process Parameters and Add Required Action
      const processedParameters = Object.entries(data.paramsScores || {}).map(
        ([name, score]) => {
          const s = Number(score);
          const cleanName = name.replace(/_/g, ' ').replace('score', '').trim();
          return {
            name: cleanName,
            score: s,
            requiredAction: getRequiredAction(cleanName, Math.round(s)),
          };
        }
      );

      setAnalysisResult({
        gradcamImages: data.gradCamImages || [],
        healthIndex: Number(data.healthIndex || 0),
        allParameters: processedParameters,
        nonPmtImages: nonPmt,
      });

      // Initialize editable parameters with current scores
      setEditableParameters(
        processedParameters.map(p => ({ ...p })) // shallow copy
      );


    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert('Failed to analyze transformer images. Check backend server and console logs.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!transformerId.trim() || !location || !date || !time || images.length === 0) {
      alert('Please fill all fields and upload at least one image.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    // For existing transformers, verify images first
    if (!isNewTransformer) {
      const verification = await verifyTransformerImages();
      
      if (verification.requiresConfirmation) {
        // Show confirmation modal for grey zone
        setVerificationScore(verification.score);
        setShowVerificationModal(true);
        setPendingAnalysis(true);
        return; // Wait for user confirmation
      }
      
      if (!verification.proceed) {
        setIsAnalyzing(false);
        return; // Hard reject
      }
    }

    // Proceed with analysis
    await proceedWithAnalysis();
  };

  // Handle user confirmation for grey zone
  const handleVerificationConfirm = async (confirmed: boolean) => {
    setShowVerificationModal(false);
    if (confirmed) {
      await proceedWithAnalysis();
    } else {
      setIsAnalyzing(false);
      setPendingAnalysis(false);
    }
  };

  const handleSubmitCorrections = async () => {
    if (!editableParameters || editableParameters.length === 0) return;

    try {
      const formData = new FormData();
      formData.append('transformer_id', transformerId);
      formData.append('original_scores', JSON.stringify(analysisResult?.allParameters || []));
      formData.append('corrected_scores', JSON.stringify(editableParameters));

      // Append the original images used in analysis
      images.forEach(img => formData.append('files', img));

      const res = await fetch('/api/submit-corrections', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to submit corrections');

      const data = await res.json();

      console.log("Corrections response:", data);

      // ✅ STEP 1: Update UI with corrected values
      setAnalysisResult(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          allParameters: editableParameters.map(p => ({
            ...p,
            requiredAction: getRequiredAction(p.name, Math.round(p.score)),
          }))
        };
      });

      // ✅ STEP 2: Also sync editable state (optional but cleaner)
      setEditableParameters(prev =>
        prev ? prev.map(p => ({ ...p })) : prev
      );

      alert('✅ Corrected scores applied successfully!');

    } catch (err) {
      console.error(err);
      alert('❌ Error submitting corrected scores.');
    }
  };



  // --- RENDER ---
  return (
    <div className={styles.container}>
      <div className={styles.adminButtons}>
        <button onClick={() => setShowGuide(true)} className={styles.adminButton}><FaBookOpen size={16} /><span>Guide</span></button>
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
            
            {/* Toggle buttons for New/Existing */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => { setIsNewTransformer(true); setShowTransformerDropdown(false); setTransformerId(''); setLocation(''); }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: isNewTransformer ? '#f97316' : '#e5e7eb',
                  color: isNewTransformer ? 'white' : '#374151',
                  transition: 'all 0.2s'
                }}
              >
                New Transformer
              </button>
              <button
                type="button"
                onClick={() => { 
                  setIsNewTransformer(false); 
                  setShowTransformerDropdown(true);
                  if (existingTransformers.length === 0) fetchTransformers(1);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: !isNewTransformer ? '#f97316' : '#e5e7eb',
                  color: !isNewTransformer ? 'white' : '#374151',
                  transition: 'all 0.2s'
                }}
              >
                Select Existing
              </button>
            </div>

            {/* Input for new transformer or display selected */}
            {isNewTransformer ? (
              <input 
                type="text" 
                placeholder="Enter New Transformer ID" 
                value={transformerId} 
                onChange={(e) => setTransformerId(e.target.value)} 
                className={styles.input} 
              />
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Click to select existing transformer"
                  value={transformerId}
                  readOnly
                  onClick={() => {
                    setShowTransformerDropdown(!showTransformerDropdown);
                    if (existingTransformers.length === 0) fetchTransformers(1);
                  }}
                  className={styles.input}
                  style={{ cursor: 'pointer' }}
                />
                
                {/* Dropdown for existing transformers */}
                {showTransformerDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {isLoadingTransformers && existingTransformers.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                        Loading transformers...
                      </div>
                    ) : existingTransformers.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                        No existing transformers found
                      </div>
                    ) : (
                      <>
                        {existingTransformers.map((t, idx) => (
                          <div
                            key={`${t.transformerId}-${idx}`}
                            onClick={() => handleSelectTransformer(t)}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                          >
                            <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>{t.transformerId}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.location || 'No location'}
                            </div>
                          </div>
                        ))}
                        {hasMoreTransformers && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleLoadMoreTransformers(); }}
                            disabled={isLoadingTransformers}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: 'none',
                              backgroundColor: '#f3f4f6',
                              color: '#4b5563',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500
                            }}
                          >
                            {isLoadingTransformers ? 'Loading...' : 'Load More'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
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

          {/* Guide Modal */}
          {showGuide && (
            <div className={styles.locationPopupOverlay}>
              <div className={styles.locationPopup} style={{ maxWidth: '600px', textAlign: guideLanguage === 'ur' ? 'right' : 'left', maxHeight: '80vh', overflowY: 'auto', direction: guideLanguage === 'ur' ? 'rtl' : 'ltr' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaBookOpen /> {guideLanguage === 'en' ? 'User Guide' : 'صارف گائیڈ'}
                  </h3>
                  <button 
                    onClick={() => setGuideLanguage(guideLanguage === 'en' ? 'ur' : 'en')}
                    style={{ padding: '4px 12px', borderRadius: '4px', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {guideLanguage === 'en' ? 'اردو میں پڑھیں' : 'Read in English'}
                  </button>
                </div>
                
                {guideLanguage === 'en' ? (
                  <div style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>1. Filling the Form</h4>
                    <p style={{ marginBottom: '1rem' }}>Enter the Transformer ID (or select an existing one), verify the location, and confirm the date and time. Upload clear images of the transformer components.</p>
                    
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>2. Providing Analysis Notes (Feedback)</h4>
                    <p style={{ marginBottom: '1rem' }}>Click the "Add Analysis Notes" button to type or speak any manual observations, maintenance notes, or specific conditions that the AI should be aware of. This acts as additional context for your inspection.</p>
                    
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>3. Parameter Corrections</h4>
                    <p>When the AI analysis is complete, you will see the predicted defect scores. If you believe the model predicted incorrectly, you can <strong>manipulate the values</strong> in the "Optional Parameter Corrections" section at the bottom.</p>
                    <p>Adjust the scores and click <strong>"Submit Corrected Scores"</strong>. The results and required actions will immediately update to reflect your expert judgment.</p>
                  </div>
                ) : (
                  <div style={{ color: '#d1d5db', fontSize: '1.0rem', lineHeight: '1.8', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, Arial' }}>
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>1. فارم بھرنا</h4>
                    <p style={{ marginBottom: '1rem' }}>ٹرانسفارمر کی آئی ڈی درج کریں (یا موجودہ منتخب کریں)، مقام، تاریخ اور وقت کی تصدیق کریں۔ ٹرانسفارمر کے حصوں کی واضح تصاویر اپ لوڈ کریں۔</p>
                    
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>2. تجزیاتی نوٹس (فیڈبیک) فراہم کرنا</h4>
                    <p style={{ marginBottom: '1rem' }}>'تجزیاتی نوٹس شامل کریں' پر کلک کریں اور کوئی بھی دستی مشاہدہ، دیکھ بھال کا نوٹ یا مخصوص حالات ٹائپ کریں یا بول کر بتائیں جس کا AI کو علم ہونا چاہیے۔ یہ آپ کے معائنے کے لیے اضافی سیاق و سباق کے طور پر کام کرتا ہے۔</p>
                    
                    <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>3. پیرامیٹر کی اصلاحات</h4>
                    <p>جب AI تجزیہ مکمل ہو جائے، تو آپ کو پیش گوئی شدہ نقص کا اسکور نظر آئے گا۔ اگر آپ کو لگتا ہے کہ ماڈل کی پیش گوئی غلط ہے، تو آپ نیچے <strong>'اختیاری پیرامیٹر کی اصلاحات'</strong> سیکشن میں اقدار میں تبدیلی کر سکتے ہیں۔</p>
                    <p>اسکورز کو درست کریں اور <strong>'درست شدہ اسکور جمع کریں'</strong> پر کلک کریں۔ نتائج اور مطلوبہ اقدامات آپ کے ماہرانہ فیڈبیک کے مطابق فوری طور پر اپ ڈیٹ ہو جائیں گے۔</p>
                  </div>
                )}

                <div className={styles.popupActions} style={{ marginTop: '1.5rem', justifyContent: 'flex-end', direction: 'ltr' }}>
                  <button className={styles.allowBtn} onClick={() => setShowGuide(false)} style={{ backgroundColor: '#374151' }}>
                    {guideLanguage === 'en' ? 'Close Guide' : 'گائیڈ بند کریں'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Verification Confirmation Modal */}
          {showVerificationModal && (
            <div className={styles.locationPopupOverlay}>
              <div className={styles.locationPopup} style={{ maxWidth: '450px' }}>
                <h3 style={{ color: '#f59e0b', marginBottom: '1rem' }}>⚠️ Image Verification</h3>
                <p style={{ marginBottom: '0.5rem' }}>
                  The uploaded images have a <strong>{(verificationScore * 100).toFixed(0)}%</strong> similarity match with the stored images for transformer <strong>{transformerId}</strong>.
                </p>
                <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                  This could be the same transformer from a different angle. Do you want to proceed?
                </p>
                <div className={styles.popupActions}>
                  <button 
                    className={styles.allowBtn} 
                    onClick={() => handleVerificationConfirm(true)}
                    style={{ background: '#22c55e' }}
                  >
                    Yes, same transformer
                  </button>
                  <button 
                    className={styles.denyBtn} 
                    onClick={() => handleVerificationConfirm(false)}
                  >
                    No, cancel
                  </button>
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

          {/* Feedback Section (Accessible to both user and admin roles) */}
          {(currentUserRole === 'user' || currentUserRole === 'admin') && (
            <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowFeedback(!showFeedback)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s'
                  }}
                  title={showFeedback ? "Close Feedback" : "Add Feedback"}
                >
                  {showFeedback ? <FaTimes size={18} /> : <FaCommentDots size={20} />}
                </button>
                <span className={styles.label} style={{ margin: 0, fontSize: '0.95rem' }}>
                  {showFeedback ? "Hide Analysis Notes" : "Add Analysis Notes (Optional)"}
                </span>
              </div>

              {showFeedback && (
                <div style={{ position: 'relative', animation: 'fadeIn 0.3s ease-in-out' }}>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter any manual observations, maintenance notes, or specific conditions..."
                    className={styles.input}
                    style={{
                      minHeight: '100px',
                      padding: '1rem',
                      paddingRight: '3rem',
                      resize: 'vertical',
                      lineHeight: '1.5',
                      borderRadius: '12px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={startRecording}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'none',
                      border: 'none',
                      color: isRecording ? '#ef4444' : '#9ca3af',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: isRecording ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
                    }}
                    title={isRecording ? "Listening..." : "Click to Speak"}
                  >
                    <FaMicrophone size={isRecording ? 22 : 20} />
                  </button>
                </div>
              )}
            </div>
          )}

          <button onClick={handleAnalyze} className={styles.analyzeButton} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Health Index'}
          </button>
        </div>
      </div>

      {/* --- Analysis Results --- */}
      <div className={styles.analysisSection}>
        <h2 className={styles.sectionTitle}>AI Analysis Results</h2>

        {analysisResult && (
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', borderLeft: guideLanguage === 'en' ? '4px solid #38bdf8' : 'none', borderRight: guideLanguage === 'ur' ? '4px solid #38bdf8' : 'none', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px', direction: guideLanguage === 'ur' ? 'rtl' : 'ltr', textAlign: guideLanguage === 'ur' ? 'right' : 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ color: '#38bdf8', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <FaBookOpen /> {guideLanguage === 'en' ? 'Quick Guide: Score Corrections' : 'فوری گائیڈ: اسکور کی اصلاحات'}
              </h4>
              <button 
                onClick={() => setGuideLanguage(guideLanguage === 'en' ? 'ur' : 'en')}
                style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                {guideLanguage === 'en' ? 'اردو' : 'English'}
              </button>
            </div>
            {guideLanguage === 'en' ? (
              <p style={{ color: '#e0f2fe', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                Review the parameter scores below. If you believe the model's prediction is inaccurate, scroll down to the <strong>"Optional Parameter Corrections"</strong> section to manipulate the values. Click "Submit Corrected Scores" to instantly update the analysis results based on your expert feedback.
              </p>
            ) : (
              <p style={{ color: '#e0f2fe', margin: 0, fontSize: '0.95rem', lineHeight: '1.6', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, Arial' }}>
                نیچے دیے گئے پیرامیٹر کے اسکورز کا جائزہ لیں۔ اگر آپ کو لگتا ہے کہ ماڈل کی پیش گوئی غلط ہے، تو اقدار میں تبدیلی کے لیے نیچے <strong>"اختیاری پیرامیٹر کی اصلاحات"</strong> سیکشن پر جائیں۔ اپنے ماہرانہ فیڈبیک کے مطابق تجزیہ کے نتائج کو فوری اپ ڈیٹ کرنے کے لیے "درست شدہ اسکور جمع کریں" پر کلک کریں۔
              </p>
            )}
          </div>
        )}

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
                    // Now that Next.js proxies the outputs directory, we can use a relative URL
                    const fullUrl = imgUrl.startsWith('http') ? imgUrl : `/${imgUrl}`;
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


            {/* Editing the parameters /  user feedback */}
            {editableParameters && (
              <div className={styles.editableParameters}>
                <h3>Optional Parameter Corrections</h3>
                {editableParameters.map((param, idx) => (
                  <div key={param.name} className={styles.parameterRow}>
                    <label>{param.name}</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={param.score}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(6, Number(e.target.value)));
                        setEditableParameters(prev => {
                          if (!prev) return prev;
                          const newArr = [...prev];
                          newArr[idx] = { ...newArr[idx], score: val };
                          return newArr;
                        });
                      }}
                    />
                  </div>
                ))}
                <button
                  className={styles.submitCorrectionsBtn}
                  onClick={handleSubmitCorrections}
                >
                  Submit Corrected Scores
                </button>
              </div>
            )}

    

          </>
        ) : <div className={styles.placeholder}>No analysis yet. Fill the form and upload images to begin.</div>}
      </div>
    </div>
  );
}


