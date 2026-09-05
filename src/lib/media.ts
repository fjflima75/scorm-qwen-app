/* Media Studio engine.
   Image generation: deterministic procedural SVG artwork from a prompt (seeded).
   This is real, instant, offline output — swap `generateArtwork` for a provider
   (DALL·E, Imagen, Stable Diffusion) behind the same signature when a key exists.
   Audio: narration script builder + browser speech synthesis preview. */

export type ArtStyle = "editorial" | "geometric" | "organic" | "duotone";

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES: Record<ArtStyle, string[][]> = {
  editorial: [["#175943", "#e8a020", "#f3f4f0", "#274b3a"], ["#1d3a5f", "#d97a2b", "#f2efe9", "#39423c"], ["#8c2f39", "#e8c87a", "#f5f1ea", "#3c2a2e"]],
  geometric: [["#3b3f8f", "#e8a020", "#eef0f7", "#1b211d"], ["#175943", "#3b3f8f", "#f0f4f2", "#e8a020"], ["#0f3d3e", "#b8543f", "#f4f1ec", "#175943"]],
  organic: [["#274b3a", "#8fae7e", "#f3f4f0", "#e8a020"], ["#4a2a5e", "#c9a0dc", "#f6f2f8", "#175943"], ["#1d3a5f", "#7fa8c9", "#f0f4f8", "#d97a2b"]],
  duotone: [["#175943", "#f3f4f0", "#175943", "#e8a020"], ["#1d3a5f", "#f0f4f8", "#1d3a5f", "#d97a2b"], ["#8c2f39", "#f5f1ea", "#8c2f39", "#e8c87a"]],
};

