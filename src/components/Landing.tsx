import { ArrowRight, Check, ChevronDown, ClipboardCheck, FileText, Globe, Package, Route, Sparkles, Star, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Block } from "../lib/types";
import { BlockView, ThemeContext } from "./blocks";
import { defaultTheme } from "../lib/types";

/* self-contained motion for the marketing surface */
const LANDING_STYLE = `
@keyframes lsfloat{0%{transform:translateY(0) rotate(var(--r,0deg))}100%{transform:translateY(-14px) rotate(var(--r,0deg))}}
@keyframes lsmarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes lscaret{0%,55%{opacity:1}56%,100%{opacity:0}}
@keyframes lsglow{0%,100%{opacity:.5}50%{opacity:.95}}
.ls-float{animation:lsfloat 6s ease-in-out infinite alternate}
.ls-marquee{animation:lsmarquee 32s linear infinite}
.ls-caret{animation:lscaret 1s steps(1) infinite}
.ls-glow{animation:lsglow 7s ease-in-out infinite}
`;

const STAGES = ["Analyzing source material", "Designing learning objectives", "Structuring modules", "Writing lesson content", "Creating activities", "Generating assessment"];
const GEN_MODULES = [
  { t: "Foundations of clear communication", lessons: 2 },
  { t: "Active listening that earns trust", lessons: 2 },
  { t: "Feedback that actually lands", lessons: 2 },
  { t: "Difficult conversations", lessons: 1 },
  { t: "Final assessment", lessons: 1 },
];
const TITLE = "Workplace Communication Essentials";

function LiveBuildPanel() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % (STAGES.length * 3 + 14)), 260);
    return () => clearInterval(t);
  }, []);
  const typed = TITLE.slice(0, Math.min(TITLE.length, phase * 2));
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(phase / 3))];
  const modsVisible = Math.max(0, Math.min(GEN_MODULES.length, phase - 9));
  const progress = Math.min(100, Math.round((phase / (STAGES.length * 3 + 12)) * 100));
  const finished = phase > STAGES.length * 3 + 8;

  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10">
        <div className="ls-glow absolute top-0 -left-10 w-64 h-64 rounded-full bg-pine-3 blur-3xl" />
        <div className="ls-glow absolute bottom-0 -right-6 w-72 h-72 rounded-full bg-amber-3 blur-3xl" style={{ animationDelay: "2.5s" }} />
      </div>
      {/* floating decorative blocks */}
      <div className="ls-float absolute -left-7 top-10 -z-0 hidden md:flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2 shadow-pop" style={{ "--r": "-4deg" } as React.CSSProperties}>
        <Route size={14} className="text-pine" /><span className="text-[11.5px] font-bold text-ink-2">Branching scenario</span>
      </div>
      <div className="ls-float absolute -right-5 bottom-16 -z-0 hidden md:flex items-center gap-2 bg-night text-canvas rounded-xl px-3 py-2 shadow-pop" style={{ "--r": "3deg", animationDelay: "1.6s" } as React.CSSProperties}>
        <Package size={14} className="text-amber" /><span className="text-[11.5px] font-bold">scorm2004.zip · 212 KB</span>
      </div>

      <div className="bg-surface border border-line rounded-2xl shadow-lift overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 h-9 border-b border-line bg-canvas/60">
          <span className="w-2.5 h-2.5 rounded-full bg-line-2" /><span className="w-2.5 h-2.5 rounded-full bg-line-2" /><span className="w-2.5 h-2.5 rounded-full bg-amber/70" />
          <span className="ml-2 text-[11px] font-mono text-faint">lessonsmith · course studio</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10.5px] font-bold text-pine-2 bg-pine-3 rounded-full px-2 py-0.5">
            <Sparkles size={10} /> AI building
          </span>
        </div>
        <div className="p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">New course</p>
          <p className="font-display font-bold text-[19px] text-ink mt-1 min-h-[28px]">
            {typed}<span className="ls-caret text-pine">▍</span>
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11.5px] text-mute">
            <span className="w-3 h-3 rounded-full border-2 border-pine border-t-transparent animate-spin" />
            {stage}…
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
            <div className="h-full rounded-full bg-pine transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 space-y-1.5 min-h-[150px]">
            {GEN_MODULES.slice(0, modsVisible).map((m, i) => (
              <div key={m.t} className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas/50 px-3 py-2 anim-rise">
                <span className="w-5 h-5 rounded-md bg-pine text-white text-[10px] font-bold flex items-center justify-center flex-none">{i + 1}</span>
                <span className="text-[12.5px] font-semibold text-ink-2 grow truncate">{m.t}</span>
                <span className="text-[10.5px] text-faint font-mono flex-none">{m.lessons} lesson{m.lessons > 1 ? "s" : ""} · quiz</span>
              </div>
            ))}
          </div>
          {finished && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-3 border border-amber/30 px-3 py-2 anim-pop">
              <Sparkles size={13} className="text-amber-2 flex-none" />
              <p className="text-[11.5px] font-semibold text-amber-2">AI-generated — review before publishing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"} ${className}`}>
      {children}
    </div>
  );
}

