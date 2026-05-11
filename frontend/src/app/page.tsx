import Link from "next/link";
import { Activity, Shield, Zap, TrendingUp } from "lucide-react";
import styles from './page.module.css';

export const metadata = {
  title: "FAST — Transformer Health Indexer",
  description: "AI-powered Computer Vision system for real-time pole-mounted transformer health analysis. Predict failures before they happen.",
};

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Background */}
      <div className={styles.backgroundEffects}>
        <div className={styles.backgroundOrb1}></div>
        <div className={styles.backgroundOrb2}></div>
        <div className={styles.backgroundOrb3}></div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>

          {/* ── Hero ── */}
          <section className={styles.heroSection}>
            <div className={styles.badge}>
              <Activity size={13} />
              <span>AI-Powered Health Monitoring</span>
            </div>

            <h1 className={styles.title}>
              <span className={styles.titleLine1}>FAST</span>
              Transformer{" "}
              <span className={styles.titleAccent}>Health Indexer</span>
            </h1>

            <p className={styles.subtitle}>
              Advanced Computer Vision for pole-mounted transformer inspection.
              Detect failures before they happen — with deep learning and Grad-CAM explainability.
            </p>

            <div className={styles.ctaButtons}>
              <Link href="/signup" className={styles.btnPrimary}>
                Get Started
                <svg className={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                Sign In
              </Link>
              <Link href="/about" className={styles.btnSecondary}>
                How It Works
              </Link>
            </div>
          </section>

          {/* ── Divider ── */}
          <div className={styles.sectionDivider} />

          {/* ── Features ── */}
          <section className={styles.featuresSection}>
            <p className={styles.sectionLabel}>Core Capabilities</p>
            <h2 className={styles.sectionHeading}>Built for Field Engineers</h2>

            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <Zap className={styles.featureIcon} size={22} />
                </div>
                <h3 className={styles.featureTitle}>Real-Time Analysis</h3>
                <p className={styles.featureDescription}>
                  Instant health assessment using advanced Grad-CAM visualization
                  and EfficientNet deep learning models.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <Shield className={styles.featureIcon} size={22} />
                </div>
                <h3 className={styles.featureTitle}>Predictive Maintenance</h3>
                <p className={styles.featureDescription}>
                  Identify potential failures before they occur with 95%+ accuracy
                  across 13 critical hardware parameters.
                </p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <TrendingUp className={styles.featureIcon} size={22} />
                </div>
                <h3 className={styles.featureTitle}>Historical Tracking</h3>
                <p className={styles.featureDescription}>
                  Monitor condition trends over time with GPS-tagged inspection logs
                  and comprehensive health index reports.
                </p>
              </div>
            </div>
          </section>

          {/* ── Stats ── */}
          <div className={styles.statsSection}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>95%+</div>
              <div className={styles.statLabel}>Accuracy Rate</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>13</div>
              <div className={styles.statLabel}>Parameters Evaluated</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>Real-Time</div>
              <div className={styles.statLabel}>Analysis Speed</div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © 2026 Transformer Health Indexer. Powered by Advanced AI.
          </p>
          <nav className={styles.footerLinks} aria-label="Footer navigation">
            <Link href="/about" className={styles.footerLink}>How It Works</Link>
            <Link href="/login" className={styles.footerLink}>Sign In</Link>
            <Link href="/signup" className={styles.footerLink}>Sign Up</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}