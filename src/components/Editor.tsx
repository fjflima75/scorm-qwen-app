import { ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, ClipboardCheck, Copy, Eye, GripVertical, History, LayoutPanelLeft, MessageSquare, Monitor, PanelRight, Pencil, Play, Plus, Send, Smartphone, Sparkles, Tablet, Trash2, Undo2, Redo2, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LocalProvider, RewriteIntent } from "../lib/ai";
import { go, useStore } from "../lib/store";
import { Block, BlockKind, BlockNoId, Course, Lesson, Module, findLesson, uid } from "../lib/types";
import { BLOCK_META, BlockView, ThemeContext } from "./blocks";
import { Btn, Chip, IconBtn, Menu, Seg, Spinner, TextInput } from "./ui";
import { CommandPalette, ExportModal, QuizGenModal, RewriteModal, ShareModal, VersionsModal } from "./Modals";
import { PropsPanel, newQuestion } from "./PropsPanel";

export function Editor({ courseId }: { courseId: string }) {
  const course = useStore((s) => s.courses[courseId]);
  const editor = useStore((s) => s.editor);
  const saveState = useStore((s) => s.saveState);
  const { selectLesson, selectBlock, toggleCollapse, updateCourse, undo, redo, openEditor, publishCourse, toast, user, adjustCredits } = useStore();

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [rewrite, setRewrite] = useState<{ original: string; proposed: string; intent: string; apply: () => void } | null>(null);
  const [drag, setDrag] = useState<{ blockId: string; from: string } | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropLesson, setDropLesson] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (course && (!editor.courseId || editor.courseId !== courseId)) openEditor(courseId);
  }, [courseId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y")) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [undo, redo]);

  const lesson = useMemo(() => {
    if (!course) return null;
    const f = editor.lessonId ? findLesson(course, editor.lessonId) : null;
    return f?.lesson || course.modules[0]?.lessons[0] || null;
  }, [course, editor.lessonId]);

  if (!course) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-[15px] font-semibold text-ink">Course not found</p>
        <p className="text-[13px] text-mute">It may have been deleted from this workspace.</p>
        <Btn onClick={() => go({ name: "dashboard" })}>Back to dashboard</Btn>
      </div>
    );
  }
  if (!lesson) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-[15px] font-semibold">This course has no lessons yet</p>
        <Btn onClick={() => addModule()}><Plus size={14} /> Add a module</Btn>
      </div>
    );
  }

  const set = (fn: (c: Course) => void) => updateCourse(course.id, fn);
  const openComments = course.comments.filter((c) => !c.resolved).length;
  const credits = user()?.credits ?? 0;

  /* ---------- block operations ---------- */
  function addBlock(kind: BlockKind, at?: number) {
    const b = makeDefaultBlock(kind);
    set((c) => {
      const f = findLesson(c, lesson!.id);
      if (!f) return;
      if (at == null) f.lesson.blocks.push(b); else f.lesson.blocks.splice(at, 0, b);
    });
    selectBlock(b.id);
    if (kind === "quiz" || kind === "question") toast("ai", "Assessment block added — configure questions in the panel, or use Generate assessment.");
  }

  function deleteBlock(id: string) {
    set((c) => { const f = findLesson(c, lesson!.id); if (f) f.lesson.blocks = f.lesson.blocks.filter((b) => b.id !== id); });
    if (editor.blockId === id) selectBlock(null);
    toast("info", "Block deleted — press ⌘Z to undo.");
  }
  function duplicateBlock(id: string) {
    set((c) => {
      const f = findLesson(c, lesson!.id); if (!f) return;
      const i = f.lesson.blocks.findIndex((b) => b.id === id); if (i < 0) return;
      const clone = structuredClone(f.lesson.blocks[i]); clone.id = uid();
      f.lesson.blocks.splice(i + 1, 0, clone);
    });
  }
  function moveBlock(id: string, dir: -1 | 1) {
    set((c) => {
      const f = findLesson(c, lesson!.id); if (!f) return;
      const i = f.lesson.blocks.findIndex((b) => b.id === id);
      const j = i + dir; if (i < 0 || j < 0 || j >= f.lesson.blocks.length) return;
      const [b] = f.lesson.blocks.splice(i, 1);
      f.lesson.blocks.splice(j, 0, b);
    });
  }
  function moveBlockTo(id: string, targetLesson: string, at?: number) {
    set((c) => {
      const from = findLesson(c, lesson!.id); const to = findLesson(c, targetLesson);
      if (!from || !to) return;
      const i = from.lesson.blocks.findIndex((b) => b.id === id); if (i < 0) return;
      const [b] = from.lesson.blocks.splice(i, 1);
      if (at == null) to.lesson.blocks.push(b); else to.lesson.blocks.splice(at, 0, b);
    });
    if (targetLesson !== lesson!.id) { selectLesson(targetLesson); toast("ok", "Block moved to another lesson."); }
  }

  /* ---------- AI ---------- */
  function aiRewrite(kind: RewriteIntent, block: Block) {
    if (credits < 1) { toast("err", "You're out of AI credits — add demo credits from the account menu."); return; }
    const get = (): { original: string; apply: (v: string) => void } | null => {
      if (block.kind === "text") return { original: block.paragraphs.join("\n\n"), apply: (v) => setBlockText(block.id, v.split(/\n{2,}/)) };
      if (block.kind === "heading") return { original: block.text, apply: (v) => setBlockField(block.id, "text", v) };
      if (block.kind === "quote") return { original: block.text, apply: (v) => setBlockField(block.id, "text", v) };
      if (block.kind === "callout") return { original: block.body, apply: (v) => setBlockField(block.id, "body", v) };
      if (block.kind === "reveal") return { original: block.body, apply: (v) => setBlockField(block.id, "body", v) };
      return null;
    };
    const g = get();
    if (!g) { toast("info", "Rewrite works on text-based blocks."); return; }
    adjustCredits(-1);
    const proposed = LocalProvider.rewrite(g.original, kind);
    setRewrite({ original: g.original, proposed, intent: kind, apply: () => { g.apply(proposed); setRewrite(null); toast("ok", "Rewrite applied — ⌘Z to revert."); } });
  }
  function setBlockText(id: string, paragraphs: string[]) {
    set((c) => { const f = findLesson(c, lesson!.id); const b = f?.lesson.blocks.find((x) => x.id === id); if (b && b.kind === "text") b.paragraphs = paragraphs; });
  }
  function setBlockField(id: string, field: string, v: string) {
    set((c) => { const f = findLesson(c, lesson!.id); const b = f?.lesson.blocks.find((x) => x.id === id); if (b) (b as any)[field] = v; });
  }
  function aiSuggest() {
    if (credits < 1) { toast("err", "You're out of AI credits."); return; }
    adjustCredits(-1);
    const s = LocalProvider.suggestBlock(course, lesson!.id);
    addBlock(s.kind);
    toast("ai", `AI chose “${BLOCK_META[s.kind].label}” — ${s.reason}`);
  }
  function aiKnowledgeCheck() {
    if (credits < 5) { toast("err", "Generating a knowledge check costs 5 credits."); return; }
    adjustCredits(-5);
    const qs = LocalProvider.generateQuiz(course, lesson!.id, { count: 3, difficulty: "medium", types: ["mcq", "tf", "fill"], passMark: 0, mode: "practice" });
    set((c) => {
      const f = findLesson(c, lesson!.id); if (!f) return;
      f.lesson.blocks.push({ id: uid(), kind: "quiz", title: "Knowledge check", mode: "practice", passMark: 0, shuffle: false, showExplanations: true, questions: qs });
    });
    toast("ai", "Knowledge check added at the end of this lesson — grounded in its content.");
  }
  function improveLesson() {
    if (credits < 2) { toast("err", "Improving a lesson costs 2 credits."); return; }
    adjustCredits(-2);
    let changed = 0;
    set((c) => {
      const f = findLesson(c, lesson!.id); if (!f) return;
      for (const b of f.lesson.blocks) {
        if (b.kind === "text") {
          const before = b.paragraphs.join(" ");
          const after = LocalProvider.rewrite(before, before.split(/\s+/).length > 90 ? "shorter" : "simpler");
          if (after !== before) { b.paragraphs = after.split(/(?<=\.)\s+(?=[A-Z])/).reduce<string[]>((acc, s) => { if (acc.length && (acc[acc.length - 1].length + s.length) < 220) acc[acc.length - 1] += " " + s; else acc.push(s); return acc; }, []); changed++; }
        }
        if (b.kind === "image" && !b.alt.trim()) { b.alt = b.caption || "Course illustration"; changed++; }
      }
    });
    toast(changed ? "ok" : "info", changed ? `Improved ${changed} block${changed > 1 ? "s" : ""} in this lesson — ⌘Z to revert.` : "This lesson is already in good shape.");
  }

  /* ---------- structure ops ---------- */
  function addModule() {
    const m: Module = { id: uid(), title: `Module ${course!.modules.length + 1}`, description: "", lessons: [{ id: uid(), title: "Lesson 1", kind: "lesson", minutes: 1, blocks: [makeDefaultBlock("heading"), makeDefaultBlock("text")] }] };
    set((c) => { c.modules.push(m); });
    selectLesson(m.lessons[0].id);
  }
  function addLessonTo(moduleId: string, kind: Lesson["kind"] = "lesson") {
    const l: Lesson = { id: uid(), title: kind === "assessment" ? "Final assessment" : "New lesson", kind, minutes: 1, blocks: kind === "assessment" ? [{ id: uid(), kind: "quiz", title: "Final assessment", mode: "graded", passMark: course!.settings.passMark, shuffle: true, showExplanations: true, questions: [] }] : [makeDefaultBlock("heading"), makeDefaultBlock("text")] };
    set((c) => { const m = c.modules.find((x) => x.id === moduleId); if (m) m.lessons.push(l); });
    selectLesson(l.id);
  }
  function deleteLesson(id: string) {
    set((c) => { c.modules.forEach((m) => { m.lessons = m.lessons.filter((l) => l.id !== id); }); c.modules = c.modules.filter((m) => m.lessons.length > 0 || true); });
    if (editor.lessonId === id) { const first = course.modules.flatMap((m) => m.lessons).find((l) => l.id !== id); if (first) selectLesson(first.id); }
    toast("info", "Lesson deleted.");
  }
  function deleteModule(id: string) {
    set((c) => { c.modules = c.modules.filter((m) => m.id !== id); });
    const first = course.modules.find((m) => m.id !== id)?.lessons[0];
    if (first) selectLesson(first.id);
    toast("info", "Module deleted.");
  }
  function moveLesson(id: string, dir: -1 | 1) {
    set((c) => {
      for (const m of c.modules) {
        const i = m.lessons.findIndex((l) => l.id === id);
        if (i >= 0) { const j = i + dir; if (j < 0 || j >= m.lessons.length) return; const [l] = m.lessons.splice(i, 1); m.lessons.splice(j, 0, l); return; }
      }
    });
  }

  /* ---------- command palette ---------- */
  const paletteActions = useMemo(() => {
    const acts: { id: string; label: string; hint?: string; run: () => void }[] = [
      { id: "new", label: "Create a new course", hint: "⌘N", run: () => go({ name: "new" }) },
      { id: "dash", label: "Go to dashboard", run: () => go({ name: "dashboard" }) },
      { id: "prev", label: "Preview as learner", run: () => go({ name: "play", courseId: course.id }) },
      { id: "quiz", label: "Generate assessment", run: () => setQuizOpen(true) },
      { id: "lib", label: "Open block library", run: () => setLibraryOpen(true) },
      { id: "export", label: "Export package", run: () => setExportOpen(true) },
      { id: "improve", label: "Improve this lesson with AI", run: improveLesson },
      { id: "versions", label: "Version history", run: () => setVersionsOpen(true) },
      { id: "share", label: "Share for review", run: () => setShareOpen(true) },
      { id: "publish", label: "Publish course", run: () => publishCourse(course.id) },
    ];
    for (const m of course.modules) for (const l of m.lessons) {
      acts.push({ id: "l" + l.id, label: `Lesson · ${l.title}`, hint: m.title, run: () => selectLesson(l.id) });
      for (const b of l.blocks) {
        const label = blockSearchLabel(b);
        if (label) acts.push({ id: "b" + b.id, label: `Block · ${label}`, hint: l.title, run: () => { selectLesson(l.id); selectBlock(b.id); } });
      }
    }
    for (const cm of course.comments.filter((c) => !c.resolved)) {
      const loc = findLesson(course, cm.lessonId);
      acts.push({ id: "c" + cm.id, label: `Comment · ${cm.text.slice(0, 60)}`, hint: loc?.lesson.title, run: () => { selectLesson(cm.lessonId); selectBlock(cm.blockId); setShareOpen(true); } });
    }
    return acts;
  }, [course, editor.lessonId]);

  /* ---------- render ---------- */
  const widths = { desktop: "max-w-[880px]", tablet: "max-w-[760px]", mobile: "max-w-[400px]" };

  return (
    <ThemeContext.Provider value={course.theme}>
      <div className="h-screen flex flex-col bg-canvas">
        {/* top bar */}
        <header className="h-[54px] flex-none bg-surface border-b border-line flex items-center gap-2 px-3">
          <Btn variant="ghost" size="sm" onClick={() => go({ name: "dashboard" })}><ChevronRight size={15} className="rotate-180" /> Courses</Btn>
          <span className="w-px h-6 bg-line" />
          <input ref={titleRef} value={course.title} aria-label="Course title"
            onChange={(e) => set((c) => { c.title = e.target.value; })}
            className="font-display font-bold text-[15px] bg-transparent rounded-md px-2 py-1 hover:bg-canvas focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-pine/20 w-[260px] truncate" />
          {course.aiGenerated && <Chip tone="amber"><Sparkles size={10} /> AI draft — review before publishing</Chip>}
          <Chip tone={course.status === "published" ? "ok" : "neutral"}>{course.status === "published" ? "Published" : "Draft"}</Chip>
          <span className="flex items-center gap-1.5 text-[11.5px] text-faint ml-1" aria-live="polite">
            <span className={`w-1.5 h-1.5 rounded-full ${saveState === "saved" ? "bg-ok" : saveState === "saving" ? "bg-amber animate-[pulse-dot_1s_infinite]" : "bg-bad"}`} />
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save failed — retrying"}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <IconBtn label="Undo (⌘Z)" onClick={undo} disabled={!editor.past.length}><Undo2 size={15} /></IconBtn>
            <IconBtn label="Redo (⌘⇧Z)" onClick={redo} disabled={!editor.future.length}><Redo2 size={15} /></IconBtn>
            <span className="w-px h-6 bg-line mx-1" />
            <IconBtn label="Command palette (⌘K)" onClick={() => setPaletteOpen(true)}><SearchIcon /></IconBtn>
            <IconBtn label="Version history" onClick={() => setVersionsOpen(true)}><History size={15} /></IconBtn>
            <div onClick={() => setShareOpen(true)} className="relative cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setShareOpen(true)} aria-label="Share for review">
              <IconBtn label="Share for review"><MessageSquare size={15} /></IconBtn>
              {openComments > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber text-night text-[9.5px] font-bold flex items-center justify-center pointer-events-none">{openComments}</span>}
            </div>
            <Btn variant="outline" size="sm" onClick={() => go({ name: "play", courseId: course.id })}><Play size={13} /> Preview</Btn>
            <Btn variant="outline" size="sm" onClick={() => setExportOpen(true)}><Send size={13} /> Export</Btn>
            {course.status === "draft"
              ? <Btn size="sm" onClick={() => publishCourse(course.id)}><BookOpen size={13} /> Publish</Btn>
              : <Btn size="sm" variant="dark" onClick={() => setExportOpen(true)}><Send size={13} /> Export package</Btn>}
            <IconBtn label={panelOpen ? "Hide panel" : "Show panel"} onClick={() => setPanelOpen(!panelOpen)}><PanelRight size={15} /></IconBtn>
          </div>
        </header>

        <div className="grow flex min-h-0">
          {/* left: structure */}
          <aside className="w-[262px] flex-none bg-surface border-r border-line flex flex-col">
            <div className="px-3.5 py-3 border-b border-line flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">Structure</p>
              <div className="flex gap-1">
                <IconBtn label="Add module" onClick={addModule}><Plus size={14} /></IconBtn>
              </div>
            </div>
            <div className="grow overflow-y-auto p-2">
              {course.modules.map((m, mi) => {
                const collapsed = editor.collapsed[m.id];
                return (
                  <div key={m.id} className="mb-1.5">
                    <div className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 hover:bg-canvas transition-colors ${dropLesson === m.id && drag ? "bg-pine-3" : ""}`}
                      onDragOver={(e) => { if (drag) { e.preventDefault(); setDropLesson(m.id); } }}
                      onDragLeave={() => setDropLesson(null)}
                      onDrop={(e) => { e.preventDefault(); if (drag) { moveBlockTo(drag.blockId, m.lessons[0]?.id || ""); setDropLesson(null); setDrag(null); setOverIdx(null); } }}>
                      <button onClick={() => toggleCollapse(m.id)} className="text-faint hover:text-ink" aria-label={collapsed ? "Expand module" : "Collapse module"}>
                        {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {renaming === m.id ? (
                        <input autoFocus defaultValue={m.title} onBlur={(e) => { set((c) => { const mm = c.modules.find((x) => x.id === m.id); if (mm) mm.title = e.target.value || mm.title; }); setRenaming(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          className="grow text-[12.5px] font-bold bg-canvas border border-pine rounded px-1.5 py-0.5 focus:outline-none" />
                      ) : (
                        <button className="grow text-left text-[12.5px] font-bold text-ink truncate" onClick={() => toggleCollapse(m.id)}>{m.title}</button>
                      )}
                      <span className="text-[10px] text-faint font-mono">{m.lessons.length}</span>
                      <Menu button={<IconBtn label="Module actions" className="w-6 h-6 opacity-0 group-hover:opacity-100"><ChevronDown size={12} /></IconBtn>} items={[
                        { label: "Add lesson", icon: <Plus size={13} />, onClick: () => addLessonTo(m.id) },
                        { label: "Add knowledge check", icon: <ClipboardCheck size={13} />, onClick: () => addLessonTo(m.id, "check") },
                        { label: "Rename", icon: <Pencil size={13} />, onClick: () => setRenaming(m.id) },
                        { label: "Move up", icon: <ArrowUp size={13} />, onClick: () => set((c) => { const i = c.modules.findIndex((x) => x.id === m.id); if (i > 0) { const [x] = c.modules.splice(i, 1); c.modules.splice(i - 1, 0, x); } }) },
                        { label: "Move down", icon: <ArrowDown size={13} />, onClick: () => set((c) => { const i = c.modules.findIndex((x) => x.id === m.id); if (i < c.modules.length - 1 && i >= 0) { const [x] = c.modules.splice(i, 1); c.modules.splice(i + 1, 0, x); } }) },
                        { label: "Delete module", icon: <Trash2 size={13} />, onClick: () => deleteModule(m.id), danger: true, divider: true },
                      ]} />
                    </div>
                    {!collapsed && (
                      <div className="ml-4 border-l border-line pl-1.5 space-y-0.5 mt-0.5">
                        {m.lessons.map((l, li) => {
                          const active = lesson.id === l.id;
                          return (
                            <div key={l.id} draggable={!!drag ? false : true}
                              onDragStart={(e) => { e.dataTransfer.setData("text/lesson", l.id); e.dataTransfer.effectAllowed = "move"; }}
                              onDragOver={(e) => { if (drag) { e.preventDefault(); setDropLesson(l.id); } }}
                              onDragLeave={() => setDropLesson((d) => (d === l.id ? null : d))}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (drag) { moveBlockTo(drag.blockId, l.id); setDropLesson(null); setDrag(null); setOverIdx(null); } }}
                              className={`group flex items-center gap-1.5 rounded-lg pr-1 transition-colors ${active ? "bg-pine-3/70" : dropLesson === l.id && drag ? "bg-amber-3" : "hover:bg-canvas"}`}>
                              <button onClick={() => selectLesson(l.id)} className="grow flex items-center gap-2 py-1.5 pl-2 text-left min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-none ${l.kind === "assessment" ? "bg-amber" : l.kind === "check" ? "bg-pine-4" : "bg-line-2"}`} />
                                {renaming === l.id ? (
                                  <input autoFocus defaultValue={l.title} onClick={(e) => e.stopPropagation()}
                                    onBlur={(e) => { set((c) => { const f = findLesson(c, l.id); if (f) f.lesson.title = e.target.value || f.lesson.title; }); setRenaming(null); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                    className="grow text-[12.5px] bg-surface border border-pine rounded px-1.5 py-0.5 focus:outline-none" />
                                ) : (
                                  <span className={`text-[12.5px] truncate ${active ? "font-bold text-pine-2" : "text-ink-2 font-medium"}`}>{l.title}</span>
                                )}
                                <span className="text-[10px] text-faint font-mono flex-none">{l.minutes}m</span>
                              </button>
                              <Menu button={<IconBtn label="Lesson actions" className="w-6 h-6 opacity-0 group-hover:opacity-100"><ChevronDown size={12} /></IconBtn>} items={[
                                { label: "Rename", icon: <Pencil size={13} />, onClick: () => setRenaming(l.id) },
                                { label: "Duplicate", icon: <Copy size={13} />, onClick: () => { set((c) => { const f = findLesson(c, l.id); if (!f) return; const clone = structuredClone(f.lesson); clone.id = uid(); clone.title += " (copy)"; c.modules[f.mi].lessons.splice(f.li + 1, 0, clone); }); toast("ok", "Lesson duplicated."); } },
                                { label: "Move up", icon: <ArrowUp size={13} />, onClick: () => moveLesson(l.id, -1) },
                                { label: "Move down", icon: <ArrowDown size={13} />, onClick: () => moveLesson(l.id, 1) },
                                { label: "Delete lesson", icon: <Trash2 size={13} />, onClick: () => deleteLesson(l.id), danger: true, divider: true },
                              ]} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={addModule} className="w-full text-left px-2 py-2 rounded-lg text-[12.5px] font-semibold text-pine hover:bg-pine-3/50 transition-colors flex items-center gap-1.5"><Plus size={13} /> Add module</button>
            </div>
            <div className="border-t border-line px-3.5 py-2.5 text-[10.5px] text-faint leading-relaxed">
              Drag blocks between lessons · ⌘K for commands · ⌘Z to undo
            </div>
          </aside>

          {/* center: canvas */}
          <main className="grow flex flex-col min-w-0">
            <div className="h-[46px] flex-none bg-surface/70 border-b border-line flex items-center gap-2 px-4">
              <Seg size="sm" value={device} onChange={setDevice} options={[
                { value: "desktop", label: <Monitor size={13} />, title: "Desktop" },
                { value: "tablet", label: <Tablet size={13} />, title: "Tablet" },
                { value: "mobile", label: <Smartphone size={13} />, title: "Mobile" },
              ]} />
              <span className="text-[12.5px] font-semibold text-mute truncate">{lesson.title}</span>
              <Chip tone={lesson.kind === "assessment" ? "amber" : lesson.kind === "check" ? "pine" : "neutral"}>
                {lesson.kind === "lesson" ? "Lesson" : lesson.kind === "check" ? "Knowledge check" : "Assessment"}
              </Chip>
              <div className="ml-auto flex items-center gap-1.5">
                <Btn variant="amber" size="sm" onClick={improveLesson}><Wand2 size={13} /> Improve lesson</Btn>
                <Btn variant="outline" size="sm" onClick={() => setQuizOpen(true)}><ClipboardCheck size={13} /> Generate assessment</Btn>
                <Btn size="sm" onClick={() => setLibraryOpen(true)}><Plus size={13} /> Add block</Btn>
              </div>
            </div>
            <div className="grow overflow-y-auto dotgrid">
              <div className={`mx-auto px-5 py-7 ${widths[device]} transition-all duration-300`}>
                <div className="bg-surface rounded-2xl border border-line shadow-card px-6 sm:px-9 py-8 min-h-[420px]" onClick={() => selectBlock(null)}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">{course.title}</p>
                  <h1 className="font-display font-extrabold text-[24px] leading-tight mt-1 mb-6">{lesson.title}</h1>
                  <div className="space-y-4">
                    {lesson.blocks.length === 0 && (
                      <div className="border-2 border-dashed border-line-2 rounded-xl py-14 text-center anim-rise">
                        <p className="font-display font-bold text-[15px] text-ink-2">This lesson is empty</p>
                        <p className="text-[12.5px] text-mute mt-1 mb-4">Add a block, or let AI pick the right format for this content.</p>
                        <div className="flex justify-center gap-2">
                          <Btn size="sm" onClick={(e) => { e.stopPropagation(); setLibraryOpen(true); }}><Plus size={13} /> Add block</Btn>
                          <Btn size="sm" variant="amber" onClick={(e) => { e.stopPropagation(); aiSuggest(); }}><Sparkles size={13} /> Ask AI</Btn>
                        </div>
                      </div>
                    )}
                    {lesson.blocks.map((b, i) => {
                      const selected = editor.blockId === b.id;
                      const cmts = course.comments.filter((c) => c.blockId === b.id && !c.resolved);
                      return (
                        <div key={b.id}>
                          {drag && overIdx === i && <div className="drop-line my-2 anim-fade" />}
                          <div
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/block", b.id); e.dataTransfer.effectAllowed = "move"; setDrag({ blockId: b.id, from: lesson.id }); }}
                            onDragEnd={() => { setDrag(null); setOverIdx(null); setDropLesson(null); }}
                            onDragOver={(e) => { if (!drag) return; e.preventDefault(); e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setOverIdx(e.clientY < r.top + r.height / 2 ? i : i + 1); }}
                            onDrop={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              if (!drag) return;
                              let at = overIdx ?? i;
                              const fromIdx = lesson.blocks.findIndex((x) => x.id === drag.blockId);
                              if (drag.from === lesson.id && fromIdx < at) at -= 1;
                              if (drag.from === lesson.id) { set((c) => { const f = findLesson(c, lesson.id); if (!f) return; const fi = f.lesson.blocks.findIndex((x) => x.id === drag.blockId); if (fi < 0) return; const [blk] = f.lesson.blocks.splice(fi, 1); f.lesson.blocks.splice(Math.max(0, at), 0, blk); }); }
                              else moveBlockTo(drag.blockId, lesson.id, at);
                              setDrag(null); setOverIdx(null);
                            }}
                            onClick={(e) => { e.stopPropagation(); selectBlock(b.id); }}
                            className={`group relative rounded-xl transition-all anim-block ${drag?.blockId === b.id ? "dragging-block" : ""} ${selected ? "ring-2 ring-pine ring-offset-2 ring-offset-surface" : "hover:ring-1 hover:ring-line-2 hover:ring-offset-2 hover:ring-offset-surface"}`}>
                            {/* toolbar */}
                            <div className={`absolute -top-3.5 right-2 z-10 flex items-center gap-0.5 bg-night text-canvas rounded-lg shadow-pop px-1 py-0.5 transition-all ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                              <span className="text-[10px] font-bold uppercase tracking-wide text-canvas/60 px-1.5 flex items-center gap-1"><GripVertical size={11} className="cursor-grab" />{BLOCK_META[b.kind].label}</span>
                              {cmts.length > 0 && <span className="w-4.5 h-4.5 px-1 rounded bg-amber text-night text-[9.5px] font-bold flex items-center justify-center">{cmts.length}</span>}
                              <BlockAIMenu block={b} onRewrite={(k) => aiRewrite(k, b)} onSuggest={aiSuggest} onCheck={aiKnowledgeCheck} onAlt={() => { if (b.kind === "image") { setBlockField(b.id, "alt", b.caption || "Course illustration"); toast("ok", "Alt text added from caption."); } }} />
                              <IconBtn label="Move up" className="w-6 h-6 text-canvas/70 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); moveBlock(b.id, -1); }}><ArrowUp size={12} /></IconBtn>
                              <IconBtn label="Move down" className="w-6 h-6 text-canvas/70 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); moveBlock(b.id, 1); }}><ArrowDown size={12} /></IconBtn>
                              <IconBtn label="Duplicate block" className="w-6 h-6 text-canvas/70 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); duplicateBlock(b.id); }}><Copy size={12} /></IconBtn>
                              <IconBtn label="Delete block" className="w-6 h-6 text-canvas/70 hover:text-[#f0a09a] hover:bg-white/10" onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }}><Trash2 size={12} /></IconBtn>
                            </div>
                            <div className="px-1.5 py-1"><BlockView block={b} /></div>
                          </div>
                        </div>
                      );
                    })}
                    {drag && overIdx === lesson.blocks.length && <div className="drop-line my-2 anim-fade" />}
                  </div>
                  <div className="mt-8 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setLibraryOpen(true); }} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-pine border border-dashed border-pine-4 rounded-lg px-3.5 py-2 hover:bg-pine-3/50 transition-colors"><Plus size={13} /> Add block</button>
                    <button onClick={(e) => { e.stopPropagation(); aiSuggest(); }} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-2 border border-dashed border-amber/50 rounded-lg px-3.5 py-2 hover:bg-amber-3/60 transition-colors"><Sparkles size={13} /> Ask AI to choose</button>
                  </div>
                </div>
                <p className="text-center text-[10.5px] text-faint mt-4 mb-8">Canvas renders exactly what learners see · changes autosave</p>
              </div>
            </div>
          </main>

          {/* right: properties */}
          {panelOpen && (
            <aside className="w-[308px] flex-none bg-surface border-l border-line overflow-y-auto anim-slide-r">
              <PropsPanel course={course} lesson={lesson} />
            </aside>
          )}

          {/* library drawer */}
          {libraryOpen && <Library onClose={() => setLibraryOpen(false)} onAdd={(k, at) => { addBlock(k, at); setLibraryOpen(false); }} onAskAI={() => { aiSuggest(); setLibraryOpen(false); }} />}
        </div>

        {/* modals */}
        <QuizGenModal course={course} open={quizOpen} onClose={() => setQuizOpen(false)} onInsert={(qs, mode, passMark) => {
          set((c) => {
            const f = findLesson(c, lesson.id); if (!f) return;
            f.lesson.blocks.push({ id: uid(), kind: "quiz", title: mode === "graded" ? "Final assessment" : "Knowledge check", mode, passMark: mode === "graded" ? passMark : 0, shuffle: mode === "graded", showExplanations: true, questions: qs });
            if (mode === "graded") f.lesson.kind = "assessment";
          });
          toast("ok", mode === "graded" ? "Assessment inserted — it drives completion and scoring." : "Knowledge check inserted.");
        }} />
        <ExportModal course={course} open={exportOpen} onClose={() => setExportOpen(false)} />
        <VersionsModal course={course} open={versionsOpen} onClose={() => setVersionsOpen(false)} />
        <ShareModal course={course} open={shareOpen} onClose={() => setShareOpen(false)} />
        <RewriteModal open={!!rewrite} onClose={() => setRewrite(null)} original={rewrite?.original || ""} proposed={rewrite?.proposed || ""} intent={rewrite?.intent || ""} onApply={() => rewrite?.apply()} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      </div>
    </ThemeContext.Provider>
  );
}

function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}

function BlockAIMenu({ block, onRewrite, onSuggest, onCheck, onAlt }: { block: Block; onRewrite: (k: RewriteIntent) => void; onSuggest: () => void; onCheck: () => void; onAlt: () => void }) {
  const textish = ["text", "heading", "quote", "callout", "reveal"].includes(block.kind);
  return (
    <Menu button={<button className="w-6 h-6 inline-flex items-center justify-center rounded-md text-amber hover:bg-white/10 transition-colors" aria-label="AI actions"><Sparkles size={12} /></button>}
      items={[
        ...(textish ? ([
          { label: "Rewrite", icon: <Wand2 size={13} />, onClick: () => onRewrite("engaging") },
          { label: "Make shorter", icon: <Wand2 size={13} />, onClick: () => onRewrite("shorter") },
          { label: "More professional", icon: <Wand2 size={13} />, onClick: () => onRewrite("professional") },
          { label: "Easier to understand", icon: <Wand2 size={13} />, onClick: () => onRewrite("simpler") },
          { label: "Add an example", icon: <Wand2 size={13} />, onClick: () => onRewrite("example") },
        ] as const) : []),
        ...(block.kind === "image" ? [{ label: "Improve accessibility (alt)", icon: <Wand2 size={13} />, onClick: onAlt }] : []),
        { label: "Suggest interaction", icon: <Wand2 size={13} />, onClick: onSuggest, divider: textish || block.kind === "image" },
        { label: "Create knowledge check", icon: <ClipboardCheck size={13} />, onClick: onCheck },
      ]} />
  );
}

function Library({ onClose, onAdd, onAskAI }: { onClose: () => void; onAdd: (k: BlockKind, at?: number) => void; onAskAI: () => void }) {
  const [q, setQ] = useState("");
  const cats = ["Content", "Media", "Layout", "Interactive", "Assessment"] as const;
  const kinds = (Object.keys(BLOCK_META) as BlockKind[]).filter((k) => BLOCK_META[k].label.toLowerCase().includes(q.toLowerCase()) || BLOCK_META[k].desc.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-night/30 anim-fade" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-[340px] bg-surface border-l border-line shadow-pop flex flex-col anim-slide-r">
        <div className="p-4 border-b border-line">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-[16px]">Block library</h2>
            <IconBtn label="Close library" onClick={onClose}><X size={15} /></IconBtn>
          </div>
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks…" autoFocus />
          <button onClick={onAskAI} className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-3 border border-amber/30 text-amber-2 font-semibold text-[12.5px] py-2 hover:brightness-95 transition-all active:scale-[0.98]">
            <Sparkles size={13} /> Ask AI to choose a block
          </button>
        </div>
        <div className="grow overflow-y-auto p-3 space-y-4">
          {cats.map((cat) => {
            const items = kinds.filter((k) => BLOCK_META[k].cat === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint mb-2 px-1">{cat}</p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((k) => (
                    <button key={k} onClick={() => onAdd(k)}
                      className="text-left border border-line rounded-xl p-3 hover:border-pine hover:bg-pine-3/40 hover:-translate-y-0.5 transition-all group">
                      <span className="w-7 h-7 rounded-lg bg-canvas text-mute group-hover:bg-pine group-hover:text-white flex items-center justify-center transition-colors mb-2">{BLOCK_META[k].icon}</span>
                      <p className="text-[12.5px] font-bold leading-tight">{BLOCK_META[k].label}</p>
                      <p className="text-[10.5px] text-faint mt-0.5 leading-snug">{BLOCK_META[k].desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/* ---------- default block factory ---------- */
export function makeDefaultBlock(kind: BlockKind): Block {
  const id = uid();
  switch (kind) {
    case "heading": return { id, kind, text: "New section", level: 2 };
    case "text": return { id, kind, paragraphs: ["Write your explanation here. Keep paragraphs short — one idea each."] };
    case "quote": return { id, kind, text: "A memorable line worth repeating.", attribution: "Source" };
    case "callout": return { id, kind, tone: "tip", title: "Tip", body: "Highlight the one thing learners must remember." };
    case "divider": return { id, kind };
    case "image": return { id, kind, src: "", alt: "", caption: "" };
    case "video": return { id, kind, url: "", caption: "", transcript: "" };
    case "keyPoints": return { id, kind, title: "Key points", points: [{ title: "First idea", body: "Explain it in one or two sentences." }, { title: "Second idea", body: "Explain it in one or two sentences." }] };
    case "accordion": return { id, kind, items: [{ title: "Question learners ask", body: "The answer, in plain language." }] };
    case "tabs": return { id, kind, tabs: [{ label: "Tab one", body: "Content for the first tab." }, { label: "Tab two", body: "Content for the second tab." }] };
    case "flipcards": return { id, kind, prompt: "Flip each card to test your recall.", cards: [{ front: "Concept", back: "Definition" }, { front: "Term", back: "Meaning" }] };
    case "timeline": return { id, kind, title: "The process", items: [{ title: "Step 1", body: "What happens first." }, { title: "Step 2", body: "What happens next." }] };
    case "reveal": return { id, kind, prompt: "Reveal the answer", body: "The hidden content appears here." };
    case "checklist": return { id, kind, title: "Before you go", items: ["I can explain the core idea", "I know when to apply it"] };
    case "scenario": return { id, kind, title: "What would you do?", intro: "A realistic situation to practise in.", summary: "Debrief: connect the choices back to the lesson.", steps: [{ situation: "Set the scene for the learner.", character: "Character", choices: [{ text: "The strong choice", feedback: "Why this works.", good: true }, { text: "A tempting mistake", feedback: "Why this backfires.", good: false }] }] };
    case "question": return { id, kind, q: newQuestion("mcq") };
    case "quiz": return { id, kind, title: "Knowledge check", mode: "practice", passMark: 80, shuffle: false, showExplanations: true, questions: [newQuestion("mcq")] };
  }
}

function blockSearchLabel(b: Block): string | null {
  switch (b.kind) {
    case "heading": return b.text;
    case "text": return b.paragraphs[0]?.slice(0, 60) || "Text";
    case "quote": return b.text.slice(0, 60);
    case "callout": return b.title;
    case "quiz": return b.title;
    case "question": return b.q.prompt.slice(0, 60);
    case "scenario": return b.title;
    case "keyPoints": return b.title;
    case "timeline": return b.title;
    case "accordion": return "Accordion · " + (b.items[0]?.title || "");
    case "tabs": return "Tabs · " + (b.tabs[0]?.label || "");
    case "flipcards": return "Flip cards";
    case "image": return b.caption || b.alt || "Image";
    case "video": return b.caption || "Video";
    case "checklist": return b.title;
    case "reveal": return b.prompt;
    default: return null;
  }
}
