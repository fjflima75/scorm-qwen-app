/* AI service layer.
   `AIProvider` is the contract any model backend must satisfy (OpenAI, Anthropic, Gemini…).
   `LocalProvider` is the built-in deterministic engine: it applies real instructional-design
   structure (chunking, worked examples, retrieval practice, scenario practice, formative checks)
   and — when source documents are supplied — grounds content and questions in that text. */

import { Block, BlockNoId, Course, ID, Lesson, Module, Question, SourceDoc, defaultSettings, defaultTheme, uid } from "./types";

export interface CourseBrief {
  title: string;
  topic: string;
  audience: string;
  duration: string;
  difficulty: "Introductory" | "Intermediate" | "Advanced";
  language: string;
  tone: string;
  industry: string;
  objectives: string[];
}

export interface OutlineLesson { title: string; kind: Lesson["kind"]; purpose: string }
export interface OutlineModule { title: string; description: string; lessons: OutlineLesson[] }
export interface CourseOutline { title: string; description: string; objectives: string[]; modules: OutlineModule[]; assessmentNote: string }

export interface QuizOpts { count: number; difficulty: Question["difficulty"]; types: Question["type"][]; passMark: number; mode: "practice" | "graded" }

export type RewriteIntent = "shorter" | "longer" | "professional" | "simpler" | "example" | "engaging";

export interface AIProvider {
  id: string;
  name: string;
  generateOutline(brief: CourseBrief, sources: SourceDoc[]): CourseOutline;
  generateCourse(outline: CourseOutline, brief: CourseBrief, sources: SourceDoc[]): Course;
  generateQuiz(course: Course, lessonId: ID | null, opts: QuizOpts): Question[];
  rewrite(text: string, intent: RewriteIntent): string;
  suggestBlock(course: Course, lessonId: ID): { kind: Block["kind"]; reason: string };
  narrationScript(lesson: Lesson): string;
}

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */
const STOP = new Set(("the,a,an,and,or,but,of,to,in,on,for,with,at,by,from,is,are,was,were,be,been,this,that,these,those,it,its,as,not,no,you,your,they,their,we,our,can,will,when,what,which,who,how,why,do,does,did,have,has,had,about,into,than,then,them,there,here,if,so,such,also,more,most,some,any,each,other,one,two,three,new,use,using,used,may,might,must,should,could,would,like,make,makes,way,ways,help,helps,many,much,very,just,only,over,under,between,during,while,after,before,because,through,both,every,all,own,same,too,up,out,off,down,now,people,person,work,works,working").split(","));

function keywords(text: string, n = 6): string[] {
  const words = text.toLowerCase().replace(/[^a-zà-ÿ0-9\s'-]/gi, " ").split(/\s+/).filter((w) => w.length > 5 && !STOP.has(w));
  const freq = new Map<string, number>();
  words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map(([w]) => w);
}

function sentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);
}

function sourceChunks(sources: SourceDoc[], n: number): string[][] {
  const all = sources.filter((s) => s.text.trim()).flatMap((s) => sentences(s.text));
  if (!all.length) return [];
  const per = Math.max(2, Math.ceil(all.length / n));
  const chunks: string[][] = [];
  for (let i = 0; i < all.length && chunks.length < n; i += per) chunks.push(all.slice(i, i + per));
  return chunks;
}

const kw = (s: string) => s.length > 2 ? s[0].toUpperCase() + s.slice(1) : s;

