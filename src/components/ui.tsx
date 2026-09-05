import { X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";

/* ---------- buttons ---------- */
export function Btn({ variant = "primary", size = "md", className = "", children, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger" | "amber" | "dark"; size?: "sm" | "md" | "lg" }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap";
  const sizes = { sm: "text-[12.5px] px-2.5 py-1.5", md: "text-[13.5px] px-3.5 py-2", lg: "text-[14.5px] px-5 py-2.5" };
  const variants = {
    primary: "bg-pine text-white hover:bg-pine-2 shadow-sm",
    outline: "border border-line-2 bg-surface text-ink hover:border-pine hover:text-pine",
    ghost: "text-ink-2 hover:bg-pine-3/60 hover:text-pine-2",
    danger: "bg-bad text-white hover:brightness-110",
    amber: "bg-amber text-night hover:brightness-105 shadow-sm",
    dark: "bg-night text-canvas hover:bg-night-2",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>{children}</button>;
}

export function IconBtn({ label, className = "", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-mute hover:text-ink hover:bg-line/70 transition-colors disabled:opacity-35 disabled:pointer-events-none ${className}`}
      {...rest}>{children}</button>
  );
}

/* ---------- form ---------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-ink-2 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] text-faint mt-1">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/15 transition-shadow";
export const TextInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className || ""}`} />;
export const TextArea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${inputCls} leading-relaxed ${p.className || ""}`} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${inputCls} appearance-none bg-no-repeat bg-[right_10px_center] ${p.className || ""}`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2367716a' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} />;

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full transition-colors ${on ? "bg-pine" : "bg-line-2"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function Seg<T extends string>({ options, value, onChange, size = "md" }: { options: { value: T; label: React.ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className={`inline-flex items-center rounded-lg bg-line/60 p-0.5 gap-0.5 ${size === "sm" ? "text-[11.5px]" : "text-[12.5px]"}`}>
      {options.map((o) => (
        <button key={o.value} type="button" title={o.title} onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md font-semibold transition-all ${value === o.value ? "bg-surface text-ink shadow-sm" : "text-mute hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, subtitle, children, width = 560, footer }:
  { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: string; children: React.ReactNode; width?: number; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-night/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-pop w-full max-h-[88vh] flex flex-col anim-pop" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line">
          <div>
            <h2 className="font-display font-bold text-[17px] text-ink">{title}</h2>
            {subtitle && <p className="text-[12.5px] text-mute mt-0.5">{subtitle}</p>}
          </div>
          <IconBtn label="Close" onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div className="overflow-y-auto px-5 py-4 grow">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- dropdown menu ---------- */
export interface MenuItem { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; divider?: boolean }
export function Menu({ button, items, align = "right" }: { button: React.ReactNode; items: MenuItem[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", fn); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("mousedown", fn); window.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>{button}</div>
      {open && (
        <div className={`absolute z-40 mt-1 min-w-[178px] bg-surface border border-line rounded-lg shadow-pop py-1 anim-pop ${align === "right" ? "right-0" : "left-0"}`} role="menu">
          {items.map((it, i) => it.divider ? <div key={i} className="my-1 border-t border-line" /> : (
            <button key={i} role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              className={`w-full text-left px-3 py-1.5 text-[13px] font-medium flex items-center gap-2 transition-colors ${it.danger ? "text-bad hover:bg-bad-3" : "text-ink-2 hover:bg-pine-3/50 hover:text-pine-2"}`}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- bits ---------- */
export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "pine" | "amber" }) {
  const tones = {
    neutral: "bg-line/60 text-ink-2", ok: "bg-ok-3 text-ok", warn: "bg-warn-3 text-warn",
    bad: "bg-bad-3 text-bad", pine: "bg-pine-3 text-pine-2", amber: "bg-amber-3 text-amber-2",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Kbd({ children }: { children: React.ReactNode }) { return <kbd className="kbd">{children}</kbd>; }

export function ProgressBar({ value, tone = "pine", className = "" }: { value: number; tone?: "pine" | "amber"; className?: string }) {
  return (
    <div className={`h-1.5 rounded-full bg-line/80 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${tone === "pine" ? "bg-pine" : "bg-amber"}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 anim-rise">
      <div className="w-14 h-14 rounded-2xl bg-pine-3 text-pine flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-display font-bold text-[17px] text-ink">{title}</h3>
      <p className="text-[13.5px] text-mute mt-1.5 max-w-[340px] leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- toasts ---------- */
export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`anim-toast flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-pop bg-surface text-[13px] font-medium leading-snug ${t.kind === "err" ? "border-bad/30 text-bad" : t.kind === "ai" ? "border-amber/40 text-ink" : t.kind === "ok" ? "border-ok/30 text-ink" : "border-line text-ink"}`}>
          <span className={`mt-0.5 w-2 h-2 rounded-full flex-none ${t.kind === "err" ? "bg-bad" : t.kind === "ai" ? "bg-amber" : t.kind === "ok" ? "bg-ok" : "bg-faint"}`} />
          <span className="grow">{t.msg}</span>
          <button onClick={() => dismiss(t.id)} className="text-faint hover:text-ink" aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="inline-block rounded-full border-2 border-current border-t-transparent anim-spin" style={{ width: size, height: size }} />;
}
