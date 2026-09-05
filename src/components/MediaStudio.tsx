import { AudioLines, Copy, Download, ImagePlus, Pause, Play, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArtStyle, buildNarrationScript, generateArtwork, listVoices, speak, stopSpeech } from "../lib/media";
import { AI_COST, useStore } from "../lib/store";
import { Course, findLesson } from "../lib/types";
import { Btn, Chip, IconBtn, Modal, Select, TextArea, TextInput } from "./ui";

const STYLES: { id: ArtStyle; label: string; swatch: string[] }[] = [
  { id: "editorial", label: "Editorial", swatch: ["#175943", "#e8a020"] },
  { id: "geometric", label: "Geometric", swatch: ["#3b3f8f", "#e8a020"] },
  { id: "organic", label: "Organic", swatch: ["#274b3a", "#8fae7e"] },
  { id: "duotone", label: "Duotone", swatch: ["#175943", "#f3f4f0"] },
];

export function MediaStudio({ course, open, onClose }: { course: Course; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"image" | "audio">("image");
  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2"><ImagePlus size={15} className="text-pine" /> Media Studio</span>} width={880}>
      <div className="flex gap-1 mb-4 border-b border-line-2">
        {([["image", "AI images", <ImagePlus key="i" size={14} />], ["audio", "Narration", <AudioLines key="a" size={14} />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${tab === id ? "border-pine text-pine-2" : "border-transparent text-faint hover:text-ink"}`}>
            {icon} {label}
          </button>
        ))}
      </div>
      {tab === "image" ? <ImageTab course={course} onClose={onClose} /> : <AudioTab course={course} />}
    </Modal>
  );
}

function ImageTab({ course, onClose }: { course: Course; onClose: () => void }) {
  const updateCourse = useStore((s) => s.updateCourse);
  const editor = useStore((s) => s.editor);
  const selectBlock = useStore((s) => s.selectBlock);
  const toast = useStore((s) => s.toast);
  const user = useStore((s) => s.user());
  const adjustCredits = useStore((s) => s.adjustCredits);

  const [prompt, setPrompt] = useState(course.topic || "Abstract illustration about effective teamwork");
  const [style, setStyle] = useState<ArtStyle>("editorial");
  const [seed, setSeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<string[] | null>(null);
  const genRef = useRef(0);

  const selectedIsImage = useMemo(() => {
    const f = editor.blockId ? findLesson(course, editor.lessonId || "") : null;
    const b = f?.lesson.blocks.find((x) => x.id === editor.blockId);
    return b?.kind === "image" ? b.id : null;
  }, [course, editor.blockId, editor.lessonId]);

  const generate = (costCredit: boolean) => {
    if (costCredit) {
      if ((user?.credits ?? 0) < AI_COST.image) { toast("err", `Generating art costs ${AI_COST.image} credit — you're out.`); return; }
      adjustCredits(-AI_COST.image);
    }
    setBusy(true);
    const my = ++genRef.current;
    setTimeout(() => {
      if (my !== genRef.current) return;
      setBatch([0, 1, 2, 3].map((i) => generateArtwork(prompt, style, seed + i * 17)));
      setBusy(false);
    }, 650);
  };

  const insert = (src: string, mode: "replace" | "new") => {
    updateCourse(course.id, (c) => {
      const f = findLesson(c, editor.lessonId || "");
      if (!f) return;
      if (mode === "replace" && selectedIsImage) {
        const b = f.lesson.blocks.find((x) => x.id === selectedIsImage);
        if (b && b.kind === "image") { b.src = src; if (!b.alt.trim()) b.alt = prompt.slice(0, 80); }
      } else {
        f.lesson.blocks.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), kind: "image", src, alt: prompt.slice(0, 80), caption: prompt.slice(0, 110) });
      }
    });
    if (mode !== "replace") selectBlock(null);
    toast("ok", mode === "replace" ? "Image attached to the selected block." : "Image block added to the lesson.");
    onClose();
  };

  const download = (src: string) => {
    const a = document.createElement("a");
    a.href = src; a.download = "lessonsmith-artwork.svg"; a.click();
  };

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5">
      <div>
        <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint">Describe the image</label>
        <TextArea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1.5" placeholder="e.g. Two colleagues exchanging ideas across a table" />
        <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint block mt-4 mb-1.5">Style</label>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLES.map((s) => (
            <button key={s.id} onClick={() => setStyle(s.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition-all ${style === s.id ? "border-pine bg-pine-3/60" : "border-line hover:border-line-2"}`}>
              <span className="flex -space-x-1">{s.swatch.map((c, i) => <span key={i} className="w-3.5 h-3.5 rounded-full border border-white" style={{ background: c }} />)}</span>
              {s.label}
            </button>
          ))}
        </div>
        <Btn className="mt-4 w-full" onClick={() => generate(true)} disabled={busy}>
          {busy ? <><Sparkles size={14} className="animate-[spin_1.2s_linear_infinite]" /> Generating…</> : <><Wand2 size={14} /> Generate 4 variants</>}
        </Btn>
        <p className="text-[10.5px] text-faint mt-2 leading-relaxed">{AI_COST.image} credit per batch · procedural art renders instantly on-device. Connect an image provider key for photorealistic output.</p>
      </div>
      <div>
        {!batch && !busy && (
          <div className="h-full min-h-[260px] border-2 border-dashed border-line-2 rounded-xl flex flex-col items-center justify-center text-center p-6">
            <ImagePlus size={22} className="text-faint mb-2" />
            <p className="text-[13.5px] font-semibold text-ink-2">Your artwork appears here</p>
            <p className="text-[12px] text-mute mt-1 max-w-[300px]">Four seeded variants of the same prompt — pick one, attach it to a block, or regenerate.</p>
          </div>
        )}
        {busy && (
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-video rounded-xl bg-canvas animate-pulse border border-line" style={{ animationDelay: `${i * 120}ms` }} />)}
          </div>
        )}
        {batch && !busy && (
          <div className="grid grid-cols-2 gap-2.5 anim-rise">
            {batch.map((src, i) => (
              <div key={i} className="group relative rounded-xl overflow-hidden border border-line hover:border-pine transition-all hover:shadow-card">
                <img src={src} alt={`Variant ${i + 1} for: ${prompt}`} className="w-full aspect-video object-cover" />
                <div className="absolute inset-0 bg-night/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {selectedIsImage && <Btn size="sm" variant="amber" onClick={() => insert(src, "replace")}>Attach to block</Btn>}
                  <Btn size="sm" onClick={() => insert(src, "new")}>Add as block</Btn>
                  <IconBtn label="Download SVG" className="bg-white/15 text-white hover:bg-white/25" onClick={() => download(src)}><Download size={13} /></IconBtn>
                </div>
                <span className="absolute top-1.5 left-1.5 text-[9.5px] font-bold bg-night/70 text-canvas rounded px-1.5 py-0.5">v{i + 1}</span>
              </div>
            ))}
          </div>
        )}
        {batch && !busy && (
          <div className="flex items-center justify-between mt-3">
            <Btn variant="ghost" size="sm" onClick={() => generate(false)}><Sparkles size={13} /> Regenerate (new seeds)</Btn>
            <Chip tone="neutral">{style} · seed {seed}</Chip>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioTab({ course }: { course: Course }) {
  const lessonId = useStore((s) => s.editor.lessonId);
  const toast = useStore((s) => s.toast);
  const [text, setText] = useState("");
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const voices = useMemo(() => listVoices(), [playing]);

  useEffect(() => {
    const f = lessonId ? findLesson(course, lessonId) : course.modules[0]?.lessons[0] ? { lesson: course.modules[0].lessons[0] } : null;
    const paras = f?.lesson.blocks.filter((b) => b.kind === "text").flatMap((b) => (b as any).paragraphs as string[]) || [];
    setText(buildNarrationScript(paras.length ? paras : ["Explain the core idea of this lesson in plain words."], f?.lesson.title || course.title));
    const pick = listVoices().find((v) => v.lang.startsWith("en"));
    if (pick) setVoiceURI(pick.voiceURI);
    const warm = setInterval(() => { /* voices load async in some browsers */ }, 400);
    setTimeout(() => clearInterval(warm), 1200);
  }, [course.id, lessonId]);

  const copyScript = async () => {
    try { await navigator.clipboard.writeText(text); toast("ok", "Narration script copied."); } catch { toast("err", "Couldn't access the clipboard."); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint">Narration script</label>
          <button onClick={copyScript} className="flex items-center gap-1 text-[11.5px] font-semibold text-pine hover:underline"><Copy size={11} /> Copy script</button>
        </div>
        <TextArea rows={11} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-[12px] leading-relaxed" />
        <p className="text-[10.5px] text-faint mt-1.5">Built from this lesson's text. [pause] markers pace the delivery. Edit freely — the script is yours.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint block mb-1.5">Voice</label>
          <Select value={voiceURI || ""} onChange={(e) => setVoiceURI(e.target.value || null)}>
            {voices.length === 0 && <option value="">Browser default voice</option>}
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-faint block mb-1.5">Speed · {rate.toFixed(2)}×</label>
          <input type="range" min={0.6} max={1.4} step={0.05} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full" aria-label="Speech rate" />
        </div>
        <div className={`rounded-xl border p-3.5 transition-colors ${playing ? "border-pine bg-pine-3/50" : "border-line bg-canvas"}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              if (playing) { stopSpeech(); setPlaying(false); return; }
              const ok = speak(text, voiceURI, rate, () => setPlaying(false));
              if (ok) setPlaying(true); else toast("err", "Speech isn't available in this browser.");
            }}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-90 ${playing ? "bg-bad" : "bg-pine hover:brightness-110"}`}
              aria-label={playing ? "Stop narration" : "Play narration"}>
              {playing ? <Pause size={17} /> : <Play size={17} className="translate-x-[1.5px]" />}
            </button>
            <div className="grow">
              <p className="text-[12.5px] font-bold">{playing ? "Speaking…" : "Preview narration"}</p>
              <div className="flex items-end gap-[3px] h-5 mt-1">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span key={i} className={`w-[3px] rounded-full bg-pine transition-all ${playing ? "animate-[eq_0.7s_ease_infinite]" : "h-1 opacity-30"}`}
                    style={playing ? { height: `${6 + ((i * 37) % 14)}px`, animationDelay: `${(i % 6) * 90}ms` } : undefined} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-[10.5px] text-faint leading-relaxed">Preview uses your browser's speech engine — free and private. Connect a studio TTS provider (ElevenLabs, Azure) behind the same interface for production voices.</p>
        <div>
          <TextInput value={course.settings.language === "pt-PT" ? "Voz portuguesa" : "Default voice"} readOnly className="opacity-60 text-[11.5px]" aria-label="Attached voice" />
          <p className="text-[10.5px] text-faint mt-1">Attach narration to a video or audio block from the block library.</p>
        </div>
      </div>
    </div>
  );
}
