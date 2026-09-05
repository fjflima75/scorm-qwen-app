import { CourseBrief, LocalProvider } from "./ai";
import { Course, lessonMinutes, uid } from "./types";

export const COVER_ART = "https://image.qwenlm.ai/generated-images/e0cadb56-b6a7-40e1-855f-b77bd9480019/_result.png";

export const GRADIENTS = [
  "linear-gradient(135deg,#175943 0%,#0e3a2c 60%,#0a2a20 100%)",
  "linear-gradient(135deg,#1d3a5f 0%,#16293f 60%,#101d2c 100%)",
  "linear-gradient(135deg,#7a3b12 0%,#5a2b0e 60%,#40200a 100%)",
  "linear-gradient(135deg,#4a2a5e 0%,#331d42 60%,#241530 100%)",
  "linear-gradient(135deg,#8c2f39 0%,#632028 60%,#45161c 100%)",
  "linear-gradient(135deg,#274b3a 0%,#1b342a 60%,#12241d 100%)",
];

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  brief: CourseBrief;
}

export const TEMPLATES: Template[] = [
  {
    id: "onboarding", name: "New-hire onboarding", icon: "compass",
    description: "First-week essentials: culture, tools, and who to ask for what.",
    brief: { title: "New-Hire Onboarding: Your First 30 Days", topic: "New-hire onboarding", audience: "new employees joining the company", duration: "30 minutes", difficulty: "Introductory", language: "en", tone: "Friendly", industry: "Any", objectives: ["Navigate the first week with confidence", "Know the key people, tools and rituals", "Set a 30-day plan with your manager"] },
  },
  {
    id: "dataprivacy", name: "Data privacy basics", icon: "shield",
    description: "Handling personal data safely — a compliance staple, made human.",
    brief: { title: "Data Privacy Basics", topic: "Data privacy and personal data handling", audience: "all employees", duration: "20 minutes", difficulty: "Introductory", language: "en", tone: "Professional", industry: "Any", objectives: ["Recognise personal data in daily work", "Apply the minimum-necessary principle", "Report a suspected breach correctly"] },
  },
  {
    id: "discovery", name: "Sales discovery calls", icon: "target",
    description: "Question frameworks that uncover real pain before the pitch.",
    brief: { title: "Discovery Calls That Uncover Real Pain", topic: "Sales discovery calls", audience: "account executives and SDRs", duration: "30 minutes", difficulty: "Intermediate", language: "en", tone: "Bold", industry: "B2B SaaS", objectives: ["Run a structured discovery conversation", "Ask second-level questions that surface pain", "Qualify honestly and move deals forward"] },
  },
  {
    id: "communication", name: "Workplace communication", icon: "chat",
    description: "The flagship demo course — clear messages, feedback, hard talks.",
    brief: { title: "Workplace Communication Essentials", topic: "Workplace communication", audience: "all employees", duration: "45 minutes", difficulty: "Intermediate", language: "en", tone: "Professional", industry: "Any", objectives: [] },
  },
];

export function buildCourseFromBrief(brief: CourseBrief, authorName: string): Course {
  const outline = LocalProvider.generateOutline(brief, []);
  const course = LocalProvider.generateCourse(outline, brief, []);
  course.authorName = authorName;
  for (const m of course.modules) for (const l of m.lessons) l.minutes = lessonMinutes(l.blocks);
  return course;
}

export function buildSeedCourses(authorName: string): Course[] {
  const commBrief = TEMPLATES[3].brief;
  const comm = buildCourseFromBrief(commBrief, authorName);
  comm.status = "published";
  comm.cover = COVER_ART;
  comm.theme = { ...comm.theme, styleName: "Professional" };
  comm.settings = { ...comm.settings, completionRule: "assessment", passMark: 80 };
  comm.createdAt = Date.now() - 1000 * 60 * 60 * 24 * 12;
  comm.updatedAt = Date.now() - 1000 * 60 * 60 * 3;

  const onbBrief = TEMPLATES[0].brief;
  const onb = buildCourseFromBrief(onbBrief, authorName);
  onb.status = "draft";
  onb.cover = GRADIENTS[1];
  onb.createdAt = Date.now() - 1000 * 60 * 60 * 24 * 2;
  onb.updatedAt = Date.now() - 1000 * 60 * 22;

  return [comm, onb];
}

/* Demo learner attempts so analytics have life on first load. */
export function seedAttempts(course: Course) {
  const names = ["Maya R.", "Jonas K.", "Priya S.", "Tomás A.", "Lena W.", "Omar H.", "Grace N.", "Felix B."];
  const qIds: string[] = [];
  for (const m of course.modules) for (const l of m.lessons) for (const b of l.blocks) {
    if (b.kind === "quiz") b.questions.forEach((q) => qIds.push(q.id));
    if (b.kind === "question") qIds.push(b.q.id);
  }
  return names.map((n, i) => {
    const score = [92, 78, 100, 84, 66, 95, 88, 71][i];
    /* per-question outcomes consistent with the attempt score */
    const questionStats = qIds.map((qid, qi) => ({
      questionId: qid,
      correct: qi < Math.round((score / 100) * qIds.length) - (i % 2 === 1 && qi === qIds.length - 1 ? 1 : 0),
    }));
    return {
      id: uid(), courseId: course.id, learner: n,
      ts: Date.now() - (i + 1) * 1000 * 60 * 60 * (6 + i * 3),
      score,
      passed: score >= 80,
      completed: i !== 4,
      seconds: 900 + i * 240,
      questionStats,
    };
  });
}
