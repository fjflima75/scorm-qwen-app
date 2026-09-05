import { Plus, Sparkles, Trash2 } from "lucide-react";
import { LANGUAGES, LocalProvider } from "../lib/ai";
import { useStore } from "../lib/store";
import { Block, Course, Lesson, Question, findLesson, uid } from "../lib/types";
import { Btn, Field, IconBtn, Seg, Select, TextArea, TextInput, Toggle } from "./ui";

export function PropsPanel({ course, lesson }: { course: Course; lesson: Lesson | null }) {
  const blockId = useStore((s) => s.editor.blockId);
  const update = useStore((s) => s.updateCourse);
  const block = lesson?.blocks.find((b) => b.id === blockId) || null;

  const set = (fn: (c: Course) => void) => update(course.id, fn);
  const setBlock = (fn: (b: Block) => void) => set((c) => {
    const f = lesson && findLesson(c, lesson.id);
    const b = f?.lesson.blocks.find((x) => x.id === blockId);
    if (b) fn(b);
  });

  if (!block) return <CourseSettings course={course} set={set} />;
  return <BlockEditor block={block} setBlock={setBlock} course={course} />;
}

/* ================= course settings ================= */
function CourseSettings({ course, set }: { course: Course; set: (fn: (c: Course) => void) => void }) {
  return (
    <div className="p-4 space-y-4 text-[13px]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">Course settings</p>
        <div className="space-y-3">
          <Field label="Title"><TextInput value={course.title} onChange={(e) => set((c) => { c.title = e.target.value; })} /></Field>
          <Field label="Description"><TextArea rows={3} value={course.description} onChange={(e) => set((c) => { c.description = e.target.value; })} /></Field>
          <Field label="Learning objectives" hint="One per line">
            <TextArea rows={3} value={course.objectives.join("\n")} onChange={(e) => set((c) => { c.objectives = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); })} />
          </Field>
        </div>
      </div>
      <div className="border-t border-line pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">Completion & scoring</p>
        <div className="space-y-3">
          <Field label="Learners complete the course when…">
            <Select value={course.settings.completionRule} onChange={(e) => set((c) => { c.settings.completionRule = e.target.value as Course["settings"]["completionRule"]; })}>
              <option value="all-lessons">They complete all lessons</option>
              <option value="assessment">They pass the final assessment</option>
              <option value="percent">They complete a percentage of lessons</option>
            </Select>
          </Field>
          {course.settings.completionRule === "assessment" && (
            <Field label={`Pass mark · ${course.settings.passMark}%`}>
              <input type="range" min={50} max={100} step={5} value={course.settings.passMark} onChange={(e) => set((c) => { c.settings.passMark = +e.target.value; })} className="w-full" aria-label="Pass mark" />
            </Field>
          )}
          {course.settings.completionRule === "percent" && (
            <Field label={`Required progress · ${course.settings.percentRequired}%`}>
              <input type="range" min={50} max={100} step={5} value={course.settings.percentRequired} onChange={(e) => set((c) => { c.settings.percentRequired = +e.target.value; })} className="w-full" aria-label="Required progress" />
            </Field>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-2">Navigation</span>
            <Seg size="sm" value={course.settings.navigation} onChange={(v) => set((c) => { c.settings.navigation = v; })} options={[{ value: "free", label: "Free" }, { value: "sequential", label: "Sequential" }]} />
          </div>
          <Field label="Language">
            <Select value={course.settings.language} onChange={(e) => set((c) => { c.settings.language = e.target.value; })}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </Select>
          </Field>
        </div>
      </div>
      <div className="border-t border-line pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">Theme</p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="color" value={course.theme.primary} onChange={(e) => set((c) => { c.theme.primary = e.target.value; })} className="w-10 h-9 rounded-lg border border-line-2 cursor-pointer bg-surface p-1" aria-label="Primary color" />
            <div className="grow">
              <p className="font-semibold text-ink-2">Brand color</p>
              <p className="text-[11px] text-faint font-mono">{course.theme.primary}</p>
            </div>
            <input type="color" value={course.theme.accent} onChange={(e) => set((c) => { c.theme.accent = e.target.value; })} className="w-10 h-9 rounded-lg border border-line-2 cursor-pointer bg-surface p-1" aria-label="Accent color" />
          </div>
          <Field label={`Corner radius · ${course.theme.radius}px`}>
            <input type="range" min={0} max={20} value={course.theme.radius} onChange={(e) => set((c) => { c.theme.radius = +e.target.value; })} className="w-full" aria-label="Corner radius" />
          </Field>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-2">Show progress bar</span>
            <Toggle on={course.settings.showProgress} onChange={(v) => set((c) => { c.settings.showProgress = v; })} label="Show progress bar" />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-2">Enable captions</span>
            <Toggle on={course.settings.captions} onChange={(v) => set((c) => { c.settings.captions = v; })} label="Enable captions" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-faint leading-relaxed border-t border-line pt-3">Select a block in the canvas to edit its content, behaviour and accessibility metadata.</p>
    </div>
  );
}

/* ================= block editors ================= */
function BlockEditor({ block, setBlock, course }: { block: Block; setBlock: (fn: (b: Block) => void) => void; course: Course }) {
  const update = useStore((s) => s.updateCourse);
  const toast = useStore((s) => s.toast);

  const H = ({ title }: { title: string }) => <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">{title}</p>;

  const listEditor = (items: { title: string; body: string }[], setItems: (v: { title: string; body: string }[]) => void, labels = ["Title", "Body"]) => (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="border border-line rounded-lg p-2.5 space-y-2 bg-canvas/50">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-faint font-mono w-5">{i + 1}</span>
            <TextInput value={it.title} placeholder={labels[0]} onChange={(e) => setItems(items.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)))} className="text-[12.5px] py-1.5" />
            <IconBtn label="Remove" onClick={() => setItems(items.filter((_, xi) => xi !== i))}><Trash2 size={13} /></IconBtn>
          </div>
          <TextArea rows={2} value={it.body} placeholder={labels[1]} onChange={(e) => setItems(items.map((x, xi) => (xi === i ? { ...x, body: e.target.value } : x)))} className="text-[12.5px]" />
        </div>
      ))}
      <Btn variant="outline" size="sm" onClick={() => setItems([...items, { title: "New item", body: "" }])}><Plus size={13} /> Add item</Btn>
    </div>
  );

  switch (block.kind) {
    case "heading":
      return <Panel title="Heading"><Field label="Text"><TextInput value={block.text} onChange={(e) => setBlock((b) => { if (b.kind === "heading") b.text = e.target.value; })} /></Field>
        <div className="mt-3"><span className="text-[12px] font-semibold text-ink-2 block mb-1.5">Level</span>
          <Seg size="sm" value={String(block.level) as "2" | "3"} onChange={(v) => setBlock((b) => { if (b.kind === "heading") b.level = +v as 2 | 3; })} options={[{ value: "2", label: "H2" }, { value: "3", label: "H3" }]} /></div></Panel>;
    case "text":
      return <Panel title="Text"><Field label="Content" hint="Blank line between paragraphs. **bold** is supported.">
        <TextArea rows={9} value={block.paragraphs.join("\n\n")} onChange={(e) => setBlock((b) => { if (b.kind === "text") b.paragraphs = e.target.value.split(/\n{2,}/); })} /></Field></Panel>;
    case "quote":
      return <Panel title="Quote">
        <Field label="Quote"><TextArea rows={3} value={block.text} onChange={(e) => setBlock((b) => { if (b.kind === "quote") b.text = e.target.value; })} /></Field>
        <div className="mt-3"><Field label="Attribution"><TextInput value={block.attribution} onChange={(e) => setBlock((b) => { if (b.kind === "quote") b.attribution = e.target.value; })} /></Field></div></Panel>;
    case "callout":
      return <Panel title="Callout">
        <Seg size="sm" value={block.tone} onChange={(v) => setBlock((b) => { if (b.kind === "callout") b.tone = v; })} options={[{ value: "info", label: "Info" }, { value: "tip", label: "Tip" }, { value: "warning", label: "Warning" }]} />
        <div className="mt-3 space-y-3">
          <Field label="Title"><TextInput value={block.title} onChange={(e) => setBlock((b) => { if (b.kind === "callout") b.title = e.target.value; })} /></Field>
          <Field label="Body"><TextArea rows={3} value={block.body} onChange={(e) => setBlock((b) => { if (b.kind === "callout") b.body = e.target.value; })} /></Field>
        </div></Panel>;
    case "divider":
      return <Panel title="Divider"><p className="text-[12.5px] text-mute">A horizontal separator. Nothing to configure.</p></Panel>;
    case "image":
      return <Panel title="Image">
        <ImageEditor src={block.src} onChange={(src) => setBlock((b) => { if (b.kind === "image") b.src = src; })} />
        <div className="mt-3 space-y-3">
          <Field label="Alt text (accessibility)" hint="Describe what the image shows for screen readers.">
            <TextInput value={block.alt} onChange={(e) => setBlock((b) => { if (b.kind === "image") b.alt = e.target.value; })} /></Field>
          <Field label="Caption"><TextInput value={block.caption} onChange={(e) => setBlock((b) => { if (b.kind === "image") b.caption = e.target.value; })} /></Field>
        </div></Panel>;
    case "video":
      return <Panel title="Video">
        <Field label="Embed URL" hint="YouTube or Vimeo embed link."><TextInput value={block.url} onChange={(e) => setBlock((b) => { if (b.kind === "video") b.url = e.target.value; })} placeholder="https://www.youtube.com/embed/…" /></Field>
        <div className="mt-3"><Field label="Caption"><TextInput value={block.caption} onChange={(e) => setBlock((b) => { if (b.kind === "video") b.caption = e.target.value; })} /></Field></div>
        <div className="mt-3"><Field label="Transcript (accessibility)"><TextArea rows={3} value={block.transcript} onChange={(e) => setBlock((b) => { if (b.kind === "video") b.transcript = e.target.value; })} /></Field></div></Panel>;
    case "keyPoints":
      return <Panel title="Key points"><Field label="Heading"><TextInput value={block.title} onChange={(e) => setBlock((b) => { if (b.kind === "keyPoints") b.title = e.target.value; })} /></Field>
        <div className="mt-3">{listEditor(block.points, (v) => setBlock((b) => { if (b.kind === "keyPoints") b.points = v; }))}</div></Panel>;
    case "accordion":
      return <Panel title="Accordion">{listEditor(block.items, (v) => setBlock((b) => { if (b.kind === "accordion") b.items = v; }))}</Panel>;
    case "tabs":
      return <Panel title="Tabs">{listEditor(block.tabs.map((t) => ({ title: t.label, body: t.body })), (v) => setBlock((b) => { if (b.kind === "tabs") b.tabs = v.map((x) => ({ label: x.title, body: x.body })); }), ["Tab label", "Content"])}</Panel>;
    case "timeline":
      return <Panel title="Timeline"><Field label="Heading"><TextInput value={block.title} onChange={(e) => setBlock((b) => { if (b.kind === "timeline") b.title = e.target.value; })} /></Field>
        <div className="mt-3">{listEditor(block.items, (v) => setBlock((b) => { if (b.kind === "timeline") b.items = v; }), ["Step title", "Description"])}</div></Panel>;
    case "flipcards":
      return <Panel title="Flip cards"><Field label="Prompt"><TextInput value={block.prompt} onChange={(e) => setBlock((b) => { if (b.kind === "flipcards") b.prompt = e.target.value; })} /></Field>
        <div className="mt-3 space-y-3">
          {block.cards.map((cd, i) => (
            <div key={i} className="border border-line rounded-lg p-2.5 space-y-2 bg-canvas/50">
              <div className="flex items-center gap-1.5"><span className="text-[10.5px] font-bold text-faint font-mono w-5">{i + 1}</span>
                <TextInput value={cd.front} placeholder="Front (question)" onChange={(e) => setBlock((b) => { if (b.kind === "flipcards") b.cards = b.cards.map((x, xi) => (xi === i ? { ...x, front: e.target.value } : x)); })} className="text-[12.5px] py-1.5" />
                <IconBtn label="Remove card" onClick={() => setBlock((b) => { if (b.kind === "flipcards") b.cards = b.cards.filter((_, xi) => xi !== i); })}><Trash2 size={13} /></IconBtn></div>
              <TextArea rows={2} value={cd.back} placeholder="Back (answer)" onChange={(e) => setBlock((b) => { if (b.kind === "flipcards") b.cards = b.cards.map((x, xi) => (xi === i ? { ...x, back: e.target.value } : x)); })} className="text-[12.5px]" />
            </div>
          ))}
          <Btn variant="outline" size="sm" onClick={() => setBlock((b) => { if (b.kind === "flipcards") b.cards = [...b.cards, { front: "Question", back: "Answer" }]; })}><Plus size={13} /> Add card</Btn>
        </div></Panel>;
    case "reveal":
      return <Panel title="Click to reveal">
        <Field label="Button prompt"><TextInput value={block.prompt} onChange={(e) => setBlock((b) => { if (b.kind === "reveal") b.prompt = e.target.value; })} /></Field>
        <div className="mt-3"><Field label="Hidden content"><TextArea rows={4} value={block.body} onChange={(e) => setBlock((b) => { if (b.kind === "reveal") b.body = e.target.value; })} /></Field></div></Panel>;
    case "checklist":
      return <Panel title="Checklist"><Field label="Heading"><TextInput value={block.title} onChange={(e) => setBlock((b) => { if (b.kind === "checklist") b.title = e.target.value; })} /></Field>
        <div className="mt-3"><Field label="Items" hint="One per line"><TextArea rows={6} value={block.items.join("\n")} onChange={(e) => setBlock((b) => { if (b.kind === "checklist") b.items = e.target.value.split("\n"); })} /></Field></div></Panel>;
    case "scenario":
      return <Panel title="Scenario">
        <div className="space-y-3">
          <Field label="Title"><TextInput value={block.title} onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.title = e.target.value; })} /></Field>
          <Field label="Intro"><TextArea rows={2} value={block.intro} onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.intro = e.target.value; })} /></Field>
          {block.steps.map((st, si) => (
            <div key={si} className="border border-line rounded-lg p-3 space-y-2.5 bg-canvas/50">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-pine-2">Step {si + 1}</p>
                <IconBtn label="Remove step" onClick={() => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.filter((_, xi) => xi !== si); })}><Trash2 size={13} /></IconBtn>
              </div>
              <Field label="Character"><TextInput value={st.character} onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => (xi === si ? { ...x, character: e.target.value } : x)); })} /></Field>
              <Field label="Situation"><TextArea rows={2} value={st.situation} onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => (xi === si ? { ...x, situation: e.target.value } : x)); })} /></Field>
              {st.choices.map((ch, ci) => (
                <div key={ci} className="border border-line rounded-md p-2 space-y-1.5 bg-surface">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-mute cursor-pointer">
                      <input type="checkbox" checked={ch.good} onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => xi === si ? { ...x, choices: x.choices.map((y, yi) => (yi === ci ? { ...y, good: e.target.checked } : y)) } : x); })} />
                      Best choice
                    </label>
                    <IconBtn label="Remove choice" className="ml-auto w-6 h-6" onClick={() => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => xi === si ? { ...x, choices: x.choices.filter((_, yi) => yi !== ci) } : x); })}><Trash2 size={12} /></IconBtn>
                  </div>
                  <TextInput value={ch.text} placeholder="Choice the learner can make" onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => xi === si ? { ...x, choices: x.choices.map((y, yi) => (yi === ci ? { ...y, text: e.target.value } : y)) } : x); })} className="text-[12px] py-1.5" />
                  <TextInput value={ch.feedback} placeholder="Consequence / feedback" onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => xi === si ? { ...x, choices: x.choices.map((y, yi) => (yi === ci ? { ...y, feedback: e.target.value } : y)) } : x); })} className="text-[12px] py-1.5" />
                </div>
              ))}
              <Btn variant="outline" size="sm" onClick={() => setBlock((b) => { if (b.kind === "scenario") b.steps = b.steps.map((x, xi) => (xi === si ? { ...x, choices: [...x.choices, { text: "New choice", feedback: "", good: false }] } : x)); })}><Plus size={12} /> Add choice</Btn>
            </div>
          ))}
          <Btn variant="outline" size="sm" onClick={() => setBlock((b) => { if (b.kind === "scenario") b.steps = [...b.steps, { situation: "Describe the situation…", character: "Character", choices: [{ text: "Choice A", feedback: "", good: true }, { text: "Choice B", feedback: "", good: false }] }]; })}><Plus size={13} /> Add step</Btn>
          <Field label="Debrief summary"><TextArea rows={2} value={block.summary} onChange={(e) => setBlock((b) => { if (b.kind === "scenario") b.summary = e.target.value; })} /></Field>
        </div></Panel>;
    case "question":
      return <Panel title="Question"><QuestionEditor q={block.q} onChange={(q) => setBlock((b) => { if (b.kind === "question") b.q = q; })} course={course} /></Panel>;
    case "quiz":
      return <Panel title={block.mode === "graded" ? "Assessment" : "Knowledge check"}>
        <div className="space-y-3">
          <Field label="Title"><TextInput value={block.title} onChange={(e) => setBlock((b) => { if (b.kind === "quiz") b.title = e.target.value; })} /></Field>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ink-2">Counts toward score</span>
            <Toggle on={block.mode === "graded"} onChange={(v) => setBlock((b) => { if (b.kind === "quiz") { b.mode = v ? "graded" : "practice"; } })} label="Graded" />
          </div>
          {block.mode === "graded" && (
            <Field label={`Pass mark · ${block.passMark}%`}>
              <input type="range" min={50} max={100} step={5} value={block.passMark} onChange={(e) => setBlock((b) => { if (b.kind === "quiz") b.passMark = +e.target.value; })} className="w-full" aria-label="Quiz pass mark" />
            </Field>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ink-2">Shuffle questions</span>
            <Toggle on={block.shuffle} onChange={(v) => setBlock((b) => { if (b.kind === "quiz") b.shuffle = v; })} label="Shuffle questions" />
          </div>
          <div className="border-t border-line pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-2.5">Questions ({block.questions.length})</p>
            <div className="space-y-2">
              {block.questions.map((qq, qi) => (
                <details key={qq.id} className="border border-line rounded-lg bg-canvas/50 overflow-hidden">
                  <summary className="px-3 py-2 cursor-pointer text-[12.5px] font-semibold list-none flex items-center gap-2">
                    <span className="text-faint font-mono text-[10.5px]">Q{qi + 1}</span>
                    <span className="truncate grow">{qq.prompt}</span>
                    <span className="text-[10px] uppercase font-bold text-pine-2 bg-pine-3 rounded px-1.5 py-0.5">{qq.type}</span>
                  </summary>
                  <div className="p-3 border-t border-line">
                    <QuestionEditor q={qq} course={course} onChange={(nq) => setBlock((b) => { if (b.kind === "quiz") b.questions = b.questions.map((x) => (x.id === qq.id ? nq : x)); })} />
                    <Btn variant="ghost" size="sm" className="mt-2 text-bad hover:bg-bad-3" onClick={() => setBlock((b) => { if (b.kind === "quiz") b.questions = b.questions.filter((x) => x.id !== qq.id); })}><Trash2 size={12} /> Remove question</Btn>
                  </div>
                </details>
              ))}
            </div>
            <Btn variant="outline" size="sm" className="mt-2.5" onClick={() => setBlock((b) => { if (b.kind === "quiz") b.questions = [...b.questions, newQuestion("mcq")]; })}><Plus size={13} /> Add question</Btn>
          </div>
        </div></Panel>;
    default:
      return null;
  }
}

