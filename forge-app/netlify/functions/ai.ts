import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

// API keys stored server-side - set in Netlify dashboard
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY || "";
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || "";

interface AIPRequest {
  provider: "groq" | "deepseek" | "gemini";
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Exhausted retries");
}

const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const body: AIPRequest = JSON.parse(event.body || "{}");
    const { provider, model, system, user, maxTokens = 7000 } = body;

    let url: string;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (provider === "gemini") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    } else if (provider === "deepseek") {
      url = "https://api.deepseek.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${DEEPSEEK_API_KEY}`;
    } else {
      url = "https://api.groq.com/openai/v1/chat/completions";
      headers["Authorization"] = `Bearer ${GROQ_API_KEY}`;
    }

    const reqBody = provider === "gemini"
      ? { contents: [{ parts: [{ text: system + "\n\n" + user }] }], generationConfig: { maxOutputTokens: maxTokens } }
      : { model, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] };

    const res = await fetchWithRetry(url, { method: "POST", headers, body: JSON.stringify(reqBody) });
    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: `${provider} ${res.status}: ${err}` }) };
    }

    const data = await res.json();

    let content = "";
    if (provider === "gemini") {
      content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      content = data?.choices?.[0]?.message?.content || "";
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };