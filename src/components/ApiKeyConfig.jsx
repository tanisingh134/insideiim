import React, { useState, useEffect } from "react";

export default function ApiKeyConfig({ isOpen, onClose, onSave }) {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [provider, setProvider] = useState("openai");

  useEffect(() => {
    // Load existing keys from localStorage
    setOpenaiApiKey(localStorage.getItem("openaiApiKey") || "");
    setGeminiApiKey(localStorage.getItem("geminiApiKey") || "");
    setProvider(localStorage.getItem("aiProvider") || "openai");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem("openaiApiKey", openaiApiKey);
    localStorage.setItem("geminiApiKey", geminiApiKey);
    localStorage.setItem("aiProvider", provider);
    
    onSave({
      openaiApiKey,
      geminiApiKey,
      provider
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h2 className="modal-title">API Configuration</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="ai-provider">Default LLM Provider</label>
            <select
              id="ai-provider"
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="openai">OpenAI (GPT-4o-mini)</option>
              <option value="gemini">Google Gemini (Gemini 3.6 Flash)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="openai-key">OpenAI API Key (Required for OpenAI)</label>
            <input
              id="openai-key"
              type="password"
              className="form-input"
              placeholder="sk-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="gemini-key">Gemini API Key (Required for Gemini)</label>
            <input
              id="gemini-key"
              type="password"
              className="form-input"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
          </div>

          <div className="fallback-note" style={{ fontSize: "0.8rem", color: "var(--color-secondary)", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", padding: "0.75rem", borderRadius: "8px", lineHeight: "1.4", display: "flex", gap: "0.5rem" }}>
            <span>💡</span>
            <span><strong>Self-Healing Fallback:</strong> Configure keys for <em>both</em> providers to automatically switch if the primary model experiences transient errors (like Gemini 503 high-demand).</span>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Config</button>
        </div>
      </div>
    </div>
  );
}
