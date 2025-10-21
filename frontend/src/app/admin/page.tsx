"use client";

import React, { useState, FormEvent } from "react";
import { Shield, User, UserCheck, UserX, Crown, History } from "lucide-react";
import styles from "./admin.module.css";

// --- Types ---
interface UserData {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "User";
  status: "Active" | "Suspended";
}

interface UserRowProps {
  user: UserData;
  onToggleStatus: (userId: number) => void;
  onToggleRole: (userId: number) => void;
  onViewHistory: (userId: number) => void;
}

// --- Mock Data ---
const initialUsers: UserData[] = [
  { id: 1, name: "Junaid Asif", email: "junaid.asif@gmail.com", role: "Admin", status: "Active" },
  { id: 2, name: "Anas Ahmed Sheikh", email: "anas.ahmed@gmail.com", role: "User", status: "Active" },
  { id: 3, name: "Ibrahim Junaid", email: "ibrahim.junaid@gmail.com", role: "User", status: "Suspended" },
  { id: 4, name: "Julian Sato", email: "julian.s@example.com", role: "Admin", status: "Active" },
  { id: 5, name: "Aria Petrova", email: "aria.p@example.com", role: "User", status: "Active" },
];

// --- Helper Component for User Rows ---
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
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const userName = "Master Admin";

  const handleToggleStatus = (userId: number) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, status: user.status === "Active" ? "Suspended" : "Active" }
        : user
    ));
    console.log(`Toggled status for user ${userId}`);
  };

  const handleToggleRole = (userId: number) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, role: user.role === "Admin" ? "User" : "Admin" }
        : user
    ));
    console.log(`Toggled role for user ${userId}`);
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

    const newUser: UserData = {
      id: users.length + 1,
      name: "New Admin (Invited)",
      email: newAdminEmail,
      role: "Admin",
      status: "Active",
    };

    setUsers([...users, newUser]);
    setNewAdminEmail("");
    console.log(`Master Admin granted admin access to ${newAdminEmail}`);
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.contentWrapper}>
        <header className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Admin Portal</h1>
            <p className={styles.subtitle}>Welcome, {userName}.</p>
          </div>
        </header>

        <main className={styles.grid}>
          {/* Staff Management Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Staff Management</h2>
              <p className={styles.cardSubtitle}>Oversee all registered users and their roles.</p>
            </div>
            <div className={styles.userList}>
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onToggleStatus={handleToggleStatus}
                  onToggleRole={handleToggleRole}
                  onViewHistory={handleViewHistory}
                />
              ))}
            </div>
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
