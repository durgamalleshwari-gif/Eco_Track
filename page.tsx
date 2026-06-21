"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Leaf, Award, Download, Share2, Sparkles, TrendingDown, ArrowRight, Eye } from "lucide-react";
import styles from "./reports.module.css";

export default function Reports() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sharing states
  const [showShareModal, setShowShareModal] = useState(false);
  const [offsetSelected, setOffsetSelected] = useState<string | null>(null);

  const fetchReportsData = async (email: string) => {
    try {
      const res = await fetch(`/api/reports?email=${encodeURIComponent(email)}`);
      const resData = await res.json();
      
      const resDash = await fetch(`/api/dashboard?email=${encodeURIComponent(email)}`);
      const dataDash = await resDash.json();

      if (res.ok && resDash.ok) {
        setData(res);
        // Combine report data with dashboard basic stats
        setData({
          ...resData,
          user: dataDash.user
        });
        setPoints(dataDash.user.points);
        setStreak(dataDash.user.streak);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem("ecotrack_session");
    if (!session) {
      router.push("/");
    } else {
      const parsed = JSON.parse(session);
      setUserEmail(parsed.email);
      fetchReportsData(parsed.email);
    }
  }, [router]);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleBuyOffset = (projectTitle: string) => {
    setOffsetSelected(projectTitle);
    setTimeout(() => {
      // Award points for buying offset
      const session = localStorage.getItem("ecotrack_session");
      if (session && userEmail) {
        const parsed = JSON.parse(session);
        parsed.points += 60; // offset reward points
        localStorage.setItem("ecotrack_session", JSON.stringify(parsed));
        setPoints(parsed.points);
        
        // Unlocks badge if offset bought
        fetchReportsData(userEmail);
      }
      setOffsetSelected(null);
      alert(`Thank you! You have successfully offset your remaining emissions through the '${projectTitle}' project. +60 points awarded!`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Leaf className={styles.spinner} size={48} />
        <p>Generating sustainability reports and trends...</p>
      </div>
    );
  }

  // Draw prediction path points
  const pData = data.predictions;
  const maxVal = Math.max(...pData.businessAsUsual, ...pData.sustainablePath, 500);

  // SVG grid sizing
  const width = 450;
  const height = 200;
  const padding = 30;
  
  const pointsBAU = pData.businessAsUsual.map((val: number, idx: number) => {
    const x = padding + (idx * (width - 2 * padding) / 5);
    const y = height - padding - (val / maxVal) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  const pointsSus = pData.sustainablePath.map((val: number, idx: number) => {
    const x = padding + (idx * (width - 2 * padding) / 5);
    const y = height - padding - (val / maxVal) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar userPoints={points} userStreak={streak} />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.headerArea}>
            <h1>Sustainability Reports & Analytics</h1>
            <p>Review weekly reduction metrics, inspect future carbon forecasts, and offset your carbon footprint.</p>
          </div>

          <div className={styles.layout}>
            {/* Left Content column */}
            <div className={styles.leftColumn}>
              
              {/* Weekly report card */}
              <div className={`${styles.card} glass-panel`}>
                <div className={styles.weeklyHeader}>
                  <TrendingDown size={22} className={styles.trendingIcon} />
                  <h2>Weekly Carbon Reduction Report</h2>
                </div>
                <p className={styles.cardSubtitle}>Comparing your emissions from the past 7 days against previous averages.</p>

                <div className={styles.weeklyGrid}>
                  <div className={styles.weeklyStatBox}>
                    <span className={styles.statLabel}>This Week's Total</span>
                    <span className={styles.statVal}>{data.weeklySummary.thisWeek} kg CO₂</span>
                  </div>
                  <div className={styles.weeklyStatBox}>
                    <span className={styles.statLabel}>Last Week's Total</span>
                    <span className={styles.statVal}>{data.weeklySummary.lastWeek || 0} kg CO₂</span>
                  </div>
                  <div className={styles.weeklyStatBox} style={{ background: "var(--primary-light)", border: "1px solid var(--primary)" }}>
                    <span className={styles.statLabel} style={{ color: "var(--primary)" }}>Reduction Rate</span>
                    <span className={styles.statVal} style={{ color: "var(--primary)" }}>
                      {data.weeklySummary.reductionRate > 0 ? `-${data.weeklySummary.reductionRate}%` : "0%"}
                    </span>
                  </div>
                </div>

                <div className={styles.reducedNotice}>
                  <Sparkles size={16} className={styles.reducedIcon} />
                  <span>
                    Your active habit log checks have saved a total cumulative equivalent of <strong>{data.totalCO2Reduced} kg CO₂</strong>! Keep logging!
                  </span>
                </div>
              </div>

              {/* Trend predictions SVG graph */}
              <div className={`${styles.card} glass-panel`}>
                <h2>AI Carbon Trend Predictions</h2>
                <p className={styles.cardSubtitle}>6-month carbon footprint trajectory: Business as Usual vs. Sustainable Path (based on habit logs).</p>

                <div className={styles.chartWrapper}>
                  <svg className={styles.predictionSvg} viewBox={`0 0 ${width} ${height}`} width="100%">
                    {/* Grid lines */}
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--card-border)" />
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--card-border)" />
                    
                    {/* Path Lines */}
                    <polyline fill="none" stroke="#f43f5e" strokeWidth="3" strokeDasharray="4 4" points={pointsBAU} />
                    <polyline fill="none" stroke="var(--primary)" strokeWidth="4" points={pointsSus} />
                    
                    {/* Draw labels */}
                    {pData.months.map((m: string, idx: number) => {
                      const x = padding + (idx * (width - 2 * padding) / 5);
                      return (
                        <text key={m} x={x} y={height - 10} textAnchor="middle" fill="var(--gray-medium)" fontSize="10" fontWeight="600">
                          {m}
                        </text>
                      );
                    })}

                    {/* Legend circles */}
                    <circle cx={padding + 10} cy={padding} r="4" fill="#f43f5e" />
                    <text x={padding + 20} y={padding + 3} fill="var(--gray-medium)" fontSize="9" fontWeight="600">Business As Usual</text>

                    <circle cx={padding + 140} cy={padding} r="4" fill="var(--primary)" />
                    <text x={padding + 150} y={padding + 3} fill="var(--gray-medium)" fontSize="9" fontWeight="600">Sustainable Path</text>
                  </svg>
                </div>
              </div>

            </div>

            {/* Right sidebar column */}
            <div className={styles.rightColumn}>
              
              {/* PDF & Share card */}
              <div className={`${styles.card} glass-panel`}>
                <h2>Export & Share</h2>
                <p className={styles.cardSubtitle}>Download official logs or publish your progress online.</p>

                <div className={styles.actionButtons}>
                  <button onClick={handlePrintPDF} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                    <Download size={16} /> Download PDF Report
                  </button>
                  <button onClick={() => setShowShareModal(true)} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    <Share2 size={16} /> Share Achievement
                  </button>
                </div>
              </div>

              {/* Offset projects */}
              <div className={`${styles.card} glass-panel`}>
                <h2>Carbon Offsets</h2>
                <p className={styles.cardSubtitle}>Purchase verified carbon credits to neutralize remaining footprint.</p>

                <div className={styles.offsetList}>
                  {[
                    { title: "Reforestation in Madagascar", type: "Forestry", cost: "$12.00 / tonne", co2: "Reduces 100kg CO₂" },
                    { title: "Community Wind Power, India", type: "Wind Energy", cost: "$8.50 / tonne", co2: "Reduces 100kg CO₂" }
                  ].map((proj) => (
                    <div key={proj.title} className={styles.offsetItem}>
                      <div className={styles.offsetDetails}>
                        <strong>{proj.title}</strong>
                        <span className={styles.offsetMeta}>{proj.type} • {proj.cost}</span>
                      </div>
                      <button
                        onClick={() => handleBuyOffset(proj.title)}
                        className={styles.offsetBtn}
                        disabled={offsetSelected !== null}
                      >
                        {offsetSelected === proj.title ? "Processing..." : "Offset"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Share Modal Backdrop */}
      {showShareModal && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modalCard} glass-panel animate-slide`}>
            <h2>Sustainability Achievement</h2>
            <p>Publish your environmental milestones directly to your network.</p>

            <div className={styles.certificate}>
              <div className={styles.certLogo}>
                <Leaf className={styles.certIcon} />
                <span>EcoTrack Certificate</span>
              </div>
              <p className={styles.certBody}>
                This certifies that <strong>{data.user.name}</strong> has completed daily eco-habits and successfully reduced their weekly footprint by <strong>{data.weeklySummary.reductionRate}%</strong>!
              </p>
              <div className={styles.certFooter}>
                <span>Current Points: {data.user.points} pts</span>
                <span>Streak: {data.user.streak} days</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  alert("Link copied to clipboard! You can now paste and share on Twitter or LinkedIn.");
                  setShowShareModal(false);
                }}
                className="btn-primary"
              >
                Copy Shareable Link
              </button>
              <button onClick={() => setShowShareModal(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
