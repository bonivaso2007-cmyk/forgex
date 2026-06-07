
import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// Free AI via Groq - https://console.groq.com/
// Get your free API key there, no credit card needed
const GROQ_API_KEY = "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"; // <-- Put your key here
const API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // Free, fast, excellent quality
const Q_TARGET = 6;
const LIME = "#C8FF00";
const PURPLE = "#B87FFF";
const ORANGE = "#FF6B00";
const PINK = "#FF3C78";
const CYAN = "#00D4FF";
const BRANCH_COLORS = [LIME, ORANGE, CYAN, PINK, PURPLE, "#00FFB2"];

// ── STORAGE ───────────────────────────────────────────────
const store = {
  async get(k) {
    try { const r = await window.storage.get(k); if (!r?.value) return null; return JSON.parse(r.value); } catch { return null; }
  },
  async set(k, v) {
    try { await window.storage.set(k, JSON.stringify(v)); } catch {}
  },
  async del(k) {
    try { await window.storage.delete(k); } catch {}
  },
  async list(prefix) {
    try { const r = await window.storage.list(prefix); return r?.keys || []; } catch { return []; }
  }
};

// ── API ───────────────────────────────────────────────────
async function aiStream(system, user, onChunk, maxTok = 1400) {
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY - add your key at line 5");
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTok,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      stream: true
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value, { stream: true }).split("\n")) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const d = JSON.parse(raw);
        const t = d?.choices?.[0]?.delta?.content;
        if (t && typeof t === "string") { full += t; onChunk(full); }
      } catch { /* ignore malformed chunks */ }
    }
  }
  return full;
}

async function ai(sys, usr, asJSON = false, maxTok = 1400, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      let full = "";
      await aiStream(sys, usr, t => { full = t; }, maxTok);
      if (!full) throw new Error("Empty");
      if (!asJSON) return full;
      let s = full.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const st = s.indexOf("{"), en = s.lastIndexOf("}");
      if (st === -1 || en === -1) throw new Error("No JSON");
      s = s.slice(st, en + 1).replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      return JSON.parse(s);
    } catch (e) { if (i === retries) throw e; await new Promise(r => setTimeout(r, 400 * (i + 1))); }
  }
}

