import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { graph, getLLM } from "./agents.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Main SSE endpoint for Company Research Agent
app.post("/api/research", async (req, res) => {
  const { companyName, apiKeys, provider } = req.body;

  if (!companyName || !companyName.trim()) {
    return res.status(400).json({ error: "Company name is required." });
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Merge backend .env keys with frontend supplied keys
    const mergedApiKeys = {
      openaiApiKey: apiKeys?.openaiApiKey || process.env.OPENAI_API_KEY,
      geminiApiKey: apiKeys?.geminiApiKey || process.env.GEMINI_API_KEY,
    };

    const chosenProvider = provider || (mergedApiKeys.geminiApiKey ? "gemini" : "openai");

    sendEvent("log", {
      agent: "System",
      status: "info",
      message: `System initialized. Using provider: ${chosenProvider.toUpperCase()}`
    });

    const result = await graph.invoke(
      {
        companyName: companyName.trim(),
        apiKeys: mergedApiKeys,
        provider: chosenProvider,
      },
      {
        configurable: {
          onLog: (logItem) => {
            sendEvent("log", logItem);
          },
        },
      }
    );

    // Stream the final accumulated state
    sendEvent("result", {
      researchData: result.researchData,
      financialData: result.financialData,
      newsData: result.newsData,
      riskData: result.riskData,
      decisionData: result.decisionData,
    });

    res.end();
  } catch (error) {
    console.error("Error executing agents flow:", error);
    sendEvent("error", { message: error.message || "An unexpected error occurred during research." });
    res.end();
  }
});

// Chat with Company context endpoint
app.post("/api/chat", async (req, res) => {
  const { companyContext, message, chatHistory, provider, apiKeys } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const mergedApiKeys = {
      openaiApiKey: apiKeys?.openaiApiKey || process.env.OPENAI_API_KEY,
      geminiApiKey: apiKeys?.geminiApiKey || process.env.GEMINI_API_KEY,
    };

    const chosenProvider = provider || (mergedApiKeys.geminiApiKey ? "gemini" : "openai");
    const model = getLLM(mergedApiKeys, chosenProvider);

    const systemPrompt = `You are an expert investment analyst assistant. You have access to a comprehensive research profile of the company.
    
Here is the company research context:
${JSON.stringify(companyContext)}

Answer the user's questions objectively and accurately based on the provided context, financials, news, and risk data. Be concise, professional, and clear. If a question is asked that is not in the context, try to answer it using your general knowledge but mention that this is outside the analyzed report context.`;

    const messages = [new SystemMessage(systemPrompt)];

    // Add chat history
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((msg) => {
        if (msg.role === "user") {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
          messages.push(new AIMessage(msg.content));
        }
      });
    }

    // Add user message
    messages.push(new HumanMessage(message));

    const response = await model.invoke(messages);
    res.json({ response: response.content.toString() });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during chat." });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", port: PORT });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
