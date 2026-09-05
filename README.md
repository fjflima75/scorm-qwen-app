# Lessonsmith — AI SCORM Course Studio

Turn your knowledge into LMS-ready courses in minutes. Lessonsmith is an AI-native authoring
platform: describe a course (or drop in a document), and a built-in instructional-design engine
generates objectives, modules, varied lesson formats, knowledge checks and a scored final
assessment — all editable in a visual block editor, previewable exactly as learners see it,
and exportable as real SCORM 1.2 / SCORM 2004 / xAPI / cmi5 packages.

## Quick start

```bash
npm install
npm run dev      # local development
npm run build    # production build → dist/
npm run preview  # serve the production build
```

No environment variables are required — the demo runs fully on-device.

## Architecture

```
src/
├── lib/
│   ├── types.ts        # versioned Course schema (schemaVersion: 1, migrations)
│   ├── ai.ts           # AI provider abstraction + deterministic local engine
│   ├── scorm.ts        # Exporter interface: SCORM 1.2 / 2004 / xAPI / cmi5 + Package QA
│   ├── translate.ts    # dictionary translation engine (en → es, pt-PT) + RTL support
│   ├── media.ts        # Media Studio engine (procedural SVG art, narration scripts)
│   ├── store.ts        # Zustand store: auth, courses, undo/redo, autosave, comments, attempts
│   └── seed.ts         # demo courses, templates, synthetic learner analytics
├── export/
│   └── playerSource.js # standalone learner player bundled inside every export package
└── components/         # Landing, Auth, Dashboard, Wizard, Editor, Player, Insights…
```

**One course document, four exporters.** The same normalized `Course` JSON renders the web
preview and is serialized into every export format; tracking (completion, score, suspend data,
interactions, xAPI statements) is implemented once in the bundled player runtime.

**AI layer.** `generateCourse`, `generateOutline`, `generateQuiz`, `rewrite`, `suggestBlock`,
`translate` and friends return validated structured JSON. The local deterministic provider ships
by default so the product works offline; swap in OpenAI / Anthropic / Gemini behind the same
`AIProvider` interface by adding a key and endpoint.

**Data model.** Users, sessions, courses, course versions, attempts (with per-question stats),
comments and review links persist in `localStorage` in this build; the store layer maps 1:1 to
the intended PostgreSQL schema (users, organizations, courses, modules, lessons, blocks,
assets, assessments, attempts, comments, review_links, course_versions, usage_events).

## Feature tour

- **Wizard** — brief → sources (upload/paste) → editable AI outline → theme → staged generation
- **Editor** — 3-pane authoring: structure tree, live canvas (desktop/tablet/mobile), contextual
  properties; drag-and-drop blocks across lessons; ⌘K command palette; ⌘Z/⌘⇧Z undo/redo;
  debounced autosave with visible state
- **Blocks** — 17 types across content, media, layout, interactive and assessment; every
  interactive block works in preview *and* inside exported packages
- **Assessments** — AI quiz generator (MCQ / multi-select / true-false / fill / ordering),
  distractor quality, per-question regenerate, pass marks, completion rules
- **Scenarios** — branching decision practice with consequences and debrief
- **Preview** — learner player with progress, sequential/free navigation, keyboard support,
  completion screen, certificate placeholder, and a hidden tracking debug panel
- **Export** — Package QA (errors/warnings/passes, auto-fix where safe) then a real ZIP download
- **Review** — shareable links (no account needed), comments anchored to blocks, resolve/reopen
- **Translation** — duplicate-and-translate (never overwrites), content + chrome, RTL for ar/he
- **Media Studio** — prompt-driven artwork generation + narration scripts with voice preview
- **Insights** — score distribution, completion trend, question-level difficulty, org rollup
- **Accessibility** — keyboard navigation, focus states, semantic markup, contrast-checked
  themes, a QA-based accessibility score surfaced on every course card

## Known limitations

- AI is deterministic and local by design in this build — connect a provider key for model output
- Auth and storage are browser-local; the store is shaped for a hosted backend swap
- Billing and team permissions are modeled (plans, roles) but not wired to a payment provider

## License

MIT — build on it.
