'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../login/login.module.css';
import { FaEye, FaEyeSlash } from "react-icons/fa";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (!token) {
            setError("Missing reset token");
            return;
        }

        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Reset failed");

            setMessage("Password reset successful! Redirecting to login...");
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title} style={{ color: 'red' }}>Invalid Link</h1>
                    <p className={styles.subtitle}>Missing reset token.</p>
                    <Link href="/forgot-password" className={styles.submitButton} style={{ textAlign: 'center', display: 'block', marginTop: '20px' }}>
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h1 className={styles.title}>Reset Password</h1>
                <p className={styles.subtitle}>Enter your new password</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.errorMessage}>{error}</div>}
                {message && <div className={styles.successMessage} style={{ color: '#4ade80', textAlign: 'center', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '0.5rem' }}>{message}</div>}

                <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>New Password</label>
                    <div className={styles.passwordWrapper}>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            disabled={isLoading}
                            className={styles.input}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={styles.eyeButton}
                            tabIndex={-1}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        disabled={isLoading}
                        className={styles.input}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
                >
                    {isLoading ? <span className={styles.spinner}></span> : 'Reset Password'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className={styles.container}>
            <div className={styles.backgroundEffects}>
                <div className={styles.backgroundGradients}></div>
                <div className={styles.backgroundPattern}></div>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
