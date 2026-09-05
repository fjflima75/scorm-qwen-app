import { ArrowLeft, ArrowRight, Check, FileText, LayoutTemplate, PenLine, Presentation, Sparkles, Trash2, Upload, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { CourseBrief, GENERATION_STAGES, LANGUAGES, LocalProvider } from "../lib/ai";
import { GRADIENTS, TEMPLATES } from "../lib/seed";
import { AI_COST, go, useStore } from "../lib/store";
import { Course, Lesson, SourceDoc, defaultTheme, lessonMinutes, uid } from "../lib/types";
import { validateCourse } from "../lib/scorm";
import { Btn, Chip, Field, IconBtn, ProgressBar, Select, TextArea, TextInput } from "./ui";

type Mode = "ai" | "document" | "scratch" | "template";
const MODE_STEPS: Record<Mode, string[]> = {
  ai: ["Brief", "Outline", "Style", "Generate"],
  document: ["Brief", "Sources", "Outline", "Style", "Generate"],
  scratch: ["Brief", "Create"],
  template: ["Brief", "Outline", "Style", "Generate"],
};

export function Wizard() {
  const addCourse = useStore((s) => s.addCourse);
  const openEditor = useStore((s) => s.openEditor);
  const toast = useStore((s) => s.toast);
  const user = useStore((s) => s.user());
  const adjustCredits = useStore((s) => s.adjustCredits);

  const [mode, setMode] = useState<Mode | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0 = pick mode
  const [brief, setBrief] = useState<CourseBrief>({ title: "", topic: "", audience: "", duration: "30 minutes", difficulty: "Intermediate", language: "en", tone: "Professional", industry: "", objectives: [] });
  const [objectivesText, setObjectivesText] = useState("");
  const [sources, setSources] = useState<SourceDoc[]>([]);
  const [pasted, setPasted] = useState("");
  const [outline, setOutline] = useState<ReturnType<typeof LocalProvider.generateOutline> | null>(null);
  const [style, setStyle] = useState({ preset: "Professional", color: "#175943", radius: 10, cover: GRADIENTS[0] });
  const [genStage, setGenStage] = useState(-1);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps = mode ? MODE_STEPS[mode] : [];
  const stepName = steps[step - 1] || "";

  const enoughCredits = (user?.credits ?? 0) >= AI_COST.course;

  const buildOutline = () => {
    const b = { ...brief, objectives: objectivesText.split("\n").map((s) => s.trim()).filter(Boolean) };
    const ol = LocalProvider.generateOutline(b, sources);
    setOutline(ol);
  };

  const next = () => {
    if (step === 0) return;
    const cur = stepName;
    if (cur === "Brief") {
      if (!brief.title.trim()) { toast("err", "Give your course a title first."); return; }
      if (mode === "scratch") { createScratch(); return; }
      if (mode === "document") { setStep(step + 1); return; }
      buildOutline(); setStep(step + 1); return;
    }
    if (cur === "Sources") {
      if (!sources.some((s) => s.text.trim()) && !pasted.trim()) { toast("err", "Add at least one source — upload a .txt/.md file or paste text."); return; }
      if (pasted.trim()) setSources((s) => [...s, { id: uid(), name: "Pasted notes.txt", size: pasted.length, kind: "text/plain", text: pasted, status: "ready" }]);
      buildOutline(); setStep(step + 1); return;
    }
    if (cur === "Outline") { setStep(step + 1); return; }
    if (cur === "Style") { setStep(step + 1); runGeneration(); return; }
  };

  const createScratch = () => {
    const c: Course = {
      schemaVersion: 1, id: uid(), title: brief.title.trim(), description: brief.topic, topic: brief.topic, audience: brief.audience,
      objectives: [], status: "draft", aiGenerated: false, cover: style.cover, theme: { ...defaultTheme(), primary: style.color, radius: style.radius, styleName: style.preset },
      settings: { completionRule: "all-lessons", passMark: 80, percentRequired: 90, maxAttempts: 0, navigation: "free", language: brief.language, showProgress: true, captions: true },
      modules: [{ id: uid(), title: "Module 1", description: "", lessons: [{ id: uid(), title: "Lesson 1", kind: "lesson", minutes: 1, blocks: [{ id: uid(), kind: "heading", text: brief.title.trim(), level: 2 }, { id: uid(), kind: "text", paragraphs: ["Start writing your lesson here, or open the block library to add content, media and activities."] }] }] }],
      comments: [], createdAt: Date.now(), updatedAt: Date.now(), authorName: user?.name || "",
    };
    addCourse(c); toast("ok", "Blank course created."); go({ name: "editor", courseId: c.id });
  };

  const runGeneration = () => {
    if (!outline) return;
    setGenStage(0);
    const total = GENERATION_STAGES.length;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setGenStage(i);
      if (i >= total) {
        clearInterval(timer);
        setTimeout(() => {
          const b = { ...brief, objectives: objectivesText.split("\n").map((s) => s.trim()).filter(Boolean) };
          const c = LocalProvider.generateCourse(outline, b, sources);
          c.authorName = user?.name || "";
          c.theme = { ...c.theme, primary: style.color, radius: style.radius, styleName: style.preset };
          c.cover = style.cover;
          c.settings.language = brief.language;
          for (const m of c.modules) for (const l of m.lessons) l.minutes = lessonMinutes(l.blocks);
          const report = validateCourse(c);
          if (report.errors) {
            /* ground truth: never ship a broken generated course */
            toast("err", "Generation hit a snag. Please try again — nothing was lost.");
            setGenStage(-1); setStep(step - 1);
            return;
          }
          addCourse(c);
          adjustCredits(-AI_COST.course);
          openEditor(c.id);
          toast("ai", "Course generated — it's a draft, review before publishing.");
          go({ name: "editor", courseId: c.id });
        }, 450);
      }
    }, 620);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const okText = /\.(txt|md|text|csv)$/i.test(f.name);
      const base: SourceDoc = { id: uid(), name: f.name, size: f.size, kind: f.type || "file", text: "", status: "parsing" };
      setSources((s) => [...s, base]);
      if (okText) {
        const r = new FileReader();
        r.onload = () => setSources((s) => s.map((x) => (x.id === base.id ? { ...x, text: String(r.result || ""), status: "ready" } : x)));
        r.readAsText(f);
      } else {
        setTimeout(() => setSources((s) => s.map((x) => (x.id === base.id ? { ...x, status: "ready" } : x))), 700);
      }
    });
  };

  /* ---------- screens ---------- */
  if (step === 0) {
    return (
      <Shell onBack={() => go({ name: "dashboard" })} title="Create a course" sub="Choose how you want to start — you can change everything later.">
        <div className="grid sm:grid-cols-2 gap-3 max-w-[720px]">
          <ModeCard icon={<Sparkles size={20} />} hot title="Build with AI" desc="Describe the course — AI designs objectives, modules, lessons, activities and the final assessment." onClick={() => { setMode("ai"); setStep(1); }} />
          <ModeCard icon={<Upload size={20} />} title="From a document" desc="Upload or paste policy docs, manuals or notes. AI grounds the course in your material." onClick={() => { setMode("document"); setStep(1); }} />
          <ModeCard icon={<Presentation size={20} />} title="From a presentation" desc="Turn slide decks into structured lessons with knowledge checks." onClick={() => { setMode("document"); setStep(1); }} />
          <ModeCard icon={<PenLine size={20} />} title="Start from scratch" desc="A clean canvas with the full block library. You drive, AI assists inline." onClick={() => { setMode("scratch"); setStep(1); }} />
        </div>
        <div className="mt-8 max-w-[720px]">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5 flex items-center gap-2"><LayoutTemplate size={14} /> Or start from a template</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => { setMode("template"); setTemplateId(t.id); setBrief({ ...t.brief }); setObjectivesText(t.brief.objectives.join("\n")); setStep(1); }}
                className="text-left bg-surface border border-line rounded-xl p-4 hover:border-pine hover:shadow-card transition-all group">
                <p className="font-display font-bold text-[14.5px] group-hover:text-pine-2 transition-colors">{t.name}</p>
                <p className="text-[12.5px] text-mute mt-1 leading-snug">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  if (genStage >= 0) {
    return (
      <Shell onBack={() => {}} title="Generating your course" sub="The engine is working like an instructional designer — chunking, varying formats, adding retrieval practice." locked>
        <div className="max-w-[520px] w-full">
          <div className="bg-surface border border-line rounded-xl p-6">
            {GENERATION_STAGES.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 py-2 transition-opacity ${i > genStage ? "opacity-35" : ""}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-none text-[11px] font-bold ${i < genStage ? "bg-ok-3 text-ok" : i === genStage ? "bg-pine text-white" : "bg-line text-faint"}`}>
                  {i < genStage ? <Check size={13} strokeWidth={3} /> : i === genStage ? <span className="w-2.5 h-2.5 rounded-full bg-white animate-[pulse-dot_1s_ease_infinite]" /> : i + 1}
                </span>
                <span className={`text-[13.5px] font-medium ${i === genStage ? "text-ink" : "text-mute"}`}>{s}…</span>
              </div>
            ))}
            <ProgressBar value={((genStage + 1) / GENERATION_STAGES.length) * 100} className="mt-4" />
            <p className="text-[11.5px] text-faint mt-2.5 font-mono">{outline ? `${outline.modules.length} modules · ${outline.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons planned` : ""}</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => (step === 1 ? (setStep(0), setMode(null)) : setStep(step - 1))} title={stepName} sub={subFor(stepName)}
      steps={steps} stepIdx={step - 1}>
      {stepName === "Brief" && (
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 max-w-[760px] anim-rise">
          <Field label="Course title"><TextInput value={brief.title} autoFocus onChange={(e) => setBrief({ ...brief, title: e.target.value })} placeholder="e.g. Workplace Communication Essentials" /></Field>
          <Field label="Topic"><TextInput value={brief.topic} onChange={(e) => setBrief({ ...brief, topic: e.target.value })} placeholder="What is this course about?" /></Field>
          <Field label="Target audience"><TextInput value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="e.g. new managers, all employees" /></Field>
          <Field label="Estimated duration">
            <Select value={brief.duration} onChange={(e) => setBrief({ ...brief, duration: e.target.value })}>
              {["15 minutes", "20 minutes", "30 minutes", "45 minutes", "60 minutes"].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={brief.difficulty} onChange={(e) => setBrief({ ...brief, difficulty: e.target.value as CourseBrief["difficulty"] })}>
              {["Introductory", "Intermediate", "Advanced"].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Tone">
            <Select value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })}>
              {["Professional", "Friendly", "Corporate", "Bold", "Educational"].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Language">
            <Select value={brief.language} onChange={(e) => setBrief({ ...brief, language: e.target.value })}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Industry (optional)"><TextInput value={brief.industry} onChange={(e) => setBrief({ ...brief, industry: e.target.value })} placeholder="e.g. healthcare, retail, SaaS" /></Field>
          {mode !== "scratch" && (
            <div className="md:col-span-2">
              <Field label="Learning objectives" hint="One per line. Leave empty and AI will design them from your topic.">
                <TextArea rows={3} value={objectivesText} onChange={(e) => setObjectivesText(e.target.value)} placeholder={"Apply the clarity loop to everyday messages\nGive feedback that lands"} />
              </Field>
            </div>
          )}
        </div>
      )}

      {stepName === "Sources" && (
        <div className="max-w-[680px] anim-rise">
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.text,.csv" className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-line-2 rounded-xl py-10 flex flex-col items-center gap-2 hover:border-pine hover:bg-pine-3/30 transition-all group">
            <Upload size={22} className="text-faint group-hover:text-pine transition-colors" />
            <p className="font-semibold text-[14px]">Drop files or click to browse</p>
            <p className="text-[12px] text-faint">PDF · DOCX · PPTX · TXT — text files are read in full; for binaries, paste the key text below</p>
          </button>
          {sources.length > 0 && (
            <div className="mt-4 space-y-2">
              {sources.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-surface border border-line rounded-lg px-3.5 py-2.5 anim-rise">
                  <FileText size={16} className="text-pine flex-none" />
                  <div className="grow min-w-0">
                    <p className="text-[13px] font-semibold truncate">{s.name}</p>
                    <p className="text-[11px] text-faint">{(s.size / 1024).toFixed(1)} KB{s.text ? ` · ${s.text.split(/\s+/).length} words extracted` : s.kind !== "text/plain" && !/\.txt|\.md/i.test(s.name) ? " · binary — metadata only" : ""}</p>
                  </div>
                  <Chip tone={s.status === "ready" ? "ok" : "warn"}>{s.status === "ready" ? "Ready" : "Reading…"}</Chip>
                  <IconBtn label="Remove" onClick={() => setSources(sources.filter((x) => x.id !== s.id))}><Trash2 size={14} /></IconBtn>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Field label="Or paste source text" hint="Everything pasted here grounds the generated lessons and quiz questions.">
              <TextArea rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste the key sections of your document…" />
            </Field>
          </div>
        </div>
      )}

      {stepName === "Outline" && outline && (
        <div className="max-w-[760px] anim-rise">
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <Chip tone="amber"><Sparkles size={11} /> AI-proposed structure</Chip>
            <span className="text-[12.5px] text-mute">{outline.description}</span>
          </div>
          <p className="text-[12px] text-faint mb-4 flex items-center gap-1.5"><Wand2 size={13} /> {outline.assessmentNote}</p>
          <div className="space-y-3">
            {outline.modules.map((m, mi) => (
              <div key={mi} className="bg-surface border border-line rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-pine text-white text-[11px] font-bold flex items-center justify-center flex-none">{mi + 1}</span>
                  <input value={m.title} onChange={(e) => setOutline({ ...outline, modules: outline.modules.map((x, xi) => (xi === mi ? { ...x, title: e.target.value } : x)) })}
                    className="grow font-display font-bold text-[14.5px] bg-transparent border-b border-transparent hover:border-line-2 focus:border-pine focus:outline-none" />
                  <IconBtn label="Move up" disabled={mi === 0} onClick={() => moveModule(mi, -1)}><ArrowLeft size={13} className="rotate-90" /></IconBtn>
                  <IconBtn label="Move down" disabled={mi === outline.modules.length - 1} onClick={() => moveModule(mi, 1)}><ArrowLeft size={13} className="-rotate-90" /></IconBtn>
                  <IconBtn label="Remove module" onClick={() => setOutline({ ...outline, modules: outline.modules.filter((_, xi) => xi !== mi) })}><X size={14} /></IconBtn>
                </div>
                <div className="ml-8 mt-2.5 space-y-1.5">
                  {m.lessons.map((l, li) => (
                    <div key={li} className="flex items-center gap-2 group">
                      <span className="text-faint text-[11px] w-3">{li + 1}.</span>
                      <input value={l.title} onChange={(e) => renameLesson(mi, li, e.target.value)}
                        className="grow text-[13px] bg-transparent border-b border-transparent hover:border-line-2 focus:border-pine focus:outline-none py-0.5" />
                      <Chip tone={l.kind === "assessment" ? "amber" : l.kind === "check" ? "pine" : "neutral"}>{l.kind === "lesson" ? "Lesson" : l.kind === "check" ? "Knowledge check" : "Assessment"}</Chip>
                      <IconBtn label="Remove lesson" className="opacity-0 group-hover:opacity-100" onClick={() => removeLesson(mi, li)}><X size={13} /></IconBtn>
                    </div>
                  ))}
                  <button onClick={() => addLessonTo(mi)} className="text-[12px] font-semibold text-pine hover:underline">+ Add lesson</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addModule} className="mt-3 text-[13px] font-semibold text-pine hover:underline">+ Add module</button>
        </div>
      )}

      {stepName === "Style" && (
        <div className="max-w-[680px] anim-rise">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">Theme preset</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {[
              { name: "Professional", color: "#175943" }, { name: "Corporate", color: "#1d3a5f" },
              { name: "Modern", color: "#3b3f8f" }, { name: "Bold", color: "#8c2f39" },
              { name: "Friendly", color: "#c2701e" }, { name: "Educational", color: "#274b3a" },
              { name: "Minimal", color: "#39423c" }, { name: "Creative", color: "#4a2a5e" },
            ].map((p) => (
              <button key={p.name} onClick={() => setStyle({ ...style, preset: p.name, color: p.color })}
                className={`rounded-xl border-2 p-3 text-left transition-all ${style.preset === p.name ? "border-pine shadow-card" : "border-line hover:border-line-2"}`}>
                <span className="block w-full h-8 rounded-lg mb-2" style={{ background: p.color }} />
                <span className="text-[12.5px] font-semibold">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Brand color">
              <div className="flex items-center gap-2">
                <input type="color" value={style.color} onChange={(e) => setStyle({ ...style, color: e.target.value })} className="w-10 h-9 rounded-lg border border-line-2 cursor-pointer bg-surface p-1" aria-label="Brand color" />
                <TextInput value={style.color} onChange={(e) => setStyle({ ...style, color: e.target.value })} className="font-mono text-[12.5px]" />
              </div>
            </Field>
            <Field label={`Corner radius · ${style.radius}px`}>
              <input type="range" min={0} max={20} value={style.radius} onChange={(e) => setStyle({ ...style, radius: +e.target.value })} className="w-full mt-2.5" aria-label="Corner radius" />
            </Field>
            <Field label="Cover style">
              <div className="flex gap-2 flex-wrap">
                {GRADIENTS.map((g, i) => (
                  <button key={i} onClick={() => setStyle({ ...style, cover: g })} aria-label={`Cover ${i + 1}`}
                    className={`w-10 h-9 rounded-lg border-2 transition-all ${style.cover === g ? "border-pine scale-105" : "border-transparent"}`} style={{ background: g }} />
                ))}
              </div>
            </Field>
          </div>
          {!enoughCredits && (
            <div className="mt-6 rounded-xl border border-warn/30 bg-warn-3 px-4 py-3 flex items-center gap-3">
              <p className="text-[13px] font-semibold text-amber-2 grow">Generating a course costs {AI_COST.course} credits — you have {user?.credits ?? 0}.</p>
              <Btn size="sm" variant="amber" onClick={() => { adjustCredits(50); toast("ok", "+50 demo credits added."); }}>Add 50 demo credits</Btn>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between max-w-[760px]">
        <Btn variant="ghost" onClick={() => (step === 1 ? (setStep(0), setMode(null)) : setStep(step - 1))}><ArrowLeft size={15} /> Back</Btn>
        <div className="flex items-center gap-3">
          {stepName === "Style" && <span className="text-[12px] text-faint">{AI_COST.course} credits</span>}
          <Btn size="lg" onClick={next} disabled={stepName === "Style" && !enoughCredits}>
            {stepName === "Style" ? <><Sparkles size={15} /> Generate course</> : mode === "scratch" && stepName === "Brief" ? <>Create course <ArrowRight size={15} /></> : <>Continue <ArrowRight size={15} /></>}
          </Btn>
        </div>
      </div>
    </Shell>
  );

  function moveModule(mi: number, dir: -1 | 1) {
    if (!outline) return;
    const mods = outline.modules.slice();
    const t = mods[mi + dir]; if (t === undefined) return;
    mods[mi + dir] = mods[mi]; mods[mi] = t;
    setOutline({ ...outline, modules: mods });
  }
  function renameLesson(mi: number, li: number, v: string) {
    if (!outline) return;
    setOutline({ ...outline, modules: outline.modules.map((m, xi) => xi === mi ? { ...m, lessons: m.lessons.map((l, yi) => (yi === li ? { ...l, title: v } : l)) } : m) });
  }
  function removeLesson(mi: number, li: number) {
    if (!outline) return;
    setOutline({ ...outline, modules: outline.modules.map((m, xi) => (xi === mi ? { ...m, lessons: m.lessons.filter((_, yi) => yi !== li) } : m)) });
  }
  function addLessonTo(mi: number) {
    if (!outline) return;
    setOutline({ ...outline, modules: outline.modules.map((m, xi) => (xi === mi ? { ...m, lessons: [...m.lessons, { title: "New lesson", kind: "lesson" as Lesson["kind"], purpose: "Custom lesson" }] } : m)) });
  }
  function addModule() {
    if (!outline) return;
    setOutline({ ...outline, modules: [...outline.modules, { title: "New module", description: "", lessons: [{ title: "New lesson", kind: "lesson", purpose: "Custom lesson" }] }] });
  }
}

function ModeCard({ icon, title, desc, onClick, hot }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; hot?: boolean }) {
  return (
    <button onClick={onClick}
      className={`relative text-left bg-surface border rounded-xl p-5 transition-all hover:shadow-card hover:-translate-y-0.5 group ${hot ? "border-pine" : "border-line hover:border-pine/60"}`}>
      {hot && <span className="absolute top-3.5 right-3.5 text-[10px] font-bold uppercase tracking-wider text-white bg-pine rounded-full px-2 py-0.5">Fastest</span>}
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${hot ? "bg-amber-3 text-amber-2" : "bg-pine-3 text-pine-2 group-hover:bg-pine group-hover:text-white"}`}>{icon}</span>
      <p className="font-display font-bold text-[15px]">{title}</p>
      <p className="text-[12.5px] text-mute mt-1 leading-relaxed">{desc}</p>
    </button>
  );
}

function subFor(step: string) {
  switch (step) {
    case "Brief": return "Tell the engine who this is for — it designs objectives, structure and assessment from this.";
    case "Sources": return "The more real material you give it, the more grounded the course.";
    case "Outline": return "Review the proposed structure. Rename, reorder, add or remove anything.";
    case "Style": return "The theme applies to the whole learner experience — blocks, buttons and player.";
    default: return "";
  }
}

function Shell({ children, title, sub, onBack, steps, stepIdx, locked }: { children: React.ReactNode; title: string; sub: string; onBack: () => void; steps?: string[]; stepIdx?: number; locked?: boolean }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-line sticky top-0 z-30">
        <div className="max-w-[1060px] mx-auto px-5 h-[56px] flex items-center gap-4">
          {!locked && <Btn variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={15} /> Back</Btn>}
          <div>
            <h1 className="font-display font-bold text-[15.5px] leading-tight">{title}</h1>
          </div>
          {steps && stepIdx != null && (
            <div className="ml-auto flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIdx ? "w-6 bg-pine" : i < stepIdx ? "w-3 bg-pine-4" : "w-3 bg-line-2"}`} />
                </div>
              ))}
              <span className="text-[11.5px] text-faint ml-2 font-mono">{stepIdx + 1}/{steps.length}</span>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-[1060px] mx-auto px-5 py-8">
        <p className="text-[13.5px] text-mute mb-6 max-w-[620px]">{sub}</p>
        {children}
      </main>
    </div>
  );
}