/* ------------------------------------------------------------------ */
/* Content bank — communication topic (used by seed-quality output)   */
/* ------------------------------------------------------------------ */
function communicationCourse(o: CourseOutline, brief: CourseBrief): { modules: Module[] } {
  const aud = brief.audience || "your team";
  const M = (title: string, description: string, lessons: Lesson[]): Module => ({ id: uid(), title, description, lessons });
  const L = (title: string, kind: Lesson["kind"], blocks: Block[]): Lesson => ({ id: uid(), title, kind, minutes: 0, blocks });
  const B = (b: BlockNoId): Block => ({ id: uid(), ...b } as Block);

  const m1 = M("Foundations of effective communication", "Why communication fails, and the model behind every clear message.", [
    L("Why messages misfire", "lesson", [
      B({ kind: "heading", text: "The gap between intent and impact", level: 2 }),
      B({ kind: "text", paragraphs: [
        `Most workplace friction is not caused by bad intentions — it is caused by bad transmission. Research on workplace error consistently finds that a large share of mistakes trace back to a message that was sent clearly in the sender's head but received differently by the audience.`,
        `For ${aud}, the cost shows up as rework, missed deadlines and quiet disengagement. In this course you will learn to close that gap deliberately, not accidentally.`,
      ]}),
      B({ kind: "callout", tone: "info", title: "Key idea", body: "Communication is not what you say — it is what the other person understands. The meaning of your message is the response you get." }),
      B({ kind: "keyPoints", title: "Three filters every message passes through", points: [
        { title: "Assumption", body: "What you believe the other person already knows. When wrong, your message loses its foundations." },
        { title: "Attention", body: "What the other person can actually process right now. Overloaded people hear fragments, not speeches." },
        { title: "Emotion", body: "How the message makes them feel. Emotion decides whether the door to understanding is open or closed." },
      ]}),
      B({ kind: "reveal", prompt: "Reflect: when did a message of yours land wrong?", body: "Think of one recent message that was misunderstood. Which filter — assumption, attention or emotion — distorted it? Naming the filter is the first repair skill you will practise here." }),
    ]),
    L("A simple model for clear messages", "lesson", [
      B({ kind: "heading", text: "Purpose → Audience → Message → Check", level: 2 }),
      B({ kind: "text", paragraphs: [
        `Clear communicators run the same four-step loop, whether in a two-line chat message or a board presentation.`,
      ]}),
      B({ kind: "timeline", title: "The clarity loop", items: [
        { title: "1 · Purpose", body: "Decide what the recipient should know, feel or do afterwards. One purpose per message." },
        { title: "2 · Audience", body: "What do they already know, and what do they care about? This sets your level of detail." },
        { title: "3 · Message", body: "Lead with the headline. One idea per sentence. Concrete beats abstract." },
        { title: "4 · Check", body: "Ask for the read-back: “So we're aligned — what's your next step?”" },
      ]}),
      B({ kind: "quote", text: "The single biggest problem in communication is the illusion that it has taken place.", attribution: "George Bernard Shaw" }),
      B({ kind: "question", q: { id: uid(), type: "mcq", prompt: "In the clarity loop, what belongs in the “Check” step?", options: ["Restating your own message louder", "Asking the recipient to confirm their understanding and next step", "Adding more detail until they agree", "Escalating to a manager"], correct: [1], explanation: "The Check verifies understanding, not agreement. A read-back (“what's your next step?”) surfaces gaps while they are still cheap to fix.", difficulty: "easy", objective: "Apply the clarity loop" } }),
    ]),
    L("Knowledge check: foundations", "check", [
      B({ kind: "quiz", title: "Check your understanding", mode: "practice", passMark: 0, shuffle: false, showExplanations: true, questions: [
        { id: uid(), type: "tf", prompt: "A message's meaning is defined by the sender's intent.", options: ["True", "False"], correct: [1], explanation: "Meaning lives with the receiver. If the audience understood something else, that is what was communicated.", difficulty: "easy", objective: "Define effective communication" },
        { id: uid(), type: "mcq", prompt: "Which is the best opening for a message with a busy audience?", options: ["Context first, ask at the end", "The request or headline first, then context", "A long greeting to build rapport", "All details in one paragraph"], correct: [1], explanation: "Busy readers scan. Front-loading the headline respects attention and raises the chance the rest gets read.", difficulty: "easy", objective: "Structure messages for busy audiences" },
        { id: uid(), type: "multi", prompt: "Which of these are “filters” that distort every message? (Select all that apply)", options: ["Assumption", "Attention", "Emotion", "Font size"], correct: [0, 1, 2], explanation: "Assumption, attention and emotion shape what is received. Font size is a presentation detail, not a communication filter.", difficulty: "medium", objective: "Identify communication filters" },
      ]}),
    ]),
  ]);

  const m2 = M("Active listening", "Hear what is actually being said — including what is not said.", [
    L("Listening to understand, not to reply", "lesson", [
      B({ kind: "heading", text: "Three levels of listening", level: 2 }),
      B({ kind: "text", paragraphs: [
        `Most of us listen at level one — while mentally drafting our reply. Active listening means moving to level two (full focus on the other person) and, in important conversations, level three (noticing tone, pace and what is left unsaid).`,
      ]}),
      B({ kind: "accordion", items: [
        { title: "Level 1 · Internal listening", body: "Focus is on your own thoughts: your reply, your agenda, your lunch. Useful in low-stakes chat — dangerous in conflict." },
        { title: "Level 2 · Focused listening", body: "Full attention on the speaker's words. You can summarise their point back accurately." },
        { title: "Level 3 · Global listening", body: "You also read energy, hesitation and emotion. This is where trust is built and risks are spotted early." },
      ]}),
      B({ kind: "flipcards", prompt: "Flip each card to see the listening move behind it.", cards: [
        { front: "Paraphrase", back: "“So what you're saying is…” — proves you tracked the content and gives the speaker a chance to correct you." },
        { front: "Label", back: "“That sounds frustrating.” — names the emotion without judging it, which lowers defensiveness." },
        { front: "Question", back: "“What happened next?” — open questions pull out the detail assumptions usually skip." },
        { front: "Silence", back: "A two-second pause invites the speaker to finish the real thought, not just the polite one." },
      ]}),
      B({ kind: "question", q: { id: uid(), type: "mcq", prompt: "A colleague sounds flat while describing a project delay. Which response uses Level 3 listening?", options: ["“Delays happen — what's the new date?”", "“You sound discouraged about this. Want to talk it through?”", "“Let's stay positive and move on.”", "“I predicted this last week.”"], correct: [1], explanation: "Level 3 listening responds to the emotion behind the words. Naming it invites the real issue to the surface.", difficulty: "medium", objective: "Practise active listening levels" } }),
    ]),
    L("Knowledge check: active listening", "check", [
      B({ kind: "quiz", title: "Active listening check", mode: "practice", passMark: 0, shuffle: false, showExplanations: true, questions: [
        { id: uid(), type: "mcq", prompt: "Which is a paraphrase?", options: ["“That sounds frustrating.”", "“So the deadline moved because the supplier slipped — is that right?”", "“What happened next?”", "“Interesting.”"], correct: [1], explanation: "Paraphrasing restates content for verification. “That sounds frustrating” is labelling; “what happened next?” is questioning.", difficulty: "easy", objective: "Distinguish listening techniques" },
        { id: uid(), type: "tf", prompt: "Silence after a question usually weakens a conversation.", options: ["True", "False"], correct: [1], explanation: "A short pause gives the speaker room to reach the deeper, more honest answer.", difficulty: "easy", objective: "Use silence deliberately" },
      ]}),
    ]),
  ]);

  const m3 = M("Giving constructive feedback", "Make feedback land as a gift, not a verdict.", [
    L("The SBI model", "lesson", [
      B({ kind: "heading", text: "Situation → Behaviour → Impact", level: 2 }),
      B({ kind: "text", paragraphs: [
        `Feedback fails when it attacks identity (“you're careless”) instead of describing behaviour. The SBI model keeps feedback factual and receivable.`,
      ]}),
      B({ kind: "keyPoints", title: "SBI in one breath", points: [
        { title: "Situation", body: "Anchor to a specific moment: “In Tuesday's client call…”" },
        { title: "Behaviour", body: "Describe the observable action, camera-style: “…you interrupted the client twice while they described the defect.”" },
        { title: "Impact", body: "State the effect on work or people: “…they went quiet and we lost their requirements.”" },
      ]}),
      B({ kind: "callout", tone: "tip", title: "Add an I", body: "Finish with an invitation: “I'd like to agree a signal for next time — could we try that?” Feedback without a next step is just a verdict." }),
      B({ kind: "question", q: { id: uid(), type: "mcq", prompt: "Which statement follows SBI?", options: ["“You need to be more respectful in meetings.”", "“In yesterday's stand-up you cut off Ana twice; she stopped contributing after that. Can we talk about it?”", "“Everyone thinks you dominate meetings.”", "“Try to listen more, OK?”"], correct: [1], explanation: "Only option B names a situation, an observable behaviour and a concrete impact — then invites dialogue.", difficulty: "medium", objective: "Apply the SBI feedback model" } }),
    ]),
    L("Receiving feedback without collapsing", "lesson", [
      B({ kind: "heading", text: "Separate the what from the how", level: 2 }),
      B({ kind: "text", paragraphs: [
        `Feedback is hard to receive because we hear identity threat. The skill is to extract the data even when the delivery is clumsy.`,
      ]}),
      B({ kind: "timeline", title: "A 30-second receiving routine", items: [
        { title: "Breathe, don't rebut", body: "Your first job is to stay in the room. Defending first means learning second." },
        { title: "Clarify the example", body: "“Can you give me the moment you mean?” Concrete examples convert opinion into data." },
        { title: "Find the 10%", body: "Even clumsy feedback is usually 10% true. Find it and thank them for it — that invites better feedback next time." },
      ]}),
      B({ kind: "reveal", prompt: "Try it now: what is one piece of feedback you have been avoiding?", body: "Ask the person who gave it for one concrete example. Notice whether the fear shrinks once the feedback becomes a specific moment instead of a character verdict." }),
    ]),
    L("Knowledge check: feedback", "check", [
      B({ kind: "quiz", title: "Feedback check", mode: "practice", passMark: 0, shuffle: false, showExplanations: true, questions: [
        { id: uid(), type: "mcq", prompt: "Which part of SBI is missing from “You were rude in the meeting”?", options: ["Situation", "Observable behaviour — “rude” is a verdict, not a behaviour", "Impact", "Nothing is missing"], correct: [1], explanation: "“Rude” is an interpretation. SBI needs a camera-style description of what was actually said or done.", difficulty: "medium", objective: "Apply the SBI feedback model" },
        { id: uid(), type: "fill", prompt: "In SBI, the letter I stands for ______.", answer: "impact", explanation: "Impact connects the behaviour to a consequence for the work or the team — it is what makes feedback worth acting on.", difficulty: "easy", objective: "Recall the SBI model" },
      ]}),
    ]),
  ]);

  const m4 = M("Difficult conversations", "Structure for the moments you want to postpone.", [
    L("Open hard conversations safely", "lesson", [
      B({ kind: "heading", text: "The first 60 seconds decide the conversation", level: 2 }),
      B({ kind: "text", paragraphs: [
        `Difficult conversations derail in the opening: blame, ambush or vagueness triggers defence and the rest is theatre. A safe opening has three parts.`,
      ]}),
      B({ kind: "keyPoints", title: "A safe opening in three parts", points: [
        { title: "Shared purpose", body: "“I want us to solve the handover problem together.” State what you both want before what went wrong." },
        { title: "Facts, briefly", body: "One or two observable facts, no adjectives. “The last two releases shipped without the test report.”" },
        { title: "Invite their view", body: "“What am I missing?” — said like you mean it. Their answer often changes your plan for the conversation." },
      ]}),
      B({ kind: "callout", tone: "warning", title: "Avoid the sandwich", body: "Praise–criticism–praise teaches people to flinch at compliments. Be kind and direct instead: kind about the person, direct about the issue." }),
      B({ kind: "scenario", title: "The missed deadline", intro: "Your teammate Sam has missed two deadlines this sprint. You need to raise it without damage.", steps: [
        { situation: "You book 15 minutes and open with: “I want to talk about the last two deadlines — can I share what I noticed and hear your side?” Sam nods.", character: "Sam", choices: [
          { text: "Describe the two missed dates and the effect on the release train, then ask what happened.", feedback: "Strong. Facts plus curiosity keeps the conversation about the work, not the person.", good: true },
          { text: "“I know you're swamped, ignore this if it's fine — but deadlines kind of matter, right?”", feedback: "The softening erased the message. Sam heard “not important”.", good: false },
          { text: "“This is the second time. I have to flag this to your manager if it happens again.”", feedback: "A threat before a diagnosis ends honesty. Sam will now manage you, not the problem.", good: false },
        ]},
        { situation: "Sam explains the QA environment has been down for a week and they stayed silent to avoid “being a complainer”.", character: "Sam", choices: [
          { text: "“Thanks for telling me — that changes things. Let's raise the environment issue together and agree how to flag blockers earlier.”", feedback: "You converted silence into a system fix and rewarded honesty. Textbook.", good: true },
          { text: "“Well, you should have said something sooner.”", feedback: "True — and punishing honesty guarantees silence next time.", good: false },
        ]},
      ], summary: "Hard conversations go well when you open with shared purpose and facts, then treat the other person's view as data — not defence." }),
    ]),
    L("Knowledge check: difficult conversations", "check", [
      B({ kind: "quiz", title: "Difficult conversations check", mode: "practice", passMark: 0, shuffle: false, showExplanations: true, questions: [
        { id: uid(), type: "multi", prompt: "Which elements belong in a safe opening? (Select all that apply)", options: ["Shared purpose", "A brief statement of observable facts", "An invitation to hear their view", "A warning about consequences"], correct: [0, 1, 2], explanation: "Purpose, facts and invitation lower defensiveness. Leading with consequences triggers it.", difficulty: "medium", objective: "Structure difficult conversations" },
        { id: uid(), type: "tf", prompt: "The praise–criticism–praise “sandwich” is the recommended structure for hard feedback.", options: ["True", "False"], correct: [1], explanation: "The sandwich blurs the message and erodes trust in praise. Be kind about the person, direct about the issue.", difficulty: "easy", objective: "Choose feedback structures" },
      ]}),
    ]),
  ]);

  const m5 = M("Practical scenarios", "Deliberate practice across realistic situations.", [
    L("Scenario gym", "lesson", [
      B({ kind: "heading", text: "Practise before it is real", level: 2 }),
      B({ kind: "text", paragraphs: [`Skills stick when rehearsed under slight pressure. Work through each situation below — notice the instinct you reach for first, then check the feedback.`] }),
      B({ kind: "scenario", title: "The angry customer", intro: "A customer emails in capitals: their delivery is late for the second time and they want to cancel.", steps: [
        { situation: "First response, within the hour.", character: "Customer", choices: [
          { text: "Acknowledge the two failures specifically, own them without excuses, and give a concrete recovery time.", feedback: "Specific ownership de-escalates. Vague apology reads as a template.", good: true },
          { text: "Explain the logistics backlog in detail so they understand it is not your fault.", feedback: "Explanation before acknowledgement reads as excuse. They cancel.", good: false },
        ]},
        { situation: "They reply calmer but ask for a discount “or else”.", character: "Customer", choices: [
          { text: "Offer the agreed service credit, confirm the new delivery slot, and propose a check-in call after delivery.", feedback: "You gave fairness plus a path to trust. The account is likely saved.", good: true },
          { text: "Refuse — discounts reward bad behaviour.", feedback: "Technically a policy, relationally a door-slam after you rebuilt trust.", good: false },
        ]},
      ], summary: "De-escalation = specific acknowledgement + ownership + concrete next step. Discounts come after trust, not instead of it." }),
      B({ kind: "checklist", title: "Your communication pre-flight", items: [
        "One purpose per message — written down before I send",
        "Headline first for busy readers",
        "Asked for a read-back on anything that matters",
        "Paraphrased before replying in tense threads",
        "Feedback anchored to a situation and a behaviour, never identity",
        "Hard conversations opened with shared purpose and an invitation",
      ]}),
    ]),
  ]);

  const m6 = M("Final assessment", "Demonstrate you can apply the course under exam conditions.", [
    L("Final assessment", "assessment", [
      B({ kind: "quiz", title: "Final assessment", mode: "graded", passMark: 80, shuffle: true, showExplanations: true, questions: [
        { id: uid(), type: "mcq", prompt: "A stakeholder keeps replying “fine” to your weekly updates. The clarity loop says your next move is…", options: ["Send longer, more detailed updates", "Ask for a read-back: what they will do with the information", "Stop sending updates", "Escalate to their manager"], correct: [1], explanation: "“Fine” gives you no verification. The Check step asks for the recipient's understanding or next action.", difficulty: "medium", objective: "Apply the clarity loop" },
        { id: uid(), type: "mcq", prompt: "During a retrospective, Priya says the release “was basically chaos”. The best Level-2 listening move is…", options: ["“Chaos is a strong word.”", "“Can you walk me through the moment it felt that way?”", "“At least we shipped.”", "Stay silent and move to the next agenda item"], correct: [1], explanation: "An open question converts a verdict into concrete examples you can act on.", difficulty: "medium", objective: "Practise active listening levels" },
        { id: uid(), type: "mcq", prompt: "Which is camera-style behaviour feedback?", options: ["“You seem disengaged lately.”", "“You looked at your phone through most of the client demo.”", "“You don't care about clients.”", "“Be more present, please.”"], correct: [1], explanation: "A camera records actions, not traits. Only option B describes what a recording would show.", difficulty: "medium", objective: "Apply the SBI feedback model" },
        { id: uid(), type: "order", prompt: "Put the steps of a safe opening in order.", options: ["State shared purpose", "Give one or two observable facts", "Invite their view"], correct: [0, 1, 2], explanation: "Purpose first lowers threat; facts ground the issue; inviting their view turns a monologue into a conversation.", difficulty: "hard", objective: "Structure difficult conversations" },
        { id: uid(), type: "tf", prompt: "In an escalation email, context should come before the request so the reader understands the background.", options: ["True", "False"], correct: [1], explanation: "Escalation readers are busy and need the ask immediately; context supports the request afterwards.", difficulty: "medium", objective: "Structure messages for busy audiences" },
        { id: uid(), type: "fill", prompt: "In SBI, feedback should describe ______ actions rather than personality traits.", answer: "observable", explanation: "Observable (camera-style) actions are specific and contestable — traits are verdicts that trigger defence.", difficulty: "medium", objective: "Recall the SBI model" },
        { id: uid(), type: "multi", prompt: "Which of these help a difficult conversation stay productive? (Select all that apply)", options: ["Naming a shared purpose up front", "Describing facts without adjectives", "Asking “what am I missing?”", "Saving the hardest point for the final minute"], correct: [0, 1, 2], explanation: "Purpose, clean facts and genuine curiosity keep defence low. An ambush ending destroys everything built before it.", difficulty: "hard", objective: "Structure difficult conversations" },
        { id: uid(), type: "mcq", prompt: "A teammate apologises profusely after a mistake. The most constructive reply is…", options: ["“It's fine, don't worry about it.”", "“Thanks for owning it. What would prevent it next time?”", "“Yes, that was a big mistake.”", "“I'll fix it myself from now on.”"], correct: [1], explanation: "Accept the ownership, then move to the system fix. Absolving skips learning; blaming skips trust.", difficulty: "medium", objective: "Give constructive feedback" },
      ]}),
    ]),
  ]);

  return { modules: [m1, m2, m3, m4, m5, m6] };
}