export function newQuestion(type: Question["type"]): Question {
  const base = { id: uid(), type, prompt: "New question", explanation: "Explain why this is the right answer.", difficulty: "medium" as const, objective: "" };
  if (type === "fill") return { ...base, options: [], answer: "answer" };
  if (type === "tf") return { ...base, options: ["True", "False"], correct: [0] };
  if (type === "order") return { ...base, options: ["First", "Second", "Third"], correct: [0, 1, 2] };
  return { ...base, options: ["Correct answer", "Distractor 1", "Distractor 2"], correct: [0] };
}

function QuestionEditor({ q, onChange, course }: { q: Question; onChange: (q: Question) => void; course: Course }) {
  const toast = useStore((s) => s.toast);
  const adjustCredits = useStore((s) => s.adjustCredits);
  const user = useStore((s) => s.user);

  const aiAct = (what: "regen" | "distractors" | "explain" | "harder" | "easier") => {
    const u = user();
    if ((u?.credits ?? 0) < 1) { toast("err", "You're out of AI credits."); return; }
    adjustCredits(-1);
    if (what === "regen") {
      const fresh = LocalProvider.generateQuiz(course, null, { count: 1, difficulty: q.difficulty, types: [q.type], passMark: 80, mode: "practice" })[0];
      onChange({ ...fresh, id: q.id, type: q.type });
      toast("ai", "Question regenerated from course content.");
    } else if (what === "distractors") {
      const opts = q.options?.slice() || [];
      const better = opts.map((o, i) => (q.correct || []).includes(i) ? o : o.replace(/\b(very|really|always|never|all|none)\b/gi, "").trim() || `A plausible misunderstanding about ${course.topic || "the topic"}`);
      onChange({ ...q, options: better });
      toast("ai", "Distractors tightened — no giveaway wording left.");
    } else if (what === "explain") {
      onChange({ ...q, explanation: LocalProvider.rewrite(q.explanation || q.prompt, "longer") });
      toast("ai", "Explanation expanded.");
    } else if (what === "harder") {
      onChange({ ...q, difficulty: q.difficulty === "easy" ? "medium" : "hard", prompt: q.prompt + " (Justify your choice.)" });
      toast("ai", "Made harder — now requires justification.");
    } else {
      onChange({ ...q, difficulty: q.difficulty === "hard" ? "medium" : "easy", prompt: q.prompt.replace(" (Justify your choice.)", "") });
      toast("ai", "Made easier.");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Select value={q.type} onChange={(e) => onChange({ ...newQuestion(e.target.value as Question["type"]), id: q.id, prompt: q.prompt })} className="w-[150px] py-1.5 text-[12.5px]">
          <option value="mcq">Multiple choice</option><option value="multi">Multiple select</option>
          <option value="tf">True / false</option><option value="fill">Fill in the blank</option><option value="order">Ordering</option>
        </Select>
        <Select value={q.difficulty} onChange={(e) => onChange({ ...q, difficulty: e.target.value as Question["difficulty"] })} className="py-1.5 text-[12.5px]">
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </Select>
      </div>
      <Field label="Prompt"><TextArea rows={2} value={q.prompt} onChange={(e) => onChange({ ...q, prompt: e.target.value })} /></Field>
      {q.type === "fill" ? (
        <Field label="Accepted answer"><TextInput value={q.answer || ""} onChange={(e) => onChange({ ...q, answer: e.target.value })} /></Field>
      ) : (
        <div>
          <p className="text-[11px] font-semibold text-ink-2 mb-1.5">Options — tick the correct {q.type === "multi" ? "ones" : "one"}</p>
          <div className="space-y-1.5">
            {(q.options || []).map((opt, i) => {
              const on = (q.correct || []).includes(i);
              return (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => {
                    const cur = q.correct || [];
                    const next = q.type === "multi" ? (on ? cur.filter((x) => x !== i) : [...cur, i]) : [i];
                    onChange({ ...q, correct: next });
                  }} aria-label={`Mark option ${i + 1} correct`}
                    className={`w-[18px] h-[18px] rounded-${q.type === "multi" ? "md" : "full"} border-2 flex-none flex items-center justify-center transition-all ${on ? "bg-ok border-ok text-white" : "border-line-2 hover:border-ok"}`}>
                    {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5" /></svg>}
                  </button>
                  <TextInput value={opt} onChange={(e) => onChange({ ...q, options: (q.options || []).map((x, xi) => (xi === i ? e.target.value : x)) })} className="py-1.5 text-[12.5px]" />
                  <IconBtn label="Remove option" onClick={() => onChange({ ...q, options: (q.options || []).filter((_, xi) => xi !== i), correct: (q.correct || []).filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) })}><Trash2 size={13} /></IconBtn>
                </div>
              );
            })}
          </div>
          {q.type !== "tf" && q.type !== "order" && (
            <Btn variant="ghost" size="sm" className="mt-1.5" onClick={() => onChange({ ...q, options: [...(q.options || []), "New option"] })}><Plus size={12} /> Option</Btn>
          )}
        </div>
      )}
      <Field label="Explanation" hint="Shown after the learner answers — the teaching moment.">
        <TextArea rows={2} value={q.explanation} onChange={(e) => onChange({ ...q, explanation: e.target.value })} /></Field>
      <Field label="Linked objective"><TextInput value={q.objective || ""} onChange={(e) => onChange({ ...q, objective: e.target.value })} placeholder="e.g. Apply the SBI model" /></Field>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <AIBtn onClick={() => aiAct("regen")}>Regenerate</AIBtn>
        <AIBtn onClick={() => aiAct("distractors")}>Improve distractors</AIBtn>
        <AIBtn onClick={() => aiAct("explain")}>Explain answer</AIBtn>
        <AIBtn onClick={() => aiAct("harder")}>Make harder</AIBtn>
        <AIBtn onClick={() => aiAct("easier")}>Make easier</AIBtn>
      </div>
    </div>
  );
}

function AIBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-2 bg-amber-3 hover:brightness-95 border border-amber/25 rounded-md px-2 py-1 transition-all active:scale-95"><Sparkles size={11} /> {children}</button>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 anim-fade">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint mb-3">{title}</p>
      {children}
    </div>
  );
}

function ImageEditor({ src, onChange }: { src: string; onChange: (src: string) => void }) {
  const toast = useStore((s) => s.toast);
  return (
    <div>
      {src ? <img src={src} alt="" className="w-full rounded-lg border border-line max-h-[160px] object-cover" />
        : <div className="w-full h-[90px] rounded-lg border border-dashed border-line-2 flex items-center justify-center text-faint text-[12px]">No image yet</div>}
      <div className="flex gap-2 mt-2">
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-line-2 bg-surface text-ink hover:border-pine hover:text-pine cursor-pointer transition-colors">
          Upload image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            if (f.size > 2.5 * 1024 * 1024) { toast("err", "Image too large — keep uploads under 2.5 MB."); return; }
            const r = new FileReader();
            r.onload = () => onChange(String(r.result));
            r.readAsDataURL(f);
          }} />
        </label>
        {src && <Btn variant="ghost" size="sm" onClick={() => onChange("")}>Remove</Btn>}
      </div>
    </div>
  );
}
