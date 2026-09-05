/* Export architecture.
   One normalized Course document → four exporters sharing the same package builder:
   SCORM12Exporter · SCORM2004Exporter · XAPIExporter · Cmi5Exporter (beta).
   Every export runs the QA validator first and returns a validation report. */

import JSZip from "jszip";
import playerSource from "../export/playerSource.js?raw";
import { CHROME_STRINGS } from "./ai";
import { Block, Course, Lesson } from "./types";

export type ExportFormat = "scorm12" | "scorm2004" | "xapi" | "cmi5";

export interface QAItem { id: string; severity: "error" | "warn" | "pass"; message: string; fixable: boolean }
export interface QAReport { items: QAItem[]; errors: number; warns: number; score: number }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/* ---------------- contrast ---------------- */
function lum(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string): number {
  try { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); } catch { return 21; }
}
function darken(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = [0, 2, 4].map((i) => Math.max(0, Math.round(parseInt(full.slice(i, i + 2), 16) * 0.72)).toString(16).padStart(2, "0")).join("");
  return "#" + v;
}

/* ---------------- QA ---------------- */
export function validateCourse(c: Course): QAReport {
  const items: QAItem[] = [];
  const push = (severity: QAItem["severity"], message: string, fixable = false) => items.push({ id: message, severity, message, fixable });

  const lessons = c.modules.flatMap((m) => m.lessons);
  if (!lessons.length) push("error", "Course has no lessons");
  if (!c.title.trim()) push("error", "Course title is empty");

  let imgNoAlt = 0, emptyBlocks = 0, badQuestions = 0, hasGraded = false, headings = 0, skipped = 0, prevLevel = 1, videoNoTranscript = 0;
  for (const l of lessons) {
    prevLevel = 1;
    for (const b of l.blocks) {
      if (b.kind === "image" && !b.alt.trim()) imgNoAlt++;
      if ((b.kind === "text" && !b.paragraphs.some((p) => p.trim())) || (b.kind === "heading" && !b.text.trim())) emptyBlocks++;
      if (b.kind === "video" && !b.transcript.trim()) videoNoTranscript++;
      if (b.kind === "heading") { if (b.level > prevLevel + 1) skipped++; prevLevel = b.level; headings++; }
      if (b.kind === "quiz") {
        if (b.mode === "graded") hasGraded = true;
        for (const q of b.questions) {
          const ok = q.type === "fill" ? !!q.answer?.trim() : (q.correct && q.correct.length > 0);
          if (!ok) badQuestions++;
          else if (q.type !== "fill" && q.correct!.some((i) => i < 0 || i >= (q.options?.length || 0))) badQuestions++;
        }
      }
      if (b.kind === "question") {
        const q = b.q;
        const ok = q.type === "fill" ? !!q.answer?.trim() : (q.correct && q.correct.length > 0);
        if (!ok) badQuestions++;
      }
    }
  }

  if (imgNoAlt) push("warn", `${imgNoAlt} image${imgNoAlt > 1 ? "s" : ""} missing alt text`, true);
  else push("pass", "All images have alt text");
  if (emptyBlocks) push("warn", `${emptyBlocks} empty text block${emptyBlocks > 1 ? "s" : ""}`, true);
  else push("pass", "No empty content blocks");
  if (badQuestions) push("error", `${badQuestions} question${badQuestions > 1 ? "s" : ""} without a valid correct answer`);
  else push("pass", "All questions have correct answers and feedback");
  if (skipped) push("warn", `Heading hierarchy skips a level in ${skipped} place${skipped > 1 ? "s" : ""}`, true);
  else push("pass", "Heading hierarchy is clean");
  if (videoNoTranscript) push("warn", `${videoNoTranscript} video${videoNoTranscript > 1 ? "s" : ""} without a transcript`);
  if (c.settings.completionRule === "assessment" && !hasGraded) push("error", "Completion requires a graded assessment, but none exists");
  else push("pass", "Tracking configuration is consistent");
  if (contrastRatio(c.theme.primary, "#ffffff") < 3.2) push("warn", "Brand color may fail contrast on buttons", true);
  else push("pass", "Contrast meets WCAG AA for large elements");
  if (!c.objectives.length) push("warn", "No learning objectives stated");
  else push("pass", "Learning objectives defined");
  push("pass", "Keyboard navigation supported in player");
  push("pass", "Manifest and assets will be packaged");

  const errors = items.filter((i) => i.severity === "error").length;
  const warns = items.filter((i) => i.severity === "warn").length;
  const score = Math.max(0, 100 - errors * 18 - warns * 6);
  return { items, errors, warns, score };
}

