'use client';

import { useState } from 'react';
import styles from './user_dashboard.module.css';
import {
  FaPlus,
  FaMapMarkerAlt,
  FaHistory,
  FaTimes,
  FaBolt,
  FaCalendarAlt,
  FaClock,
} from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

interface Parameter {
  name: string;
  score: number;
}

export default function UserDashboard() {
  const [transformerId, setTransformerId] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    gradcamImages: string[];
    healthIndex: number;
    topParameters: Parameter[];
  } | null>(null);

  const sampleLocations = [
    'Lahore Grid Station',
    'Karachi Transformer Hub',
    'Islamabad South',
    'Quetta Central',
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 🔗 Connect frontend to backend via Next.js API route
  const handleAnalyze = async () => {
    if (!transformerId.trim() || !location || !date || !time || images.length === 0) {
      alert('Please fill all fields and upload at least one image.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('transformer_id', transformerId);
    formData.append('location', location);
    formData.append('date', date);
    formData.append('time', time);
    images.forEach((img) => formData.append('files', img));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Analysis failed.');
      const data = await res.json();

      setAnalysisResult({
        gradcamImages: data.gradcam_paths || [],
        healthIndex: data.health_index || 0,
        topParameters: data.top_params || [],
      });
    } catch (err: any) {
      console.error(err);
      alert('Failed to analyze transformer images.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getHealthClass = (value: number) => {
    if (value > 80) return styles.high;
    if (value > 60) return styles.medium;
    return styles.low;
  };

  return (
    <div className={styles.container}>
      {/* --- History Button --- */}
      <Link href="/user_history" className={styles.historyButton}>
        <FaHistory size={16} />
        <span>History</span>
      </Link>

      {/* --- Header --- */}
      <div className={styles.header}>
        <h1 className={styles.title}>Transformer Health Dashboard</h1>
        <p className={styles.subtitle}>AI-powered Transformer Condition Analysis</p>
      </div>

      {/* --- Input Form --- */}
      <div className={styles.card}>
        <div className={styles.formSection}>
          {/* Transformer ID */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FaBolt className={styles.icon} /> Transformer ID{' '}
              <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Transformer ID"
              value={transformerId}
              onChange={(e) => setTransformerId(e.target.value)}
              className={styles.input}
            />
          </div>

          {/* Location */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FaMapMarkerAlt className={styles.icon} /> Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={styles.input}
            >
              <option value="">Select Location</option>
              {sampleLocations.map((loc, index) => (
                <option key={index} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className={styles.datetimeContainer}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaCalendarAlt className={styles.icon} /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaClock className={styles.icon} /> Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Upload Section */}
          <div
            className={`${styles.uploadSection} ${
              images.length > 0 ? styles.hasImages : ''
            }`}
          >
            <h3 className={styles.uploadHeading}>Upload Transformer Images</h3>

            <label htmlFor="fileInput" className={styles.uploadBox}>
              <FaPlus className={styles.plusIcon} />
            </label>
            <input
              type="file"
              id="fileInput"
              multiple
              accept="image/*"
              className={styles.fileInput}
              onChange={handleImageUpload}
            />

            <div className={styles.previewGrid}>
              {images.map((img, index) => (
                <div key={index} className={styles.previewItem}>
                  <img src={URL.createObjectURL(img)} alt={`upload-${index}`} />
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeImage(index)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            className={styles.analyzeButton}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Health Index'}
          </button>
        </div>
      </div>

      {/* --- Analysis Results --- */}
      <div className={styles.analysisSection}>
        <h2 className={styles.sectionTitle}>AI Analysis Results</h2>

        {isAnalyzing ? (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Analyzing Transformer Health...</p>
          </div>
        ) : analysisResult ? (
          <>
            {/* Grad-CAM Previews */}
            <div className={styles.gradcamContainer}>
              <h2 className={styles.gradcamHeading}>Grad-CAM Results</h2>
              <div className={styles.gradcamGrid}>
                {analysisResult.gradcamImages.length > 0 ? (
                  analysisResult.gradcamImages.map((imgUrl, index) => (
                    <div key={index} className={styles.gradcamBox}>
                      <Image
                        src={imgUrl.startsWith('http') ? imgUrl : `http://127.0.0.1:8000/${imgUrl}`}
                        alt={`GradCAM-${index}`}
                        width={200}
                        height={200}
                      />
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#9ca3af' }}>No GradCAM results available</p>
                )}
              </div>
            </div>

            {/* Health Index */}
            <div className={styles.overallHealth}>
              <h3 className={styles.overallHealthHeading}>Overall Health Index</h3>
              <div className={styles.healthBarContainer}>
                <div
                  className={`${styles.healthBar} ${getHealthClass(
                    analysisResult.healthIndex
                  )}`}
                  style={{ width: `${analysisResult.healthIndex}%` }}
                ></div>
              </div>
              <p className={styles.healthValue}>
                {analysisResult.healthIndex.toFixed(1)}%
              </p>
            </div>

            {/* Top Parameters */}
            <div className={styles.parameters}>
              <h3>Top 3 Affected Parameters</h3>
              <ul>
                {analysisResult.topParameters.map((param, idx) => (
                  <li key={idx}>
                    <span>{param.name}</span>
                    <div className={styles.paramBarContainer}>
                      <div
                        className={`${styles.paramBar} ${getHealthClass(param.score)}`}
                        style={{ width: `${param.score}%` }}
                      ></div>
                      <strong>{param.score}%</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>No analysis yet</div>
        )}
      </div>
    </div>
  );
}
