/* Lessonsmith course schema — versioned, renderer-agnostic.
   The same Course document powers: web preview, SCORM 1.2, SCORM 2004, xAPI and cmi5 exports. */

export const COURSE_SCHEMA_VERSION = 1;

export type ID = string;

/* ---------- Theme & settings ---------- */
export interface Theme {
  primary: string;      // brand color used across the learner experience
  accent: string;
  radius: number;       // px, card corner radius
  font: "sans" | "serif" | "display";
  cover: string;        // css background or image url for hero blocks
  styleName: string;    // e.g. "Professional", "Bold"
}

export type CompletionRule = "all-lessons" | "assessment" | "percent";

export interface CourseSettings {
  completionRule: CompletionRule;
  passMark: number;          // 0-100 for graded assessment
  percentRequired: number;   // for "percent" rule
  maxAttempts: number;       // 0 = unlimited
  navigation: "free" | "sequential";
  language: string;          // BCP-47
  showProgress: boolean;
  captions: boolean;
}

export const defaultSettings = (): CourseSettings => ({
  completionRule: "assessment",
  passMark: 80,
  percentRequired: 90,
  maxAttempts: 0,
  navigation: "free",
  language: "en",
  showProgress: true,
  captions: true,
});

export const defaultTheme = (): Theme => ({
  primary: "#175943",
  accent: "#E8A020",
  radius: 10,
  font: "sans",
  cover: "",
  styleName: "Professional",
});

/* ---------- Blocks ---------- */
export type QuestionType = "mcq" | "multi" | "tf" | "fill" | "order";

export interface Question {
  id: ID;
  type: QuestionType;
  prompt: string;
  options?: string[];     // not used for fill-in-the-blank
  correct?: number[];     // indices (mcq/multi/order/tf: 0=false,1=true)
  answer?: string;        // fill-in-the-blank accepted answer
  explanation: string;
  objective?: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ScenarioStep {
  situation: string;
  character: string;
  choices: { text: string; feedback: string; good: boolean }[];
}

type Base = { id: ID; anchor?: string };

export type Block = Base & (
  | { kind: "heading"; text: string; level: 2 | 3 }
  | { kind: "text"; paragraphs: string[] }
  | { kind: "quote"; text: string; attribution: string }
  | { kind: "callout"; tone: "info" | "tip" | "warning"; title: string; body: string }
  | { kind: "divider" }
  | { kind: "image"; src: string; alt: string; caption: string }
  | { kind: "video"; url: string; caption: string; transcript: string }
  | { kind: "keyPoints"; title: string; points: { title: string; body: string }[] }
  | { kind: "accordion"; items: { title: string; body: string }[] }
  | { kind: "tabs"; tabs: { label: string; body: string }[] }
  | { kind: "flipcards"; prompt: string; cards: { front: string; back: string }[] }
  | { kind: "timeline"; title: string; items: { title: string; body: string }[] }
  | { kind: "reveal"; prompt: string; body: string }
  | { kind: "checklist"; title: string; items: string[] }
  | { kind: "scenario"; title: string; intro: string; steps: ScenarioStep[]; summary: string }
  | { kind: "question"; q: Question }
  | { kind: "quiz"; title: string; mode: "practice" | "graded"; questions: Question[]; passMark: number; shuffle: boolean; showExplanations: boolean }
);

export type BlockKind = Block["kind"];
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type BlockNoId = DistributiveOmit<Block, "id">;

export interface Lesson {
  id: ID;
  title: string;
  kind: "lesson" | "check" | "assessment";
  minutes: number;
  blocks: Block[];
}

export interface Module {
  id: ID;
  title: string;
  description: string;
  lessons: Lesson[];
}

/* ---------- Course ---------- */
export type CourseStatus = "draft" | "published";

export interface CommentT {
  id: ID;
  blockId: ID;
  lessonId: ID;
  author: string;
  text: string;
  ts: number;
  resolved: boolean;
}

export interface Course {
  schemaVersion: number;
  id: ID;
  title: string;
  description: string;
  topic: string;
  audience: string;
  objectives: string[];
  status: CourseStatus;
  aiGenerated: boolean;
  cover: string;           // url or gradient key
  theme: Theme;
  settings: CourseSettings;
  modules: Module[];
  comments: CommentT[];
  createdAt: number;
  updatedAt: number;
  authorName: string;
}

export interface CourseVersion {
  id: ID;
  courseId: ID;
  label: string;
  ts: number;
  snapshot: Course;
}

export interface Attempt {
  id: ID;
  courseId: ID;
  learner: string;
  ts: number;
  score: number | null;    // 0-100 of graded assessment
  passed: boolean | null;
  completed: boolean;
  seconds: number;
  questionStats: { questionId: ID; correct: boolean }[];
}

export interface SourceDoc {
  id: ID;
  name: string;
  size: number;
  kind: string;
  text: string;
  status: "ready" | "parsing";
}

/* ---------- Auth / workspace ---------- */
export interface UserT {
  id: ID;
  name: string;
  email: string;
  passHash: string;
  plan: "free" | "pro" | "business";
  credits: number;
  createdAt: number;
}

export interface SessionT {
  userId: ID;
  ts: number;
}

/* ---------- Migrations ---------- */
export function migrateCourse(raw: unknown): Course {
  const c = raw as Course;
  if (!c || typeof c !== "object") throw new Error("Invalid course document");
  if ((c.schemaVersion ?? 0) < 1) {
    c.schemaVersion = COURSE_SCHEMA_VERSION;
  }
  c.theme = { ...defaultTheme(), ...(c.theme || {}) };
  c.settings = { ...defaultSettings(), ...(c.settings || {}) };
  c.comments = c.comments || [];
  c.modules = (c.modules || []).map((m) => ({ ...m, lessons: (m.lessons || []).map((l) => ({ ...l, blocks: l.blocks || [] })) }));
  return c;
}

/* ---------- Helpers ---------- */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function lessonMinutes(blocks: Block[]): number {
  let s = 0;
  for (const b of blocks) {
    if (b.kind === "text") s += Math.max(1, Math.round(b.paragraphs.join(" ").split(/\s+/).length / 180));
    else if (b.kind === "quiz") s += Math.max(1, b.questions.length);
    else if (b.kind === "question") s += 1;
    else if (b.kind === "scenario") s += b.steps.length;
    else if (b.kind === "video") s += 3;
    else s += 0.5;
  }
  return Math.max(1, Math.round(s));
}

export function courseMinutes(c: Course): number {
  return c.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.minutes, 0), 0);
}

export function blockCount(c: Course): number {
  return c.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.blocks.length, 0), 0);
}

export function findLesson(c: Course, lessonId: ID): { module: Module; lesson: Lesson; mi: number; li: number } | null {
  for (let mi = 0; mi < c.modules.length; mi++) {
    const li = c.modules[mi].lessons.findIndex((l) => l.id === lessonId);
    if (li >= 0) return { module: c.modules[mi], lesson: c.modules[mi].lessons[li], mi, li };
  }
  return null;
}

export function allLessons(c: Course): { lesson: Lesson; module: Module }[] {
  return c.modules.flatMap((m) => m.lessons.map((lesson) => ({ lesson, module: m })));
}