/* ------------------------------------------------------------------ */
/* Generic generator (any topic)                                      */
/* ------------------------------------------------------------------ */
function genericCourse(o: CourseOutline, brief: CourseBrief, sources: SourceDoc[]): { modules: Module[] } {
  const t = brief.topic || "this topic";
  const aud = brief.audience || "learners";
  const tone = brief.tone.toLowerCase();
  const opener = tone.includes("friendly") ? "Let's make this practical." : tone.includes("bold") ? "No filler — just what works." : "Here is what matters and why.";
  const B = (b: BlockNoId): Block => ({ id: uid(), ...b } as Block);
  const chunks = sourceChunks(sources, Math.max(2, o.modules.length - 1));

  const modules: Module[] = o.modules.map((om, mi) => {
    const lessons: Lesson[] = om.lessons.map((ol) => {
      const chunk = chunks.length ? chunks[Math.min(mi, chunks.length - 1)] : [];
      const grounded = chunk.length >= 2;
      const body = grounded ? chunk : [
        `${ol.purpose} For ${aud}, this is where ${t} stops being theory and starts changing decisions.`,
        `${opener} The core idea of “${ol.title}” is simple to state and takes deliberate practice to own — the activities in this lesson are the practice.`,
        `Notice how this connects to the course objectives: ${o.objectives.slice(0, 2).join("; ")}.`,
      ];
      const kws = keywords(body.join(" "), 4);
      const blocks: Block[] = [
        B({ kind: "heading", text: ol.title, level: 2 }),
        B({ kind: "text", paragraphs: body.slice(0, 2) }),
        B({ kind: "callout", tone: "info", title: "Why this matters", body: grounded ? sentences(chunk.join(" ")).slice(-1)[0] || ol.purpose : `${ol.purpose} Mastery here compounds across every module that follows.` }),
      ];
      if (grounded && body.length > 2) blocks.push(B({ kind: "accordion", items: body.slice(2).map((p, i) => ({ title: `Detail ${i + 1} — ${keywords(p, 2).map(kw).join(" & ") || "deeper look"}`, body: p })) }));
      else blocks.push(B({ kind: "keyPoints", title: "Key points", points: [
        { title: kw(kws[0] || "principle"), body: `The underlying principle of “${ol.title}” and how ${aud} typically misapply it at first.` },
        { title: kw(kws[1] || "practice"), body: `The smallest daily practice that builds this skill — aim for one repetition per day this week.` },
        { title: kw(kws[2] || "pitfall"), body: `The most common failure mode, and the early warning sign that you are drifting into it.` },
      ]}));
      blocks.push(B({ kind: "flipcards", prompt: "Test your recall — flip to check.", cards: [
        { front: `In one line: what is “${ol.title}” about?`, back: ol.purpose },
        { front: `Name one pitfall for ${aud}.`, back: `Treating it as theory. The failure mode is doing nothing differently after the lesson — attach it to a real decision this week.` },
      ]}));
      if (ol.kind === "check") {
        blocks.push(B({ kind: "quiz", title: "Knowledge check", mode: "practice", passMark: 0, shuffle: false, showExplanations: true, questions: clozeQuestions(body.join(" "), 2, t) }));
      } else {
        blocks.push(B({ kind: "question", q: clozeQuestions(body.join(" "), 1, t)[0] }));
      }
      return { id: uid(), title: ol.title, kind: ol.kind, minutes: 0, blocks };
    });
    return { id: uid(), title: om.title, description: om.description, lessons };
  });
  return { modules };
}

