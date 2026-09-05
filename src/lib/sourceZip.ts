/* Packages the complete Lessonsmith project source into a downloadable ZIP,
   using the same JSZip pipeline the SCORM exporter uses. */

import JSZip from "jszip";

import pkgJson from "../../package.json?raw";
import tsconfigJson from "../../tsconfig.json?raw";
import indexHtml from "../../index.html?raw";
import readmeMd from "../../README.md?raw";

import mainTsx from "../main.tsx?raw";
import appTsx from "../App.tsx?raw";
import indexCss from "../index.css?raw";
import viteEnv from "../vite-env.d.ts?raw";

import typesTs from "./types.ts?raw";
import aiTs from "./ai.ts?raw";
import scormTs from "./scorm.ts?raw";
import storeTs from "./store.ts?raw";
import seedTs from "./seed.ts?raw";
import translateTs from "./translate.ts?raw";
import mediaTs from "./media.ts?raw";

import playerJs from "../export/playerSource.js?raw";

import uiTsx from "../components/ui.tsx?raw";
import blocksTsx from "../components/blocks.tsx?raw";
import playerTsx from "../components/Player.tsx?raw";
import wizardTsx from "../components/Wizard.tsx?raw";
import dashboardTsx from "../components/Dashboard.tsx?raw";
import propsPanelTsx from "../components/PropsPanel.tsx?raw";
import modalsTsx from "../components/Modals.tsx?raw";
import editorTsx from "../components/Editor.tsx?raw";
import authTsx from "../components/Auth.tsx?raw";
import landingTsx from "../components/Landing.tsx?raw";
import insightsTsx from "../components/Insights.tsx?raw";
import mediaStudioTsx from "../components/MediaStudio.tsx?raw";
import translateModalTsx from "../components/TranslateModal.tsx?raw";

const GITIGNORE = `node_modules
dist
.DS_Store
*.local
.env
.env.*
`;

const HOW_TO_RUN = `LESSONSMITH — PROJECT SOURCE
============================

1) npm install
2) npm run dev        → open the printed localhost URL
   (or: npm run build && npm run preview for the production build)

No environment variables required — the demo runs fully on-device.
Accounts, courses, exports and analytics persist in localStorage.

Notes
- One binary asset (public/cover-course.jpg, a course cover illustration)
  is not included in this text-only archive. The app renders fine without
  it; drop any 1200×675 JPG at that path to restore the seeded cover.
- The AI engine is deterministic and local by design. To use OpenAI,
  Anthropic or Gemini, implement the AIProvider interface in src/lib/ai.ts.
`;

const FILES: [string, string][] = [
  ["package.json", pkgJson],
  ["tsconfig.json", tsconfigJson],
  ["index.html", indexHtml],
  ["README.md", readmeMd],
  [".gitignore", GITIGNORE],
  ["HOW-TO-RUN.txt", HOW_TO_RUN],
  ["src/main.tsx", mainTsx],
  ["src/App.tsx", appTsx],
  ["src/index.css", indexCss],
  ["src/vite-env.d.ts", viteEnv],
  ["src/lib/types.ts", typesTs],
  ["src/lib/ai.ts", aiTs],
  ["src/lib/scorm.ts", scormTs],
  ["src/lib/store.ts", storeTs],
  ["src/lib/seed.ts", seedTs],
  ["src/lib/translate.ts", translateTs],
  ["src/lib/media.ts", mediaTs],
  ["src/export/playerSource.js", playerJs],
  ["src/components/ui.tsx", uiTsx],
  ["src/components/blocks.tsx", blocksTsx],
  ["src/components/Player.tsx", playerTsx],
  ["src/components/Wizard.tsx", wizardTsx],
  ["src/components/Dashboard.tsx", dashboardTsx],
  ["src/components/PropsPanel.tsx", propsPanelTsx],
  ["src/components/Modals.tsx", modalsTsx],
  ["src/components/Editor.tsx", editorTsx],
  ["src/components/Auth.tsx", authTsx],
  ["src/components/Landing.tsx", landingTsx],
  ["src/components/Insights.tsx", insightsTsx],
  ["src/components/MediaStudio.tsx", mediaStudioTsx],
  ["src/components/TranslateModal.tsx", translateModalTsx],
];

export async function downloadSourceZip(): Promise<number> {
  const zip = new JSZip();
  const root = zip.folder("lessonsmith")!;
  for (const [path, content] of FILES) root.file(path, content);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lessonsmith-source.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return blob.size;
}
