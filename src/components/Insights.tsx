import { ArrowLeft, BarChart3, Building2, GraduationCap, TrendingUp, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { go, useStore } from "../lib/store";
import { Attempt, Course, Question, allLessons } from "../lib/types";
import { Btn, Chip, Seg } from "./ui";
import { TopBar } from "./Dashboard";

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

export function Insights({ courseId }: { courseId: string }) {
  const course = useStore((s) => s.courses[courseId]);
  const attempts = useStore((s) => s.attempts.filter((a) => a.courseId === courseId));
  const [tab, setTab] = useState<"course" | "org">("course");

  if (!course) return <div className="p-10 text-mute">Course not found.</div>;

  return (
    <div className="h-screen flex flex-col bg-canvas">
      <TopBar />
      <main className="grow overflow-y-auto">
        <div className="max-w-[1020px] mx-auto px-5 py-7">
          <div className="flex items-center gap-3 flex-wrap">
            <Btn variant="ghost" size="sm" onClick={() => go({ name: "dashboard" })}><ArrowLeft size={14} /> Courses</Btn>
            <div className="ml-auto">
              <Seg value={tab} onChange={setTab} options={[
                { value: "course", label: <span className="flex items-center gap-1.5"><GraduationCap size={13} /> This course</span> },
                { value: "org", label: <span className="flex items-center gap-1.5"><Building2 size={13} /> Organization</span> },
              ]} />
            </div>
          </div>
          {tab === "course" ? <CourseAnalytics course={course} attempts={attempts} /> : <OrgAnalytics />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- course tab ---------------- */
function CourseAnalytics({ course, attempts }: { course: Course; attempts: Attempt[] }) {
  const scored = attempts.filter((a) => a.score != null);
  const completed = attempts.filter((a) => a.completed);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score || 0), 0) / scored.length) : null;
  const passRate = scored.length ? Math.round((scored.filter((a) => a.passed).length / scored.length) * 100) : null;
  const avgTime = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.seconds, 0) / attempts.length) : null;

  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    scored.forEach((a) => d[Math.min(4, Math.floor((a.score || 0) / 20))]++);
    return d.map((v, i) => ({ range: `${i * 20}–${i * 20 + 19}`, count: v }));
  }, [scored.length]);

  const trend = useMemo(() => {
    const buckets: Record<string, number> = {};
    [...attempts].sort((a, b) => a.ts - b.ts).forEach((a) => {
      const d = new Date(a.ts);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      buckets[key] = (buckets[key] || 0) + (a.completed ? 1 : 0);
    });
    const keys = Object.keys(buckets).slice(-10);
    let run = 0;
    return keys.map((k) => { run += buckets[k]; return { day: k, completions: run }; });
  }, [attempts.length]);

  const questionPerf = useMemo(() => computeQuestionPerf(course, attempts), [course, attempts]);

  if (attempts.length === 0) {
    return (
      <EmptyInsights course={course} />
    );
  }

  return (
    <div className="anim-rise">
      <h1 className="font-display font-extrabold text-[24px] mt-4 flex items-center gap-2.5">
        <BarChart3 size={20} className="text-pine" /> Insights · {course.title}
      </h1>
      <p className="text-[13px] text-mute mt-1">Learner analytics are stored separately from authoring data — this view is read-only.</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
        <Stat label="Attempts" value={String(attempts.length)} icon={<Users size={13} />} />
        <Stat label="Completions" value={String(completed.length)} icon={<GraduationCap size={13} />} />
        <Stat label="Avg score" value={avg != null ? `${avg}%` : "—"} icon={<TrendingUp size={13} />} tone={avg != null && avg >= course.settings.passMark ? "ok" : undefined} />
        <Stat label="Pass rate" value={passRate != null ? `${passRate}%` : "—"} icon={<TrendingUp size={13} />} />
        <Stat label="Avg time" value={avgTime != null ? fmtTime(avgTime) : "—"} icon={<BarChart3 size={13} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-3">Score distribution</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dist} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9e0" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10.5, fill: "#969e94" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: "#969e94" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f1f3ec" }} contentStyle={{ borderRadius: 10, border: "1px solid #e3e6df", fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((d, i) => <Cell key={i} fill={i < 2 ? "#c26a63" : i === 2 ? "#e8a020" : "#175943"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-3">Cumulative completions</p>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCompl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#175943" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#175943" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e9e0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: "#969e94" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: "#969e94" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e3e6df", fontSize: 12 }} />
                <Area type="monotone" dataKey="completions" stroke="#175943" strokeWidth={2.5} fill="url(#gCompl)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[12.5px] text-faint py-10 text-center">No completion events yet.</p>
          )}
        </div>
      </div>

      {/* question performance */}
      <div className="bg-surface border border-line rounded-xl p-5 mt-4">
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint">Question performance</p>
          <Chip tone="neutral">{questionPerf.length} questions tracked</Chip>
        </div>
        {questionPerf.length === 0 ? (
          <p className="text-[12.5px] text-faint">Learners haven't submitted graded questions yet — stats appear after the first scored attempt.</p>
        ) : (
          <div className="space-y-2.5">
            {questionPerf.map((q) => (
              <div key={q.id} className="flex items-center gap-3">
                <p className="w-[42%] text-[12.5px] text-ink-2 truncate" title={q.prompt}>{q.prompt}</p>
                <div className="grow h-2.5 rounded-full bg-canvas border border-line overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${q.pct}%`, background: q.pct >= 75 ? "#175943" : q.pct >= 50 ? "#e8a020" : "#c26a63" }} />
                </div>
                <span className="w-11 text-right text-[12px] font-bold font-mono" style={{ color: q.pct >= 75 ? "#175943" : q.pct >= 50 ? "#a4700a" : "#a54a43" }}>{q.pct}%</span>
                <span className="w-16 text-[10.5px] text-faint font-mono">{q.answers} ans.</span>
                {q.pct < 50 && <Chip tone="bad">Needs review</Chip>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* learner table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden mt-4">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-faint border-b border-line bg-canvas/60">
              <th className="px-4 py-2.5 font-bold">Learner</th><th className="px-4 py-2.5 font-bold">When</th>
              <th className="px-4 py-2.5 font-bold">Score</th><th className="px-4 py-2.5 font-bold">Result</th>
              <th className="px-4 py-2.5 font-bold">Time</th><th className="px-4 py-2.5 font-bold">Completed</th>
            </tr>
          </thead>
          <tbody>
            {[...attempts].sort((a, b) => b.ts - a.ts).map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0 hover:bg-canvas/50 transition-colors">
                <td className="px-4 py-2.5 font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-pine-3 text-pine-2 text-[10px] font-black flex items-center justify-center">{a.learner.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                  {a.learner}
                </td>
                <td className="px-4 py-2.5 text-mute">{new Date(a.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{a.score != null ? `${a.score}%` : "—"}</td>
                <td className="px-4 py-2.5">{a.passed == null ? <Chip tone="neutral">n/a</Chip> : a.passed ? <Chip tone="ok">Passed</Chip> : <Chip tone="bad">Failed</Chip>}</td>
                <td className="px-4 py-2.5 text-mute font-mono text-[11.5px]">{fmtTime(a.seconds)}</td>
                <td className="px-4 py-2.5">{a.completed ? <Chip tone="pine">Yes</Chip> : <Chip tone="neutral">In progress</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function computeQuestionPerf(course: Course, attempts: Attempt[]) {
  const questions: { id: string; prompt: string }[] = [];
  for (const l of allLessons(course)) for (const b of l.lesson.blocks) {
    if (b.kind === "quiz") b.questions.forEach((q: Question) => questions.push({ id: q.id, prompt: q.prompt }));
    if (b.kind === "question") questions.push({ id: b.q.id, prompt: b.q.prompt });
  }
  return questions.map((q) => {
    let answers = 0, correct = 0;
    for (const a of attempts) for (const qs of a.questionStats) if (qs.questionId === q.id) { answers++; if (qs.correct) correct++; }
    return { ...q, answers, pct: answers ? Math.round((correct / answers) * 100) : 0 };
  }).filter((q) => q.answers > 0).sort((a, b) => a.pct - b.pct);
}

function EmptyInsights({ course }: { course: Course }) {
  return (
    <div className="mt-6 bg-surface border border-line rounded-xl py-16 text-center anim-rise">
      <div className="w-14 h-14 rounded-2xl bg-pine-3 text-pine-2 flex items-center justify-center mx-auto mb-4"><BarChart3 size={24} /></div>
      <h2 className="font-display font-bold text-[18px]">No learner data yet</h2>
      <p className="text-[13px] text-mute mt-1.5 max-w-[380px] mx-auto leading-relaxed">
        Insights fill up as people take “{course.title}”. Preview it as a learner, export SCORM to your LMS, or share a review link — attempts land here automatically.
      </p>
      <div className="flex justify-center gap-2 mt-5">
        <Btn variant="outline" size="sm" onClick={() => go({ name: "play", courseId: course.id })}>Preview as learner</Btn>
        <Btn size="sm" onClick={() => go({ name: "editor", courseId: course.id })}>Back to editor</Btn>
      </div>
    </div>
  );
}

/* ---------------- org tab ---------------- */
function OrgAnalytics() {
  const courses = useStore((s) => Object.values(s.courses));
  const attempts = useStore((s) => s.attempts);

  const authors = useMemo(() => new Set(courses.map((c) => c.authorName).filter(Boolean)).size, [courses.length]);
  const published = courses.filter((c) => c.status === "published").length;
  const scored = attempts.filter((a) => a.score != null);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (a.score || 0), 0) / scored.length) : null;

  const perCourse = useMemo(() => courses.map((c) => {
    const a = attempts.filter((x) => x.courseId === c.id);
    const sc = a.filter((x) => x.score != null);
    return {
      id: c.id, title: c.title, status: c.status,
      completions: a.filter((x) => x.completed).length,
      avg: sc.length ? Math.round(sc.reduce((s, x) => s + (x.score || 0), 0) / sc.length) : null,
    };
  }).sort((a, b) => b.completions - a.completions), [courses.length, attempts.length]);

  const maxC = Math.max(1, ...perCourse.map((c) => c.completions));

  return (
    <div className="anim-rise">
      <h1 className="font-display font-extrabold text-[24px] mt-4 flex items-center gap-2.5"><Building2 size={20} className="text-pine" /> Organization overview</h1>
      <p className="text-[13px] text-mute mt-1">Aggregated across every course in this workspace.</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <Stat label="Active authors" value={String(Math.max(1, authors))} icon={<Users size={13} />} />
        <Stat label="Courses" value={String(courses.length)} icon={<GraduationCap size={13} />} />
        <Stat label="Published" value={String(published)} icon={<TrendingUp size={13} />} />
        <Stat label="Learner completions" value={String(attempts.filter((a) => a.completed).length)} icon={<BarChart3 size={13} />} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-4">Completions by course</p>
          <div className="space-y-3">
            {perCourse.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12.5px] font-semibold truncate max-w-[70%]">{c.title}</p>
                  <span className="text-[11.5px] font-mono font-bold text-mute">{c.completions}</span>
                </div>
                <div className="h-2 rounded-full bg-canvas border border-line overflow-hidden">
                  <div className="h-full rounded-full bg-pine transition-all duration-700" style={{ width: `${(c.completions / maxC) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-line rounded-xl p-5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint mb-4">Assessment performance</p>
          <div className="space-y-3">
            {perCourse.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <p className="grow text-[12.5px] font-semibold truncate">{c.title}</p>
                {c.avg != null ? (
                  <>
                    <div className="w-24 h-2 rounded-full bg-canvas border border-line overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.avg}%`, background: c.avg >= 80 ? "#175943" : c.avg >= 60 ? "#e8a020" : "#c26a63" }} />
                    </div>
                    <span className="w-10 text-right text-[12px] font-bold font-mono">{c.avg}%</span>
                  </>
                ) : <span className="text-[11px] text-faint">no scores yet</span>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-faint mt-5">Average across all scored attempts: <strong className="text-ink">{avg != null ? `${avg}%` : "—"}</strong></p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "ok" }) {
  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-3.5 hover:shadow-card transition-shadow">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-faint flex items-center gap-1.5">{icon}{label}</p>
      <p className={`font-display font-extrabold text-[22px] mt-1 ${tone === "ok" ? "text-ok" : "text-ink"}`}>{value}</p>
    </div>
  );
}