export function generateArtwork(prompt: string, style: ArtStyle, seed: number): string {
  const rnd = mulberry(hashStr(prompt.trim() || "course") + seed * 7919);
  const pals = PALETTES[style];
  const [c1, c2, bg, c4] = pals[Math.floor(rnd() * pals.length)];
  const W = 960, H = 540;
  let shapes = "";
  const grain = Array.from({ length: 26 }, () => `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(rnd() * 2.4 + 0.6).toFixed(1)}" fill="${c1}" opacity="0.10"/>`).join("");

  if (style === "editorial") {
    const cx = 280 + rnd() * 400, cy = 200 + rnd() * 140;
    shapes += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(120 + rnd() * 60).toFixed(0)}" fill="${c1}"/>`;
    shapes += `<rect x="${(cx - 60 + rnd() * 120).toFixed(0)}" y="${(cy + 40).toFixed(0)}" width="${(180 + rnd() * 120).toFixed(0)}" height="14" rx="7" fill="${c2}"/>`;
    shapes += `<rect x="${(cx - 40 + rnd() * 80).toFixed(0)}" y="${(cy + 66).toFixed(0)}" width="${(110 + rnd() * 90).toFixed(0)}" height="10" rx="5" fill="${c1}" opacity="0.45"/>`;
    for (let i = 0; i < 5; i++) shapes += `<rect x="${(60 + i * 34).toFixed(0)}" y="${(400 - i * 26 - rnd() * 20).toFixed(0)}" width="18" height="${(60 + i * 26 + rnd() * 30).toFixed(0)}" rx="9" fill="${i % 2 ? c2 : c1}" opacity="${(0.55 + rnd() * 0.4).toFixed(2)}"/>`;
    shapes += `<circle cx="${(W - 140).toFixed(0)}" cy="110" r="${(34 + rnd() * 22).toFixed(0)}" fill="none" stroke="${c2}" stroke-width="10"/>`;
  } else if (style === "geometric") {
    const n = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, s = 70 + rnd() * 160, rot = (rnd() * 90).toFixed(0);
      const kind = rnd();
      if (kind < 0.4) shapes += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${s.toFixed(0)}" height="${s.toFixed(0)}" rx="${(s * 0.12).toFixed(0)}" fill="${i % 2 ? c1 : c2}" opacity="${(0.75 - i * 0.07).toFixed(2)}" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
      else if (kind < 0.75) shapes += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s / 2).toFixed(0)}" fill="none" stroke="${i % 2 ? c2 : c4}" stroke-width="${(6 + rnd() * 8).toFixed(0)}"/>`;
      else shapes += `<polygon points="${x.toFixed(0)},${y.toFixed(0)} ${(x + s).toFixed(0)},${(y + s * 0.6).toFixed(0)} ${(x - s * 0.4).toFixed(0)},${(y + s * 0.8).toFixed(0)}" fill="${c1}" opacity="0.8"/>`;
    }
    shapes += `<line x1="0" y1="${(H * 0.72).toFixed(0)}" x2="${W}" y2="${(H * 0.6).toFixed(0)}" stroke="${c2}" stroke-width="6" opacity="0.7"/>`;
  } else if (style === "organic") {
    for (let i = 0; i < 4; i++) {
      const x = rnd() * W, y = rnd() * H, r = 90 + rnd() * 130;
      const pts = Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2, rr = r * (0.7 + rnd() * 0.55);
        return `${(x + Math.cos(a) * rr).toFixed(0)},${(y + Math.sin(a) * rr).toFixed(0)}`;
      });
      shapes += `<polygon points="${pts.join(" ")}" fill="${i % 2 ? c2 : c1}" opacity="${(0.5 - i * 0.08).toFixed(2)}"/>`;
    }
    shapes += `<path d="M ${(W * 0.1).toFixed(0)} ${(H * 0.8).toFixed(0)} Q ${(W * 0.4).toFixed(0)} ${(H * 0.2).toFixed(0)} ${(W * 0.9).toFixed(0)} ${(H * 0.5).toFixed(0)}" fill="none" stroke="${c4}" stroke-width="5" opacity="0.65"/>`;
  } else {
    shapes += `<rect x="0" y="0" width="${W}" height="${H}" fill="${c1}"/>`;
    shapes += `<circle cx="${(W * (0.3 + rnd() * 0.4)).toFixed(0)}" cy="${(H * (0.3 + rnd() * 0.4)).toFixed(0)}" r="${(140 + rnd() * 60).toFixed(0)}" fill="${bg}"/>`;
    for (let i = 0; i < 6; i++) shapes += `<rect x="${(i * 170 - 40).toFixed(0)}" y="-80" width="54" height="${H + 160}" fill="${bg}" opacity="${(0.10 + rnd() * 0.08).toFixed(2)}" transform="rotate(${(14 + rnd() * 6).toFixed(0)} ${(i * 170).toFixed(0)} 0)"/>`;
    shapes += `<circle cx="${(W * 0.78).toFixed(0)}" cy="${(H * 0.72).toFixed(0)}" r="${(26 + rnd() * 18).toFixed(0)}" fill="${c2}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${shapes}${grain}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- narration ---------- */
export function buildNarrationScript(paragraphs: string[], lessonTitle: string): string {
  const sentences = paragraphs
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  const lines: string[] = [`[Warm, steady pace]`, `Welcome to ${lessonTitle}.`];
  sentences.slice(0, 8).forEach((s, i) => {
    lines.push(s.replace(/\s+/g, " "));
    if (i % 2 === 1) lines.push("[pause 0.6s]");
  });
  lines.push("[pause 0.8s]", "Take a moment to consider how this applies to your own work.", "Now, let's put it into practice.");
  return lines.join("\n");
}

export function listVoices(): SpeechSynthesisVoice[] {
  try { return window.speechSynthesis?.getVoices() || []; } catch { return []; }
}

let speaking = false;
export function speak(text: string, voiceURI: string | null, rate: number, onEnd?: () => void) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return false; }
    synth.cancel();
    const clean = text.replace(/\[.*?\]/g, " … ");
    const u = new SpeechSynthesisUtterance(clean);
    const v = listVoices().find((x) => x.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = () => { speaking = false; onEnd?.(); };
    u.onerror = () => { speaking = false; onEnd?.(); };
    speaking = true;
    synth.speak(u);
    return true;
  } catch { onEnd?.(); return false; }
}
export function stopSpeech() {
  speaking = false;
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}
export const isSpeaking = () => speaking;
