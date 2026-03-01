import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import React from "react";

// ─── THEME PALETTES ───────────────────────────────────────────────────────────
const THEMES = {
  ember: {
    id: "ember",
    name: "Ember",
    description: "Intense & bold",
    preview: ["#130205","#ff1f31","#92cc8f","#e78f8e"],
    bg:       "#130205",
    surface:  "#1f0309",
    surface2: "#2a040b",
    border:   "#ff1f3122",
    lime:     "#ff1f31",
    teal:     "#92cc8f",
    orange:   "#e78f8e",
    white:    "#ffffff",
    muted:    "#e78f8e88",
    dim:      "#1f0309",
    pageWrap: "#0d0105",
    ring:     "#ff1f3155",
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Deep & focused",
    preview: ["#00171f","#00a8e8","#007ea7","#ffffff"],
    bg:       "#00171f",
    surface:  "#003459",
    surface2: "#00253d",
    border:   "#007ea733",
    lime:     "#00a8e8",
    teal:     "#007ea7",
    orange:   "#00a8e8",
    white:    "#ffffff",
    muted:    "#007ea7bb",
    dim:      "#003459",
    pageWrap: "#00101a",
    ring:     "#00a8e855",
  },
  sage: {
    id: "sage",
    name: "Sage",
    description: "Calm & refined",
    preview: ["#2a2a2a","#93b7be","#785964","#f1fffa"],
    bg:       "#2a2a2a",
    surface:  "#323232",
    surface2: "#3a3a3a",
    border:   "#454545",
    lime:     "#93b7be",
    teal:     "#f1fffa",
    orange:   "#785964",
    white:    "#f1fffa",
    muted:    "#d5c7bc99",
    dim:      "#454545",
    pageWrap: "#1e1e1e",
    ring:     "#93b7be55",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Pure & minimal",
    preview: ["#080808","#D4F53C","#7CE577","#F0EDE6"],
    bg:       "#080808",
    surface:  "#111111",
    surface2: "#181818",
    border:   "#222222",
    lime:     "#D4F53C",
    teal:     "#7CE577",
    orange:   "#F5923C",
    white:    "#F0EDE6",
    muted:    "#555555",
    dim:      "#333333",
    pageWrap: "#050505",
    ring:     "#D4F53C44",
  },
  terrain: {
    id: "terrain",
    name: "Terrain",
    description: "Light & natural",
    preview: ["#eff1ed","#717744","#8aea92","#373d20"],
    bg:       "#eff1ed",     // white-smoke — light base
    surface:  "#e4e6e0",     // slightly darker white-smoke for cards
    surface2: "#d8dbd2",     // inputs / secondary surfaces
    border:   "#71774433",   // dusty-olive low opacity — subtle borders
    lime:     "#717744",     // dusty-olive — primary accent
    teal:     "#373d20",     // dark-khaki — secondary / strong contrast
    orange:   "#717744",     // dusty-olive — warm highlights / badges
    white:    "#373d20",     // dark-khaki — primary text (inverted!)
    muted:    "#8aea92",     // fresh green — secondary / subtext
    dim:      "#d8dbd2",     // light dim for inactive elements
    pageWrap: "#dfe1db",
    ring:     "#71774455",
  },
  monolith: {
    id: "monolith",
    name: "Monolith",
    description: "Stark & editorial",
    preview: ["#0a0b0a","#ffffff","#a6a2a2","#fbfbf2"],
    bg:       "#0a0b0a",     // onyx — deepest black
    surface:  "#141514",     // onyx lifted — card surfaces
    surface2: "#1c1d1c",     // inputs / secondary
    border:   "#a6a2a222",   // silver low opacity — borders
    lime:     "#fbfbf2",     // floral-white — primary accent
    teal:     "#ffffff",     // pure white — strong highlight
    orange:   "#a6a2a2",     // silver — warm secondary
    white:    "#fbfbf2",     // floral-white — primary text
    muted:    "#a6a2a2",     // silver — secondary / subtext
    dim:      "#1c1d1c",     // dim backgrounds
    pageWrap: "#050505",
    ring:     "#a6a2a233",
  },
};

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
const ThemeCtx = createContext(null);

// Module-level T proxy — components read from this; App.setTheme updates it
let T = { ...THEMES.terrain };

// Returns a readable text color for use on top of T.lime (the primary accent)
// Light themes like Terrain have a light lime so need dark text; dark themes need light text
function accentText() {
  // Parse hex lightness roughly: if R+G+B > 382 (avg > 127) it's light
  const hex = T.lime.replace("#","");
  const r = parseInt(hex.slice(0,2),16);
  const g = parseInt(hex.slice(2,4),16);
  const b = parseInt(hex.slice(4,6),16);
  return (r*0.299 + g*0.587 + b*0.114) > 128 ? "#1a1a0a" : "#ffffff";
}

