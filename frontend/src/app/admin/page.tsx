// app/admin/page.tsx - FINAL COMPLETE VERSION (Fetching Logic Refined)

"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter as useNextRouter } from "next/navigation";

import { Shield, User, UserCheck, UserX, Crown, History, LogOut } from "lucide-react";
import styles from "./admin.module.css";

// --- Types ---
type UserRole = "admin" | "user" | "suspended" | "guest";
interface UserData {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "User";
  status: "Active" | "Suspended";
}

// --- Helper Component for User Rows (unchanged) ---
interface UserRowProps {
  user: UserData;
  onToggleStatus: (userId: number) => void;
  onToggleRole: (userId: number) => void;
  onViewHistory: (userId: number) => void;
}
const UserRow: React.FC<UserRowProps> = ({ user, onToggleStatus, onToggleRole, onViewHistory }) => (
  <div className={styles.userRow}>
    <div className={styles.userInfo}>
      <div className={styles.userName}>{user.name}</div>
      <div className={styles.userEmail}>{user.email}</div>
    </div>
    <div className={styles.userStatus}>
      <span className={user.role === "Admin" ? styles.adminBadge : styles.userBadge}>
        {user.role === "Admin" ? <Shield size={14} /> : <User size={14} />}
        {user.role}
      </span>
      <span className={user.status === "Active" ? styles.activeBadge : styles.suspendedBadge}>
        {user.status}
      </span>
    </div>
    <div className={styles.userActions}>
      <button
        onClick={() => onToggleStatus(user.id)}
        className={`${styles.btn} ${styles.btnIcon}`}
        title={user.status === "Active" ? "Suspend User" : "Activate User"}
      >
        {user.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
      </button>
      <button
        onClick={() => onToggleRole(user.id)}
        className={`${styles.btn} ${styles.btnIcon}`}
        title={user.role === "Admin" ? "Demote to User" : "Promote to Admin"}
      >
        {user.role === "Admin" ? <User size={16} /> : <Shield size={16} />}
      </button>
      <button
        onClick={() => onViewHistory(user.id)}
        className={`${styles.btn} ${styles.btnIcon}`}
        title="View User History"
      >
        <History size={16} />
      </button>
    </div>
  </div>
);


// --- Main Admin Page Component ---
export default function AdminPage() {
  const router = useNextRouter();

  // --- HOOKS FOR AUTHORIZATION ---
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- HOOKS FOR DYNAMIC DATA (MOVED UP) ---
  const [users, setUsers] = useState<UserData[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // State for data fetch error
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");

  const MASTER_ADMIN_EMAIL = "junaidasif956@gmail.com";
  const userName = "Master Admin";

  // Function to fetch the user list
  const fetchUserList = async () => {
    setIsDataLoading(true);
    setFetchError(null);
    try {
      // NOTE: This calls the new dynamic endpoint to get all users
      const res = await fetch("/api/admin/users");

      if (!res.ok) {
        // If the server returns an HTTP error (404, 500), throw an error.
        // Use res.text() instead of res.json() to read the HTML body.
        const errorBody = await res.text();
        console.error("API Fetch Error Body:", errorBody);
        throw new Error(`Failed to fetch user data. Server responded with status ${res.status}.`);
      }

      const data: UserData[] = await res.json();

      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        throw new Error("API returned invalid data format.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error during data fetch.";
      setFetchError(errorMessage);
      console.error("Failed to fetch user list:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 2. Authorization Check Effect 
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user/role");
        const data = await res.json();
        const role: UserRole = data.role;
        const email: string | null = data.email;

        setCurrentUserRole(role);

        // Authorization check: Must be admin role OR Master Admin email
        const canAccess = role === "admin" || email === MASTER_ADMIN_EMAIL;

        if (!canAccess) {
          router.replace("/user_dashboard");
        } else {
          setIsAuthLoading(false);
          // CRITICAL: If authorized, START fetching the user list
          fetchUserList();
        }

      } catch (error) {
        console.error("Error fetching user role:", error);
        router.replace("/login");
      }
    };
    checkAuth();
  }, [router]); // fetchUserList is excluded from dependency array as it's stable and called only once initially


  // --- Access Denied / Loading Handlers ---
  if (isAuthLoading || currentUserRole === null) {
    return <div className={styles.loadingContainer}>Checking Authorization...</div>;
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

  // --- HANDLER FUNCTIONS (MODIFIED TO CALL API) ---
  const handleToggleRole = async (userId: number) => {
    const userToUpdate = users.find(user => user.id === userId);
    if (!userToUpdate) return;

    // Determine the target role based on the current state and database logic
    const currentRole = userToUpdate.role.toLowerCase(); // 'admin' or 'user'
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole: targetRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to update role. Status: ${res.status}`);
      }

      // SUCCESS: Refresh the entire user list to reflect the DB change
      await fetchUserList();

    } catch (error) {
      alert(`Error updating role: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
    }
  };

  const handleToggleStatus = async (userId: number) => {
    const userToUpdate = users.find(user => user.id === userId);
    if (!userToUpdate) return;

    const currentStatus = userToUpdate.status.toLowerCase();
    const targetRole = currentStatus === 'active' ? 'suspended' : 'user';

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole: targetRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to update status. Status: ${res.status}`);
      }

      // SUCCESS: Refresh the entire user list to reflect the DB change
      await fetchUserList();

    } catch (error) {
      alert(`Error updating status: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error);
    }
  };


  const handleViewHistory = (userId: number) => {
    alert(`Viewing history for user ID: ${userId}`);
  };

  const handleAddAdmin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newAdminEmail.trim() === "") {
      alert("Please enter a valid email address.");
      return;
    }
    console.log(`Attempting to grant admin access to ${newAdminEmail}`);
    setNewAdminEmail("");
  };

  // --- FINAL RENDER ---
  return (
    <div className={styles.adminContainer}>
      <div className={styles.contentWrapper}>
        <header className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Admin Portal</h1>
            <p className={styles.subtitle}>Welcome, {userName}.</p>
          </div>
          <button onClick={handleLogout} className={styles.btn} title="Logout" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        <main className={styles.grid}>
          {/* Staff Management Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Staff Management</h2>
              <p className={styles.cardSubtitle}>Oversee all registered users and their roles.</p>
            </div>

            {/* Display Loading, Error, or User List */}
            {isDataLoading ? (
              <div className={styles.loadingContainer}>Loading User List...</div>
            ) : fetchError ? (
              <p className={styles.errorText} style={{ color: 'red' }}>Error fetching data: {fetchError}. Check your server logs and API import paths.</p>
            ) : (
              <div className={styles.userList}>
                {users.length > 0 ? (
                  users.map(user => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onToggleStatus={handleToggleStatus}
                      onToggleRole={handleToggleRole}
                      onViewHistory={handleViewHistory}
                    />
                  ))
                ) : (
                  <p className={styles.emptyList}>No users found in the database.</p>
                )}
              </div>
            )}
          </div>

          {/* Master Admin Card */}
          <div className={`${styles.card} ${styles.masterAdminCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.masterAdminTitleWrapper}>
                <Crown className={styles.masterAdminIcon} size={24} />
                <h2 className={styles.cardTitle}>Master Admin Controls</h2>
              </div>
              <p className={styles.cardSubtitle}>Grant administrative privileges to a user.</p>
            </div>
            <form onSubmit={handleAddAdmin} className={styles.addAdminForm}>
              <label htmlFor="admin-email" className={styles.formLabel}>
                New Admin Email
              </label>
              <div className={styles.inputGroup}>
                <input
                  id="admin-email"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={styles.input}
                />
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}