function clozeQuestions(text: string, count: number, topic: string): Question[] {
  const sents = sentences(text);
  const qs: Question[] = [];
  for (let i = 0; i < sents.length && qs.length < count; i++) {
    const s = sents[i];
    const words = s.split(" ").filter((w) => w.replace(/[^a-zA-Zà-ÿ-]/g, "").length > 6 && !STOP.has(w.toLowerCase()));
    if (!words.length) continue;
    const target = words.reduce((a, b) => (b.length > a.length ? b : a), words[0]).replace(/[.,;:!?]$/, "");
    const blanked = s.replace(target, "______");
    const distractors = keywords(sents.filter((x) => x !== s).join(" ") || topic, 6).filter((k) => k !== target.toLowerCase()).slice(0, 3);
    while (distractors.length < 3) distractors.push(["context", "process", "outcome"][distractors.length]);
    qs.push({
      id: uid(), type: "fill", prompt: `Fill in the blank: “${blanked}”`, answer: target.toLowerCase(),
      explanation: `The source material states: “${s}”`, difficulty: "medium", objective: `Recall key ideas about ${topic}`,
    });
    if (qs.length < count) {
      qs.push({
        id: uid(), type: "tf", prompt: `True or false: “${s.replace(target, distractors[0])}”`, options: ["True", "False"], correct: [1],
        explanation: `Not quite — the original statement refers to “${target}”. Source: “${s}”`, difficulty: "easy", objective: `Verify understanding of ${topic}`,
      });
    }
  }
  while (qs.length < count) {
    qs.push({
      id: uid(), type: "mcq", prompt: `Which best captures the focus of this lesson on ${topic}?`, options: [`Applying the core ideas to a real ${topic.toLowerCase()} decision`, `Memorising definitions`, `Skipping practice activities`, `Avoiding the topic at work`],
      correct: [0], explanation: "The lesson emphasises applied practice over memorisation.", difficulty: "easy", objective: `Engage with ${topic}`,
    });
  }
  return qs.slice(0, count);
}

