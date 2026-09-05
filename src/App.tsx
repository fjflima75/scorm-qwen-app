import { Suspense, lazy, useEffect, useState } from "react";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { Landing } from "./components/Landing";
import { PreviewShell } from "./components/Player";
import { ToastHost } from "./components/ui";
import { parseHash, useStore } from "./lib/store";

/* heavy authoring screens load on demand */
const Editor = lazy(() => import("./components/Editor").then((m) => ({ default: m.Editor })));
const Wizard = lazy(() => import("./components/Wizard").then((m) => ({ default: m.Wizard })));
const Insights = lazy(() => import("./components/Insights").then((m) => ({ default: m.Insights })));

function SuspenseFallback() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 bg-canvas">
      <span className="w-8 h-8 rounded-lg border-[3px] border-pine border-t-transparent animate-spin" />
      <p className="text-[13px] font-semibold text-mute">Loading the studio…</p>
    </div>
  );
}

export default function App() {
  const route = useStore((s) => s.route);
  const setRoute = useStore((s) => s.setRoute);
  const session = useStore((s) => s.session);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const fn = () => setRoute(parseHash());
    window.addEventListener("hashchange", fn);
    setRoute(parseHash());
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  /* Review links open for anyone — no account required. */
  if (!session && route.name !== "review") {
    return (
      <>
        {showAuth ? (
          <div className="relative">
            <button onClick={() => setShowAuth(false)}
              className="fixed top-4 left-4 z-50 flex items-center gap-1.5 bg-surface border border-line shadow-pop rounded-lg px-3 py-2 text-[12.5px] font-bold text-ink hover:border-pine transition-all active:scale-95">
              ← Back to site
            </button>
            <Auth />
          </div>
        ) : (
          <Landing onStart={() => { setShowAuth(true); window.scrollTo(0, 0); }} />
        )}
        <ToastHost />
      </>
    );
  }
  if (!session && route.name === "review") {
    return (
      <>
        <PreviewShell courseId={route.courseId} review />
        <ToastHost />
      </>
    );
  }

  return (
    <Suspense fallback={<SuspenseFallback />}>
      {route.name === "dashboard" && <Dashboard />}
      {route.name === "new" && <Wizard />}
      {route.name === "editor" && <Editor courseId={route.courseId} />}
      {route.name === "play" && <PreviewShell courseId={route.courseId} />}
      {route.name === "review" && <PreviewShell courseId={route.courseId} review />}
      {route.name === "insights" && <Insights courseId={route.courseId} />}
      <ToastHost />
    </Suspense>
  );
}
