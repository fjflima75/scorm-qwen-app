import { BarChart3, BookOpen, ChevronRight, Clock, Copy, Eye, FileText, Languages, Layers, MoreHorizontal, Pencil, Play, Plus, Search, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { LANGUAGES } from "../lib/ai";
import { TEMPLATES } from "../lib/seed";
import { AI_COST, go, useStore } from "../lib/store";
import { Attempt, Course, blockCount, courseMinutes } from "../lib/types";
import { Btn, Chip, EmptyState, Field, IconBtn, Menu, Modal, ProgressBar, Select, TextInput } from "./ui";

export function TopBar({ children }: { children?: React.ReactNode }) {
  const user = useStore((s) => s.user());
  const signOut = useStore((s) => s.signOut);
  return (
    <header className="h-[56px] flex-none bg-surface border-b border-line flex items-center gap-4 px-5">
      <button onClick={() => go({ name: "dashboard" })} className="flex items-center gap-2.5 group" aria-label="Lessonsmith home">
        <span className="w-8 h-8 rounded-lg bg-pine text-canvas font-display font-extrabold text-[15px] flex items-center justify-center group-hover:bg-pine-2 transition-colors">Ls</span>
        <span className="font-display font-extrabold text-[16.5px] tracking-tight">Lessonsmith</span>
        <Chip tone="pine">Studio</Chip>
      </button>
      {children}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] font-bold text-ink-2 leading-none">{user?.credits ?? 0} credits</p>
            <ProgressBar value={((user?.credits ?? 0) / 100) * 100} tone="amber" className="w-[86px] mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2 pl-3 border-l border-line">
          <span className="w-8 h-8 rounded-full bg-night text-canvas text-[11.5px] font-bold flex items-center justify-center">{(user?.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
          <div className="hidden md:block">
            <p className="text-[12.5px] font-semibold leading-none">{user?.name}</p>
            <p className="text-[10.5px] text-faint capitalize mt-0.5">{user?.plan} plan</p>
          </div>
          <Menu button={<IconBtn label="Account menu"><MoreHorizontal size={16} /></IconBtn>} items={[
            { label: "Add 50 demo credits", icon: <Sparkles size={14} />, onClick: () => { useStore.getState().adjustCredits(50); useStore.getState().toast("ok", "+50 demo credits added."); } },
            { label: "Sign out", onClick: signOut, danger: true, divider: true },
          ]} />
        </div>
      </div>
    </header>
  );
}

export function Dashboard() {
  const courses = useStore((s) => s.courses);
  const attempts = useStore((s) => s.attempts);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");

  const list = useMemo(() => {
    return Object.values(courses)
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .filter((c) => !q.trim() || (c.title + " " + c.topic + " " + c.description).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [courses, q, filter]);

  const totalBlocks = Object.values(courses).reduce((a, c) => a + blockCount(c), 0);
  const recentAttempts = attempts.slice(0, 5);

  return (
    <div className="h-screen flex flex-col">
      <TopBar>
        <div className="relative ml-2 hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…"
            className="w-[240px] rounded-lg border border-line-2 bg-canvas pr-3 py-1.5 text-[13px] focus:border-pine focus:outline-none focus:bg-surface transition-all" style={{ paddingLeft: 34 }} />
        </div>
      </TopBar>

      <main className="grow overflow-y-auto">
        <div className="max-w-[1180px] mx-auto px-5 py-7">
          {/* hero strip */}
          <div className="flex items-end justify-between gap-4 flex-wrap mb-7 anim-rise">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">Workspace</p>
              <h1 className="font-display font-extrabold text-[28px] leading-tight mt-1">Your courses</h1>
              <p className="text-[13.5px] text-mute mt-1">Turn your knowledge into LMS-ready courses in minutes.</p>
            </div>
            <Btn size="lg" onClick={() => go({ name: "new" })}><Plus size={16} /> Create course</Btn>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            {[
              { label: "Courses", value: Object.keys(courses).length, icon: <BookOpen size={16} />, note: `${Object.values(courses).filter((c) => c.status === "published").length} published` },
              { label: "Content blocks", value: totalBlocks, icon: <Layers size={16} />, note: "across all courses" },
              { label: "Learner attempts", value: attempts.length, icon: <TrendingUp size={16} />, note: attempts.length ? `${Math.round(attempts.filter((a) => a.passed).length / Math.max(1, attempts.filter((a) => a.passed != null).length || 1) * 100)}% pass rate` : "no data yet" },
              { label: "Avg. score", value: attempts.length ? `${Math.round(attempts.reduce((a, b) => a + (b.score ?? 0), 0) / Math.max(1, attempts.filter((a) => a.score != null).length))}%` : "—", icon: <BarChart3 size={16} />, note: "graded assessments" },
            ].map((s, i) => (
              <div key={s.label} className="bg-surface border border-line rounded-xl p-4 anim-rise" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint">{s.label}</p>
                  <span className="text-pine">{s.icon}</span>
                </div>
                <p className="font-display font-extrabold text-[24px] mt-1.5">{s.value}</p>
                <p className="text-[11.5px] text-mute">{s.note}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-6 items-start max-lg:flex-col">
            {/* course list */}
            <div className="grow max-lg:w-full">
              <div className="flex items-center gap-2 mb-3.5">
                {(["all", "draft", "published"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors capitalize ${filter === f ? "bg-night text-canvas" : "text-mute hover:bg-line/60"}`}>
                    {f === "all" ? "All courses" : f + "s"}
                  </button>
                ))}
              </div>
              {list.length === 0 ? (
                <div className="bg-surface border border-line rounded-xl">
                  <EmptyState icon={<Sparkles size={22} />} title="No courses yet"
                    body={q ? `Nothing matches “${q}”. Try a different search.` : "Turn your first idea into an LMS-ready course. AI designs the structure, activities and assessment — you stay in control."}
                    action={<Btn onClick={() => go({ name: "new" })}><Plus size={15} /> Create course</Btn>} />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3.5">
                  {list.map((c, i) => <CourseCard key={c.id} course={c} attempts={attempts.filter((a) => a.courseId === c.id)} delay={i * 40} />)}
                </div>
              )}
            </div>

            {/* side rail */}
            <aside className="w-[300px] flex-none space-y-4 max-lg:w-full">
              <div className="bg-surface border border-line rounded-xl p-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-3">Start from a template</p>
                <div className="space-y-1.5">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => go({ name: "new" })}
                      className="w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-pine-3/50 transition-colors group">
                      <FileText size={15} className="text-pine flex-none" />
                      <span className="grow text-[12.5px] font-semibold group-hover:text-pine-2">{t.name}</span>
                      <ChevronRight size={14} className="text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-surface border border-line rounded-xl p-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-3">Recent learner activity</p>
                {recentAttempts.length === 0 && <p className="text-[12.5px] text-faint">Attempts from the player and exports land here.</p>}
                <div className="space-y-2.5">
                  {recentAttempts.map((a) => {
                    const c = courses[a.courseId];
                    return (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-full flex-none text-[10.5px] font-bold flex items-center justify-center ${a.passed ? "bg-ok-3 text-ok" : a.passed === false ? "bg-bad-3 text-bad" : "bg-line text-mute"}`}>
                          {a.learner.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                        <div className="grow min-w-0">
                          <p className="text-[12px] font-semibold truncate">{a.learner} · {a.score != null ? `${a.score}%` : "completed"}</p>
                          <p className="text-[10.5px] text-faint truncate">{c?.title || "Course"} · {relTime(a.ts)}</p>
                        </div>
                        {a.passed != null && <Chip tone={a.passed ? "ok" : "bad"}>{a.passed ? "Pass" : "Fail"}</Chip>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-night text-canvas rounded-xl p-4">
                <p className="font-display font-bold text-[14px]">Export when ready</p>
                <p className="text-[12px] text-canvas/65 mt-1 leading-relaxed">SCORM 1.2, SCORM 2004, xAPI and cmi5 packages — validated before download.</p>
                <p className="text-[11px] text-canvas/45 mt-2.5 font-mono">imsmanifest.xml · tracking · suspend/resume</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function CourseCard({ course, attempts, delay }: { course: Course; attempts: Attempt[]; delay: number }) {
  const duplicateCourse = useStore((s) => s.duplicateCourse);
  const deleteCourse = useStore((s) => s.deleteCourse);
  const updateCourse = useStore((s) => s.updateCourse);
  const translateCourse = useStore((s) => s.translateCourse);
  const toast = useStore((s) => s.toast);
  const [rename, setRename] = useState(false);
  const [del, setDel] = useState(false);
  const [translate, setTranslate] = useState(false);
  const [name, setName] = useState(course.title);
  const lessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);

  const cover = course.cover.startsWith("http") || course.cover.startsWith("data:")
    ? { backgroundImage: `url(${course.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: course.cover || "linear-gradient(135deg,#175943,#0a2a20)" };

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 anim-rise group" style={{ animationDelay: `${delay}ms` }}>
      <button className="block w-full text-left" onClick={() => go({ name: "editor", courseId: course.id })}>
        <div className="h-[118px] relative" style={cover}>
          <div className="absolute inset-0 bg-gradient-to-t from-night/45 to-transparent" />
          <div className="absolute bottom-2.5 left-3 flex gap-1.5">
            <Chip tone={course.status === "published" ? "ok" : "warn"}>{course.status === "published" ? "Published" : "Draft"}</Chip>
            {course.aiGenerated && <Chip tone="amber"><Sparkles size={10} /> AI</Chip>}
          </div>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-night/30">
            <span className="bg-surface text-ink text-[12px] font-bold px-3 py-1.5 rounded-lg shadow-pop flex items-center gap-1.5"><Pencil size={12} /> Open editor</span>
          </span>
        </div>
        <div className="p-3.5">
          <h3 className="font-display font-bold text-[14.5px] leading-snug line-clamp-1">{course.title}</h3>
          <p className="text-[11.5px] text-mute mt-1 flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1"><Clock size={11} /> {courseMinutes(course)} min</span>
            <span>{lessons} lessons</span>
            <span>{attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</span>
          </p>
          <p className="text-[10.5px] text-faint mt-1.5">Edited {relTime(course.updatedAt)} · {course.authorName || "You"}</p>
        </div>
      </button>
      <div className="px-2.5 pb-2.5 flex items-center gap-0.5 border-t border-line pt-1.5 mt-0">
        <CardBtn label="Edit" onClick={() => go({ name: "editor", courseId: course.id })}><Pencil size={13.5} /></CardBtn>
        <CardBtn label="Preview" onClick={() => go({ name: "play", courseId: course.id })}><Play size={13.5} /></CardBtn>
        <CardBtn label="Insights" onClick={() => go({ name: "insights", courseId: course.id })}><BarChart3 size={13.5} /></CardBtn>
        <div className="ml-auto">
          <Menu button={<IconBtn label="More actions"><MoreHorizontal size={15} /></IconBtn>} items={[
            { label: "Duplicate", icon: <Copy size={14} />, onClick: () => duplicateCourse(course.id) },
            { label: "Rename", icon: <Pencil size={14} />, onClick: () => { setName(course.title); setRename(true); } },
            { label: "Translate…", icon: <Languages size={14} />, onClick: () => setTranslate(true) },
            { label: "Share for review", icon: <Eye size={14} />, onClick: () => { copyReviewLink(course.id); toast("ok", "Review link copied — reviewers need no account."); } },
            { label: "Delete", icon: <Trash2 size={14} />, onClick: () => setDel(true), danger: true, divider: true },
          ]} />
        </div>
      </div>

      <Modal open={rename} onClose={() => setRename(false)} title="Rename course" footer={<>
        <Btn variant="ghost" onClick={() => setRename(false)}>Cancel</Btn>
        <Btn onClick={() => { updateCourse(course.id, (c) => { c.title = name.trim() || c.title; }); setRename(false); toast("ok", "Course renamed."); }}>Save</Btn>
      </>}>
        <Field label="Course title"><TextInput value={name} autoFocus onChange={(e) => setName(e.target.value)} /></Field>
      </Modal>
      <Modal open={del} onClose={() => setDel(false)} title="Delete this course?" width={440} footer={<>
        <Btn variant="ghost" onClick={() => setDel(false)}>Keep it</Btn>
        <Btn variant="danger" onClick={() => { deleteCourse(course.id); setDel(false); }}>Delete course</Btn>
      </>}>
        <p className="text-[13.5px] text-mute leading-relaxed">“{course.title}” and its {lessons} lessons will be removed from this workspace. Published packages already downloaded are unaffected.</p>
      </Modal>
      <Modal open={translate} onClose={() => setTranslate(false)} title="Duplicate & translate" subtitle="Creates a copy — the original is never overwritten." footer={null}>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.filter((l) => l.code !== course.settings.language).map((l) => (
            <button key={l.code} onClick={() => { const id = translateCourse(course.id, l.code); setTranslate(false); go({ name: "editor", courseId: id }); }}
              className="text-left rounded-lg border border-line px-3 py-2.5 hover:border-pine hover:bg-pine-3/40 transition-all">
              <p className="text-[13px] font-semibold">{l.name}</p>
              <p className="text-[10.5px] text-faint">UI translated · content kept as source</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function CardBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} title={label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] font-semibold text-mute hover:text-pine-2 hover:bg-pine-3/60 transition-colors">{children}{label}</button>;
}

export function copyReviewLink(courseId: string) {
  const url = `${location.origin}${location.pathname}#/review/${courseId}`;
  navigator.clipboard?.writeText(url).catch(() => {});
}

export function InsightsScreen({ courseId }: { courseId: string }) {
  const course = useStore((s) => s.courses[courseId]);
  const attempts = useStore((s) => s.attempts.filter((a) => a.courseId === courseId));
  if (!course) return <div className="p-10 text-mute">Course not found.</div>;
  const scored = attempts.filter((a) => a.score != null);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + (b.score || 0), 0) / scored.length) : null;
  const passRate = scored.length ? Math.round(scored.filter((a) => a.passed).length / scored.length * 100) : null;
  const avgTime = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.seconds, 0) / attempts.length) : null;
  const dist = [0, 0, 0, 0, 0];
  scored.forEach((a) => { dist[Math.min(4, Math.floor((a.score || 0) / 20))]++; });
  const maxDist = Math.max(1, ...dist);

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="grow overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-5 py-7">
          <Btn variant="ghost" size="sm" onClick={() => go({ name: "dashboard" })}>← Back to courses</Btn>
          <h1 className="font-display font-extrabold text-[24px] mt-3">Insights · {course.title}</h1>
          <p className="text-[13px] text-mute mt-1">Learner analytics are kept separate from authoring data — this view is read-only.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <Stat label="Completions" value={String(attempts.filter((a) => a.completed).length)} />
            <Stat label="Average score" value={avg != null ? `${avg}%` : "—"} />
            <Stat label="Pass rate" value={passRate != null ? `${passRate}%` : "—"} />
            <Stat label="Avg. time" value={avgTime != null ? `${Math.floor(avgTime / 60)}m ${avgTime % 60}s` : "—"} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div className="bg-surface border border-line rounded-xl p-5">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-4">Score distribution</p>
              <div className="flex items-end gap-3 h-[130px]">
                {dist.map((d, i) => (
                  <div key={i} className="grow flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold text-ink-2">{d}</span>
                    <div className="w-full rounded-t-lg bg-pine transition-all duration-500" style={{ height: `${(d / maxDist) * 92 + 4}px`, opacity: 0.45 + (i / 5) }} />
                    <span className="text-[10px] text-faint">{i * 20}–{i * 20 + 19}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface border border-line rounded-xl p-5">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-3">Latest attempts</p>
              <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                {attempts.length === 0 && <p className="text-[12.5px] text-faint">No attempts yet. Share the course or open the preview to record one.</p>}
                {attempts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 text-[12.5px]">
                    <span className="font-semibold w-[86px] truncate">{a.learner}</span>
                    <span className="text-mute grow">{relTime(a.ts)}</span>
                    {a.score != null && <span className={`font-bold ${a.passed ? "text-ok" : "text-bad"}`}>{a.score}%</span>}
                    <span className="text-faint font-mono text-[11px]">{Math.floor(a.seconds / 60)}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint">{label}</p>
      <p className="font-display font-extrabold text-[24px] mt-1">{value}</p>
    </div>
  );
}

export function relTime(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
