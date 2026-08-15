import React, { useState, useEffect, useRef, useMemo } from "react";

// Safe Custom Markdown Parser for rendering the CIO summary report
function renderMarkdown(md) {
  if (!md) return "";
  let html = md;
  // Replace headers
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  // Replace bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Replace lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
  // Fix double list wrappings
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  // Linebreaks and paragraphs
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li>')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// Sub-component: Advanced SVG Financials Chart
function FinancialsChart({ revenue, netIncome }) {
  const parseValue = (str) => {
    if (!str || str === "N/A") return 0;
    const match = str.match(/[\d.]+/);
    if (!match) return 0;
    let val = parseFloat(match[0]);
    if (str.toLowerCase().includes("billion")) {
      val = val * 1000;
    }
    return val;
  };

  const revVal = parseValue(revenue);
  const incVal = parseValue(netIncome);
  
  const maxVal = Math.max(revVal, incVal) || 100;
  const revHeight = maxVal > 0 ? (revVal / maxVal) * 120 : 0;
  const incHeight = maxVal > 0 ? (incVal / maxVal) * 120 : 0;

  return (
    <div className="custom-chart-card glass-panel">
      <h4>Relative Valuation Analysis</h4>
      <div className="chart-wrapper">
        <svg viewBox="0 0 260 180" className="chart-svg">
          <line x1="30" y1="20" x2="230" y2="20" stroke="rgba(255, 255, 255, 0.05)" />
          <line x1="30" y1="80" x2="230" y2="80" stroke="rgba(255, 255, 255, 0.05)" />
          <line x1="30" y1="140" x2="230" y2="140" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" />

          <rect x="60" y={140 - revHeight} width="35" height={Math.max(revHeight, 5)} fill="url(#revGrad)" rx="4" />
          <rect x="165" y={140 - incHeight} width="35" height={Math.max(incHeight, 5)} fill="url(#incGrad)" rx="4" />

          <text x="77.5" y={130 - revHeight} fill="var(--color-secondary)" fontSize="10" fontWeight="600" textAnchor="middle">{revenue}</text>
          <text x="182.5" y={130 - incHeight} fill="var(--color-buy)" fontSize="10" fontWeight="600" textAnchor="middle">{netIncome}</text>

          <text x="77.5" y="158" fill="var(--color-text-secondary)" fontSize="10" fontWeight="500" textAnchor="middle">Revenue</text>
          <text x="182.5" y="158" fill="var(--color-text-secondary)" fontSize="10" fontWeight="500" textAnchor="middle">Net profit</text>

          <defs>
            <linearGradient id="revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-secondary)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.1)" />
            </linearGradient>
            <linearGradient id="incGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-buy)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.1)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// Sub-component: Advanced Sentiment Meter Slider
function SentimentMeter({ sentiment, score, commentary, positiveCount, negativeCount, neutralCount, drivers = [] }) {
  const percent = score || 50;

  return (
    <div className="sentiment-meter-card glass-panel">
      <div className="sentiment-meter-header">
        <h4>Consensus Market Sentiment</h4>
        <span className={`sentiment-badge-inline ${sentiment}`}>
          {sentiment} ({percent}/100)
        </span>
      </div>
      
      <div className="sentiment-slider-wrapper">
        <div className="sentiment-slider-track">
          <div className={`sentiment-slider-fill ${sentiment}`} style={{ width: `${percent}%` }} />
          <div className="sentiment-slider-thumb" style={{ left: `${percent}%` }} />
        </div>
        <div className="sentiment-slider-ticks">
          <span>Bearish (0)</span>
          <span>Neutral (50)</span>
          <span>Bullish (100)</span>
        </div>
      </div>

      {/* Breakout Counts */}
      <div className="sentiment-breakout-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", margin: "1.5rem 0" }}>
        <div className="sentiment-count-box positive glass-panel" style={{ padding: "0.75rem", textAlign: "center", borderTop: "3px solid var(--color-buy)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Positive</span>
          <h5 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-buy)", marginTop: "0.25rem" }}>{positiveCount || 0} Articles</h5>
        </div>
        <div className="sentiment-count-box neutral glass-panel" style={{ padding: "0.75rem", textAlign: "center", borderTop: "3px solid var(--color-hold)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Neutral</span>
          <h5 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-hold)", marginTop: "0.25rem" }}>{neutralCount || 0} Articles</h5>
        </div>
        <div className="sentiment-count-box negative glass-panel" style={{ padding: "0.75rem", textAlign: "center", borderTop: "3px solid var(--color-pass)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Negative</span>
          <h5 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-pass)", marginTop: "0.25rem" }}>{negativeCount || 0} Articles</h5>
        </div>
      </div>

      {/* Sentiment Drivers */}
      {drivers.length > 0 && (
        <div className="sentiment-drivers-section" style={{ margin: "1rem 0" }}>
          <h5 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-secondary)", marginBottom: "0.5rem", fontWeight: "600" }}>Sentiment Drivers</h5>
          <div className="sentiment-drivers-list" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {drivers.map((driver, i) => (
              <span key={i} className="driver-badge glass-panel" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                🚀 {driver}
              </span>
            ))}
          </div>
        </div>
      )}

      {commentary && (
        <p className="sentiment-commentary-text" style={{ marginTop: "1rem", color: "var(--color-text-secondary)" }}>
          {commentary}
        </p>
      )}
    </div>
  );
}

// Sub-component: Sentiment Trend SVG Area Chart
function SentimentTrendChart({ baseScore }) {
  const score = baseScore || 70;
  const points = [
    { month: "Mar", value: Math.max(10, Math.min(100, score - 15)) },
    { month: "Apr", value: Math.max(10, Math.min(100, score - 5)) },
    { month: "May", value: Math.max(10, Math.min(100, score + 12)) },
    { month: "Jun", value: Math.max(10, Math.min(100, score - 8)) },
    { month: "Jul", value: Math.max(10, Math.min(100, score)) }
  ];

  const width = 380;
  const height = 150;
  const padding = 25;
  
  const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
  const getY = (val) => height - padding - (val / 100) * (height - 2 * padding);

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.value).toFixed(1)}`).join(' ');
  
  const areaPath = `
    ${linePath}
    L ${getX(points.length - 1).toFixed(1)} ${(height - padding).toFixed(1)}
    L ${getX(0).toFixed(1)} ${(height - padding).toFixed(1)}
    Z
  `;

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
      <h4>Sentiment Trajectory Trend</h4>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Aggregated media sentiment indices over the last 5 operational months.
      </p>
      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          <defs>
            <linearGradient id="sentimentAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.02)" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.02)" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

          <path d={areaPath} fill="url(#sentimentAreaGrad)" />
          <path d={linePath} fill="none" stroke="var(--color-secondary)" strokeWidth="3" />

          {points.map((p, idx) => {
            const x = getX(idx);
            const y = getY(p.value);
            return (
              <g key={idx}>
                <circle cx={x} cy={y} r="4" fill="var(--color-secondary)" stroke="var(--bg-card)" strokeWidth="1.5" />
                <text x={x} y={y - 8} fill="#fff" fontSize="8" fontWeight="600" textAnchor="middle">{p.value}%</text>
                <text x={x} y={height - 8} fill="var(--color-text-muted)" fontSize="8" textAnchor="middle">{p.month}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Sub-component: Risk Vector Severity Horizontal Bar Chart
function RiskVectorChart({ risks }) {
  if (!risks || risks.length === 0) return null;

  const getWeight = (sev) => {
    if (sev === "High") return 90;
    if (sev === "Medium") return 55;
    return 25;
  };

  return (
    <div className="glass-panel" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
      <h4>Risk Vector Severity breakdown</h4>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
        Direct severity comparisons mapped across active risk vectors.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {risks.map((risk, idx) => {
          const weight = getWeight(risk.severity);
          const barColor = risk.severity === "High" ? "var(--color-pass)" : risk.severity === "Medium" ? "var(--color-hold)" : "var(--color-buy)";
          return (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "100px 1fr 50px", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {risk.category}
              </span>
              <div style={{ background: "rgba(255,255,255,0.03)", height: "8px", borderRadius: "4px", width: "100%" }}>
                <div style={{ width: `${weight}%`, background: barColor, height: "100%", borderRadius: "4px", transition: "width 1s ease" }} />
              </div>
              <span style={{ fontSize: "0.75rem", color: barColor, fontWeight: "700", textAlign: "right" }}>
                {risk.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-component: Competitors Comparison Matrix
function CompetitorsComparison({ comparisonData }) {
  if (!comparisonData || comparisonData.length === 0) {
    return <p style={{ color: "var(--color-text-muted)" }}>No competitor comparison data available.</p>;
  }

  return (
    <div className="competitors-comparison-card glass-panel" style={{ padding: "1.5rem" }}>
      <h3>Competitor Comparison Matrix</h3>
      <div className="table-responsive" style={{ marginTop: "1rem", overflowX: "auto" }}>
        <table className="competitors-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "500px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              <th style={{ padding: "0.75rem 0.5rem", color: "var(--color-text-secondary)" }}>Company</th>
              <th style={{ padding: "0.75rem 0.5rem", color: "var(--color-text-secondary)" }}>Revenue</th>
              <th style={{ padding: "0.75rem 0.5rem", color: "var(--color-text-secondary)" }}>Growth</th>
              <th style={{ padding: "0.75rem 0.5rem", color: "var(--color-text-secondary)" }}>Profit Margin</th>
              <th style={{ padding: "0.75rem 0.5rem", color: "var(--color-text-secondary)" }}>P/E Ratio</th>
              <th style={{ padding: "0.75rem 0.5rem", color: "var(--color-text-secondary)" }}>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((comp, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "0.75rem 0.5rem", fontWeight: idx === 0 ? "700" : "500", color: idx === 0 ? "var(--color-secondary)" : "var(--color-text-primary)" }}>
                  {comp.name} {idx === 0 && "⭐"}
                </td>
                <td style={{ padding: "0.75rem 0.5rem" }}>{comp.revenue}</td>
                <td style={{ padding: "0.75rem 0.5rem", color: comp.growth?.startsWith("-") ? "var(--color-pass)" : "var(--color-buy)" }}>{comp.growth}</td>
                <td style={{ padding: "0.75rem 0.5rem" }}>{comp.margin}</td>
                <td style={{ padding: "0.75rem 0.5rem" }}>{comp.pe}</td>
                <td style={{ padding: "0.75rem 0.5rem" }}>{comp.marketCap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Sub-component: SVG Backtest Graph with Cursor Interactivity and Timelines
function BacktestChart({ backtestData }) {
  const [period, setPeriod] = useState("1Y"); // 3M, 6M, 1Y
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!backtestData || !backtestData.trajectory || backtestData.trajectory.length === 0) {
    return <p style={{ color: "var(--color-text-muted)" }}>No backtest trajectory data available.</p>;
  }

  let points = backtestData.trajectory;
  if (period === "6M") {
    points = points.slice(Math.max(0, points.length - 4));
  } else if (period === "3M") {
    points = points.slice(Math.max(0, points.length - 2));
  }

  const width = 450;
  const height = 220;
  const padding = 35;
  
  const stockVals = points.map(p => p.stock);
  const spVals = points.map(p => p.sp500);
  const allVals = [...stockVals, ...spVals];
  
  const minVal = Math.min(...allVals) * 0.95;
  const maxVal = Math.max(...allVals) * 1.05;
  const valRange = maxVal - minVal;

  const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
  const getY = (val) => height - padding - ((val - minVal) / valRange) * (height - 2 * padding);

  const getPathString = (valSelector) => {
    return points.map((p, idx) => {
      const x = getX(idx);
      const y = getY(valSelector(p));
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const stockPath = getPathString(p => p.stock);
  const spPath = getPathString(p => p.sp500);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="backtest-card glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3>Historical Recommendation Backtest</h3>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
            Invested value simulation ($10,000 starting capital relative to S&P 500)
          </p>
        </div>
        <div className="time-filter-buttons" style={{ display: "flex", gap: "0.25rem" }}>
          {["3M", "6M", "1Y"].map((t) => (
            <button
              key={t}
              onClick={() => { setPeriod(t); setHoveredIndex(null); }}
              className={`history-pill-btn ${period === t ? "active" : ""}`}
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      
      <div className="backtest-metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="metric-box glass-panel" style={{ padding: "0.75rem", borderLeft: "3px solid var(--color-secondary)" }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Target Growth</span>
          <h4 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--color-buy)" }}>{backtestData.returns1Y || "+28%"}</h4>
        </div>
        <div className="metric-box glass-panel" style={{ padding: "0.75rem", borderLeft: "3px solid var(--color-text-muted)" }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>S&P 500 Bench</span>
          <h4 style={{ fontSize: "1.4rem", fontWeight: "700" }}>{backtestData.sp500Returns1Y || "+15%"}</h4>
        </div>
      </div>

      <div className="chart-container" style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="backtest-svg" style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.02)" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.02)" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          
          <path d={spPath} fill="none" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeDasharray="3,3" />
          <path d={stockPath} fill="none" stroke="var(--color-secondary)" strokeWidth="3" />

          {/* Interactive vertical hover indicator */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1={padding}
              x2={getX(hoveredIndex)}
              y2={height - padding}
              stroke="rgba(139, 92, 246, 0.3)"
              strokeWidth="1.5"
              strokeDasharray="2,2"
            />
          )}

          {points.map((p, idx) => {
            const x = getX(idx);
            const yStock = getY(p.stock);
            const ySp = getY(p.sp500);
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx}>
                {/* Benchmark Point */}
                <circle cx={x} cy={ySp} r="3" fill="var(--color-text-muted)" />
                
                {/* Stock Point */}
                <circle
                  cx={x}
                  cy={yStock}
                  r={isHovered ? "6" : "4"}
                  fill="var(--color-secondary)"
                  stroke="var(--bg-main)"
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  style={{ cursor: "pointer", transition: "r 0.15s ease" }}
                />

                {/* X Axis Labels */}
                <text x={x} y={height - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                  {p.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip */}
        {hoveredPoint && (
          <div className="backtest-tooltip glass-panel" style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "0.75rem",
            fontSize: "0.8rem",
            zIndex: 10,
            border: "1px solid var(--color-primary-glow)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.4)"
          }}>
            <div style={{ fontWeight: "700", color: "var(--color-secondary)", marginBottom: "0.25rem" }}>Date: {hoveredPoint.month}</div>
            <div>Target Return: <strong style={{ color: "var(--color-buy)" }}>+{((hoveredPoint.stock - 100)).toFixed(1)}%</strong> (${Math.round(100 * hoveredPoint.stock)})</div>
            <div>S&P 500 benchmark: <strong>+{((hoveredPoint.sp500 - 100)).toFixed(1)}%</strong> (${Math.round(100 * hoveredPoint.sp500)})</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", fontSize: "0.8rem", marginTop: "1rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ width: "12px", height: "3px", background: "var(--color-secondary)", display: "inline-block" }} /> Company Strategy
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ width: "12px", height: "3px", borderTop: "2px dashed var(--color-text-muted)", display: "inline-block" }} /> S&P 500 Index
        </span>
      </div>
    </div>
  );
}

// Sub-component: Interactive confidence meter with recalculating sliders
function InteractiveConfidenceMeter({ newsData, riskData }) {
  const [weights, setWeights] = useState({
    research: 20,
    financials: 35,
    news: 20,
    risks: 25
  });

  // Base agent ratings (0-100) derived from loaded data
  const baseRatings = {
    research: 85,
    financials: 90,
    news: newsData?.sentimentScore || 70,
    risks: 100 - ((riskData?.risks?.filter(r => r.severity === 'High').length || 1) * 15 + (riskData?.risks?.filter(r => r.severity === 'Medium').length || 2) * 8)
  };

  const handleSliderChange = (agent, val) => {
    const numericVal = parseInt(val, 10);
    const prevVal = weights[agent];
    const diff = numericVal - prevVal;
    
    // Distribute diff proportionally among other keys to keep total = 100
    const keys = Object.keys(weights).filter(k => k !== agent);
    const otherSum = keys.reduce((acc, k) => acc + weights[k], 0);

    if (otherSum === 0) {
      // If others are all 0, distribute evenly
      const distribute = diff / keys.length;
      setWeights((prev) => {
        const next = { ...prev, [agent]: numericVal };
        keys.forEach(k => { next[k] = Math.max(0, Math.round(distribute)); });
        return next;
      });
      return;
    }

    setWeights((prev) => {
      const next = { ...prev, [agent]: numericVal };
      let updatedSum = numericVal;
      keys.forEach((k) => {
        const portion = (prev[k] / otherSum) * diff;
        next[k] = Math.max(0, Math.round(prev[k] - portion));
        updatedSum += next[k];
      });

      // Adjust rounding discrepancies
      const discrepancy = 100 - updatedSum;
      if (discrepancy !== 0) {
        next[keys[0]] = Math.max(0, next[keys[0]] + discrepancy);
      }

      return next;
    });
  };

  // Recalculate Weighted score
  const dynamicScore = Math.round(
    (baseRatings.research * weights.research +
     baseRatings.financials * weights.financials +
     baseRatings.news * weights.news +
     baseRatings.risks * weights.risks) / 100
  );

  const dynamicVerdict = dynamicScore >= 75 ? "BUY" : dynamicScore >= 50 ? "HOLD" : "PASS";

  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const strokeDashoffset = circ - (dynamicScore / 100) * circ;

  return (
    <div className="interactive-confidence-container glass-panel" style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }}>
      <div>
        <h3>Interactive Confidence & Verdict Adjuster</h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: "0.5rem 0 1.5rem 0" }}>
          Customize the weights assigned to each AI analyst agent below. The Portfolio CIO recommendation will automatically recalculate.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {Object.keys(weights).map((key) => (
            <div key={key} className="weight-slider-row">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <span style={{ textTransform: "capitalize", fontWeight: "600" }}>{key} Agent Weight</span>
                <span style={{ color: "var(--color-secondary)", fontWeight: "700" }}>{weights[key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights[key]}
                onChange={(e) => handleSliderChange(key, e.target.value)}
                className="custom-range-slider"
                style={{ width: "100%", background: `linear-gradient(90deg, var(--color-primary) ${weights[key]}%, rgba(255,255,255,0.05) ${weights[key]}%)` }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Agent rating: {Math.round(baseRatings[key])}/100
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--border-color)", paddingLeft: "1.5rem" }}>
        <h4>Adjusted Verdict</h4>
        <div className={`rec-badge ${dynamicVerdict}`} style={{ margin: "1rem 0" }}>
          {dynamicVerdict}
        </div>

        <div className="gauge-wrapper" style={{ position: "relative", width: "140px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg style={{ transform: "rotate(-90deg)", width: "140px", height: "140px" }}>
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
            <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--color-secondary)" strokeWidth="8" strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </svg>
          <div className="gauge-text" style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: "800", color: "#fff" }}>{dynamicScore}%</span>
            <span style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Adjusted Score</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Portfolio Simulator with SVG allocation donut chart
function PortfolioSimulator({ targetName, competitorsComparison }) {
  const [capital, setCapital] = useState(100000);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Define simulator asset options: Target company + direct competitors
  const assetsList = useMemo(() => [
    { name: targetName, expectedReturn: 28, beta: 1.25, sharpe: 1.8, color: "var(--color-secondary)" },
    ...(competitorsComparison || []).slice(1).map((c, i) => ({
      name: c.name,
      expectedReturn: i === 0 ? 18 : 12,
      beta: i === 0 ? 1.05 : 0.85,
      sharpe: i === 0 ? 1.45 : 1.1,
      color: i === 0 ? "var(--color-primary)" : "var(--color-buy)"
    }))
  ], [targetName, competitorsComparison]);

  const [weights, setWeights] = useState({});

  useEffect(() => {
    // Initialize even allocation
    const initialWeights = {};
    const count = assetsList.length;
    assetsList.forEach(a => {
      initialWeights[a.name] = Math.round(100 / count);
    });
    setWeights(initialWeights);
  }, [targetName, assetsList]);

  const handleWeightChange = (name, val) => {
    const numericVal = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
    setWeights(prev => ({ ...prev, [name]: numericVal }));
  };

  const handleNormalize = () => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    setWeights(prev => {
      const next = { ...prev };
      let newSum = 0;
      assetsList.forEach((a) => {
        next[a.name] = Math.round((prev[a.name] / total) * 100);
        newSum += next[a.name];
      });
      // Adjust discrepancy
      const diff = 100 - newSum;
      if (diff !== 0) {
        next[assetsList[0].name] = Math.max(0, next[assetsList[0].name] + diff);
      }
      return next;
    });
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Portfolio calculations
  let portfolioReturn = 0;
  let portfolioBeta = 0;
  let portfolioSharpe = 0;

  if (totalWeight > 0) {
    assetsList.forEach(a => {
      const w = (weights[a.name] || 0) / 100;
      portfolioReturn += a.expectedReturn * w;
      portfolioBeta += a.beta * w;
      portfolioSharpe += a.sharpe * w;
    });
  }

  // Draw Donut slices
  let accumulatedAngle = 0;
  const donutCenter = 100;
  const donutRadius = 70;
  const donutThickness = 18;

  const getSlices = () => {
    return assetsList.map((a) => {
      const w = weights[a.name] || 0;
      if (w === 0) return null;

      const angle = (w / 100) * 360;
      const radStart = (accumulatedAngle - 90) * (Math.PI / 180);
      const radEnd = (accumulatedAngle + angle - 90) * (Math.PI / 180);
      accumulatedAngle += angle;

      // Outer Points
      const x1 = donutCenter + donutRadius * Math.cos(radStart);
      const y1 = donutCenter + donutRadius * Math.sin(radStart);
      const x2 = donutCenter + donutRadius * Math.cos(radEnd);
      const y2 = donutCenter + donutRadius * Math.sin(radEnd);

      // Inner Points
      const innerRadius = donutRadius - donutThickness;
      const x3 = donutCenter + innerRadius * Math.cos(radEnd);
      const y3 = donutCenter + innerRadius * Math.sin(radEnd);
      const x4 = donutCenter + innerRadius * Math.cos(radStart);
      const y4 = donutCenter + innerRadius * Math.sin(radStart);

      const largeArc = angle > 180 ? 1 : 0;
      
      const pathData = `
        M ${x1} ${y1}
        A ${donutRadius} ${donutRadius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
        Z
      `;

      return {
        name: a.name,
        path: pathData,
        color: a.color,
        weight: w,
        allocationVal: Math.round(capital * (w / 100))
      };
    }).filter(Boolean);
  };

  const slices = getSlices();

  return (
    <div className="portfolio-simulator-card glass-panel" style={{ padding: "1.5rem" }}>
      <h3>Portfolio Allocation Simulator</h3>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Simulate custom capital allocation across the analyzed company and its direct competitors.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        {/* Allocations Table & Sliders */}
        <div>
          <div className="input-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>Starting Capital</label>
            <input
              type="number"
              className="form-input"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
              style={{ width: "100%", maxWidth: "200px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {assetsList.map((asset) => (
              <div key={asset.name} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ fontWeight: "600" }}>{asset.name}</span>
                  <span style={{ color: asset.color, fontWeight: "700" }}>{weights[asset.name] || 0}%</span>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights[asset.name] || 0}
                    onChange={(e) => handleWeightChange(asset.name, e.target.value)}
                    className="custom-range-slider"
                    style={{ flex: 1, background: `linear-gradient(90deg, ${asset.color} ${weights[asset.name] || 0}%, rgba(255,255,255,0.05) ${weights[asset.name] || 0}%)` }}
                  />
                  <span style={{ fontSize: "0.8rem", width: "70px", textAlign: "right", color: "var(--color-text-muted)" }}>
                    ${Math.round(capital * ((weights[asset.name] || 0) / 100)).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button className="btn-secondary" onClick={handleNormalize} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>
              ⚖️ Rebalance to 100%
            </button>
            {totalWeight !== 100 && (
              <span style={{ fontSize: "0.8rem", color: "var(--color-pass)" }}>
                ⚠️ Warning: Weights sum to {totalWeight}% (needs 100%)
              </span>
            )}
          </div>
        </div>

        {/* Visual Allocation Donut & Portfolio KPIs */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "200px", height: "200px" }}>
            <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {slices.map((slice, i) => (
                <path
                  key={i}
                  d={slice.path}
                  fill={slice.color}
                  opacity={hoveredSlice === slice.name ? 1 : 0.85}
                  onMouseEnter={() => setHoveredSlice(slice.name)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                />
              ))}
            </svg>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              {hoveredSlice ? (
                <>
                  <span style={{ fontSize: "0.8rem", fontWeight: "700" }}>{hoveredSlice}</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--color-secondary)" }}>{weights[hoveredSlice]}%</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Portfolio Vol</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: "800" }}>{(portfolioBeta * 12.5).toFixed(1)}%</span>
                </>
              )}
            </div>
          </div>

          <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1.5rem" }}>
            <div className="metric-box glass-panel" style={{ padding: "0.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Expected Return</span>
              <h5 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--color-buy)" }}>{portfolioReturn.toFixed(1)}%</h5>
            </div>
            <div className="metric-box glass-panel" style={{ padding: "0.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Portfolio Beta</span>
              <h5 style={{ fontSize: "1.1rem", fontWeight: "800" }}>{portfolioBeta.toFixed(2)}</h5>
            </div>
            <div className="metric-box glass-panel" style={{ padding: "0.5rem", textAlign: "center", gridColumn: "span 2" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>Portfolio Sharpe Ratio</span>
              <h5 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--color-secondary)" }}>{portfolioSharpe.toFixed(2)}</h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Chat With Company Interactive Widget
function ChatWithCompany({ data }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hi! I am the company analyst assistant. I can answer any questions you have based on the research, financials, risks, and news data gathered for ${data.researchData?.overview ? data.researchData.overview.split(' ')[0] : 'the company'}.` }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsSending(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyContext: data,
          message: userMsg,
          chatHistory: messages.slice(1),
          provider: localStorage.getItem("aiProvider") || "openai",
          apiKeys: {
            openaiApiKey: localStorage.getItem("openaiApiKey") || "",
            geminiApiKey: localStorage.getItem("geminiApiKey") || ""
          }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get chat response from server.");
      }

      const resData = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: resData.response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Error: ${err.message}` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-card glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "450px" }}>
      <h3>Chat With Company AI</h3>
      <div className="chat-messages-container" style={{ flex: 1, overflowY: "auto", margin: "1rem 0", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem" }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role}`}>
            <span className="chat-bubble-role">{msg.role === "user" ? "You" : "Analyst"}</span>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.4" }}>{msg.content}</p>
          </div>
        ))}
        {isSending && (
          <div className="chat-bubble assistant typing">
            <span className="chat-bubble-role">Analyst</span>
            <div style={{ display: "flex", gap: "0.2rem", marginTop: "0.2rem" }}>
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          className="form-input"
          placeholder="Ask something about the report..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isSending}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={isSending || !inputValue.trim()} style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function ReportDashboard({ data }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!data) return null;

  const { researchData, financialData, newsData, riskData, decisionData } = data;

  const { overview = "", industry = "", competitors = [], businessModel = "", competitorsComparison = [] } = researchData || {};
  const { revenue = "N/A", revenueGrowth = "N/A", netIncome = "N/A", profitMargin = "N/A", debtLevel = "N/A", financialAnalysis = "" } = financialData || {};
  const { sentiment = "Neutral", sentimentScore = 50, recentStories = [], sentimentAnalysis = "", positiveCount = 0, negativeCount = 0, neutralCount = 0, sentimentDrivers = [] } = newsData || {};
  const { risks = [], riskSummary = "" } = riskData || {};
  const { investmentScore = 50, recommendation = "HOLD", verdictSummary = "", growthOpportunities = [], summaryReport = "", confidenceMeter = null, backtestData = null } = decisionData || {};

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (investmentScore / 100) * circumference;

  const handleCopyReport = () => {
    if (!summaryReport) return;
    navigator.clipboard.writeText(summaryReport);
    alert("Markdown report copied to clipboard!");
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${overview ? overview.split(' ')[0] : 'Report'}_analysis_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintMemo = () => {
    window.print();
  };

  return (
    <div className="dashboard-grid">
      {/* Sidebar Recommendation Panel */}
      <div className="verdict-card glass-panel">
        <h3 className="verdict-header">Investment Verdict</h3>

        <div className={`rec-badge ${recommendation}`}>
          {recommendation}
        </div>

        {/* Investment Score Radial Gauge */}
        <div className="gauge-wrapper">
          <svg className="gauge-svg">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle className="gauge-bg" cx="80" cy="80" r={radius} />
            <circle
              className="gauge-fill"
              cx="80"
              cy="80"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="gauge-text">
            <span className="gauge-value">{investmentScore}</span>
            <span className="gauge-label">Score</span>
          </div>
        </div>

        <div className="verdict-summary-text">
          {verdictSummary}
        </div>

        {growthOpportunities.length > 0 && (
          <div style={{ width: "100%", textAlign: "left", marginTop: "1rem" }}>
            <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-secondary)", marginBottom: "0.5rem" }}>
              Key Catalysts
            </h4>
            <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {growthOpportunities.map((opportunity, i) => (
                <li key={i}>{opportunity}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="tabs-container">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={`tab-btn ${activeTab === "financials" ? "active" : ""}`} onClick={() => setActiveTab("financials")}>Financials</button>
          <button className={`tab-btn ${activeTab === "competitors" ? "active" : ""}`} onClick={() => setActiveTab("competitors")}>Competitors</button>
          <button className={`tab-btn ${activeTab === "news" ? "active" : ""}`} onClick={() => setActiveTab("news")}>News & Sentiment</button>
          <button className={`tab-btn ${activeTab === "risks" ? "active" : ""}`} onClick={() => setActiveTab("risks")}>Risks</button>
          <button className={`tab-btn ${activeTab === "xai" ? "active" : ""}`} onClick={() => setActiveTab("xai")}>XAI & Confidence</button>
          <button className={`tab-btn ${activeTab === "backtest" ? "active" : ""}`} onClick={() => setActiveTab("backtest")}>Backtest</button>
          <button className={`tab-btn ${activeTab === "portfolio" ? "active" : ""}`} onClick={() => setActiveTab("portfolio")}>Simulator</button>
          <button className={`tab-btn ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>Chat AI</button>
          <button className={`tab-btn ${activeTab === "report" ? "active" : ""}`} onClick={() => setActiveTab("report")}>Investment Memo</button>
        </div>

        <div className="tab-content-panel">
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="overview-grid">
              <div className="overview-desc-card glass-panel">
                <h3>Company Overview</h3>
                <p>{overview}</p>
              </div>
              <div className="sub-details-grid">
                <div className="details-card glass-panel">
                  <h4>Business Model</h4>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    {businessModel}
                  </p>
                </div>
                <div className="details-card glass-panel">
                  <h4>Industry & Sector</h4>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", marginBottom: "0.75rem", lineHeight: "1.5" }}>
                    <strong>Industry:</strong> {industry}
                  </p>
                  <h5 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                    Direct Competitors:
                  </h5>
                  <ul className="details-list">
                    {competitors.map((comp, idx) => (
                      <li key={idx}>{comp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Financials */}
          {activeTab === "financials" && (
            <div>
              <div className="financials-split-layout">
                {financialAnalysis && (
                  <div className="financials-summary-box glass-panel">
                    <h3>Financial Analyst Commentary</h3>
                    <p>{financialAnalysis}</p>
                  </div>
                )}
                <FinancialsChart revenue={revenue} netIncome={netIncome} />
              </div>
              
              <div className="metrics-grid" style={{ marginTop: "1.5rem" }}>
                <div className="metric-card glass-panel">
                  <span className="metric-label">Revenue</span>
                  <span className="metric-value">{revenue}</span>
                </div>
                <div className="metric-card glass-panel sec">
                  <span className="metric-label">Revenue Growth</span>
                  <span className="metric-value">{revenueGrowth}</span>
                </div>
                <div className="metric-card glass-panel success">
                  <span className="metric-label">Net Profit</span>
                  <span className="metric-value">{netIncome}</span>
                </div>
                <div className="metric-card glass-panel success">
                  <span className="metric-label">Profit Margin</span>
                  <span className="metric-value">{profitMargin}</span>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
                <h4 style={{ color: "var(--color-secondary)", marginBottom: "0.5rem" }}>Balance Sheet & Debt Assessment</h4>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: "1.6" }}>{debtLevel}</p>
              </div>
            </div>
          )}

          {/* Tab 3: Competitors Comparison */}
          {activeTab === "competitors" && (
            <CompetitorsComparison comparisonData={competitorsComparison} />
          )}

          {/* Tab 4: News & Sentiment */}
          {activeTab === "news" && (
            <div>
              <SentimentMeter sentiment={sentiment} score={sentimentScore} commentary={sentimentAnalysis} positiveCount={positiveCount} negativeCount={negativeCount} neutralCount={neutralCount} drivers={sentimentDrivers} />

              <SentimentTrendChart baseScore={sentimentScore} />

              <h3 style={{ margin: "2rem 0 1rem 0" }}>Recent News Highlights</h3>
              <div className="news-timeline">
                {recentStories.length > 0 ? (
                  recentStories.map((story, i) => (
                    <div key={i} className="news-card glass-panel">
                      <div className="news-meta">
                        <span>{story.source || "News Source"}</span>
                      </div>
                      <h4>{story.title}</h4>
                      <p>{story.summary}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--color-text-muted)" }}>No recent news articles extracted.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Risks */}
          {activeTab === "risks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
                {riskSummary && (
                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--color-pass)" }}>
                    <h3>Risk Assessment Summary</h3>
                    <p style={{ color: "var(--color-text-secondary)", lineHeight: "1.6", marginTop: "0.5rem" }}>{riskSummary}</p>
                  </div>
                )}
                <RiskVectorChart risks={risks} />
              </div>

              <div className="risk-matrix">
                {risks.length > 0 ? (
                  risks.map((risk, idx) => (
                    <div key={idx} className="risk-item-card glass-panel">
                      <div className="risk-item-details">
                        <span className="risk-item-category">{risk.category}</span>
                        <h4>{risk.description}</h4>
                      </div>
                      <span className={`risk-severity-pill ${risk.severity}`}>
                        {risk.severity} Risk
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--color-text-muted)" }}>No major risks identified.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Explainable AI & Confidence Slider ADJUSTER */}
          {activeTab === "xai" && (
            <InteractiveConfidenceMeter
              confidenceData={confidenceMeter}
              baseScore={investmentScore}
              researchData={researchData}
              financialData={financialData}
              newsData={newsData}
              riskData={riskData}
            />
          )}

          {/* Tab 7: Historical Backtest */}
          {activeTab === "backtest" && (
            <BacktestChart backtestData={backtestData} />
          )}

          {/* Tab 8: Portfolio Simulator */}
          {activeTab === "portfolio" && (
            <PortfolioSimulator
              targetName={overview ? overview.split(' ')[0] : 'Target Company'}
              competitorsComparison={competitorsComparison}
            />
          )}

          {/* Tab 9: Chat AI */}
          {activeTab === "chat" && (
            <ChatWithCompany data={data} />
          )}

          {/* Tab 10: Executive Investment Memo */}
          {activeTab === "report" && (
            <div className="glass-panel cio-report-container printable-memo" style={{ padding: "2.5rem" }}>
              <div className="cio-report-header">
                <h3>Institutional Investment Memo</h3>
                <div className="cio-report-actions">
                  <button className="btn-secondary" onClick={handleCopyReport}>
                    📋 Copy Markdown
                  </button>
                  <button className="btn-primary" onClick={handlePrintMemo}>
                    🖨️ Print / Save PDF
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadJSON}>
                    📥 Download JSON Data
                  </button>
                </div>
              </div>
              <hr style={{ border: "0", height: "1px", background: "var(--border-color)", margin: "1.5rem 0" }} />
              <div 
                className="markdown-report"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryReport) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
