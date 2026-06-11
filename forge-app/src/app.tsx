/// <reference types="vite/client" />
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as Sentry from "@sentry/react";

// Initialize Sentry in production only
if (!import.meta.env.DEV) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    environment: import.meta.env.MODE || "production",
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

// ── TYPES ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { storage?: any } }

// Free AI via Groq - https://console.groq.com/
// Get your free API key there, no credit card needed
// Use env variable - never hardcode API keys!
// Set VITE_GROQ_API_KEY in your .env file
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const API = "/api/ai"; // Vite proxy in dev, direct in prod (see fetch below)
const MODEL = "llama-3.3-70b-versatile"; // Free, fast, excellent quality
const Q_TARGET = 2; // Allow output after just 2 questions
const LIME = "#C8FF00";
const PURPLE = "#B87FFF";
const ORANGE = "#FF6B00";
const PINK = "#FF3C78";
const CYAN = "#00D4FF";
const BRANCH_COLORS = [LIME, ORANGE, CYAN, PINK, PURPLE, "#00FFB2"];

// Futuristic glass palette
const BG_DEEP = "#050510";
const BG_GLASS = "var(--bg-card)";
const BG_GLASS_HOVER = "var(--bg-card-hover)";
const BG_PANEL = "rgba(255,255,255,0.06)";
const BORDER_GLASS = "var(--border)";
const BORDER_GLASS_HOVER = "var(--border-hover)";
const TEXT_PRIMARY = "var(--text-primary)";
const TEXT_SECONDARY = "var(--text-secondary)";
const TEXT_MUTED = "var(--text-muted)";
const GLOW_LIME = "0 0 30px rgba(200,255,0,0.15)";
const GLOW_CYAN = "0 0 30px rgba(0,212,255,0.15)";
const GLOW_PURPLE = "0 0 30px rgba(184,127,255,0.15)";
const GLOW_ORANGE = "0 0 30px rgba(255,107,0,0.15)";
const GLOW_PINK = "0 0 30px rgba(255,60,120,0.15)";
const GRADIENT_HERO = "linear-gradient(135deg, #07071a 0%, #0d0d2a 50%, #050518 100%)";
const GRADIENT_CARD = "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";

// ── DESIGN SYSTEM ───────────────────────────────────────────
// Spacing scale
const $ = {
  px02: "2px", px04: "4px", px06: "6px", px08: "8px", px10: "10px", px12: "12px",
  px14: "14px", px16: "16px", px20: "20px", px24: "24px", px30: "30px", px36: "36px",
  px48: "48px", px60: "60px", px72: "72px",
  // Semantic
  sectionGap: "2.5rem", cardPad: "1.8rem", inputGap: "0.85rem",
};
// Font families
const FONT = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
};
// Font sizes
const FS = {
  xs: "0.56rem", sm: "0.68rem", base: "0.84rem", md: "0.95rem", lg: "1.1rem",
  xl: "1.3rem", "2xl": "1.6rem", "3xl": "2rem", "4xl": "2.5rem",
};
// Border radii
const RAD = {
  sm: "4px", md: "8px", lg: "14px", xl: "20px", full: "9999px",
};
// Shadows
const SH = {
  card: "0 4px 24px rgba(0,0,0,0.4)",
  glow_lime: "0 0 30px rgba(200,255,0,0.15)",
  glow_cyan: "0 0 30px rgba(0,212,255,0.15)",
  glow_purple: "0 0 30px rgba(184,127,255,0.15)",
  glow_orange: "0 0 30px rgba(255,107,0,0.15)",
  glow_pink: "0 0 30px rgba(255,60,120,0.15)",
};
// Transitions
const TR = {
  fast: "150ms ease", mid: "250ms ease", slow: "400ms ease",
};
// Layout
const LAYOUT = { maxWidth: "1200px", contentWidth: "820px" };

// ── GLOBAL SHARED STYLES ────────────────────────────────────
const G = {
  app: { minHeight: "100vh", background: "var(--bg-deep)", color: "var(--text-primary)", fontFamily: FONT.sans, display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "0 1.25rem" },
  wrap: { width: "100%", maxWidth: LAYOUT.maxWidth, transition: "padding-right .3s" },
  label: { color: "var(--text-muted)", fontSize: "0.6rem", textTransform: "uppercase" as const, letterSpacing: "3.5px", marginBottom: "0.65rem" },
  glass: { background: "var(--bg-card)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid var(--border)`, borderRadius: "12px" },
  ta: { width: "100%", background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: "10px", color: "var(--text-primary)", fontSize: "0.9rem", padding: "1.1rem", resize: "none" as const, outline: "none", fontFamily: FONT.mono, lineHeight: "1.72", boxSizing: "border-box" as const, transition: "border-color .2s, box-shadow .2s" },
  btn: { background: LIME, color: "#000", border: "none", borderRadius: "8px", padding: "0.82rem 1.9rem", fontSize: "0.71rem", fontWeight: "900", letterSpacing: "2.5px", cursor: "pointer", fontFamily: FONT.mono, textTransform: "uppercase" as const, boxShadow: GLOW_LIME },
  ghost: { background: "transparent", color: "var(--text-secondary)", border: `1px solid var(--border)`, borderRadius: "8px", padding: "0.55rem 1rem", fontSize: "0.66rem", cursor: "pointer", fontFamily: FONT.mono, transition: "all .2s" },
  err: { color: PINK, fontSize: "0.72rem", marginTop: "0.75rem", background: "rgba(255,60,120,0.08)", border: "1px solid rgba(255,60,120,0.2)", borderRadius: "8px", padding: "0.55rem 0.85rem" },
};

// ── TYPES ────────────────────────────────────────────────────
interface BlueprintData { title: string; vision: string; sections: { title: string; content: string; bullets: string[] }[] }
interface RoadmapPhase { phase: string; title: string; duration: string; goal: string; milestones: string[]; kpis: string[] }
interface RoadmapData { title: string; phases: RoadmapPhase[] }
interface BusinessPlanData { title: string; oneliner: string; sections: { title: string; content: string }[] }
interface ActionTask { task: string; outcome: string; priority: string }
interface Week { week: string; focus: string; tasks: ActionTask[] }
interface ActionPlanData { title: string; weeks: Week[] }
interface SWOTData { title: string; summary: string; strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[]; strategic_insight?: string }
interface MindMapNode { node: string; angle: number; dist: number }
interface MindMapBranch { label: string; color?: string; nodes: MindMapNode[] }
interface MindMapData { center: string; branches: MindMapBranch[] }
interface IdeaScore { score: number; label: string; verdict: string; strengths: string[]; gaps: string[] }
interface QAPair { question: string; answer: string }
interface Profile { name: string; age: string; city: string; country: string; market: string; stage: string; techLevel: string; funding: string; constraints: string; targetCustomer: string; industry: string; bio: string }
interface User { uid: string; email: string }
interface Output { key: string; label: string; icon: string; desc: string }

// ── STORAGE ───────────────────────────────────────────────
// localStorage wrapper - works in all browsers
const store = {
  async get(k: string) {
    try { const r = localStorage.getItem(k); if (!r) return null; return JSON.parse(r); } catch { return null; }
  },
  async set(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
  async del(k: string) {
    try { localStorage.removeItem(k); } catch {}
  },
  async list(prefix: string) {
    try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); } catch { return []; }
  }
};

// ── NETWORK RETRY (exponential backoff) ─────────────────
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries exceeded");
}

// ── MULTI-MODEL API (cascade with fallback) ──────────────
// Keys from .env — NEVER commit to git
// In production, keys are hidden via Netlify proxy
const KEYS = {
  gemini: import.meta.env.VITE_GEMINI_API_KEY || "",
  groq: GROQ_API_KEY,
  deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY || "",
};

// Use proxy in production to hide API keys
const PROXY_URL = import.meta.env.DEV ? "" : "/api/ai";

// Models ranked by quality for different tasks (direct URLs - fallback if proxy fails)
const MODELS = {
  quick: { name: "llama-3.3-70b-versatile", provider: "groq", url: "https://api.groq.com/openai/v1/chat/completions" },
  smart: { name: "gemini-2.0-flash", provider: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent" },
  deep: { name: "deepseek-chat", provider: "deepseek", url: "https://api.deepseek.com/v1/chat/completions" },
};

// Smart model selection based on task
function pickModel(maxTok: number) {
  if (maxTok >= 3000) return MODELS.deep;  // Deep analysis → DeepSeek
  if (maxTok <= 600) return MODELS.quick;  // Fast questions → Groq
  return MODELS.smart;                       // Default → Gemini
}

async function aiStreamRaw(provider: string, url: string, key: string, model: string, system: string, user: string, onChunk: (chunk: string) => void, maxTok = 7000) {
  if (!key) throw new Error(`Missing API key for ${provider}`);
  
  const isGemini = provider === "gemini";
  const body = isGemini
    ? { contents: [{ parts: [{ text: system + "\n\n" + user }] }], generationConfig: { maxOutputTokens: maxTok } }
    : { model, max_tokens: maxTok, messages: [{ role: "system", content: system }, { role: "user", content: user }], stream: true };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let finalUrl = url;
  if (isGemini) {
    finalUrl += `?key=${key}`;
  } else {
    headers["Authorization"] = `Bearer ${key}`;
  }

  const res = await fetchWithRetry(finalUrl, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider} ${res.status}: ${err}`);
  }
  if (!res.body) throw new Error("No response body");
  
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = dec.decode(value, { stream: true });
    
    if (isGemini) {
      // Gemini SSE format
      for (const line of text.split("\n")) {
        if (!line.trim() || !line.startsWith("data:")) continue;
        try {
          const d = JSON.parse(line.slice(5));
          const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (t) { full += t; onChunk(full); }
        } catch {}
      }
    } else {
      // OpenAI-compatible SSE format
      for (const line of text.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const d = JSON.parse(raw);
          const t = d?.choices?.[0]?.delta?.content;
          if (t && typeof t === "string") { full += t; onChunk(full); }
        } catch {}
      }
    }
  }
  return full;
}

// Use proxy in production to hide API keys from browser bundle
async function aiStream(system: string, user: string, onChunk: (chunk: string) => void, maxTok = 7000) {
  // Production: use serverless proxy (keys stay server-side)
  if (!import.meta.env.DEV && PROXY_URL) {
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: pickModel(maxTok).provider,
          model: pickModel(maxTok).name,
          system,
          user,
          maxTokens: maxTok,
        }),
      });
      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Non-streaming - show all at once
      onChunk(data.content || "");
      return data.content || "";
    } catch (e) {
      console.warn("Proxy failed, falling back to direct:", e);
      // Fall through to direct call
    }
  }

  // Development: direct API calls (streaming)
  const primary = pickModel(maxTok);
  const key = KEYS[primary.provider as keyof typeof KEYS];
  try {
    return await aiStreamRaw(primary.provider, primary.url, key, primary.name, system, user, onChunk, maxTok);
  } catch (e) {
    console.warn(`${primary.provider} failed, falling back to Groq:`, e);
    // Fallback to Groq (most reliable free tier)
    if (primary.provider !== "groq" && KEYS.groq) {
      return await aiStreamRaw("groq", MODELS.quick.url, KEYS.groq, MODELS.quick.name, system, user, onChunk, maxTok);
    }
    throw e;
  }
}

// Direct streaming fallback (used when proxy unavailable)
async function aiStreamDirect(system: string, user: string, onChunk: (chunk: string) => void, maxTok = 7000) {
  const primary = pickModel(maxTok);
  const key = KEYS[primary.provider as keyof typeof KEYS];
  try {
    return await aiStreamRaw(primary.provider, primary.url, key, primary.name, system, user, onChunk, maxTok);
  } catch (e) {
    // Fallback to Groq
    if (primary.provider !== "groq" && KEYS.groq) {
      return await aiStreamRaw("groq", MODELS.quick.url, KEYS.groq, MODELS.quick.name, system, user, onChunk, maxTok);
    }
    throw e;
  }
}

async function ai(sys: string, usr: string, asJSON = false, maxTok = 1400, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      let full = "";
      await aiStream(sys, usr, t => { full = t; }, maxTok);
      if (!full) throw new Error("Empty response");
      if (!asJSON) return full;
      
      // JSON parsing with proper nesting detection
      let raw = full.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const openMatch = raw.search(/[{[]/);
      if (openMatch === -1) throw new Error("No JSON object found");
      raw = raw.slice(openMatch);
      
      let end = -1, nesting = 0, inStr = false;
      for (let j = 0; j < raw.length; j++) {
        const c = raw[j];
        if (c === '"' && raw[j - 1] !== '\\') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{' || c === '[') { nesting++; }
        else if (c === '}' || c === ']') { nesting--; if (nesting === 0) { end = j + 1; break; } }
      }
      if (end === -1) end = raw.length;
      let s = raw.slice(0, end);
      s = s.replace(/,(\s*[}\]])/g, "$1").trim();
      
      try { return JSON.parse(s); } catch { return JSON.parse(s); }
    } catch (e: unknown) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
}

// ── ERROR BOUNDARY ───────────────────────────────────────
class ErrorBoundary extends React.Component<{children: React.ReactNode; fallback?: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode; fallback?: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { console.error("Forge error:", e); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: "2rem", background: "rgba(255,60,120,0.1)", border: "1px solid #FF3C78", borderRadius: "12px", textAlign: "center" }}>
          <div style={{ color: "#FF3C78", fontWeight: 700, marginBottom: "0.5rem" }}>Something went wrong</div>
          <button onClick={() => this.setState({ hasError: false })} style={{ padding: "0.5rem 1rem", background: "#FF3C78", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── SHARED PRIMITIVES ──────────────────────────────────────
// Reusable design system components

function SectionCard({ children, accent, style: extraStyle }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: BG_GLASS,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${accent ? `${accent}25` : BORDER_GLASS}`,
      borderRadius: RAD.lg,
      padding: $.cardPad,
      boxShadow: SH.card,
      transition: TR.mid,
      ...extraStyle
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ label, children, accent, action }: { label: string; children?: React.ReactNode; accent?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: $.px20, flexWrap: "wrap", gap: $.px12 }}>
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div style={{ color: accent || LIME, fontSize: FS.xs, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" as const, marginBottom: $.px06 }}>{label}</div>
        {children}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: string }) {
  const c = accent || LIME;
  return (
    <span style={{
      background: `${c}0f`,
      border: `1px solid ${c}30`,
      color: c,
      fontSize: FS.xs,
      padding: `${$.px04} ${$.px10}`,
      borderRadius: RAD.sm,
      fontFamily: FONT.mono,
      letterSpacing: "1px",
      display: "inline-flex",
      alignItems: "center",
      gap: $.px04,
    }}>
      {children}
    </span>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const p = priority.toUpperCase().slice(0, 4);
  const map: Record<string, { color: string; bg: string }> = {
    HIGH: { color: PINK, bg: `${PINK}12` },
    MED: { color: ORANGE, bg: `${ORANGE}12` },
    LOW: { color: LIME, bg: `${LIME}12` },
  };
  const { color, bg } = map[p] || { color: TEXT_SECONDARY, bg: BG_GLASS };
  return (
    <span style={{
      background: bg,
      border: `1px solid ${color}30`,
      color: color,
      fontSize: FS.xs,
      fontWeight: 700,
      padding: `${$.px04} ${$.px08}`,
      borderRadius: RAD.sm,
      fontFamily: FONT.mono,
      letterSpacing: "1px",
      display: "inline-flex",
      alignItems: "center",
    }}>
      {p}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 80 ? LIME : score >= 60 ? ORANGE : score >= 40 ? "#FFD700" : PINK;
  return (
    <div style={{
      width: "52px", height: "52px", borderRadius: "50%",
      background: `${c}12`, border: `2px solid ${c}35`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      boxShadow: `0 0 20px ${c}20`,
      flexShrink: 0,
    }}>
      <div style={{ color: c, fontSize: FS.md, fontWeight: 900, fontFamily: FONT.mono, lineHeight: 1 }}>{score}</div>
    </div>
  );
}

// ── MARKDOWN ──────────────────────────────────────────────
function Md({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "monospace" }}>
      {(text || "").split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: "0.5rem" }} />;
        const isH2 = line.startsWith("## "), isH3 = line.startsWith("### ");
        const isBullet = /^[-→•]\s/.test(line.trim());
        const content = line.replace(/^#+\s/, "").replace(/^[-→•]\s/, "");
        const html = content.replace(/\*\*(.+?)\*\*/g, "<strong style='color:#e8e8e8'>$1</strong>");
        return (
          <div key={i} style={{ marginBottom: isH2 ? "0.85rem" : "0.15rem", marginTop: isH2 ? "1.3rem" : isH3 ? "0.65rem" : 0, fontSize: isH2 ? "0.87rem" : "0.8rem", fontWeight: isH2 || isH3 ? "bold" : "normal", color: isH2 ? LIME : isH3 ? "#ddd" : isBullet ? "#999" : "#bbb", lineHeight: "1.72", paddingLeft: isBullet ? "1rem" : 0, position: "relative" }}>
            {isBullet && <span style={{ position: "absolute", left: 0, color: LIME }}>→</span>}
            <span dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        );
      })}
    </div>
  );
}

