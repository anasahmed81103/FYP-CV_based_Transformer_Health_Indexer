'use client';

import { useEffect, useState } from 'react';
import styles from './user_history.module.css';

interface HistoryLog {
  id: number;
  transformer_id: string;
  location: string;
  inference_date: string;
  inference_time: string;
  health_index_score: number;
  params_scores: Record<string, number>;
  provided_images?: string[];
  grad_cam_images?: string[];
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Temporary mock data
    const mockData: HistoryLog[] = [
      {
        id: 1,
        transformer_id: 'TR-101',
        location: 'Karachi Grid Station',
        inference_date: '2025-10-10',
        inference_time: '14:35',
        health_index_score: 78,
        params_scores: { temperature: 70, vibration: 85, oil_quality: 65 },
        provided_images: ['/sample1.jpg', '/sample2.jpg'],
        grad_cam_images: ['/grad1.jpg', '/grad2.jpg'],
      },
      {
        id: 2,
        transformer_id: 'TR-202',
        location: 'Lahore City Substation',
        inference_date: '2025-10-11',
        inference_time: '09:12',
        health_index_score: 92,
        params_scores: { temperature: 88, vibration: 90, oil_quality: 85 },
        provided_images: ['/sample3.jpg'],
        grad_cam_images: [],
      },
    ];

    setTimeout(() => {
      setLogs(mockData);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Transformer Health History</h1>
      <div >
      <p className={styles.subtitle}>
          Track Your Health Index History Records
        </p>
        </div>

      {loading ? (
        <p className={styles.loading}>Loading history...</p>
      ) : logs.length === 0 ? (
        <p className={styles.empty}>No history found.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Transformer ID</th>
                <th>Location</th>
                <th>Date</th>
                <th>Time</th>
                <th>Health Index</th>
                <th>Parameters</th>
                <th>Provided Images</th>
                <th>Grad-CAM Images</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.transformer_id}</td>
                  <td>{log.location}</td>
                  <td>{log.inference_date}</td>
                  <td>{log.inference_time}</td>
                  <td>{log.health_index_score}%</td>
                  <td>
                    {Object.entries(log.params_scores).map(([param, score]) => (
                      <div key={param} className={styles.paramRow}>
                        <span>{param}</span>
                        <span className={styles.paramScore}>{score}%</span>
                      </div>
                    ))}
                  </td>
                  <td>
                    {log.provided_images && log.provided_images.length > 0 ? (
                      <div className={styles.thumbGrid}>
                        {log.provided_images.map((img, idx) => (
                          <img key={idx} src={img} alt="provided" />
                        ))}
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td>
                    {log.grad_cam_images && log.grad_cam_images.length > 0 ? (
                      <div className={styles.thumbGrid}>
                        {log.grad_cam_images.map((img, idx) => (
                          <img key={idx} src={img} alt="gradcam" />
                        ))}
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
