// user_dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './user_dashboard.module.css';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useToast, ToastContainer } from '@/app/components/Toast';
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
  const { toasts, dismiss, success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();

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
  const [existingTransformerSearch, setExistingTransformerSearch] = useState('');

  // --- Verification State ---
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationScore, setVerificationScore] = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideLanguage, setGuideLanguage] = useState<'en' | 'ur'>('en');
  const [now, setNow] = useState<Date>(new Date());

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

  // Keep current time fresh for date/time max constraints.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

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

  // Hook 3: Fetch existing transformers with pagination and optional server-side prefix search.
  const fetchTransformers = useCallback(async (page = 1, append = false, search = '') => {
    setIsLoadingTransformers(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '30',
        search: search.trim(),
      });
      const res = await fetch(`/api/transformers?${query.toString()}`);
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

  // Effect 3: Debounced server-side search for existing transformer IDs.
  useEffect(() => {
    if (isNewTransformer || !showTransformerDropdown) return;

    const timer = setTimeout(() => {
      fetchTransformers(1, false, existingTransformerSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [isNewTransformer, showTransformerDropdown, existingTransformerSearch, fetchTransformers]);

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

  // Handle selecting an existing transformer
  const handleSelectTransformer = (transformer: { transformerId: string; location: string }) => {
    setTransformerId(transformer.transformerId);
    setExistingTransformerSearch(transformer.transformerId);
    if (transformer.location) {
      setLocation(transformer.location);
    }
    setShowTransformerDropdown(false);
    setIsNewTransformer(false);
  };

  // Load more transformers for pagination
  const handleLoadMoreTransformers = () => {
    fetchTransformers(transformerPage + 1, true, existingTransformerSearch);
  };

  const handleLocationAccess = async () => {
    if (!navigator.geolocation) {
      toastWarning("Geolocation not supported by your browser.");
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
          toastError("Location access denied. Enable it in browser settings.");
        } else {
          toastError("Unable to access location. Try again.");
        }
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
      toastWarning("Speech recognition not supported. Please type your feedback.");
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
      toastError("Microphone error: " + event.error);
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
        toastError(verifyResult.message);
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
        toastWarning(errData.message || 'Transformer ID already exists. Please select from existing records.');
        setIsAnalyzing(false);
        return;
      }

      if (!res.ok) throw new Error('Analysis failed.');
      const data = await res.json();

      console.log('Backend response:', data);

      // Show appropriate success message based on database action
      if (data.dbAction === 'updated') {
        toastSuccess('Transformer information updated successfully.');
      } else if (data.dbAction === 'created') {
        toastSuccess('New transformer record created successfully.');
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
      toastError('Analysis failed. Check backend server and console logs.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!transformerId.trim() || !location || !date || !time || images.length === 0) {
      toastWarning('Please fill all fields and upload at least one image.');
      return;
    }

    const selectedDateTime = new Date(`${date}T${time}`);
    if (Number.isNaN(selectedDateTime.getTime())) {
      toastWarning('Please enter a valid date and time.');
      return;
    }
    if (selectedDateTime.getTime() > Date.now()) {
      toastWarning('Future date/time is not allowed. Please select current or past date/time.');
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

      toastSuccess('Corrected scores applied successfully.');

    } catch (err) {
      console.error(err);
      toastError('Error submitting corrected scores. Please try again.');
    }
  };



  // --- RENDER ---
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);
  const maxAllowedTime = date === today ? currentTime : undefined;

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Top Navigation Bar */}
      <nav className={styles.topNav}>
        <div className={styles.navBrand}>
          <h1 className={styles.title}>Transformer Health Dashboard</h1>
          <p className={styles.subtitle}>AI-powered Transformer Condition Analysis</p>
        </div>
        <div className={styles.navActions}>
          <button onClick={() => setShowGuide(true)} className={styles.navBtn}><FaBookOpen size={14} /><span>Guide</span></button>
          {canAccessAdminTools && (
            <>
              <Link href="/user_history" className={`${styles.navBtn} ${styles.navBtnAccent}`}><FaHistory size={14} /><span>History</span></Link>
              <Link href="/admin" className={styles.navBtn}><FaCrown size={14} /><span>Admin</span></Link>
            </>
          )}
          <button onClick={handleLogout} className={`${styles.navBtn} ${styles.navBtnDanger}`}><FaSignOutAlt size={14} /><span>Logout</span></button>
        </div>
      </nav>

      <div className={styles.card}>
        <div className={styles.formSection}>
          {/* Transformer ID */}
          <div className={styles.inputGroup}>
            <label className={styles.label}><FaBolt className={styles.icon} /> Transformer ID <span className={styles.required}>*</span></label>
            
            {/* Toggle buttons for New/Existing */}
            <div className={styles.toggleGroup}>
              <button
                type="button"
                onClick={() => {
                  setIsNewTransformer(true);
                  setShowTransformerDropdown(false);
                  setTransformerId('');
                  setExistingTransformerSearch('');
                  setLocation('');
                }}
                className={`${styles.toggleBtn} ${isNewTransformer ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
              >
                New Transformer
              </button>
              <button
                type="button"
                onClick={() => { 
                  setIsNewTransformer(false); 
                  setShowTransformerDropdown(true);
                  setExistingTransformerSearch(transformerId);
                }}
                className={`${styles.toggleBtn} ${!isNewTransformer ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
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
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Type to search existing transformer ID"
                  value={existingTransformerSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExistingTransformerSearch(value);
                    setTransformerId(value);
                    if (!showTransformerDropdown) {
                      setShowTransformerDropdown(true);
                    }
                  }}
                  onFocus={() => {
                    setShowTransformerDropdown(true);
                  }}
                  className={styles.input}
                  style={{ cursor: 'text' }}
                />
                
                {/* Dropdown for existing transformers */}
                {showTransformerDropdown && (
                  <div className={styles.dropdownMenu}>
                    {isLoadingTransformers && existingTransformers.length === 0 ? (
                      <div className={styles.dropdownEmpty}>
                        Loading transformers...
                      </div>
                    ) : existingTransformers.length === 0 ? (
                      <div className={styles.dropdownEmpty}>
                        {existingTransformerSearch.trim()
                          ? `No transformer IDs match "${existingTransformerSearch}"`
                          : 'No existing transformers found'}
                      </div>
                    ) : (
                      <>
                        {existingTransformers.map((t, idx) => (
                          <div
                            key={`${t.transformerId}-${idx}`}
                            onClick={() => handleSelectTransformer(t)}
                            className={styles.dropdownItem}
                          >
                            <div className={styles.dropdownItemTitle}>{t.transformerId}</div>
                            <div className={styles.dropdownItemSub}>
                              {t.location || 'No location'}
                            </div>
                          </div>
                        ))}
                        {hasMoreTransformers && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleLoadMoreTransformers(); }}
                            disabled={isLoadingTransformers}
                            className={styles.loadMoreBtn}
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
              <div className={styles.locationPopup} style={{ maxWidth: '650px', textAlign: guideLanguage === 'ur' ? 'right' : 'left', maxHeight: '80vh', overflowY: 'auto', direction: guideLanguage === 'ur' ? 'rtl' : 'ltr' }}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                    <FaBookOpen /> {guideLanguage === 'en' ? 'User Guide' : 'صارف گائیڈ'}
                  </h3>
                  <button 
                    onClick={() => setGuideLanguage(guideLanguage === 'en' ? 'ur' : 'en')}
                    className={styles.modalLangBtn}
                  >
                    {guideLanguage === 'en' ? 'اردو میں پڑھیں' : 'Read in English'}
                  </button>
                </div>
                
                {guideLanguage === 'en' ? (
                  <div className={styles.guideContent}>
                    <h4 className={styles.guideSectionTitle}>1. Filling the Form</h4>
                    <p className={styles.guideText}>Enter the Transformer ID (or select an existing one), verify the location, and confirm the date and time. Upload clear images of the transformer components.</p>
                    
                    <h4 className={styles.guideSectionTitle}>2. Providing Analysis Notes (Feedback)</h4>
                    <p className={styles.guideText}>Click the "Add Analysis Notes" button to type or speak any manual observations, maintenance notes, or specific conditions that the AI should be aware of. This acts as additional context for your inspection.</p>
                    
                    <h4 className={styles.guideSectionTitle}>3. Parameter Corrections</h4>
                    <p className={styles.guideText}>When the AI analysis is complete, you will see the predicted defect scores. If you believe the model predicted incorrectly, you can <strong>manipulate the values</strong> in the "Optional Parameter Corrections" section at the bottom.</p>
                    <p className={styles.guideText}>Adjust the scores and click <strong>"Submit Corrected Scores"</strong>. The results and required actions will immediately update to reflect your expert judgment.</p>
                    
                    <h4 className={styles.guideSectionTitle}>4. Parameter Defect Score Interpretation</h4>
                    <p className={styles.guideNote}>Note: This is NOT the total health index of the transformer. These are the individual parameter defect scores used to calculate the final health index.</p>
                    <p className={styles.guideText}><strong>1 is the Best Parameter Score:</strong> This indicates the component is in "Excellent" or "New" condition with no detectable defects.</p>
                    <p className={styles.guideText}><strong>6 is the Worst Parameter Score:</strong> This represents a "Critical" defect on that component. E.g., a Major Leak (Score 6) or a Hot Spot (Score 6).</p>
                    <ul className={styles.guideList}>
                      <li className={styles.guideListItem}><div className={styles.guideDot}></div><span><strong>1.0 &ndash; 3.4 (Good / Normal):</strong> No action or minor maintenance needed.</span></li>
                      <li className={styles.guideListItem}><div className={styles.guideDot} style={{background: '#facc15'}}></div><span><strong>3.5 &ndash; 4.4 (Moderate / Fair):</strong> Requires active onsite repair (e.g., welding, oil top-up).</span></li>
                      <li className={styles.guideListItem}><div className={styles.guideDot} style={{background: '#ef4444'}}></div><span><strong>4.5 &ndash; 6.0 (Critical / Poor):</strong> Requires immediate attention or workshop (TSW).</span></li>
                    </ul>
                  </div>
                ) : (
                  <div className={styles.guideContent} style={{ fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, Arial', fontSize: '1.05rem', lineHeight: '1.8' }}>
                    <h4 className={styles.guideSectionTitle}>1. فارم بھرنا</h4>
                    <p className={styles.guideText}>ٹرانسفارمر کی آئی ڈی درج کریں (یا موجودہ منتخب کریں)، مقام، تاریخ اور وقت کی تصدیق کریں۔ ٹرانسفارمر کے حصوں کی واضح تصاویر اپ لوڈ کریں۔</p>
                    
                    <h4 className={styles.guideSectionTitle}>2. تجزیاتی نوٹس (فیڈبیک) فراہم کرنا</h4>
                    <p className={styles.guideText}>'تجزیاتی نوٹس شامل کریں' پر کلک کریں اور کوئی بھی دستی مشاہدہ، دیکھ بھال کا نوٹ یا مخصوص حالات ٹائپ کریں یا بول کر بتائیں جس کا AI کو علم ہونا چاہیے۔</p>
                    
                    <h4 className={styles.guideSectionTitle}>3. پیرامیٹر کی اصلاحات</h4>
                    <p className={styles.guideText}>جب AI تجزیہ مکمل ہو جائے، تو آپ کو پیش گوئی شدہ نقص کا اسکور نظر آئے گا۔ اگر آپ کو لگتا ہے کہ ماڈل کی پیش گوئی غلط ہے، تو آپ نیچے <strong>'اختیاری پیرامیٹر کی اصلاحات'</strong> سیکشن میں اقدار میں تبدیلی کر سکتے ہیں۔</p>
                    <p className={styles.guideText}>اسکورز کو درست کریں اور <strong>'درست شدہ اسکور جمع کریں'</strong> پر کلک کریں۔ نتائج اور مطلوبہ اقدامات آپ کے ماہرانہ فیڈبیک کے مطابق فوری طور پر اپ ڈیٹ ہو جائیں گے۔</p>
                    
                    <h4 className={styles.guideSectionTitle}>4. پیرامیٹر ڈیفیکٹ اسکور کی تفصیل</h4>
                    <p className={styles.guideNote}>نوٹ: یہ ٹرانسفارمر کا مجموعی ہیلتھ اسکور نہیں ہے۔ یہ انفرادی پیرامیٹرز کے نقص کا اسکور ہے۔</p>
                    <p className={styles.guideText}><strong>1 بہترین پیرامیٹر اسکور ہے:</strong> حصہ "بہترین" یا "نئی" حالت میں ہے۔</p>
                    <p className={styles.guideText}><strong>6 بدترین پیرامیٹر اسکور ہے:</strong> انتہائی خراب حالت (جیسے بڑی لیکیج)۔</p>
                    <ul className={styles.guideList}>
                      <li className={styles.guideListItem}><div className={styles.guideDot}></div><span><strong>1.0 &ndash; 3.4 (اچھا / نارمل):</strong> کوئی ایکشن نہیں یا معمولی دیکھ بھال۔</span></li>
                      <li className={styles.guideListItem}><div className={styles.guideDot} style={{background: '#facc15'}}></div><span><strong>3.5 &ndash; 4.4 (درمیانہ / معتدل):</strong> موقع پر مرمت کی ضرورت۔</span></li>
                      <li className={styles.guideListItem}><div className={styles.guideDot} style={{background: '#ef4444'}}></div><span><strong>4.5 &ndash; 6.0 (انتہائی خراب / نازک):</strong> فوری توجہ یا ورکشاپ (TSW) میں مکمل اوور ہال۔</span></li>
                    </ul>
                  </div>
                )}

                <div className={styles.popupActions} style={{ justifyContent: 'flex-end', direction: 'ltr' }}>
                  <button className={styles.denyBtn} onClick={() => setShowGuide(false)}>
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
                <h3 style={{ color: '#f59e0b', margin: '0 0 1rem 0' }}>⚠️ Image Verification</h3>
                <p style={{ marginBottom: '0.5rem' }}>
                  The uploaded images have a <strong>{(verificationScore * 100).toFixed(0)}%</strong> similarity match with the stored images for transformer <strong>{transformerId}</strong>.
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  This could be the same transformer from a different angle. Do you want to proceed?
                </p>
                <div className={styles.popupActions}>
                  <button 
                    className={styles.allowBtn} 
                    onClick={() => handleVerificationConfirm(true)}
                  >
                    Yes, proceed
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
              <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} /></div>
            <div className={styles.inputGroup}><label className={styles.label}><FaClock className={styles.icon} /> Time</label>
              <input type="time" max={maxAllowedTime} value={time} onChange={(e) => setTime(e.target.value)} className={styles.input} /></div>
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
              <div className={styles.feedbackHeader}>
                <button
                  type="button"
                  onClick={() => setShowFeedback(!showFeedback)}
                  className={styles.feedbackToggleBtn}
                  title={showFeedback ? "Hide Notes" : "Add Notes"}
                >
                  {showFeedback ? <FaTimes size={18} /> : <FaCommentDots size={18} />}
                </button>
                <span className={styles.label} style={{ margin: 0, textTransform: 'none' }}>
                  {showFeedback ? "Hide Analysis Notes" : "Add Analysis Notes (Optional)"}
                </span>
              </div>

              {showFeedback && (
                <div className={styles.feedbackWrapper}>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter any manual observations, maintenance notes, or specific conditions..."
                    className={`${styles.input} ${styles.feedbackTextarea}`}
                  />
                  <button
                    type="button"
                    onClick={startRecording}
                    className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
                    title={isRecording ? "Listening..." : "Click to Speak"}
                  >
                    <FaMicrophone size={16} />
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
          <div className={styles.infoBox} style={{ direction: guideLanguage === 'ur' ? 'rtl' : 'ltr', textAlign: guideLanguage === 'ur' ? 'right' : 'left' }}>
            <div className={styles.infoBoxHeader}>
              <h4 className={styles.infoBoxTitle}>
                 <FaBookOpen /> {guideLanguage === 'en' ? 'Quick Guide: Score Corrections' : 'فوری گائیڈ: اسکور کی اصلاحات'}
              </h4>
              <button 
                onClick={() => setGuideLanguage(guideLanguage === 'en' ? 'ur' : 'en')}
                className={styles.infoBoxLangBtn}
              >
                {guideLanguage === 'en' ? 'اردو' : 'English'}
              </button>
            </div>
            {guideLanguage === 'en' ? (
              <p className={styles.infoBoxText}>
                Review the parameter scores below. If you believe the model's prediction is inaccurate, scroll down to the <strong>"Optional Parameter Corrections"</strong> section to manipulate the values. Click "Submit Corrected Scores" to instantly update the analysis results based on your expert feedback.
              </p>
            ) : (
              <p className={styles.infoBoxText} style={{ fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, Arial', fontSize: '1.05rem', lineHeight: '1.8' }}>
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

            {/* Health Score Interpretation UI */}
            <div className={styles.interpretationBox}>
              <h3 className={styles.infoBoxTitle} style={{ marginBottom: '0.5rem' }}>Parameter Defect Score Interpretation</h3>
              <p className={styles.interpretationNote}>Note: This is NOT the total health index of the transformer. These are the individual parameter defect scores used to calculate the final health index.</p>
              <div className={styles.interpCards}>
                <div className={`${styles.interpCard} ${styles.interpCardGreen}`}>
                  <strong>1 is the Best Parameter Score:</strong> <br/>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>This indicates the component is in "Excellent" or "New" condition with no detectable defects.</span>
                </div>
                <div className={`${styles.interpCard} ${styles.interpCardRed}`}>
                  <strong>6 is the Worst Parameter Score:</strong> <br/>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>This represents a "Critical" defect on that component. E.g., a Major Leak (Score 6) or a Hot Spot (Score 6).</span>
                </div>
              </div>
              <div className={styles.interpLegendBox}>
                <strong style={{ color: 'white' }}>Score Intervals:</strong>
                <ul className={styles.interpLegendList}>
                  <li className={styles.interpLegendItem}><div className={styles.dot} style={{backgroundColor: '#22c55e'}}></div> <span><strong>1.0 &ndash; 3.4 (Good / Normal):</strong> No action or minor maintenance needed.</span></li>
                  <li className={styles.interpLegendItem}><div className={styles.dot} style={{backgroundColor: '#facc15'}}></div> <span><strong>3.5 &ndash; 4.4 (Moderate / Fair):</strong> Requires active onsite repair (e.g., welding, oil top-up).</span></li>
                  <li className={styles.interpLegendItem}><div className={styles.dot} style={{backgroundColor: '#ef4444'}}></div> <span><strong>4.5 &ndash; 6.0 (Critical / Poor):</strong> Requires immediate attention or workshop (TSW).</span></li>
                </ul>
              </div>
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