/* ------------------------------------------------------------------ */
/* LocalProvider                                                      */
/* ------------------------------------------------------------------ */
export const LocalProvider: AIProvider = {
  id: "local",
  name: "Lessonsmith Engine (on-device)",

  generateOutline(brief, sources) {
    const t = brief.topic || brief.title || "New course";
    const isComm = /communicat|feedback|listening|conversation/i.test(t);
    if (isComm || /workplace communication/i.test(brief.title)) return communicationOutline(brief);
    const aud = brief.audience || "learners";
    const objs = brief.objectives.length ? brief.objectives : [
      `Explain the core concepts of ${t.toLowerCase()}`, `Apply them in a realistic ${aud} scenario`, `Self-assess with a scored final quiz`];
    const n = brief.duration.includes("15") ? 2 : brief.duration.includes("45") || brief.duration.includes("60") ? 4 : 3;
    const modules: OutlineModule[] = [
      { title: `Foundations of ${t}`, description: `The mental model ${aud} need before anything else.`, lessons: [
        { title: `What “${t}” really means`, kind: "lesson", purpose: "Define the concept and remove misconceptions" },
        { title: "Knowledge check: foundations", kind: "check", purpose: "Retrieval practice on the core definitions" },
      ]},
      { title: "Core principles in practice", description: "Turn the model into working habits.", lessons: [
        { title: "The principles that matter most", kind: "lesson", purpose: "Present the 3–4 principles with worked examples" },
        { title: "Common mistakes and how to spot them", kind: "lesson", purpose: "Contrast correct and incorrect application" },
      ]},
      { title: "Applying it to real work", description: "Deliberate practice on realistic situations.", lessons: [
        { title: "Worked example walkthrough", kind: "lesson", purpose: "Show a complete application end to end" },
        { title: "Knowledge check: application", kind: "check", purpose: "Scenario-adjacent retrieval questions" },
      ]},
    ];
    if (n >= 4) modules.splice(2, 0, { title: "Going deeper", description: "Edge cases, nuance and advanced moves.", lessons: [
      { title: "Edge cases and nuance", kind: "lesson", purpose: "Cover the situations where the simple rule breaks" },
    ]});
    if (sources.some((s) => s.text.length > 200)) modules.forEach((m, i) => { if (i > 0) m.description += " Drawn from your source material."; });
    return {
      title: brief.title || `${t} Essentials`,
      description: `A ${brief.difficulty.toLowerCase()} course on ${t.toLowerCase()} for ${aud}. ${brief.tone} tone, roughly ${brief.duration} of learning with retrieval practice throughout.`,
      objectives: objs,
      modules,
      assessmentNote: "A scored final assessment (8 questions, 80% pass mark) closes the course; each module ends with a low-stakes knowledge check.",
    };
  },

  generateCourse(outline, brief, sources) {
    const isComm = /communicat|feedback|listening|conversation/i.test(brief.topic) || /workplace communication/i.test(outline.title);
    const content = isComm ? communicationCourse(outline, brief) : genericCourse(outline, brief, sources);
    const course: Course = {
      schemaVersion: 1, id: uid(), title: outline.title, description: outline.description,
      topic: brief.topic, audience: brief.audience, objectives: outline.objectives,
      status: "draft", aiGenerated: true, cover: "", theme: defaultTheme(), settings: defaultSettings(),
      modules: content.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l, minutes: 0 })) })),
      comments: [], createdAt: Date.now(), updatedAt: Date.now(), authorName: "",
    };
    return course;
  },

  generateQuiz(course, lessonId, opts) {
    const scope = lessonId ? findLessonText(course, lessonId) : course.modules.flatMap((m) => m.lessons.flatMap((l) => l.blocks.filter((b) => b.kind === "text").flatMap((b) => (b as any).paragraphs))).join(" ");
    const text = scope || course.description || course.topic;
    const base = clozeQuestions(text, opts.count, course.topic || "this course");
    const byType: Question[] = [];
    for (let i = 0; i < base.length; i++) {
      const want = opts.types[i % opts.types.length] || "mcq";
      const q = base[i];
      if (q.type === want) { byType.push(q); continue; }
      const sents2 = sentences(text);
      const src = sents2[i % Math.max(1, sents2.length)] || text.slice(0, 120);
      if (want === "tf") byType.push({ id: uid(), type: "tf", prompt: `True or false: “${src.slice(0, 110)}…”`, options: ["True", "False"], correct: [0], explanation: `The course material states this directly.`, difficulty: opts.difficulty, objective: `Verify understanding` });
      else if (want === "mcq") byType.push({ id: uid(), type: "mcq", prompt: `Based on the course material, which is correct?`, options: [src.slice(0, 90), "None of the material supports this claim", "The opposite of what the lesson teaches", "This is not covered in the course"], correct: [0], explanation: `Option 1 reflects the source: “${src.slice(0, 80)}…”`, difficulty: opts.difficulty, objective: "Apply course content" });
      else if (want === "multi") byType.push({ id: uid(), type: "multi", prompt: "Which of the following reflect ideas from this material? (Select all that apply)", options: [src.slice(0, 80), keywords(text, 3).map(kw).join(", ") + " as discussed", "Unrelated best practices from other fields", "Content not covered in this course"], correct: [0, 1], explanation: "The first two options are grounded in the course material.", difficulty: opts.difficulty, objective: "Distinguish covered content" });
      else if (want === "order") byType.push({ id: uid(), type: "order", prompt: `Arrange these ideas in the order the course presents them.`, options: keywords(text, 3).map(kw), correct: [0, 1, 2], explanation: "The course introduces these ideas in this sequence.", difficulty: opts.difficulty, objective: "Recall course structure" });
      else byType.push(q);
    }
    return byType.slice(0, opts.count);
  },

  rewrite(text, intent) {
    const sents2 = sentences(text);
    switch (intent) {
      case "shorter": return sents2.slice(0, Math.max(1, Math.ceil(sents2.length / 2))).join(" ");
      case "longer": return text + " In practice, this means choosing the behaviour deliberately the next time the situation arises — once, then reflecting on what changed.";
      case "professional": return text.replace(/\byou\b/gi, "teams").replace(/\blet's\b/gi, "it is recommended to").replace(/\bOK\b/g, "acceptable").replace(/!/g, ".").replace(/\bkind of\b|\bsort of\b|\bbasically\b|\breally\b/gi, "").replace(/\s{2,}/g, " ").trim();
      case "simpler": return text.replace(/deliberately/g, "on purpose").replace(/escalat\w+/gi, "pass it up").replace(/implement\w*/gi, "start").replace(/utiliz\w*/gi, "use").replace(/approximately/g, "about").replace(/demonstrate/g, "show").replace(/facilitate/g, "help");
      case "example": return text + " For example: in your next team meeting, try this once and note what happens differently — the contrast is usually visible within the hour.";
      case "engaging": return "Here's the thing most people miss: " + text.charAt(0).toLowerCase() + text.slice(1);
    }
  },

  suggestBlock(course, lessonId) {
    const text = findLessonText(course, lessonId).toLowerCase();
    if (/(first|then|step|stage|phase)/.test(text)) return { kind: "timeline", reason: "This lesson describes a sequence — a timeline makes the order memorable." };
    if (/(mistake|myth|vs\.?|versus|compare)/.test(text)) return { kind: "flipcards", reason: "There are contrasting ideas here — flip cards build recall through contrast." };
    if (/(term|defin|model|framework)/.test(text)) return { kind: "accordion", reason: "Definitions compress well into an accordion learners can self-test with." };
    if (/(scenario|customer|conversation|situation)/.test(text)) return { kind: "scenario", reason: "The content describes a situation with choices — scenario practice beats explanation here." };
    return { kind: "keyPoints", reason: "The lesson carries several parallel ideas — key points keep them scannable and chunked." };
  },

  narrationScript(lesson) {
    const headings = lesson.blocks.filter((b) => b.kind === "heading").map((b) => (b as any).text);
    return `Welcome to “${lesson.title}”. ${headings.length ? `We will cover: ${headings.join("; ")}. ` : ""}Take it at your own pace — the knowledge checks are there to help, not to judge. Let's begin.`;
  },
};

