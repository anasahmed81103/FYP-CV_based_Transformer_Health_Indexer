// user_history/page.tsx - MODIFIED FOR ADMIN SCOPE FETCHING

'use client';

import { useEffect, useState } from 'react';
import styles from './user_history.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSignOutAlt, FaChartLine, FaCrown } from 'react-icons/fa';

// Define possible user roles
type UserRole = "admin" | "user" | "suspended" | "guest";

interface HistoryLog {
    id: number;
    transformerId: string;
    location: string;
    inferenceDate: string;
    inferenceTime: string;
    healthIndexScore: number;
    paramsScores: Record<string, number>;
    providedImages?: string[];
    gradCamImages?: string[];
    status: 'Healthy' | 'Moderate' | 'Critical';
    feedback?: string;
}

export default function HistoryPage() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Use this hook to get URL parameters

    const targetUserId = searchParams.get('userId'); // Specific user history requested
    const scope = searchParams.get('scope'); // 'all' history requested

    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false
    });

    // --- STATE FOR AUTHORIZATION ---
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";
    // ------------------------------------

    // MODIFIED: Function to fetch history data based on access scope
    const fetchHistoryData = async (role: UserRole, email: string | null, page = 1) => {
        setLoading(true);
        setFetchError(null);

        const isGlobalAdmin = role === "admin" || email === MASTER_ADMIN_EMAIL;
        let apiUrl = `/api/history?page=${page}&limit=10`; // Default: fetch current user's history with pagination

        if (isGlobalAdmin) {
            // Admin is requesting a specific scope
            if (targetUserId) {
                // Admin viewing a specific user
                apiUrl = `/api/admin/history?userId=${targetUserId}&page=${page}&limit=10`;
            } else if (scope === 'all') {
                // Admin viewing all history
                apiUrl = `/api/admin/history?scope=all&page=${page}&limit=10`;
            }
        }

        try {
            const res = await fetch(apiUrl, { cache: "no-store" });

            if (res.status === 401) {
                router.replace("/login");
                return;
            }

            if (!res.ok) {
                let errorData = {};
                try { errorData = await res.json(); } catch { }
                const errorMessage = (errorData as any).error || `Server error (Status: ${res.status})`;
                throw new Error(errorMessage);
            }

            const data = await res.json();
            // The API now returns { logs: [], pagination: {} }
            if (data.logs && data.pagination) {
                setLogs(data.logs);
                setPagination(data.pagination);
                setCurrentPage(data.pagination.page);
            } else {
                // Fallback for old API format if it still exists elsewhere
                setLogs(Array.isArray(data) ? data : []);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to load history.";
            setFetchError(errorMessage);
            console.error("History fetch error:", error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }


    // --- Authorization Check Effect (CRITICALLY MODIFIED) ---
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/user/role");
                const data = await res.json();
                const role: UserRole = data.role;
                const email: string | null = data.email;
                const id: number | null = data.id || null;

                setCurrentUserRole(role);
                setCurrentUserEmail(email);

                const isGlobalAdmin = role === "admin" || email === MASTER_ADMIN_EMAIL;

                if (!isGlobalAdmin) {
                    router.replace("/user_dashboard");
                    return;
                }

                // If authorized, proceed to fetch data
                setIsAuthLoading(false);
                fetchHistoryData(role, email);

            } catch (error) {
                console.error("Error fetching user role:", error);
                router.replace("/login"); // Redirect to login on API failure
            }
        };
        checkAuth();

    }, [router, targetUserId, scope]); // Include query parameters in dependency array

    if (isAuthLoading) {
        return <div className={styles.container}>Checking Access Permissions...</div>;
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed', error);
            router.replace('/login');
        }
    };

    const filteredLogs = logs.filter((log) => {
        const matchesFilter =
            filter === '' ||
            log.transformerId.toLowerCase().includes(filter.toLowerCase()) ||
            log.location.toLowerCase().includes(filter.toLowerCase());
        const matchesDate = !dateFilter || log.inferenceDate === dateFilter;
        return matchesFilter && matchesDate;
    });

    // Determine the title based on context
    const pageTitle = (scope === 'all' && currentUserRole === 'admin') ? "All Transformer Health History (Admin View)" :
        (targetUserId && currentUserRole === 'admin') ? `History for User ID: ${targetUserId} (Admin View)` :
            "My Transformer Health History";

    const pageSubtitle = (scope === 'all' && currentUserRole === 'admin') ? "Review all records from every user." :
        (targetUserId && currentUserRole === 'admin') ? "Review this user's specific records." :
            "Track Your Health Index History Records";


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
                    <button onClick={handleLogout} className={styles.logoutButton} title="Logout" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '1rem' }}>
                        <FaSignOutAlt size={16} />
                        <span>Logout</span>
                    </button>
                    <button onClick={() => router.push('/user_dashboard')} title="Analyze Transformer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '0.5rem' }}>
                        <FaChartLine size={16} />
                        <span>Analyze</span>
                    </button>
                    {(currentUserRole === 'admin' || currentUserEmail === MASTER_ADMIN_EMAIL) && (
                        <button onClick={() => router.push('/admin')} title="Admin Portal" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '0.5rem' }}>
                            <FaCrown size={16} />
                            <span>Admin</span>
                        </button>
                    )}
                </div>
            </div>

            <h1 className={styles.title}>{pageTitle}</h1>
            <p className={styles.subtitle}>{pageSubtitle}</p>

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
                                <th>Input Images</th>
                                <th>Grad-CAM</th>
                                <th>Parameters</th>
                                <th>Feedback</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>{log.transformerId}</td>
                                    <td className={styles.locationCell}>{log.location}</td>
                                    <td>{log.inferenceDate}</td>
                                    <td>{log.inferenceTime}</td>
                                    <td className={styles.healthCell}>
                                        <strong>{log.healthIndexScore}</strong>
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${log.status === 'Healthy'
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
                                        {log.providedImages && Array.isArray(log.providedImages) && log.providedImages.length > 0 ? (
                                            <div className={styles.imageThumbContainer}>
                                                {log.providedImages.map((img, idx) => {
                                                    const imgSrc = typeof img === 'string' && img.trim() !== '' ? img : null;
                                                    return imgSrc ? (
                                                        <img
                                                            key={idx}
                                                            src={imgSrc}
                                                            alt={`input-${idx}`}
                                                            className={styles.imageThumb}
                                                            onClick={() => window.open(imgSrc, '_blank')}
                                                        />
                                                    ) : null;
                                                })}
                                            </div>
                                        ) : (
                                            <span className={styles.noData}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {log.gradCamImages && Array.isArray(log.gradCamImages) && log.gradCamImages.length > 0 ? (
                                            <div className={styles.imageThumbContainer}>
                                                {log.gradCamImages.map((img, idx) => {
                                                    const imgUrl = typeof img === 'string' && img.trim() !== ''
                                                        ? (img.startsWith('http') ? img : `/${img}`)
                                                        : null;
                                                    return imgUrl ? (
                                                        <img
                                                            key={idx}
                                                            src={imgUrl}
                                                            alt={`gradcam-${idx}`}
                                                            className={styles.imageThumb}
                                                            onClick={() => window.open(imgUrl, '_blank')}
                                                        />
                                                    ) : null;
                                                })}
                                            </div>
                                        ) : (
                                            <span className={styles.noData}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <details className={styles.paramsDetails}>
                                            <summary className={styles.paramsSummary}>
                                                View ({Object.keys(log.paramsScores).length})
                                            </summary>
                                            <div className={styles.paramsDropdown}>
                                                {Object.entries(log.paramsScores).map(([param, score]) => (
                                                    <div key={param} className={styles.paramRow}>
                                                        <span className={styles.paramName}>{param.replace(/_/g, ' ')}</span>
                                                        <span className={styles.paramScore}>{typeof score === 'number' ? score.toFixed(2) : score}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </td>
                                    <td className={styles.feedbackCell} style={{ maxWidth: '200px', whiteSpace: 'pre-wrap' }}>
                                        {log.feedback ? (
                                            <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                                {log.feedback}
                                            </div>
                                        ) : <span className={styles.noData}>—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className={styles.pagination}>
                        <div className={styles.paginationInfo}>
                            Showing <strong>{logs.length}</strong> of <strong>{pagination.totalCount}</strong> records | Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
                        </div>
                        <div className={styles.paginationControls}>
                            <button 
                                className={styles.pageButton} 
                                onClick={() => fetchHistoryData(currentUserRole!, currentUserEmail, currentPage - 1)}
                                disabled={currentPage <= 1 || loading}
                            >
                                Previous
                            </button>
                            <button 
                                className={`${styles.pageButton} ${styles.primary}`}
                                onClick={() => fetchHistoryData(currentUserRole!, currentUserEmail, currentPage + 1)}
                                disabled={currentPage >= pagination.totalPages || loading}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}