import { ArrowDown, ArrowUp, ClipboardCheck, Eye, EyeOff, FlipHorizontal, HelpCircle, History, Image as ImageIcon, Lightbulb, ListChecks, Minus, Pilcrow, Quote as QuoteIcon, Route, TextCursorInput, Type, Video } from "lucide-react";
import React, { createContext, useContext, useState } from "react";
import { Block, BlockKind, Question, Theme, defaultTheme } from "../lib/types";

/* ---------------- contexts ---------------- */
export interface LearnState {
  answers: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  submitted: Record<string, boolean>;
  markSubmitted: (k: string) => void;
  onQuizResult?: (blockId: string, pct: number, graded: boolean, correct: number, total: number) => void;
}
export const LearnContext = createContext<LearnState | null>(null);
export const ThemeContext = createContext<Theme>(defaultTheme());

function useKV<T>(key: string, initial: T): [T, (v: T) => void] {
  const learn = useContext(LearnContext);
  const [local, setLocal] = useState<T>(initial);
  if (!learn) return [local, setLocal];
  const v = (learn.answers[key] as T) ?? initial;
  return [v, (nv: T) => learn.set(key, nv)];
}

/* ---------------- grading ---------------- */
export function gradeQ(q: Question, ans: unknown): boolean {
  if (q.type === "fill") return String(ans || "").trim().toLowerCase() === String(q.answer || "").trim().toLowerCase();
  if (q.type === "order") return JSON.stringify(ans) === JSON.stringify(q.correct || []);
  const corr = (q.correct || []).slice().sort((a, b) => a - b);
  const got = ((ans as number[]) || []).slice().sort((a, b) => a - b);
  return JSON.stringify(corr) === JSON.stringify(got);
}

/* ---------------- block metadata (library + toolbar) ---------------- */
export const BLOCK_META: Record<BlockKind, { label: string; desc: string; cat: "Content" | "Media" | "Layout" | "Interactive" | "Assessment"; icon: React.ReactNode }> = {
  heading: { label: "Heading", desc: "Section title (H2/H3)", cat: "Content", icon: <Type size={16} /> },
  text: { label: "Text", desc: "Paragraphs of rich text", cat: "Content", icon: <Pilcrow size={16} /> },
  quote: { label: "Quote", desc: "Pull quote with attribution", cat: "Content", icon: <QuoteIcon size={16} /> },
  callout: { label: "Callout", desc: "Tip, info or warning box", cat: "Content", icon: <Lightbulb size={16} /> },
  divider: { label: "Divider", desc: "Horizontal rule", cat: "Content", icon: <Minus size={16} /> },
  image: { label: "Image", desc: "Photo or illustration", cat: "Media", icon: <ImageIcon size={16} /> },
  video: { label: "Video", desc: "Embed with transcript", cat: "Media", icon: <Video size={16} /> },
  keyPoints: { label: "Key points", desc: "Card grid of main ideas", cat: "Layout", icon: <ClipboardCheck size={16} /> },
  accordion: { label: "Accordion", desc: "Expandable sections", cat: "Layout", icon: <ListChecks size={16} /> },
  tabs: { label: "Tabs", desc: "Tabbed content panels", cat: "Layout", icon: <TextCursorInput size={16} /> },
  flipcards: { label: "Flip cards", desc: "Front/back recall cards", cat: "Interactive", icon: <FlipHorizontal size={16} /> },
  timeline: { label: "Timeline", desc: "Ordered steps or process", cat: "Interactive", icon: <History size={16} /> },
  reveal: { label: "Click to reveal", desc: "Hidden content on demand", cat: "Interactive", icon: <Eye size={16} /> },
  checklist: { label: "Checklist", desc: "Learner-ticked checklist", cat: "Interactive", icon: <ListChecks size={16} /> },
  scenario: { label: "Scenario", desc: "Branching decision practice", cat: "Interactive", icon: <Route size={16} /> },
  question: { label: "Question", desc: "Single knowledge check", cat: "Assessment", icon: <HelpCircle size={16} /> },
  quiz: { label: "Quiz / Assessment", desc: "Scored question set", cat: "Assessment", icon: <ClipboardCheck size={16} /> },
};