function communicationOutline(brief: CourseBrief): CourseOutline {
  return {
    title: brief.title || "Workplace Communication Essentials",
    description: "A practical course that turns communication from a soft skill into a repeatable system: clear messages, real listening, feedback that lands, and difficult conversations that stay productive.",
    objectives: brief.objectives.length ? brief.objectives : [
      "Apply the Purpose–Audience–Message–Check loop to everyday messages",
      "Use active listening techniques (paraphrase, label, question, silence)",
      "Give feedback with the SBI model and receive it without defensiveness",
      "Open difficult conversations with shared purpose, facts and invitation",
    ],
    modules: [
      { title: "Foundations of effective communication", description: "Why messages misfire and the loop behind every clear message.", lessons: [
        { title: "Why messages misfire", kind: "lesson", purpose: "Surface the intent–impact gap" },
        { title: "A simple model for clear messages", kind: "lesson", purpose: "Teach the clarity loop" },
        { title: "Knowledge check: foundations", kind: "check", purpose: "Retrieval practice" },
      ]},
      { title: "Active listening", description: "Hear what is actually being said.", lessons: [
        { title: "Listening to understand, not to reply", kind: "lesson", purpose: "Three levels of listening + techniques" },
        { title: "Knowledge check: active listening", kind: "check", purpose: "Retrieval practice" },
      ]},
      { title: "Giving constructive feedback", description: "Feedback that lands as a gift, not a verdict.", lessons: [
        { title: "The SBI model", kind: "lesson", purpose: "Situation–Behaviour–Impact" },
        { title: "Receiving feedback without collapsing", kind: "lesson", purpose: "Extract data from clumsy delivery" },
        { title: "Knowledge check: feedback", kind: "check", purpose: "Retrieval practice" },
      ]},
      { title: "Difficult conversations", description: "Structure for the moments you postpone.", lessons: [
        { title: "Open hard conversations safely", kind: "lesson", purpose: "Safe openings + scenario practice" },
        { title: "Knowledge check: difficult conversations", kind: "check", purpose: "Retrieval practice" },
      ]},
      { title: "Practical scenarios", description: "Deliberate practice on realistic situations.", lessons: [
        { title: "Scenario gym", kind: "lesson", purpose: "Angry customer + pre-flight checklist" },
      ]},
      { title: "Final assessment", description: "Scored assessment, 80% to pass.", lessons: [
        { title: "Final assessment", kind: "assessment", purpose: "Summative scoring" },
      ]},
    ],
    assessmentNote: "Every module ends with a formative knowledge check; the final assessment is scored with an 80% pass mark and full answer explanations.",
  };
}

