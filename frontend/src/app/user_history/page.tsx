// user_history/page.tsx - MODIFIED TO FETCH REAL DATA

'use client';

import { useEffect, useState } from 'react';
import styles from './user_history.module.css';
import { useRouter } from 'next/navigation';

// Define possible user roles
type UserRole = "admin" | "user" | "suspended" | "guest";

interface HistoryLog {
    id: number;
    transformerId: string; // Changed from transformer_id to match schema camelCase
    location: string;
    inferenceDate: string; // Changed from inference_date
    inferenceTime: string; // Changed from inference_time
    healthIndexScore: number; // Changed from health_index_score
    paramsScores: Record<string, number>; // Changed from params_scores
    providedImages?: string[]; // Changed from provided_images
    gradCamImages?: string[]; // Changed from grad_cam_images
    status: 'Healthy' | 'Moderate' | 'Critical';
}

export default function HistoryPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null); // New state for error display
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    
    // --- NEW STATE FOR AUTHORIZATION ---
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";
    // ------------------------------------

    // MODIFIED TO FETCH REAL DATA
    const fetchHistoryData = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            // New API endpoint to fetch user's history
            const res = await fetch("/api/history"); 

            if (res.status === 401) { 
                 // If token expired during fetch, redirect to login
                 router.replace("/login"); 
                 return;
            }

            if (!res.ok) {
                // Read error body as JSON. If that fails, treat it as a generic HTTP error.
                let errorData = {};
                try {
                    errorData = await res.json();
                } catch {
                    // Ignore JSON parsing error if server returned HTML/plain text
                }
                
                const errorMessage = (errorData as any).error || `Server error (Status: ${res.status})`;
                throw new Error(errorMessage);
            }

            const data: HistoryLog[] = await res.json();
            setLogs(data);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to load history.";
            setFetchError(errorMessage);
            console.error("History fetch error:", error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }


    // --- Authorization Check Effect ---
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/user/role");
                const data = await res.json();
                const role: UserRole = data.role;
                const email: string | null = data.email; 

                const canAccess = role === "admin" || email === MASTER_ADMIN_EMAIL;
                
                if (!canAccess) {
                    router.replace("/user_dashboard"); 
                } else {
                    setIsAuthLoading(false);
                    // If authorized, proceed to fetch data
                    fetchHistoryData();
                }

            } catch (error) {
                console.error("Error fetching user role:", error);
                router.replace("/user_dashboard"); 
            }
        };
        checkAuth();

    }, [router]);


    if (isAuthLoading) {
        return <div className={styles.container}>Checking Admin Access...</div>;
    }
    
    
    const filteredLogs = logs.filter((log) => {
        const matchesFilter =
            filter === '' ||
            log.transformerId.toLowerCase().includes(filter.toLowerCase()) || 
            log.location.toLowerCase().includes(filter.toLowerCase());
        const matchesDate = !dateFilter || log.inferenceDate === dateFilter; 
        return matchesFilter && matchesDate;
    });

    return (
        <div className={styles.container}>
            {/* Header Row with Legend and Filters */}
            <div className={styles.headerRow}>
                <div className={styles.legend}>
                    <span className={styles.legendTitle}>Health Status:</span>
                    <span
                        className={`${styles.legendDot} ${styles.green}`}
                        data-tooltip="Healthy: Transformer operating optimally"
                    ></span>
                    <span
                        className={`${styles.legendDot} ${styles.yellow}`}
                        data-tooltip="Moderate: Slight anomalies detected"
                    ></span>
                    <span
                        className={`${styles.legendDot} ${styles.red}`}
                        data-tooltip="Critical: Requires urgent attention"
                    ></span>
                </div>

                <div className={styles.filters}>
                    <input
                        type="text"
                        placeholder="Filter by Transformer ID / Location"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className={styles.filterInput}
                    />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className={styles.datePicker}
                    />
                </div>
            </div>

            <h1 className={styles.title}>Transformer Health History</h1>
            <p className={styles.subtitle}>Track Your Health Index History Records</p>

            {fetchError ? (
                // Display error message
                <p className={styles.error} style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>Error: {fetchError}</p>
            ) : loading ? (
                <p className={styles.loading}>Loading history...</p>
            ) : filteredLogs.length === 0 ? (
                <p className={styles.empty}>No matching history found.</p>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Transformer ID</th>
                                <th>Location</th>
                                <th>Date</th>
                                <th>Time</th>         
                                <th>Health Index</th>
                                <th>Status</th>
                                <th>Parameters</th>
                                <th>Provided Images</th>
                                <th>Grad-CAM Images</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>{log.transformerId}</td>
                                    <td>{log.location}</td>
                                    <td>{log.inferenceDate}</td>
                                    <td>{log.inferenceTime}</td>
                                    <td>{log.healthIndexScore}%</td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${
                                                log.status === 'Healthy'
                                                    ? styles.green
                                                    : log.status === 'Moderate'
                                                    ? styles.yellow
                                                    : styles.red
                                            }`}
                                            title={
                                                log.status === 'Healthy'
                                                    ? 'Transformer operating optimally'
                                                    : log.status === 'Moderate'
                                                    ? 'Slight anomalies detected'
                                                    : 'Transformer requires urgent attention'
                                            }
                                        >
                                            {log.status}
                                        </span>
                                    </td>
                                    <td>
                                        {Object.entries(log.paramsScores).map(([param, score]) => (
                                            <div key={param} className={styles.paramRow}>
                                                <span>{param}</span>
                                                <span className={styles.paramScore}>{score}%</span>
                                            </div>
                                        ))}
                                    </td>
                                    <td>
                                        {log.providedImages?.length ? (
                                            <div className={styles.thumbGrid}>
                                                {log.providedImages.map((img, idx) => (
                                                    <img key={idx} src={img} alt="provided" />
                                                ))}
                                            </div>
                                        ) : (
                                            <span>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {log.gradCamImages?.length ? (
                                            <div className={styles.thumbGrid}>
                                                {log.gradCamImages.map((img, idx) => (
                                                    <img key={idx} src={img} alt="gradcam" />
                                                ))}
                                            </div>
                                        ) : (
                                            <span>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}