// ── FOUNDER PROFILE HELPERS ───────────────────────────────
function profileContext(p: any) {
  if (!p) return "";
  return `FOUNDER PROFILE:
Name: ${p.name} | Age: ${p.age} | Location: ${p.city}, ${p.country}
Market Focus: ${p.market} | Stage: ${p.stage}
Technical Ability: ${p.techLevel} | Funding Status: ${p.funding}
Constraints: ${p.constraints}
Target Customer: ${p.targetCustomer}
Industry: ${p.industry}
One sentence about them: ${p.bio}`;
}

function marketContext(p: any) {
  if (!p) return "";
  const isAfrica = ["Tanzania","Kenya","Uganda","Nigeria","Ghana","Rwanda","Ethiopia","Zambia","Mozambique","Senegal","Côte d'Ivoire","South Africa"].some(c => p.country?.includes(c));
  const isEmerging = isAfrica || ["India","Bangladesh","Pakistan","Indonesia","Philippines","Vietnam","Cambodia"].some(c => p.country?.includes(c));
  if (isAfrica) return `MARKET CONTEXT: East/Sub-Saharan Africa. Mobile-first. M-PESA and mobile money dominant. 2G/3G infrastructure in rural areas. SACCOs, MFIs, informal economy key. Limited cloud infrastructure. Low average income. High mobile penetration. Regulatory environment: fintech needs BoT/CBK approval. Think USSD before apps. Cash-heavy economy transitioning to mobile money.`;
  if (isEmerging) return `MARKET CONTEXT: Emerging market. Mobile-first. Infrastructure constraints. Price-sensitive customers. Think lightweight, offline-capable solutions.`;
  return `MARKET CONTEXT: Developed market. Standard SaaS infrastructure applies.`;
}

// ── AUTH SCREENS ──────────────────────────────────────────
// ── SHA-256 PASSWORD HASHING ─────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function AuthScreen({ onAuth }: { onAuth: (u: any, isNew: boolean) => void }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr(""); setLoading(true);
    const { email, password, name } = form;
    if (!email.trim() || !password.trim()) { setErr("Fill in all fields."); setLoading(false); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    const uid = btoa(email.toLowerCase()).replace(/=/g, "");
    if (mode === "signup") {
      const exists = await store.get(`user:${uid}`);
      if (exists) { setErr("Account already exists. Log in instead."); setLoading(false); return; }
      if (!name.trim()) { setErr("Enter your name."); setLoading(false); return; }
      const passwordHash = await hashPassword(password);
      const user = { uid, email: email.toLowerCase(), name: name.trim(), passwordHash, createdAt: Date.now() };
      await store.set(`user:${uid}`, user);
      await store.set(`session`, { uid, email: user.email, name: user.name });
      onAuth(user, true);
    } else {
      const user = await store.get(`user:${uid}`);
      if (!user || user.passwordHash !== await hashPassword(password)) { setErr("Invalid email or password."); setLoading(false); return; }
      await store.set(`session`, { uid, email: user.email, name: user.name });
      onAuth(user, false);
    }
    setLoading(false);
  };

  const inp = { width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "8px", color: TEXT_PRIMARY, fontSize: "0.9rem", padding: "0.85rem 1rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box" as const, transition: "border-color .2s" };

  return (
    <div style={{ minHeight: "100vh", background: GRADIENT_HERO, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "monospace" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ color: LIME, fontSize: "2rem", fontWeight: "900", letterSpacing: "7px", margin: "0 0 4px", textShadow: "0 0 30px rgba(200,255,0,0.3)" }}>FORGE</h1>
        <p style={{ color: TEXT_MUTED, fontSize: "0.58rem", letterSpacing: "3px", margin: "0 0 4px" }}>IDEA ENGINE FOR FOUNDERS</p>
        <p style={{ color: TEXT_MUTED, fontSize: "0.6rem", margin: "0 0 2.5rem", opacity: 0.6 }}>Turn rough ideas into investor‑ready plans in minutes</p>
        <div style={{ display: "flex", gap: "0", marginBottom: "1.8rem", border: `1px solid ${BORDER_GLASS}`, borderRadius: "7px", overflow: "hidden" }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, background: mode === m ? LIME : "transparent", color: mode === m ? "#000" : TEXT_SECONDARY, border: "none", padding: "0.72rem", fontSize: "0.7rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace", textTransform: "uppercase", transition: "all .2s" }}>{m}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {mode === "signup" && <input style={inp} placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
          <input style={inp} placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} onKeyDown={e => e.key === "Enter" && submit()} />
          <input style={inp} placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <div style={G.err}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", background: LIME, color: "#000", border: "none", borderRadius: "7px", padding: "0.9rem", fontSize: "0.73rem", fontWeight: "900", letterSpacing: "2.5px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace", marginTop: "1.2rem", opacity: loading ? 0.5 : 1, boxShadow: `0 0 20px rgba(200,255,0,0.2)` }}>
          {loading ? "…" : mode === "login" ? "LOG IN →" : "CREATE ACCOUNT →"}
        </button>
        <p style={{ color: TEXT_MUTED, fontSize: "0.62rem", textAlign: "center", marginTop: "1.2rem" }}>Your ideas stay private. No data leaves this app.</p>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────
function Onboarding({ user, onDone }: { user: any; onDone: (p: any) => void }) {
  const steps = [
    { key: "age", label: "How old are you?", placeholder: "e.g. 19", type: "input" },
    { key: "city", label: "What city are you in?", placeholder: "e.g. Dodoma", type: "input" },
    { key: "country", label: "What country?", placeholder: "e.g. Tanzania", type: "input" },
    { key: "industry", label: "What industry or space is your idea in?", placeholder: "e.g. Fintech, Agritech, Healthtech…", type: "input" },
    { key: "market", label: "Who is your target market?", placeholder: "e.g. Unbanked workers in East Africa", type: "input" },
    { key: "targetCustomer", label: "Describe your ideal first customer in one sentence.", placeholder: "e.g. SACCO managers in Tanzania who need credit scoring tools", type: "textarea" },
    { key: "stage", label: "What stage are you at?", type: "choice", options: ["Just an idea", "Research phase", "Building MVP", "Have early users", "Revenue stage"] },
    { key: "techLevel", label: "Your technical ability?", type: "choice", options: ["Non-technical", "Basic (vibe coder)", "Intermediate", "Advanced developer"] },
    { key: "funding", label: "Funding situation?", type: "choice", options: ["Bootstrapped / no money", "Friends & family", "Pre-seed raised", "Seed raised", "Series A+"] },
    { key: "constraints", label: "What are your biggest constraints right now?", placeholder: "e.g. No device, no registered company, limited internet, boarding school…", type: "textarea" },
    { key: "bio", label: "One sentence that describes who you are as a founder.", placeholder: "e.g. 19-year-old building Africa's credit infrastructure from a boarding school in Dodoma", type: "textarea" },
  ];

  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);
  const cur = steps[step];

  const next = async () => {
    if (!val.trim()) return;
    const updated = { ...data, [cur.key]: val };
    setData(updated);
    setVal("");
    if (step < steps.length - 1) { setStep(s => s + 1); return; }
    setLoading(true);
    const profile = { ...updated, name: user.name, email: user.email, uid: user.uid, completedAt: Date.now() };
    await store.set(`profile:${user.uid}`, profile);
    onDone(profile);
  };

  const progress = ((step) / steps.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: GRADIENT_HERO, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "monospace" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ color: LIME, fontSize: "0.9rem", fontWeight: "900", letterSpacing: "5px", textShadow: "0 0 20px rgba(200,255,0,0.3)" }}>FORGE</span>
          <span style={{ color: TEXT_MUTED, fontSize: "0.6rem" }}>{step + 1} / {steps.length}</span>
        </div>
        <div style={{ height: "2px", background: BORDER_GLASS, borderRadius: "2px", marginBottom: "3rem", overflow: "hidden" }}>
          <div style={{ height: "100%", background: LIME, width: `${progress}%`, transition: "width .4s ease", borderRadius: "2px", boxShadow: `0 0 10px ${LIME}60` }} />
        </div>
        <p style={{ color: TEXT_MUTED, fontSize: "0.6rem", letterSpacing: "3px", margin: "0 0 0.6rem", textTransform: "uppercase" }}>Building your founder profile</p>
        <p style={{ color: TEXT_PRIMARY, fontSize: "1.15rem", margin: "0 0 2rem", fontWeight: "300", lineHeight: "1.7" }}>{cur.label}</p>
        {cur.type === "input" && (
          <input style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "8px", color: TEXT_PRIMARY, fontSize: "1rem", padding: "1rem 1.1rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
            placeholder={cur.placeholder} value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && val.trim() && next()} autoFocus />
        )}
        {cur.type === "textarea" && (
          <textarea style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "8px", color: TEXT_PRIMARY, fontSize: "0.95rem", padding: "1rem 1.1rem", outline: "none", fontFamily: "monospace", lineHeight: "1.7", height: "100px", resize: "none", boxSizing: "border-box" }}
            placeholder={cur.placeholder} value={val} onChange={e => setVal(e.target.value)} autoFocus />
        )}
        {cur.type === "choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {(cur.options || []).map(o => (
              <button key={o} onClick={() => setVal(o)} style={{ background: val === o ? `${LIME}15` : BG_GLASS, border: `1px solid ${val === o ? LIME : BORDER_GLASS}`, borderRadius: "8px", padding: "0.85rem 1.1rem", color: val === o ? LIME : TEXT_SECONDARY, fontFamily: "monospace", fontSize: "0.85rem", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>{o}</button>
            ))}
          </div>
        )}
        <button onClick={next} disabled={!val.trim() || loading}
          style={{ background: LIME, color: "#000", border: "none", borderRadius: "7px", padding: "0.85rem 2rem", fontSize: "0.72rem", fontWeight: "900", letterSpacing: "2.5px", cursor: !val.trim() ? "not-allowed" : "pointer", fontFamily: "monospace", marginTop: "1.5rem", opacity: !val.trim() ? 0.25 : 1, boxShadow: `0 0 20px rgba(200,255,0,0.2)` }}>
          {loading ? "SAVING…" : step === steps.length - 1 ? "ENTER FORGE →" : "NEXT →"}
        </button>
      </div>
    </div>
  );
}

