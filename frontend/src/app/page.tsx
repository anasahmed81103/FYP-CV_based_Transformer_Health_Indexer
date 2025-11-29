import Link from "next/link";
import { Activity, Shield, Zap, TrendingUp } from "lucide-react";
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
          {/* Hero Section */}
          <div className={styles.heroSection}>
            <div className={styles.badge}>
              <Activity size={16} />
              <span>AI-Powered Health Monitoring</span>
            </div>


            <h1 className={styles.title}>
              <span className={styles.titleAccent}> KE </span>
              <span className={styles.titleAccent}> - </span>
              Transformer Health
              <span className={styles.titleAccent}> Indexer</span>
            </h1>

            <p className={styles.subtitle}>
              Advanced Computer Vision system for real-time transformer health analysis.
              Predict failures before they happen with state-of-the-art AI technology.
            </p>

            {/* CTA Buttons */}
            <div className={styles.ctaButtons}>
              <Link href="/signup" className={styles.btnPrimary}>
                Get Started
                <svg className={styles.btnIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link href="/login" className={styles.btnSecondary}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Zap className={styles.featureIcon} size={28} />
              </div>
              <h3 className={styles.featureTitle}>Real-Time Analysis</h3>
              <p className={styles.featureDescription}>
                Instant health assessment using advanced Grad-CAM visualization and deep learning models.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <Shield className={styles.featureIcon} size={28} />
              </div>
              <h3 className={styles.featureTitle}>Predictive Maintenance</h3>
              <p className={styles.featureDescription}>
                Identify potential failures before they occur with 95%+ accuracy using transformer neural networks.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <TrendingUp className={styles.featureIcon} size={28} />
              </div>
              <h3 className={styles.featureTitle}>Historical Tracking</h3>
              <p className={styles.featureDescription}>
                Monitor trends over time with comprehensive analytics and detailed health index reports.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className={styles.statsSection}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>95%+</div>
              <div className={styles.statLabel}>Accuracy Rate</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>24/7</div>
              <div className={styles.statLabel}>Monitoring</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>Real-Time</div>
              <div className={styles.statLabel}>Analysis</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © 2025 Transformer Health Indexer. Powered by Advanced AI.
          </p>
        </footer>
      </div>
    </div>
  );
}