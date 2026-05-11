'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, Activity, Zap, Shield, TrendingUp, ArrowLeft } from 'lucide-react';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const { email, password } = formData;
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password.trim()) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      router.push('/user_dashboard');
    } catch (err: any) {
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Ambient orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      {/* ── Left brand panel (desktop only) ── */}
      <aside className={styles.brandPanel}>
        <div className={styles.brandTop}>
          {/* Logo */}
          <Link href="/" className={styles.brandLogo}>
            <div className={styles.brandLogoMark}>
              <Activity size={18} />
            </div>
            <span className={styles.brandLogoText}>Health Indexer</span>
          </Link>

          {/* Headline */}
          <div className={styles.brandHeadline}>
            <span className={styles.brandTag}>AI-Powered Inspection</span>
            <h2 className={styles.brandTitle}>
              Transformer<br />
              <span>Health</span> at a Glance
            </h2>
            <p className={styles.brandDesc}>
              Upload a field image and get a Grad-CAM heatmap, defect
              score, and maintenance recommendation — in seconds.
            </p>
          </div>

          {/* Stats */}
          <div className={styles.brandStats}>
            <div className={styles.brandStat}>
              <div className={`${styles.brandStatIcon} ${styles.orange}`}>
                <Zap size={16} />
              </div>
              <div className={styles.brandStatText}>
                <span className={styles.brandStatValue}>95%+ Accuracy</span>
                <span className={styles.brandStatLabel}>EfficientNet-B0 regression model</span>
              </div>
            </div>
            <div className={styles.brandStat}>
              <div className={`${styles.brandStatIcon} ${styles.teal}`}>
                <Shield size={16} />
              </div>
              <div className={styles.brandStatText}>
                <span className={styles.brandStatValue}>13 Parameters</span>
                <span className={styles.brandStatLabel}>Hardware defects evaluated per image</span>
              </div>
            </div>
            <div className={styles.brandStat}>
              <div className={`${styles.brandStatIcon} ${styles.white}`}>
                <TrendingUp size={16} />
              </div>
              <div className={styles.brandStatText}>
                <span className={styles.brandStatValue}>Full History</span>
                <span className={styles.brandStatLabel}>GPS-tagged inspection log with Grad-CAM</span>
              </div>
            </div>
          </div>
        </div>

        <p className={styles.brandFooter}>© 2026 FAST — Transformer Health Indexer</p>
      </aside>

      {/* ── Right form panel ── */}
      <main className={styles.formPanel}>
        {/* Back to home — mobile only */}
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <div className={styles.formCard}>
          {/* Mobile logo */}
          <Link href="/" className={styles.mobileSlug}>
            <div className={styles.mobileSlugDot}>
              <Activity size={14} />
            </div>
            <span className={styles.mobileSlugText}>Health Indexer</span>
          </Link>

          <div className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>Welcome back</h1>
            <p className={styles.cardSubtitle}>Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {errors.general && (
              <div className={styles.errorAlert} role="alert">
                {errors.general}
              </div>
            )}

            {/* Email */}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={17} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                  autoComplete="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
              </div>
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className={`${styles.input} ${styles.inputWithEye} ${errors.password ? styles.inputError : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeButton}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            </div>

            {/* Remember me + Forgot */}
            <div className={styles.formExtras}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitBtn}
            >
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                <>
                  <span>Sign In</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <div className={styles.cardFooter}>
            <span>Don&apos;t have an account?</span>
            <Link href="/signup" className={styles.cardFooterLink}>Create one</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
