'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../login/login.module.css';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setError("Missing verification token");
            setIsLoading(false);
            return;
        }

        // Auto-verify on page load
        const verifyEmail = async () => {
            try {
                const response = await fetch("/api/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!response.ok) throw new Error(data.error || "Verification failed");

                setMessage(data.message);

                // Redirect to login after 3 seconds
                setTimeout(() => router.push('/login'), 3000);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        verifyEmail();
    }, [token, router]);

    if (!token) {
        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title} style={{ color: 'red' }}>Invalid Link</h1>
                    <p className={styles.subtitle}>Missing verification token.</p>
                    <Link href="/signup" className={styles.submitButton} style={{ textAlign: 'center', display: 'block', marginTop: '20px', textDecoration: 'none' }}>
                        Sign Up Again
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                {isLoading && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                            <div className={styles.spinner} style={{ width: '40px', height: '40px' }}></div>
                        </div>
                        <h1 className={styles.title}>Verifying Email...</h1>
                        <p className={styles.subtitle}>Please wait while we verify your email address.</p>
                    </>
                )}

                {!isLoading && message && (
                    <>
                        <div style={{ fontSize: '60px', textAlign: 'center', marginBottom: '20px' }}>✅</div>
                        <h1 className={styles.title} style={{ color: '#10b981' }}>Email Verified!</h1>
                        <p className={styles.subtitle}>{message}</p>
                        <p className={styles.subtitle} style={{ marginTop: '20px' }}>Redirecting to login...</p>
                    </>
                )}

                {!isLoading && error && (
                    <>
                        <div style={{ fontSize: '60px', textAlign: 'center', marginBottom: '20px' }}>❌</div>
                        <h1 className={styles.title} style={{ color: '#ef4444' }}>Verification Failed</h1>
                        <p className={styles.subtitle} style={{ color: '#ef4444' }}>{error}</p>
                        <Link href="/signup" className={styles.submitButton} style={{ textAlign: 'center', display: 'block', marginTop: '20px', textDecoration: 'none' }}>
                            Sign Up Again
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className={styles.container}>
            <div className={styles.backgroundEffects}>
                <div className={styles.backgroundGradients}></div>
                <div className={styles.backgroundPattern}></div>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
