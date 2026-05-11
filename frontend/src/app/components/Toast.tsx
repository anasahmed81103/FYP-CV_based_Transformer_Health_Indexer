'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

function SingleToast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 280);
    }, [toast.id, onDismiss]);

    useEffect(() => {
        const duration = toast.duration ?? 4000;
        const timer = setTimeout(handleDismiss, duration);
        return () => clearTimeout(timer);
    }, [toast.duration, handleDismiss]);

    const icons: Record<ToastType, string> = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    return (
        <div
            className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exit : ''}`}
            role="alert"
            aria-live="polite"
        >
            <span className={styles.icon} aria-hidden="true">{icons[toast.type]}</span>
            <span className={styles.message}>{toast.message}</span>
            <button
                className={styles.closeBtn}
                onClick={handleDismiss}
                aria-label="Dismiss notification"
            >
                ✕
            </button>
        </div>
    );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
    if (toasts.length === 0) return null;

    return (
        <div className={styles.container} aria-label="Notifications">
            {toasts.map((toast) => (
                <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

// ---- Hook ----
let _id = 0;
const uid = () => String(++_id);

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
        const id = uid();
        setToasts((prev) => [...prev, { id, type, message, duration }]);
    }, []);

    const success = useCallback((msg: string, duration?: number) => toast(msg, 'success', duration), [toast]);
    const error   = useCallback((msg: string, duration?: number) => toast(msg, 'error', duration), [toast]);
    const warning = useCallback((msg: string, duration?: number) => toast(msg, 'warning', duration), [toast]);
    const info    = useCallback((msg: string, duration?: number) => toast(msg, 'info', duration), [toast]);

    return { toasts, dismiss, toast, success, error, warning, info };
}