/* ---------------- primitives ---------------- */
const card = "bg-surface border border-line rounded-xl";

/* ---------------- question renderer ---------------- */
function QuestionCard({ q, kbase, number }: { q: Question; kbase: string; number?: number }) {
  const learn = useContext(LearnContext);
  const theme = useContext(ThemeContext);
  const [localChecked, setLocalChecked] = useState(false);
  const checked = learn ? !!learn.submitted[kbase] : localChecked;
  const [res, setRes] = useKV<boolean>(kbase + ":res", false);

  const [sel, setSel] = useKV<number[]>(kbase + ":sel", []);
  const [txt, setTxt] = useKV<string>(kbase + ":txt", "");
  const [ord, setOrd] = useKV<number[]>(kbase + ":ord", (q.options || []).map((_, i) => i));

  const pick = (i: number) => {
    if (q.type === "multi") setSel(sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]);
    else setSel([i]);
  };
  const move = (pos: number, dir: -1 | 1) => {
    const t = ord[pos + dir];
    if (t === undefined) return;
    const next = ord.slice(); next[pos + dir] = ord[pos]; next[pos] = t;
    setOrd(next);
  };

  return (
    <div className={`${card} p-4`}>
      <p className="font-semibold text-[14px] text-ink leading-snug">
        {number != null && <span className="text-faint font-mono text-[11px] mr-2">Q{number}</span>}
        {q.prompt}
      </p>
      <div className="mt-3 space-y-1.5">
        {q.type === "fill" ? (
          <input type="text" value={txt} disabled={checked} onChange={(e) => setTxt(e.target.value)} placeholder="Type your answer…"
            className="w-full rounded-lg border border-line-2 px-3 py-2 text-[13.5px] focus:border-pine focus:outline-none disabled:bg-canvas" />
        ) : q.type === "order" ? (
          ord.map((oi, pos) => (
            <div key={pos} className="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2 text-[13.5px]">
              <span className="text-faint font-mono text-[11px] w-4">{pos + 1}</span>
              <span className="grow">{(q.options || [])[oi]}</span>
              {!checked && (
                <>
                  <button type="button" aria-label="Move up" disabled={pos === 0} onClick={() => move(pos, -1)} className="text-mute hover:text-ink disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button type="button" aria-label="Move down" disabled={pos === ord.length - 1} onClick={() => move(pos, 1)} className="text-mute hover:text-ink disabled:opacity-30"><ArrowDown size={14} /></button>
                </>
              )}
            </div>
          ))
        ) : (
          (q.options || []).map((opt, i) => {
            const on = sel.includes(i);
            const isCorrect = (q.correct || []).includes(i);
            return (
              <button key={i} type="button" disabled={checked} onClick={() => pick(i)}
                className={`w-full text-left flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px] transition-all disabled:cursor-default ${checked && isCorrect ? "border-ok bg-ok-3/60" : checked && on && !isCorrect ? "border-bad bg-bad-3/60" : on ? "border-pine bg-pine-3/50" : "border-line hover:border-pine/50 bg-surface"}`}>
                <span className={`mt-0.5 w-4 h-4 flex-none rounded-${q.type === "multi" ? "md" : "full"} border-2 flex items-center justify-center ${on ? "border-pine bg-pine" : "border-line-2 bg-surface"}`}>
                  {on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            );
          })
        )}
      </div>
      {checked && (
        <div className={`mt-3 rounded-lg px-3 py-2.5 text-[13px] anim-rise ${res ? "bg-ok-3 border border-ok/25" : "bg-bad-3 border border-bad/20"}`}>
          <strong className={res ? "text-ok" : "text-bad"}>{res ? "Correct" : "Not quite"}</strong>
          {q.explanation && <p className="mt-1 text-ink-2 leading-relaxed">{q.explanation}</p>}
        </div>
      )}
      {!checked && (
        <button type="button" onClick={() => {
          const ans = q.type === "fill" ? txt : q.type === "order" ? ord : sel;
          const ok = gradeQ(q, ans);
          setRes(ok);
          if (learn) learn.markSubmitted(kbase); else setLocalChecked(true);
        }}
          className="mt-3 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95" style={{ background: theme.primary }}>
          Check answer
        </button>
      )}
    </div>
  );
}

