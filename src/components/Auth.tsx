import { ArrowRight, Check, FileUp, PackageCheck, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { go, useStore } from "../lib/store";
import { Btn, Field, Spinner, TextInput } from "./ui";

export function Auth() {
  const signIn = useStore((s) => s.signIn);
  const signUp = useStore((s) => s.signUp);
  const users = useStore((s) => s.users);
  const toast = useStore((s) => s.toast);
  const [mode, setMode] = useState<"in" | "up">(users.length ? "in" : "up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(null);
    const e = mode === "in" ? await signIn(email, pw) : await signUp(name, email, pw);
    setBusy(false);
    if (e) setErr(e);
    else { toast("ok", mode === "up" ? "Workspace ready — we seeded a demo course so you can explore." : "Welcome back."); go({ name: "dashboard" }); }
  };

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* brand panel */}
      <div className="hidden lg:flex w-[46%] bg-night text-canvas flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 dotgrid opacity-[0.12]" />
        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-pine text-canvas font-display font-extrabold text-[18px] flex items-center justify-center">Ls</span>
          <div>
            <p className="font-display font-extrabold text-[19px] leading-none">Lessonsmith</p>
            <p className="text-[11px] text-canvas/50 mt-0.5">AI SCORM course studio</p>
          </div>
        </div>

        {/* animated course assembly */}
        <div className="relative max-w-[400px]">
          <h2 className="font-display font-extrabold text-[34px] leading-[1.1]">Build LMS-ready courses with AI.</h2>
          <p className="text-[14px] text-canvas/65 mt-3 leading-relaxed">Turn your documents, ideas and expertise into engaging training — then export directly to your LMS.</p>
          <div className="mt-9 space-y-2.5">
            {[
              { icon: <FileUp size={14} />, t: "Upload a policy PDF", d: "AI grounds every lesson in your material", delay: "0s" },
              { icon: <Wand2 size={14} />, t: "Course designed in minutes", d: "objectives · modules · activities · assessment", delay: "0.15s" },
              { icon: <PackageCheck size={14} />, t: "Export SCORM 1.2 / 2004 / xAPI", d: "validated packages with real tracking", delay: "0.3s" },
            ].map((s) => (
              <div key={s.t} className="anim-rise flex items-center gap-3.5 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 anim-drift" style={{ animationDelay: s.delay }}>
                <span className="w-8 h-8 rounded-lg bg-amber text-night flex items-center justify-center flex-none">{s.icon}</span>
                <div>
                  <p className="text-[13.5px] font-bold">{s.t}</p>
                  <p className="text-[11.5px] text-canvas/55">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-9 flex items-center gap-5 text-[11.5px] text-canvas/55">
            {["WCAG-minded authoring", "Suspend & resume", "Review links"].map((x) => <span key={x} className="flex items-center gap-1.5"><Check size={12} className="text-amber" /> {x}</span>)}
          </div>
        </div>

        <p className="relative text-[11px] text-canvas/40">Local-first demo build — accounts, courses and exports live in your browser.</p>
      </div>

      {/* form */}
      <div className="grow flex items-center justify-center p-6">
        <div className="w-full max-w-[380px] anim-rise">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="w-9 h-9 rounded-lg bg-pine text-canvas font-display font-extrabold text-[16px] flex items-center justify-center">Ls</span>
            <span className="font-display font-extrabold text-[17px]">Lessonsmith</span>
          </div>
          <h1 className="font-display font-extrabold text-[26px] leading-tight">{mode === "in" ? "Welcome back" : "Create your workspace"}</h1>
          <p className="text-[13.5px] text-mute mt-1.5">{mode === "in" ? "Pick up where your courses left off." : "Free plan · 100 AI credits · no card required."}</p>

          <div className="mt-7 space-y-3.5">
            {mode === "up" && (
              <Field label="Full name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" /></Field>
            )}
            <Field label="Work email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@company.com" autoComplete="email"
              onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
            <Field label="Password" hint={mode === "up" ? "At least 8 characters — stored as a salted hash, never in plain text." : undefined}>
              <TextInput type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete={mode === "in" ? "current-password" : "new-password"}
                onKeyDown={(e) => e.key === "Enter" && submit()} />
            </Field>
            {err && <p className="text-[12.5px] font-semibold text-bad bg-bad-3 border border-bad/20 rounded-lg px-3 py-2 anim-rise">{err}</p>}
            <Btn size="lg" className="w-full" onClick={submit} disabled={busy}>
              {busy ? <Spinner size={15} /> : <>{mode === "in" ? "Sign in" : "Create workspace"} <ArrowRight size={15} /></>}
            </Btn>
          </div>

          <p className="text-[13px] text-mute mt-5 text-center">
            {mode === "in" ? "New to Lessonsmith? " : "Already have an account? "}
            <button className="font-bold text-pine hover:underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(null); }}>
              {mode === "in" ? "Create a workspace" : "Sign in"}
            </button>
          </p>
          {users.length > 0 && mode === "in" && (
            <button onClick={async () => { setBusy(true); const e = await signIn(users[0].email, "password"); setBusy(false); if (e) setErr(e + " (demo hint: your password is what you set)"); else go({ name: "dashboard" }); }}
              className="mt-3 w-full text-center text-[12px] font-semibold text-pine-2 bg-pine-3 hover:bg-pine-4 rounded-lg py-2 transition-colors">
              Quick sign-in as {users[0].name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