function findLessonText(course: Course, lessonId: ID): string {
  for (const m of course.modules) {
    const l = m.lessons.find((x) => x.id === lessonId);
    if (l) return l.blocks.map((b) => {
      if (b.kind === "text") return b.paragraphs.join(" ");
      if (b.kind === "heading" || b.kind === "quote" || b.kind === "reveal") return (b as any).text || "";
      if (b.kind === "callout") return b.body;
      if (b.kind === "keyPoints") return b.points.map((p) => p.title + " " + p.body).join(" ");
      if (b.kind === "accordion" || b.kind === "tabs") return ((b as any).items || (b as any).tabs || []).map((i: any) => (i.body || "")).join(" ");
      if (b.kind === "timeline") return b.items.map((i) => i.title + " " + i.body).join(" ");
      return "";
    }).join(" ");
  }
  return "";
}

/* Provider registry — swap in OpenAI/Anthropic/Gemini adapters here. */
export const aiProviders: AIProvider[] = [LocalProvider];
export const getProvider = (id?: string): AIProvider => aiProviders.find((p) => p.id === id) || LocalProvider;

export const GENERATION_STAGES = [
  "Analyzing source material",
  "Designing learning objectives",
  "Structuring modules",
  "Writing lesson content",
  "Creating activities",
  "Generating assessment",
  "Preparing your course",
];

