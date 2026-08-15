import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// 1. Define the LangGraph state annotation
const GraphState = Annotation.Root({
  companyName: Annotation(),
  apiKeys: Annotation(),
  provider: Annotation(),
  researchData: Annotation(),
  financialData: Annotation(),
  newsData: Annotation(),
  riskData: Annotation(),
  decisionData: Annotation(),
});

// Helper: Instantiate LLM based on user selection and keys
export function getLLM(apiKeys, provider) {
  if (provider === "gemini") {
    if (!apiKeys.geminiApiKey) {
      throw new Error("Gemini API Key is missing. Please configure it.");
    }
    return new ChatGoogleGenerativeAI({
      apiKey: apiKeys.geminiApiKey,
      modelName: "gemini-3.6-flash",
      temperature: 0.2,
      maxRetries: 3,
    });
  } else {
    // Default to openai
    if (!apiKeys.openaiApiKey) {
      throw new Error("OpenAI API Key is missing. Please configure it.");
    }
    return new ChatOpenAI({
      openAIApiKey: apiKeys.openaiApiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.2,
    });
  }
}

// Helper: Invoke LLM with automatic fallback
async function invokeModel(state, systemPrompt, humanMessage, config, agentName) {
  const { apiKeys, provider } = state;
  const onLog = config?.configurable?.onLog;
  
  let primaryProvider = provider;
  let secondaryProvider = provider === "gemini" ? "openai" : "gemini";
  
  try {
    const model = getLLM(apiKeys, primaryProvider);
    return await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(humanMessage)
    ]);
  } catch (error) {
    console.error(`Error invoking ${primaryProvider} for ${agentName}:`, error);
    
    // Check if we can fallback to the secondary provider
    const hasSecondaryKey = secondaryProvider === "gemini" 
      ? apiKeys.geminiApiKey 
      : apiKeys.openaiApiKey;
      
    if (hasSecondaryKey) {
      if (onLog) {
        onLog({
          agent: "System",
          status: "info",
          message: `⚠️ ${primaryProvider.toUpperCase()} failed for ${agentName}. Automatically falling back to ${secondaryProvider.toUpperCase()}...`
        });
      }
      try {
        const fallbackModel = getLLM(apiKeys, secondaryProvider);
        return await fallbackModel.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(humanMessage)
        ]);
      } catch (fallbackError) {
        throw new Error(`Primary (${primaryProvider}) and Fallback (${secondaryProvider}) both failed. Fallback error: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`${primaryProvider.toUpperCase()} failed for ${agentName}: ${error.message}. Please configure API keys for both providers to enable automatic self-healing fallback.`);
    }
  }
}

// Helper: Parse JSON safely from LLM output
function parseJsonFromResponse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (innerErr) {
        console.error("Inner JSON parse error:", innerErr);
      }
    }
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "");
    }
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed parsing: ", text);
      throw new Error("Model response was not valid JSON");
    }
  }
}

// --- NODE IMPLEMENTATIONS ---

// 1. Research Agent Node
async function researchAgentNode(state, config) {
  const { companyName, apiKeys, provider } = state;
  const onLog = config?.configurable?.onLog;

  if (onLog) {
    onLog({
      agent: "ResearchAgent",
      status: "started",
      message: `Initiating research on ${companyName}...`
    });
  }

  const systemPrompt = `You are a Senior Investment Research Agent. Analyze the company requested by the user and extract its profile.
Analyze the company using your internal knowledge.
Provide your response strictly in the following JSON format:
{
  "overview": "Clear explanation of the company, its mission, history, and current status",
  "industry": "The industry description, key dynamics, and trends",
  "competitors": ["Competitor A", "Competitor B", "Competitor C"],
  "businessModel": "How the company creates value and generates revenue",
  "competitorsComparison": [
    { "name": "Company Name", "revenue": "Revenue of this company (e.g. $96.8B)", "growth": "y/y Growth (e.g. +12%)", "margin": "Profit margin (e.g. 15.3%)", "pe": "P/E ratio (e.g. 28.5)", "marketCap": "Market cap (e.g. $3.1T)" },
    { "name": "Competitor A", "revenue": "Revenue (e.g. $82.4B)", "growth": "Growth (e.g. +8%)", "margin": "Margin (e.g. 11.2%)", "pe": "P/E ratio (e.g. 24.2)", "marketCap": "Market cap (e.g. $2.2T)" },
    { "name": "Competitor B", "revenue": "Revenue (e.g. $54.1B)", "growth": "Growth (e.g. -2%)", "margin": "Margin (e.g. 8.5%)", "pe": "P/E ratio (e.g. 18.1)", "marketCap": "Market cap (e.g. $1.1T)" }
  ]
}
Include the analyzed company as the first entry in "competitorsComparison", followed by 2 main competitors.
Return only the raw JSON. No conversational text around it.`;

  const humanMessage = `Company: ${companyName}\n\nAnalyze using your internal knowledge database.`;

  if (onLog) onLog({ agent: "ResearchAgent", status: "analyzing", message: "Synthesizing company overview and profile..." });
  
  const response = await invokeModel(state, systemPrompt, humanMessage, config, "ResearchAgent");

  const researchData = parseJsonFromResponse(response.content.toString());
  
  if (onLog) {
    onLog({
      agent: "ResearchAgent",
      status: "completed",
      message: `Completed overview. Identified main competitors: ${researchData.competitors.join(", ")}`
    });
  }

  return { researchData };
}

// 2. Financial Analyst Node
async function financialAnalystNode(state, config) {
  const { companyName, apiKeys, provider, researchData } = state;
  const onLog = config?.configurable?.onLog;

  if (onLog) {
    onLog({
      agent: "FinancialAnalystAgent",
      status: "started",
      message: `Analyzing financial performance for ${companyName}...`
    });
  }

  const systemPrompt = `You are a Professional Financial Analyst Agent. Analyze the company's financial state.
Analyze using your internal knowledge of the company's recent financials.
Provide your response strictly in the following JSON format:
{
  "revenue": "Recent annual or quarterly revenue (e.g. $96.8 Billion)",
  "revenueGrowth": "Revenue growth percentage y/y (e.g. +12% y/y)",
  "netIncome": "Recent profit / net income (e.g. $14.8 Billion)",
  "profitMargin": "Net profit margin percentage (e.g. 15.3%)",
  "debtLevel": "Evaluation of the company's debt/cash level (e.g. Low debt, cash rich with $12B cash)",
  "financialAnalysis": "Detailed 2-3 sentence analysis of financial health, growth drivers, or areas of concern"
}
Return only raw JSON.`;

  const humanMessage = `Company: ${companyName}\nResearch Overview: ${JSON.stringify(researchData)}\n\nAnalyze using internal financial knowledge.`;

  if (onLog) onLog({ agent: "FinancialAnalystAgent", status: "analyzing", message: "Extracting financial KPIs and trends..." });

  const response = await invokeModel(state, systemPrompt, humanMessage, config, "FinancialAnalystAgent");

  const financialData = parseJsonFromResponse(response.content.toString());

  if (onLog) {
    onLog({
      agent: "FinancialAnalystAgent",
      status: "completed",
      message: `Completed financial audit. Revenue: ${financialData.revenue} (${financialData.revenueGrowth}), Profit Margin: ${financialData.profitMargin}`
    });
  }

  return { financialData };
}

// 3. News Analyst Node
async function newsAnalystNode(state, config) {
  const { companyName, apiKeys, provider } = state;
  const onLog = config?.configurable?.onLog;

  if (onLog) {
    onLog({
      agent: "NewsAnalystAgent",
      status: "started",
      message: `Reading recent news and measuring market sentiment for ${companyName}...`
    });
  }

  const systemPrompt = `You are an AI News Analyst Agent. Identify recent news events and overall market sentiment regarding the company.
Use internal knowledge up to mid-2025/2026.
Provide your response strictly in the following JSON format:
{
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "sentimentScore": 75, // integer from 0 to 100
  "positiveCount": 14, // estimated positive articles count recently
  "negativeCount": 3, // estimated negative articles count recently
  "neutralCount": 5, // estimated neutral articles count recently
  "sentimentDrivers": ["Key Driver A", "Key Driver B", "Key Driver C"], // list of main things moving sentiment
  "recentStories": [
    {
      "title": "Title of the news article/event",
      "source": "Source name (e.g. Bloomberg)",
      "summary": "One sentence summary of the news impact"
    }
  ],
  "sentimentAnalysis": "A short summary explaining the news sentiment (e.g. Bullish due to AI expansions, offset by minor regulatory probes)."
}
Return only raw JSON. Limit to max 3 recent stories.`;

  const humanMessage = `Company: ${companyName}\n\nAnalyze recent news from internal database.`;

  if (onLog) onLog({ agent: "NewsAnalystAgent", status: "analyzing", message: "Synthesizing article headlines and score..." });

  const response = await invokeModel(state, systemPrompt, humanMessage, config, "NewsAnalystAgent");

  const newsData = parseJsonFromResponse(response.content.toString());

  if (onLog) {
    onLog({
      agent: "NewsAnalystAgent",
      status: "completed",
      message: `Sentiment analyzed as ${newsData.sentiment} (Score: ${newsData.sentimentScore}/100)`
    });
  }

  return { newsData };
}

// 4. Risk Agent Node
async function riskAgentNode(state, config) {
  const { companyName, apiKeys, provider, researchData, financialData } = state;
  const onLog = config?.configurable?.onLog;

  if (onLog) {
    onLog({
      agent: "RiskAgent",
      status: "started",
      message: `Analyzing risk matrices and threats for ${companyName}...`
    });
  }

  const systemPrompt = `You are a Risk Assessment Agent. Identify potential risks for this company, categorizing them and rating their severity.
Analyze using internal database knowledge.
Provide your response strictly in the following JSON format:
{
  "risks": [
    {
      "category": "Regulatory" | "Competitive" | "Supply Chain" | "Financial" | "Technology",
      "description": "Short explanation of the risk",
      "severity": "High" | "Medium" | "Low"
    }
  ],
  "riskSummary": "Overall risk assessment summary (2 sentences)."
}
Return only raw JSON. Limit to max 4 risks.`;

  const humanMessage = `Company: ${companyName}\nOverview: ${JSON.stringify(researchData)}\nFinancials: ${JSON.stringify(financialData)}\n\nAnalyze risks from internal database.`;

  if (onLog) onLog({ agent: "RiskAgent", status: "analyzing", message: "Evaluating severity and impact of threat factors..." });

  const response = await invokeModel(state, systemPrompt, humanMessage, config, "RiskAgent");

  const riskData = parseJsonFromResponse(response.content.toString());

  if (onLog) {
    onLog({
      agent: "RiskAgent",
      status: "completed",
      message: `Risk analysis finished. Highlighted ${riskData.risks.length} main risk vectors.`
    });
  }

  return { riskData };
}

// 5. Investment Decision Agent Node
async function investmentDecisionNode(state, config) {
  const { companyName, apiKeys, provider, researchData, financialData, newsData, riskData } = state;
  const onLog = config?.configurable?.onLog;

  if (onLog) {
    onLog({
      agent: "InvestmentDecisionAgent",
      status: "started",
      message: `Consolidating all analyst reports for ${companyName} and drafting investment verdict...`
    });
  }

  const systemPrompt = `You are a Chief Investment Officer (CIO) and Senior Portfolio Manager.
Review the research reports from the Research Agent, Financial Analyst, News Analyst, and Risk Agent.
Formulate a final Investment Score, a recommendation, and compile a Summary Investment Report.

Provide your response strictly in the following JSON format:
{
  "investmentScore": 85, // integer from 0 to 100
  "recommendation": "BUY" | "HOLD" | "PASS",
  "verdictSummary": "Executive summary of why this recommendation and score was chosen (3-4 sentences)",
  "growthOpportunities": [
    "Opportunity A",
    "Opportunity B"
  ],
  "explainableAI": {
    "weights": {
      "research": 20, // percentage weight (integer, total must equal 100)
      "financials": 35, // percentage weight (integer)
      "news": 20, // percentage weight (integer)
      "risks": 25 // percentage weight (integer)
    },
    "reasoning": {
      "research": "Justification for Research Agent weight/influence on decision (1 sentence)",
      "financials": "Justification for Financial Analyst weight/influence on decision (1 sentence)",
      "news": "Justification for News Analyst weight/influence on decision (1 sentence)",
      "risks": "Justification for Risk Agent weight/influence on decision (1 sentence)"
    }
  },
  "confidenceMeter": {
    "score": 88, // overall analysis confidence from 0 to 100
    "factors": {
      "dataCompleteness": 95, // subscore 0-100
      "marketAgreement": 85, // subscore 0-100
      "riskMitigation": 80, // subscore 0-100
      "regulatoryClarity": 90 // subscore 0-100
    }
  },
  "backtestData": {
    "returns1Y": "Growth percentage (e.g. +28%)",
    "returns3Y": "Growth percentage (e.g. +114%)",
    "returns5Y": "Growth percentage (e.g. +240%)",
    "sp500Returns1Y": "Growth percentage (e.g. +15%)",
    "sp500Returns3Y": "Growth percentage (e.g. +40%)",
    "sp500Returns5Y": "Growth percentage (e.g. +75%)",
    "trajectory": [
      { "month": "Jul 25", "stock": 100, "sp500": 100 },
      { "month": "Sep 25", "stock": 108, "sp500": 102 },
      { "month": "Nov 25", "stock": 115, "sp500": 104 },
      { "month": "Jan 26", "stock": 112, "sp500": 103 },
      { "month": "Mar 26", "stock": 124, "sp500": 107 },
      { "month": "May 26", "stock": 135, "sp500": 110 },
      { "month": "Jul 26", "stock": 142, "sp500": 112 }
    ] // 7 monthly coordinates showing relative trajectory starting at 100. Values should realistically align with the company's performance.
  },
  "summaryReport": "A beautiful, extensive, professional markdown-formatted summary report (structured as a formal Investment Memo). Highlight key takeaways, overview, financials, news, risks, and verdict. Use headings, bullet points, and clean structures."
}
Return only raw JSON.`;

  const humanMessage = `Company: ${companyName}
Research Data: ${JSON.stringify(researchData)}
Financial Data: ${JSON.stringify(financialData)}
News Data: ${JSON.stringify(newsData)}
Risk Data: ${JSON.stringify(riskData)}`;

  if (onLog) onLog({ agent: "InvestmentDecisionAgent", status: "analyzing", message: "Calculating final investment score & compiling markdown summary report..." });

  const response = await invokeModel(state, systemPrompt, humanMessage, config, "InvestmentDecisionAgent");

  const decisionData = parseJsonFromResponse(response.content.toString());

  if (onLog) {
    onLog({
      agent: "InvestmentDecisionAgent",
      status: "completed",
      message: `VERDICT: ${decisionData.recommendation} (Score: ${decisionData.investmentScore}/100)`
    });
  }

  return { decisionData };
}

// --- CONSTRUCT THE LANGGRAPH WORKFLOW ---

const workflow = new StateGraph(GraphState)
  .addNode("research", researchAgentNode)
  .addNode("financials", financialAnalystNode)
  .addNode("news", newsAnalystNode)
  .addNode("risk", riskAgentNode)
  .addNode("decision", investmentDecisionNode)
  // Edges
  .addEdge("__start__", "research")
  .addEdge("research", "financials")
  .addEdge("financials", "news")
  .addEdge("news", "risk")
  .addEdge("risk", "decision")
  .addEdge("decision", "__end__");

export const graph = workflow.compile();