// Returns readable text for T.bg (page background)
function bgText() {
  const hex = T.bg.replace("#","");
  const r = parseInt(hex.slice(0,2),16);
  const g = parseInt(hex.slice(2,4),16);
  const b = parseInt(hex.slice(4,6),16);
  return (r*0.299 + g*0.587 + b*0.114) > 128 ? "#373d20" : "#ffffff";
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--app-bg, #130205); }
  ::-webkit-scrollbar { width: 0; }
  input, textarea { font-family: inherit; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes pulse {
    0%,100% { transform: scale(1); opacity:1; }
    50% { transform: scale(1.06); opacity:0.85; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes timerPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,31,49,0.4); }
    50% { box-shadow: 0 0 0 20px rgba(255,31,49,0); }
  }
  .fadeUp { animation: fadeUp 0.5s ease both; }
  .fadeIn { animation: fadeIn 0.4s ease both; }
  .btn-press:active { transform: scale(0.96); }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Ring({ pct, color, size, stroke, children }: { pct: number, color: string, size: number, stroke: number, children?: React.ReactNode }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.dim} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function Pill({ children, color = T.lime, bg, onClick, style = {} }) {
  return (
    <button onClick={onClick} className="btn-press" style={{
      background: bg || `${color}18`,
      border: `1.5px solid ${color}44`,
      color, borderRadius: 50, padding: "8px 18px",
      fontSize: 12, fontWeight: 700, letterSpacing: 0.8,
      textTransform: "uppercase", cursor: "pointer",
      fontFamily: "'Syne', sans-serif",
      transition: "all 0.2s", ...style
    }}>{children}</button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.surface, borderRadius: 20, border: `1px solid ${T.border}`, ...style }}>
      {children}
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const OB_STEPS = [
  { id: "welcome" },
  { id: "name", q: "What should we call you?", type: "text", placeholder: "Your name" },
  { id: "goal",  q: "What's your primary goal?", type: "choice", choices: [
    { id: "lose",    label: "Lose Weight",     icon: "🔥", desc: "Burn fat, feel lighter" },
    { id: "build",   label: "Build Muscle",    icon: "💪", desc: "Strength & hypertrophy" },
    { id: "endure",  label: "Boost Endurance", icon: "🏃", desc: "Cardio & stamina" },
    { id: "wellness",label: "Overall Wellness",icon: "🧘", desc: "Balance & longevity" },
  ]},
  { id: "level", q: "Your current fitness level?", type: "choice", choices: [
    { id: "beginner",     label: "Beginner",     icon: "🌱", desc: "Just getting started" },
    { id: "intermediate", label: "Intermediate", icon: "⚡", desc: "1–2 years consistent" },
    { id: "advanced",     label: "Advanced",     icon: "🏆", desc: "3+ years training" },
  ]},
  { id: "days", q: "How many days can you train per week?", type: "stepper", min: 1, max: 7 },
  { id: "ready" },
];

function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: "", goal: "", level: "", days: 4 });
  const cur = OB_STEPS[step];
  const pct = (step / (OB_STEPS.length - 1)) * 100;

  const next = (update = {}) => {
    setProfile(p => ({ ...p, ...update }));
    setStep(s => s + 1);
  };

  // WELCOME
  if (cur.id === "welcome") return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: "0 auto 20px",
          background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, boxShadow: `0 20px 60px rgba(147,183,190,0.35)`
        }}>✦</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, color: T.white, fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>
          Welcome to<br /><span style={{ color: T.lime }}>Soma</span>
        </h1>
        <p style={{ color: T.muted, fontSize: 15, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Your personal AI fitness trainer. Built around your goals. Adapts to your life.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {["Personalized AI workout plans", "Real-time coaching & feedback", "Progress tracking that motivates"].map((f, i) => (
          <div key={i} className="fadeUp" style={{ animationDelay: `${0.2 + i * 0.1}s`, display: "flex", alignItems: "center", gap: 12, background: T.surface, borderRadius: 14, padding: "12px 16px", border: `1px solid ${T.border}` }}>
            <span style={{ color: T.lime, fontSize: 16 }}>✓</span>
            <span style={{ color: T.white, fontSize: 14, fontWeight: 500 }}>{f}</span>
          </div>
        ))}
      </div>
      <button className="btn-press" onClick={() => next()} style={{
        marginTop: 32, width: "100%", padding: "16px",
        background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
        border: "none", borderRadius: 50, color: accentText(),
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer"
      }}>Let's Get Started →</button>
    </div>
  );

  // READY
  if (cur.id === "ready") return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
      <div style={{
        width: 100, height: 100, borderRadius: "50%", margin: "0 auto 24px",
        background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 44, animation: "pulse 2s infinite",
        boxShadow: `0 0 60px rgba(147,183,190,0.45)`
      }}>🔥</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: T.white, marginBottom: 12 }}>
        You're all set,<br /><span style={{ color: T.lime }}>{profile.name || "Champion"}!</span>
      </h2>
      <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>
        Your AI trainer has built a personalized plan around your goals.
      </p>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {[
          { k: "Goal", v: profile.goal },
          { k: "Level", v: profile.level },
          { k: "Schedule", v: `${profile.days} days / week` },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: T.surface, borderRadius: 12, border: `1px solid ${T.border}` }}>
            <span style={{ color: T.muted, fontSize: 13 }}>{row.k}</span>
            <span style={{ color: T.white, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{row.v}</span>
          </div>
        ))}
      </div>
      <button className="btn-press" onClick={() => onComplete(profile)} style={{
        width: "100%", padding: "16px",
        background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
        border: "none", borderRadius: 50, color: accentText(),
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer"
      }}>Enter Soma →</button>
    </div>
  );

  // TEXT INPUT
  if (cur.type === "text") return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 28px 28px" }}>
      <div style={{ marginBottom: "auto" }}>
        <p style={{ color: T.muted, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Step {step} of {OB_STEPS.length - 2}</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: T.white, fontWeight: 300, marginBottom: 32, lineHeight: 1.2 }}>{cur.q}</h2>
        <input
          autoFocus
          placeholder={cur.placeholder}
          defaultValue={profile[cur.id]}
          id="ob-text-input"
          style={{
            width: "100%", background: T.surface2, border: `2px solid ${T.border}`,
            borderRadius: 14, padding: "16px 18px", color: T.white, fontSize: 18,
            fontFamily: "'Syne', sans-serif", fontWeight: 600, outline: "none",
            transition: "border-color 0.2s"
          }}
          onFocus={e => e.target.style.borderColor = T.lime}
          onBlur={e => e.target.style.borderColor = T.border}
        />
      </div>
      <button className="btn-press" onClick={() => {
        const val = document.getElementById("ob-text-input").value;
        next({ [cur.id]: val });
      }} style={{
        marginTop: 24, padding: "16px",
        background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
        border: "none", borderRadius: 50, color: accentText(),
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer"
      }}>Continue →</button>
    </div>
  );

  // CHOICE
  if (cur.type === "choice") return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 28px 28px" }}>
      <p style={{ color: T.muted, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Step {step} of {OB_STEPS.length - 2}</p>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: T.white, fontWeight: 300, marginBottom: 28, lineHeight: 1.2 }}>{cur.q}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {cur.choices.map((c, i) => (
          <button key={c.id} className="btn-press fadeUp" onClick={() => next({ [cur.id]: c.label })} style={{
            animationDelay: `${i * 0.07}s`,
            background: T.surface, border: `1.5px solid ${T.border}`,
            borderRadius: 16, padding: "16px 18px",
            display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
            textAlign: "left", transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.lime; e.currentTarget.style.background = `${T.lime}0d`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; }}
          >
            <span style={{ fontSize: 28 }}>{c.icon}</span>
            <div>
              <p style={{ color: T.white, fontWeight: 500, fontFamily: "'Syne', sans-serif", fontSize: 14, marginBottom: 2 }}>{c.label}</p>
              <p style={{ color: T.muted, fontSize: 12 }}>{c.desc}</p>
            </div>
            <span style={{ marginLeft: "auto", color: T.muted, fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );

  // STEPPER
  if (cur.type === "stepper") return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 28px 28px" }}>
      <p style={{ color: T.muted, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Step {step} of {OB_STEPS.length - 2}</p>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: T.white, fontWeight: 300, marginBottom: 48, lineHeight: 1.2 }}>{cur.q}</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginBottom: "auto" }}>
        <button className="btn-press" onClick={() => setProfile(p => ({ ...p, days: Math.max(cur.min, p.days - 1) }))} style={{
          width: 56, height: 56, borderRadius: "50%", background: T.surface2,
          border: `2px solid ${T.border}`, color: T.white, fontSize: 24, cursor: "pointer"
        }}>−</button>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 80, color: T.lime, fontWeight: 700, lineHeight: 1 }}>{profile.days}</span>
          <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>days per week</p>
        </div>
        <button className="btn-press" onClick={() => setProfile(p => ({ ...p, days: Math.min(cur.max, p.days + 1) }))} style={{
          width: 56, height: 56, borderRadius: "50%", background: T.surface2,
          border: `2px solid ${T.border}`, color: T.white, fontSize: 24, cursor: "pointer"
        }}>+</button>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 40 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{
            width: 32, height: 6, borderRadius: 3,
            background: i < profile.days ? T.lime : T.dim,
            transition: "background 0.2s"
          }} />
        ))}
      </div>
      <button className="btn-press" onClick={() => next()} style={{
        padding: "16px",
        background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
        border: "none", borderRadius: 50, color: accentText(),
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer"
      }}>Continue →</button>
    </div>
  );

  return null;
}

// ─── WORKOUT DATA ─────────────────────────────────────────────────────────────
// 6-Day Powerbuilding Split by Nick Ludlow — 12 Week Program
const POWERBUILDING_NOTE = "Rest-pause protocol: use 20% less weight on AMQRAP sets. AMQRAP = As Many Quality Reps As Possible.";