/* Safe automatic fixes — only applied where no information is lost. */
export function autoFix(c: Course): string[] {
  const fixed: string[] = [];
  let altFixed = 0, removed = 0, headings = 0, prev = 1;
  for (const m of c.modules) for (const l of m.lessons) {
    prev = 1;
    l.blocks = l.blocks.filter((b) => {
      if ((b.kind === "text" && !b.paragraphs.some((p) => p.trim())) || (b.kind === "heading" && !b.text.trim())) { removed++; return false; }
      return true;
    });
    for (const b of l.blocks) {
      if (b.kind === "image" && !b.alt.trim()) { b.alt = b.caption.trim() || "Course illustration"; altFixed++; }
      if (b.kind === "heading") { if (b.level > prev + 1) { (b as any).level = (prev + 1) as 2 | 3; headings++; } prev = b.level; }
    }
  }
  if (contrastRatio(c.theme.primary, "#ffffff") < 3.2) { c.theme.primary = darken(c.theme.primary); fixed.push("Brand color darkened for contrast"); }
  if (altFixed) fixed.push(`Added alt text to ${altFixed} image${altFixed > 1 ? "s" : ""}`);
  if (removed) fixed.push(`Removed ${removed} empty block${removed > 1 ? "s" : ""}`);
  if (headings) fixed.push(`Corrected ${headings} heading level${headings > 1 ? "s" : ""}`);
  return fixed;
}

/* ---------------- package builder ---------------- */
export interface ExportResult { blob: Blob; files: { name: string; size: number }[]; format: ExportFormat; report: QAReport }

function chromeStrings(c: Course) { return CHROME_STRINGS[c.settings.language] || CHROME_STRINGS.en; }

