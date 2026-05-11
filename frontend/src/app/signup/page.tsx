'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, Activity, ArrowLeft } from 'lucide-react';
import styles from '../auth.module.css';

// ── Password strength helper ──────────────────────────────────
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(pwd: string): { level: StrengthLevel; score: number } | null {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const level: StrengthLevel =
    score <= 1 ? 'weak' :
    score <= 2 ? 'fair' :
    score <= 3 ? 'good' : 'strong';

  return { level, score };
}

const strengthLabels: Record<StrengthLevel, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

// ── Component ─────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim())  newErrors.lastName  = 'Last name is required';

    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8)
      newErrors.password = 'Must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      newErrors.password = 'Must contain uppercase, lowercase, and a number';

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signup failed');
      router.push('/verify-email');
    } catch (error: any) {
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Ambient orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      {/* ── Form panel (full width — no brand panel on signup to avoid scroll) ── */}
      <main className={styles.formPanel}>
        {/* Back to home */}
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <div className={`${styles.formCard} ${styles.formCardWide}`}>
          {/* Mobile logo */}
          <Link href="/" className={styles.mobileSlug}>
            <div className={styles.mobileSlugDot}>
              <Activity size={14} />
            </div>
            <span className={styles.mobileSlugText}>Health Indexer</span>
          </Link>

          <div className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>Create account</h1>
            <p className={styles.cardSubtitle}>
              Already have one?{' '}
              <Link href="/login" className={styles.cardFooterLink}>Sign in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {errors.general && (
              <div className={styles.errorAlert} role="alert">
                {errors.general}
              </div>
            )}

            {/* Name row */}
            <div className={styles.nameRow}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName" className={styles.label}>First name</label>
                <div className={styles.inputWrapper}>
                  <User className={styles.inputIcon} size={17} />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Ahmad"
                    disabled={isLoading}
                    autoComplete="given-name"
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                  />
                </div>
                {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="lastName" className={styles.label}>Last name</label>
                <div className={styles.inputWrapper}>
                  <User className={styles.inputIcon} size={17} />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Khan"
                    disabled={isLoading}
                    autoComplete="family-name"
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                  />
                </div>
                {errors.lastName && <span className={styles.errorText}>{errors.lastName}</span>}
              </div>
            </div>

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
                  placeholder="Create a strong password"
                  disabled={isLoading}
                  autoComplete="new-password"
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
              {/* Strength bar */}
              {passwordStrength && (
                <>
                  <div className={styles.strengthBar} aria-hidden="true">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`${styles.strengthSegment} ${
                          passwordStrength.score >= seg
                            ? `${styles.active} ${styles[passwordStrength.level]}`
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`${styles.strengthLabel} ${styles[passwordStrength.level]}`}>
                    {strengthLabels[passwordStrength.level]}
                  </span>
                </>
              )}
              {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={17} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={`${styles.input} ${styles.inputWithEye} ${errors.confirmPassword ? styles.inputError : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.eyeButton}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className={styles.errorText}>{errors.confirmPassword}</span>
              )}
            </div>

            {/* Terms */}
            <label className={styles.termsLabel}>
              <input type="checkbox" className={styles.checkbox} required />
              <span>
                I agree to the{' '}
                <Link href="/terms" className={styles.termsLink}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                <>
                  <span>Create Account</span>
                  <UserPlus size={18} />
                </>
              )}
            </button>
          </form>

          <div className={styles.cardFooter}>
            <span>Already have an account?</span>
            <Link href="/login" className={styles.cardFooterLink}>Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
