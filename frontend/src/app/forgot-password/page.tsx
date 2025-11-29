'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Request failed");

            setMessage(data.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundEffects}>
                <div className={styles.backgroundGradients}></div>
                <div className={styles.backgroundPattern}></div>
            </div>

            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Forgot Password</h1>
                    <p className={styles.subtitle}>Enter your email to receive a reset link</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    {message && <div className={styles.successMessage} style={{ color: '#4ade80', textAlign: 'center', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '0.5rem' }}>{message}</div>}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
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
                        {isLoading ? <span className={styles.spinner}></span> : 'Send Reset Link'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p className={styles.footerText}>
                        Remember your password?{' '}
                        <Link href="/login" className={styles.link}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
