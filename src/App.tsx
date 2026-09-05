import { useEffect } from "react";
import { Auth } from "./components/Auth";
import { Dashboard, InsightsScreen } from "./components/Dashboard";
import { Editor } from "./components/Editor";
import { PreviewShell } from "./components/Player";
import { ToastHost } from "./components/ui";
import { Wizard } from "./components/Wizard";
import { parseHash, useStore } from "./lib/store";

export default function App() {
  const route = useStore((s) => s.route);
  const setRoute = useStore((s) => s.setRoute);
  const session = useStore((s) => s.session);

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
        <Auth />
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
    <>
      {route.name === "dashboard" && <Dashboard />}
      {route.name === "new" && <Wizard />}
      {route.name === "editor" && <Editor courseId={route.courseId} />}
      {route.name === "play" && <PreviewShell courseId={route.courseId} />}
      {route.name === "review" && <PreviewShell courseId={route.courseId} review />}
      {route.name === "insights" && <InsightsScreen courseId={route.courseId} />}
      <ToastHost />
    </>
  );
}