/* Learner-interface strings, translated for the player chrome. */
export const CHROME_STRINGS: Record<string, Record<string, string>> = {
  en: { next: "Next", prev: "Back", complete: "Mark complete", courseComplete: "Course complete", score: "Score", pass: "Passed", fail: "Not passed yet", restart: "Restart course", questions: "Questions", contents: "Contents", progress: "Progress", submit: "Check answers", correct: "Correct", incorrect: "Not quite", certificate: "Certificate of completion" },
  es: { next: "Siguiente", prev: "Atrás", complete: "Marcar como completado", courseComplete: "Curso completado", score: "Puntuación", pass: "Aprobado", fail: "Aún no aprobado", restart: "Reiniciar curso", questions: "Preguntas", contents: "Contenidos", progress: "Progreso", submit: "Comprobar respuestas", correct: "Correcto", incorrect: "No exactamente", certificate: "Certificado de finalización" },
  "pt-PT": { next: "Seguinte", prev: "Voltar", complete: "Marcar como concluído", courseComplete: "Curso concluído", score: "Pontuação", pass: "Aprovado", fail: "Ainda não aprovado", restart: "Recomeçar curso", questions: "Perguntas", contents: "Conteúdos", progress: "Progresso", submit: "Verificar respostas", correct: "Correto", incorrect: "Não exatamente", certificate: "Certificado de conclusão" },
  "pt-BR": { next: "Próximo", prev: "Voltar", complete: "Marcar como concluído", courseComplete: "Curso concluído", score: "Pontuação", pass: "Aprovado", fail: "Ainda não aprovado", restart: "Reiniciar curso", questions: "Perguntas", contents: "Conteúdos", progress: "Progresso", submit: "Verificar respostas", correct: "Correto", incorrect: "Não exatamente", certificate: "Certificado de conclusão" },
  fr: { next: "Suivant", prev: "Retour", complete: "Marquer comme terminé", courseComplete: "Cours terminé", score: "Score", pass: "Réussi", fail: "Pas encore réussi", restart: "Recommencer le cours", questions: "Questions", contents: "Sommaire", progress: "Progression", submit: "Vérifier les réponses", correct: "Correct", incorrect: "Pas tout à fait", certificate: "Certificat de réussite" },
  de: { next: "Weiter", prev: "Zurück", complete: "Als abgeschlossen markieren", courseComplete: "Kurs abgeschlossen", score: "Punktzahl", pass: "Bestanden", fail: "Noch nicht bestanden", restart: "Kurs neu starten", questions: "Fragen", contents: "Inhalt", progress: "Fortschritt", submit: "Antworten prüfen", correct: "Richtig", incorrect: "Nicht ganz", certificate: "Teilnahmezertifikat" },
  it: { next: "Avanti", prev: "Indietro", complete: "Segna come completato", courseComplete: "Corso completato", score: "Punteggio", pass: "Superato", fail: "Non ancora superato", restart: "Riavvia il corso", questions: "Domande", contents: "Indice", progress: "Progresso", submit: "Verifica le risposte", correct: "Corretto", incorrect: "Non esattamente", certificate: "Attestato di completamento" },
  nl: { next: "Volgende", prev: "Terug", complete: "Markeer als voltooid", courseComplete: "Cursus voltooid", score: "Score", pass: "Geslaagd", fail: "Nog niet geslaagd", restart: "Cursus herstarten", questions: "Vragen", contents: "Inhoud", progress: "Voortgang", submit: "Controleer antwoorden", correct: "Juist", incorrect: "Niet helemaal", certificate: "Certificaat van voltooiing" },
  ar: { next: "التالي", prev: "رجوع", complete: "وضع علامة مكتمل", courseComplete: "اكتمل المقرر", score: "النتيجة", pass: "ناجح", fail: "لم تنجح بعد", restart: "إعادة المقرر", questions: "أسئلة", contents: "المحتويات", progress: "التقدم", submit: "تحقق من الإجابات", correct: "صحيح", incorrect: "ليس تمامًا", certificate: "شهادة إتمام" },
  he: { next: "הבא", prev: "חזרה", complete: "סמן כהושלם", courseComplete: "הקורס הושלם", score: "ציון", pass: "עבר", fail: "עדיין לא עבר", restart: "התחל מחדש", questions: "שאלות", contents: "תכנים", progress: "התקדמות", submit: "בדוק תשובות", correct: "נכון", incorrect: "לא בדיוק", certificate: "תעודת השלמה" },
};

export const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish" }, { code: "fr", name: "French" },
  { code: "de", name: "German" }, { code: "it", name: "Italian" }, { code: "nl", name: "Dutch" },
  { code: "pt-PT", name: "Portuguese (Portugal)" }, { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ar", name: "Arabic" }, { code: "he", name: "Hebrew" },
];