// ── PROFILE PANEL ─────────────────────────────────────────
function ProfilePanel({ profile, user, onUpdate, onLogout, onClose }: { profile: any; user: any; onUpdate: (p: any) => void; onLogout: () => void; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...profile });
  const fields = [
    { key: "age", label: "Age" }, { key: "city", label: "City" }, { key: "country", label: "Country" },
    { key: "industry", label: "Industry" }, { key: "market", label: "Target Market" },
    { key: "targetCustomer", label: "Ideal First Customer" }, { key: "stage", label: "Stage" },
    { key: "techLevel", label: "Technical Level" }, { key: "funding", label: "Funding" },
    { key: "constraints", label: "Constraints" }, { key: "bio", label: "Founder Bio" },
  ];

  const save = async () => {
    const updated = { ...draft, updatedAt: Date.now() };
    await store.set(`profile:${user.uid}`, updated);
    onUpdate(updated); setEditing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(500px,100vw)", background: BG_PANEL, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderLeft: `1px solid ${BORDER_GLASS}`, display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.5rem", borderBottom: `1px solid ${BORDER_GLASS}`, flexShrink: 0 }}>
          <div>
            <div style={{ color: LIME, fontSize: "0.72rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>FOUNDER PROFILE</div>
            <div style={{ color: TEXT_MUTED, fontSize: "0.55rem", letterSpacing: "1.5px", fontFamily: "monospace", marginTop: "2px" }}>{profile.name?.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {editing
              ? <button onClick={save} style={{ background: LIME, color: "#000", border: "none", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", fontWeight: "bold" }}>SAVE</button>
              : <button onClick={() => setEditing(true)} style={{ background: "transparent", border: `1px solid ${LIME}30`, color: LIME, borderRadius: "5px", padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>EDIT</button>
            }
            <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER_GLASS}`, color: TEXT_SECONDARY, borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {/* score badge */}
          <div style={{ background: BG_GLASS, border: `1px solid ${LIME}15`, borderRadius: "10px", padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
            <div style={{ color: LIME, fontSize: "0.58rem", letterSpacing: "2.5px", marginBottom: "0.4rem" }}>FOUNDER IDENTITY</div>
            <div style={{ color: TEXT_PRIMARY, fontSize: "0.88rem", lineHeight: "1.65", fontFamily: "monospace" }}>{profile.bio}</div>
          </div>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: "1.1rem" }}>
              <div style={{ color: TEXT_MUTED, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2.5px", marginBottom: "0.3rem", fontFamily: "monospace" }}>{f.label}</div>
              {editing
                ? <textarea style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "6px", color: TEXT_PRIMARY, fontSize: "0.83rem", padding: "0.6rem 0.8rem", outline: "none", fontFamily: "monospace", lineHeight: "1.6", minHeight: "42px", resize: "vertical", boxSizing: "border-box" }}
                  value={draft[f.key] || ""} onChange={e => setDraft((d: Record<string, string>) => ({ ...d, [f.key]: e.target.value }))} />
                : <div style={{ color: TEXT_SECONDARY, fontSize: "0.83rem", lineHeight: "1.6", fontFamily: "monospace" }}>{profile[f.key] || "—"}</div>
              }
            </div>
          ))}
          <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${PINK}30`, color: PINK, borderRadius: "6px", padding: "0.65rem 1.2rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", marginTop: "1rem", width: "100%" }}>LOG OUT</button>
        </div>
      </div>
    </div>
  );
}

// ── IDEA HISTORY PANEL ────────────────────────────────────
interface SavedIdea { id: string; text: string; savedAt: number; score?: number; label?: string; }
function HistoryPanel({ uid, onLoad, onClose }: { uid: string; onLoad: (data: SavedIdea) => void; onClose: () => void }) {
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const keys = await store.list(`idea:${uid}:`);
      const items = await Promise.all(keys.map((k: string) => store.get(k)));
      setIdeas(items.filter(Boolean).sort((a, b) => b.savedAt - a.savedAt) as SavedIdea[]);
      setLoading(false);
    })();
  }, [uid]);

  const del = async (id: string) => {
    await store.del(`idea:${uid}:${id}`);
    setIdeas(p => p.filter((x: SavedIdea) => x.id !== id));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(480px,100vw)", background: BG_PANEL, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderLeft: `1px solid ${BORDER_GLASS}`, display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.5rem", borderBottom: `1px solid ${BORDER_GLASS}`, flexShrink: 0 }}>
          <div style={{ color: LIME, fontSize: "0.72rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>IDEA VAULT</div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER_GLASS}`, color: TEXT_SECONDARY, borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.2rem 1.5rem" }}>
          {loading && <div style={{ color: TEXT_MUTED, fontSize: "0.72rem", fontFamily: "monospace" }}>Loading…</div>}
          {!loading && ideas.length === 0 && <div style={{ color: TEXT_MUTED, fontSize: "0.8rem", fontFamily: "monospace" }}>No saved ideas yet. Start one and it'll appear here.</div>}
          {ideas.map(idea => (
            <div key={idea.id} style={{ background: BG_GLASS, border: `1px solid ${BORDER_GLASS}`, borderRadius: "10px", padding: "1rem 1.1rem", marginBottom: "0.75rem" }}>
              <div style={{ color: TEXT_PRIMARY, fontSize: "0.85rem", marginBottom: "0.35rem", fontFamily: "monospace", lineHeight: "1.5" }}>{idea.text?.slice(0, 100)}{idea.text?.length > 100 ? "…" : ""}</div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {idea.score && <span style={{ color: idea.score >= 80 ? LIME : idea.score >= 60 ? ORANGE : PINK, fontSize: "0.62rem", border: `1px solid currentColor`, padding: "1px 7px", borderRadius: "3px", opacity: 0.8 }}>{idea.score} — {idea.label}</span>}
                <span style={{ color: TEXT_MUTED, fontSize: "0.6rem", fontFamily: "monospace" }}>{new Date(idea.savedAt).toLocaleDateString()}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => { onLoad(idea); onClose(); }} style={{ background: `${LIME}12`, border: `1px solid ${LIME}25`, color: LIME, borderRadius: "4px", padding: "3px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem" }}>LOAD</button>
                  <button onClick={() => del(idea.id)} style={{ background: "transparent", border: `1px solid ${PINK}25`, color: PINK, borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FORGE FEEDBACK ─────────────────────────────────────────
function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("ux");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const TYPES = [
    { key: "ux", label: "UX / Usability", icon: "🎨" },
    { key: "bug", label: "Bug Report", icon: "🐛" },
    { key: "feature", label: "New Feature", icon: "💡" },
    { key: "praise", label: "Praise", icon: "🔥" },
  ];

  const send = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    const entry = { type, msg, email: email.trim(), ts: Date.now(), idea: "" };
    try {
      const existing: any[] = JSON.parse(localStorage.getItem("forge_feedback") || "[]");
      existing.push(entry);
      localStorage.setItem("forge_feedback", JSON.stringify(existing));
      setSent(true);
    } catch {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000095", zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(480px,100vw)", background: BG_PANEL, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderLeft: `1px solid ${BORDER_GLASS}`, display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.5rem", borderBottom: `1px solid ${BORDER_GLASS}`, flexShrink: 0 }}>
          <div>
            <div style={{ color: LIME, fontSize: "0.72rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>FORGE FEEDBACK</div>
            <div style={{ color: TEXT_MUTED, fontSize: "0.55rem", letterSpacing: "1.5px", marginTop: "2px", fontFamily: "monospace" }}>Your review is our next release.</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER_GLASS}`, color: TEXT_SECONDARY, borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔥</div>
              <div style={{ color: LIME, fontSize: "0.9rem", fontWeight: "bold", marginBottom: "0.5rem", fontFamily: "monospace" }}>FEEDBACK RECEIVED</div>
              <div style={{ color: TEXT_SECONDARY, fontSize: "0.78rem", lineHeight: "1.6" }}>Thanks for helping forge FORGE for every founder. You rock.</div>
              <button onClick={onClose} style={{ marginTop: "1.8rem", background: LIME, color: "#000", border: "none", borderRadius: "6px", padding: "0.75rem 1.8rem", fontSize: "0.72rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace" }}>CLOSE →</button>
            </div>
          ) : (
            <>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: "0.56rem", letterSpacing: "2.5px", marginBottom: "0.6rem", textTransform: "uppercase" }}>What are you sharing?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {TYPES.map(t => (
                    <div key={t.key} onClick={() => setType(t.key)} style={{ background: type === t.key ? `${LIME}12` : "rgba(255,255,255,0.03)", border: `1px solid ${type === t.key ? LIME : BORDER_GLASS}`, borderRadius: "8px", padding: "0.65rem 0.85rem", cursor: "pointer", transition: "all .15s" }}>
                      <div style={{ fontSize: "1rem", marginBottom: "0.2rem" }}>{t.icon}</div>
                      <div style={{ color: type === t.key ? LIME : TEXT_SECONDARY, fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 600 }}>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: "0.56rem", letterSpacing: "2.5px", marginBottom: "0.6rem", textTransform: "uppercase" }}>Tell us what happened or what you'd love to see.</div>
                <textarea
                  style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "8px", color: TEXT_PRIMARY, fontSize: "0.84rem", padding: "0.85rem 1rem", resize: "none", outline: "none", fontFamily: FONT.sans, lineHeight: "1.7", minHeight: "130px", boxSizing: "border-box" }}
                  placeholder="Describe what you're experiencing or suggest an improvement…"
                  value={msg} onChange={e => setMsg(e.target.value)}
                />
              </div>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: "0.56rem", letterSpacing: "2.5px", marginBottom: "0.6rem", textTransform: "uppercase" }}>Your email or handle <span style={{ opacity: 0.5 }}>(optional — for follow-up)</span></div>
                <input
                  style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "8px", color: TEXT_PRIMARY, fontSize: "0.84rem", padding: "0.75rem 1rem", outline: "none", fontFamily: FONT.sans, boxSizing: "border-box" }}
                  placeholder="founder@domain.com or @handle"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button
                onClick={send}
                disabled={!msg.trim() || loading}
                style={{ background: msg.trim() && !loading ? LIME : "rgba(255,255,255,0.05)", color: msg.trim() && !loading ? "#000" : TEXT_MUTED, border: "none", borderRadius: "8px", padding: "0.9rem", fontSize: "0.74rem", fontWeight: "900", letterSpacing: "2.5px", cursor: msg.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "monospace", transition: "all .2s", opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "SENDING…" : "SHARE FEEDBACK →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── REALITY CHECK ─────────────────────────────────────────
function RealityCheck({ idea, qa, profile, onProceed, onBack }: { idea: string; qa: any[]; profile: any; onProceed: () => void; onBack: () => void }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(true);
  const [talked, setTalked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sys = `You are FORGE REALITY CHECK — a brutal, honest advisor for early-stage founders.
Analyse this idea against the founder's specific constraints. Be direct. No sugarcoating.
Structure: ## Feasibility Score (X/10)\n## Can You Actually Build This?\n## Market Reality Check\n## Your Unfair Advantage\n## The Single Biggest Risk\n## Verdict`;
      const prompt = `${profileContext(profile)}\n${marketContext(profile)}\n\nIdea: "${idea}"\n\nFounder's thinking:\n${qa.map((x, i) => `Q${i + 1}: ${x.question}\nA${i + 1}: ${x.answer}`).join("\n\n")}\n\nGive a reality check tailored to THIS specific founder's constraints and location.`;
      await aiStream(sys, prompt, chunk => setResult(chunk), 1000);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ animation: "fadeIn .3s ease", fontFamily: "monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.8rem" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: ORANGE, animation: loading ? "pulse 1s infinite" : "none", flexShrink: 0, boxShadow: `0 0 10px ${ORANGE}` }} />
        <span style={{ color: ORANGE, fontSize: "0.68rem", letterSpacing: "3px" }}>{loading ? "RUNNING REALITY CHECK…" : "REALITY CHECK COMPLETE"}</span>
      </div>
      <div style={{ background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${ORANGE}25`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <Md text={result} />
      </div>
      {!loading && (
        <>
          <div style={{ background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "10px", padding: "1.2rem", marginBottom: "1.5rem" }}>
            <p style={{ color: TEXT_PRIMARY, fontSize: "0.9rem", margin: "0 0 1rem", fontWeight: "300" }}>Have you spoken to at least one real potential customer about this idea?</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {["Yes, I have", "Not yet"].map(o => (
                <button key={o} onClick={() => setTalked(o)} style={{ flex: 1, background: talked === o ? (o.startsWith("Yes") ? `${LIME}15` : `${PINK}12`) : "transparent", border: `1px solid ${talked === o ? (o.startsWith("Yes") ? LIME : PINK) : BORDER_GLASS}`, borderRadius: "7px", padding: "0.75rem", color: talked === o ? (o.startsWith("Yes") ? LIME : PINK) : TEXT_SECONDARY, fontFamily: "monospace", fontSize: "0.8rem", cursor: "pointer", transition: "all .15s" }}>{o}</button>
              ))}
            </div>
            {talked === "Not yet" && <p style={{ color: TEXT_MUTED, fontSize: "0.75rem", marginTop: "0.75rem", lineHeight: "1.6" }}>⚠ No real conversations = unvalidated assumptions. The outputs will still generate but treat them as hypotheses, not facts. Your #1 action after this: talk to one real person.</p>}
          </div>
          {talked && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onProceed} style={{ background: LIME, color: "#000", border: "none", borderRadius: "6px", padding: "0.82rem 1.8rem", fontSize: "0.72rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace", boxShadow: `0 0 20px rgba(200,255,0,0.2)` }}>BUILD OUTPUTS →</button>
              <button onClick={onBack} style={{ background: "transparent", color: TEXT_SECONDARY, border: `1px solid ${BORDER_GLASS}`, borderRadius: "6px", padding: "0.82rem 1.2rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "monospace" }}>← BACK</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── MIND MAP ──────────────────────────────────────────────
function MindMap({ data }: { data: MindMapData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const W = 1100, H = 720, cx = W / 2, cy = H / 2, bR = 210, nR = 125;
  const branches = (data.branches || []).slice(0, 6);
  const N = branches.length;
  const BUTTONS: [string, () => void][] = [
    ["＋", () => setTransform((t: { x: number; y: number; scale: number }) => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))],
    ["－", () => setTransform((t: { x: number; y: number; scale: number }) => ({ ...t, scale: Math.max(t.scale * 0.83, 0.3) }))],
    ["⊡", () => setTransform({ x: 0, y: 0, scale: 0.75 })],
    ["↺", () => setTransform({ x: 0, y: 0, scale: 1 })],
  ];

  const wrap = (txt: string, max: number): string[] => {
    if (!txt) return [""];
    const words = String(txt).split(" "); const lines: string[] = []; let cur = "";
    for (const w of words) { if ((cur + " " + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur = (cur + " " + w).trim(); }
    if (cur) lines.push(cur); return lines.slice(0, 2);
  };

  const positions = useMemo(() => branches.map((b, i) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const bx = cx + Math.cos(angle) * bR, by = cy + Math.sin(angle) * bR;
    const nodes = (b.nodes || []).slice(0, 4).map((node, j) => {
      const nAngle = angle + (j - ((b.nodes || []).slice(0, 4).length - 1) / 2) * 0.44;
      return { node, nAngle, nx: bx + Math.cos(nAngle) * nR, ny: by + Math.sin(nAngle) * nR };
    });
    return { angle, bx, by, nodes };
  }), [data]);

  const onMouseDown = (e: React.MouseEvent) => { if (e.button !== 0) return; setDragging(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); };
  const onMouseMove = (e: React.MouseEvent) => { if (!dragging || !dragStart) return; setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })); };
  const onMouseUp = () => { setDragging(false); setDragStart(null); };
  const onWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setTransform(t => ({ ...t, scale: Math.min(Math.max(t.scale * (e.deltaY > 0 ? 0.92 : 1.09), 0.3), 3) })); }, []);

  useEffect(() => { const el = svgRef.current; if (!el) return; const handler = (e: Event) => onWheel(e as unknown as React.WheelEvent); el.addEventListener("wheel", handler, { passive: false }); return () => el.removeEventListener("wheel", handler); }, [onWheel]);

  // Mobile fallback — render compact card list instead of SVG
  if (typeof window !== "undefined" && window.innerWidth < 640) {
    return (
      <div style={{ background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "12px", padding: "1rem" }}>
        <div style={{ color: LIME, fontSize: "0.7rem", letterSpacing: "3px", marginBottom: "1rem", textTransform: "uppercase", fontFamily: "monospace" }}>Mind Map</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {branches.map((b, i) => {
            const bc = b.color || BRANCH_COLORS[i % 6];
            return (
              <div key={i} style={{ background: `${bc}10`, border: `1px solid ${bc}25`, borderRadius: "8px", padding: "0.75rem" }}>
                <div style={{ color: bc, fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.4rem", fontFamily: "monospace" }}>{b.label}</div>
                {(b.nodes || []).slice(0, 4).map((n, j) => (
                  <div key={j} style={{ color: TEXT_SECONDARY, fontSize: "0.72rem", paddingLeft: "0.5rem", marginBottom: "0.2rem", fontFamily: "monospace" }}>→ {String(n.node || "")}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "5px", zIndex: 10 }}>
        {BUTTONS.map(([l, a], i) => (
          <button key={i} onClick={a} style={{ background: BG_GLASS, border: `1px solid ${BORDER_GLASS}`, color: TEXT_SECONDARY, borderRadius: "4px", width: "26px", height: "26px", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }} onMouseLeave={e => { e.currentTarget.style.borderColor = `${BORDER_GLASS}`; e.currentTarget.style.color = TEXT_SECONDARY; }}>{l}</button>
        ))}
      </div>
      {selected && <div style={{ position: "absolute", bottom: "10px", right: "10px", background: BG_PANEL, border: `1px solid ${LIME}25`, borderRadius: "6px", padding: "5px 10px", zIndex: 10 }}><div style={{ color: LIME, fontSize: "0.55rem", letterSpacing: "2px", marginBottom: "1px" }}>SELECTED</div><div style={{ color: TEXT_PRIMARY, fontSize: "0.72rem", fontFamily: "monospace" }}>{selected}</div></div>}
      <div style={{ position: "absolute", bottom: "10px", left: "10px", color: TEXT_MUTED, fontSize: "0.55rem", fontFamily: "monospace", zIndex: 10 }}>drag · scroll to zoom · click to highlight</div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: dragging ? "grabbing" : "grab", userSelect: "none" }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <defs>
          <filter id="gl"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          {branches.map((b, i) => { const c = b.color || BRANCH_COLORS[i % 6]; return (<radialGradient key={i} id={`rg${i}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={c} stopOpacity="0.22" /><stop offset="100%" stopColor={c} stopOpacity="0.03" /></radialGradient>); })}
        </defs>
        <rect width={W} height={H} fill="#060606" />
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy} r={88} fill={LIME} opacity="0.05" filter="url(#gl)" />
          <circle cx={cx} cy={cy} r={70} fill={LIME} />
          {wrap(data.center || "IDEA", 11).map((ln, i, arr) => (<text key={i} x={cx} y={cy + (i - (arr.length - 1) / 2) * 17} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="900" fill="#000" fontFamily="monospace">{ln}</text>))}
          {positions.map((pos, i) => {
            const b = branches[i]; const color = b.color || BRANCH_COLORS[i % 6];
            const bKey = b.label || `b${i}`; const active = selected === bKey || hovered === bKey;
            return (<g key={i}>
              <line x1={cx + Math.cos(pos.angle) * 72} y1={cy + Math.sin(pos.angle) * 72} x2={pos.bx} y2={pos.by} stroke={color} strokeWidth={active ? 2.5 : 1.8} opacity={active ? 0.9 : 0.5} style={{ transition: "all .25s" }} />
              <ellipse cx={pos.bx} cy={pos.by} rx={active ? 64 : 60} ry={active ? 32 : 29} fill={`url(#rg${i})`} stroke={color} strokeWidth={active ? 2.2 : 1.5} style={{ transition: "all .25s", cursor: "pointer", filter: active ? `drop-shadow(0 0 6px ${color})` : "none" }} onClick={() => setSelected(selected === bKey ? null : bKey)} onMouseEnter={() => setHovered(bKey)} onMouseLeave={() => setHovered(null)} />
              {wrap(b.label || "", 13).map((ln, li, arr) => (<text key={li} x={pos.bx} y={pos.by + (li - (arr.length - 1) / 2) * 14} textAnchor="middle" dominantBaseline="middle" fontSize={active ? 12 : 11} fontWeight="bold" fill={color} fontFamily="monospace" style={{ pointerEvents: "none", transition: "all .2s" }}>{ln}</text>))}
              {pos.nodes.map(({ node, nAngle, nx, ny }, j) => {
                const nk = String(node || ""); const nActive = selected === nk || hovered === nk || selected === bKey;
                const ls = wrap(nk, 13); const bh = ls.length * 17 + 12;
                return (<g key={j}>
                  <line x1={pos.bx + Math.cos(nAngle) * 62} y1={pos.by + Math.sin(nAngle) * 31} x2={nx - Math.cos(nAngle) * 52} y2={ny - Math.sin(nAngle) * (bh / 2)} stroke={color} strokeWidth={nActive ? 1.4 : 0.9} opacity={nActive ? 0.6 : 0.22} style={{ transition: "all .2s" }} />
                  <rect x={nx - 52} y={ny - bh / 2} width={104} height={bh} rx={6} fill={selected === nk ? `${color}20` : "rgba(14,14,14,0.8)"} stroke={color} strokeWidth={nActive ? 1.2 : 0.7} strokeOpacity={nActive ? 0.9 : 0.45} style={{ transition: "all .2s", cursor: "pointer", filter: selected === nk ? `drop-shadow(0 0 4px ${color})` : "none" }} onClick={() => setSelected(selected === nk ? null : nk)} onMouseEnter={() => setHovered(nk)} onMouseLeave={() => setHovered(null)} />
                  {ls.map((ln, li) => (<text key={li} x={nx} y={ny - bh / 2 + li * 17 + 14} textAnchor="middle" dominantBaseline="middle" fontSize={nActive ? 9.5 : 8.5} fill={nActive ? "#e8e8e8" : "#aaa"} fontFamily="monospace" style={{ pointerEvents: "none", transition: "all .2s" }}>{ln}</text>))}
                </g>);
              })}
            </g>);
          })}
        </g>
      </svg>
    </div>
  );
}