/* ---------------- quiz ---------------- */
function QuizView({ block }: { block: Extract<Block, { kind: "quiz" }> }) {
  const learn = useContext(LearnContext);
  const theme = useContext(ThemeContext);
  const kbase = `quiz:${block.id}`;
  const [localDone, setLocalDone] = useState(false);
  const [lastPct, setLastPct] = useKV<number | null>(kbase + ":pct", null);
  const done = learn ? !!learn.submitted[kbase] : localDone;

  const submit = () => {
    let correct = 0;
    for (const q of block.questions) {
      const qk = `${kbase}:${q.id}`;
      const ans = q.type === "fill" ? (learn ? learn.answers[qk + ":txt"] : undefined) : q.type === "order" ? (learn ? learn.answers[qk + ":ord"] : undefined) : (learn ? learn.answers[qk + ":sel"] : undefined);
      if (gradeQ(q, ans)) correct++;
    }
    const pct = Math.round((correct / Math.max(1, block.questions.length)) * 100);
    setLastPct(pct);
    if (learn) { learn.markSubmitted(kbase); learn.onQuizResult?.(block.id, pct, block.mode === "graded", correct, block.questions.length); }
    else setLocalDone(true);
  };

  /* In edit mode the check happens per-question; quiz submit is learner-flow only. */
  if (!learn) {
    return (
      <div>
        <QuizHead block={block} />
        <div className="space-y-3">{block.questions.map((q, i) => <QuestionCard key={q.id} q={q} kbase={`${kbase}:${q.id}`} number={i + 1} />)}</div>
        <p className="text-[11.5px] text-faint mt-2">Author preview — learners submit the whole quiz at once.</p>
      </div>
    );
  }

  return (
    <div>
      <QuizHead block={block} />
      <div className="space-y-3">{block.questions.map((q, i) => <QuestionCard key={q.id} q={q} kbase={`${kbase}:${q.id}`} number={i + 1} />)}</div>
      <div className="flex items-center gap-3 mt-4">
        {!done && (
          <button type="button" onClick={submit} className="text-white font-semibold text-[13.5px] px-4 py-2.5 rounded-lg transition-all active:scale-95 hover:brightness-110" style={{ background: theme.primary }}>
            Check answers
          </button>
        )}
        {done && lastPct != null && (
          <div className={`rounded-lg px-4 py-2.5 text-[13.5px] font-semibold anim-pop ${block.mode === "graded" ? (lastPct >= block.passMark ? "bg-ok-3 text-ok" : "bg-bad-3 text-bad") : "bg-pine-3 text-pine-2"}`}>
            Score: {lastPct}%{block.mode === "graded" ? (lastPct >= block.passMark ? " — Passed" : ` — Pass mark ${block.passMark}%`) : ""}
          </div>
        )}
      </div>
    </div>
  );
}
function QuizHead({ block }: { block: Extract<Block, { kind: "quiz" }> }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 flex-wrap">
      <h3 className="font-display font-bold text-[16.5px] text-ink">{block.title}</h3>
      {block.mode === "graded"
        ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-3 text-amber-2">Pass mark {block.passMark}%</span>
        : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-pine-3 text-pine-2">Practice — not scored</span>}
      <span className="text-[11px] text-faint font-mono">{block.questions.length} questions</span>
    </div>
  );
}

