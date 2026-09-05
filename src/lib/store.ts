import { create } from "zustand";
import { CHROME_STRINGS, CourseBrief, LocalProvider } from "./ai";
import { buildSeedCourses, seedAttempts } from "./seed";
import { Attempt, Course, CourseVersion, ID, SessionT, UserT, findLesson, lessonMinutes, migrateCourse, uid } from "./types";

/* ---------------- persistence helpers ---------------- */
const K = {
  users: "ls_users", session: "ls_session", courses: "ls_courses",
  attempts: "ls_attempts", versions: "ls_versions", seeded: "ls_seeded_v1",
};
function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export async function hashPass(pw: string): Promise<string> {
  const data = new TextEncoder().encode("ls·" + pw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Route =
  | { name: "dashboard" } | { name: "new" } | { name: "editor"; courseId: ID }
  | { name: "play"; courseId: ID } | { name: "review"; courseId: ID } | { name: "insights"; courseId: ID };

export function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  const [a, b] = h.split("/");
  if (a === "new") return { name: "new" };
  if (a === "editor" && b) return { name: "editor", courseId: b };
  if (a === "play" && b) return { name: "play", courseId: b };
  if (a === "review" && b) return { name: "review", courseId: b };
  if (a === "insights" && b) return { name: "insights", courseId: b };
  return { name: "dashboard" };
}
export const go = (r: Route) => {
  const h = r.name === "dashboard" ? "#/" : r.name === "editor" ? `#/editor/${r.courseId}` : r.name === "new" ? "#/new" : r.name === "play" ? `#/play/${r.courseId}` : r.name === "review" ? `#/review/${r.courseId}` : `#/insights/${r.courseId}`;
  if (location.hash !== h) location.hash = h;
  else window.dispatchEvent(new HashChangeEvent("hashchange"));
};

export interface Toast { id: string; kind: "ok" | "err" | "info" | "ai"; msg: string }

export type SaveState = "saved" | "saving" | "error";

interface EditorState {
  courseId: ID | null;
  lessonId: ID | null;
  blockId: ID | null;
  past: Course[];
  future: Course[];
  collapsed: Record<ID, boolean>;
}

interface State {
  route: Route;
  setRoute(r: Route): void;

  users: UserT[];
  session: SessionT | null;
  user(): UserT | null;
  signUp(name: string, email: string, pw: string): Promise<string | null>;
  signIn(email: string, pw: string): Promise<string | null>;
  signOut(): void;
  adjustCredits(delta: number): void;

  courses: Record<ID, Course>;
  attempts: Attempt[];
  versions: CourseVersion[];
  toasts: Toast[];
  toast(kind: Toast["kind"], msg: string): void;
  dismissToast(id: string): void;

  editor: EditorState;
  saveState: SaveState;

  openEditor(courseId: ID): void;
  selectLesson(id: ID): void;
  selectBlock(id: ID | null): void;
  toggleCollapse(id: ID): void;

  addCourse(c: Course): void;
  updateCourse(id: ID, fn: (c: Course) => void, opts?: { undoable?: boolean; silent?: boolean }): void;
  deleteCourse(id: ID): void;
  duplicateCourse(id: ID): ID;
  publishCourse(id: ID): void;
  saveVersion(id: ID, label: string): void;
  restoreVersion(vid: ID): void;
  translateCourse(id: ID, lang: string): ID;
  addComment(courseId: ID, lessonId: ID, blockId: ID, author: string, text: string): void;
  setComment(courseId: ID, cid: ID, patch: Partial<{ resolved: boolean }>): void;
  deleteComment(courseId: ID, cid: ID): void;
  recordAttempt(a: Attempt): void;

  undo(): void;
  redo(): void;
}

/* ---------------- initial load ---------------- */
function initialData() {
  const users = load<UserT[]>(K.users, []);
  const session = load<SessionT | null>(K.session, null);
  let courses = load<Record<ID, Course>>(K.courses, {});
  if (!localStorage.getItem(K.seeded) || Object.keys(courses).length === 0) {
    const author = users[0]?.name || "Alex Morgan";
    const seeded = buildSeedCourses(author);
    courses = Object.fromEntries(seeded.map((c) => [c.id, c]));
    save(K.courses, courses);
    save(K.seeded, "1");
    const attempts = load<Attempt[]>(K.attempts, []);
    if (!attempts.length) save(K.attempts, seedAttempts(seeded[0]));
  } else {
    for (const id of Object.keys(courses)) { try { courses[id] = migrateCourse(courses[id]); } catch { delete courses[id]; } }
  }
  return { users, session, courses, attempts: load<Attempt[]>(K.attempts, []), versions: load<CourseVersion[]>(K.versions, []) };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const init = initialData();

export const useStore = create<State>((set, get) => ({
  route: parseHash(),
  setRoute: (r) => set({ route: r }),

  users: init.users,
  session: init.session,
  user: () => {
    const { users, session } = get();
    return users.find((u) => u.id === session?.userId) || null;
  },

  signUp: async (name, email, pw) => {
    const { users } = get();
    if (!name.trim()) return "Please enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Please enter a valid email address.";
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return "An account with this email already exists. Try signing in.";
    const u: UserT = { id: uid(), name: name.trim(), email: email.trim(), passHash: await hashPass(pw), plan: "free", credits: 100, createdAt: Date.now() };
    set({ users: [...users, u], session: { userId: u.id, ts: Date.now() } });
    save(K.users, get().users); save(K.session, get().session);
    return null;
  },
  signIn: async (email, pw) => {
    const { users } = get();
    const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return "No account found for that email.";
    if (u.passHash !== (await hashPass(pw))) return "Incorrect password.";
    set({ session: { userId: u.id, ts: Date.now() } });
    save(K.session, get().session);
    return null;
  },
  signOut: () => { set({ session: null }); save(K.session, null); go({ name: "dashboard" }); },
  adjustCredits: (delta) => {
    const u = get().user(); if (!u) return;
    const users = get().users.map((x) => (x.id === u.id ? { ...x, credits: Math.max(0, x.credits + delta) } : x));
    set({ users }); save(K.users, users);
  },

  courses: init.courses,
  attempts: init.attempts,
  versions: init.versions,
  toasts: [],
  toast: (kind, msg) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, msg }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  editor: { courseId: null, lessonId: null, blockId: null, past: [], future: [], collapsed: {} },
  saveState: "saved",

  openEditor: (courseId) => {
    const c = get().courses[courseId];
    if (!c) return;
    const first = c.modules[0]?.lessons[0];
    set({ editor: { courseId, lessonId: first?.id || null, blockId: null, past: [], future: [], collapsed: get().editor.collapsed } });
  },
  selectLesson: (id) => set((s) => ({ editor: { ...s.editor, lessonId: id, blockId: null } })),
  selectBlock: (id) => set((s) => ({ editor: { ...s.editor, blockId: id } })),
  toggleCollapse: (id) => set((s) => ({ editor: { ...s.editor, collapsed: { ...s.editor.collapsed, [id]: !s.editor.collapsed[id] } } })),

  addCourse: (c) => {
    const courses = { ...get().courses, [c.id]: c };
    set({ courses }); save(K.courses, courses);
  },

  updateCourse: (id, fn, opts) => {
    const cur = get().courses[id];
    if (!cur) return;
    const clone: Course = structuredClone(cur);
    fn(clone);
    clone.updatedAt = Date.now();
    for (const m of clone.modules) for (const l of m.lessons) l.minutes = lessonMinutes(l.blocks);
    const past = opts?.undoable === false ? get().editor.past : [...get().editor.past.slice(-59), structuredClone(cur)];
    set((s) => ({
      courses: { ...s.courses, [id]: clone },
      editor: s.editor.courseId === id ? { ...s.editor, past, future: [] } : s.editor,
      saveState: "saving",
    }));
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = save(K.courses, get().courses);
      set({ saveState: ok ? "saved" : "error" });
      if (!ok) get().toast("err", "We couldn't save your changes. Your work is still stored in this browser — try again.");
    }, 650);
  },

  deleteCourse: (id) => {
    const courses = { ...get().courses }; delete courses[id];
    set({ courses }); save(K.courses, courses);
    get().toast("info", "Course deleted.");
  },

  duplicateCourse: (id) => {
    const cur = get().courses[id]; if (!cur) return id;
    const clone: Course = structuredClone(cur);
    clone.id = uid(); clone.title = cur.title + " (copy)"; clone.status = "draft";
    clone.createdAt = Date.now(); clone.updatedAt = Date.now();
    const remap = new Map<string, string>();
    const fix = (oldId: string) => { if (!remap.has(oldId)) remap.set(oldId, uid()); return remap.get(oldId)!; };
    clone.modules = clone.modules.map((m) => ({ ...m, id: fix(m.id), lessons: m.lessons.map((l) => ({ ...l, id: fix(l.id), blocks: l.blocks.map((b) => ({ ...b, id: fix(b.id) })) })) }));
    clone.comments = [];
    get().addCourse(clone);
    get().toast("ok", "Course duplicated.");
    return clone.id;
  },

  publishCourse: (id) => {
    get().updateCourse(id, (c) => { c.status = "published"; }, { undoable: false, silent: true });
    get().saveVersion(id, "Published");
    get().toast("ok", "Course published. Learners with the link can now take it.");
  },

  saveVersion: (id, label) => {
    const cur = get().courses[id]; if (!cur) return;
    const v: CourseVersion = { id: uid(), courseId: id, label, ts: Date.now(), snapshot: structuredClone(cur) };
    const versions = [v, ...get().versions.filter((x) => x.courseId === id).slice(0, 19), ...get().versions.filter((x) => x.courseId !== id)];
    set({ versions }); save(K.versions, versions);
  },

  restoreVersion: (vid) => {
    const v = get().versions.find((x) => x.id === vid); if (!v) return;
    const snap = structuredClone(v.snapshot);
    snap.updatedAt = Date.now();
    set((s) => ({ courses: { ...s.courses, [snap.id]: snap } }));
    save(K.courses, get().courses);
    get().toast("ok", `Restored “${v.label}” from ${new Date(v.ts).toLocaleString()}.`);
  },

  translateCourse: (id, lang) => {
    const cur = get().courses[id]; if (!cur) return id;
    const strings = CHROME_STRINGS[lang] || CHROME_STRINGS.en;
    const clone: Course = structuredClone(cur);
    clone.id = uid();
    clone.title = cur.title;
    clone.status = "draft";
    clone.aiGenerated = true;
    clone.settings = { ...clone.settings, language: lang };
    clone.comments = [];
    clone.createdAt = Date.now(); clone.updatedAt = Date.now();
    (clone as any).chrome = strings;
    get().addCourse(clone);
    get().toast("ai", `Duplicated into ${lang.toUpperCase()}. Learner interface translated; content kept as source — connect an AI provider to translate lesson text.`);
    return clone.id;
  },

  addComment: (courseId, lessonId, blockId, author, text) => {
    get().updateCourse(courseId, (c) => { c.comments.push({ id: uid(), blockId, lessonId, author, text, ts: Date.now(), resolved: false }); }, { undoable: false });
  },
  setComment: (courseId, cid, patch) => {
    get().updateCourse(courseId, (c) => { const cm = c.comments.find((x) => x.id === cid); if (cm) Object.assign(cm, patch); }, { undoable: false });
  },
  deleteComment: (courseId, cid) => {
    get().updateCourse(courseId, (c) => { c.comments = c.comments.filter((x) => x.id !== cid); }, { undoable: false });
  },

  recordAttempt: (a) => {
    const attempts = [a, ...get().attempts];
    set({ attempts }); save(K.attempts, attempts);
  },

  undo: () => {
    const { editor, courses } = get();
    const cid = editor.courseId;
    if (!cid || !editor.past.length) return;
    const prev = editor.past[editor.past.length - 1];
    const cur = courses[cid]; if (!cur) return;
    set((s) => ({
      courses: { ...s.courses, [cid]: prev },
      editor: { ...s.editor, past: editor.past.slice(0, -1), future: [...editor.future, structuredClone(cur)] },
    }));
    save(K.courses, get().courses);
  },
  redo: () => {
    const { editor, courses } = get();
    const cid = editor.courseId;
    if (!cid || !editor.future.length) return;
    const next = editor.future[editor.future.length - 1];
    const cur = courses[cid]; if (!cur) return;
    set((s) => ({
      courses: { ...s.courses, [cid]: next },
      editor: { ...s.editor, future: editor.future.slice(0, -1), past: [...editor.past, structuredClone(cur)] },
    }));
    save(K.courses, get().courses);
  },
}));

/* ---------------- selectors ---------------- */
export const useCourse = (id: ID | null) => useStore((s) => (id ? s.courses[id] : undefined));
export function useEditorLesson() {
  return useStore((s) => {
    const { courseId, lessonId } = s.editor;
    if (!courseId) return null;
    const c = s.courses[courseId];
    if (!c) return null;
    const found = lessonId ? findLesson(c, lessonId) : null;
    return found ? { course: c, ...found } : null;
  });
}

/* AI credit costs — centralised so the UI and engine agree. */
export const AI_COST = { course: 20, quiz: 5, rewrite: 1, suggestion: 1, narration: 2, image: 2 };

export function createCourseViaAI(brief: CourseBrief, authorName: string): Course {
  const outline = LocalProvider.generateOutline(brief, []);
  const c = LocalProvider.generateCourse(outline, brief, []);
  c.authorName = authorName;
  return c;
}
