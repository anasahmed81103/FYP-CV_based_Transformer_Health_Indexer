import Link from "next/link";
import { ArrowRight, ShieldCheck, Database, Server, Image as ImageIcon, Camera, Activity, Lock, Users, Clock, Zap } from "lucide-react";
import pageStyles from '../page.module.css';
import styles from './about.module.css';

export default function About() {
    return (
        <div className={pageStyles.container}>
            {/* Background Effects */}
            <div className={pageStyles.backgroundEffects}>
                <div className={pageStyles.backgroundOrb1}></div>
                <div className={pageStyles.backgroundOrb2}></div>
                <div className={pageStyles.backgroundOrb3}></div>
            </div>

            <main className={styles.mainContent}>
                <div className={styles.contentWrapper}>

                    {/* Page Header */}
                    <header className={styles.pageHeader}>
                        <h1 className={`${pageStyles.title} ${styles.pageTitle}`}>
                            <span className={pageStyles.titleAccent}>How It</span> Works
                        </h1>
                        <Link href="/" className={pageStyles.btnSecondary}>
                            Back to Home
                        </Link>
                    </header>

                    <p className={styles.pageSubtitle}>
                        A deep dive into how our AI-powered Computer Vision engine securely processes,
                        evaluates, and logs Pole Mounted Transformer conditions.
                    </p>

                    {/* === PIPELINE SECTION === */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <Zap size={24} className={styles.sectionIcon} />
                            The Core Evaluation Pipeline
                        </h2>

                        <div className={styles.pipeline}>

                            {/* Step 1 */}
                            <div className={styles.stepCard}>
                                <div className={`${styles.iconBox} ${styles.iconPurple}`}>
                                    <Camera size={28} color="#fff" />
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>1. Data Acquisition</h3>
                                    <p className={styles.stepDesc}>
                                        Technicians upload transformer field images alongside high-precision GPS coordinates,
                                        timestamps, and manual observation notes.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.arrowConnector}>
                                <ArrowRight size={22} />
                            </div>

                            {/* Step 2 */}
                            <div className={styles.stepCard}>
                                <div className={`${styles.iconBox} ${styles.iconBlue}`}>
                                    <ImageIcon size={28} color="#fff" />
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>2. PMT Image Verification</h3>
                                    <p className={styles.stepDesc}>
                                        The <strong>PMT Classifier Model</strong> instantly filters incoming media, verifying
                                        that the subject is actually a Pole Mounted Transformer before permitting heavy computation.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.arrowConnector}>
                                <ArrowRight size={22} />
                            </div>

                            {/* Step 3 */}
                            <div className={styles.stepCard}>
                                <div className={`${styles.iconBox} ${styles.iconGreen}`}>
                                    <Activity size={28} color="#fff" />
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>3. Intelligent Health Analysis</h3>
                                    <p className={styles.stepDesc}>
                                        Approved images are securely routed to the <strong>EfficientNet-B0 Regression Engine</strong>.
                                        It evaluates 13 critical hardware parameters (e.g., Oil Leakage, Rust, Bushing Cracks)
                                        to compute a concrete Health Defect Score.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.arrowConnector}>
                                <ArrowRight size={22} />
                            </div>

                            {/* Step 4 */}
                            <div className={styles.stepCard}>
                                <div className={`${styles.iconBox} ${styles.iconAmber}`}>
                                    <Zap size={28} color="#fff" />
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>4. Defect Visualization (Grad-CAM)</h3>
                                    <p className={styles.stepDesc}>
                                        Alongside numerical scores, the system generates interactive <strong>Grad-CAM Heatmaps</strong>,
                                        visually painting a red highlight directly over the most critical structural defects
                                        on your original image.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.arrowConnector}>
                                <ArrowRight size={22} />
                            </div>

                            {/* Step 5 */}
                            <div className={styles.stepCard}>
                                <div className={`${styles.iconBox} ${styles.iconRed}`}>
                                    <Database size={28} color="#fff" />
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>5. Secure Archiving</h3>
                                    <p className={styles.stepDesc}>
                                        All parameter scores, health percentages, uploaded images, heatmaps, and textual
                                        technician feedback are permanently encrypted and archived within our local PostgreSQL data lake.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.arrowConnector}>
                                <ArrowRight size={22} />
                            </div>

                            {/* Step 6 */}
                            <div className={styles.stepCard}>
                                <div className={`${styles.iconBox} ${styles.iconTeal}`}>
                                    <Users size={28} color="#fff" />
                                </div>
                                <div className={styles.stepContent}>
                                    <h3 className={styles.stepTitle}>6. Human-in-the-Loop &amp; Reinforcement Learning</h3>
                                    <p className={styles.stepDesc}>
                                        Through the <strong>User Dashboard</strong>, master technicians can override AI predictions
                                        via score correction forms. These verified human inputs are fed back into our{' '}
                                        <strong>Reinforcement Learning Continuous Pipeline</strong>, dynamically retraining the
                                        core EfficientNet model over time to adapt to novel defect patterns and edge cases.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </section>

                    <hr className={styles.divider} />

                    {/* === RBAC AND HISTORY SECTION === */}
                    <section>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoCard}>
                                <h3 className={styles.infoCardTitle}>
                                    <Clock size={20} /> History &amp; Logging
                                </h3>
                                <p className={styles.infoCardBody}>
                                    The <strong>History Dashboard</strong> is the central hub where technicians and
                                    supervisors can trace back every inspection. It securely stores:
                                </p>
                                <ul className={styles.infoCardList}>
                                    <li>Raw uploaded field images &amp; Grad-CAM visual outputs</li>
                                    <li>AI-calculated Health Index percentages and Expert Corrected Scores</li>
                                    <li>Smart Interactive Maps with GPS location verification</li>
                                    <li>Manual technician feedback and Voice-to-Text inference notes</li>
                                </ul>
                            </div>

                            <div className={styles.infoCard}>
                                <h3 className={styles.infoCardTitle}>
                                    <ShieldCheck size={20} /> Role-Based Access Control
                                </h3>
                                <p className={styles.infoCardBody}>
                                    Our <strong>RBAC System</strong> enforces zero-trust strict security environments across three tiers:
                                </p>
                                <ul className={styles.infoCardList}>
                                    <li><strong>Admin:</strong> Complete organizational access. View history enterprise-wide and manage user roles/permissions natively.</li>
                                    <li><strong>User:</strong> Field technicians permitted to run AI analyses and view their own personal evaluations.</li>
                                    <li><strong>Suspended:</strong> Revoked credentials preventing network access and inference executions.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* === NETWORK INTERFACES SECTION === */}
                    <section className={styles.sectionLate}>
                        <h2 className={styles.sectionTitle}>
                            <Server size={24} className={styles.sectionIcon} />
                            Core Network Interfaces
                        </h2>
                        <div className={styles.apiGrid}>
                            <div className={styles.apiCard}>
                                <div className={styles.apiCardIcon}>
                                    <Lock size={24} />
                                </div>
                                <h4>Authentication Gateway</h4>
                                <p>
                                    Responsible for securely evaluating login handshakes, creating signup accounts,
                                    executing email verification algorithms, and deploying reset protocol tokens securely.
                                </p>
                            </div>
                            <div className={styles.apiCard}>
                                <div className={styles.apiCardIcon}>
                                    <Activity size={24} />
                                </div>
                                <h4>Analysis Bridge</h4>
                                <p>
                                    Transports heavy multipart raw images and textual form data seamlessly toward
                                    the underlying core PyTorch Intelligence Engine.
                                </p>
                            </div>
                            <div className={styles.apiCard}>
                                <div className={styles.apiCardIcon}>
                                    <Users size={24} />
                                </div>
                                <h4>Administration Engine</h4>
                                <p>
                                    Handles the synchronization of permission arrays, role updates, and
                                    comprehensive network-wide evaluation audits.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
