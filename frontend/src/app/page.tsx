import Link from "next/link";
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Background Effects */}
      <div className={styles.backgroundEffects}>
        <div className={styles.backgroundOrb1}></div>
        <div className={styles.backgroundOrb2}></div>
        <div className={styles.backgroundOrb3}></div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Logo/Title */}
          <div className={styles.headerSection}>
            <h1 className={styles.title}>
              KE Portal
            </h1>
            <p className={styles.subtitle}>
              Your Gateway to Excellence
            </p>
          </div>

          {/* Description */}
          <div className={styles.descriptionSection}>
            <p className={styles.description}>
              Welcome to the KE Portal - enter the future of AI-powered management
              and enhance productivity. Join us to use our state of art Computer Vision system.
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className={styles.navigationSection}>
            <div className={styles.buttonGroup}>
              <Link href="/login" className={styles.loginButton}>
                <span className={styles.loginButtonText}>Login</span>
                <div className={styles.loginButtonOverlay}></div>
              </Link>

              <Link href="/signup" className={styles.signupButton}>
                <span className={styles.signupButtonText}>Signup</span>
                <div className={styles.signupButtonOverlay}></div>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.featureIconOrange}`}>
                <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Lightning Fast</h3>
              <p className={styles.featureDescription}>Experience blazing fast performance with our optimized infrastructure.</p>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.featureIconGreen}`}>
                <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Secure & Reliable</h3>
              <p className={styles.featureDescription}>Your data is protected with enterprise-grade security measures.</p>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.featureIconGradient}`}>
                <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>User Friendly</h3>
              <p className={styles.featureDescription}>Intuitive interface designed for maximum productivity and ease of use.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © 2025 KE Portal. All rights reserved. 
          </p>
        </footer>
      </div>
    </div>
  );
}