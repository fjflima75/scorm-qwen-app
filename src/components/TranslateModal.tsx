import { Check, Globe, Languages, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AI_COST, go, useStore } from "../lib/store";
import { Course } from "../lib/types";
import { TRANSLATION_TARGETS, countWords, translateCourse } from "../lib/translate";
import { Btn, Chip, Modal } from "./ui";

export function TranslateModal({ course, open, onClose }: { course: Course | null; open: boolean; onClose: () => void }) {
  const addCourse = useStore((s) => s.addCourse);
  const adjustCredits = useStore((s) => s.adjustCredits);
  const user = useStore((s) => s.user());
  const toast = useStore((s) => s.toast);
  const [lang, setLang] = useState("es");
  const [busy, setBusy] = useState(false);

  const words = useMemo(() => (course ? countWords(course) : 0), [course]);
  const credits = user?.credits ?? 0;
  const cost = AI_COST.narration; // translation batch cost

  if (!course) return null;

  const run = () => {
    if (credits < cost) { toast("err", `Translating costs ${cost} credits — you have ${credits}.`); return; }
    setBusy(true);
    setTimeout(() => {
      const translated = translateCourse(course, lang);
      translated.authorName = user?.name || course.authorName;
      addCourse(translated);
      adjustCredits(-cost);
      setBusy(false);
      onClose();
      toast("ok", `Course duplicated in ${TRANSLATION_TARGETS.find((t) => t.code === lang)?.name}. The original is untouched.`);
      go({ name: "editor", courseId: translated.id });
    }, 900);
  };

  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2"><Languages size={15} className="text-pine" /> Translate course</span>} width={560}
      footer={
        <>
          <div className="grow text-[11.5px] text-faint flex items-center gap-1.5"><ShieldCheck size={13} className="text-ok" /> Creates a duplicate — the original is never modified.</div>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={run} disabled={busy}>
            {busy ? <><Sparkles size={14} className="animate-[spin_1.2s_linear_infinite]" /> Translating…</> : <><Globe size={14} /> Translate · {cost} credits</>}
          </Btn>
        </>
      }>
      <p className="text-[13px] text-mute leading-relaxed">
        “{course.title}” will be duplicated into a new course — content, quizzes, scenarios, navigation and accessibility labels included.
      </p>
      <div className="grid grid-cols-3 gap-2.5 my-4">
        <MiniStat label="Words to translate" value={words.toLocaleString()} />
        <MiniStat label="Chrome strings" value="Ready" ok />
        <MiniStat label="RTL support" value={["ar", "he"].includes(lang) ? "Yes" : "n/a"} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TRANSLATION_TARGETS.map((t) => (
          <button key={t.code} disabled={!t.ready} onClick={() => setLang(t.code)}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-left transition-all ${!t.ready ? "opacity-45 cursor-not-allowed border-line" : lang === t.code ? "border-pine bg-pine-3/60 shadow-card" : "border-line hover:border-line-2"}`}>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black uppercase ${lang === t.code && t.ready ? "bg-pine text-white" : "bg-canvas text-mute"}`}>{t.code.split("-")[0]}</span>
            <span className="grow min-w-0">
              <span className="block text-[12.5px] font-bold truncate">{t.name}</span>
              <span className="text-[10.5px] text-faint">{t.ready ? "Dictionary ready" : "Coming soon"}</span>
            </span>
            {t.ready && lang === t.code && <Check size={15} className="text-pine flex-none" />}
            {!t.ready && <X size={13} className="text-faint flex-none" />}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-canvas border border-line px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint mb-1.5">Sample — first objective</p>
        <p className="text-[13px] text-ink-2 italic leading-relaxed">{course.objectives[0] || course.title}</p>
      </div>
      <div className="mt-3"><Chip tone="neutral">More languages plug into the same dictionary architecture — no UI changes needed.</Chip></div>
    </Modal>
  );
}

function MiniStat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-canvas px-3.5 py-2.5">
      <p className="text-[10.5px] text-faint font-semibold">{label}</p>
      <p className={`text-[15px] font-display font-bold ${ok ? "text-ok" : "text-ink"}`}>{value}</p>
    </div>
  );
}