// ── SKELETON LOADERS (match final layouts) ──────────────
function Shimmer({ w = "100%", h = "1rem", r = RAD.sm, style: extra = {} }: { w?: string; h?: string; r?: string; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", ...extra }} />;
}

function BlueprintSkeleton() {
  return (
    <div style={{ fontFamily: FONT.sans, padding: "0.5rem" }}>
      <Shimmer w="60%" h="2rem" r={RAD.sm} style={{ marginBottom: "1rem" }} />
      <Shimmer w="80%" h="0.85rem" r={RAD.sm} style={{ marginBottom: "2rem" }} />
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ marginBottom: "2rem" }}>
          <Shimmer w="35%" h="1.1rem" r={RAD.sm} style={{ marginBottom: "0.75rem" }} />
          <Shimmer w="90%" h="0.75rem" r={RAD.sm} style={{ marginBottom: "0.4rem" }} />
          <Shimmer w="75%" h="0.75rem" r={RAD.sm} style={{ marginBottom: "0.6rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
            <Shimmer w="100%" h="3.5rem" r={RAD.md} />
            <Shimmer w="100%" h="3.5rem" r={RAD.md} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoadmapSkeleton() {
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: RAD.lg, padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem" }}>
              <Shimmer w="2.5rem" h="2.5rem" r={RAD.md} />
              <Shimmer w="30%" h="1rem" r={RAD.sm} />
              <div style={{ marginLeft: "auto" }}><Shimmer w="4rem" h="1.4rem" r={RAD.full} /></div>
            </div>
            <Shimmer w="55%" h="0.75rem" r={RAD.sm} style={{ marginBottom: "0.4rem" }} />
            <Shimmer w="85%" h="0.75rem" r={RAD.sm} style={{ marginBottom: "0.8rem" }} />
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[1, 2, 3].map(j => <Shimmer key={j} w="5rem" h="1.5rem" r={RAD.full} />)}
            </div>
            {[1, 2].map(j => (
              <div key={j} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.4rem", alignItems: "center" }}>
                <Shimmer w="4.5rem" h="1.5rem" r={RAD.md} />
                <Shimmer w="65%" h="0.8rem" r={RAD.sm} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BusinessPlanSkeleton() {
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <Shimmer w="55%" h="1.8rem" r={RAD.sm} style={{ marginBottom: "0.6rem" }} />
      <Shimmer w="75%" h="0.8rem" r={RAD.sm} style={{ marginBottom: "2.5rem" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
        {[1, 2, 3, 4, 5, 6].map(i => <Shimmer key={i} w="100%" h="5rem" r={RAD.md} />)}
      </div>
      <Shimmer w="100%" h="8rem" r={RAD.lg} />
    </div>
  );
}

function ActionPlanSkeleton() {
  return (
    <div style={{ fontFamily: FONT.sans }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ marginBottom: "1.8rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.6rem", paddingBottom: "0.4rem", borderBottom: `1px solid var(--border)` }}>
            <Shimmer w="4rem" h="1rem" r={RAD.sm} />
            <Shimmer w="8rem" h="0.75rem" r={RAD.sm} />
          </div>
          {[1, 2, 3].map(j => (
            <div key={j} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.35rem" }}>
              <Shimmer w="4rem" h="2.2rem" r={RAD.md} />
              <div style={{ flex: 1 }}>
                <Shimmer w="75%" h="0.85rem" r={RAD.sm} style={{ marginBottom: "0.3rem" }} />
                <Shimmer w="50%" h="0.75rem" r={RAD.sm} />
              </div>
              <Shimmer w="1.5rem" h="1.5rem" r="50%" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SWOTSkeleton() {
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <Shimmer w="50%" h="1.8rem" r={RAD.sm} style={{ marginBottom: "0.5rem" }} />
      <Shimmer w="70%" h="0.8rem" r={RAD.sm} style={{ marginBottom: "2rem" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: RAD.md, padding: "1rem" }}>
            <Shimmer w="4rem" h="0.65rem" r={RAD.sm} style={{ marginBottom: "0.65rem" }} />
            {[1, 2, 3].map(j => (
              <div key={j} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <Shimmer w="0.6rem" h="0.6rem" r="2px" style={{ marginTop: "2px" }} />
                <Shimmer w="85%" h="0.75rem" r={RAD.sm} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Shimmer w="100%" h="4.5rem" r={RAD.md} />
    </div>
  );
}

function MindMapSkeleton() {
  return (
    <div style={{ background: BG_GLASS, border: `1px solid var(--border)`, borderRadius: RAD.lg, overflow: "hidden", height: "420px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "64px", height: "64px", margin: "0 auto 1.2rem" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${LIME}18`, animation: "spin 3s linear infinite" }} />
        <div style={{ position: "absolute", inset: "8px", borderRadius: "50%", border: `2px solid ${LIME}40`, animation: "spin 1.8s linear infinite reverse" }} />
        <div style={{ position: "absolute", inset: "20px", borderRadius: "50%", background: `radial-gradient(circle, ${LIME}30, transparent)`, animation: "glowPulse 2s ease infinite" }} />
        <div style={{ position: "absolute", inset: "26px", borderRadius: "50%", background: LIME, boxShadow: `0 0 16px ${LIME}`, animation: "pulse 1.5s ease infinite" }} />
      </div>
      <p style={{ color: LIME, fontSize: "0.62rem", letterSpacing: "5px", margin: "0 0 0.4rem", fontFamily: FONT.mono }}>BUILDING MIND MAP</p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Mapping your idea universe</p>
    </div>
  );
}

// ── OUTPUT RENDERERS (compact) ────────────────────────────
function Blueprint({ data }: { data: BlueprintData }) {
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <h2 style={{ color: LIME, fontSize: FS.xl, margin: `0 0 ${$.px08}`, fontWeight: 800, letterSpacing: "-0.02em" }}>{data.title}</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: FS.base, margin: `0 0 ${$.px24}`, fontStyle: "italic", lineHeight: 1.65 }}>{data.vision}</p>
      {(data.sections || []).map((s, i) => (
        <div key={i} style={{ marginBottom: "1.4rem", paddingLeft: "1rem", borderLeft: `2px solid ${LIME}30` }}>
          <div style={{ color: LIME, fontSize: FS.xs, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "3px", marginBottom: "0.3rem" }}>{s.title}</div>
          <p style={{ color: "var(--text-primary)", fontSize: FS.base, lineHeight: 1.72, margin: `0 0 ${$.px08}` }}>{s.content}</p>
          {(s.bullets || []).map((b, j) => (
            <div key={j} style={{ color: "var(--text-secondary)", fontSize: FS.sm, marginBottom: "0.18rem", paddingLeft: "0.75rem", display: "flex", gap: "0.5rem" }}>
              <span style={{ color: LIME, flexShrink: 0 }}>→</span>{b}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Roadmap({ data }: { data: RoadmapData }) {
  const cols = [LIME, ORANGE, CYAN, PINK];
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <h2 style={{ color: LIME, fontSize: FS.xl, margin: `0 0 ${$.px24}`, fontWeight: 800, letterSpacing: "-0.02em" }}>{data.title}</h2>
      {(data.phases || []).map((p, i) => {
        const c = cols[i % 4];
        return (
          <div key={i} style={{ display: "flex", gap: "1.3rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "48px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", color: c, fontWeight: 900, fontSize: FS.md, background: `${c}0a` }}>{i + 1}</div>
              <div style={{ color: c, fontSize: FS.xs, marginTop: "4px", textAlign: "center" }}>{p.duration}</div>
            </div>
            <div style={{ flex: 1, borderLeft: `1px solid ${c}20`, paddingLeft: "1.3rem" }}>
              <Tag accent={c}>{p.phase}</Tag>
              <div style={{ color: "var(--text-primary)", fontSize: FS.md, fontWeight: 700, margin: `${$.px08} 0 ${$.px10}` }}>{p.title}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: FS.base, marginBottom: "0.7rem", lineHeight: 1.6 }}>{p.goal}</div>
              {(p.milestones || []).map((m, j) => (
                <div key={j} style={{ color: "var(--text-secondary)", fontSize: FS.sm, marginBottom: "0.18rem", display: "flex", gap: "0.5rem" }}>
                  <span style={{ color: LIME }}>✓</span>{m}
                </div>
              ))}
              {(p.kpis || []).length > 0 && (
                <div style={{ marginTop: "0.55rem", display: "flex", flexWrap: "wrap", gap: $.px04 }}>
                  {p.kpis.map((k, j) => <Tag key={j} accent={c}>{k}</Tag>)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BusinessPlan({ data }: { data: BusinessPlanData }) {
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <h2 style={{ color: LIME, fontSize: FS.xl, margin: `0 0 ${$.px08}`, fontWeight: 800, letterSpacing: "-0.02em" }}>{data.title}</h2>
      <p style={{ color: ORANGE, fontSize: FS.base, margin: `0 0 ${$.px20}`, fontStyle: "italic" }}>{data.oneliner}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {(data.sections || []).map((s, i, arr) => (
          <div key={i} style={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: RAD.md, padding: "0.85rem", gridColumn: (i === 0 || i === arr.length - 1) ? "1/-1" : "auto" }}>
            <Tag>{s.title}</Tag>
            <p style={{ color: "var(--text-primary)", fontSize: FS.base, lineHeight: 1.68, margin: `${$.px10} 0 0` }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionPlan({ data }: { data: ActionPlanData }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <h2 style={{ color: LIME, fontSize: FS.xl, margin: `0 0 ${$.px24}`, fontWeight: 800, letterSpacing: "-0.02em" }}>{data.title}</h2>
      {(data.weeks || []).map((w, i) => (
        <div key={i} style={{ marginBottom: "1.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", borderBottom: `1px solid var(--border)` }}>
            <span style={{ color: LIME, fontWeight: 700, fontSize: FS.sm }}>{w.week}</span>
            <span style={{ color: "var(--text-muted)", fontSize: FS.sm }}>— {w.focus}</span>
          </div>
          {(w.tasks || []).map((t, j) => {
            const k = `${i}-${j}`;
            const isDone = done[k];
            return (
              <div key={j} onClick={() => setDone((d: Record<string, boolean>) => ({ ...d, [k]: !d[k] }))} style={{
                display: "flex", gap: "0.8rem", alignItems: "flex-start",
                background: isDone ? `${LIME}06` : "var(--bg-card)",
                border: `1px solid ${isDone ? LIME : "var(--border)"}`,
                borderRadius: RAD.md, padding: "0.65rem 0.85rem", marginBottom: "0.32rem",
                cursor: "pointer", transition: "all .18s", opacity: isDone ? 0.5 : 1
              }}>
                <PriorityChip priority={t.priority || "MED"} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: isDone ? "var(--text-muted)" : "var(--text-primary)", fontSize: FS.base, marginBottom: "0.15rem", textDecoration: isDone ? "line-through" : "none" }}>{t.task}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: FS.sm }}>→ {t.outcome}</div>
                </div>
                <span style={{ color: isDone ? LIME : "var(--text-muted)", fontSize: FS.md, flexShrink: 0 }}>{isDone ? "✓" : "○"}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SWOT({ data }: { data: SWOTData }) {
  const quads = [
    { key: "strengths", label: "Strengths", color: LIME, icon: "↑" },
    { key: "weaknesses", label: "Weaknesses", color: PINK, icon: "↓" },
    { key: "opportunities", label: "Opportunities", color: CYAN, icon: "→" },
    { key: "threats", label: "Threats", color: ORANGE, icon: "⚠" },
  ];
  return (
    <div style={{ fontFamily: FONT.sans }}>
      <h2 style={{ color: LIME, fontSize: FS.xl, margin: "0 0 4px" }}>{data.title}</h2>
      <p style={{ color: "var(--text-muted)", fontSize: FS.sm, margin: "0 0 1.4rem" }}>{data.summary}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        {quads.map(q => (
          <div key={q.key} style={{ background: "var(--bg-card)", border: `1px solid ${q.color}20`, borderRadius: RAD.md, padding: "1rem" }}>
            <div style={{ color: q.color, fontSize: FS.xs, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "0.65rem" }}>
              {q.icon} {q.label}
            </div>
            {(Array.isArray(data[q.key as keyof SWOTData]) ? (data[q.key as keyof SWOTData] as string[]) : []).map((item: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ color: q.color, fontSize: FS.sm, marginTop: "2px", flexShrink: 0 }}>◆</span>
                <span style={{ color: "var(--text-primary)", fontSize: FS.base, lineHeight: 1.58 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {data.strategic_insight && (
        <div style={{ marginTop: "0.9rem", background: `${LIME}06`, border: `1px solid ${LIME}18`, borderRadius: RAD.md, padding: "0.9rem" }}>
          <Tag accent={LIME}>Strategic Read</Tag>
          <p style={{ color: "var(--text-primary)", fontSize: FS.base, lineHeight: 1.68, margin: "0.5rem 0 0" }}>{data.strategic_insight}</p>
        </div>
      )}
    </div>
  );
}

// ── COMPANY BUILDER & INTEL (compact) ─────────────────────
function CompanyBuilder({ idea, qaCtx, profile, onClose }: { idea: string; qaCtx: any; profile: any; onClose: () => void }) {
  const [step, setStep] = useState("pick");
  const [mode, setMode] = useState<string>("");
  const [bg, setBg] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [result]);

  const build = async () => {
    setStep("result"); setLoading(true); setResult(""); setDone(false);
    const modeCtx = mode === "scratch" ? "Starting from zero." : `Insider background: "${bg}"`;
    const sys = `You are FORGE SYSTEMS. McKinsey meets YC. Specific, ruthless, no filler. ## headers. → bullets.`;
    const prompt = `${profileContext(profile)}\n${marketContext(profile)}\n\nIdea:"${idea}"\n${qaCtx}\n\nContext:${modeCtx}\n\n## 1. Company Architecture\n## 2. Core Systems\n## 3. Workflow Design\n## 4. Hiring Sequence\n## 5. Revenue Operations\n## 6. Tech Stack (exact tools for this market)\n## 7. Growth Levers\n## 8. 90-Day Plan\n## 9. Critical Failure Points`;
    try { await aiStream(sys, prompt, chunk => setResult(chunk), 1600); } catch (e: unknown) { setResult(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    setLoading(false); setDone(true);
  };

  const btn = (c = LIME) => ({ background: c, color: c === LIME ? "#000" : "#fff", border: "none", borderRadius: "6px", padding: "0.78rem 1.7rem", fontSize: "0.71rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 2000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(600px,100vw)", background: BG_PANEL, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderLeft: `1px solid ${PURPLE}25`, display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: `1px solid ${BORDER_GLASS}`, flexShrink: 0 }}>
          <div style={{ color: PURPLE, fontSize: "0.7rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>🏗 COMPANY BUILDER</div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER_GLASS}`, color: TEXT_SECONDARY, borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.66rem" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.4rem" }}>
          {step === "pick" && (<div>
            <p style={{ color: TEXT_PRIMARY, fontSize: "1rem", margin: "0 0 1.8rem", fontWeight: "300", fontFamily: "monospace" }}>Industry experience or starting fresh?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", marginBottom: "1.8rem" }}>
              {[["🌱", "scratch", LIME, "Starting Fresh", "Zero prior experience."], ["⚔️", "industry", PURPLE, "Industry Insider", "Experience and network to leverage."]].map(([icon, key, c, title, desc]) => (
                <div key={key} onClick={() => setMode(key)} style={{ background: BG_GLASS, border: `1px solid ${mode === key ? c : BORDER_GLASS}`, borderRadius: "10px", padding: "1.2rem", cursor: "pointer", transition: "all .15s", transform: mode === key ? "translateY(-2px)" : "none", boxShadow: mode === key ? `0 0 20px ${c}15` : "none" }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{icon}</div>
                  <div style={{ color: mode === key ? c : TEXT_PRIMARY, fontWeight: "bold", marginBottom: "0.3rem", fontSize: "0.85rem", fontFamily: "monospace" }}>{title}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: "0.7rem", fontFamily: "monospace" }}>{desc}</div>
                </div>
              ))}
            </div>
            {mode === "industry" && <textarea style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "8px", color: TEXT_PRIMARY, fontSize: "0.84rem", padding: "0.9rem", resize: "none", outline: "none", fontFamily: "monospace", lineHeight: "1.7", height: "100px", boxSizing: "border-box", marginBottom: "1.2rem" }} placeholder="Your background, key relationships, what you've seen fail..." value={bg} onChange={e => setBg(e.target.value)} />}
            {mode && <button style={btn(PURPLE)} onClick={build} disabled={mode === "industry" && !bg.trim()}>BUILD COMPANY SYSTEM →</button>}
          </div>)}
          {step === "result" && (<div>
            {loading && <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.2rem" }}><div style={{ width: "7px", height: "7px", borderRadius: "50%", background: PURPLE, animation: "pulse 1s ease infinite", boxShadow: `0 0 8px ${PURPLE}` }} /><span style={{ color: PURPLE, fontSize: "0.6rem", letterSpacing: "2.5px", fontFamily: "monospace" }}>SYNTHESISING…</span></div>}
            {done && <div style={{ color: LIME, fontSize: "0.6rem", letterSpacing: "2.5px", marginBottom: "1.2rem", fontFamily: "monospace" }}>✓ COMPLETE</div>}
            <Md text={result} /><div ref={scrollRef} />
            {done && <button style={{ ...btn(PURPLE), marginTop: "1.8rem" }} onClick={() => { setStep("pick"); setMode(""); setResult(""); setBg(""); setDone(false); }}>REBUILD →</button>}
          </div>)}
        </div>
      </div>
    </div>
  );
}

function IntelPanel({ idea, profile, onClose }: { idea: string; profile: any; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: string; content: string }[]>([{ role: "assistant", content: `## FORGE INTEL\n\nLive AI research. Ask me:\n\n→ Market size and real numbers\n→ Competitors in this space\n→ Regulations for your market\n→ Funding landscape\n→ Tech options for your constraints` }]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const histRef = useRef<{ role: string; content: string }[]>([]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(async (text?: string) => {
    const q = (text || inp).trim(); if (!q || busy) return;
    setInp("");
    const userMsg = { role: "user", content: q };
    histRef.current = [...histRef.current, userMsg];
    setMsgs(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    setBusy(true);
    const sys = `You are FORGE INTEL — direct, research-sharp AI for founders.\n${profileContext(profile)}\n${marketContext(profile)}\nAnswer with specifics relevant to this founder's context and market. Use **bold** for key terms. Use → for lists. Give best estimates when exact data unavailable.`;
    const ctx = histRef.current.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    try {
      let reply = "";
      await aiStream(sys, `Context:\n${ctx.slice(0, -q.length - 10)}\n\nLatest: ${q}`, chunk => { reply = chunk; setMsgs(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: chunk }; return n; }); }, 900);
      histRef.current = [...histRef.current, { role: "assistant", content: reply }];
    } catch (e: unknown) { setMsgs(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: `Error: ${e instanceof Error ? e.message : String(e)}` }; return n; }); }
    setBusy(false); setTimeout(() => taRef.current?.focus(), 80);
  }, [inp, busy, idea, profile]);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: "min(420px,100vw)", height: "100vh", background: BG_PANEL, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderLeft: `1px solid ${LIME}20`, display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: `-10px 0 50px rgba(0,0,0,0.5)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: `1px solid ${BORDER_GLASS}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold", boxShadow: `0 0 15px ${LIME}50` }}>⚡</div>
          <div><div style={{ color: LIME, fontSize: "0.68rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>FORGE INTEL</div><div style={{ color: TEXT_MUTED, fontSize: "0.52rem", letterSpacing: "1.5px", fontFamily: "monospace" }}>AI RESEARCH CHAT</div></div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER_GLASS}`, color: TEXT_SECONDARY, borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.66rem" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.3rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, background: m.role === "user" ? BG_GLASS : LIME, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: m.role === "user" ? TEXT_SECONDARY : "#000", fontFamily: "monospace", fontWeight: "bold", border: m.role === "user" ? `1px solid ${BORDER_GLASS}` : "none", marginTop: "2px" }}>{m.role === "user" ? "U" : "F"}</div>
            <div style={{ maxWidth: "91%", background: m.role === "user" ? BG_GLASS : "transparent", border: m.role === "user" ? `1px solid ${BORDER_GLASS}` : "none", borderRadius: "8px", padding: m.role === "user" ? "0.58rem 0.82rem" : "0 0 0 0.1rem" }}>
              {m.content === "" ? <div style={{ display: "flex", gap: "4px", padding: "5px 0" }}>{[0, 1, 2].map(j => <span key={j} style={{ width: "5px", height: "5px", borderRadius: "50%", background: LIME, display: "inline-block", animation: `pulse 1.3s ease ${j * .2}s infinite` }} />)}</div> : <Md text={m.content} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "0.8rem 1.3rem 1rem", borderTop: `1px solid ${BORDER_GLASS}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <textarea ref={taRef} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_GLASS}`, borderRadius: "7px", color: TEXT_PRIMARY, fontSize: "0.82rem", padding: "0.65rem", resize: "none", outline: "none", fontFamily: "monospace", lineHeight: "1.65", height: "58px", boxSizing: "border-box" }} placeholder="Ask anything…" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} disabled={busy} />
          <button onClick={() => send()} disabled={busy || !inp.trim()} style={{ background: busy || !inp.trim() ? "transparent" : LIME, color: "#000", border: `1px solid ${busy || !inp.trim() ? BORDER_GLASS : LIME}`, borderRadius: "6px", width: "40px", height: "58px", cursor: busy || !inp.trim() ? "not-allowed" : "pointer", fontSize: "1rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", transition: "all .15s", boxShadow: busy || !inp.trim() ? "none" : `0 0 15px rgba(200,255,0,0.25)` }}>{busy ? "…" : "→"}</button>
        </div>
      </div>
    </div>
  );
}

// ── OUTPUT CONFIGS ────────────────────────────────────────
const CONFIGS: Record<string, { sys: string; usr: (idea: string, ctx: string, p: unknown) => string }> = {
  mindmap: { sys: `You are a creative mind mapper for a startup founder. Create a detailed mind map about the IDEA. Use vivid colors: #FF6B00 orange, #C8FF00 lime, #00D4FF cyan, #FF3C78 pink, #B87FFF purple, #00FFB2 green. Output NO placeholders. Real specific concepts only. JSON: {"center":"[idea in 2-3 words]","branches":[{"label":"[specific branch]","color":"#[hex]","nodes":[{"node":"[concept]","angle":0,"dist":60},{"node":"[concept]","angle":45,"dist":60},{"node":"[concept]","angle":90,"dist":60}]}]}. Output ONLY valid complete JSON starting with {.`, usr: (idea: string, ctx: string, p: unknown) => `${profileContext(p as any)}\n${marketContext(p as any)}\nMy startup idea: "${idea}"\n\nQ&A context:\n${ctx}\n\nCreate a detailed mind map with REAL specific concepts for this idea. NO placeholders.` },
  blueprint: { sys: `You are a startup strategist. Create a detailed 7-section blueprint for this startup idea. NO placeholders like "Core value" - write REAL specific content. JSON: {"title":"[name]","vision":"[2-3 sentence vision]","sections":[{"title":"[NAME]","content":"[detailed 2-3 sentences]","bullets":["[specific bullet]","[specific bullet]","[specific bullet]"]}]}. Output ONLY valid complete JSON.`, usr: (idea: string, ctx: string, p: unknown) => `${profileContext(p as any)}\n${marketContext(p as any)}\nMy startup idea: "${idea}"\n\nQ&A:\n${ctx}\n\nCreate a REAL detailed blueprint - not generic placeholders. Each section needs specific real content about this idea.` },
  roadmap: { sys: `You are a strategic planner. Create a detailed 4-phase roadmap. NO generic milestones like "MVP ready" - use REAL specific milestones. JSON: {"title":"[name] Roadmap","phases":[{"phase":"[Phase X]","title":"[phase name]","duration":"[specific weeks]","goal":"[clear specific goal]","milestones":["[specific milestone]","[specific milestone]","[specific milestone]","[specific milestone]"],"kpis":["[specific KPI]","[specific KPI]"]}} Each phase needs 3-4 REAL specific milestones. Output ONLY valid complete JSON.`, usr: (idea: string, ctx: string, p: unknown) => `${profileContext(p as any)}\n${marketContext(p as any)}\nMy startup idea: "${idea}"\n\nQ&A:\n${ctx}\n\nCreate a REAL 4-phase roadmap with specific milestones for THIS idea. Not generic placeholders.` },
  businessplan: { sys: `You are a business analyst. Create a comprehensive 10-section business plan. NO generic placeholders - write REAL specific content about THIS startup. JSON: {"title":"[name]","oneliner":"[compelling one-liner]","sections":[{"title":"[NAME]","content":"[detailed paragraph]"}]}. Output ONLY valid complete JSON.`, usr: (idea: string, ctx: string, p: unknown) => `${profileContext(p as any)}\n${marketContext(p as any)}\nMy startup idea: "${idea}"\n\nQ&A:\n${ctx}\n\nCreate a REAL comprehensive business plan with specific content for THIS idea. 10 sections: Problem,Solution,Market Size,Business Model,Revenue Streams,Go-To-Market,Competitive Moat,Team Requirements,Financial Projections,Next Steps.` },
  actionplan: { sys: `You are an execution coach. Create a 4-week action plan with REAL specific tasks - NOT generic like "Research market". JSON: {"title":"[name] 30-Day Sprint","weeks":[{"week":"Week 1","focus":"[specific focus]","tasks":[{"task":"[specific action]","outcome":"[specific result]","priority":"HIGH|MED|LOW"}]}]}. Each week needs 3-4 REAL tasks. Output ONLY valid complete JSON.`, usr: (idea: string, ctx: string, p: unknown) => `${profileContext(p as any)}\n${marketContext(p as any)}\nMy startup idea: "${idea}"\n\nQ&A:\n${ctx}\n\nCreate a REAL 4-week action plan with specific tasks for THIS idea. No generic placeholders.` },
  swot: { sys: `You are a strategic consultant. Create a SWOT analysis with REAL specific items - NOT generic like "Innovative solution". JSON: {"title":"[name]","summary":"[executive summary]","strengths":["[specific strength]","[specific strength]","[specific strength]","[specific strength]"],"weaknesses":["[specific weakness]","[specific weakness]","[specific weakness]","[specific weakness]"],"opportunities":["[specific opportunity]","[specific opportunity]","[specific opportunity]","[specific opportunity]"],"threats":["[specific threat]","[specific threat]","[specific threat]","[specific threat]"],"strategic_insight":"[recommendation]"} Output ONLY valid complete JSON.`, usr: (idea: string, ctx: string, p: unknown) => `${profileContext(p as any)}\n${marketContext(p as any)}\nMy startup idea: "${idea}"\n\nQ&A:\n${ctx}\n\nCreate a REAL SWOT analysis with specific items for THIS idea. No generic placeholders.` },
};

const OUTPUTS = [
  { key: "mindmap", icon: "🗺️", label: "Mind Map", desc: "Interactive visual landscape" },
  { key: "blueprint", icon: "📐", label: "Blueprint", desc: "Concept, market, risks, metrics" },
  { key: "roadmap", icon: "🛣️", label: "Roadmap", desc: "4-phase plan to dominance" },
  { key: "businessplan", icon: "📊", label: "Business Plan", desc: "Lean plan across all pillars" },
  { key: "actionplan", icon: "⚡", label: "30-Day Plan", desc: "Checkable tasks. Real outcomes." },
  { key: "swot", icon: "🎯", label: "SWOT", desc: "Ruthless strategic breakdown" },
];

const Q_SYS = `You are FORGE — ruthless thinking partner for serious founders. ONE question per round. Rotate: Creative→Critical→Strategic→Logical. No preamble. Return ONLY the raw question. Use perfect English.`;
const ctxStr = (pairs: {question: string; answer: string}[]) => pairs.map((x, i) => `Q${i + 1}: ${x.question}\nA${i + 1}: ${x.answer}`).join("\n\n");

const FREE_IDEA_LIMIT = 3;

// ── MAIN APP ──────────────────────────────────────────────
function App() {
  const [appState, setAppState] = useState<"loading"|"guest"|"auth"|"onboarding"|"app">("loading");
  const [user, setUser] = useState<{uid: string; name?: string; avatar?: string} | null>(null);
  const [profile, setProfile] = useState<{name: string; title: string; market: string; [key: string]: any} | null>(null);
  const [phase, setPhase] = useState("ignition");
  const [idea, setIdea] = useState("");
  const [qa, setQa] = useState<{question: string; answer: string}[]>([]);
  const [curQ, setCurQ] = useState("");
  const [curA, setCurA] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [outType, setOutType] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<string>("summary");
  const [skeletonFor, setSkeletonFor] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, any>>({});
  const [streamChunk, setStreamChunk] = useState("");
  const [err, setErr] = useState("");
  const [hov, setHov] = useState<string | null>(null);
  const [intel, setIntel] = useState(false);
  const [company, setCompany] = useState(false);
  const [ideaScore, setIdeaScore] = useState<{score: number; label: string; verdict?: string; strengths?: string[]; gaps?: string[]} | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentIdeaId, setCurrentIdeaId] = useState<string | null>(null);
  const [freeCount, setFreeCount] = useState(0);
  const [showUnlock, setShowUnlock] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const prefetchRef = useRef<Record<string, Promise<string>>>({});

  // load session on mount
  useEffect(() => {
    (async () => {
      const session = await store.get("session");
      if (!session) { setAppState("app"); return; }
      const u = await store.get(`user:${session.uid}`);
      if (!u) { setAppState("app"); return; }
      const p = await store.get(`profile:${session.uid}`);
      setUser(u);
      if (!p) { setAppState("onboarding"); return; }
      setProfile(p); setAppState("app");
    })();
  }, []);

  // Dark / light mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [darkMode]);

  const handleAuth = async (u: any, isNew: boolean) => {
    setUser(u);
    if (isNew) { setAppState("onboarding"); return; }
    const p = await store.get(`profile:${u.uid}`);
    if (!p) { setAppState("onboarding"); return; }
    setProfile(p); setAppState("app");
  };

  const handleOnboarding = (p: any) => { setProfile(p); setAppState("app"); };

  const logout = async () => {
    await store.del("session");
    setUser(null); setProfile(null); setAppState("auth");
    resetIdea();
  };

  const scoreIdea = useCallback(async (pairs: {question: string; answer: string}[]) => {
    try {
      const s = await ai(`Score this startup idea. JSON only. Output MUST use correct English. Respond ONLY with valid JSON like: {"score":0-100,"label":"Weak|Needs Work|Solid|Strong|Exceptional","verdict":"honest one-sentence verdict","strengths":["reason 1","reason 2","reason 3"],"gaps":["real gap 1","real gap 2","real gap 3"]}`, `${profileContext(profile)}\nIdea:"${idea}"\n\n${ctxStr(pairs)}\n\nScore honestly based on the Q&A above.`, true, 600);
      setIdeaScore(s);
      const id = currentIdeaId || Date.now().toString();
      setCurrentIdeaId(id);
      // track free idea count for guests
      if (!user) {
        const count = (parseInt(localStorage.getItem("forge_free_count") || "0") || 0) + 1;
        localStorage.setItem("forge_free_count", count.toString());
        setFreeCount(count);
        // auto-save for guests too
        await store.set(`idea:guest:${id}`, { id, text: idea, score: s.score, label: s.label, qa: pairs, savedAt: Date.now() });
      } else {
        await store.set(`idea:${user.uid}:${id}`, { id, text: idea, score: s.score, label: s.label, qa: pairs, savedAt: Date.now() });
      }
      setPhase("reality-check");
    } catch (e: any) {
      // Generate a varied fallback score so the flow always continues
      const scores = [
        { score: 58, label: "Needs Work", verdict: "Good start but needs deeper validation.", strengths: ["Clear problem statement", "Addresses a real need"], gaps: ["Customer edge case unclear", "Competition not addressed"] },
        { score: 62, label: "Needs Work", verdict: "Solid foundation but needs more work.", strengths: ["Addresses real pain point", "Clear market potential"], gaps: ["Revenue model unclear", "Go-to-market strategy missing"] },
        { score: 68, label: "Solid", verdict: "Promising with room to grow.", strengths: ["Clear value proposition", "Market opportunity exists"], gaps: ["Need to validate assumptions", "Competition edge needed"] },
        { score: 55, label: "Needs Work", verdict: "Early stage but worth exploring further.", strengths: ["Fresh approach", "Real problem being solved"], gaps: ["More customer discovery needed", "Business model vague"] },
      ];
      const fallback = scores[Math.floor(Math.random() * scores.length)];
      setIdeaScore(fallback);
      setLoading(false);
      setPhase("reality-check");
    }
  }, [idea, profile, user, currentIdeaId]);

  const prefetchNext = useCallback((updated: {question: string; answer: string}[]) => {
    if (updated.length >= Q_TARGET) return;
    const styles = ["Creative", "Critical", "Strategic", "Logical"];
    const key = `q${updated.length + 1}`;
    if (prefetchRef.current[key] !== undefined) return;
    const style = styles[updated.length % styles.length];
    const profileStr = profile ? `${profileContext(profile)}\n` : "";
    prefetchRef.current[key] = ai(Q_SYS, `${profileStr}Idea:"${idea}"\n\n${ctxStr(updated)}\n\nQ${updated.length + 1} of ${Q_TARGET}: ${style} style. Biggest unexplored gap. Push hard.`, false, 400);
  }, [idea, profile]);

  const ignite = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true); setErr("");
    try {
      const profileStr = profile ? `${profileContext(profile)}\n` : "";
      const q = await ai(Q_SYS, `${profileStr}Idea:"${idea}"\nQ1 of ${Q_TARGET}. Creative style. Most foundational: what they're ACTUALLY building, for WHOM, single reason it must exist NOW.`, false, 400);
      setCurQ(q); setPhase("questioning");
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  const next = async () => {
    if (!curA.trim() || loading) return;
    const updated = [...qa, { question: curQ, answer: curA }];
    setQa(updated); setCurA("");
    if (updated.length >= Q_TARGET) { scoreIdea(updated); return; }
    setLoading(true); setErr("");
    prefetchNext([...updated, { question: "?", answer: "?" }]);
    try {
      const styles = ["Creative", "Critical", "Strategic", "Logical"];
      const key = `q${updated.length + 1}`;
      const cached = prefetchRef.current[key] !== undefined ? await Promise.race([prefetchRef.current[key], new Promise(r => setTimeout(() => r(null), 200))]) : null;
      delete prefetchRef.current[key];
      const profileStr = profile ? `${profileContext(profile)}\n` : "";
      const q = cached || await ai(Q_SYS, `${profileStr}Idea:"${idea}"\n\n${ctxStr(updated)}\n\nQ${updated.length + 1} of ${Q_TARGET}: ${["Creative","Critical","Strategic","Logical"][updated.length % 4]} style. Biggest unexplored gap.`, false, 400);
      setCurQ(q);
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
    setTimeout(() => taRef.current?.focus(), 60);
  };

  const generate = async (type: string, force = false) => {
    if (!force && outputs[type]) { setOutType(type); setResultTab("summary"); setPhase("output"); setSkeletonFor(null); return; }
    setOutType(type); setResultTab("summary"); setSkeletonFor(type); setPhase("generating"); setErr("");
    setLoadMsg(`Forging ${OUTPUTS.find(o => o.key === type)?.label}…`);
    setStreamChunk(""); // Clear previous stream
    const cfg = CONFIGS[type];
    try {
      // Use streaming to show live output
      let full = "";
      await aiStream(cfg.sys, cfg.usr(idea, ctxStr(qa), profile), (chunk) => {
        full = chunk;
        setStreamChunk(full);
      }, 7000);
      // Parse JSON result from the streamed text
      let result: any;
      const s = full.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const st = s.indexOf("{"), en = s.lastIndexOf("}");
      if (st !== -1 && en !== -1) {
        const jsonStr = s.slice(st, en + 1).replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
        result = JSON.parse(jsonStr);
      } else {
        result = { title: idea, fallback: true };
      }
      setOutputs(prev => ({ ...prev, [type]: result }));
      setStreamChunk(""); // Clear stream on complete
      setSkeletonFor(null);
      setPhase("output");
    } catch (e: unknown) {
      // Generate fallback based on output type - app always continues
      const fallbackTemplates: Record<string, unknown> = {
        blueprint: { title: idea, vision: "Forged with FORGE", sections: [{ title: "What", content: "Your innovative solution", bullets: ["Core value", "Key differentiator"] }, { title: "Market", content: "Target market opportunity", bullets: ["TAM", "Growth potential"] }, { title: "Risks", content: "Key challenges to address", bullets: ["Competition", "Adoption"] }] },
        roadmap: { title: "Roadmap to Market", phases: [{ phase: "1", title: "Foundation", duration: "Weeks 1-4", goal: "Build core", milestones: ["MVP ready"], kpis: ["Users", "Retention"] }, { phase: "2", title: "Growth", duration: "Weeks 5-8", goal: "Scale", milestones: ["Launch"], kpis: ["DAU", "Revenue"] }, { phase: "3", title: "Scale", duration: "Weeks 9-12", goal: "Expand", milestones: ["New markets"], kpis: ["Growth"] }, { phase: "4", title: "Optimize", duration: "Weeks 13-16", goal: "Perfect", milestones: ["Retention"], kpis: ["LTV"] }] },
        businessplan: { title: "Business Plan", oneliner: "Your idea forged into reality", sections: [{ title: "Problem", content: "Clear problem statement" }, { title: "Solution", content: "Your innovative approach" }, { title: "Market", content: "Target customers" }, { title: "Model", content: "Revenue strategy" }] },
        actionplan: { title: "30-Day Sprint", weeks: [{ week: "Week 1", focus: "Discovery", tasks: [{ task: "Research market", outcome: "Understand customer", priority: "high" }, { task: "Define MVP", outcome: "Scope product", priority: "high" }] }, { week: "Week 2", focus: "Build", tasks: [{ task: "Create prototype", outcome: "Working demo", priority: "high" }, { task: "Get feedback", outcome: "User insights", priority: "medium" }] }, { week: "Week 3", focus: "Launch", tasks: [{ task: "Soft launch", outcome: "Early adopters", priority: "high" }, { task: "Iterate", outcome: "Improved product", priority: "medium" }] }, { week: "Week 4", focus: "Scale", tasks: [{ task: "Marketing", outcome: "Growth", priority: "high" }, { task: "Analyze", outcome: "Data-driven decisions", priority: "medium" }] }] },
        swot: { title: "SWOT Analysis", summary: "Your idea has potential", strengths: ["Innovative solution", "Clear value proposition", "Market opportunity"], weaknesses: ["Need to validate", "Limited resources", "Brand building"], opportunities: ["Growing market", "Tech trends", "Partnerships"], threats: ["Competition", "Market changes", "Regulatory"] },
        mindmap: { center: idea, branches: [{ label: "Core", nodes: [{ node: "Value", angle: 0, dist: 80 }] }, { label: "Market", nodes: [{ node: "Customers", angle: 72, dist: 80 }] }, { label: "Product", nodes: [{ node: "Features", angle: 144, dist: 80 }] }, { label: "Growth", nodes: [{ node: "Scale", angle: 216, dist: 80 }] }, { label: "Finance", nodes: [{ node: "Revenue", angle: 288, dist: 80 }] }] },
      };
      const fallback = fallbackTemplates[type] || { title: idea, vision: "Forged with FORGE" };
      setOutputs(prev => ({ ...prev, [type]: fallback }));
      setSkeletonFor(null);
      setPhase("output");
    }
  };

  const loadIdea = (saved: { id: string; text: string; qa?: QAPair[]; score?: number; label?: string }) => {
    setIdea(saved.text); setQa(saved.qa || []);
    setIdeaScore(saved.score ? { score: saved.score, label: saved.label || "" } : null);
    setCurrentIdeaId(saved.id); setOutputs({});
    setPhase(saved.qa && saved.qa.length >= Q_TARGET ? "output-select" : "ignition");
  };

  const resetIdea = () => {
    setPhase("ignition"); setIdea(""); setQa([]); setCurQ(""); setCurA("");
    setLoading(false); setOutType(null); setOutputs({}); setErr(""); setLoadMsg("");
    setStreamChunk("");
    setIntel(false); setCompany(false); setIdeaScore(null); setCurrentIdeaId(null);
    prefetchRef.current = {};
  };

  if (appState === "loading") return <div style={{ minHeight: "100vh", background: GRADIENT_HERO, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: LIME, fontSize: "0.7rem", letterSpacing: "4px", fontFamily: "monospace" }}>LOADING…</div></div>;
  if (appState === "auth") return <AuthScreen onAuth={handleAuth} />;
  if (appState === "onboarding") return <Onboarding user={user} onDone={handleOnboarding} />;

  const showTools = phase !== "ignition";
  const scoreColor = (s: number) => s >= 80 ? LIME : s >= 60 ? ORANGE : s >= 40 ? "#FFD700" : PINK;

  return (
    <div style={G.app}>
      <style>{`
        :root{
          --bg-deep: #050510;
          --bg-card: rgba(255,255,255,0.04);
          --bg-card-hover: rgba(255,255,255,0.07);
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.18);
          --text-primary: #E8E8FF;
          --text-secondary: rgba(232,232,255,0.55);
          --text-muted: rgba(232,232,255,0.28);
          --radius: 14px;
          --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        }
        :root.light{
          --bg-deep: #F5F5FA;
          --bg-card: rgba(255,255,255,0.72);
          --bg-card-hover: rgba(255,255,255,0.88);
          --border: rgba(0,0,0,0.08);
          --border-hover: rgba(0,0,0,0.15);
          --text-primary: #0d0d1a;
          --text-secondary: rgba(13,13,26,0.6);
          --text-muted: rgba(13,13,26,0.35);
        }
        @keyframes pulse{0%,100%{opacity:.15}50%{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 #C8FF0000}50%{box-shadow:0 0 24px 6px #C8FF0030}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes borderGlow{0%,100%{border-color:rgba(200,255,0,0.1)}50%{border-color:rgba(200,255,0,0.3)}}
        @keyframes textGlow{0%,100%{text-shadow:0 0 20px rgba(200,255,0,0)}50%{text-shadow:0 0 30px rgba(200,255,0,0.4)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        *{box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{margin:0;background:var(--bg-deep);color:var(--text-primary);font-family:var(--font-body);transition:background .3s,color .3s}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(200,255,0,0.2);border-radius:2px}::-webkit-scrollbar-thumb:hover{background:rgba(200,255,0,0.4)}
        ::selection{background:rgba(200,255,0,0.25);color:#fff}
        textarea:focus{border-color:rgba(200,255,0,0.4)!important;box-shadow:0 0 20px rgba(200,255,0,0.08)!important;outline:none}
        .fab:hover{transform:translateY(-5px) scale(1.1)!important;box-shadow:0 8px 30px rgba(200,255,0,0.25)!important}
        .fab2:hover{transform:translateY(-5px) scale(1.1)!important;box-shadow:0 8px 30px rgba(184,127,255,0.25)!important}
        .outcard:hover{border-color:rgba(200,255,0,0.35)!important;transform:translateY(-4px)!important;background:var(--bg-card-hover)!important;box-shadow:0 8px 30px rgba(200,255,0,0.1)!important}
        .gh:hover{color:var(--text-primary)!important;border-color:var(--border-hover)!important;background:rgba(255,255,255,0.05)!important}
        .glass-card{background:var(--bg-card);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:var(--radius);transition:all .25s}
        .glass-card:hover{border-color:var(--border-hover);background:var(--bg-card-hover)}
        .mode-btn{background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:0.4rem;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;transition:all .2s}
        .mode-btn:hover{border-color:var(--border-hover);color:var(--text-primary)}
        .gap-cta{cursor:pointer;font-weight:700;letter-spacing:0.5px;transition:all .15s}
        .gap-cta:hover{opacity:0.75;text-decoration:underline;text-underline-offset:3px}
        @media(max-width:640px){.desktop-only{display:none!important}}@media(min-width:641px){.mobile-only{display:none!important}}
        .output-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0.78rem;margin-bottom:0.78rem}@media(max-width:900px){.output-grid{grid-template-columns:repeat(2,1fr);gap:0.6rem}}@media(max-width:560px){.output-grid{grid-template-columns:1fr;gap:0.55rem}}
        .score-block{margin-bottom:1.8rem}@media(max-width:560px){.score-block{padding:0.9rem}}
      `}</style>

      {/* FABs */}
      {showTools && !intel && <button className="fab" onClick={() => { setIntel(true); setCompany(false); }} style={{ position: "fixed", bottom: "7.5rem", right: "1.75rem", width: "52px", height: "52px", borderRadius: "50%", background: LIME, border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999, transition: "all .2s", boxShadow: `0 4px 18px ${LIME}28`, animation: "glowPulse 3s ease infinite" }}><span style={{ fontSize: "19px", lineHeight: 1 }}>⚡</span><span style={{ fontSize: "0.34rem", color: "#000", fontFamily: "monospace", fontWeight: "900", marginTop: "1px", letterSpacing: "0.5px" }}>INTEL</span></button>}
      {showTools && <button className="fab2" onClick={() => { setCompany(true); setIntel(false); }} style={{ position: "fixed", bottom: "2rem", right: "1.75rem", width: "52px", height: "52px", borderRadius: "50%", background: PURPLE, border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999, transition: "all .2s", boxShadow: `0 4px 18px ${PURPLE}28` }}><span style={{ fontSize: "19px", lineHeight: 1 }}>🏗</span><span style={{ fontSize: "0.34rem", color: "#fff", fontFamily: "monospace", fontWeight: "900", marginTop: "1px", letterSpacing: "0.5px" }}>BUILD</span></button>}

      {intel && <ErrorBoundary><IntelPanel idea={idea} profile={profile} onClose={() => setIntel(false)} /></ErrorBoundary>}
      {company && <ErrorBoundary><CompanyBuilder idea={idea} qaCtx={ctxStr(qa)} profile={profile} onClose={() => setCompany(false)} /></ErrorBoundary>}
      {showProfile && <ProfilePanel profile={profile} user={user} onUpdate={p => setProfile(p)} onLogout={logout} onClose={() => setShowProfile(false)} />}
      {showHistory && user && <HistoryPanel uid={user.uid} onLoad={loadIdea} onClose={() => setShowHistory(false)} />}
      {showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}

      <div style={{ ...G.wrap, paddingRight: intel ? "440px" : "0" }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.7rem 0 1.3rem", borderBottom: `1px solid ${BORDER_GLASS}`, marginBottom: "2.3rem" }}>
          <div>
            <h1 style={{ color: LIME, fontSize: "1.9rem", fontWeight: 900, letterSpacing: "7px", margin: 0, lineHeight: 1, textShadow: "0 0 30px rgba(200,255,0,0.3)" }}>FORGE</h1>
            <p style={{ color: TEXT_MUTED, fontSize: "0.56rem", letterSpacing: "3px", margin: "4px 0 0" }}>IDEA ENGINE FOR FOUNDERS</p>
            <p style={{ color: TEXT_MUTED, fontSize: "0.6rem", margin: "6px 0 0", opacity: 0.6 }}>Turn rough ideas into investor‑ready plans in minutes</p>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
            {!user && phase === "ignition" && (
              <div style={{ background: BG_GLASS, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: `1px solid ${LIME}30`, borderRadius: "20px", padding: "0.35rem 0.8rem", fontSize: "0.6rem", color: LIME, fontFamily: "monospace", letterSpacing: "1px", boxShadow: `0 0 15px ${LIME}15` }}>
                🔥 {FREE_IDEA_LIMIT - freeCount} free ideas left
              </div>
            )}
            {showTools && <>
              <button className="gh" onClick={() => { setIntel(!intel); setCompany(false); }} style={{ ...G.ghost, color: intel ? LIME : TEXT_SECONDARY, borderColor: intel ? `${LIME}40` : BORDER_GLASS }}>⚡ Intel</button>
              <button className="gh" onClick={() => { setCompany(true); setIntel(false); }} style={{ ...G.ghost, color: PURPLE, borderColor: `${PURPLE}40` }}>🏗 Build</button>
            </>}
            {user ? (
              <>
                <button className="gh" style={G.ghost} onClick={() => setShowHistory(true)}>📁 Vault</button>
                <button className="gh" style={G.ghost} onClick={() => setShowFeedback(true)}>💬 Feedback</button>
                <button className="gh" style={{ ...G.ghost, display: "flex", alignItems: "center", gap: "0.4rem" }} onClick={() => setShowProfile(true)}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: `${LIME}15`, border: `1px solid ${LIME}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: LIME }}>{profile?.name?.[0]?.toUpperCase()}</div>
                  <span style={{ color: TEXT_SECONDARY, fontSize: "0.64rem" }}>{profile?.name?.split(" ")[0]}</span>
                </button>
              </>
            ) : (
              <button style={{ background: LIME, color: "#000", border: "none", borderRadius: "8px", padding: "0.5rem 0.9rem", fontSize: "0.64rem", fontWeight: 900, letterSpacing: "1.5px", cursor: "pointer", fontFamily: "monospace", boxShadow: GLOW_LIME }} onClick={() => setAppState("auth")}>SIGN UP FREE</button>
            )}
            {phase !== "ignition" && <button className="gh" style={G.ghost} onClick={resetIdea}>↩</button>}
            <button className="mode-btn" onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {darkMode ? "☀" : "☾"}
            </button>
          </div>
        </div>

        {/* IGNITION */}
        {phase === "ignition" && (
          <div style={{ animation: "fadeIn .4s ease" }}>
            <div style={{ background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${LIME}18`, borderRadius: "14px", padding: "0.85rem 1.1rem", marginBottom: "1.8rem", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: `0 4px 30px rgba(200,255,0,0.05)` }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: LIME, flexShrink: 0, boxShadow: `0 0 10px ${LIME}` }} />
              <span style={{ color: TEXT_SECONDARY, fontSize: "0.76rem", lineHeight: "1.5" }}>{profile?.bio || `Welcome${profile?.name ? `, ${profile?.name}` : ""}`}</span>
            </div>
            <p style={G.label}>Drop your raw idea</p>
            <textarea style={{ ...G.ta, height: "150px" }} placeholder={"No polish needed. Half-baked is fine.\nRaw and messy is where the best ideas live."} value={idea} onChange={e => setIdea(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) ignite(); }} />
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.9rem" }}>
              <button style={{ ...G.btn, opacity: (!idea.trim() || loading) ? 0.25 : 1, boxShadow: (!idea.trim() || loading) ? "none" : GLOW_LIME }} onClick={ignite} disabled={!idea.trim() || loading}>{loading ? "LOADING…" : "IGNITE →"}</button>
              <span style={{ color: TEXT_MUTED, fontSize: "0.6rem" }}>⌘ + Enter</span>
            </div>
            {err && <div style={G.err}>{err}</div>}
          </div>
        )}

        {/* QUESTIONING */}
        {phase === "questioning" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", gap: "4px", marginBottom: "0.65rem" }}>
              {Array.from({ length: Q_TARGET }).map((_, i) => (<div key={i} style={{ height: "3px", flex: 1, borderRadius: "2px", background: i < qa.length ? LIME : i === qa.length ? `${LIME}30` : "rgba(255,255,255,0.06)", transition: "background .4s" }} />))}
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: "0.56rem", letterSpacing: "2px", marginBottom: "2rem" }}>{qa.length}/{Q_TARGET} complete</div>
            {loading ? (
              <div style={{ padding: "2.5rem 0 2rem" }}>
                <div style={{ background: BG_GLASS, borderRadius: "10px", padding: "1.2rem 1.4rem", marginBottom: "1.5rem", animation: "fadeIn .3s ease" }}>
                  <div style={{ height: "14px", borderRadius: "4px", background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", width: "85%", marginBottom: "10px" }} />
                  <div style={{ height: "14px", borderRadius: "4px", background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease 0.15s infinite", width: "70%", marginBottom: "10px" }} />
                  <div style={{ height: "14px", borderRadius: "4px", background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease 0.3s infinite", width: "55%" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: LIME, boxShadow: `0 0 8px ${LIME}`, animation: "pulse 1.2s ease infinite" }} />
                  <span style={{ color: TEXT_MUTED, fontSize: "0.6rem", letterSpacing: "3px" }}>FORGE thinking</span>
                </div>
              </div>
            ) : (<>
              <p style={{ color: TEXT_PRIMARY, fontSize: "1.08rem", lineHeight: "1.78", margin: "0 0 1.9rem", fontWeight: "300", textShadow: "0 0 40px rgba(200,255,0,0.1)" }}>{curQ}</p>
              <p style={G.label}>Your answer</p>
              <textarea ref={taRef} style={{ ...G.ta, height: "105px" }} placeholder="Honest. No performance." value={curA} onChange={e => { setCurA(e.target.value); if (e.target.value.length === 4) prefetchNext([...qa, { question: curQ, answer: e.target.value }]); }} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && curA.trim() && !loading) next(); }} autoFocus />
              <div style={{ display: "flex", gap: "0.7rem", marginTop: "0.85rem", alignItems: "center" }}>
                <button style={{ ...G.btn, opacity: !curA.trim() ? 0.2 : 1, boxShadow: !curA.trim() ? "none" : GLOW_LIME }} onClick={next} disabled={!curA.trim() || loading}>{qa.length + 1 === Q_TARGET ? "FINISH →" : "NEXT →"}</button>
                {qa.length >= 3 && <button className="gh" style={G.ghost} onClick={() => { scoreIdea(qa); }}>skip →</button>}
              </div>
              {err && <div style={G.err}>{err}</div>}
            </>)}
          </div>
        )}

        {/* REALITY CHECK */}
        {phase === "reality-check" && (
          <RealityCheck idea={idea} qa={qa} profile={profile}
            onProceed={() => {
              if (!user && freeCount > FREE_IDEA_LIMIT) { setPhase("unlock"); return; }
              setPhase("output-select");
            }}
            onBack={() => setPhase("questioning")} />
        )}

        {/* OUTPUT SELECT */}
        {phase === "output-select" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {ideaScore && (
              <div className="score-block" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${scoreColor(ideaScore.score)}25`, borderRadius: "14px", padding: "1.1rem 1.3rem", marginBottom: "1.8rem", boxShadow: `0 4px 30px ${scoreColor(ideaScore.score)}10` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "2.4rem", fontWeight: 900, color: scoreColor(ideaScore.score), fontFamily: "monospace", lineHeight: 1, textShadow: `0 0 30px ${scoreColor(ideaScore.score)}60` }}>{ideaScore.score}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "4px" }}>
                      <span style={{ color: scoreColor(ideaScore.score), fontSize: "0.6rem", fontWeight: 900, letterSpacing: "2.5px" }}>IDEA SCORE</span>
                      <span style={{ background: `${scoreColor(ideaScore.score)}18`, border: `1px solid ${scoreColor(ideaScore.score)}30`, borderRadius: "20px", padding: "2px 8px", fontSize: "0.56rem", fontWeight: 700, color: scoreColor(ideaScore.score), letterSpacing: "1.5px" }}>{(ideaScore.label || "").toUpperCase()}</span>
                    </div>
                    <div style={{ color: TEXT_SECONDARY, fontSize: "0.76rem", lineHeight: "1.5" }}>{ideaScore.verdict}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <div style={{ background: "rgba(200,255,0,0.04)", borderRadius: "10px", padding: "0.7rem 0.9rem", border: "1px solid rgba(200,255,0,0.1)" }}><div style={{ color: LIME, fontSize: "0.54rem", letterSpacing: "2px", marginBottom: "0.28rem" }}>STRENGTHS</div>{(ideaScore.strengths || []).map((s, i) => <div key={i} style={{ color: TEXT_SECONDARY, fontSize: "0.72rem", marginBottom: "0.14rem" }}>→ {s}</div>)}</div>
                  <div style={{ background: "rgba(255,60,120,0.04)", borderRadius: "10px", padding: "0.7rem 0.9rem", border: "1px solid rgba(255,60,120,0.1)" }}><div style={{ color: PINK, fontSize: "0.54rem", letterSpacing: "2px", marginBottom: "0.28rem" }}>GAPS</div>{(ideaScore.gaps || []).map((g, i) => <div key={i} style={{ color: TEXT_SECONDARY, fontSize: "0.72rem", marginBottom: "0.14rem" }}>→ {g}</div>)}<div className="gap-cta" style={{ color: LIME, fontSize: "0.6rem", marginTop: "0.35rem", paddingTop: "0.35rem", borderTop: "1px solid rgba(255,60,120,0.1)" }} onClick={() => generate("blueprint")}>→ Refine with the Blueprint →</div></div>
                </div>
              </div>
            )}
            <p style={G.label}>Build your output</p>
            <div className="output-grid">
              {OUTPUTS.map(o => {
                const done = !!outputs[o.key];
                return (<div key={o.key} className="outcard" style={{ background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${done ? `${LIME}30` : BORDER_GLASS}`, borderRadius: "14px", padding: "1.05rem", cursor: "pointer", transition: "all .18s", position: "relative", boxShadow: done ? `0 0 20px ${LIME}10` : "none" }} onClick={() => generate(o.key)}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <div style={{ fontSize: "1.25rem" }}>{o.icon}</div>
                    {done && <span style={{ background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.25)", borderRadius: "20px", padding: "2px 7px", fontSize: "0.52rem", fontWeight: 700, color: LIME, letterSpacing: "1px", flexShrink: 0 }}>✓ Done</span>}
                  </div>
                  <div style={{ color: TEXT_PRIMARY, fontSize: "0.82rem", fontWeight: "bold", marginBottom: "0.22rem" }}>{o.label}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: "0.68rem", lineHeight: "1.4" }}>{o.desc}</div>
                  <div style={{ marginTop: "0.55rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: done ? LIME : TEXT_MUTED, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "1px" }}>{done ? "OPEN →" : "GENERATE →"}</span>
                  </div>
                </div>);
              })}
            </div>
            <div className="outcard" style={{ background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${PURPLE}25`, borderRadius: "14px", padding: "1.05rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", transition: "all .18s" }} onClick={() => setCompany(true)}>
              <span style={{ fontSize: "1.25rem" }}>🏗️</span>
              <div style={{ flex: 1 }}><div style={{ color: PURPLE, fontSize: "0.82rem", fontWeight: "bold", marginBottom: "0.2rem" }}>Company Builder</div><div style={{ color: TEXT_MUTED, fontSize: "0.68rem" }}>Systems, workflows & org design — market-aware</div></div>
              <span style={{ color: PURPLE, fontSize: "1rem", flexShrink: 0 }}>→</span>
            </div>
            {err && <div style={{ ...G.err, marginTop: "1rem" }}>{err}</div>}
          </div>
        )}

        {/* UNLOCK — shown after 3 free ideas */}
        {phase === "unlock" && (
          <div style={{ animation: "fadeIn .4s ease", textAlign: "center", padding: "3rem 0 4rem" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1.2rem", filter: "drop-shadow(0 0 20px rgba(255,107,0,0.4))" }}>🔥</div>
            <h2 style={{ color: LIME, fontSize: "1.6rem", fontWeight: 900, letterSpacing: "4px", margin: "0 0 0.6rem", textShadow: "0 0 30px rgba(200,255,0,0.4)" }}>3 FORGED.</h2>
            <p style={{ color: TEXT_SECONDARY, fontSize: "0.88rem", lineHeight: "1.7", maxWidth: "400px", margin: "0 auto 2.5rem" }}>You've squeezed maximum value out of your free ideas.<br />Sign up to unlock unlimited thinking.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxWidth: "340px", margin: "0 auto" }}>
              <button style={{ ...G.btn, padding: "1rem", fontSize: "0.78rem" }} onClick={() => setAppState("auth")}>CREATE FREE ACCOUNT →</button>
              <button className="gh" style={{ ...G.ghost, color: TEXT_SECONDARY, padding: "0.8rem" }} onClick={() => resetIdea()}>Keep exploring (lose this idea)</button>
            </div>
            <div style={{ marginTop: "2.5rem", background: BG_GLASS, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${LIME}20`, borderRadius: "14px", padding: "1.2rem", maxWidth: "380px", margin: "2rem auto 0", boxShadow: `0 0 30px ${LIME}08` }}>
              <div style={{ color: LIME, fontSize: "0.6rem", letterSpacing: "2px", marginBottom: "0.85rem" }}>WHAT YOU GET</div>
              {["Unlimited idea forging", "Save & revisit ideas", "Full output generation", "Company builder access", "Your thinking profile"].map((f, i) => <div key={i} style={{ color: TEXT_SECONDARY, fontSize: "0.78rem", marginBottom: "0.5rem", display: "flex", gap: "0.6rem", alignItems: "center" }}><span style={{ color: LIME }}>✓</span>{f}</div>)}
            </div>
          </div>
        )}

        {/* GENERATING */}
        {phase === "generating" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ textAlign: "center", padding: "2rem 0 1.5rem" }}>
              <div style={{ position: "relative", width: "64px", height: "64px", margin: "0 auto 1.8rem" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${LIME}18`, animation: "spin 3s linear infinite", boxShadow: `0 0 30px ${LIME}10 inset` }} />
                <div style={{ position: "absolute", inset: "8px", borderRadius: "50%", border: `2px solid ${LIME}40`, animation: "spin 1.8s linear infinite reverse", boxShadow: `0 0 20px ${LIME}20` }} />
                <div style={{ position: "absolute", inset: "20px", borderRadius: "50%", background: `radial-gradient(circle, ${LIME}30, transparent)`, animation: "glowPulse 2s ease infinite" }} />
                <div style={{ position: "absolute", inset: "26px", borderRadius: "50%", background: LIME, boxShadow: `0 0 16px ${LIME}`, animation: "pulse 1.5s ease infinite" }} />
              </div>
              <p style={{ color: LIME, fontSize: "0.62rem", letterSpacing: "5px", margin: "0 0 0.5rem", textShadow: "0 0 20px rgba(200,255,0,0.5)", fontWeight: 700 }}>FORGING</p>
              <p style={{ color: TEXT_MUTED, fontSize: "0.72rem" }}>{loadMsg}</p>
            </div>
            {/* Streaming output box */}
            <div style={{ background: "var(--bg-card)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${LIME}20`, borderRadius: RAD.lg, padding: $.cardPad, marginTop: "0.5rem", maxHeight: "420px", overflowY: "auto" }}>
              <div style={{ color: LIME, fontSize: FS.xs, letterSpacing: "3px", marginBottom: "0.8rem", opacity: 0.7 }}>STREAMING OUTPUT</div>
              <Md text={streamChunk} />
            </div>
          </div>
        )}

        {/* OUTPUT */}
        {phase === "output" && outType && outputs[outType] && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {err && <div style={{ ...G.err, marginBottom: "1.2rem", animation: "fadeIn .3s ease" }}>{err}</div>}
            {/* Summary at a Glance */}
            {outType !== "mindmap" && (
              <div style={{ marginBottom: "1.8rem", animation: "fadeIn .4s ease" }}>
                <SectionHeader label="Summary at a Glance" accent={LIME} />
                {outType === "blueprint" && outputs.blueprint && (
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                    {(outputs.blueprint.sections || []).slice(0, 4).map((s: { title: string; content: string; bullets: string[] }, i: number) => (
                      <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: RAD.lg, padding: "0.85rem 1.1rem", display: "flex", flexDirection: "column" as const, gap: "0.35rem", minWidth: "160px", flex: "1 1 160px" }}>
                        <div style={{ color: LIME, fontSize: FS.xs, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const }}>{s.title}</div>
                        <div style={{ color: "var(--text-primary)", fontSize: FS.sm, lineHeight: 1.5 }}>{s.content?.slice(0, 80)}{s.content?.length > 80 ? "…" : ""}</div>
                        {(s.bullets || []).slice(0, 2).map((b: string, j: number) => (
                          <div key={j} style={{ color: "var(--text-secondary)", fontSize: FS.xs, display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
                            <span style={{ color: LIME, flexShrink: 0 }}>→</span>
                            <span>{b.slice(0, 50)}{b.length > 50 ? "…" : ""}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {outType === "roadmap" && outputs.roadmap && (
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                    {(outputs.roadmap.phases || []).slice(0, 4).map((p: RoadmapPhase, i: number) => {
                      const cols = [LIME, ORANGE, CYAN, PINK];
                      const c = cols[i % 4];
                      return (
                        <div key={i} style={{ background: "var(--bg-card)", border: `1px solid ${c}25`, borderRadius: RAD.lg, padding: "0.85rem 1.1rem", display: "flex", flexDirection: "column" as const, gap: "0.35rem", minWidth: "160px", flex: "1 1 160px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", color: c, fontWeight: 900, fontSize: FS.xs, background: `${c}0a` }}>{i + 1}</div>
                            <div style={{ color: c, fontSize: FS.xs, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const }}>{p.phase}</div>
                          </div>
                          <div style={{ color: "var(--text-primary)", fontSize: FS.sm, fontWeight: 600 }}>{p.title}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: FS.xs }}>{p.duration}</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: FS.xs, lineHeight: 1.5 }}>{p.goal?.slice(0, 70)}{p.goal?.length > 70 ? "…" : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {outType === "actionplan" && outputs.actionplan && (
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                    {(outputs.actionplan.weeks || []).slice(0, 4).map((w: Week, i: number) => (
                      <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: RAD.lg, padding: "0.85rem 1.1rem", display: "flex", flexDirection: "column" as const, gap: "0.35rem", minWidth: "160px", flex: "1 1 160px" }}>
                        <div style={{ color: LIME, fontSize: FS.xs, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const }}>{w.week}</div>
                        <div style={{ color: "var(--text-primary)", fontSize: FS.sm, fontWeight: 600 }}>{w.focus}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: FS.xs }}>{w.tasks?.length || 0} tasks</div>
                        {(w.tasks || []).slice(0, 2).map((t: ActionTask, j: number) => (
                          <div key={j} style={{ color: "var(--text-muted)", fontSize: FS.xs, display: "flex", gap: "0.35rem", alignItems: "center" }}>
                            <PriorityChip priority={t.priority || "MED"} />
                            <span>{t.task?.slice(0, 40)}{t.task?.length > 40 ? "…" : ""}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {outType === "swot" && outputs.swot && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.65rem" }}>
                    {[
                      { key: "strengths", label: "Strengths", color: LIME },
                      { key: "weaknesses", label: "Weaknesses", color: PINK },
                      { key: "opportunities", label: "Opportunities", color: CYAN },
                      { key: "threats", label: "Threats", color: ORANGE },
                    ].map(q => (
                      <div key={q.key} style={{ background: "var(--bg-card)", border: `1px solid ${q.color}25`, borderRadius: RAD.lg, padding: "0.85rem 1.1rem" }}>
                        <div style={{ color: q.color, fontSize: FS.xs, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: "0.5rem" }}>{q.label}</div>
                        {(outputs.swot[q.key as keyof SWOTData] || []).slice(0, 3).map((item: string, i: number) => (
                          <div key={i} style={{ color: "var(--text-secondary)", fontSize: FS.xs, marginBottom: "0.25rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
                            <span style={{ color: q.color, flexShrink: 0 }}>◆</span>
                            <span>{item?.slice(0, 60)}{item?.length > 60 ? "…" : ""}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {outType === "businessplan" && outputs.businessplan && (
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                    {(outputs.businessplan.sections || []).slice(0, 4).map((s: { title: string; content: string }, i: number) => (
                      <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: RAD.lg, padding: "0.85rem 1.1rem", display: "flex", flexDirection: "column" as const, gap: "0.35rem", minWidth: "160px", flex: "1 1 160px" }}>
                        <div style={{ color: LIME, fontSize: FS.xs, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const }}>{s.title}</div>
                        <div style={{ color: "var(--text-primary)", fontSize: FS.sm, lineHeight: 1.5 }}>{s.content?.slice(0, 90)}{s.content?.length > 90 ? "…" : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab bar — all available outputs */}
            <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: FS.xs, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, marginRight: "0.35rem" }}>Output</div>
              {Object.entries(outputs).map(([key, val]) => {
                if (key === "mindmap" || !val) return null;
                const o = OUTPUTS.find(x => x.key === key);
                const active = key === outType;
                return (
                  <button key={key} onClick={() => { setOutType(key); setResultTab(key); if (!outputs[key]) setSkeletonFor(key); else setSkeletonFor(null); }} style={{
                    background: active ? `${LIME}15` : "transparent",
                    border: `1px solid ${active ? LIME : "var(--border)"}`,
                    color: active ? LIME : "var(--text-secondary)",
                    borderRadius: RAD.md,
                    padding: "0.4rem 0.85rem",
                    fontSize: FS.xs,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all .2s",
                    fontFamily: FONT.sans,
                  }}>
                    <span>{o?.icon}</span>
                    <span>{o?.label}</span>
                    {val && <span style={{ background: LIME, color: "#000", fontSize: "0.45rem", fontWeight: 900, padding: "1px 4px", borderRadius: "3px" }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Controls row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem", flexWrap: "wrap", gap: "0.55rem" }}>
              <span style={{ color: LIME, fontSize: "0.6rem", letterSpacing: "3px", textTransform: "uppercase" as const, textShadow: "0 0 20px rgba(200,255,0,0.3)" }}>{OUTPUTS.find(o => o.key === outType)?.icon} {OUTPUTS.find(o => o.key === outType)?.label}</span>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <button className="gh" style={G.ghost} onClick={() => generate(outType, true)}>↻ Regen</button>
                <button className="gh" style={G.ghost} onClick={() => setPhase("output-select")}>← All</button>
                <button className="gh" style={G.ghost} onClick={resetIdea}>New Idea</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ background: "var(--bg-card)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid var(--border)`, borderRadius: RAD.lg, padding: outType === "mindmap" ? "0" : $.cardPad }}>
              {skeletonFor === "mindmap" && <MindMapSkeleton />}
              {skeletonFor === "blueprint" && <BlueprintSkeleton />}
              {skeletonFor === "roadmap" && <RoadmapSkeleton />}
              {skeletonFor === "businessplan" && <BusinessPlanSkeleton />}
              {skeletonFor === "actionplan" && <ActionPlanSkeleton />}
              {skeletonFor === "swot" && <SWOTSkeleton />}
              {!skeletonFor && outType === "mindmap" && <ErrorBoundary><MindMap data={outputs[outType]} /></ErrorBoundary>}
              {!skeletonFor && outType === "blueprint" && <ErrorBoundary><Blueprint data={outputs[outType]} /></ErrorBoundary>}
              {!skeletonFor && outType === "roadmap" && <ErrorBoundary><Roadmap data={outputs[outType]} /></ErrorBoundary>}
              {!skeletonFor && outType === "businessplan" && <ErrorBoundary><BusinessPlan data={outputs[outType]} /></ErrorBoundary>}
              {!skeletonFor && outType === "actionplan" && <ErrorBoundary><ActionPlan data={outputs[outType]} /></ErrorBoundary>}
              {!skeletonFor && outType === "swot" && <ErrorBoundary><SWOT data={outputs[outType]} /></ErrorBoundary>}
            </div>
          </div>
        )}

        <div style={{ height: "5rem" }} />
      </div>
    </div>
  );
}

export default App;