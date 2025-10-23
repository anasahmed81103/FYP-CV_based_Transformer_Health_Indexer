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
  status: 'Healthy' | 'Moderate' | 'Critical';
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
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
        status: 'Moderate',
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
        status: 'Healthy',
      },
      {
        id: 3,
        transformer_id: 'TR-303',
        location: 'Hyderabad Power Grid',
        inference_date: '2025-10-09',
        inference_time: '11:20',
        health_index_score: 42,
        params_scores: { temperature: 40, vibration: 55, oil_quality: 30 },
        status: 'Critical',
      },
    ];

    setTimeout(() => {
      setLogs(mockData);
      setLoading(false);
    }, 800);
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      filter === '' ||
      log.transformer_id.toLowerCase().includes(filter.toLowerCase()) ||
      log.location.toLowerCase().includes(filter.toLowerCase());
    const matchesDate = !dateFilter || log.inference_date === dateFilter;
    return matchesFilter && matchesDate;
  });

  return (
    <div className={styles.container}>
      {/* Header Row with Legend and Filters */}
            <div className={styles.headerRow}>
          <div className={styles.legend}>
            <span className={styles.legendTitle}>Health Status:</span>
            <span
              className={`${styles.legendDot} ${styles.green}`}
              data-tooltip="Healthy: Transformer operating optimally"
            ></span>
            <span
              className={`${styles.legendDot} ${styles.yellow}`}
              data-tooltip="Moderate: Slight anomalies detected"
            ></span>
            <span
              className={`${styles.legendDot} ${styles.red}`}
              data-tooltip="Critical: Requires urgent attention"
            ></span>
          </div>

          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Filter by Transformer ID / Location"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={styles.filterInput}
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={styles.datePicker}
            />
          </div>
        </div>

      <h1 className={styles.title}>Transformer Health History</h1>
      <p className={styles.subtitle}>Track Your Health Index History Records</p>

      {loading ? (
        <p className={styles.loading}>Loading history...</p>
      ) : filteredLogs.length === 0 ? (
        <p className={styles.empty}>No matching history found.</p>
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
                <th>Status</th>
                <th>Parameters</th>
                <th>Provided Images</th>
                <th>Grad-CAM Images</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.transformer_id}</td>
                  <td>{log.location}</td>
                  <td>{log.inference_date}</td>
                  <td>{log.inference_time}</td>
                  <td>{log.health_index_score}%</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        log.status === 'Healthy'
                          ? styles.green
                          : log.status === 'Moderate'
                          ? styles.yellow
                          : styles.red
                      }`}
                      title={
                        log.status === 'Healthy'
                          ? 'Transformer operating optimally'
                          : log.status === 'Moderate'
                          ? 'Slight anomalies detected'
                          : 'Transformer requires urgent attention'
                      }
                    >
                      {log.status}
                    </span>
                  </td>
                  <td>
                    {Object.entries(log.params_scores).map(([param, score]) => (
                      <div key={param} className={styles.paramRow}>
                        <span>{param}</span>
                        <span className={styles.paramScore}>{score}%</span>
                      </div>
                    ))}
                  </td>
                  <td>
                    {log.provided_images?.length ? (
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
                    {log.grad_cam_images?.length ? (
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