const WORKOUTS = [
  // ── POWERBUILDING SPLIT ────────────────────────────────────────────────────
  {
    id: 4,
    name: "Push A",
    subtitle: "Chest, Shoulders & Triceps",
    emoji: "🏋️",
    duration: 55,
    cal: 480,
    level: "Intermediate",
    category: "Powerbuilding",
    split: "Day 1",
    program: "6-Day Powerbuilding",
    note: POWERBUILDING_NOTE,
    exercises: [
      { name: "Flat Barbell Bench Press",           sets: 5, reps: "15",     rest: 105, desc: "Primary chest driver. Drive feet into floor, arch naturally, full ROM." },
      { name: "Flat Barbell Bench Press (AMQRAP)",  sets: 1, reps: "AMQRAP", rest: 0,   desc: "Use 20% less than working weight. As many quality reps as possible — stop before form breaks." },
      { name: "Seated Behind the Neck Press",       sets: 3, reps: "25",     rest: 60,  desc: "Controlled descent to ear level. Keep core braced throughout." },
      { name: "Weighted Tricep Dips",               sets: 3, reps: "30",     rest: 60,  desc: "Lean slightly forward for chest emphasis, upright for triceps." },
      { name: "Standing Cable Crossovers",          sets: 5, reps: "50",     rest: 30,  desc: "High-to-low arc, squeeze hard at the bottom. Keep slight elbow bend." },
      { name: "Seated Tricep Extensions",           sets: 5, reps: "50",     rest: 30,  desc: "Dumbbell, rope, or EZ bar. Full overhead extension, slow eccentric." },
      { name: "Seated Dumbbell Lateral Raises",     sets: 5, reps: "50",     rest: 15,  desc: "Light weight, high reps. Lead with elbows, stop at shoulder height." },
    ]
  },
  {
    id: 5,
    name: "Pull A",
    subtitle: "Back, Traps & Biceps",
    emoji: "💪",
    duration: 55,
    cal: 500,
    level: "Intermediate",
    category: "Powerbuilding",
    split: "Day 2",
    program: "6-Day Powerbuilding",
    note: POWERBUILDING_NOTE,
    exercises: [
      { name: "Barbell Conventional Deadlift",        sets: 5, reps: "15",     rest: 105, desc: "Hip hinge, bar over mid-foot, neutral spine. Drive the floor away." },
      { name: "Barbell Deadlift (AMQRAP)",            sets: 1, reps: "AMQRAP", rest: 0,   desc: "Use 20% less than working weight. Maintain perfect form — quality over quantity." },
      { name: "Weighted Chin-ups",                    sets: 3, reps: "25",     rest: 60,  desc: "Dead hang start, supinated grip, drive elbows to hips at the top." },
      { name: "Chest Supported Rows",                 sets: 3, reps: "30",     rest: 60,  desc: "Eliminate lower back involvement. Pull elbows past torso, squeeze scapula." },
      { name: "Shrugs",                               sets: 5, reps: "50",     rest: 30,  desc: "Dumbbell, barbell, or trap bar. Full elevation and hold 1s at top." },
      { name: "Standing Barbell Curls",               sets: 5, reps: "50",     rest: 30,  desc: "No swinging. Full supination at the top, slow descent." },
      { name: "Standing Cable Reverse Fly",           sets: 5, reps: "50",     rest: 15,  desc: "Targets rear delts & traps. Keep slight forward lean, arms wide arc." },
    ]
  },
  {
    id: 6,
    name: "Legs A",
    subtitle: "Quads, Hamstrings & Calves",
    emoji: "🦵",
    duration: 60,
    cal: 560,
    level: "Intermediate",
    category: "Powerbuilding",
    split: "Day 3",
    program: "6-Day Powerbuilding",
    note: POWERBUILDING_NOTE,
    exercises: [
      { name: "Barbell Back Squat",            sets: 5, reps: "15",     rest: 105, desc: "Bar across traps, hip crease below parallel. Drive knees out on ascent." },
      { name: "Barbell Back Squat (AMQRAP)",   sets: 1, reps: "AMQRAP", rest: 0,   desc: "Use 20% less than working weight. Depth and form are non-negotiable." },
      { name: "Barbell Good Mornings",         sets: 3, reps: "25",     rest: 60,  desc: "Light load, hinge from hips with soft knees. Stretch hamstrings fully." },
      { name: "Leg Press",                     sets: 3, reps: "30",     rest: 60,  desc: "Feet shoulder-width, don't lock knees at the top. Full depth." },
      { name: "Reverse Hyperextension",        sets: 5, reps: "50",     rest: 30,  desc: "Great for posterior chain & lower back health. Controlled swing." },
      { name: "Leg Curl",                      sets: 5, reps: "50",     rest: 30,  desc: "Seated or lying. Full stretch at bottom, full contraction at top." },
      { name: "Calf Raise",                    sets: 5, reps: "50",     rest: 15,  desc: "Seated or standing. Full stretch at bottom, hold peak 1s. High reps." },
    ]
  },
  {
    id: 7,
    name: "Push B",
    subtitle: "Chest, Shoulders & Triceps",
    emoji: "🔱",
    duration: 55,
    cal: 470,
    level: "Intermediate",
    category: "Powerbuilding",
    split: "Day 4",
    program: "6-Day Powerbuilding",
    note: POWERBUILDING_NOTE,
    exercises: [
      { name: "Standing Overhead Press",          sets: 5, reps: "15",     rest: 105, desc: "Bar from front rack, press overhead to full lockout. Brace core hard." },
      { name: "Standing OHP (AMQRAP)",            sets: 1, reps: "AMQRAP", rest: 0,   desc: "Use 20% less than working weight. Don't use leg drive — strict press only." },
      { name: "Incline Bench Press",              sets: 3, reps: "25",     rest: 60,  desc: "Dumbbell or barbell. 30–45° incline, targets upper chest & front delt." },
      { name: "Close Grip Bench Press",           sets: 3, reps: "30",     rest: 60,  desc: "Hands shoulder-width or slightly inside. Elbows tucked, tricep focus." },
      { name: "Seated Machine Fly",               sets: 5, reps: "50",     rest: 30,  desc: "Full chest stretch at the open position. Squeeze and hold at peak." },
      { name: "Tricep Pushdown",                  sets: 5, reps: "50",     rest: 30,  desc: "Rope, V-bar, or straight bar. Full extension, keep elbows pinned at sides." },
      { name: "Standing Cable Lateral Raises",    sets: 5, reps: "50",     rest: 15,  desc: "Cable keeps constant tension vs. dumbbells. Lead with elbows." },
    ]
  },
  {
    id: 8,
    name: "Pull B",
    subtitle: "Back, Traps & Biceps",
    emoji: "🧲",
    duration: 55,
    cal: 490,
    level: "Intermediate",
    category: "Powerbuilding",
    split: "Day 5",
    program: "6-Day Powerbuilding",
    note: POWERBUILDING_NOTE,
    exercises: [
      { name: "Barbell Snatch Grip Deadlift",        sets: 5, reps: "15",     rest: 105, desc: "Wide overhand grip. Demands more upper back and lat engagement than conventional." },
      { name: "Snatch Grip Deadlift (AMQRAP)",       sets: 1, reps: "AMQRAP", rest: 0,   desc: "Use 20% less than working weight. Grip will challenge — use straps if needed." },
      { name: "Barbell Rows",                        sets: 3, reps: "25",     rest: 60,  desc: "Hinge forward ~45°, pull bar to lower chest. Control the eccentric." },
      { name: "Weighted Pull-ups",                   sets: 3, reps: "30",     rest: 60,  desc: "Pronated grip, full dead hang. Drive elbows down and back." },
      { name: "1-Arm Rows",                          sets: 5, reps: "50",     rest: 30,  desc: "Dumbbell or barbell. Brace on bench, elbow drives past torso. Full stretch." },
      { name: "Incline Dumbbell Curl",               sets: 5, reps: "50",     rest: 30,  desc: "Seat at 45°, arms hang fully extended. Maximum bicep stretch at the bottom." },
      { name: "Seated Machine Reverse Fly",          sets: 5, reps: "50",     rest: 15,  desc: "Rear delts and mid-traps. Keep a slight bend in elbows, controlled arc." },
    ]
  },
  {
    id: 9,
    name: "Legs B",
    subtitle: "Quads, Hamstrings & Calves",
    emoji: "⚡",
    duration: 60,
    cal: 545,
    level: "Intermediate",
    category: "Powerbuilding",
    split: "Day 6",
    program: "6-Day Powerbuilding",
    note: POWERBUILDING_NOTE,
    exercises: [
      { name: "Barbell Front Squat",           sets: 5, reps: "15",     rest: 105, desc: "More quad-dominant than back squat. Keep torso upright, elbows high." },
      { name: "Barbell Front Squat (AMQRAP)",  sets: 1, reps: "AMQRAP", rest: 0,   desc: "Use 20% less than working weight. Upper back and core will fatigue fast." },
      { name: "Barbell Good Mornings",         sets: 3, reps: "25",     rest: 60,  desc: "Variation B — slightly higher load. Full hamstring stretch, neutral spine." },
      { name: "Hack Squat",                    sets: 3, reps: "30",     rest: 60,  desc: "Feet low and close for quad emphasis. Full ROM, pause at the bottom." },
      { name: "Reverse Hyperextension",        sets: 5, reps: "50",     rest: 30,  desc: "Second session this week. Decompresses the spine and hits glutes/hams." },
      { name: "Leg Curl",                      sets: 5, reps: "50",     rest: 30,  desc: "Alternating seated or lying from Legs A. Full stretch, full contraction." },
      { name: "Calf Raise",                    sets: 5, reps: "50",     rest: 15,  desc: "Switch variation from Legs A. Maximize stretch — don't bounce at the bottom." },
    ]
  },

  // ── ORIGINAL 3 WORKOUTS ────────────────────────────────────────────────────
  {
    id: 1, name: "Morning Strength", emoji: "🌅", duration: 45, cal: 320,
    level: "Intermediate", category: "Strength", split: null, program: null,
    exercises: [
      { name: "Barbell Squat",       sets: 4, reps: "8",  rest: 90, desc: "Drive through heels, keep chest up." },
      { name: "Romanian Deadlift",   sets: 3, reps: "10", rest: 90, desc: "Hinge at hips, slight knee bend." },
      { name: "Dumbbell Press",      sets: 3, reps: "12", rest: 60, desc: "Full range of motion, controlled." },
      { name: "Pull-ups",            sets: 3, reps: "8",  rest: 90, desc: "Dead hang to chin over bar." },
      { name: "Plank Hold",          sets: 3, reps: "45s",rest: 45, desc: "Neutral spine, breathe steadily." },
    ]
  },
  {
    id: 2, name: "HIIT Cardio Blast", emoji: "🔥", duration: 30, cal: 410,
    level: "Advanced", category: "Cardio", split: null, program: null,
    exercises: [
      { name: "Burpees",             sets: 4, reps: "15", rest: 30, desc: "Explosive jump, full extension." },
      { name: "Jump Squats",         sets: 4, reps: "20", rest: 30, desc: "Land softly, absorb impact." },
      { name: "Mountain Climbers",   sets: 4, reps: "30s",rest: 20, desc: "Drive knees to chest, alternate." },
      { name: "High Knees",          sets: 3, reps: "45s",rest: 20, desc: "Pump arms, lift knees to hip." },
    ]
  },
  {
    id: 3, name: "Mobility Flow", emoji: "🧘", duration: 20, cal: 120,
    level: "Beginner", category: "Recovery", split: null, program: null,
    exercises: [
      { name: "Hip 90/90 Stretch",   sets: 2, reps: "60s",rest: 15, desc: "Sit tall, breathe into hip." },
      { name: "Thoracic Rotation",   sets: 2, reps: "10",  rest: 15, desc: "Rotate from thoracic, not lumbar." },
      { name: "World's Greatest",    sets: 2, reps: "8",   rest: 20, desc: "Full body mobility compound." },
      { name: "Pigeon Pose",         sets: 2, reps: "60s", rest: 15, desc: "Ease into hip flexor stretch." },
    ]
  },
];