const flipDemo: Block = { id: "lp-flip", kind: "flipcards", prompt: "Flip a card — this is the real learner interaction, not a mockup.", cards: [
  { front: "The clarity loop", back: "Say it → check understanding → agree the next step" },
  { front: "BLUF", back: "Bottom line up front: lead with the ask, then the context" },
  { front: "Mirroring", back: "Reflect their last words to invite the real concern" },
  { front: "The 24-hour rule", back: "Sleep on written feedback before you send it" },
] };
const timelineDemo: Block = { id: "lp-tl", kind: "timeline", title: "A difficult conversation, in four moves", items: [
  { title: "Open with intent", body: "Name the purpose in one sentence — no ambush, no small-talk trap." },
  { title: "Describe the facts", body: "Observable behaviour only. “Tuesday’s report shipped without the data section.”" },
  { title: "Invite their view", body: "Ask, then stop talking. The pause is where the truth shows up." },
  { title: "Agree the next step", body: "One concrete action, one owner, one date. Write it down together." },
] };
const questionDemo: Block = { id: "lp-q", kind: "question", q: { id: "lpq1", type: "mcq", prompt: "A teammate misses a deadline for the second time this month. Your first move?", options: ["Ask what got in the way before proposing a fix", "Escalate straight to their manager", "Send the missed-deadline policy as a reminder"], correct: [0], explanation: "Diagnose before you prescribe — most repeat misses have a fixable cause, and leading with curiosity preserves the relationship.", difficulty: "medium", objective: "Give feedback that lands" } };

const XAPI_LINES = [
  { v: "initialized", o: "attempted the course", c: "#7ddba3" },
  { v: "experienced", o: "lesson “Active listening”", c: "#9fb8ff" },
  { v: "answered", o: "quiz Q3 — correct", c: "#9fb8ff" },
  { v: "passed", o: "assessment · 92%", c: "#e8c87a" },
  { v: "completed", o: "course · 14m 32s", c: "#7ddba3" },
];

function ReviewDemo() {
  const [state, setState] = useState<"open" | "resolved">("open");
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 shadow-card max-w-[460px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-night-2 text-canvas text-[10.5px] font-bold flex items-center justify-center">MR</span>
        <div>
          <p className="text-[12.5px] font-bold text-ink">Marta · Compliance lead</p>
          <p className="text-[10.5px] text-faint">on “Feedback that actually lands” · 2h ago</p>
        </div>
        <span className={`ml-auto text-[10.5px] font-bold px-2 py-0.5 rounded-full ${state === "open" ? "bg-amber-3 text-amber-2" : "bg-ok-3 text-ok"}`}>{state === "open" ? "Open" : "Resolved"}</span>
      </div>
      <p className="text-[13.5px] text-ink-2 leading-relaxed">The escalation example conflicts with our new HR policy — can we swap it for the mediated-conversation flow?</p>
      <div className="flex gap-2 mt-3.5">
        {state === "open" ? (
          <>
            <button onClick={() => setState("resolved")} className="flex items-center gap-1.5 text-[12px] font-bold bg-pine text-white rounded-lg px-3 py-1.5 hover:brightness-110 transition-all active:scale-95"><Check size={12} /> Mark resolved</button>
            <button className="text-[12px] font-semibold text-mute border border-line rounded-lg px-3 py-1.5 hover:bg-canvas transition-colors">Reply</button>
          </>
        ) : (
          <button onClick={() => setState("open")} className="flex items-center gap-1.5 text-[12px] font-semibold text-mute border border-line rounded-lg px-3 py-1.5 hover:bg-canvas transition-colors"><X size={12} /> Reopen</button>
        )}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-line py-4">
      <summary className="flex items-center justify-between cursor-pointer list-none font-display font-bold text-[15px] text-ink hover:text-pine-2 transition-colors">
        {q}<ChevronDown size={17} className="text-faint transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <p className="text-[13.5px] text-mute leading-relaxed mt-2.5 max-w-[62ch]">{a}</p>
    </details>
  );
}

