import { ArrowLeft, ArrowRight, Bug, Check, CheckCheck, ChevronLeft, Eye, MessageSquare, Monitor, RotateCcw, Smartphone, Tablet, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { go, useStore } from "../lib/store";
import { Attempt, Course, allLessons, uid } from "../lib/types";
import { BlockView, LearnContext, LearnState, ThemeContext } from "./blocks";
import { Btn, Chip, IconBtn, Seg, TextArea } from "./ui";

export interface TrackEvent { ts: number; label: string; key: string; val: string }

export function Player({ course, review, onTrack }: { course: Course; review?: boolean; onTrack?: (e: TrackEvent) => void }) {
  const addComment = useStore((s) => s.addComment);
  const user = useStore((s) => s.user());
  const recordAttempt = useStore((s) => s.recordAttempt);
  const toast = useStore((s) => s.toast);

  const lessons = useMemo(() => allLessons(course), [course]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const startedRef = useRef(Date.now());
  const recordedRef = useRef(false);
  const [commentFor, setCommentFor] = useState<string | null>(null);

  const current = lessons[idx];
  const theme = course.theme;

  const track = (label: string, key: string, val = "") => onTrack?.({ ts: Date.now(), label, key, val });
  useEffect(() => { track("initialized", "course", course.title); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (current) track("experienced", "lesson", current.lesson.title); /* eslint-disable-next-line */ }, [idx]);

  const learn: LearnState = useMemo(() => ({
    answers, submitted,
    set: (k, v) => setAnswers((a) => ({ ...a, [k]: v })),
    markSubmitted: (k) => setSubmitted((s) => ({ ...s, [k]: true })),
    onQuizResult: (blockId, pct, graded, correct, total) => {
      track("answered", "quiz", `${correct}/${total} correct`);
      if (graded) {
        setScores((s) => ({ ...s, [blockId]: pct }));
        track(pct >= course.settings.passMark ? "passed" : "failed", "assessment", `${pct}%`);
      }
    },
  }), [answers, submitted, course.settings.passMark]);

  const completedCount = done.size;
  const bestScore = Object.values(scores).length ? Math.max(...Object.values(scores)) : null;
  const isComplete = (() => {
    const r = course.settings.completionRule;
    if (r === "all-lessons") return completedCount >= lessons.length;
    if (r === "percent") return lessons.length ? (completedCount / lessons.length) * 100 >= course.settings.percentRequired : false;
    return bestScore != null && bestScore >= course.settings.passMark;
  })();

  useEffect(() => {
    if (isComplete && !finished) {
      setFinished(true);
      track("completed", "course", bestScore != null ? `${bestScore}%` : "all lessons");
      if (!recordedRef.current) {
        recordedRef.current = true;
        const a: Attempt = {
          id: uid(), courseId: course.id, learner: review ? "Reviewer" : (user?.name || "Learner"),
          ts: Date.now(), score: bestScore, passed: bestScore != null ? bestScore >= course.settings.passMark : null,
          completed: true, seconds: Math.round((Date.now() - startedRef.current) / 1000), questionStats: [],
        };
        if (!review) recordAttempt(a);
      }
    }
  }, [isComplete, finished, bestScore]);

  const markDone = (lessonId: string) => {
    setDone((d) => new Set(d).add(lessonId));
    track("progressed", "lesson", "completed");
  };

  const locked = (i: number) => course.settings.navigation === "sequential" && i > 0 && !done.has(lessons[i - 1].lesson.id);

  const restart = () => {
    setDone(new Set()); setScores({}); setAnswers({}); setSubmitted({});
    setFinished(false); setIdx(0); recordedRef.current = false; startedRef.current = Date.now();
    track("reset", "course", "restart");
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight" && idx < lessons.length - 1 && !locked(idx + 1)) setIdx(idx + 1);
      if (e.key === "ArrowLeft" && idx > 0) setIdx(idx - 1);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [idx, lessons.length]);

  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const openComments = course.comments.filter((c) => !c.resolved);

  return (
    <ThemeContext.Provider value={theme}>
      <LearnContext.Provider value={learn}>
        <div className="flex h-full bg-canvas text-ink" style={{ fontFamily: theme.font === "serif" ? "Georgia, serif" : undefined }}>
          {/* sidebar */}
          <aside className="w-[264px] flex-none bg-night text-canvas flex flex-col overflow-hidden max-sm:hidden">
            <div className="p-4 flex items-center gap-2.5 border-b border-white/10">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[12px] flex-none" style={{ background: theme.primary }}>
                {course.title.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-[13px] leading-tight truncate">{course.title}</p>
                <p className="text-[10.5px] text-canvas/50">{course.modules.length} modules · {lessons.length} lessons</p>
              </div>
            </div>
            <div className="px-4 pt-3">
              <p className="text-[10.5px] text-canvas/50 mb-1.5">Progress · {completedCount}/{lessons.length}</p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: theme.accent }} /></div>
            </div>
            <nav className="grow overflow-y-auto px-2.5 py-3" aria-label="Course contents">
              {course.modules.map((m) => (
                <div key={m.id} className="mb-2">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-canvas/40 mb-1">{m.title}</p>
                  {m.lessons.map((l) => {
                    const i = lessons.findIndex((x) => x.lesson.id === l.id);
                    const isOn = i === idx;
                    const isDone = done.has(l.id);
                    const isLocked = locked(i);
                    return (
                      <button key={l.id} disabled={isLocked} onClick={() => setIdx(i)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] transition-colors mb-0.5 ${isOn ? "text-white" : isLocked ? "text-canvas/30 cursor-not-allowed" : "text-canvas/75 hover:bg-white/5 hover:text-white"}`}
                        style={isOn ? { background: theme.primary } : undefined}>
                        <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9.5px] font-bold flex-none ${isDone ? "text-night" : "bg-white/10"}`} style={isDone ? { background: theme.accent } : undefined}>
                          {isDone ? <Check size={10} strokeWidth={3.5} /> : i + 1}
                        </span>
                        <span className="truncate">{l.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
            {course.objectives.length > 0 && (
              <div className="p-3.5 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-canvas/40 mb-1.5">You will learn to</p>
                {course.objectives.slice(0, 3).map((o, i) => <p key={i} className="text-[11px] text-canvas/65 leading-snug mb-1">· {o}</p>)}
              </div>
            )}
          </aside>

          {/* main */}
          <main className="grow overflow-y-auto" role="main">
            {review && (
              <div className="sticky top-0 z-20 bg-amber-3 border-b border-amber/30 px-5 py-2 flex items-center gap-2 text-[12.5px] font-semibold text-amber-2">
                <MessageSquare size={14} /> Review mode — hover any block and use the comment button. {openComments.length > 0 && `${openComments.length} open comment${openComments.length > 1 ? "s" : ""}.`}
              </div>
            )}
            <div className="max-w-[760px] mx-auto px-6 py-9 max-sm:px-4">
              {finished ? (
                <CompletionScreen course={course} score={bestScore} pct={pct} onRestart={restart} />
              ) : current ? (
                <div key={current.lesson.id} className="anim-rise">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">{current.module.title}</p>
                  <h1 className="font-display font-extrabold text-[28px] leading-tight mt-1.5 mb-1">{current.lesson.title}</h1>
                  <p className="text-[12px] text-faint mb-7">{current.lesson.minutes} min · Lesson {idx + 1} of {lessons.length}</p>

                  <div className="space-y-5">
                    {current.lesson.blocks.map((b) => (
                      <BlockShell key={b.id} blockId={b.id} lessonId={current.lesson.id} review={!!review}
                        commentCount={course.comments.filter((c) => c.blockId === b.id && !c.resolved).length}
                        onComment={() => setCommentFor(b.id)}>
                        <BlockView block={b} />
                      </BlockShell>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-10 pt-5 border-t border-line flex-wrap">
                    <Btn variant={done.has(current.lesson.id) ? "outline" : "primary"} size="md" onClick={() => markDone(current.lesson.id)} disabled={done.has(current.lesson.id)}>
                      {done.has(current.lesson.id) ? <><Check size={15} /> Completed</> : <><CheckCheck size={15} /> Mark lesson complete</>}
                    </Btn>
                    <div className="flex gap-2">
                      <Btn variant="ghost" onClick={() => setIdx(idx - 1)} disabled={idx === 0}><ArrowLeft size={15} /> Back</Btn>
                      {idx < lessons.length - 1
                        ? <Btn variant="dark" onClick={() => !locked(idx + 1) && setIdx(idx + 1)} disabled={locked(idx + 1)}>Next <ArrowRight size={15} /></Btn>
                        : !isComplete && <Btn variant="dark" onClick={() => markDone(current.lesson.id)}>{done.has(current.lesson.id) ? "Finish course" : "Complete & finish"}</Btn>}
                    </div>
                  </div>
                  {/* mobile lesson nav */}
                  <div className="sm:hidden mt-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2">All lessons</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lessons.map((l, i) => (
                        <button key={l.lesson.id} disabled={locked(i)} onClick={() => setIdx(i)}
                          className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${i === idx ? "border-transparent text-white" : done.has(l.lesson.id) ? "border-ok/30 text-ok bg-ok-3" : "border-line text-mute"}`}
                          style={i === idx ? { background: theme.primary } : undefined}>{i + 1}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-mute text-[14px]">This course has no lessons yet.</div>
              )}
            </div>
          </main>

          {/* comment composer */}
          {commentFor && current && (
            <CommentComposer blockId={commentFor} lessonId={current.lesson.id} author={user?.name || "Reviewer"}
              onClose={() => setCommentFor(null)}
              onSubmit={(text) => { addComment(course.id, current.lesson.id, commentFor, user?.name || "Reviewer", text); toast("ok", "Comment sent to the author."); setCommentFor(null); }} />
          )}
        </div>
      </LearnContext.Provider>
    </ThemeContext.Provider>
  );
}

function BlockShell({ children, review, onComment, commentCount }: { children: React.ReactNode; blockId: string; lessonId: string; review: boolean; onComment: () => void; commentCount: number }) {
  return (
    <div className="relative group/blk">
      {children}
      {review && (
        <button onClick={onComment} aria-label="Comment on this block"
          className="absolute -right-2 top-0 translate-x-full opacity-0 group-hover/blk:opacity-100 focus-visible:opacity-100 transition-opacity w-7 h-7 rounded-full bg-night text-canvas flex items-center justify-center shadow-pop max-lg:opacity-100 max-lg:static max-lg:mb-1">
          {commentCount > 0 ? <span className="text-[10px] font-bold">{commentCount}</span> : <MessageSquare size={13} />}
        </button>
      )}
    </div>
  );
}

function CommentComposer({ onClose, onSubmit, author }: { blockId: string; lessonId: string; author: string; onClose: () => void; onSubmit: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-night/50" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-pop w-full max-w-[420px] p-4 anim-pop">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display font-bold text-[14.5px]">Comment as {author}</p>
          <IconBtn label="Close" onClick={onClose}><X size={15} /></IconBtn>
        </div>
        <TextArea rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the author change here?" />
        <div className="flex justify-end gap-2 mt-3">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn size="sm" onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()}>Send comment</Btn>
        </div>
      </div>
    </div>
  );
}

function CompletionScreen({ course, score, pct, onRestart }: { course: Course; score: number | null; pct: number; onRestart: () => void }) {
  const passed = score != null && score >= course.settings.passMark;
  return (
    <div className="anim-pop text-center py-10">
      <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${passed || score == null ? "bg-ok-3 text-ok" : "bg-warn-3 text-warn"}`}>
        <Check size={30} strokeWidth={3} />
      </div>
      <h2 className="font-display font-extrabold text-[26px] mt-4">Course complete</h2>
      {score != null && (
        <p className={`mt-1.5 font-bold text-[15px] ${passed ? "text-ok" : "text-warn"}`}>
          Score {score}% — {passed ? `Passed (pass mark ${course.settings.passMark}%)` : `Below the ${course.settings.passMark}% pass mark`}
        </p>
      )}
      <p className="text-[13px] text-mute mt-1">{pct}% of lessons completed</p>
      <div className="mx-auto mt-7 max-w-[380px] border-2 border-dashed border-line-2 rounded-xl p-5 bg-surface">
        <p className="text-[10.5px] uppercase tracking-[0.14em] text-faint font-bold">Certificate of completion</p>
        <p className="font-display font-bold text-[17px] mt-2 text-ink">{course.title}</p>
        <p className="text-[12px] text-mute mt-1">{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div className="mt-7"><Btn variant="outline" onClick={onRestart}><RotateCcw size={14} /> Restart course</Btn></div>
    </div>
  );
}

/* ---------------- preview shell (devices + debug) ---------------- */
export function PreviewShell({ courseId, review }: { courseId: string; review?: boolean }) {
  const course = useStore((s) => s.courses[courseId]);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [debug, setDebug] = useState(false);
  const [events, setEvents] = useState<TrackEvent[]>([]);

  if (!course) return <div className="p-10 text-mute text-[14px]">Course not found.</div>;

  const widths = { desktop: "100%", tablet: "820px", mobile: "392px" };

  return (
    <div className="h-screen flex flex-col bg-canvas">
      <header className="h-[52px] flex-none bg-surface border-b border-line flex items-center gap-3 px-4">
        <Btn variant="ghost" size="sm" onClick={() => go(review ? { name: "dashboard" } : { name: "editor", courseId })}><ChevronLeft size={15} /> {review ? "Exit review" : "Back to editor"}</Btn>
        <Chip tone={review ? "amber" : "pine"}>{review ? "Shared review" : "Preview as learner"}</Chip>
        <span className="text-[13px] font-semibold text-ink truncate max-w-[280px]">{course.title}</span>
        <div className="ml-auto flex items-center gap-2.5">
          <Seg size="sm" value={device} onChange={setDevice} options={[
            { value: "desktop", label: <Monitor size={14} />, title: "Desktop" },
            { value: "tablet", label: <Tablet size={14} />, title: "Tablet" },
            { value: "mobile", label: <Smartphone size={14} />, title: "Mobile" },
          ]} />
          {!review && <Btn variant={debug ? "dark" : "outline"} size="sm" onClick={() => setDebug(!debug)}><Bug size={13} /> Debug</Btn>}
        </div>
      </header>
      <div className="grow flex min-h-0">
        <div className="grow dotgrid flex items-start justify-center overflow-auto p-5">
          <div className="bg-surface rounded-xl border border-line-2 shadow-lift overflow-hidden transition-all duration-300 h-full"
            style={{ width: widths[device], maxWidth: "100%" }}>
            <Player course={course} review={review} onTrack={(e) => setEvents((ev) => [...ev.slice(-199), e])} />
          </div>
        </div>
        {debug && (
          <aside className="w-[320px] flex-none bg-night text-canvas border-l border-night-2 flex flex-col anim-slide-r">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <p className="font-bold text-[13px]">Tracking debug</p>
              <button className="text-[11.5px] text-canvas/60 hover:text-white" onClick={() => setEvents([])}>Clear</button>
            </div>
            <div className="grow overflow-y-auto p-3 space-y-1.5 font-mono text-[10.5px]">
              {events.length === 0 && <p className="text-canvas/40">Interact with the course — tracking calls appear here.</p>}
              {[...events].reverse().map((e, i) => (
                <div key={i} className="rounded-md bg-white/5 px-2 py-1.5">
                  <span className={`font-bold ${e.label === "passed" ? "text-[#7ddba3]" : e.label === "failed" ? "text-[#f0a09a]" : e.label === "completed" ? "text-[#e8c87a]" : "text-canvas/80"}`}>{e.label}</span>
                  <span className="text-canvas/50"> · {e.key}</span>
                  {e.val && <span className="text-canvas/70"> — {e.val}</span>}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
