import Link from "next/link";
import { ArrowRight, ShieldCheck, Database, Server, Image as ImageIcon, Camera, Activity, Lock, Users, Clock, Zap } from "lucide-react";
import styles from '../page.module.css'; // Leverage existing global landing styles

export default function About() {
    return (
        <div className={styles.container}>
            {/* Background Effects (Matching Landing Page) */}
            <div className={styles.backgroundEffects}>
                <div className={styles.backgroundOrb1}></div>
                <div className={styles.backgroundOrb2}></div>
                <div className={styles.backgroundOrb3}></div>
            </div>

            <div className={styles.mainContent} style={{ paddingBottom: '100px', display: 'flex', justifyContent: 'center' }}>
                <div className={styles.contentWrapper} style={{ maxWidth: '1000px', width: '100%', textAlign: 'left' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <h1 className={styles.title} style={{ fontSize: '2.5rem', textAlign: 'left', margin: 0 }}>
                            <span className={styles.titleAccent}>Platform</span> Architecture
                        </h1>
                        <Link href="/" className={styles.btnSecondary} style={{ padding: '10px 20px' }}>
                            Back to Home
                        </Link>
                    </div>

                    <p className={styles.subtitle} style={{ textAlign: 'left', marginBottom: '60px', fontSize: '1.2rem' }}>
                        A deep dive into how our AI-powered Computer Vision engine securely processes, evaluates, and logs Pole Mounted Transformer conditions.
                    </p>

                    {/* PIPELINE UI */}
                    <section style={{ marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Zap color="#6366F1" /> The Core Evaluation Pipeline
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Step 1 */}
                            <div style={stepCardStyle}>
                                <div style={iconBoxStyle('#8b5cf6')}><Camera size={32} color="#fff" /></div>
                                <div>
                                    <h3 style={stepTitleStyle}>1. Data Acquisition</h3>
                                    <p style={stepDescStyle}>Technicians upload transformer field images alongside high-precision GPS coordinates, timestamps, and manual observation notes.</p>
                                </div>
                            </div>

                            <div style={arrowStyle}><ArrowRight size={24} color="#6366F1" /></div>

                            {/* Step 2 */}
                            <div style={stepCardStyle}>
                                <div style={iconBoxStyle('#3b82f6')}><ImageIcon size={32} color="#fff" /></div>
                                <div>
                                    <h3 style={stepTitleStyle}>2. PMT Image Verification</h3>
                                    <p style={stepDescStyle}>The <strong>PMT Classifier Model</strong> instantly filters incoming media, verifying that the subject is actually a Pole Mounted Transformer before permitting heavy computation.</p>
                                </div>
                            </div>

                            <div style={arrowStyle}><ArrowRight size={24} color="#6366F1" /></div>

                            {/* Step 3 */}
                            <div style={stepCardStyle}>
                                <div style={iconBoxStyle('#10b981')}><Activity size={32} color="#fff" /></div>
                                <div>
                                    <h3 style={stepTitleStyle}>3. Intelligent Health Analysis</h3>
                                    <p style={stepDescStyle}>Approved images are securely routed to the <strong>EfficientNet-B0 Regression Engine</strong>. It evaluates 13 critical hardware parameters (e.g., Oil Leakage, Rust, Bushing Cracks) to compute a concrete Health Defect Score.</p>
                                </div>
                            </div>

                            <div style={arrowStyle}><ArrowRight size={24} color="#6366F1" /></div>

                            {/* Step 4 */}
                            <div style={stepCardStyle}>
                                <div style={iconBoxStyle('#f59e0b')}><Zap size={32} color="#fff" /></div>
                                <div>
                                    <h3 style={stepTitleStyle}>4. Defect Visualization (Grad-CAM)</h3>
                                    <p style={stepDescStyle}>Alongside numerical scores, the system generates interactive <strong>Grad-CAM Heatmaps</strong>, visually painting a red highlight directly over the most critical structural defects on your original image.</p>
                                </div>
                            </div>

                            <div style={arrowStyle}><ArrowRight size={24} color="#6366F1" /></div>

                            {/* Step 5 */}
                            <div style={stepCardStyle}>
                                <div style={iconBoxStyle('#ef4444')}><Database size={32} color="#fff" /></div>
                                <div>
                                    <h3 style={stepTitleStyle}>5. Secure Archiving</h3>
                                    <p style={stepDescStyle}>All parameter scores, health percentages, uploaded images, heatmaps, and textual technician feedback are permanently encrypted and archived within our local PostgreSQL data lake.</p>
                                </div>
                            </div>

                        </div>
                    </section>

                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '60px' }} />

                    {/* RBAC AND HISTORY SECTION */}
                    <section style={gridSectionStyle}>
                        <div style={infoCardStyle}>
                            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock color="#6366F1" /> History & Logging
                            </h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                The <strong>History Dashboard</strong> is the central hub where technicians and supervisors can trace back every inspection. It securely stores:
                            </p>
                            <ul style={{ color: '#94a3b8', lineHeight: '1.6', marginTop: '10px', paddingLeft: '20px' }}>
                                <li>Raw uploaded field images & Grad-CAM visual outputs</li>
                                <li>AI-calculated Health Index percentages</li>
                                <li>Extracted geo-location data and timestamps</li>
                                <li>Manual technician feedback and voice-to-text notes</li>
                            </ul>
                        </div>

                        <div style={infoCardStyle}>
                            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck color="#6366F1" /> Role-Based Access Control
                            </h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                Our <strong>RBAC System</strong> enforces zero-trust strict security environments across three tiers:
                            </p>
                            <ul style={{ color: '#94a3b8', lineHeight: '1.6', marginTop: '10px', paddingLeft: '20px' }}>
                                <li><strong>Admin:</strong> Complete organizational access. View history enterprise-wide and manage user roles/permissions natively.</li>
                                <li><strong>User:</strong> Field technicians permitted to run AI analyses and view their own personal evaluations.</li>
                                <li><strong>Suspended:</strong> Revoked credentials preventing network access and inference executions.</li>
                            </ul>
                        </div>
                    </section>

                    <section style={{ marginTop: '80px' }}>
                        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Server color="#6366F1" /> Core Network Interfaces
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <div style={apiCardStyle}><Lock color="#fff" size={24} style={{ marginBottom: '10px' }} /><h4>Authentication Gateway</h4><p>Responsible for securely evaluating login handshakes, creating signup accounts, executing email verification algorithms, and deploying reset protocol tokens securely.</p></div>
                            <div style={apiCardStyle}><Activity color="#fff" size={24} style={{ marginBottom: '10px' }} /><h4>Analysis Bridge</h4><p>Transports heavy multipart raw images and textual form data seamlessly toward the underlying core PyTorch Intelligence Engine.</p></div>
                            <div style={apiCardStyle}><Users color="#fff" size={24} style={{ marginBottom: '10px' }} /><h4>Administration Engine</h4><p>Handles the synchronization of permission arrays, role updates, and comprehensive network-wide evaluation audits.</p></div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}

// Inline Styles for simplicity
const stepCardStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
};

const iconBoxStyle = (color: string) => ({
    backgroundColor: color,
    minWidth: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
});

const stepTitleStyle = {
    fontSize: '1.3rem',
    color: '#fff',
    margin: '0 0 8px 0',
    fontWeight: 'bold'
};

const stepDescStyle = {
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5'
};

const arrowStyle = {
    display: 'flex',
    justifyContent: 'center',
    padding: '5px 0'
};

const gridSectionStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px'
};

const infoCardStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '30px'
};

const apiCardStyle = {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    color: '#94a3b8',
    lineHeight: '1.5'
};