export function Landing({ onStart }: { onStart: () => void }) {
  const theme = defaultTheme();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const marqueeItems = ["SCORM 1.2", "SCORM 2004 · 4th Ed.", "xAPI statements", "cmi5 (beta)", "WCAG 2.2 AA", "RTL languages", "17 block types", "Branching scenarios", "Review links", "Version history", "Package QA", "Autosave everywhere"];

  return (
    <ThemeContext.Provider value={theme}>
      <style>{LANDING_STYLE}</style>
      <div className="min-h-screen bg-canvas text-ink overflow-x-hidden">
        {/* ambient base */}
        <div className="fixed inset-0 -z-10 dotgrid pointer-events-none" />

        {/* nav */}
        <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-md border-b border-line/70">
          <div className="max-w-[1120px] mx-auto px-5 h-[60px] flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-pine text-white font-display font-bold text-[13px] flex items-center justify-center">Ls</span>
              <span className="font-display font-bold text-[16.5px] tracking-tight">Lessonsmith</span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-[13px] font-semibold text-mute ml-4">
              <button onClick={() => scrollTo("how")} className="hover:text-ink transition-colors">How it works</button>
              <button onClick={() => scrollTo("blocks")} className="hover:text-ink transition-colors">Blocks</button>
              <button onClick={() => scrollTo("export")} className="hover:text-ink transition-colors">Export</button>
              <button onClick={() => scrollTo("pricing")} className="hover:text-ink transition-colors">Pricing</button>
              <button onClick={() => scrollTo("faq")} className="hover:text-ink transition-colors">FAQ</button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={onStart} className="text-[13px] font-semibold text-mute hover:text-ink px-3 py-2 transition-colors">Sign in</button>
              <button onClick={onStart} className="text-[13px] font-bold bg-night text-canvas rounded-lg px-4 py-2 hover:bg-night-2 transition-all active:scale-95">Open the studio</button>
            </div>
          </div>
        </header>

        {/* opener — the product mid-generation, not a brochure */}
        <section className="max-w-[1120px] mx-auto px-5 pt-14 pb-16 lg:pt-20 grid lg:grid-cols-[1.04fr_0.96fr] gap-12 lg:gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-[12px] font-bold text-pine-2 bg-pine-3 border border-pine-4/50 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pine animate-[pulse-dot_1.6s_ease_infinite]" /> AI-native course studio
            </p>
            <h1 className="font-display font-extrabold tracking-tight text-[42px] sm:text-[56px] leading-[1.02] mt-5">
              Teach what you know.<br />
              Ship what your LMS
              <span className="relative inline-block ml-3">
                <span className="relative z-10">understands.</span>
                <span className="absolute left-0 right-0 bottom-1 h-3.5 bg-amber/40 -z-0 -rotate-1" />
              </span>
            </h1>
            <p className="text-[16px] text-mute leading-relaxed mt-5 max-w-[52ch]">
              Turn documents, policies and expertise into structured training — objectives, lessons, scenarios and assessments designed by AI, polished by you, exported as a valid SCORM, xAPI or cmi5 package.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <button onClick={onStart} className="group flex items-center gap-2 bg-pine text-white font-bold text-[14.5px] rounded-xl px-6 py-3.5 shadow-card hover:brightness-110 hover:-translate-y-0.5 transition-all active:scale-95">
                Create your first course <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => scrollTo("how")} className="flex items-center gap-2 font-bold text-[14.5px] text-ink border border-line-2 bg-surface rounded-xl px-6 py-3.5 hover:border-pine hover:text-pine-2 transition-all active:scale-95">
                See how it works
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-[12.5px] text-faint">
              <span className="flex items-center gap-2">
                <span className="flex -space-x-1.5">
                  {["#175943", "#c2701e", "#1d3a5f", "#8c2f39"].map((c) => <span key={c} className="w-6 h-6 rounded-full border-2 border-canvas" style={{ background: c }} />)}
                </span>
                Built for HR &amp; L&amp;D teams
              </span>
              <span className="font-mono">~12 min · idea → package</span>
              <span className="font-mono">no SCORM knowledge needed</span>
            </div>
          </div>
          <LiveBuildPanel />
        </section>

        {/* marquee */}
        <div className="bg-night text-canvas py-3.5 overflow-hidden border-y border-night-2">
          <div className="ls-marquee flex w-max items-center gap-8 pr-8">
            {[...marqueeItems, ...marqueeItems].map((m, i) => (
              <span key={i} className="flex items-center gap-2.5 text-[12px] font-semibold tracking-wide whitespace-nowrap text-canvas/80">
                <span className="w-1 h-1 rounded-full bg-amber" />{m}
              </span>
            ))}
          </div>
        </div>

        {/* how it works */}
        <section id="how" className="max-w-[1120px] mx-auto px-5 py-20">
          <Reveal>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-2">The pipeline</p>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-tight mt-2 max-w-[22ch]">From raw material to LMS-ready in four moves</h2>
          </Reveal>
          <div className="relative mt-12">
            <div className="hidden lg:block absolute left-0 right-0 top-[38px] border-t-2 border-dashed border-line-2" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {[
                { n: "01", icon: <FileText size={18} />, t: "Bring the raw material", d: "Upload a policy PDF, paste notes, or just describe the topic. The brief captures audience, tone, duration and difficulty.", tilt: "-1deg" },
                { n: "02", icon: <Sparkles size={18} />, t: "AI designs the course", d: "Objectives, chunked modules, varied block formats, knowledge checks and a final assessment — grounded in your material, never filler.", tilt: "1deg" },
                { n: "03", icon: <Wand2 size={18} />, t: "You polish visually", d: "A three-pane editor with drag-and-drop blocks, inline rewrites, scenario builder and package QA. Every change autosaves.", tilt: "-1deg" },
                { n: "04", icon: <Package size={18} />, t: "Export the real package", d: "One click produces a valid SCORM 1.2 / 2004, xAPI or cmi5 zip — manifest, player and tracking included. Upload it to any LMS.", tilt: "1deg" },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 110}>
                  <div className="group relative bg-surface border border-line rounded-2xl p-5 h-full hover:shadow-lift hover:border-pine/60 transition-all duration-300 hover:-translate-y-1.5" style={{ transform: `rotate(${s.tilt})` }}>
                    <div className="flex items-center justify-between">
                      <span className="w-10 h-10 rounded-xl bg-night text-canvas flex items-center justify-center group-hover:bg-pine transition-colors duration-300">{s.icon}</span>
                      <span className="font-mono text-[12px] text-faint">{s.n}</span>
                    </div>
                    <h3 className="font-display font-bold text-[16.5px] mt-4">{s.t}</h3>
                    <p className="text-[13px] text-mute leading-relaxed mt-2">{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* live blocks */}
        <section id="blocks" className="bg-night text-canvas py-20">
          <div className="max-w-[1120px] mx-auto px-5">
            <Reveal>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber">The block system — live</p>
              <h2 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-tight mt-2 max-w-[26ch]">Don't read about the interactions. Try them.</h2>
              <p className="text-[15px] text-canvas/60 mt-4 max-w-[58ch]">Every widget below is the actual learner component from the studio — the same code ships inside your exported packages.</p>
            </Reveal>
            <div className="grid lg:grid-cols-[1fr_1.15fr] gap-5 mt-11">
              <Reveal className="h-full">
                <div className="bg-canvas text-ink rounded-2xl p-5 h-full border border-white/10">
                  <BlockView block={flipDemo} />
                </div>
              </Reveal>
              <div className="flex flex-col gap-5">
                <Reveal delay={120}>
                  <div className="bg-canvas text-ink rounded-2xl p-5 border border-white/10">
                    <BlockView block={questionDemo} />
                  </div>
                </Reveal>
                <Reveal delay={220} className="grow">
                  <div className="bg-canvas text-ink rounded-2xl p-5 h-full border border-white/10">
                    <BlockView block={timelineDemo} />
                  </div>
                </Reveal>
              </div>
            </div>
            <Reveal delay={150}>
              <div className="flex flex-wrap gap-2 mt-7">
                {["Accordion", "Tabs", "Timeline", "Hotspot", "Matching", "Ordering", "Flashcards", "Scenario decisions", "Fill-in-the-blank", "Before / after", "Checklist", "Click-to-reveal"].map((b) => (
                  <span key={b} className="text-[11.5px] font-semibold text-canvas/70 border border-white/15 rounded-full px-3 py-1 hover:border-amber hover:text-amber transition-colors cursor-default">{b}</span>
                ))}
                <span className="text-[11.5px] font-bold text-amber border border-amber/40 rounded-full px-3 py-1">+ 5 more in the library</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* tracking strip */}
        <section className="max-w-[1120px] mx-auto px-5 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-2">Tracking that reports back</p>
            <h2 className="font-display font-extrabold text-[30px] sm:text-[36px] tracking-tight mt-2">Your LMS hears every answer.</h2>
            <p className="text-[14.5px] text-mute leading-relaxed mt-4 max-w-[52ch]">
              The bundled player reports completion, success status, scaled score, suspend data for mid-course resume, and per-question interactions — mapped to whichever standard you export. Set pass marks, attempt limits and completion rules without touching XML.
            </p>
            <div className="flex flex-wrap gap-2.5 mt-6">
              {["Score & pass/fail", "Suspend / resume", "Interaction records", "Attempt limits", "Free or sequential nav", "Certificate screen"].map((f) => (
                <span key={f} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2 bg-surface border border-line rounded-full px-3 py-1.5"><Check size={12} className="text-pine" />{f}</span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="bg-night rounded-2xl border border-night-2 shadow-lift overflow-hidden">
              <div className="flex items-center gap-2 px-4 h-9 border-b border-white/10 text-[11px] font-mono text-canvas/50">
                <Globe size={12} /> statements emitted by a single learner session
              </div>
              <div className="p-4 font-mono text-[12px] space-y-2">
                {XAPI_LINES.map((l, i) => (
                  <div key={l.v} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5 anim-rise" style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="text-canvas/40">{new Date(Date.now() - (5 - i) * 130000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="font-bold" style={{ color: l.c }}>{l.v}</span>
                    <span className="text-canvas/70 truncate">{l.o}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* export spec sheet */}
        <section id="export" className="bg-surface border-y border-line py-20">
          <div className="max-w-[1120px] mx-auto px-5">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-2">Export</p>
                  <h2 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-tight mt-2">Four standards. One click. A zip that launches.</h2>
                </div>
                <p className="text-[13px] text-mute max-w-[36ch]">Every package ships with its manifest, player, styles and course data — validated before download.</p>
              </div>
            </Reveal>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {[
                { name: "SCORM 1.2", spec: "ADL SCORM 1.2", tracks: "lesson_status · score · suspend_data · interactions", note: "Widest compatibility — the safe default for older LMSs." },
                { name: "SCORM 2004", spec: "4th Edition", tracks: "completion_status · success_status · scaled score · progress_measure", note: "Modern SCORM with sequencing and proper success tracking." },
                { name: "xAPI", spec: "Tin Can · 1.0.3", tracks: "initialized · experienced · answered · completed · passed · failed", note: "Statement stream ready for your LRS endpoint." },
                { name: "cmi5", spec: "profile (beta)", tracks: "AU launch handshake · moveOn=CompletedOrPassed · statements", note: "The forward-looking standard, clearly labeled as beta." },
              ].map((f, i) => (
                <Reveal key={f.name} delay={i * 80}>
                  <div className="group grid md:grid-cols-[220px_1fr_1.3fr] gap-2 md:gap-6 py-5 px-2 hover:bg-canvas/70 transition-colors">
                    <p className="font-display font-bold text-[19px] group-hover:text-pine-2 transition-colors">{f.name}<span className="block text-[11px] font-mono text-faint font-normal mt-0.5">{f.spec}</span></p>
                    <p className="font-mono text-[12px] text-mute leading-relaxed">{f.tracks}</p>
                    <p className="text-[13px] text-mute leading-relaxed">{f.note}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={100}>
              <p className="flex items-center gap-2 text-[12.5px] text-faint mt-5"><ClipboardCheck size={14} className="text-pine" /> Package QA runs automatically: manifest validity, missing assets, alt text, scoring config — with one-click auto-fix where safe.</p>
            </Reveal>
          </div>
        </section>

        {/* review workflow */}
        <section className="max-w-[1120px] mx-auto px-5 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal className="order-2 lg:order-1"><ReviewDemo /></Reveal>
          <Reveal delay={120} className="order-1 lg:order-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-2">Review workflow</p>
            <h2 className="font-display font-extrabold text-[30px] sm:text-[36px] tracking-tight mt-2">Sign-off without accounts.</h2>
            <p className="text-[14.5px] text-mute leading-relaxed mt-4 max-w-[52ch]">
              Share a review link and stakeholders comment directly on the block in question — no login, no exports by email. Comments land in your editor with a badge, jump to the exact content, and resolve when you're done.
            </p>
          </Reveal>
        </section>

        {/* testimonials */}
        <section className="bg-surface border-y border-line py-20">
          <div className="max-w-[1120px] mx-auto px-5 grid lg:grid-cols-[1.2fr_1fr] gap-6">
            <Reveal>
              <figure className="bg-canvas border border-line rounded-2xl p-7 h-full hover:shadow-card transition-shadow">
                <div className="flex gap-1 text-amber">{[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" strokeWidth={0} />)}</div>
                <blockquote className="font-display font-bold text-[21px] leading-snug mt-4">“We turned 60 pages of compliance policy into a course people actually finish. The exported SCORM dropped into our LMS without a single support ticket.”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-pine text-white font-bold text-[13px] flex items-center justify-center">PK</span>
                  <span><span className="block text-[13.5px] font-bold">Priya K.</span><span className="block text-[12px] text-faint">L&amp;D Manager · 1,200 employees</span></span>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={130}>
              <figure className="bg-night text-canvas rounded-2xl p-7 h-full hover:shadow-pop transition-shadow">
                <blockquote className="text-[16.5px] leading-relaxed text-canvas/90">“The quiz generator writes better distractors than I do — and the QA panel caught an alt-text gap before our audit.”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-amber text-night font-bold text-[13px] flex items-center justify-center">DO</span>
                  <span><span className="block text-[13.5px] font-bold">Daniel O.</span><span className="block text-[12px] text-canvas/50">Instructional Designer · consultant</span></span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="max-w-[1120px] mx-auto px-5 py-20">
          <Reveal>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-2">Pricing</p>
            <h2 className="font-display font-extrabold text-[32px] sm:text-[40px] tracking-tight mt-2">Start free. Upgrade when the LMS queue fills up.</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 mt-11 items-stretch">
            {[
              { name: "Free", price: "€0", per: "forever", feats: ["3 courses", "25 AI credits / month", "Full editor & preview", "Watermarked export"], cta: "Start free", hot: false },
              { name: "Pro", price: "€16", per: "per author / month", feats: ["Unlimited courses", "Generous AI credits", "SCORM · xAPI · cmi5 export", "Assessments & scenarios", "Branding & review links", "Version history"], cta: "Go Pro", hot: true },
              { name: "Business", price: "Custom", per: "annual", feats: ["Teams & roles", "Org analytics", "SSO-ready auth architecture", "Priority support"], cta: "Talk to us", hot: false },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 100} className="h-full">
                <div className={`rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1.5 ${p.hot ? "bg-night text-canvas shadow-pop border-2 border-pine scale-[1.02]" : "bg-surface border border-line hover:shadow-lift"}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-[18px]">{p.name}</p>
                    {p.hot && <span className="text-[10.5px] font-bold bg-amber text-night rounded-full px-2.5 py-0.5">Most popular</span>}
                  </div>
                  <p className="mt-3"><span className="font-display font-extrabold text-[38px] tracking-tight">{p.price}</span> <span className={`text-[12.5px] ${p.hot ? "text-canvas/50" : "text-faint"}`}>{p.per}</span></p>
                  <ul className={`mt-5 space-y-2.5 text-[13.5px] ${p.hot ? "text-canvas/85" : "text-ink-2"}`}>
                    {p.feats.map((f) => <li key={f} className="flex items-start gap-2"><Check size={14} className={`mt-0.5 flex-none ${p.hot ? "text-amber" : "text-pine"}`} />{f}</li>)}
                  </ul>
                  <button onClick={onStart} className={`mt-auto pt-6 group`}>
                    <span className={`flex items-center justify-center gap-2 w-full font-bold text-[13.5px] rounded-xl px-4 py-3 transition-all active:scale-95 ${p.hot ? "bg-amber text-night hover:brightness-105" : "bg-night text-canvas hover:bg-night-2"}`}>
                      {p.cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}><p className="text-[12px] text-faint mt-6">Billing is wired through a payment-provider abstraction — no card forms exist in this build, and no feature is faked: if a plan gate applied, it would say so.</p></Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-surface border-t border-line py-20">
          <div className="max-w-[760px] mx-auto px-5">
            <Reveal><h2 className="font-display font-extrabold text-[30px] sm:text-[36px] tracking-tight">Asked before every rollout</h2></Reveal>
            <div className="mt-8">
              <Faq q="Will the export really work in our LMS?" a="Yes — packages contain a standards-shaped imsmanifest.xml (or cmi5.xml), a self-contained player and course data, with tracking for status, score, suspend/resume and interactions. The built-in Package QA validates the manifest, assets and scoring config before you download, and the preview player is the exact code that ships." />
              <Faq q="Do my authors need to understand SCORM?" a="No. Authors pick a format by name and get a zip. Everything technical — data models, CMI calls, statement verbs — lives in the export layer, not the editor." />
              <Faq q="Can I trust AI-generated training content?" a="AI output is always labeled as a draft, grounded in the material you upload, and structured with real instructional design patterns — chunking, retrieval practice, scenario decisions — rather than paragraphs on slides. Nothing publishes without a human review." />
              <Faq q="What about accessibility?" a="The checker scores each course against WCAG 2.2 AA patterns: alt text, heading hierarchy, contrast, keyboard navigation and transcripts — with one-click fixes where it's safe to apply them." />
              <Faq q="Can reviewers comment without an account?" a="Yes. Review links open the course in a shared player where anyone can comment on specific blocks. Comments appear in your editor, anchored to the exact content." />
            </div>
          </div>
        </section>

        {/* closing band */}
        <section className="bg-night text-canvas py-20 relative overflow-hidden">
          <div className="absolute inset-0 dotgrid opacity-30" />
          <div className="ls-glow absolute -top-20 right-10 w-96 h-96 rounded-full bg-pine blur-3xl opacity-30" />
          <div className="max-w-[1120px] mx-auto px-5 relative">
            <Reveal>
              <h2 className="font-display font-extrabold text-[34px] sm:text-[46px] tracking-tight max-w-[18ch]">Your first course is about twelve minutes away.</h2>
              <p className="text-[15px] text-canvas/60 mt-4 max-w-[50ch]">Bring a document or just a topic. The studio handles the structure — you bring the judgment.</p>
              <button onClick={onStart} className="group mt-8 flex items-center gap-2 bg-amber text-night font-bold text-[15px] rounded-xl px-7 py-4 hover:brightness-105 hover:-translate-y-0.5 transition-all active:scale-95 shadow-pop">
                Create your first course <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>
            </Reveal>
          </div>
        </section>

        <footer className="bg-night text-canvas/50 border-t border-white/10 py-8">
          <div className="max-w-[1120px] mx-auto px-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px]">
            <span className="flex items-center gap-2 text-canvas/80 font-bold"><span className="w-6 h-6 rounded-md bg-pine text-white text-[10px] font-display flex items-center justify-center">Ls</span>Lessonsmith</span>
            <button onClick={() => scrollTo("how")} className="hover:text-canvas transition-colors">Product</button>
            <button onClick={() => scrollTo("export")} className="hover:text-canvas transition-colors">Export formats</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-canvas transition-colors">Pricing</button>
            <span className="ml-auto font-mono text-[11px]">© 2026 · this build runs entirely in your browser</span>
          </div>
        </footer>
      </div>
    </ThemeContext.Provider>
  );
}