// ── MARKDOWN ──────────────────────────────────────────────
function Md({ text }) {
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
function profileContext(p) {
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

function marketContext(p) {
  if (!p) return "";
  const isAfrica = ["Tanzania","Kenya","Uganda","Nigeria","Ghana","Rwanda","Ethiopia","Zambia","Mozambique","Senegal","Côte d'Ivoire","South Africa"].some(c => p.country?.includes(c));
  const isEmerging = isAfrica || ["India","Bangladesh","Pakistan","Indonesia","Philippines","Vietnam","Cambodia"].some(c => p.country?.includes(c));
  if (isAfrica) return `MARKET CONTEXT: East/Sub-Saharan Africa. Mobile-first. M-PESA and mobile money dominant. 2G/3G infrastructure in rural areas. SACCOs, MFIs, informal economy key. Limited cloud infrastructure. Low average income. High mobile penetration. Regulatory environment: fintech needs BoT/CBK approval. Think USSD before apps. Cash-heavy economy transitioning to mobile money.`;
  if (isEmerging) return `MARKET CONTEXT: Emerging market. Mobile-first. Infrastructure constraints. Price-sensitive customers. Think lightweight, offline-capable solutions.`;
  return `MARKET CONTEXT: Developed market. Standard SaaS infrastructure applies.`;
}

// ── AUTH SCREENS ──────────────────────────────────────────
function AuthScreen({ onAuth }) {
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
      const user = { uid, email: email.toLowerCase(), name: name.trim(), passwordHash: btoa(password), createdAt: Date.now() };
      await store.set(`user:${uid}`, user);
      await store.set(`session`, { uid, email: user.email, name: user.name });
      onAuth(user, true);
    } else {
      const user = await store.get(`user:${uid}`);
      if (!user || user.passwordHash !== btoa(password)) { setErr("Invalid email or password."); setLoading(false); return; }
      await store.set(`session`, { uid, email: user.email, name: user.name });
      onAuth(user, false);
    }
    setLoading(false);
  };

  const inp = { width: "100%", background: "#0b0b0b", border: "1px solid #1e1e1e", borderRadius: "7px", color: "#f0f0f0", fontSize: "0.9rem", padding: "0.85rem 1rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "monospace" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ color: LIME, fontSize: "2rem", fontWeight: "900", letterSpacing: "7px", margin: "0 0 4px" }}>FORGE</h1>
        <p style={{ color: "#1e1e1e", fontSize: "0.58rem", letterSpacing: "3px", margin: "0 0 2.5rem" }}>IDEA ENGINE FOR FOUNDERS</p>
        <div style={{ display: "flex", gap: "0", marginBottom: "1.8rem", border: "1px solid #181818", borderRadius: "7px", overflow: "hidden" }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, background: mode === m ? LIME : "transparent", color: mode === m ? "#000" : "#333", border: "none", padding: "0.72rem", fontSize: "0.7rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace", textTransform: "uppercase", transition: "all .2s" }}>{m}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {mode === "signup" && <input style={inp} placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
          <input style={inp} placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} onKeyDown={e => e.key === "Enter" && submit()} />
          <input style={inp} placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <div style={{ color: PINK, fontSize: "0.74rem", marginTop: "0.75rem", background: "#FF3C780d", border: "1px solid #FF3C7818", borderRadius: "5px", padding: "0.55rem 0.85rem" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", background: LIME, color: "#000", border: "none", borderRadius: "7px", padding: "0.9rem", fontSize: "0.73rem", fontWeight: "900", letterSpacing: "2.5px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace", marginTop: "1.2rem", opacity: loading ? 0.5 : 1 }}>
          {loading ? "…" : mode === "login" ? "LOG IN →" : "CREATE ACCOUNT →"}
        </button>
        <p style={{ color: "#1e1e1e", fontSize: "0.62rem", textAlign: "center", marginTop: "1.2rem" }}>Your ideas stay private. No data leaves this app.</p>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────
function Onboarding({ user, onDone }) {
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
    <div style={{ minHeight: "100vh", background: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "monospace" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ color: LIME, fontSize: "0.9rem", fontWeight: "900", letterSpacing: "5px" }}>FORGE</span>
          <span style={{ color: "#222", fontSize: "0.6rem" }}>{step + 1} / {steps.length}</span>
        </div>
        <div style={{ height: "2px", background: "#111", borderRadius: "2px", marginBottom: "3rem", overflow: "hidden" }}>
          <div style={{ height: "100%", background: LIME, width: `${progress}%`, transition: "width .4s ease", borderRadius: "2px" }} />
        </div>
        <p style={{ color: "#222", fontSize: "0.6rem", letterSpacing: "3px", margin: "0 0 0.6rem", textTransform: "uppercase" }}>Building your founder profile</p>
        <p style={{ color: "#e8e8e8", fontSize: "1.15rem", margin: "0 0 2rem", fontWeight: "300", lineHeight: "1.7" }}>{cur.label}</p>
        {cur.type === "input" && (
          <input style={{ width: "100%", background: "#0b0b0b", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "1rem", padding: "1rem 1.1rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
            placeholder={cur.placeholder} value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && val.trim() && next()} autoFocus />
        )}
        {cur.type === "textarea" && (
          <textarea style={{ width: "100%", background: "#0b0b0b", border: "1px solid #1e1e1e", borderRadius: "8px", color: "#f0f0f0", fontSize: "0.95rem", padding: "1rem 1.1rem", outline: "none", fontFamily: "monospace", lineHeight: "1.7", height: "100px", resize: "none", boxSizing: "border-box" }}
            placeholder={cur.placeholder} value={val} onChange={e => setVal(e.target.value)} autoFocus />
        )}
        {cur.type === "choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {cur.options.map(o => (
              <button key={o} onClick={() => setVal(o)} style={{ background: val === o ? `${LIME}15` : "#0a0a0a", border: `1px solid ${val === o ? LIME : "#1e1e1e"}`, borderRadius: "8px", padding: "0.85rem 1.1rem", color: val === o ? LIME : "#888", fontFamily: "monospace", fontSize: "0.85rem", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>{o}</button>
            ))}
          </div>
        )}
        <button onClick={next} disabled={!val.trim() || loading}
          style={{ background: LIME, color: "#000", border: "none", borderRadius: "7px", padding: "0.85rem 2rem", fontSize: "0.72rem", fontWeight: "900", letterSpacing: "2.5px", cursor: !val.trim() ? "not-allowed" : "pointer", fontFamily: "monospace", marginTop: "1.5rem", opacity: !val.trim() ? 0.25 : 1 }}>
          {loading ? "SAVING…" : step === steps.length - 1 ? "ENTER FORGE →" : "NEXT →"}
        </button>
      </div>
    </div>
  );
}

// ── PROFILE PANEL ─────────────────────────────────────────
function ProfilePanel({ profile, user, onUpdate, onLogout, onClose }) {
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
    <div style={{ position: "fixed", inset: 0, background: "#00000095", zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(500px,100vw)", background: "#080808", borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.5rem", borderBottom: "1px solid #111", flexShrink: 0 }}>
          <div>
            <div style={{ color: LIME, fontSize: "0.72rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>FOUNDER PROFILE</div>
            <div style={{ color: "#1e1e1e", fontSize: "0.55rem", letterSpacing: "1.5px", fontFamily: "monospace", marginTop: "2px" }}>{profile.name?.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {editing
              ? <button onClick={save} style={{ background: LIME, color: "#000", border: "none", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", fontWeight: "bold" }}>SAVE</button>
              : <button onClick={() => setEditing(true)} style={{ background: "transparent", border: `1px solid ${LIME}30`, color: LIME, borderRadius: "5px", padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>EDIT</button>
            }
            <button onClick={onClose} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {/* score badge */}
          <div style={{ background: "#0a0a0a", border: `1px solid ${LIME}15`, borderRadius: "10px", padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
            <div style={{ color: "#333", fontSize: "0.58rem", letterSpacing: "2.5px", marginBottom: "0.4rem" }}>FOUNDER IDENTITY</div>
            <div style={{ color: "#e0e0e0", fontSize: "0.88rem", lineHeight: "1.65", fontFamily: "monospace" }}>{profile.bio}</div>
          </div>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: "1.1rem" }}>
              <div style={{ color: "#252525", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2.5px", marginBottom: "0.3rem", fontFamily: "monospace" }}>{f.label}</div>
              {editing
                ? <textarea style={{ width: "100%", background: "#0b0b0b", border: "1px solid #1e1e1e", borderRadius: "6px", color: "#f0f0f0", fontSize: "0.83rem", padding: "0.6rem 0.8rem", outline: "none", fontFamily: "monospace", lineHeight: "1.6", minHeight: "42px", resize: "vertical", boxSizing: "border-box" }}
                  value={draft[f.key] || ""} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} />
                : <div style={{ color: "#888", fontSize: "0.83rem", lineHeight: "1.6", fontFamily: "monospace" }}>{profile[f.key] || "—"}</div>
              }
            </div>
          ))}
          <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #FF3C7825", color: PINK, borderRadius: "6px", padding: "0.65rem 1.2rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem", marginTop: "1rem", width: "100%" }}>LOG OUT</button>
        </div>
      </div>
    </div>
  );
}

// ── IDEA HISTORY PANEL ────────────────────────────────────
function HistoryPanel({ uid, onLoad, onClose }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const keys = await store.list(`idea:${uid}:`);
      const items = await Promise.all(keys.map(k => store.get(k)));
      setIdeas(items.filter(Boolean).sort((a, b) => b.savedAt - a.savedAt));
      setLoading(false);
    })();
  }, [uid]);

  const del = async (id) => {
    await store.del(`idea:${uid}:${id}`);
    setIdeas(p => p.filter(x => x.id !== id));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000095", zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(480px,100vw)", background: "#080808", borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.5rem", borderBottom: "1px solid #111", flexShrink: 0 }}>
          <div style={{ color: LIME, fontSize: "0.72rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>IDEA VAULT</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.68rem" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.2rem 1.5rem" }}>
          {loading && <div style={{ color: "#222", fontSize: "0.72rem", fontFamily: "monospace" }}>Loading…</div>}
          {!loading && ideas.length === 0 && <div style={{ color: "#222", fontSize: "0.8rem", fontFamily: "monospace" }}>No saved ideas yet. Start one and it'll appear here.</div>}
          {ideas.map(idea => (
            <div key={idea.id} style={{ background: "#0a0a0a", border: "1px solid #151515", borderRadius: "10px", padding: "1rem 1.1rem", marginBottom: "0.75rem" }}>
              <div style={{ color: "#e0e0e0", fontSize: "0.85rem", marginBottom: "0.35rem", fontFamily: "monospace", lineHeight: "1.5" }}>{idea.text?.slice(0, 100)}{idea.text?.length > 100 ? "…" : ""}</div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {idea.score && <span style={{ color: idea.score >= 80 ? LIME : idea.score >= 60 ? ORANGE : PINK, fontSize: "0.62rem", border: `1px solid currentColor`, padding: "1px 7px", borderRadius: "3px", opacity: 0.8 }}>{idea.score} — {idea.label}</span>}
                <span style={{ color: "#222", fontSize: "0.6rem", fontFamily: "monospace" }}>{new Date(idea.savedAt).toLocaleDateString()}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => { onLoad(idea); onClose(); }} style={{ background: `${LIME}12`, border: `1px solid ${LIME}25`, color: LIME, borderRadius: "4px", padding: "3px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem" }}>LOAD</button>
                  <button onClick={() => del(idea.id)} style={{ background: "transparent", border: "1px solid #FF3C7818", color: PINK, borderRadius: "4px", padding: "3px 8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── REALITY CHECK ─────────────────────────────────────────
function RealityCheck({ idea, qa, profile, onProceed, onBack }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(true);
  const [talked, setTalked] = useState(null);

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
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: ORANGE, animation: loading ? "pulse 1s infinite" : "none", flexShrink: 0 }} />
        <span style={{ color: ORANGE, fontSize: "0.68rem", letterSpacing: "3px" }}>{loading ? "RUNNING REALITY CHECK…" : "REALITY CHECK COMPLETE"}</span>
      </div>
      <div style={{ background: "#0a0a0a", border: `1px solid ${ORANGE}20`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <Md text={result} />
      </div>
      {!loading && (
        <>
          <div style={{ background: "#0a0a0a", border: "1px solid #181818", borderRadius: "10px", padding: "1.2rem", marginBottom: "1.5rem" }}>
            <p style={{ color: "#e0e0e0", fontSize: "0.9rem", margin: "0 0 1rem", fontWeight: "300" }}>Have you spoken to at least one real potential customer about this idea?</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {["Yes, I have", "Not yet"].map(o => (
                <button key={o} onClick={() => setTalked(o)} style={{ flex: 1, background: talked === o ? (o.startsWith("Yes") ? `${LIME}15` : `${PINK}12`) : "#0d0d0d", border: `1px solid ${talked === o ? (o.startsWith("Yes") ? LIME : PINK) : "#1e1e1e"}`, borderRadius: "7px", padding: "0.75rem", color: talked === o ? (o.startsWith("Yes") ? LIME : PINK) : "#555", fontFamily: "monospace", fontSize: "0.8rem", cursor: "pointer", transition: "all .15s" }}>{o}</button>
              ))}
            </div>
            {talked === "Not yet" && <p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.75rem", lineHeight: "1.6" }}>⚠ No real conversations = unvalidated assumptions. The outputs will still generate but treat them as hypotheses, not facts. Your #1 action after this: talk to one real person.</p>}
          </div>
          {talked && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onProceed} style={{ background: LIME, color: "#000", border: "none", borderRadius: "6px", padding: "0.82rem 1.8rem", fontSize: "0.72rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace" }}>BUILD OUTPUTS →</button>
              <button onClick={onBack} style={{ background: "transparent", color: "#333", border: "1px solid #1e1e1e", borderRadius: "6px", padding: "0.82rem 1.2rem", fontSize: "0.7rem", cursor: "pointer", fontFamily: "monospace" }}>← BACK</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── MIND MAP ──────────────────────────────────────────────
function MindMap({ data }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const W = 1100, H = 720, cx = W / 2, cy = H / 2, bR = 210, nR = 125;
  const branches = (data.branches || []).slice(0, 6);
  const N = branches.length;

  const wrap = (txt, max) => {
    if (!txt) return [""];
    const words = String(txt).split(" "); const lines = []; let cur = "";
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

  const onMouseDown = e => { if (e.button !== 0) return; setDragging(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); };
  const onMouseMove = e => { if (!dragging || !dragStart) return; setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })); };
  const onMouseUp = () => { setDragging(false); setDragStart(null); };
  const onWheel = useCallback(e => { e.preventDefault(); setTransform(t => ({ ...t, scale: Math.min(Math.max(t.scale * (e.deltaY > 0 ? 0.92 : 1.09), 0.3), 3) })); }, []);

  useEffect(() => { const el = svgRef.current; if (!el) return; el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel); }, []);

  return (
    <div style={{ position: "relative", background: "#060606", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "5px", zIndex: 10 }}>
        {[["＋", () => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))], ["－", () => setTransform(t => ({ ...t, scale: Math.max(t.scale * 0.83, 0.3) }))], ["⊡", () => setTransform({ x: 0, y: 0, scale: 0.75 })], ["↺", () => setTransform({ x: 0, y: 0, scale: 1 })]].map(([l, a], i) => (
          <button key={i} onClick={a} style={{ background: "#111", border: "1px solid #222", color: "#555", borderRadius: "4px", width: "26px", height: "26px", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#555"; }}>{l}</button>
        ))}
      </div>
      {selected && <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "#0d0d0d", border: `1px solid ${LIME}25`, borderRadius: "6px", padding: "5px 10px", zIndex: 10 }}><div style={{ color: LIME, fontSize: "0.55rem", letterSpacing: "2px", marginBottom: "1px" }}>SELECTED</div><div style={{ color: "#ccc", fontSize: "0.72rem", fontFamily: "monospace" }}>{selected}</div></div>}
      <div style={{ position: "absolute", bottom: "10px", left: "10px", color: "#1a1a1a", fontSize: "0.55rem", fontFamily: "monospace", zIndex: 10 }}>drag · scroll to zoom · click to highlight</div>
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
                  <rect x={nx - 52} y={ny - bh / 2} width={104} height={bh} rx={6} fill={selected === nk ? `${color}20` : "#0e0e0e"} stroke={color} strokeWidth={nActive ? 1.2 : 0.7} strokeOpacity={nActive ? 0.9 : 0.45} style={{ transition: "all .2s", cursor: "pointer", filter: selected === nk ? `drop-shadow(0 0 4px ${color})` : "none" }} onClick={() => setSelected(selected === nk ? null : nk)} onMouseEnter={() => setHovered(nk)} onMouseLeave={() => setHovered(null)} />
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

// ── OUTPUT RENDERERS (compact) ────────────────────────────
function Blueprint({ data }) {
  return (<div style={{ fontFamily: "monospace" }}><h2 style={{ color: LIME, fontSize: "1.3rem", margin: "0 0 5px" }}>{data.title}</h2><p style={{ color: "#444", fontSize: "0.84rem", margin: "0 0 1.8rem", fontStyle: "italic", lineHeight: "1.65" }}>{data.vision}</p>{(data.sections || []).map((s, i) => (<div key={i} style={{ marginBottom: "1.4rem", paddingLeft: "1rem", borderLeft: `2px solid ${LIME}22` }}><div style={{ color: LIME, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "0.3rem" }}>{s.title}</div><p style={{ color: "#c8c8c8", fontSize: "0.84rem", lineHeight: "1.72", margin: "0 0 0.4rem" }}>{s.content}</p>{(s.bullets || []).map((b, j) => (<div key={j} style={{ color: "#555", fontSize: "0.77rem", marginBottom: "0.18rem", paddingLeft: "0.75rem" }}>→ {b}</div>))}</div>))}</div>);
}

function Roadmap({ data }) {
  const cols = [LIME, ORANGE, CYAN, PINK];
  return (<div style={{ fontFamily: "monospace" }}><h2 style={{ color: LIME, fontSize: "1.3rem", margin: "0 0 1.8rem" }}>{data.title}</h2>{(data.phases || []).map((p, i) => { const c = cols[i % 4]; return (<div key={i} style={{ display: "flex", gap: "1.3rem", marginBottom: "2rem" }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "48px" }}><div style={{ width: "44px", height: "44px", borderRadius: "50%", border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", color: c, fontWeight: "900", fontSize: "1rem", background: `${c}0a` }}>{i + 1}</div><div style={{ color: c, fontSize: "0.57rem", marginTop: "4px", textAlign: "center" }}>{p.duration}</div></div><div style={{ flex: 1, borderLeft: `1px solid ${c}18`, paddingLeft: "1.3rem" }}><div style={{ color: c, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "2.5px" }}>{p.phase}</div><div style={{ color: "#f0f0f0", fontSize: "0.95rem", fontWeight: "bold", margin: "3px 0 7px" }}>{p.title}</div><div style={{ color: "#888", fontSize: "0.81rem", marginBottom: "0.7rem", lineHeight: "1.6" }}>{p.goal}</div>{(p.milestones || []).map((m, j) => <div key={j} style={{ color: "#444", fontSize: "0.76rem", marginBottom: "0.18rem" }}>✓ {m}</div>)}{(p.kpis || []).length > 0 && <div style={{ marginTop: "0.55rem", display: "flex", flexWrap: "wrap", gap: "4px" }}>{p.kpis.map((k, j) => <span key={j} style={{ background: `${c}0f`, border: `1px solid ${c}28`, color: c, fontSize: "0.63rem", padding: "2px 7px", borderRadius: "3px" }}>{k}</span>)}</div>}</div></div>); })}</div>);
}

function BusinessPlan({ data }) {
  return (<div style={{ fontFamily: "monospace" }}><h2 style={{ color: LIME, fontSize: "1.3rem", margin: "0 0 4px" }}>{data.title}</h2><p style={{ color: ORANGE, fontSize: "0.88rem", margin: "0 0 1.6rem", fontStyle: "italic" }}>{data.oneliner}</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>{(data.sections || []).map((s, i, arr) => (<div key={i} style={{ background: "#0a0a0a", border: "1px solid #161616", borderRadius: "8px", padding: "0.85rem", gridColumn: (i === 0 || i === arr.length - 1) ? "1/-1" : "auto" }}><div style={{ color: LIME, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "2.5px", marginBottom: "0.4rem" }}>{s.title}</div><p style={{ color: "#bbb", fontSize: "0.81rem", lineHeight: "1.68", margin: 0 }}>{s.content}</p></div>))}</div></div>);
}

function ActionPlan({ data }) {
  const pc = { HIGH: PINK, MED: ORANGE, LOW: LIME };
  const [done, setDone] = useState({});
  return (<div style={{ fontFamily: "monospace" }}><h2 style={{ color: LIME, fontSize: "1.3rem", margin: "0 0 1.8rem" }}>{data.title}</h2>{(data.weeks || []).map((w, i) => (<div key={i} style={{ marginBottom: "1.8rem" }}><div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.6rem", paddingBottom: "0.4rem", borderBottom: "1px solid #111" }}><span style={{ color: LIME, fontWeight: "bold", fontSize: "0.76rem" }}>{w.week}</span><span style={{ color: "#222", fontSize: "0.68rem" }}>— {w.focus}</span></div>{(w.tasks || []).map((t, j) => { const p = (t.priority || "MED").toUpperCase().slice(0, 3); const c = pc[p] || "#888"; const k = `${i}-${j}`; const isDone = done[k]; return (<div key={j} onClick={() => setDone(d => ({ ...d, [k]: !d[k] }))} style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start", background: "#0a0a0a", border: `1px solid ${isDone ? LIME + "18" : "#111"}`, borderRadius: "6px", padding: "0.65rem 0.85rem", marginBottom: "0.32rem", cursor: "pointer", transition: "all .18s", opacity: isDone ? 0.45 : 1 }}><span style={{ color: c, fontSize: "0.56rem", fontWeight: "bold", border: `1px solid ${c}`, padding: "2px 5px", borderRadius: "3px", minWidth: "26px", textAlign: "center", flexShrink: 0, marginTop: "2px" }}>{p}</span><div style={{ flex: 1 }}><div style={{ color: isDone ? "#555" : "#eee", fontSize: "0.82rem", marginBottom: "0.15rem", textDecoration: isDone ? "line-through" : "none" }}>{t.task}</div><div style={{ color: "#252525", fontSize: "0.71rem" }}>→ {t.outcome}</div></div><span style={{ color: isDone ? LIME : "#1a1a1a", fontSize: "0.88rem", flexShrink: 0 }}>{isDone ? "✓" : "○"}</span></div>); })}</div>))}</div>);
}

function SWOT({ data }) {
  const quads = [{ key: "strengths", label: "Strengths", color: LIME, icon: "↑" }, { key: "weaknesses", label: "Weaknesses", color: PINK, icon: "↓" }, { key: "opportunities", label: "Opportunities", color: CYAN, icon: "→" }, { key: "threats", label: "Threats", color: ORANGE, icon: "⚠" }];
  return (<div style={{ fontFamily: "monospace" }}><h2 style={{ color: LIME, fontSize: "1.3rem", margin: "0 0 4px" }}>{data.title}</h2><p style={{ color: "#333", fontSize: "0.78rem", margin: "0 0 1.4rem" }}>{data.summary}</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>{quads.map(q => (<div key={q.key} style={{ background: "#0a0a0a", border: `1px solid ${q.color}18`, borderRadius: "10px", padding: "1rem" }}><div style={{ color: q.color, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "0.65rem" }}>{q.icon} {q.label}</div>{(data[q.key] || []).map((item, i) => (<div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}><span style={{ color: q.color, fontSize: "0.66rem", marginTop: "2px", flexShrink: 0 }}>◆</span><span style={{ color: "#bbb", fontSize: "0.79rem", lineHeight: "1.58" }}>{item}</span></div>))}</div>))}</div>{data.strategic_insight && <div style={{ marginTop: "0.9rem", background: `${LIME}06`, border: `1px solid ${LIME}15`, borderRadius: "8px", padding: "0.9rem" }}><div style={{ color: LIME, fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "0.3rem" }}>Strategic Read</div><p style={{ color: "#ccc", fontSize: "0.81rem", lineHeight: "1.68", margin: 0 }}>{data.strategic_insight}</p></div>}</div>);
}

// ── COMPANY BUILDER & INTEL (compact) ─────────────────────
function CompanyBuilder({ idea, qaCtx, profile, onClose }) {
  const [step, setStep] = useState("pick");
  const [mode, setMode] = useState(null);
  const [bg, setBg] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [result]);

  const build = async () => {
    setStep("result"); setLoading(true); setResult(""); setDone(false);
    const modeCtx = mode === "scratch" ? "Starting from zero." : `Insider background: "${bg}"`;
    const sys = `You are FORGE SYSTEMS. McKinsey meets YC. Specific, ruthless, no filler. ## headers. → bullets.`;
    const prompt = `${profileContext(profile)}\n${marketContext(profile)}\n\nIdea:"${idea}"\n${qaCtx}\n\nContext:${modeCtx}\n\n## 1. Company Architecture\n## 2. Core Systems\n## 3. Workflow Design\n## 4. Hiring Sequence\n## 5. Revenue Operations\n## 6. Tech Stack (exact tools for this market)\n## 7. Growth Levers\n## 8. 90-Day Plan\n## 9. Critical Failure Points`;
    try { await aiStream(sys, prompt, chunk => setResult(chunk), 1600); } catch (e) { setResult(`Error: ${e.message}`); }
    setLoading(false); setDone(true);
  };

  const btn = (c = LIME) => ({ background: c, color: c === LIME ? "#000" : "#fff", border: "none", borderRadius: "6px", padding: "0.78rem 1.7rem", fontSize: "0.71rem", fontWeight: "900", letterSpacing: "2px", cursor: "pointer", fontFamily: "monospace" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000092", zIndex: 2000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "min(600px,100vw)", background: "#080808", borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #111", flexShrink: 0 }}>
          <div style={{ color: PURPLE, fontSize: "0.7rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>🏗 COMPANY BUILDER</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.66rem" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.4rem" }}>
          {step === "pick" && (<div>
            <p style={{ color: "#e0e0e0", fontSize: "1rem", margin: "0 0 1.8rem", fontWeight: "300", fontFamily: "monospace" }}>Industry experience or starting fresh?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", marginBottom: "1.8rem" }}>
              {[["🌱", "scratch", LIME, "Starting Fresh", "Zero prior experience."], ["⚔️", "industry", PURPLE, "Industry Insider", "Experience and network to leverage."]].map(([icon, key, c, title, desc]) => (
                <div key={key} onClick={() => setMode(key)} style={{ background: "#0a0a0a", border: `1px solid ${mode === key ? c : "#191919"}`, borderRadius: "10px", padding: "1.2rem", cursor: "pointer", transition: "all .15s", transform: mode === key ? "translateY(-2px)" : "none" }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{icon}</div>
                  <div style={{ color: mode === key ? c : "#e0e0e0", fontWeight: "bold", marginBottom: "0.3rem", fontSize: "0.85rem", fontFamily: "monospace" }}>{title}</div>
                  <div style={{ color: "#2a2a2a", fontSize: "0.7rem", fontFamily: "monospace" }}>{desc}</div>
                </div>
              ))}
            </div>
            {mode === "industry" && <textarea style={{ width: "100%", background: "#0b0b0b", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#f0f0f0", fontSize: "0.84rem", padding: "0.9rem", resize: "none", outline: "none", fontFamily: "monospace", lineHeight: "1.7", height: "100px", boxSizing: "border-box", marginBottom: "1.2rem" }} placeholder="Your background, key relationships, what you've seen fail..." value={bg} onChange={e => setBg(e.target.value)} />}
            {mode && <button style={btn(PURPLE)} onClick={build} disabled={mode === "industry" && !bg.trim()}>BUILD COMPANY SYSTEM →</button>}
          </div>)}
          {step === "result" && (<div>
            {loading && <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.2rem" }}><div style={{ width: "7px", height: "7px", borderRadius: "50%", background: PURPLE, animation: "pulse 1s ease infinite" }} /><span style={{ color: PURPLE, fontSize: "0.6rem", letterSpacing: "2.5px", fontFamily: "monospace" }}>SYNTHESISING…</span></div>}
            {done && <div style={{ color: LIME, fontSize: "0.6rem", letterSpacing: "2.5px", marginBottom: "1.2rem", fontFamily: "monospace" }}>✓ COMPLETE</div>}
            <Md text={result} /><div ref={scrollRef} />
            {done && <button style={{ ...btn(PURPLE), marginTop: "1.8rem" }} onClick={() => { setStep("pick"); setMode(null); setResult(""); setBg(""); setDone(false); }}>REBUILD →</button>}
          </div>)}
        </div>
      </div>
    </div>
  );
}

function IntelPanel({ idea, profile, onClose }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: `## FORGE INTEL\n\nLive AI research. Ask me:\n\n→ Market size and real numbers\n→ Competitors in this space\n→ Regulations for your market\n→ Funding landscape\n→ Tech options for your constraints` }]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const histRef = useRef([]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(async (text) => {
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
    } catch (e) { setMsgs(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: `Error: ${e.message}` }; return n; }); }
    setBusy(false); setTimeout(() => taRef.current?.focus(), 80);
  }, [inp, busy, idea, profile]);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: "min(420px,100vw)", height: "100vh", background: "#080808", borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: "-10px 0 50px #000d" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #101010", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold" }}>⚡</div>
          <div><div style={{ color: LIME, fontSize: "0.68rem", fontWeight: "900", letterSpacing: "3px", fontFamily: "monospace" }}>FORGE INTEL</div><div style={{ color: "#1a1a1a", fontSize: "0.52rem", letterSpacing: "1.5px", fontFamily: "monospace" }}>AI RESEARCH CHAT</div></div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.66rem" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.3rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, background: m.role === "user" ? "#141414" : LIME, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: m.role === "user" ? "#666" : "#000", fontFamily: "monospace", fontWeight: "bold", border: m.role === "user" ? "1px solid #1e1e1e" : "none", marginTop: "2px" }}>{m.role === "user" ? "U" : "F"}</div>
            <div style={{ maxWidth: "91%", background: m.role === "user" ? "#0d0d0d" : "transparent", border: m.role === "user" ? "1px solid #191919" : "none", borderRadius: "8px", padding: m.role === "user" ? "0.58rem 0.82rem" : "0 0 0 0.1rem" }}>
              {m.content === "" ? <div style={{ display: "flex", gap: "4px", padding: "5px 0" }}>{[0, 1, 2].map(j => <span key={j} style={{ width: "5px", height: "5px", borderRadius: "50%", background: LIME, display: "inline-block", animation: `pulse 1.3s ease ${j * .2}s infinite` }} />)}</div> : <Md text={m.content} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "0.8rem 1.3rem 1rem", borderTop: "1px solid #101010", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <textarea ref={taRef} style={{ flex: 1, background: "#0b0b0b", border: "1px solid #1c1c1c", borderRadius: "7px", color: "#f0f0f0", fontSize: "0.82rem", padding: "0.65rem", resize: "none", outline: "none", fontFamily: "monospace", lineHeight: "1.65", height: "58px", boxSizing: "border-box" }} placeholder="Ask anything…" value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} disabled={busy} />
          <button onClick={() => send()} disabled={busy || !inp.trim()} style={{ background: busy || !inp.trim() ? "#0f0f0f" : LIME, color: "#000", border: `1px solid ${busy || !inp.trim() ? "#1a1a1a" : LIME}`, borderRadius: "6px", width: "40px", height: "58px", cursor: busy || !inp.trim() ? "not-allowed" : "pointer", fontSize: "1rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", transition: "all .15s" }}>{busy ? "…" : "→"}</button>
        </div>
      </div>
    </div>
  );
}

// ── OUTPUT CONFIGS ────────────────────────────────────────
const CONFIGS = {
  mindmap: { sys: `JSON only. {"center":"2-3 words","branches":[{"label":"2 words","color":"#hex","nodes":["short","short","short","short"]}]} 5-6 branches,3-4 nodes,max 4 words,vivid hex colors. Start with { end with }`, usr: (idea, ctx, p) => `${profileContext(p)}\n${marketContext(p)}\nIdea:"${idea}"\n${ctx}` },
  blueprint: { sys: `JSON only. {"title":"...","vision":"sentence","sections":[{"title":"NAME","content":"2-3 sentences","bullets":["pt","pt","pt"]}]} 7 sections: Core Concept,Problem & Solution,Target Market,Unique Advantage,Key Assumptions,Critical Risks,Success Metrics. Start { end }`, usr: (idea, ctx, p) => `${profileContext(p)}\n${marketContext(p)}\nIdea:"${idea}"\n${ctx}` },
  roadmap: { sys: `JSON only. {"title":"...","phases":[{"phase":"Phase 1","title":"...","duration":"X weeks","goal":"...","milestones":["...","...","..."],"kpis":["...","..."]}]} 4 phases: Foundation,Launch,Scale,Dominate. Start { end }`, usr: (idea, ctx, p) => `${profileContext(p)}\n${marketContext(p)}\nIdea:"${idea}"\n${ctx}` },
  businessplan: { sys: `JSON only. {"title":"...","oneliner":"pitch","sections":[{"title":"NAME","content":"content"}]} 10 sections: Problem,Solution,Market Size,Business Model,Revenue Streams,Go-To-Market,Competitive Moat,Team Requirements,Financial Projections,Next Steps. Start { end }`, usr: (idea, ctx, p) => `${profileContext(p)}\n${marketContext(p)}\nIdea:"${idea}"\n${ctx}` },
  actionplan: { sys: `JSON only. {"title":"...","weeks":[{"week":"Week 1","focus":"goal","tasks":[{"task":"action","priority":"HIGH","outcome":"result"}]}]} Priority: HIGH MED or LOW. 4 weeks,4-5 tasks. Start { end }`, usr: (idea, ctx, p) => `${profileContext(p)}\n${marketContext(p)}\nIdea:"${idea}"\n${ctx}` },
  swot: { sys: `JSON only. {"title":"...","summary":"sentence","strengths":["...","...","...","..."],"weaknesses":["...","...","...","..."],"opportunities":["...","...","...","..."],"threats":["...","...","...","..."],"strategic_insight":"2-3 sentences"} Start { end }`, usr: (idea, ctx, p) => `${profileContext(p)}\n${marketContext(p)}\nIdea:"${idea}"\n${ctx}` },
};

const OUTPUTS = [
  { key: "mindmap", icon: "🗺️", label: "Mind Map", desc: "Interactive visual landscape" },
  { key: "blueprint", icon: "📐", label: "Blueprint", desc: "Concept, market, risks, metrics" },
  { key: "roadmap", icon: "🛣️", label: "Roadmap", desc: "4-phase plan to dominance" },
  { key: "businessplan", icon: "📊", label: "Business Plan", desc: "Lean plan across all pillars" },
  { key: "actionplan", icon: "⚡", label: "30-Day Plan", desc: "Checkable tasks. Real outcomes." },
  { key: "swot", icon: "🎯", label: "SWOT", desc: "Ruthless strategic breakdown" },
];

const Q_SYS = `You are FORGE — ruthless thinking partner for serious founders. ONE question per round. Rotate: Creative→Critical→Strategic→Logical. No preamble. Return ONLY the raw question.`;
const ctxStr = pairs => pairs.map((x, i) => `Q${i + 1}: ${x.question}\nA${i + 1}: ${x.answer}`).join("\n\n");

// ── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState("loading"); // loading | auth | onboarding | app
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [phase, setPhase] = useState("ignition");
  const [idea, setIdea] = useState("");
  const [qa, setQa] = useState([]);
  const [curQ, setCurQ] = useState("");
  const [curA, setCurA] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [outType, setOutType] = useState(null);
  const [outputs, setOutputs] = useState({});
  const [err, setErr] = useState("");
  const [hov, setHov] = useState(null);
  const [intel, setIntel] = useState(false);
  const [company, setCompany] = useState(false);
  const [ideaScore, setIdeaScore] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentIdeaId, setCurrentIdeaId] = useState(null);
  const taRef = useRef(null);
  const prefetchRef = useRef({});

  // load session on mount
  useEffect(() => {
    (async () => {
      const session = await store.get("session");
      if (!session) { setAppState("auth"); return; }
      const u = await store.get(`user:${session.uid}`);
      if (!u) { setAppState("auth"); return; }
      const p = await store.get(`profile:${session.uid}`);
      setUser(u);
      if (!p) { setAppState("onboarding"); return; }
      setProfile(p); setAppState("app");
    })();
  }, []);

  const handleAuth = async (u, isNew) => {
    setUser(u);
    if (isNew) { setAppState("onboarding"); return; }
    const p = await store.get(`profile:${u.uid}`);
    if (!p) { setAppState("onboarding"); return; }
    setProfile(p); setAppState("app");
  };

  const handleOnboarding = (p) => { setProfile(p); setAppState("app"); };

  const logout = async () => {
    await store.del("session");
    setUser(null); setProfile(null); setAppState("auth");
    resetIdea();
  };

  const scoreIdea = useCallback(async (pairs) => {
    try {
      const s = await ai(`Score this startup idea. JSON only, start with {: {"score":75,"label":"Solid","verdict":"brutal one sentence","strengths":["s1","s2"],"gaps":["g1","g2"]} Labels:Weak/Needs Work/Solid/Strong/Exceptional.`, `${profileContext(profile)}\nIdea:"${idea}"\n${ctxStr(pairs)}`, true, 400);
      setIdeaScore(s);
      // auto-save idea
      const id = currentIdeaId || Date.now().toString();
      setCurrentIdeaId(id);
      await store.set(`idea:${user.uid}:${id}`, { id, text: idea, score: s.score, label: s.label, qa: pairs, savedAt: Date.now() });
    } catch {}
  }, [idea, profile, user, currentIdeaId]);

  const prefetchNext = useCallback((updated) => {
    if (updated.length >= Q_TARGET) return;
    const styles = ["Creative", "Critical", "Strategic", "Logical"];
    const key = `q${updated.length + 1}`;
    if (prefetchRef.current[key]) return;
    const style = styles[updated.length % styles.length];
    prefetchRef.current[key] = ai(Q_SYS, `${profileContext(profile)}\nIdea:"${idea}"\n\n${ctxStr(updated)}\n\nQ${updated.length + 1} of ${Q_TARGET}: ${style} style. Biggest unexplored gap. Push hard.`, false, 400);
  }, [idea, profile]);

  const ignite = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true); setErr("");
    try {
      const q = await ai(Q_SYS, `${profileContext(profile)}\nIdea:"${idea}"\nQ1 of ${Q_TARGET}. Creative style. Most foundational: what they're ACTUALLY building, for WHOM, single reason it must exist NOW.`, false, 400);
      setCurQ(q); setPhase("questioning");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const next = async () => {
    if (!curA.trim() || loading) return;
    const updated = [...qa, { question: curQ, answer: curA }];
    setQa(updated); setCurA("");
    if (updated.length >= Q_TARGET) { scoreIdea(updated); setPhase("reality-check"); return; }
    setLoading(true); setErr("");
    prefetchNext([...updated, { question: "?", answer: "?" }]);
    try {
      const styles = ["Creative", "Critical", "Strategic", "Logical"];
      const key = `q${updated.length + 1}`;
      const cached = prefetchRef.current[key] ? await Promise.race([prefetchRef.current[key], new Promise(r => setTimeout(() => r(null), 200))]) : null;
      delete prefetchRef.current[key];
      const q = cached || await ai(Q_SYS, `${profileContext(profile)}\nIdea:"${idea}"\n\n${ctxStr(updated)}\n\nQ${updated.length + 1} of ${Q_TARGET}: ${["Creative","Critical","Strategic","Logical"][updated.length % 4]} style. Biggest unexplored gap.`, false, 400);
      setCurQ(q);
    } catch (e) { setErr(e.message); }
    setLoading(false);
    setTimeout(() => taRef.current?.focus(), 60);
  };

  const generate = async (type) => {
    if (outputs[type]) { setOutType(type); setPhase("output"); return; }
    setOutType(type); setPhase("generating"); setErr("");
    setLoadMsg(`Forging ${OUTPUTS.find(o => o.key === type)?.label}…`);
    const cfg = CONFIGS[type];
    try {
      const result = await ai(cfg.sys, cfg.usr(idea, ctxStr(qa), profile), true, 1400, 2);
      setOutputs(prev => ({ ...prev, [type]: result }));
      setPhase("output");
    } catch (e) { setErr(`Failed: ${e.message}`); setPhase("output-select"); }
  };

  const loadIdea = (saved) => {
    setIdea(saved.text); setQa(saved.qa || []);
    setIdeaScore(saved.score ? { score: saved.score, label: saved.label } : null);
    setCurrentIdeaId(saved.id); setOutputs({});
    setPhase(saved.qa?.length >= Q_TARGET ? "output-select" : "ignition");
  };

  const resetIdea = () => {
    setPhase("ignition"); setIdea(""); setQa([]); setCurQ(""); setCurA("");
    setLoading(false); setOutType(null); setOutputs({}); setErr(""); setLoadMsg("");
    setIntel(false); setCompany(false); setIdeaScore(null); setCurrentIdeaId(null);
    prefetchRef.current = {};
  };

  if (appState === "loading") return <div style={{ minHeight: "100vh", background: "#070707", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: LIME, fontSize: "0.7rem", letterSpacing: "4px", fontFamily: "monospace" }}>LOADING…</div></div>;
  if (appState === "auth") return <AuthScreen onAuth={handleAuth} />;
  if (appState === "onboarding") return <Onboarding user={user} onDone={handleOnboarding} />;

  const showTools = phase !== "ignition";
  const scoreColor = s => s >= 80 ? LIME : s >= 60 ? ORANGE : s >= 40 ? "#FFD700" : PINK;

  const G = {
    app: { minHeight: "100vh", background: "#070707", color: "#f0f0f0", fontFamily: "monospace", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 1.25rem" },
    wrap: { width: "100%", maxWidth: "820px", transition: "padding-right .3s" },
    label: { color: "#222", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "3.5px", marginBottom: "0.65rem" },
    ta: { width: "100%", background: "#0b0b0b", border: "1px solid #181818", borderRadius: "8px", color: "#f0f0f0", fontSize: "0.96rem", padding: "1.1rem", resize: "none", outline: "none", fontFamily: "monospace", lineHeight: "1.72", boxSizing: "border-box" },
    btn: { background: LIME, color: "#000", border: "none", borderRadius: "6px", padding: "0.82rem 1.9rem", fontSize: "0.71rem", fontWeight: "900", letterSpacing: "2.5px", cursor: "pointer", fontFamily: "monospace", textTransform: "uppercase" },
    ghost: { background: "transparent", color: "#222", border: "1px solid #181818", borderRadius: "6px", padding: "0.55rem 1rem", fontSize: "0.66rem", cursor: "pointer", fontFamily: "monospace", transition: "all .15s" },
    err: { color: PINK, fontSize: "0.72rem", marginTop: "0.75rem", background: "#FF3C780d", border: "1px solid #FF3C7815", borderRadius: "5px", padding: "0.55rem 0.85rem" },
  };

  return (
    <div style={G.app}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.1}50%{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 #C8FF0000}50%{box-shadow:0 0 20px 5px #C8FF0035}}
        textarea:focus{border-color:#232323!important;}
        .fab:hover{transform:translateY(-4px) scale(1.08)!important;}
        .fab2:hover{transform:translateY(-4px) scale(1.08)!important;}
        .outcard:hover{border-color:#C8FF0050!important;transform:translateY(-3px)!important;background:#0c0c0c!important;}
        .gh:hover{color:#888!important;border-color:#282828!important;}
      `}</style>

      {/* FABs */}
      {showTools && !intel && <button className="fab" onClick={() => { setIntel(true); setCompany(false); }} style={{ position: "fixed", bottom: "7.5rem", right: "1.75rem", width: "52px", height: "52px", borderRadius: "50%", background: LIME, border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999, transition: "all .2s", boxShadow: `0 4px 18px ${LIME}28`, animation: "glowPulse 3s ease infinite" }}><span style={{ fontSize: "19px", lineHeight: 1 }}>⚡</span><span style={{ fontSize: "0.34rem", color: "#000", fontFamily: "monospace", fontWeight: "900", marginTop: "1px", letterSpacing: "0.5px" }}>INTEL</span></button>}
      {showTools && <button className="fab2" onClick={() => { setCompany(true); setIntel(false); }} style={{ position: "fixed", bottom: "2rem", right: "1.75rem", width: "52px", height: "52px", borderRadius: "50%", background: PURPLE, border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999, transition: "all .2s", boxShadow: `0 4px 18px ${PURPLE}28` }}><span style={{ fontSize: "19px", lineHeight: 1 }}>🏗</span><span style={{ fontSize: "0.34rem", color: "#fff", fontFamily: "monospace", fontWeight: "900", marginTop: "1px", letterSpacing: "0.5px" }}>BUILD</span></button>}

      {intel && <IntelPanel idea={idea} profile={profile} onClose={() => setIntel(false)} />}
      {company && <CompanyBuilder idea={idea} qaCtx={ctxStr(qa)} profile={profile} onClose={() => setCompany(false)} />}
      {showProfile && <ProfilePanel profile={profile} user={user} onUpdate={p => setProfile(p)} onLogout={logout} onClose={() => setShowProfile(false)} />}
      {showHistory && <HistoryPanel uid={user.uid} onLoad={loadIdea} onClose={() => setShowHistory(false)} />}

      <div style={{ ...G.wrap, paddingRight: intel ? "440px" : "0" }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.7rem 0 1.3rem", borderBottom: "1px solid #0e0e0e", marginBottom: "2.3rem" }}>
          <div>
            <h1 style={{ color: LIME, fontSize: "1.9rem", fontWeight: "900", letterSpacing: "7px", margin: 0, lineHeight: 1 }}>FORGE</h1>
            <p style={{ color: "#181818", fontSize: "0.56rem", letterSpacing: "3px", margin: "4px 0 0" }}>IDEA ENGINE FOR FOUNDERS</p>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
            {showTools && <>
              <button className="gh" onClick={() => { setIntel(!intel); setCompany(false); }} style={{ ...G.ghost, color: intel ? LIME : "#222", borderColor: intel ? `${LIME}30` : "#181818" }}>⚡ Intel</button>
              <button className="gh" onClick={() => { setCompany(true); setIntel(false); }} style={{ ...G.ghost, color: PURPLE, borderColor: `${PURPLE}25` }}>🏗 Build</button>
            </>}
            <button className="gh" style={G.ghost} onClick={() => setShowHistory(true)}>📁 Vault</button>
            <button className="gh" style={{ ...G.ghost, display: "flex", alignItems: "center", gap: "0.4rem" }} onClick={() => setShowProfile(true)}>
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: `${LIME}20`, border: `1px solid ${LIME}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: LIME }}>{profile?.name?.[0]?.toUpperCase()}</div>
              <span style={{ color: "#333", fontSize: "0.64rem" }}>{profile?.name?.split(" ")[0]}</span>
            </button>
            {phase !== "ignition" && <button className="gh" style={G.ghost} onClick={resetIdea}>↩</button>}
          </div>
        </div>

        {/* IGNITION */}
        {phase === "ignition" && (
          <div style={{ animation: "fadeIn .4s ease" }}>
            <div style={{ background: "#0a0a0a", border: `1px solid ${LIME}12`, borderRadius: "10px", padding: "0.85rem 1.1rem", marginBottom: "1.8rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: LIME, flexShrink: 0 }} />
              <span style={{ color: "#555", fontSize: "0.76rem", lineHeight: "1.5" }}>{profile?.bio || `Welcome, ${profile?.name}`}</span>
            </div>
            <p style={G.label}>Drop your raw idea</p>
            <textarea style={{ ...G.ta, height: "150px" }} placeholder={"No polish needed. Half-baked is fine.\nRaw and messy is where the best ideas live."} value={idea} onChange={e => setIdea(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) ignite(); }} />
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.9rem" }}>
              <button style={{ ...G.btn, opacity: (!idea.trim() || loading) ? 0.25 : 1 }} onClick={ignite} disabled={!idea.trim() || loading}>{loading ? "LOADING…" : "IGNITE →"}</button>
              <span style={{ color: "#181818", fontSize: "0.6rem" }}>⌘ + Enter</span>
            </div>
            {err && <div style={G.err}>{err}</div>}
          </div>
        )}

        {/* QUESTIONING */}
        {phase === "questioning" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", gap: "4px", marginBottom: "0.65rem" }}>
              {Array.from({ length: Q_TARGET }).map((_, i) => (<div key={i} style={{ height: "2px", flex: 1, borderRadius: "2px", background: i < qa.length ? LIME : i === qa.length ? `${LIME}30` : "#111", transition: "background .4s" }} />))}
            </div>
            <div style={{ color: "#1c1c1c", fontSize: "0.56rem", letterSpacing: "2px", marginBottom: "2rem" }}>{qa.length}/{Q_TARGET} complete</div>
            {loading ? (
              <div style={{ padding: "2.5rem 0" }}><span style={{ color: LIME, fontSize: "0.68rem", letterSpacing: "2.5px" }}>FORGE</span><span style={{ color: "#1c1c1c", fontSize: "0.68rem" }}> thinking</span>{[0, 1, 2, 3].map(i => <span key={i} style={{ color: LIME, animation: `pulse 1.5s ease ${i * .25}s infinite` }}>.</span>)}</div>
            ) : (<>
              <p style={{ color: "#e5e5e5", fontSize: "1.08rem", lineHeight: "1.78", margin: "0 0 1.9rem", fontWeight: "300" }}>{curQ}</p>
              <p style={G.label}>Your answer</p>
              <textarea ref={taRef} style={{ ...G.ta, height: "105px" }} placeholder="Honest. No performance." value={curA} onChange={e => { setCurA(e.target.value); if (e.target.value.length === 4) prefetchNext([...qa, { question: curQ, answer: e.target.value }]); }} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && curA.trim() && !loading) next(); }} autoFocus />
              <div style={{ display: "flex", gap: "0.7rem", marginTop: "0.85rem", alignItems: "center" }}>
                <button style={{ ...G.btn, opacity: !curA.trim() ? 0.2 : 1 }} onClick={next} disabled={!curA.trim() || loading}>{qa.length + 1 === Q_TARGET ? "FINISH →" : "NEXT →"}</button>
                {qa.length >= 3 && <button className="gh" style={G.ghost} onClick={() => { scoreIdea(qa); setPhase("reality-check"); }}>skip →</button>}
              </div>
              {err && <div style={G.err}>{err}</div>}
            </>)}
          </div>
        )}

        {/* REALITY CHECK */}
        {phase === "reality-check" && (
          <RealityCheck idea={idea} qa={qa} profile={profile}
            onProceed={() => setPhase("output-select")}
            onBack={() => setPhase("questioning")} />
        )}

        {/* OUTPUT SELECT */}
        {phase === "output-select" && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            {ideaScore && (
              <div style={{ background: "#090909", border: `1px solid ${scoreColor(ideaScore.score)}15`, borderRadius: "10px", padding: "1.1rem 1.3rem", marginBottom: "1.8rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.7rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "900", color: scoreColor(ideaScore.score), fontFamily: "monospace", lineHeight: 1 }}>{ideaScore.score}</div>
                  <div style={{ flex: 1 }}><div style={{ color: scoreColor(ideaScore.score), fontSize: "0.63rem", fontWeight: "bold", letterSpacing: "2px" }}>{(ideaScore.label || "").toUpperCase()}</div><div style={{ color: "#555", fontSize: "0.76rem", marginTop: "2px", lineHeight: "1.5" }}>{ideaScore.verdict}</div></div>
                  <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: `${scoreColor(ideaScore.score)}0e`, border: `2px solid ${scoreColor(ideaScore.score)}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.52rem", color: scoreColor(ideaScore.score), fontWeight: "bold", textAlign: "center", lineHeight: "1.3", fontFamily: "monospace" }}>IDEA<br />SCORE</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <div><div style={{ color: LIME, fontSize: "0.54rem", letterSpacing: "2px", marginBottom: "0.28rem" }}>STRENGTHS</div>{(ideaScore.strengths || []).map((s, i) => <div key={i} style={{ color: "#555", fontSize: "0.73rem", marginBottom: "0.14rem" }}>→ {s}</div>)}</div>
                  <div><div style={{ color: PINK, fontSize: "0.54rem", letterSpacing: "2px", marginBottom: "0.28rem" }}>GAPS</div>{(ideaScore.gaps || []).map((g, i) => <div key={i} style={{ color: "#555", fontSize: "0.73rem", marginBottom: "0.14rem" }}>→ {g}</div>)}</div>
                </div>
              </div>
            )}
            <p style={G.label}>Build your output</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.78rem", marginBottom: "0.78rem" }}>
              {OUTPUTS.map(o => {
                const done = !!outputs[o.key];
                return (<div key={o.key} className="outcard" style={{ background: "#0a0a0a", border: `1px solid ${done ? `${LIME}20` : "#131313"}`, borderRadius: "10px", padding: "1.05rem", cursor: "pointer", transition: "all .18s", position: "relative" }} onClick={() => generate(o.key)}>
                  {done && <span style={{ position: "absolute", top: "0.5rem", right: "0.6rem", color: LIME, fontSize: "0.5rem", letterSpacing: "1.5px" }}>READY</span>}
                  <div style={{ fontSize: "1.25rem", marginBottom: "0.42rem" }}>{o.icon}</div>
                  <div style={{ color: "#e8e8e8", fontSize: "0.82rem", fontWeight: "bold", marginBottom: "0.22rem" }}>{o.label}</div>
                  <div style={{ color: "#1e1e1e", fontSize: "0.68rem", lineHeight: "1.4" }}>{o.desc}</div>
                </div>);
              })}
            </div>
            <div style={{ background: "#0a0a0a", border: `1px solid ${PURPLE}15`, borderRadius: "10px", padding: "1.05rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem", transition: "all .18s" }} onClick={() => setCompany(true)} onMouseEnter={e => e.currentTarget.style.borderColor = `${PURPLE}40`} onMouseLeave={e => e.currentTarget.style.borderColor = `${PURPLE}15`}>
              <span style={{ fontSize: "1.25rem" }}>🏗️</span>
              <div style={{ flex: 1 }}><div style={{ color: PURPLE, fontSize: "0.82rem", fontWeight: "bold", marginBottom: "0.2rem" }}>Company Builder</div><div style={{ color: "#1e1e1e", fontSize: "0.68rem" }}>Systems, workflows & org design — market-aware</div></div>
              <span style={{ color: PURPLE, fontSize: "1rem", flexShrink: 0 }}>→</span>
            </div>
            {err && <div style={{ ...G.err, marginTop: "1rem" }}>{err}</div>}
          </div>
        )}

        {/* GENERATING */}
        {phase === "generating" && (
          <div style={{ textAlign: "center", padding: "6rem 0", animation: "fadeIn .3s ease" }}>
            <div style={{ width: "34px", height: "34px", border: `2px solid ${LIME}14`, borderTop: `2px solid ${LIME}`, borderRadius: "50%", margin: "0 auto 1.4rem", animation: "spin 0.7s linear infinite" }} />
            <p style={{ color: LIME, fontSize: "0.65rem", letterSpacing: "4px", margin: "0 0 0.4rem" }}>FORGING</p>
            <p style={{ color: "#1c1c1c", fontSize: "0.72rem" }}>{loadMsg}</p>
          </div>
        )}

        {/* OUTPUT */}
        {phase === "output" && outType && outputs[outType] && (
          <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem", flexWrap: "wrap", gap: "0.55rem" }}>
              <span style={{ color: LIME, fontSize: "0.6rem", letterSpacing: "3px", textTransform: "uppercase" }}>{OUTPUTS.find(o => o.key === outType)?.icon} {OUTPUTS.find(o => o.key === outType)?.label}</span>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <button className="gh" style={G.ghost} onClick={async () => { setOutputs(p => { const n = { ...p }; delete n[outType]; return n; }); await generate(outType); }}>↻ Regen</button>
                <button className="gh" style={G.ghost} onClick={() => setPhase("output-select")}>← All</button>
                <button className="gh" style={G.ghost} onClick={resetIdea}>New Idea</button>
              </div>
            </div>
            <div style={{ background: "#0b0b0b", border: "1px solid #111", borderRadius: "12px", padding: outType === "mindmap" ? "0" : "1.8rem" }}>
              {outType === "mindmap" && <MindMap data={outputs[outType]} />}
              {outType === "blueprint" && <Blueprint data={outputs[outType]} />}
              {outType === "roadmap" && <Roadmap data={outputs[outType]} />}
              {outType === "businessplan" && <BusinessPlan data={outputs[outType]} />}
              {outType === "actionplan" && <ActionPlan data={outputs[outType]} />}
              {outType === "swot" && <SWOT data={outputs[outType]} />}
            </div>
          </div>
        )}

        <div style={{ height: "5rem" }} />
      </div>
    </div>
  );
}