// ─── WORKOUT DETAIL + TIMER ────────────────────────────────────────────────────
function WorkoutDetail({ workout, onBack, onStart }) {
  const isPB = workout.category === "Powerbuilding";
  return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Hero */}
      <div style={{
        padding: "24px 20px 20px",
        background: `linear-gradient(160deg, ${T.surface2} 0%, ${T.bg} 100%)`,
        borderBottom: `1px solid ${T.border}`
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 22, marginBottom: 12, padding: 0 }}>←</button>

        {isPB && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ color: T.muted, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Syne', sans-serif" }}>6-Day Powerbuilding</span>
            <span style={{ color: T.lime, fontWeight: 700, fontSize: 11, background: T.lime + "18", borderRadius: 50, padding: "2px 10px" }}>{workout.split}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 10 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: isPB ? `linear-gradient(135deg, ${T.lime}22, ${T.orange}22)` : T.dim,
            border: isPB ? `1px solid ${T.lime}44` : `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0
          }}>{workout.emoji}</div>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: T.white, fontWeight: 400, marginBottom: 2 }}>{workout.name}</h2>
            {workout.subtitle && <p style={{ color: T.muted, fontSize: 13, marginBottom: 8 }}>{workout.subtitle}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <Pill color={T.lime} style={{ fontSize: 11 }}>{workout.level}</Pill>
              <Pill color={T.orange} style={{ fontSize: 11 }}>{workout.category}</Pill>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          {[
            { icon: "⏱", val: `${workout.duration}m`, label: "Duration" },
            { icon: "🔥", val: `${workout.cal}`,       label: "Calories" },
            { icon: "📋", val: `${workout.exercises.length}`, label: "Exercises" },
          ].map((s, i) => (
            <div key={i} style={{ background: T.surface, borderRadius: 12, padding: "12px", textAlign: "center", border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</p>
              <p style={{ color: T.white, fontWeight: 800, fontSize: 16, fontFamily: "'Syne', sans-serif" }}>{s.val}</p>
              <p style={{ color: T.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {isPB && (
          <div style={{ marginTop: 12, background: T.orange + "15", border: `1px solid ${T.orange}33`, borderRadius: 12, padding: "10px 14px" }}>
            <p style={{ color: T.orange, fontSize: 11, lineHeight: 1.5 }}>
              <strong>Rest-Pause Protocol:</strong> AMQRAP sets use 20% less weight. Stop when form breaks — not when you want to stop.
            </p>
          </div>
        )}
      </div>

      {/* Exercises */}
      <div style={{ padding: "20px", flex: 1 }}>
        <p style={{ color: T.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>Exercise Plan</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {workout.exercises.map((ex, i) => {
            const isAMQRAP = ex.reps === "AMQRAP";
            return (
              <div key={i} className="fadeUp" style={{
                animationDelay: `${i * 0.07}s`,
                background: isAMQRAP ? T.orange + "10" : T.surface,
                borderRadius: 16, padding: "14px 16px",
                border: `1px solid ${isAMQRAP ? T.orange + "44" : T.border}`,
                display: "flex", alignItems: "flex-start", gap: 14
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: isAMQRAP ? T.orange + "22" : T.dim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isAMQRAP ? T.orange : T.lime,
                  fontWeight: 800, fontSize: 12, fontFamily: "'Syne', sans-serif",
                }}>{isAMQRAP ? "★" : i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ color: T.white, fontWeight: 500, fontSize: 13, fontFamily: "'Syne', sans-serif", letterSpacing: 0.1 }}>{ex.name}</p>
                    {isAMQRAP && <span style={{ color: T.orange, fontSize: 9, fontWeight: 800, background: T.orange + "22", borderRadius: 50, padding: "2px 8px", letterSpacing: 0.8 }}>AMQRAP</span>}
                  </div>
                  <p style={{ color: T.muted, fontSize: 12, marginBottom: ex.desc ? 4 : 0 }}>
                    {isAMQRAP ? "1 set · max quality reps · 20% drop weight" : `${ex.sets} sets · ${ex.reps} reps · ${ex.rest}s rest`}
                  </p>
                  {ex.desc && <p style={{ color: T.muted, fontSize: 11, lineHeight: 1.45, fontStyle: "italic" }}>{ex.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 20px 28px" }}>
        <button className="btn-press" onClick={() => onStart(workout)} style={{
          width: "100%", padding: "16px",
          background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
          border: "none", borderRadius: 50, color: accentText(),
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, cursor: "pointer",
          boxShadow: `0 8px 32px rgba(255,31,49,0.4)`
        }}>🔥 Start Workout</button>
      </div>
    </div>
  );
}

function WorkoutTimer({ workout, onDone }) {
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [phase, setPhase] = useState("work"); // work | rest | done
  const [seconds, setSeconds] = useState(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const ex = workout.exercises[exIdx];
  const isRest = phase === "rest";
  const isDone = phase === "done";

  const totalEx = workout.exercises.length;
  const totalSets = ex?.sets || 1;
  const overallPct = ((exIdx * 10 + setIdx) / (totalEx * 10)) * 100;

  const startRest = useCallback(() => {
    setPhase("rest");
    setSeconds(ex.rest);
    setRunning(true);
  }, [ex]);

  const nextSet = useCallback(() => {
    if (setIdx + 1 < totalSets) {
      setSetIdx(s => s + 1);
      setPhase("work");
      setRunning(false);
      setSeconds(null);
    } else if (exIdx + 1 < totalEx) {
      setExIdx(e => e + 1);
      setSetIdx(0);
      setPhase("work");
      setRunning(false);
      setSeconds(null);
    } else {
      setPhase("done");
    }
  }, [setIdx, totalSets, exIdx, totalEx]);

  useEffect(() => {
    if (running && seconds !== null) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (isRest) nextSet();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isRest, nextSet]);

  if (isDone) return (
    <div className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
      <div style={{ fontSize: 72, marginBottom: 20, animation: "pulse 1.5s infinite" }}>🏆</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, color: T.lime, marginBottom: 12 }}>Workout Complete!</h2>
      <p style={{ color: T.muted, fontSize: 15, marginBottom: 8 }}>{workout.name}</p>
      <div style={{ display: "flex", gap: 16, margin: "24px 0 32px" }}>
        {[["🔥", workout.cal, "kcal"], ["⏱", workout.duration, "min"], ["💪", workout.exercises.length, "exercises"]].map(([e, v, u], i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 24 }}>{e}</p>
            <p style={{ color: T.white, fontWeight: 800, fontSize: 20 }}>{v}</p>
            <p style={{ color: T.muted, fontSize: 11 }}>{u}</p>
          </div>
        ))}
      </div>
      <button className="btn-press" onClick={onDone} style={{
        width: "100%", padding: "16px",
        background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
        border: "none", borderRadius: 50, color: accentText(),
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer"
      }}>Back to Training →</button>
    </div>
  );

  return (
    <div className="fadeIn" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 20px 28px" }}>
      {/* Progress bar */}
      <div style={{ height: 4, background: T.dim, borderRadius: 2, marginBottom: 24 }}>
        <div style={{ height: "100%", width: `${overallPct}%`, background: `linear-gradient(90deg, ${T.lime}, ${T.orange})`, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>

      {/* Exercise name */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <p style={{ color: T.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
          {isRest ? "REST" : `Exercise ${exIdx + 1} of ${totalEx}`}
        </p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: isRest ? T.orange : T.white, fontWeight: 300, lineHeight: 1.1 }}>
          {isRest ? "Rest & Recover" : ex.name}
        </h2>
        {!isRest && <p style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>{ex.desc}</p>}
      </div>

      {/* Big timer / rep display */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {seconds !== null ? (
          <div style={{
            width: 180, height: 180, borderRadius: "50%",
            border: `4px solid ${isRest ? T.orange : T.lime}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column",
            boxShadow: `0 0 40px ${isRest ? T.orange : T.lime}44`,
            animation: running && seconds <= 5 ? "timerPulse 1s infinite" : "none"
          }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 64, color: isRest ? T.orange : T.lime, lineHeight: 1 }}>{seconds}</span>
            <span style={{ color: T.muted, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>seconds</span>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 160, height: 160, borderRadius: "50%",
              border: `4px solid ${T.lime}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", margin: "0 auto 16px"
            }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 56, color: T.lime, lineHeight: 1 }}>{ex.reps}</span>
              <span style={{ color: T.muted, fontSize: 12, letterSpacing: 2 }}>REPS</span>
            </div>
          </div>
        )}
      </div>

      {/* Set tracker */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ color: T.muted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
          Set {setIdx + 1} of {totalSets}
        </p>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {Array.from({ length: totalSets }, (_, i) => (
            <div key={i} style={{
              width: 28, height: 6, borderRadius: 3,
              background: i < setIdx ? T.lime : i === setIdx ? `${T.lime}66` : T.dim,
              transition: "background 0.3s"
            }} />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!isRest && seconds === null && (
          <button className="btn-press" onClick={startRest} style={{
            padding: "16px", background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
            border: "none", borderRadius: 50, color: accentText(),
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer"
          }}>✓ Set Complete — Start Rest</button>
        )}
        {isRest && (
          <button className="btn-press" onClick={() => { clearInterval(intervalRef.current); setRunning(false); nextSet(); }} style={{
            padding: "16px", background: T.surface2,
            border: `2px solid ${T.orange}`, borderRadius: 50, color: T.orange,
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer"
          }}>Skip Rest →</button>
        )}
        <button className="btn-press" onClick={nextSet} style={{
          padding: "14px", background: "none",
          border: `1.5px solid ${T.border}`, borderRadius: 50, color: T.muted,
          fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer"
        }}>Skip Exercise</button>
      </div>
    </div>
  );
}

// ─── AI TRAINER CHAT ──────────────────────────────────────────────────────────
function AITrainerChat({ profile }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hey ${profile?.name || "there"}! 💪 I'm your Soma. I've built your plan around your goal to ${(profile?.goal || "get fit").toLowerCase()}. Ask me anything — form tips, schedule adjustments, nutrition, recovery. I'm here to help you thrive.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemPrompt = `You are a world-class personal fitness trainer and coach named Soma. You are empathetic, motivating, knowledgeable, and direct. You give concise, actionable advice.

User profile:
- Name: ${profile?.name || "Unknown"}
- Goal: ${profile?.goal || "general fitness"}
- Level: ${profile?.level || "intermediate"}
- Training days: ${profile?.days || 4} per week

Available workouts: Morning Strength (45min, intermediate), HIIT Cardio Blast (30min, advanced), Mobility Flow (20min, beginner).

Keep responses concise (2-4 sentences max unless asked for detail). Be encouraging but realistic. Use a warm, coach-like tone. Occasionally use a relevant emoji to add personality.`;

      const apiMessages = newMessages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text
      }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: apiMessages
        })
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "Sorry, I couldn't respond right now.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e) {
      setError("Couldn't reach the AI trainer. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} className="fadeUp" style={{
            alignSelf: m.role === "assistant" ? "flex-start" : "flex-end",
            maxWidth: "85%"
          }}>
            {m.role === "assistant" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✦</div>
                <span style={{ color: T.muted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>AI Trainer</span>
              </div>
            )}
            <div style={{
              background: m.role === "assistant" ? T.surface : `linear-gradient(135deg, ${T.lime}cc, ${T.orange}cc)`,
              color: m.role === "assistant" ? T.white : accentText(),
              borderRadius: m.role === "assistant" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              padding: "12px 15px", fontSize: 14, lineHeight: 1.6,
              border: m.role === "assistant" ? `1px solid ${T.border}` : "none",
              fontWeight: m.role === "user" ? 600 : 400
            }}>{m.text}</div>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✦</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: T.lime, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ color: T.orange, fontSize: 12, textAlign: "center" }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, overflowX: "auto" }}>
        {["Best workout today?", "Fix my squat form", "I'm feeling tired", "Plan my week"].map(q => (
          <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 50, padding: "6px 14px", color: T.muted, fontSize: 12,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Syne', sans-serif",
            flexShrink: 0
          }}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "8px 16px 16px", display: "flex", gap: 10, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask your trainer..."
          style={{
            flex: 1, background: T.surface2, border: `1.5px solid ${T.border}`,
            borderRadius: 50, color: T.white, padding: "12px 18px",
            fontSize: 14, outline: "none", fontFamily: "'Syne', sans-serif",
            transition: "border-color 0.2s"
          }}
          onFocus={e => e.target.style.borderColor = T.lime}
          onBlur={e => e.target.style.borderColor = T.border}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="btn-press"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: input.trim() ? `linear-gradient(135deg, ${T.lime}, ${T.orange})` : T.dim,
            border: "none", cursor: input.trim() ? "pointer" : "default",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s", flexShrink: 0
          }}>↑</button>
      </div>
    </div>
  );
}

// ─── MAIN TABS ────────────────────────────────────────────────────────────────
function HomeTab({ profile, onOpenWorkout }) {
  const days = ["M","T","W","T","F","S","S"];
  const done = [0, 1, 2, 4];
  const goals = [
    { label: "Workouts", cur: 3, max: profile?.days || 5, color: T.lime },
    { label: "Calories",  cur: 1240, max: 2000, color: T.lime, suffix: "kcal" },
    { label: "Minutes",   cur: 95,   max: 150,  color: T.orange, suffix: "min" },
  ];

  return (
    <div style={{ padding: "0 20px 24px", overflowY: "auto" }}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <p style={{ color: T.muted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>Sunday, March 1</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: T.white, fontWeight: 300, lineHeight: 1.15 }}>
          Good morning,{" "}
          <span style={{ color: T.lime, fontStyle: "italic" }}>{profile?.name || "Champion"}</span>
        </h1>
      </div>

      {/* AI Nudge Card */}
      <Card style={{ padding: "18px 20px", marginBottom: 16, position: "relative", overflow: "hidden", border: `1px solid ${T.lime}33` }}>
        <div style={{ position: "absolute", right: -24, top: -24, width: 120, height: 120, borderRadius: "50%", background: `${T.lime}0c` }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
          <span style={{ color: T.lime, fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Syne', sans-serif" }}>AI Trainer</span>
        </div>
        <p style={{ color: T.white, fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>
          Recovery score <strong style={{ color: T.lime }}>87/100</strong>. You're primed for strength work today. I'd recommend <strong>Morning Strength</strong> — start with compound lifts while energy is high.
        </p>
        <button className="btn-press" onClick={() => onOpenWorkout(WORKOUTS[0])} style={{
          background: T.lime, border: "none", borderRadius: 50, padding: "10px 20px",
          color: accentText(), fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer"
        }}>Start Recommended →</button>
      </Card>

      {/* Streak */}
      <Card style={{ padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: T.white, fontWeight: 400, fontSize: 14, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.3 }}>Weekly Streak</span>
          <span style={{ color: T.lime, fontWeight: 700, fontSize: 13 }}>🔥 5 days</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {days.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: done.includes(i) ? T.lime : T.dim,
                border: i === 5 ? `2px solid ${T.lime}` : "2px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: done.includes(i) ? accentText() : T.muted, fontSize: 14, fontWeight: 800
              }}>{done.includes(i) ? "✓" : ""}</div>
              <span style={{ color: T.muted, fontSize: 10, fontWeight: 700 }}>{d}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Goals */}
      <p style={{ color: T.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>Today's Progress</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {goals.map((g, i) => {
          const pct = Math.min(100, Math.round((g.cur / g.max) * 100));
          return (
            <Card key={i} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <Ring pct={pct} color={g.color} size={54} stroke={5}>
                <span style={{ color: g.color, fontSize: 10, fontWeight: 800 }}>{pct}%</span>
              </Ring>
              <div style={{ flex: 1 }}>
                <p style={{ color: T.muted, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3, fontFamily: "'Syne', sans-serif" }}>{g.label}</p>
                <p style={{ color: T.white, fontWeight: 800, fontFamily: "'Syne', sans-serif", fontSize: 17 }}>
                  {g.cur.toLocaleString()}<span style={{ color: T.muted, fontSize: 12, fontWeight: 400 }}> / {g.max.toLocaleString()} {g.suffix}</span>
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TrainTab({ profile, onOpenWorkout }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <p style={{ color: T.muted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>AI Powered</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: T.white, fontWeight: 300, marginBottom: 16 }}>
          Your <span style={{ color: T.orange, fontStyle: "italic" }}>Trainer</span>
        </h1>
      </div>
      <AITrainerChat profile={profile} />
    </div>
  );
}

const FILTERS = ["All", "Powerbuilding", "Strength", "Cardio", "Recovery"];

function WorkoutCard({ w, i, onOpenWorkout }) {
  const isPB = w.category === "Powerbuilding";
  return (
    <button
      key={w.id}
      onClick={() => onOpenWorkout(w)}
      className="btn-press fadeUp"
      style={{
        animationDelay: `${i * 0.06}s`,
        background: T.surface,
        border: `1px solid ${isPB ? T.lime + "44" : T.border}`,
        borderRadius: 20, padding: "16px 18px",
        cursor: "pointer", textAlign: "left",
        transition: "border-color 0.2s, background 0.2s",
        width: "100%",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.lime; e.currentTarget.style.background = T.lime + "08"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isPB ? T.lime + "44" : T.border; e.currentTarget.style.background = T.surface; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14, flexShrink: 0,
          background: isPB ? `linear-gradient(135deg, ${T.lime}22, ${T.orange}22)` : T.dim,
          border: isPB ? `1px solid ${T.lime}33` : "none",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24
        }}>{w.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <p style={{ color: T.white, fontWeight: 600, fontFamily: "'Syne', sans-serif", fontSize: 14, letterSpacing: 0.2 }}>{w.name}</p>
            {w.split && <span style={{ color: T.lime, fontSize: 10, fontWeight: 700, background: T.lime + "18", borderRadius: 50, padding: "2px 8px", letterSpacing: 0.5, flexShrink: 0 }}>{w.split}</span>}
          </div>
          {w.subtitle && <p style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{w.subtitle}</p>}
          <div style={{ display: "flex", gap: 6 }}>
            <Pill color={T.lime} style={{ padding: "3px 9px", fontSize: 10 }}>{w.level}</Pill>
            <Pill color={T.orange} style={{ padding: "3px 9px", fontSize: 10 }}>{w.category}</Pill>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {[["⏱", `${w.duration}m`], ["🔥", `${w.cal} kcal`], ["📋", `${w.exercises.length} ex`]].map(([icon, val]) => (
          <span key={val} style={{ color: T.muted, fontSize: 12 }}>{icon} {val}</span>
        ))}
      </div>
    </button>
  );
}

function WorkoutsTab({ onOpenWorkout }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? WORKOUTS : WORKOUTS.filter(w => w.category === filter);
  const pbWorkouts = filtered.filter(w => w.category === "Powerbuilding");
  const otherWorkouts = filtered.filter(w => w.category !== "Powerbuilding");

  return (
    <div style={{ padding: "0 0 24px", overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "20px 20px 0", marginBottom: 16 }}>
        <p style={{ color: T.muted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>Library</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: T.white, fontWeight: 300 }}>
          Work<span style={{ color: T.orange, fontStyle: "italic" }}>outs</span>
        </h1>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, padding: "0 20px 16px", overflowX: "auto" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="btn-press" style={{
            background: filter === f ? T.lime : T.surface,
            border: `1.5px solid ${filter === f ? T.lime : T.border}`,
            borderRadius: 50, padding: "7px 16px", cursor: "pointer",
            color: filter === f ? accentText() : T.muted,
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
            letterSpacing: 0.5, whiteSpace: "nowrap", flexShrink: 0,
            transition: "all 0.2s"
          }}>{f}</button>
        ))}
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Powerbuilding program block */}
        {pbWorkouts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              background: `linear-gradient(135deg, ${T.lime}15, ${T.teal}10)`,
              border: `1px solid ${T.lime}33`,
              borderRadius: 18, padding: "14px 16px", marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                <div>
                  <p style={{ color: T.lime, fontWeight: 600, fontSize: 11, fontFamily: "'Syne', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>6-Day Powerbuilding Split</p>
                  <p style={{ color: T.muted, fontSize: 11 }}>Nick Ludlow · 12 Weeks · Rest-Pause Protocol</p>
                </div>
              </div>
              <p style={{ color: T.muted, fontSize: 11, lineHeight: 1.5 }}>
                High-volume Push/Pull/Legs × 2 with AMQRAP finisher sets. Build serious size and strength simultaneously.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pbWorkouts.map((w, i) => <WorkoutCard key={w.id} w={w} i={i} onOpenWorkout={onOpenWorkout} />)}
            </div>
          </div>
        )}

        {/* Other workouts */}
        {otherWorkouts.length > 0 && (
          <div>
            {pbWorkouts.length > 0 && (
              <p style={{ color: T.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>Quick Sessions</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {otherWorkouts.map((w, i) => <WorkoutCard key={w.id} w={w} i={i + pbWorkouts.length} onOpenWorkout={onOpenWorkout} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ALEXANDER_QUOTES = [
  { latin: "Aut viam inveniam aut faciam.", translation: "I will either find a way or make one." },
  { latin: "Nusquam est qui ubique est.", translation: "One who is everywhere is nowhere." },
  { latin: "Per aspera ad astra.", translation: "Through hardship to the stars." },
  { latin: "Dum spiro, spero.", translation: "While I breathe, I hope." },
  { latin: "Vincit qui se vincit.", translation: "He conquers who conquers himself." },
  { latin: "Fortes fortuna adiuvat.", translation: "Fortune favors the brave." },
  { latin: "Nec spe nec metu.", translation: "Without hope, without fear." },
];

function ProgressTab() {
  const CHART_H = 90;
  const LABEL_H = 18;
  const VALUE_H = 16;

  const [quoteIdx, setQuoteIdx] = useState(0);
  const quote = ALEXANDER_QUOTES[quoteIdx];

  // ── Stats the user can edit ──────────────────────────────────────────────
  const [stats, setStats] = useState({
    weight: "", height: "", bodyFat: "", chest: "", waist: "", hips: "", bicep: "", thigh: "",
  });
  const [showStatsForm, setShowStatsForm] = useState(false);
  const [draftStats, setDraftStats] = useState({ ...stats });

  // ── Weight history — seeded with demo data, new entries appended ─────────
  const [weightLog, setWeightLog] = useState([
    { label: "Sep", value: 185 },
    { label: "Oct", value: 182 },
    { label: "Nov", value: 179 },
    { label: "Dec", value: 176 },
    { label: "Jan", value: 173 },
    { label: "Feb", value: 170 },
  ]);

  const saveStats = () => {
    setStats({ ...draftStats });
    // If a new weight was entered, append it to the chart log
    const newW = parseFloat(draftStats.weight);
    if (!isNaN(newW) && newW > 0) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const now = new Date();
      const label = months[now.getMonth()];
      // Only add if it differs from the last entry
      setWeightLog(prev => {
        const last = prev[prev.length - 1];
        if (last && last.value === newW) return prev;
        // Keep max 8 entries in chart
        const next = [...prev, { label, value: newW }];
        return next.length > 8 ? next.slice(next.length - 8) : next;
      });
    }
    setShowStatsForm(false);
  };

  const chartValues = weightLog.map(e => e.value);
  const chartMax = Math.max(...chartValues);
  const chartMin = Math.max(0, Math.min(...chartValues) - 10);
  const totalLost = weightLog.length > 1
    ? (weightLog[0].value - weightLog[weightLog.length - 1].value).toFixed(1)
    : "—";

  const inputStyle = (focused) => ({
    width: "100%", background: T.surface2,
    border: `1.5px solid ${focused ? T.lime : T.border}`,
    borderRadius: 10, padding: "10px 12px",
    color: T.white, fontSize: 14,
    fontFamily: "'Syne', sans-serif", outline: "none",
    transition: "border-color 0.2s",
  });

  const STAT_FIELDS = [
    { key: "weight",  label: "Weight",       unit: "lbs", placeholder: "e.g. 175" },
    { key: "height",  label: "Height",        unit: "in",  placeholder: "e.g. 70" },
    { key: "bodyFat", label: "Body Fat",      unit: "%",   placeholder: "e.g. 18" },
    { key: "chest",   label: "Chest",         unit: "in",  placeholder: "e.g. 42" },
    { key: "waist",   label: "Waist",         unit: "in",  placeholder: "e.g. 34" },
    { key: "hips",    label: "Hips",          unit: "in",  placeholder: "e.g. 38" },
    { key: "bicep",   label: "Bicep",         unit: "in",  placeholder: "e.g. 15" },
    { key: "thigh",   label: "Thigh",         unit: "in",  placeholder: "e.g. 22" },
  ];

  return (
    <div style={{ padding: "0 20px 24px", overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: T.muted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Syne', sans-serif", fontWeight: 400 }}>Your Journey</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: T.white, fontWeight: 300 }}>
            Pro<span style={{ color: T.orange }}>gress</span>
          </h1>
        </div>
        <button
          className="btn-press"
          onClick={() => { setDraftStats({ ...stats }); setShowStatsForm(s => !s); }}
          style={{
            background: showStatsForm ? T.lime : "none",
            border: `1.5px solid ${T.lime}`,
            borderRadius: 50, padding: "8px 16px",
            color: showStatsForm ? accentText() : T.lime,
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: 12, cursor: "pointer", letterSpacing: 0.5,
            transition: "all 0.2s"
          }}>
          {showStatsForm ? "✕ Cancel" : "+ Log Stats"}
        </button>
      </div>

      {/* ── Stats Input Form ─────────────────────────────────────────────── */}
      {showStatsForm && (
        <Card style={{ padding: "18px", marginBottom: 16, border: `1px solid ${T.lime}33` }} className="fadeUp">
          <p style={{ color: T.white, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", fontSize: 17, marginBottom: 4 }}>Log Your Stats</p>
          <p style={{ color: T.muted, fontSize: 11, marginBottom: 16 }}>Weight updates will be added to your trend chart.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {STAT_FIELDS.map(({ key, label, unit, placeholder }) => (
              <div key={key}>
                <p style={{ color: T.muted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>
                  {label} <span style={{ color: T.lime, opacity: 0.7 }}>({unit})</span>
                </p>
                <input
                  type="number"
                  placeholder={placeholder}
                  value={draftStats[key]}
                  onChange={e => setDraftStats(d => ({ ...d, [key]: e.target.value }))}
                  style={inputStyle(false)}
                  onFocus={e => e.target.style.borderColor = T.lime}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
            ))}
          </div>
          <button className="btn-press" onClick={saveStats} style={{
            width: "100%", padding: "13px",
            background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
            border: "none", borderRadius: 50,
            color: accentText(), fontFamily: "'Syne', sans-serif",
            fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}>Save & Update Chart</button>
        </Card>
      )}

      {/* ── Current Stats Display ────────────────────────────────────────── */}
      {!showStatsForm && (stats.weight || stats.bodyFat || stats.chest) && (
        <Card style={{ padding: "16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ color: T.white, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", fontSize: 16 }}>Current Stats</p>
            <button onClick={() => { setDraftStats({ ...stats }); setShowStatsForm(true); }} style={{
              background: "none", border: "none", color: T.lime, fontSize: 12,
              fontFamily: "'Syne', sans-serif", fontWeight: 700, cursor: "pointer"
            }}>Edit</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {STAT_FIELDS.filter(f => draftStats[f.key] || stats[f.key]).map(({ key, label, unit }) => {
              const val = stats[key];
              if (!val) return null;
              return (
                <div key={key} style={{ textAlign: "center", background: T.surface2, borderRadius: 10, padding: "10px 6px" }}>
                  <p style={{ color: T.lime, fontWeight: 800, fontSize: 15, fontFamily: "'Cormorant Garamond', serif" }}>{val}</p>
                  <p style={{ color: T.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{label}</p>
                  <p style={{ color: T.muted, fontSize: 9, opacity: 0.6 }}>{unit}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          ["47", "Workouts"],
          [`${totalLost}`, "lbs Lost"],
          ["3.8", "Avg/wk"],
        ].map(([v, l]) => (
          <Card key={l} style={{ padding: "14px 12px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", color: T.lime, fontSize: 26, fontWeight: 700 }}>{v}</p>
            <p style={{ color: T.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{l}</p>
          </Card>
        ))}
      </div>

      {/* ── Weight Trend Chart ───────────────────────────────────────────── */}
      <Card style={{ padding: "18px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ color: T.white, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", fontSize: 16, letterSpacing: 0.3 }}>Weight Trend</p>
          {weightLog.length > 1 && (
            <span style={{
              color: weightLog[weightLog.length-1].value < weightLog[0].value ? T.teal : T.orange,
              fontSize: 11, fontWeight: 700
            }}>
              {weightLog[weightLog.length-1].value < weightLog[0].value ? "↓" : "↑"} {Math.abs(weightLog[0].value - weightLog[weightLog.length-1].value).toFixed(1)} lbs
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: VALUE_H + CHART_H + LABEL_H }}>
          {weightLog.map((entry, i) => {
            const range = chartMax - chartMin || 1;
            const barH = Math.round(((entry.value - chartMin) / range) * (CHART_H - 8) + 8);
            const isLast = i === weightLog.length - 1;
            const isNew = i === weightLog.length - 1 && weightLog.length > 6;
            return (
              <div key={i} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", height: "100%", justifyContent: "flex-end",
              }}>
                <span style={{
                  color: isLast ? T.lime : T.muted, fontSize: 9, fontWeight: 600,
                  height: VALUE_H, display: "flex", alignItems: "flex-end", paddingBottom: 3
                }}>{entry.value}</span>
                <div style={{
                  width: "100%", height: barH,
                  background: isLast
                    ? `linear-gradient(180deg, ${T.lime}, ${T.orange})`
                    : isNew ? `${T.lime}55` : T.dim,
                  borderRadius: "5px 5px 2px 2px",
                  transition: "height 0.8s ease", flexShrink: 0,
                  boxShadow: isLast ? `0 0 10px ${T.lime}44` : "none"
                }} />
                <span style={{
                  color: isLast ? T.lime : T.muted, fontSize: 9, fontWeight: isLast ? 700 : 600,
                  height: LABEL_H, display: "flex", alignItems: "center", paddingTop: 3
                }}>{entry.label}</span>
              </div>
            );
          })}
        </div>
        {weightLog.length === 1 && (
          <p style={{ color: T.muted, fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Log more stats to see your trend
          </p>
        )}
      </Card>

      {/* Accountability */}
      <Card style={{ padding: "18px", marginBottom: 16 }}>
        <p style={{ color: T.white, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", marginBottom: 14, fontSize: 16, letterSpacing: 0.3 }}>Accountability</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Ring pct={84} color={T.lime} size={72} stroke={6}>
            <span style={{ color: T.white, fontWeight: 800, fontSize: 18, fontFamily: "'Syne', sans-serif" }}>84</span>
          </Ring>
          <div>
            <p style={{ color: T.lime, fontWeight: 600, marginBottom: 4, fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontStyle: "italic" }}>Excellent!</p>
            <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.5 }}>84% of scheduled workouts completed. Top 12% of all users.</p>
          </div>
        </div>
      </Card>

      {/* Alexander the Great Latin Quotes */}
      <Card style={{ padding: "20px 18px" }}>
        <p style={{ color: T.muted, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14, fontFamily: "'Syne', sans-serif" }}>Words of the Conqueror</p>
        <div style={{ marginBottom: 18 }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: T.lime, fontSize: 20, fontWeight: 700,
            lineHeight: 1.3, marginBottom: 8, fontStyle: "italic"
          }}>"{quote.latin}"</p>
          <p style={{ color: T.white, fontSize: 13, lineHeight: 1.55 }}>{quote.translation}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {ALEXANDER_QUOTES.map((_, i) => (
              <button key={i} onClick={() => setQuoteIdx(i)} style={{
                width: i === quoteIdx ? 20 : 7, height: 7,
                borderRadius: 4, border: "none", cursor: "pointer",
                background: i === quoteIdx ? T.lime : T.dim,
                transition: "all 0.3s ease", padding: 0
              }} />
            ))}
          </div>
          <button onClick={() => setQuoteIdx(i => (i + 1) % ALEXANDER_QUOTES.length)} style={{
            background: "none", border: `1px solid ${T.border}`,
            borderRadius: 50, padding: "5px 14px",
            color: T.muted, fontSize: 11, fontWeight: 700,
            cursor: "pointer", letterSpacing: 0.5,
            fontFamily: "'Syne', sans-serif"
          }}>Next →</button>
        </div>
      </Card>
    </div>
  );
}

// ─── PROFILE + THEME TAB ─────────────────────────────────────────────────────
function ProfileTab({ profile, currentThemeId, onThemeChange }) {
  const themeList = Object.values(THEMES);

  return (
    <div style={{ padding: "0 20px 32px", overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 800, color: bgText(),
            boxShadow: `0 8px 24px ${T.lime}44`
          }}>{profile?.name?.[0]?.toUpperCase() || "A"}</div>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: T.white, fontWeight: 400, letterSpacing: 0.3, marginBottom: 2 }}>
              {profile?.name || "Athlete"}
            </h2>
            <p style={{ color: T.muted, fontSize: 12 }}>Member since Jan 2025 · Pro Plan</p>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div style={{ marginBottom: 28 }}>
        {[
          { k: "Goal",     v: profile?.goal     || "Build Muscle" },
          { k: "Level",    v: profile?.level    || "Intermediate" },
          { k: "Schedule", v: `${profile?.days || 4} days / week` },
          { k: "Weight",   v: "170 lbs" },
          { k: "Target",   v: "160 lbs" },
        ].map((row, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 0", borderBottom: `1px solid ${T.border}`
          }}>
            <span style={{ color: T.muted, fontSize: 13 }}>{row.k}</span>
            <span style={{ color: T.white, fontSize: 13, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", textTransform: "capitalize" }}>{row.v}</span>
          </div>
        ))}
      </div>

      {/* ── THEME SWITCHER ─────────────────────────────────────────────── */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: T.muted, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2, fontFamily: "'Syne', sans-serif" }}>Appearance</p>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: T.white, fontWeight: 400 }}>Color Themes</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {themeList.map(theme => {
            const isActive = currentThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className="btn-press"
                style={{
                  background: theme.bg,
                  border: isActive
                    ? `2px solid ${theme.lime}`
                    : `2px solid transparent`,
                  borderRadius: 18, padding: "14px",
                  cursor: "pointer", textAlign: "left",
                  position: "relative", overflow: "hidden",
                  transition: "border-color 0.25s, transform 0.15s",
                  boxShadow: isActive ? `0 0 0 1px ${theme.lime}44, 0 8px 24px ${theme.bg}99` : "none",
                }}
              >
                {/* Swatch row */}
                <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                  {theme.preview.map((c, i) => (
                    <div key={i} style={{
                      flex: 1, height: 28, borderRadius: 7,
                      background: c,
                      border: "1px solid rgba(255,255,255,0.08)"
                    }} />
                  ))}
                </div>

                {/* Name row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ color: theme.white, fontWeight: 600, fontSize: 12, fontFamily: "'Syne', sans-serif", letterSpacing: 0.3, marginBottom: 1 }}>
                      {theme.name}
                    </p>
                    <p style={{ color: theme.muted, fontSize: 10 }}>{theme.description}</p>
                  </div>
                  {isActive && (
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: theme.lime,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: theme.bg === "#eff1ed" ? "#eff1ed" : "#ffffff", fontWeight: 800, flexShrink: 0
                    }}>✓</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active theme indicator */}
        <div style={{
          marginTop: 14, padding: "12px 16px",
          background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.lime, boxShadow: `0 0 8px ${T.lime}`, flexShrink: 0 }} />
            <span style={{ color: T.muted, fontSize: 12 }}>
              Active: <span style={{ color: T.white, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", fontSize: 14 }}>{THEMES[currentThemeId]?.name}</span>
              <span style={{ color: T.muted }}>{" — "}{THEMES[currentThemeId]?.description}</span>
            </span>
          </div>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: 13,
              color: T.muted,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontStyle: "italic"
            }}>By Soma</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
// SVG icon components for nav
const NavIcon = ({ id, active }) => {
  const c = active ? T.lime : T.muted;
  const icons = {
    home: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
    train: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
    ),
    workouts: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11"/>
        <circle cx="3.5" cy="6.5" r="1.2" fill={c}/>
        <circle cx="3.5" cy="12" r="1.2" fill={c}/>
        <circle cx="3.5" cy="17.5" r="1.2" fill={c}/>
      </svg>
    ),
    progress: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    profile: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  };
  return icons[id] || null;
};

const NAV = [
  { id: "home",     label: "Home"     },
  { id: "train",    label: "Train"    },
  { id: "workouts", label: "Workouts" },
  { id: "progress", label: "Progress" },
  { id: "profile",  label: "Profile"  },
];

export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("home");
  const [workoutDetail, setWorkoutDetail] = useState(null);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [themeId, setThemeId] = useState("terrain");
  const [, forceRender] = useState(0);

  // Apply theme — mutate module-level T so all existing components pick it up
  const applyTheme = (id) => {
    const theme = THEMES[id];
    if (!theme) return;
    Object.assign(T, theme);
    setThemeId(id);
    forceRender(n => n + 1);
  };

  const handleOnboardComplete = (p) => {
    setProfile(p);
    setScreen("app");
  };

  const openWorkout = (w) => {
    setWorkoutDetail(w);
    setActiveWorkout(null);
  };

  const startWorkout = (w) => {
    setActiveWorkout(w);
    setWorkoutDetail(null);
  };

  const endWorkout = () => {
    setActiveWorkout(null);
    setWorkoutDetail(null);
    setTab("workouts");
  };

  const activeTheme = THEMES[themeId];

  return (
    <div style={{
      minHeight: "100vh", background: activeTheme.pageWrap,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Syne', sans-serif", padding: "20px 0",
      transition: "background 0.4s ease"
    }}>
      <style>{css}</style>
      <style>{`
        body { background: ${activeTheme.pageWrap} !important; transition: background 0.4s ease; }
      `}</style>

      {/* Phone */}
      <div style={{
        width: 393, height: 852,
        background: T.bg, borderRadius: 55,
        overflow: "hidden",
        boxShadow: `0 60px 120px rgba(0,0,0,0.8), 0 0 0 1px ${activeTheme.ring}`,
        display: "flex", flexDirection: "column", position: "relative",
        transition: "background 0.4s ease, box-shadow 0.4s ease"
      }}>
        {/* iPhone 16 Dynamic Island */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, flexShrink: 0 }}>
          <div style={{
            width: 120, height: 34, borderRadius: 20,
            background: "#000000",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 14px",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06)"
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1a1a1a", border: "1.5px solid #2a2a2a" }} />
            <div style={{ width: 44, height: 6, borderRadius: 3, background: "#1a1a1a", border: "1px solid #2a2a2a" }} />
          </div>
        </div>

        {/* iOS Status Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 28px 0", fontSize: 12, fontWeight: 600, color: T.white, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>9:41</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
              {[5, 8, 11, 13].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, borderRadius: 1.5, background: T.white, opacity: i < 3 ? 1 : 0.3 }} />
              ))}
            </div>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <path d="M7.5 8.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" fill={T.white}/>
              <path d="M4.2 6.3a4.7 4.7 0 016.6 0" stroke={T.white} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
              <path d="M1.5 3.6a8.5 8.5 0 0112 0" stroke={T.white} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.4"/>
            </svg>
            <div style={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <div style={{ width: 22, height: 11, borderRadius: 3, border: `1.5px solid ${T.white}`, padding: 1.5, display: "flex", alignItems: "center" }}>
                <div style={{ height: "100%", width: "80%", borderRadius: 1.5, background: T.white }} />
              </div>
              <div style={{ width: 2, height: 5, borderRadius: 1, background: T.white, opacity: 0.45 }} />
            </div>
          </div>
        </div>

        {/* Logo bar */}
        {screen === "app" && !activeWorkout && (
          <div style={{ padding: "8px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke={T.lime} strokeWidth="1.5"/>
                <path d="M7 3v4l2.5 2.5" stroke={T.lime} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{
                color: T.white,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontSize: 16,
                letterSpacing: 4,
                textTransform: "uppercase"
              }}>Soma</span>
              <span style={{
                color: T.muted,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginLeft: 2,
                alignSelf: "flex-end",
                paddingBottom: 1
              }}>: Your Intelligent Trainer</span>
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.lime}, ${T.orange})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: bgText(),
              cursor: "pointer"
            }} onClick={() => setTab("profile")}>
              {profile?.name?.[0]?.toUpperCase() || "?"}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: screen === "onboarding" ? "auto" : "hidden", display: "flex", flexDirection: "column" }}>
          {screen === "onboarding" && (
            <OnboardingFlow onComplete={handleOnboardComplete} />
          )}
          {screen === "app" && activeWorkout && (
            <WorkoutTimer workout={activeWorkout} onDone={endWorkout} />
          )}
          {screen === "app" && !activeWorkout && workoutDetail && (
            <WorkoutDetail workout={workoutDetail} onBack={() => setWorkoutDetail(null)} onStart={startWorkout} />
          )}
          {screen === "app" && !activeWorkout && !workoutDetail && (
            <>
              {tab === "home"     && <HomeTab profile={profile} onOpenWorkout={(w) => { setTab("workouts"); openWorkout(w); }} />}
              {tab === "train"    && <TrainTab profile={profile} onOpenWorkout={openWorkout} />}
              {tab === "workouts" && <WorkoutsTab onOpenWorkout={openWorkout} />}
              {tab === "progress" && <ProgressTab />}
              {tab === "profile"  && <ProfileTab profile={profile} currentThemeId={themeId} onThemeChange={applyTheme} />}
            </>
          )}
        </div>

        {/* Bottom Nav */}
        {screen === "app" && !activeWorkout && !workoutDetail && (
          <div style={{
            display: "flex", background: T.surface,
            borderTop: `1px solid ${T.border}`,
            padding: "10px 0 18px", flexShrink: 0,
            transition: "background 0.4s ease"
          }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{
                flex: 1, background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "opacity 0.2s"
              }}>
                <NavIcon id={n.id} active={tab === n.id} />
                <span style={{
                  fontSize: 8, fontWeight: tab === n.id ? 700 : 500,
                  letterSpacing: 0.6, textTransform: "uppercase",
                  color: tab === n.id ? T.lime : T.muted,
                  fontFamily: "'Syne', sans-serif",
                  transition: "color 0.25s"
                }}>{n.label}</span>
                {tab === n.id && <div style={{ width: 16, height: 2, borderRadius: 1, background: T.lime, transition: "background 0.25s" }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