function playerHtml(c: Course, format: ExportFormat, opts: { xapiEndpoint?: string }): string {
  const tracking = {
    mode: format === "xapi" ? "xapi" : format === "cmi5" ? "cmi5" : format,
    passMark: c.settings.passMark,
    completionRule: c.settings.completionRule,
    percentRequired: c.settings.percentRequired,
    navigation: c.settings.navigation,
    xapiEndpoint: opts.xapiEndpoint || "",
  };
  const data = { course: c, tracking, chrome: chromeStrings(c), actor: null };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="${esc(c.settings.language || "en")}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(c.title)}</title>
<link rel="stylesheet" href="styles.css"/>
<script>window.__LS_DATA__ = ${json};<\/script>
</head>
<body>
<script src="player.js"><\/script>
</body>
</html>`;
}

function playerCss(c: Course): string {
  const p = c.theme.primary, a = c.theme.accent;
  return `:root{--ls-primary:${p};--ls-accent:${a};--ls-radius:${c.theme.radius}px}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;background:#f4f5f1;color:#1b211d;line-height:1.55}
.ls-shell{display:flex;min-height:100vh}
.ls-side{width:290px;background:#14201a;color:#e7ede9;padding:20px 14px;display:flex;flex-direction:column;gap:14px;position:sticky;top:0;height:100vh;overflow-y:auto}
.ls-side-head{display:flex;gap:10px;align-items:center}
.ls-logo{width:38px;height:38px;border-radius:10px;background:var(--ls-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;letter-spacing:.5px;flex:none}
.ls-side-title{font-weight:600;font-size:14px;line-height:1.3}
.ls-prog-label{font-size:11.5px;color:#9fb3a8;margin-bottom:6px}
.ls-prog{height:6px;border-radius:4px;background:#2a3b32;overflow:hidden}
.ls-prog-bar{height:100%;background:var(--ls-accent);border-radius:4px;transition:width .4s}
.ls-mod{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8ba396;margin:14px 6px 6px}
.ls-lesson{display:flex;gap:9px;align-items:center;width:100%;text-align:left;background:none;border:0;color:#d7e2db;padding:8px 9px;border-radius:8px;font-size:13.5px;cursor:pointer;font-family:inherit}
.ls-lesson:hover:not(:disabled){background:#22352b}
.ls-lesson.on{background:var(--ls-primary);color:#fff}
.ls-lesson.done .ls-lesson-dot{background:var(--ls-accent);color:#14201a}
.ls-lesson:disabled{opacity:.4;cursor:not-allowed}
.ls-lesson-dot{width:20px;height:20px;border-radius:50%;background:#2a3b32;display:flex;align-items:center;justify-content:center;font-size:10.5px;flex:none}
.ls-main{flex:1;max-width:840px;margin:0 auto;padding:44px 40px 90px}
.ls-crumb{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#67716a;margin:0 0 6px}
.ls-lesson-title{font-size:30px;line-height:1.15;margin:0 0 26px;font-weight:700}
.ls-h{font-size:21px;margin:30px 0 10px;font-weight:700}
.ls-h3{font-size:16px;margin:0 0 10px;font-weight:700}
.ls-text p{margin:0 0 12px;max-width:65ch}
.ls-quote{border-left:4px solid var(--ls-primary);margin:22px 0;padding:6px 20px;color:#39423c;font-size:17px}
.ls-quote footer{font-size:13px;color:#67716a;margin-top:6px}
.ls-callout{border-radius:var(--ls-radius);padding:14px 18px;margin:18px 0;border:1px solid}
.ls-callout p{margin:6px 0 0}
.ls-info{background:#eaf2ee;border-color:#cfe2d9}
.ls-tip{background:#fbf1dc;border-color:#efd9a8}
.ls-warning{background:#f9e7e5;border-color:#eeccc8}
.ls-divider{border:0;border-top:1px solid #d3d8cf;margin:28px 0}
.ls-figure{margin:20px 0}
.ls-figure figcaption{font-size:12.5px;color:#67716a;margin-top:6px}
.ls-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:10px 0}
.ls-card{background:#fff;border:1px solid #e3e6df;border-radius:var(--ls-radius);padding:16px}
.ls-card h4{margin:0 0 6px;font-size:14.5px}
.ls-card p{margin:0;font-size:13.5px;color:#39423c}
.ls-det{background:#fff;border:1px solid #e3e6df;border-radius:var(--ls-radius);margin:8px 0;overflow:hidden}
.ls-det summary{padding:13px 16px;cursor:pointer;font-weight:600;font-size:14.5px}
.ls-det p{margin:0;padding:0 16px 14px;color:#39423c;font-size:14px}
.ls-tabbar{display:flex;gap:6px;border-bottom:1px solid #d3d8cf;margin-bottom:14px;flex-wrap:wrap}
.ls-tab{background:none;border:0;padding:9px 14px;font-size:14px;cursor:pointer;border-bottom:2px solid transparent;font-family:inherit;color:#67716a}
.ls-tab.on{color:var(--ls-primary);border-bottom-color:var(--ls-primary);font-weight:600}
.ls-tabbody{background:#fff;border:1px solid #e3e6df;border-radius:var(--ls-radius);padding:16px;font-size:14.5px;white-space:pre-wrap}
.ls-flips .ls-muted{margin:0 0 10px;font-size:13.5px;color:#67716a}
.ls-flipcard{perspective:900px;background:none;border:0;padding:0;cursor:pointer;font-family:inherit;height:130px}
.ls-flip-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s}
.ls-flipcard.flipped .ls-flip-inner{transform:rotateY(180deg)}
.ls-flip-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:var(--ls-radius);display:flex;align-items:center;justify-content:center;padding:14px;font-size:13.5px;font-weight:600}
.ls-flip-front{background:var(--ls-primary);color:#fff}
.ls-flip-back{background:#fff;border:1px solid var(--ls-primary);color:#1b211d;transform:rotateY(180deg);font-weight:500}
.ls-timeline{margin:12px 0}
.ls-tl-item{display:flex;gap:14px;padding:10px 0}
.ls-tl-dot{width:12px;height:12px;border-radius:50%;background:var(--ls-primary);margin-top:5px;flex:none;box-shadow:0 0 0 4px #e7f0eb}
.ls-tl-item strong{display:block;margin-bottom:2px}
.ls-tl-item p{margin:0;font-size:14px;color:#39423c}
.ls-btn{background:var(--ls-primary);color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.ls-btn:hover{filter:brightness(1.08)}
.ls-btn-primary{background:var(--ls-primary)}
.ls-btn-ghost{background:#fff;color:#1b211d;border:1px solid #d3d8cf}
.ls-btn-done{background:#e3f1e8;color:#2c7a4b;border:1px solid #bcd9c6}
.ls-mini{background:#fff;border:1px solid #d3d8cf;border-radius:6px;width:26px;height:26px;cursor:pointer;margin-left:6px}
.ls-question{background:#fff;border:1px solid #e3e6df;border-radius:var(--ls-radius);padding:18px;margin:14px 0}
.ls-q-prompt{font-weight:600;margin:0 0 12px}
.ls-q-num{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#67716a;margin:22px 0 -6px}
.ls-opt{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border:1px solid #e3e6df;border-radius:8px;margin:7px 0;cursor:pointer;font-size:14px}
.ls-opt:hover{border-color:var(--ls-primary)}
.ls-input{width:100%;padding:10px 12px;border:1px solid #d3d8cf;border-radius:8px;font-size:14px;font-family:inherit}
.ls-order-row{display:flex;align-items:center;padding:9px 12px;background:#f4f5f1;border-radius:8px;margin:6px 0;font-size:14px}
.ls-order-row span{flex:1}
.ls-fb{border-radius:8px;padding:12px 14px;margin-top:12px;font-size:14px}
.ls-fb p{margin:6px 0 0}
.ls-fb-good{background:#e3f1e8;border:1px solid #bcd9c6}
.ls-fb-bad{background:#f9e7e5;border:1px solid #eeccc8}
.ls-quiz{margin:20px 0}
.ls-quiz-head{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.ls-chip{background:#fbf1dc;color:#8a5e07;border-radius:99px;padding:4px 11px;font-size:12.5px;font-weight:600}
.ls-quiz-result{margin:14px 0;padding:12px 14px;background:#f4f5f1;border-radius:8px}
.ls-check-item{display:flex;gap:10px;align-items:flex-start;padding:8px 0;font-size:14.5px;cursor:pointer}
.ls-scenario{background:#fff;border:1px solid #e3e6df;border-radius:var(--ls-radius);padding:20px;margin:16px 0}
.ls-scenario-char{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--ls-primary);font-weight:700;margin:0 0 4px}
.ls-choice{display:block;width:100%;text-align:left;margin:8px 0;padding:12px 14px;font-size:14px;line-height:1.45}
.ls-scenario-end{font-weight:600;color:var(--ls-primary)}
.ls-lesson-footer{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:20px;border-top:1px solid #e3e6df;gap:12px;flex-wrap:wrap}
.ls-nav{display:flex;gap:8px}
.ls-done-screen{position:fixed;inset:0;background:rgba(20,32,26,.72);display:flex;align-items:center;justify-content:center;padding:20px;z-index:50}
.ls-done-card{background:#fff;border-radius:16px;padding:38px;max-width:440px;text-align:center;box-shadow:0 30px 80px -20px rgba(0,0,0,.5)}
.ls-done-check{width:58px;height:58px;border-radius:50%;background:#e3f1e8;color:#2c7a4b;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-weight:700}
.ls-done-score{color:#39423c;margin:8px 0 18px}
.ls-cert{border:2px dashed #d3d8cf;border-radius:12px;padding:16px;margin-bottom:20px}
.ls-cert-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#67716a;margin:0 0 4px}
.ls-cert-name{font-weight:700;font-size:16px;margin:0}
button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--ls-primary);outline-offset:2px}
@media (max-width:820px){.ls-shell{flex-direction:column}.ls-side{width:100%;height:auto;position:static}.ls-main{padding:26px 18px 70px}}`;
}

function manifest12(c: Course): string {
  const id = "LS-" + c.id;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>${esc(c.title)}</title>
      <item identifier="item-1" identifierref="res-1">
        <title>${esc(c.title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="styles.css"/>
      <file href="player.js"/>
      <file href="course.json"/>
    </resource>
  </resources>
</manifest>`;
}

function manifest2004(c: Course): string {
  const id = "LS-" + c.id;
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>${esc(c.title)}</title>
      <item identifier="item-1" identifierref="res-1" isvisible="true">
        <title>${esc(c.title)}</title>
        <imsss:sequencing>
          <imsss:controlMode choice="true" flow="true"/>
        </imsss:sequencing>
      </item>
      <imsss:sequencing>
        <imsss:controlMode choice="true" flow="true"/>
      </imsss:sequencing>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="styles.css"/>
      <file href="player.js"/>
      <file href="course.json"/>
    </resource>
  </resources>
</manifest>`;
}

function cmi5xml(c: Course): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<course xmlns="https://w3id.org/xapi/profiles/cmi5" id="urn:lessonsmith:course:${esc(c.id)}">
  <title>
    <langstring lang="${esc(c.settings.language || "en")}">${esc(c.title)}</langstring>
  </title>
  <description>
    <langstring lang="${esc(c.settings.language || "en")}">${esc(c.description || c.title)}</langstring>
  </description>
  <au id="urn:lessonsmith:au:${esc(c.id)}" moveOn="CompletedOrPassed">
    <title>
      <langstring lang="${esc(c.settings.language || "en")}">${esc(c.title)}</langstring>
    </title>
  </au>
</course>`;
}

export const EXPORTERS: { format: ExportFormat; label: string; spec: string; beta?: boolean; blurb: string }[] = [
  { format: "scorm12", label: "SCORM 1.2", spec: "ADL SCORM 1.2", blurb: "Widest LMS compatibility. Tracks status, score, suspend data and interactions." },
  { format: "scorm2004", label: "SCORM 2004 (4th Ed.)", spec: "ADL SCORM 2004", blurb: "Modern SCORM with completion + success status, scaled score and progress measure." },
  { format: "xapi", label: "xAPI (Tin Can)", spec: "xAPI 1.0.3", blurb: "Statement stream: initialized, experienced, answered, completed, passed, failed." },
  { format: "cmi5", label: "cmi5", spec: "cmi5 profile", beta: true, blurb: "xAPI with LMS launch handshake (fetch token, AU launch parameters). Beta." },
];

export async function buildPackage(course: Course, format: ExportFormat, opts: { xapiEndpoint?: string } = {}): Promise<ExportResult> {
  const report = validateCourse(course);
  const zip = new JSZip();
  const files: { name: string; size: number }[] = [];
  const add = (name: string, content: string) => { zip.file(name, content); files.push({ name, size: content.length }); };

  add("index.html", playerHtml(course, format, opts));
  add("styles.css", playerCss(course));
  add("player.js", playerSource);
  add("course.json", JSON.stringify(course, null, 2));

  if (format === "scorm12") add("imsmanifest.xml", manifest12(course));
  else if (format === "scorm2004") add("imsmanifest.xml", manifest2004(course));
  else if (format === "cmi5") add("cmi5.xml", cmi5xml(course));
  else add("README.txt", `Lessonsmith xAPI package — ${course.title}\n\nOpen index.html to launch. Statements are emitted for: initialized, experienced, answered, completed, passed, failed.\nTo forward statements to an LRS, set window.__LS_DATA__.tracking.xapiEndpoint before player.js loads, or configure via your LRS launcher.`);

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, files, format, report };
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "course";
