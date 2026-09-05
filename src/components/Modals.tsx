import { AlertTriangle, ArrowRight, Check, CheckCheck, ChevronRight, Copy, Download, FileCode2, MessageSquare, RefreshCw, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LocalProvider, QuizOpts } from "../lib/ai";
import { QAReport, autoFix, buildPackage, downloadBlob, slug, validateCourse, EXPORTERS, ExportFormat } from "../lib/scorm";
import { AI_COST, useStore } from "../lib/store";
import { Course, Question, findLesson, uid } from "../lib/types";
import { copyReviewLink, relTime } from "./Dashboard";
import { Btn, Chip, Field, IconBtn, Modal, ProgressBar, Seg, Select, TextArea } from "./ui";

/* ================= Export + QA ================= */
export function ExportModal({ course, open, onClose }: { course: Course; open: boolean; onClose: () => void }) {
  const updateCourse = useStore((s) => s.updateCourse);
  const saveVersion = useStore((s) => s.saveVersion);
  const toast = useStore((s) => s.toast);
  const [report, setReport] = useState<QAReport | null>(null);
  const [format, setFormat] = useState<ExportFormat>("scorm12");
  const [endpoint, setEndpoint] = useState("");
  const [building, setBuilding] = useState(false);
  const [lastSize, setLastSize] = useState<string | null>(null);

  useEffect(() => { if (open) { setReport(validateCourse(course)); setLastSize(null); } }, [open]);
  useEffect(() => { if (open) setReport(validateCourse(course)); }, [course]);

  if (!report) return null;
  const canDownload = report.errors === 0;

  const fix = () => {
    const changes = autoFix(course);
    if (!changes.length) { toast("info", "No safe automatic fixes available."); return; }
    updateCourse(course.id, (c) => { autoFix(c); });
    toast("ok", changes.join(" · "));
  };

  const download = async () => {
    setBuilding(true);
    try {
      const res = await buildPackage(course, format, { xapiEndpoint: endpoint });
      const name = `${slug(course.title)}-${format}${format === "xapi" ? "" : ""}.zip`;
      downloadBlob(res.blob, name);
      try { localStorage.setItem("ls.onboard.export", "1"); } catch { /* noop */ }
      saveVersion(course.id, `Exported ${EXPORTERS.find((e) => e.format === format)?.label}`);
      setLastSize(`${(res.blob.size / 1024).toFixed(0)} KB · ${res.files.length} files`);
      toast("ok", `Package downloaded — upload ${name} to your LMS.`);
    } catch {
      toast("err", "Packaging failed. Please try again.");
    }
    setBuilding(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Export package" subtitle="Validated before download — the same course definition renders everywhere." width={680}
      footer={<>
        <span className="mr-auto text-[12px] text-faint font-mono">{lastSize || ""}</span>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn onClick={download} disabled={!canDownload || building}>
          {building ? <RefreshCw size={14} className="anim-spin" /> : <Download size={14} />} Download .zip
        </Btn>
      </>}>
      <div className="grid md:grid-cols-[1fr_240px] gap-5">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">Package QA</p>
            <div className="flex items-center gap-2">
              <Btn variant="outline" size="sm" onClick={() => setReport(validateCourse(course))}><RefreshCw size={12} /> Re-run</Btn>
              {report.warns > 0 && <Btn variant="amber" size="sm" onClick={fix}><Sparkles size={12} /> Fix automatically</Btn>}
            </div>
          </div>
          <div className="rounded-xl border border-line p-3.5">
            <div className="flex items-center gap-3 mb-2.5">
              <span className={`font-display font-extrabold text-[22px] ${report.score >= 85 ? "text-ok" : report.score >= 60 ? "text-warn" : "text-bad"}`}>{report.score}</span>
              <ProgressBar value={report.score} className="grow" tone={report.score >= 60 ? "pine" : "amber"} />
              <span className="text-[11.5px] text-mute whitespace-nowrap">{report.errors} errors · {report.warns} warnings</span>
            </div>
            <div className="space-y-1 max-h-[190px] overflow-y-auto pr-1">
              {report.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 text-[12.5px]">
                  {it.severity === "pass" ? <Check size={13} className="text-ok flex-none" /> : it.severity === "warn" ? <AlertTriangle size={13} className="text-warn flex-none" /> : <X size={13} className="text-bad flex-none" />}
                  <span className={it.severity === "pass" ? "text-mute" : "text-ink-2"}>{it.message}</span>
                  {it.fixable && <Chip tone="amber">auto-fix</Chip>}
                </div>
              ))}
            </div>
          </div>
          {!canDownload && <p className="text-[12px] font-semibold text-bad mt-2.5 flex items-center gap-1.5"><ShieldCheck size={14} /> Fix the errors above before exporting — packages are never shipped broken.</p>}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">Format</p>
          <div className="space-y-2">
            {EXPORTERS.map((e) => (
              <button key={e.format} onClick={() => setFormat(e.format)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${format === e.format ? "border-pine bg-pine-3/50 shadow-card" : "border-line hover:border-line-2"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold">{e.label}</span>
                  {e.beta && <Chip tone="warn">beta</Chip>}
                  {format === e.format && <Check size={14} className="text-pine ml-auto" />}
                </div>
                <p className="text-[11px] text-mute mt-1 leading-snug">{e.blurb}</p>
              </button>
            ))}
          </div>
          {(format === "xapi" || format === "cmi5") && (
            <div className="mt-3">
              <Field label="LRS endpoint (optional)" hint="Statements POST here; otherwise they are logged to the console.">
                <TextArea rows={2} value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://lrs.example.com/xapi/statements" className="font-mono text-[11px]" />
              </Field>
            </div>
          )}
          <p className="text-[10.5px] text-faint font-mono mt-3 leading-relaxed">
            {format === "scorm12" || format === "scorm2004" ? "imsmanifest.xml · index.html · player.js · styles.css · course.json" : format === "cmi5" ? "cmi5.xml · index.html · player.js · styles.css · course.json" : "README.txt · index.html · player.js · styles.css · course.json"}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ================= Quiz generator ================= */
export function QuizGenModal({ course, open, onClose, onInsert }: { course: Course; open: boolean; onClose: () => void; onInsert: (qs: Question[], mode: "practice" | "graded", passMark: number) => void }) {
  const user = useStore((s) => s.user);
  const adjustCredits = useStore((s) => s.adjustCredits);
  const toast = useStore((s) => s.toast);
  const lessons = useMemo(() => course.modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, title: l.title, module: m.title }))), [course]);
  const [source, setSource] = useState<string>("course");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Question["difficulty"]>("medium");
  const [types, setTypes] = useState<Question["type"][]>(["mcq", "tf", "fill"]);
  const [passMark, setPassMark] = useState(80);
  const [mode, setMode] = useState<"practice" | "graded">("practice");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setQuestions(null); setSource(lessons[0]?.id || "course"); } }, [open]);

  const toggleType = (t: Question["type"]) => setTypes((ts) => (ts.includes(t) ? (ts.length > 1 ? ts.filter((x) => x !== t) : ts) : [...ts, t]));

  const generate = () => {
    if ((user()?.credits ?? 0) < AI_COST.quiz) { toast("err", `Quiz generation costs ${AI_COST.quiz} credits — you have ${user()?.credits ?? 0}.`); return; }
    setBusy(true);
    setTimeout(() => {
      const opts: QuizOpts = { count, difficulty, types, passMark, mode };
      const qs = LocalProvider.generateQuiz(course, source === "course" ? null : source, opts);
      setQuestions(qs);
      adjustCredits(-AI_COST.quiz);
      setBusy(false);
      toast("ai", `${qs.length} questions drafted from ${source === "course" ? "the whole course" : "that lesson"} — every one is editable.`);
    }, 700);
  };

  const regenOne = (id: string) => {
    setQuestions((qs) => qs!.map((q) => {
      if (q.id !== id) return q;
      const fresh = LocalProvider.generateQuiz(course, source === "course" ? null : source, { count: 1, difficulty, types: [q.type], passMark, mode })[0];
      return { ...fresh, id: uid(), type: q.type };
    }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate assessment" subtitle="Questions are grounded in your course content — review and edit before inserting." width={640}
      footer={questions ? <>
        <Btn variant="ghost" onClick={() => setQuestions(null)}>← Adjust inputs</Btn>
        <Btn onClick={() => { onInsert(questions, mode, passMark); onClose(); }}>
          Insert {mode === "graded" ? "as final assessment" : "as knowledge check"} <ArrowRight size={14} />
        </Btn>
      </> : <>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={generate} disabled={busy}><Sparkles size={14} /> {busy ? "Drafting…" : `Generate ${count} questions · ${AI_COST.quiz} credits`}</Btn>
      </>}>
      {!questions ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Source">
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="course">Whole course</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.module} — {l.title}</option>)}
            </Select>
          </Field>
          <Field label={`Number of questions · ${count}`}>
            <input type="range" min={3} max={10} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full mt-2.5" aria-label="Number of questions" />
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Question["difficulty"])}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </Select>
          </Field>
          <Field label={`Pass mark · ${passMark}%`}>
            <input type="range" min={50} max={100} step={5} value={passMark} onChange={(e) => setPassMark(+e.target.value)} className="w-full mt-2.5" aria-label="Pass mark" />
          </Field>
          <div className="sm:col-span-2">
            <p className="text-[12px] font-semibold text-ink-2 mb-1.5">Question types</p>
            <div className="flex flex-wrap gap-1.5">
              {([["mcq", "Multiple choice"], ["multi", "Multiple select"], ["tf", "True / false"], ["fill", "Fill in the blank"], ["order", "Ordering"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => toggleType(v)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-all ${types.includes(v) ? "border-pine bg-pine-3/60 text-pine-2" : "border-line text-mute hover:border-line-2"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-canvas border border-line px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold text-ink-2">Assessment style</span>
            <Seg value={mode} onChange={setMode} options={[{ value: "practice", label: "Practice (feedback only)" }, { value: "graded", label: "Graded" }]} />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {questions.map((q, i) => (
            <div key={q.id} className="border border-line rounded-xl p-3.5 anim-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start gap-2.5">
                <span className="text-[10.5px] font-bold text-pine-2 bg-pine-3 rounded px-1.5 py-0.5 mt-0.5 uppercase">{q.type}</span>
                <div className="grow">
                  <p className="text-[13.5px] font-semibold leading-snug">{q.prompt}</p>
                  {q.type === "fill"
                    ? <p className="text-[12px] text-mute mt-1">Answer: <strong>{q.answer}</strong></p>
                    : <div className="mt-1.5 space-y-0.5">{(q.options || []).map((o, oi) => <p key={oi} className={`text-[12.5px] ${(q.correct || []).includes(oi) ? "text-ok font-semibold" : "text-mute"}`}>{(q.correct || []).includes(oi) ? "✓ " : "· "}{o}</p>)}</div>}
                  <p className="text-[11.5px] text-faint mt-1.5 italic">{q.explanation}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <IconBtn label="Regenerate question" onClick={() => regenOne(q.id)}><RefreshCw size={13} /></IconBtn>
                  <IconBtn label="Remove" onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}><X size={13} /></IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ================= Versions ================= */
export function VersionsModal({ course, open, onClose }: { course: Course; open: boolean; onClose: () => void }) {
  const versions = useStore((s) => s.versions.filter((v) => v.courseId === course.id));
  const saveVersion = useStore((s) => s.saveVersion);
  const restoreVersion = useStore((s) => s.restoreVersion);
  return (
    <Modal open={open} onClose={onClose} title="Version history" subtitle="Autosave protects every keystroke; named versions protect milestones." width={520}
      footer={<Btn onClick={() => { saveVersion(course.id, "Manual snapshot"); }}><Check size={14} /> Save current version</Btn>}>
      {versions.length === 0 ? <p className="text-[13px] text-mute py-6 text-center">No versions yet. Publishing, exporting or manual snapshots appear here.</p> : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3 border border-line rounded-lg px-3.5 py-2.5">
              <RotateCcw size={14} className="text-pine flex-none" />
              <div className="grow min-w-0">
                <p className="text-[13px] font-semibold truncate">{v.label}</p>
                <p className="text-[11px] text-faint">{relTime(v.ts)} · {v.snapshot.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons · {v.snapshot.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.blocks.length, 0), 0)} blocks</p>
              </div>
              <Btn variant="outline" size="sm" onClick={() => { restoreVersion(v.id); onClose(); }}>Restore</Btn>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ================= Share / review ================= */
export function ShareModal({ course, open, onClose }: { course: Course; open: boolean; onClose: () => void }) {
  const toast = useStore((s) => s.toast);
  const setComment = useStore((s) => s.setComment);
  const deleteComment = useStore((s) => s.deleteComment);
  const selectLesson = useStore((s) => s.selectLesson);
  const selectBlock = useStore((s) => s.selectBlock);
  const url = `${location.origin}${location.pathname}#/review/${course.id}`;
  const openComments = course.comments.filter((c) => !c.resolved);
  const resolved = course.comments.filter((c) => c.resolved);

  const jump = (lessonId: string, blockId: string) => {
    selectLesson(lessonId); selectBlock(blockId); onClose();
    toast("info", "Jumped to the commented block.");
  };

  return (
    <Modal open={open} onClose={onClose} title="Share for review" subtitle="Reviewers open the course player — no account needed — and comment on specific blocks." width={560}>
      <div className="flex gap-2">
        <code className="grow text-[11.5px] font-mono bg-canvas border border-line rounded-lg px-3 py-2 truncate">{url}</code>
        <Btn variant="outline" onClick={() => { copyReviewLink(course.id); toast("ok", "Review link copied to clipboard."); }}><Copy size={13} /> Copy</Btn>
        <Btn onClick={() => { window.open(`#/review/${course.id}`, "_blank"); }}>Open</Btn>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mt-5 mb-2">Comments ({openComments.length} open · {resolved.length} resolved)</p>
      {course.comments.length === 0 ? (
        <p className="text-[13px] text-mute border border-dashed border-line-2 rounded-xl py-8 text-center">No comments yet. Share the link and feedback lands here, anchored to blocks.</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {[...openComments, ...resolved].map((c) => {
            const loc = findLesson(course, c.lessonId);
            const block = loc?.lesson.blocks.find((b) => b.id === c.blockId);
            return (
              <div key={c.id} className={`border rounded-lg px-3.5 py-2.5 ${c.resolved ? "border-line bg-canvas/60 opacity-70" : "border-line"}`}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-night text-canvas text-[9.5px] font-bold flex items-center justify-center flex-none">{c.author.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
                  <p className="text-[12.5px] font-semibold">{c.author}</p>
                  <span className="text-[10.5px] text-faint">{relTime(c.ts)}</span>
                  <Chip tone={c.resolved ? "ok" : "warn"}>{c.resolved ? "Resolved" : "Open"}</Chip>
                </div>
                <p className="text-[13px] text-ink-2 mt-1.5 leading-snug">{c.text}</p>
                <p className="text-[10.5px] text-faint mt-1 font-mono truncate">{loc?.lesson.title}{block ? ` · ${blockLabel(block.kind)}` : ""}</p>
                <div className="flex gap-3 mt-1.5">
                  <button className="text-[11.5px] font-semibold text-pine hover:underline" onClick={() => jump(c.lessonId, c.blockId)}>Jump to block</button>
                  {c.resolved
                    ? <button className="text-[11.5px] font-semibold text-mute hover:underline" onClick={() => setComment(course.id, c.id, { resolved: false })}>Reopen</button>
                    : <button className="text-[11.5px] font-semibold text-ok hover:underline flex items-center gap-1" onClick={() => setComment(course.id, c.id, { resolved: true })}><CheckCheck size={12} /> Resolve</button>}
                  <button className="text-[11.5px] font-semibold text-bad hover:underline ml-auto" onClick={() => deleteComment(course.id, c.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function blockLabel(kind: string) {
  const map: Record<string, string> = { heading: "Heading", text: "Text", quote: "Quote", callout: "Callout", image: "Image", keyPoints: "Key points", accordion: "Accordion", tabs: "Tabs", flipcards: "Flip cards", timeline: "Timeline", reveal: "Reveal", checklist: "Checklist", scenario: "Scenario", question: "Question", quiz: "Quiz", video: "Video", divider: "Divider" };
  return map[kind] || kind;
}

/* ================= AI rewrite preview ================= */
export function RewriteModal({ open, onClose, original, proposed, onApply, intent }: { open: boolean; onClose: () => void; original: string; proposed: string; intent: string; onApply: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2"><Sparkles size={15} className="text-amber-2" /> AI rewrite · {intent}</span>} subtitle="Nothing changes until you apply it." width={640}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="amber" onClick={onApply}><Check size={14} /> Apply rewrite</Btn>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-1.5">Current</p>
          <div className="rounded-xl border border-line bg-canvas/60 p-3.5 text-[12.5px] leading-relaxed text-mute max-h-[240px] overflow-y-auto whitespace-pre-wrap">{original}</div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-2 mb-1.5">Proposed</p>
          <div className="rounded-xl border border-amber/40 bg-amber-3/40 p-3.5 text-[12.5px] leading-relaxed text-ink max-h-[240px] overflow-y-auto whitespace-pre-wrap anim-fade">{proposed}</div>
        </div>
      </div>
    </Modal>
  );
}

/* ================= Command palette ================= */
export function CommandPalette({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: { id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void }[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  useEffect(() => { if (open) { setQ(""); setSel(0); } }, [open]);
  const list = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] anim-fade">
      <div className="absolute inset-0 bg-night/55" onClick={onClose} />
      <div className="relative w-[min(560px,92vw)] bg-surface rounded-xl shadow-pop overflow-hidden anim-pop">
        <div className="flex items-center gap-2.5 px-4 border-b border-line">
          <SearchGlyph />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter" && list[sel]) { list[sel].run(); onClose(); }
            }}
            placeholder="Search courses, lessons, blocks and actions…" className="grow py-3.5 text-[14px] focus:outline-none bg-transparent" />
          <kbd className="kbd">esc</kbd>
        </div>
        <div className="max-h-[380px] overflow-y-auto py-1.5">
          {list.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-faint">No matches for “{q}”.</p>}
          {list.map((a, i) => (
            <button key={a.id} onMouseEnter={() => setSel(i)} onClick={() => { a.run(); onClose(); }}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-[13.5px] transition-colors ${i === sel ? "bg-pine-3/60 text-pine-2" : "text-ink-2"}`}>
              <span className="text-faint w-4 flex justify-center">{a.icon || <ChevronRight size={14} />}</span>
              <span className="grow font-medium">{a.label}</span>
              {a.hint && <span className="text-[10.5px] text-faint font-mono">{a.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function SearchGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}
