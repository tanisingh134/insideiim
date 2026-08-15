import React, { useState, useEffect, useRef } from "react";
import ApiKeyConfig from "./components/ApiKeyConfig";
import ReportDashboard from "./components/ReportDashboard";
import InteractiveBackground from "./components/InteractiveBackground";

export default function App() {
  const [companyName, setCompanyName] = useState("");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [config, setConfig] = useState({
    openaiApiKey: "",
    geminiApiKey: "",
    provider: "openai"
  });
  const [agentStatus, setAgentStatus] = useState({
    ResearchAgent: "idle",
    FinancialAnalystAgent: "idle",
    NewsAnalystAgent: "idle",
    RiskAgent: "idle",
    InvestmentDecisionAgent: "idle"
  });
  const [history, setHistory] = useState([]);

  const consoleEndRef = useRef(null);

  // Load config and history on mount
  useEffect(() => {
    const savedOpenai = localStorage.getItem("openaiApiKey") || "";
    const savedGemini = localStorage.getItem("geminiApiKey") || "";
    const savedProvider = localStorage.getItem("aiProvider") || "openai";
    const savedHistory = JSON.parse(localStorage.getItem("invesTrackHistory") || "[]");
    
    setConfig({
      openaiApiKey: savedOpenai,
      geminiApiKey: savedGemini,
      provider: savedProvider
    });
    setHistory(savedHistory);
  }, []);

  // Auto scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
  };

  const handleLoadHistory = (item) => {
    if (isLoading) return;
    setCompanyName(item.companyName);
    setResult(item.result);
    setLogs([]);
    setErrorMsg("");
    setAgentStatus({
      ResearchAgent: "completed",
      FinancialAnalystAgent: "completed",
      NewsAnalystAgent: "completed",
      RiskAgent: "completed",
      InvestmentDecisionAgent: "completed"
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem("invesTrackHistory");
    setHistory([]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    // Reset states
    setLogs([]);
    setResult(null);
    setIsLoading(true);
    setErrorMsg("");
    setAgentStatus({
      ResearchAgent: "idle",
      FinancialAnalystAgent: "idle",
      NewsAnalystAgent: "idle",
      RiskAgent: "idle",
      InvestmentDecisionAgent: "idle"
    });

    // Verify if API keys are set for chosen provider
    if (config.provider === "openai" && !config.openaiApiKey) {
      setIsConfigOpen(true);
      setErrorMsg("Please configure your OpenAI API Key first.");
      setIsLoading(false);
      return;
    }
    if (config.provider === "gemini" && !config.geminiApiKey) {
      setIsConfigOpen(true);
      setErrorMsg("Please configure your Gemini API Key first.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          provider: config.provider,
          apiKeys: {
            openaiApiKey: config.openaiApiKey,
            geminiApiKey: config.geminiApiKey
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      // Stream handling
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split("\n");
          let event = "";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              event = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              data = line.substring(6).trim();
            }
          }

          if (event && data) {
            try {
              const parsed = JSON.parse(data);
              
              if (event === "log") {
                setLogs((prev) => [
                  ...prev,
                  {
                    ...parsed,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  }
                ]);

                // Update agent status based on log
                setAgentStatus((prev) => {
                  const updated = { ...prev };
                  const agent = parsed.agent;
                  const status = parsed.status;
                  
                  if (agent && agent !== "System") {
                    if (status === "started" || status === "analyzing") {
                      updated[agent] = "processing";
                      // Auto-complete previous nodes in workflow order
                      const order = ["ResearchAgent", "FinancialAnalystAgent", "NewsAnalystAgent", "RiskAgent", "InvestmentDecisionAgent"];
                      const idx = order.indexOf(agent);
                      for (let i = 0; i < idx; i++) {
                        if (updated[order[i]] !== "completed") {
                          updated[order[i]] = "completed";
                        }
                      }
                    } else if (status === "completed") {
                      updated[agent] = "completed";
                    } else if (status === "error") {
                      updated[agent] = "error";
                    }
                  }
                  return updated;
                });

              } else if (event === "result") {
                setResult(parsed);
                setIsLoading(false);

                // Auto-complete all agents on success
                setAgentStatus({
                  ResearchAgent: "completed",
                  FinancialAnalystAgent: "completed",
                  NewsAnalystAgent: "completed",
                  RiskAgent: "completed",
                  InvestmentDecisionAgent: "completed"
                });

                // Add to LocalStorage history
                setHistory((prevHistory) => {
                  const filtered = prevHistory.filter(item => item.companyName.toLowerCase() !== companyName.trim().toLowerCase());
                  const newEntry = {
                    companyName: companyName.trim(),
                    recommendation: parsed.decisionData?.recommendation || "HOLD",
                    investmentScore: parsed.decisionData?.investmentScore || 50,
                    result: parsed,
                    timestamp: new Date().toLocaleDateString()
                  };
                  const updated = [newEntry, ...filtered].slice(0, 8); // Keep last 8 runs
                  localStorage.setItem("invesTrackHistory", JSON.stringify(updated));
                  return updated;
                });

              } else if (event === "error") {
                setErrorMsg(parsed.message);
                setIsLoading(false);
                setLogs((prev) => [
                  ...prev,
                  {
                    agent: "System",
                    status: "error",
                    message: `Error: ${parsed.message}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  }
                ]);
              }
            } catch (err) {
              console.error("Failed to parse SSE JSON:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Fetch/Stream error:", error);
      setErrorMsg(error.message);
      setIsLoading(false);
      setLogs((prev) => [
        ...prev,
        {
          agent: "System",
          status: "error",
          message: `Network Error: ${error.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      ]);
    }
  };

  const renderWorkflowGraph = () => {
    const steps = [
      { id: "ResearchAgent", label: "Research", icon: "🔍" },
      { id: "FinancialAnalystAgent", label: "Financials", icon: "📊" },
      { id: "NewsAnalystAgent", label: "News", icon: "📰" },
      { id: "RiskAgent", label: "Risks", icon: "⚠️" },
      { id: "InvestmentDecisionAgent", label: "Verdict", icon: "⚖️" }
    ];
    
    return (
      <div className="workflow-graph glass-panel">
        <div className="workflow-header">
          <h4>Multi-Agent Collaborative Flow</h4>
        </div>
        <div className="workflow-nodes">
          {steps.map((step, idx) => {
            const status = agentStatus[step.id] || "idle";
            return (
              <React.Fragment key={step.id}>
                <div className={`workflow-node ${status}`}>
                  <div className="node-icon-wrapper">
                    <span className="node-icon">{step.icon}</span>
                    {status === "processing" && <div className="pulse-ring" />}
                  </div>
                  <div className="node-info">
                    <span className="node-label">{step.label}</span>
                    <span className="node-status">{status.toUpperCase()}</span>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`workflow-connector ${agentStatus[steps[idx + 1].id] !== "idle" ? "active" : ""}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const hasSearched = isLoading || result;

  return (
    <div className="app-container">
      <InteractiveBackground />
      
      {!hasSearched ? (
        /* Perplexity-style Hero Section */
        <div className="hero-section">
          <div className="hero-badge">
            <span>🚀 v2.5 Consensus Swarm Live</span>
          </div>
          <h1 className="hero-title">InvesTrack AI</h1>
          <p className="hero-subtitle">
            Deploy a collaborative team of specialized AI agents to analyze equity profiles, audit financials, scan news sentiment, and simulate allocations in parallel.
          </p>

          <form onSubmit={handleSearch} className="search-bar-wrapper" style={{ width: "100%", maxWidth: "650px" }}>
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search any ticker or company (e.g. Apple, NVIDIA, Tesla...)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="search-button" disabled={isLoading || !companyName.trim()}>
              Analyze
            </button>
          </form>

          {/* History Pills */}
          {history.length > 0 && (
            <div className="history-pills-container" style={{ marginTop: "1.5rem" }}>
              <span className="history-label">Recents:</span>
              <div className="history-pills-list">
                {history.slice(0, 5).map((item, idx) => (
                  <button
                    key={idx}
                    className={`history-pill-btn ${item.recommendation}`}
                    onClick={() => handleLoadHistory(item)}
                    disabled={isLoading}
                  >
                    {item.companyName} ({item.investmentScore})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "2rem" }}>
            <button className="config-trigger-btn" onClick={() => setIsConfigOpen(true)}>
              ⚙️ Configure API Keys
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="hero-features-grid">
            <div className="hero-feature-card glass-panel">
              <div className="hero-feature-icon">🤖</div>
              <h4>Collaborative Swarm</h4>
              <p>Five specialized agents review overview, cash, risk, and news in consensus.</p>
            </div>
            <div className="hero-feature-card glass-panel">
              <div className="hero-feature-icon">📈</div>
              <h4>Historical Backtesting</h4>
              <p>Simulates stock strategy returns relative to S&P 500 benchmark performance.</p>
            </div>
            <div className="hero-feature-card glass-panel">
              <div className="hero-feature-icon">🍩</div>
              <h4>Portfolio Simulator</h4>
              <p>Distribute starting capital across target assets and calculate Volatility & Sharpe.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Dashboard Layout Mode */
        <>
          <header className="app-header">
            <div className="logo-section" style={{ cursor: "pointer" }} onClick={() => { setResult(null); setLogs([]); setCompanyName(""); }}>
              <div className="logo-icon">I</div>
              <div className="logo-text">
                <h1 style={{ fontSize: "1.3rem" }}>InvesTrack AI</h1>
                <p style={{ fontSize: "0.75rem" }}>Multi-Agent Intelligence</p>
              </div>
            </div>

            {/* Search Input inline in header when active */}
            <form onSubmit={handleSearch} className="search-bar-wrapper" style={{ flex: 1, maxWidth: "450px", margin: "0 2rem" }}>
              <div className="search-input-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Analyze another company..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                />
              </div>
              <button type="submit" className="search-button" disabled={isLoading || !companyName.trim()} style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                {isLoading ? "Running..." : "Research"}
              </button>
            </form>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="config-trigger-btn" onClick={() => setIsConfigOpen(true)}>
                ⚙️ Keys
              </button>
              <button className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }} onClick={() => { setResult(null); setLogs([]); }}>
                🏠 Home
              </button>
            </div>
          </header>

          {/* History Pills when in workspace */}
          {history.length > 0 && (
            <div className="history-pills-container" style={{ margin: "-0.5rem 0 0 0" }}>
              <div className="history-pills-list">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    className={`history-pill-btn ${item.recommendation}`}
                    onClick={() => handleLoadHistory(item)}
                    disabled={isLoading}
                  >
                    {item.companyName} ({item.investmentScore})
                  </button>
                ))}
                <button className="history-clear-btn" onClick={handleClearHistory} disabled={isLoading}>
                  Clear History
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="error-box">
              ⚠️ <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {/* Agent Workflow Graph & Live Console */}
          {(isLoading || logs.length > 0) && (
            <div className="live-progress-section">
              {renderWorkflowGraph()}
              
              <section className="console-panel glass-panel">
                <div className="console-header">
                  <div className="console-header-dots">
                    <span className="console-dot-indicator red" />
                    <span className="console-dot-indicator yellow" />
                    <span className="console-dot-indicator green" />
                  </div>
                  <div className="console-title">
                    <span className={`status-dot ${isLoading ? "active" : ""}`} />
                    <span>AI Consensus Swarm Stream</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {isLoading ? "Running Swarm..." : "Swarm complete"}
                  </div>
                </div>
                <div className="console-body">
                  {logs.map((log, index) => (
                    <div key={index} className="console-line">
                      <span className="console-time">[{log.timestamp}]</span>
                      <span className={`console-agent-badge ${log.agent}`}>
                        {log.agent}
                      </span>
                      <span className="console-message">{log.message}</span>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              </section>
            </div>
          )}

          {/* Report Dashboard Output */}
          {!isLoading && result && (
            <section>
              <ReportDashboard data={result} agentStatus={agentStatus} />
            </section>
          )}
        </>
      )}

      {/* API Config Modal Overlay */}
      <ApiKeyConfig
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={handleSaveConfig}
      />
    </div>
  );
}