/* ---------------- scenario ---------------- */
function ScenarioView({ block }: { block: Extract<Block, { kind: "scenario" }> }) {
  const theme = useContext(ThemeContext);
  const kbase = `scn:${block.id}`;
  const [step, setStep] = useKV<number>(kbase + ":step", 0);
  const [feedback, setFeedback] = useKV<{ text: string; good: boolean } | null>(kbase + ":fb", null);
  const [goodCount, setGoodCount] = useKV<number>(kbase + ":good", 0);
  const finished = step >= block.steps.length;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-4 text-white" style={{ background: theme.primary }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] opacity-80">Scenario</p>
        <h3 className="font-display font-bold text-[17px]">{block.title}</h3>
      </div>
      <div className="p-5">
        {!finished && <p className="text-[13.5px] text-mute leading-relaxed -mt-1 mb-4">{block.intro}</p>}
        {finished ? (
          <div className="anim-rise">
            <div className="rounded-lg bg-ok-3 border border-ok/25 px-4 py-3">
              <p className="font-semibold text-[14px] text-ok">Scenario complete — good choices: {goodCount}/{block.steps.length}</p>
              <p className="text-[13.5px] text-ink-2 mt-1 leading-relaxed">{block.summary}</p>
            </div>
            <button type="button" onClick={() => { setStep(0); setFeedback(null); setGoodCount(0); }} className="mt-3 text-[12.5px] font-semibold text-pine hover:underline">Replay scenario</button>
          </div>
        ) : feedback ? (
          <div className="anim-rise">
            <div className={`rounded-lg px-4 py-3 border ${feedback.good ? "bg-ok-3 border-ok/25" : "bg-bad-3 border-bad/20"}`}>
              <p className="text-[13.5px] font-semibold leading-relaxed">{feedback.text}</p>
            </div>
            <button type="button" onClick={() => { setStep(step + 1); setFeedback(null); }}
              className="mt-3 text-white font-semibold text-[13px] px-4 py-2 rounded-lg active:scale-95 transition-transform" style={{ background: theme.primary }}>
              {step + 1 >= block.steps.length ? "Finish scenario" : "Continue"}
            </button>
          </div>
        ) : (
          <div className="anim-rise" key={step}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: theme.primary }}>{block.steps[step].character}</p>
            <p className="text-[14px] text-ink leading-relaxed mb-4">{block.steps[step].situation}</p>
            <div className="space-y-2">
              {block.steps[step].choices.map((ch, i) => (
                <button key={i} type="button" onClick={() => { if (ch.good) setGoodCount(goodCount + 1); setFeedback({ text: ch.feedback, good: ch.good }); }}
                  className="w-full text-left rounded-lg border border-line px-4 py-3 text-[13.5px] leading-snug hover:border-pine hover:bg-pine-3/40 transition-all active:scale-[0.99]">
                  {ch.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- main renderer ---------------- */
export function BlockView({ block }: { block: Block }) {
  const theme = useContext(ThemeContext);
  switch (block.kind) {
    case "heading":
      return block.level === 3
        ? <h3 className="font-display font-bold text-[17px] text-ink">{block.text || "Heading"}</h3>
        : <h2 className="font-display font-bold text-[21px] text-ink leading-tight">{block.text || "Heading"}</h2>;
    case "text":
      return <div className="prose-smith text-[14px] text-ink-2 leading-relaxed max-w-[68ch]">{block.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>;
    case "quote":
      return (
        <blockquote className="border-l-4 pl-5 py-1 my-1" style={{ borderColor: theme.primary }}>
          <p className="text-[16px] text-ink italic leading-relaxed">“{block.text}”</p>
          {block.attribution && <footer className="text-[12.5px] text-faint mt-1.5">— {block.attribution}</footer>}
        </blockquote>
      );
    case "callout": {
      const tones = { info: "bg-pine-3/70 border-pine-4 text-pine-2", tip: "bg-amber-3 border-amber/30 text-amber-2", warning: "bg-bad-3 border-bad/25 text-bad" };
      return (
        <aside className={`rounded-xl border px-4 py-3.5 ${tones[block.tone]}`}>
          <p className="font-bold text-[13.5px]">{block.title}</p>
          <p className="text-[13.5px] mt-1 leading-relaxed text-ink-2">{block.body}</p>
        </aside>
      );
    }
    case "divider": return <hr className="border-t border-line-2 my-2" />;
    case "image":
      return (
        <figure className="my-1">
          {block.src
            ? <img src={block.src} alt={block.alt} className="w-full rounded-xl border border-line object-cover" loading="lazy" />
            : <div className="w-full h-44 rounded-xl border border-dashed border-line-2 bg-canvas flex items-center justify-center text-faint text-[13px]">No image set — add one in the panel</div>}
          {block.caption && <figcaption className="text-[12px] text-faint mt-1.5">{block.caption}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <figure className="my-1">
          <div className="rounded-xl overflow-hidden border border-line bg-night aspect-video flex items-center justify-center">
            {block.url
              ? <iframe src={block.url} title={block.caption || "Video"} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              : <span className="text-canvas/60 text-[13px] flex items-center gap-2"><Video size={18} /> Add a video URL in the panel</span>}
          </div>
          {block.caption && <figcaption className="text-[12px] text-faint mt-1.5">{block.caption}</figcaption>}
        </figure>
      );
    case "keyPoints":
      return (
        <div>
          {block.title && <h3 className="font-display font-bold text-[16px] text-ink mb-2.5">{block.title}</h3>}
          <div className="grid sm:grid-cols-2 gap-2.5">
            {block.points.map((p, i) => (
              <div key={i} className={`${card} p-4 hover:shadow-card transition-shadow`}>
                <p className="font-bold text-[13.5px] text-ink flex items-center gap-2"><span className="w-5 h-5 rounded-md text-white text-[11px] flex items-center justify-center font-mono" style={{ background: theme.primary }}>{i + 1}</span>{p.title}</p>
                <p className="text-[13px] text-mute mt-1.5 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "accordion":
      return (
        <div className="space-y-2">
          {block.items.map((it, i) => (
            <details key={i} className={`${card} overflow-hidden group`}>
              <summary className="px-4 py-3 cursor-pointer font-semibold text-[13.5px] text-ink list-none flex items-center justify-between hover:bg-canvas/60 transition-colors">
                {it.title}<span className="text-faint transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="px-4 pb-3.5 text-[13.5px] text-mute leading-relaxed">{it.body}</p>
            </details>
          ))}
        </div>
      );
    case "tabs": {
      return <TabsView tabs={block.tabs} primary={theme.primary} />;
    }
    case "flipcards":
      return (
        <div>
          {block.prompt && <p className="text-[13px] text-mute mb-2.5">{block.prompt}</p>}
          <div className="grid sm:grid-cols-2 gap-2.5">
            {block.cards.map((c, i) => <FlipCard key={i} front={c.front} back={c.back} primary={theme.primary} />)}
          </div>
        </div>
      );
    case "timeline":
      return (
        <div>
          {block.title && <h3 className="font-display font-bold text-[16px] text-ink mb-3">{block.title}</h3>}
          <div className="relative pl-5">
            <span className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-line-2" />
            {block.items.map((it, i) => (
              <div key={i} className="relative pb-4 last:pb-0">
                <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 border-canvas" style={{ background: theme.primary }} />
                <p className="font-bold text-[13.5px] text-ink">{it.title}</p>
                <p className="text-[13px] text-mute leading-relaxed mt-0.5">{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "reveal": {
      return <RevealView prompt={block.prompt} body={block.body} primary={theme.primary} blockId={block.id} />;
    }
    case "checklist": {
      return <ChecklistView block={block} primary={theme.primary} />;
    }
    case "scenario": return <ScenarioView block={block} />;
    case "question": return <QuestionCard q={block.q} kbase={`q:${block.id}`} />;
    case "quiz": return <QuizView block={block} />;
    default: return null;
  }
}

function TabsView({ tabs, primary }: { tabs: { label: string; body: string }[]; primary: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="flex gap-1 border-b border-line-2 flex-wrap" role="tablist">
        {tabs.map((t, j) => (
          <button key={j} role="tab" aria-selected={i === j} type="button" onClick={() => setI(j)}
            className={`px-3.5 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${i === j ? "text-ink" : "text-faint hover:text-ink border-transparent"}`}
            style={i === j ? { borderColor: primary } : undefined}>
            {t.label}
          </button>
        ))}
      </div>
      <p className={`${card} p-4 mt-3 text-[13.5px] text-ink-2 leading-relaxed whitespace-pre-wrap`}>{tabs[i]?.body}</p>
    </div>
  );
}

function FlipCard({ front, back, primary }: { front: string; back: string; primary: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button type="button" onClick={() => setFlipped(!flipped)} aria-pressed={flipped}
      className="flip-card text-left h-[120px] [perspective:900px] focus-visible:outline-2" style={{ transform: flipped ? undefined : undefined }}>
      <div className={`flip-inner relative w-full h-full ${flipped ? "" : ""}`} style={{ transform: flipped ? "rotateY(180deg)" : undefined }}>
        <div className="flip-face absolute inset-0 rounded-xl text-white p-4 flex items-center justify-center text-center text-[13px] font-semibold leading-snug" style={{ background: primary }}>{front}</div>
        <div className="flip-face flip-back absolute inset-0 rounded-xl bg-surface border-2 p-4 flex items-center justify-center text-center text-[12.5px] text-ink-2 leading-snug" style={{ borderColor: primary }}>{back}</div>
      </div>
    </button>
  );
}

function RevealView({ prompt, body, primary, blockId }: { prompt: string; body: string; primary: string; blockId: string }) {
  const [open, setOpen] = useKV<boolean>(`reveal:${blockId}`, false);
  return (
    <div className={`${card} p-4`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex items-center gap-2 font-semibold text-[13.5px] transition-colors" style={{ color: primary }}>
        {open ? <EyeOff size={15} /> : <Eye size={15} />} {open ? "Hide" : prompt}
      </button>
      {open && <p className="text-[13.5px] text-ink-2 leading-relaxed mt-2.5 anim-rise">{body}</p>}
    </div>
  );
}

function ChecklistView({ block, primary }: { block: Extract<Block, { kind: "checklist" }>; primary: string }) {
  return (
    <div className={`${card} p-4`}>
      <h3 className="font-display font-bold text-[15px] text-ink mb-2.5">{block.title}</h3>
      <div className="space-y-1.5">
        {block.items.map((it, i) => <CheckItem key={i} id={block.id} i={i} text={it} primary={primary} />)}
      </div>
    </div>
  );
}
function CheckItem({ id, i, text, primary }: { id: string; i: number; text: string; primary: string }) {
  const [on, setOn] = useKV<boolean>(`chk:${id}:${i}`, false);
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group py-0.5">
      <span className={`mt-0.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-none transition-all ${on ? "text-white" : "border-line-2 group-hover:border-faint"}`} style={on ? { background: primary, borderColor: primary } : undefined}>
        {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" /></svg>}
      </span>
      <input type="checkbox" className="sr-only" checked={on} onChange={() => setOn(!on)} />
      <span className={`text-[13.5px] leading-snug transition-colors ${on ? "text-faint line-through" : "text-ink-2"}`}>{text}</span>
    </label>
  );
}
