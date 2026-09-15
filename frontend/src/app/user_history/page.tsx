// user_history/page.tsx

'use client';

import { useEffect, useState, Suspense } from 'react';
import styles from './user_history.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LogOut, LayoutDashboard, Crown, Activity,
  ChevronLeft, ChevronRight, Loader2,
  InboxIcon, AlertCircle, ChevronsUpDown,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────
type UserRole = 'admin' | 'user' | 'suspended' | 'guest';

interface HistoryLog {
  id: number;
  transformerId: string;
  location: string;
  inferenceDate: string;
  inferenceTime: string;
  healthIndexScore: number;
  paramsScores: Record<string, any>;
  providedImages?: string[];
  gradCamImages?: string[];
  status: 'Healthy' | 'Moderate' | 'Critical';
  feedback?: string;
}

interface PaginationState {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

const MASTER_ADMIN_EMAIL = 'junaidasif956@gmail.com';

// ── Helpers ──────────────────────────────────────────────────
function parseImages(raw: string[] | string | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return [raw]; }
}

function statusClass(status: string) {
  if (status === 'Healthy')  return styles.green;
  if (status === 'Moderate') return styles.yellow;
  return styles.red;
}

// ── Inner component ──────────────────────────────────────────
function HistoryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const scope = searchParams.get('scope');

  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    totalCount: 0, page: 1, limit: 10, totalPages: 1, hasMore: false,
  });
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // ── Fetch history ────────────────────────────────────────
  const fetchHistoryData = async (role: UserRole, email: string | null, page = 1) => {
    setLoading(true);
    setFetchError(null);
    const isAdmin = role === 'admin' || email === MASTER_ADMIN_EMAIL;
    let apiUrl = `/api/history?page=${page}&limit=10`;
    if (isAdmin) {
      if (targetUserId) apiUrl = `/api/admin/history?userId=${targetUserId}&page=${page}&limit=10`;
      else if (scope === 'all') apiUrl = `/api/admin/history?scope=all&page=${page}&limit=10`;
    }
    try {
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (res.status === 401) { router.replace('/login'); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.logs && data.pagination) {
        setLogs(data.logs);
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      } else {
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load history.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Auth check ───────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user/role');
        const data = await res.json();
        const role: UserRole = data.role;
        const email: string | null = data.email;
        setCurrentUserRole(role);
        setCurrentUserEmail(email);
        const isAdmin = role === 'admin' || email === MASTER_ADMIN_EMAIL;
        if (!isAdmin) { router.replace('/user_dashboard'); return; }
        setIsAuthLoading(false);
        fetchHistoryData(role, email);
      } catch {
        router.replace('/login');
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, targetUserId, scope]);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* no-op */ }
    router.replace('/login');
  };

  // ── Derived state ────────────────────────────────────────
  const filteredLogs = logs.filter((log) => {
    const matchesText =
      !filter ||
      log.transformerId.toLowerCase().includes(filter.toLowerCase()) ||
      log.location.toLowerCase().includes(filter.toLowerCase());
    const matchesDate = !dateFilter || log.inferenceDate === dateFilter;
    return matchesText && matchesDate;
  });

  const isAdmin = currentUserRole === 'admin' || currentUserEmail === MASTER_ADMIN_EMAIL;

  const pageTitle =
    scope === 'all' && isAdmin   ? 'All Transformer History' :
    targetUserId  && isAdmin     ? `History — User #${targetUserId}` :
                                   'Transformer Health History';

  const pageSubtitle =
    scope === 'all' && isAdmin   ? 'Complete inspection records from all users.' :
    targetUserId  && isAdmin     ? 'Inspection records for this specific user.' :
                                   'Your inspection log with scores and Grad-CAM images.';

  // ── Auth loading ─────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.wrapper}>
          <div className={styles.stateBox}>
            <div className={`${styles.stateIcon} ${styles.stateIconLoading}`}>
              <div className={styles.spinnerRing} />
            </div>
            <p className={styles.stateTitle}>Checking permissions…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>

        {/* ── Top nav bar ── */}
        <nav className={styles.topNav}>
          <Link href="/" className={styles.navBrand}>
            <div className={styles.navBrandMark}>
              <Activity size={16} />
            </div>
            <span className={styles.navBrandText}>Health Indexer</span>
          </Link>

          <div className={styles.navActions}>
            <button
              onClick={() => router.push('/user_dashboard')}
              className={`${styles.navBtn} ${styles.navBtnAnalyze}`}
              title="Analyze Transformer"
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`${styles.navBtn} ${styles.navBtnAdmin}`}
                title="Admin Portal"
              >
                <Crown size={15} />
                <span>Admin</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className={`${styles.navBtn} ${styles.navBtnLogout}`}
              title="Logout"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </nav>

        {/* ── Page header ── */}
        <header className={styles.pageHeader}>
          <p className={styles.pageTag}>Inspection Records</p>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          <p className={styles.pageSubtitle}>{pageSubtitle}</p>
        </header>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <input
              type="text"
              placeholder="Search by ID or location…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={styles.filterInput}
              aria-label="Filter by transformer ID or location"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={styles.datePicker}
              aria-label="Filter by date"
            />
          </div>

          {/* Status legend as labeled pills */}
          <div className={styles.legend} aria-label="Status legend">
            <div className={`${styles.legendPill} ${styles.green}`}>
              <span className={styles.legendDot} />
              Healthy
            </div>
            <div className={`${styles.legendPill} ${styles.yellow}`}>
              <span className={styles.legendDot} />
              Moderate
            </div>
            <div className={`${styles.legendPill} ${styles.red}`}>
              <span className={styles.legendDot} />
              Critical
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {fetchError ? (
          <div className={styles.stateBox}>
            <div className={`${styles.stateIcon} ${styles.stateIconError}`}>
              <AlertCircle size={22} />
            </div>
            <p className={styles.stateTitle}>Failed to load history</p>
            <p className={styles.stateDesc}>{fetchError}</p>
          </div>
        ) : loading ? (
          <div className={styles.stateBox}>
            <div className={`${styles.stateIcon} ${styles.stateIconLoading}`}>
              <div className={styles.spinnerRing} />
            </div>
            <p className={styles.stateTitle}>Loading records…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={styles.stateBox}>
            <div className={`${styles.stateIcon} ${styles.stateIconEmpty}`}>
              <InboxIcon size={22} />
            </div>
            <p className={styles.stateTitle}>No records found</p>
            <p className={styles.stateDesc}>
              {filter || dateFilter
                ? 'Try adjusting your search filters.'
                : 'No inspection history yet. Run an analysis from the dashboard.'}
            </p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Transformer ID</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>H. Index</th>
                    <th>Status</th>
                    <th>Grad-CAM</th>
                    <th>Parameters</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const gradCams = parseImages(log.gradCamImages);
                    const inputImgs = parseImages(log.providedImages);
                    const sc = statusClass(log.status);

                    return (
                      <tr key={log.id}>
                        {/* Transformer ID */}
                        <td className={styles.idCell}>{log.transformerId}</td>

                        {/* Location */}
                        <td
                          className={styles.locationCell}
                          title={log.location}
                        >
                          {log.location}
                        </td>

                        {/* Date */}
                        <td className={styles.dateCell}>{log.inferenceDate}</td>

                        {/* Time */}
                        <td className={styles.timeCell}>{log.inferenceTime}</td>

                        {/* Health Index Score */}
                        <td className={styles.scoreCell}>
                          <span className={styles.scoreValue}>
                            {log.healthIndexScore}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`${styles.statusBadge} ${sc}`}>
                            <span className={styles.statusDot} />
                            {log.status}
                          </span>
                        </td>



                        {/* Grad-CAM */}
                        <td>
                          {gradCams.length > 0 ? (
                            <div className={styles.thumbRow}>
                              {gradCams.map((raw, i) => {
                                const rawStr = typeof raw === 'string' ? raw : '';
                                const src = rawStr.trim()
                                  ? rawStr.startsWith('http') || rawStr.startsWith('/')
                                    ? rawStr : `/${rawStr}`
                                  : null;
                                return src ? (
                                  <img
                                    key={i}
                                    src={src}
                                    alt={`Grad-CAM ${i + 1}`}
                                    className={styles.thumb}
                                    onClick={() => window.open(src, '_blank')}
                                    title="Click to open full size"
                                  />
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className={styles.noData}>—</span>
                          )}
                        </td>

                        {/* Parameters */}
                        <td>
                          <details className={styles.paramsDetails}>
                            <summary className={styles.paramsSummary}>
                              <ChevronsUpDown size={12} />
                              View ({Object.keys(log.paramsScores).length})
                            </summary>
                            <div className={styles.paramsDropdown}>
                              {Object.entries(log.paramsScores).map(([param, scoreInfo]) => {
                                let val = scoreInfo;
                                if (typeof scoreInfo === 'object' && scoreInfo !== null && 'score' in scoreInfo) {
                                  val = scoreInfo.score;
                                }
                                return (
                                  <div key={param} className={styles.paramRow}>
                                    <span className={styles.paramName}>
                                      {param.replace(/_/g, ' ')}
                                    </span>
                                    <span className={styles.paramScore}>
                                      {typeof val === 'number' ? val.toFixed(2) : String(val)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </td>

                        {/* Feedback */}
                        <td
                          className={styles.feedbackCell}
                          title={log.feedback || undefined}
                        >
                          {log.feedback || <span className={styles.noData}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className={styles.pagination}>
              <p className={styles.paginationInfo}>
                Showing <strong>{logs.length}</strong> of{' '}
                <strong>{pagination.totalCount}</strong> records &middot; Page{' '}
                <strong>{pagination.page}</strong> of{' '}
                <strong>{pagination.totalPages}</strong>
              </p>
              <div className={styles.paginationControls}>
                <button
                  className={styles.pageBtn}
                  onClick={() =>
                    fetchHistoryData(currentUserRole!, currentUserEmail, currentPage - 1)
                  }
                  disabled={currentPage <= 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <button
                  className={styles.pageBtn}
                  onClick={() =>
                    fetchHistoryData(currentUserRole!, currentUserEmail, currentPage + 1)
                  }
                  disabled={currentPage >= pagination.totalPages || loading}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page export ──────────────────────────────────────────────
export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
          Loading…
        </div>
      }
    >
      <HistoryPageInner />
    </Suspense>
  );
}
