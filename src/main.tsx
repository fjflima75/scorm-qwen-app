import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

class BootBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f0", fontFamily: "system-ui, sans-serif", padding: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #d3d8cf", borderRadius: 14, padding: "28px 32px", maxWidth: 520, boxShadow: "0 20px 60px -30px rgba(0,0,0,.3)" }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#14201a" }}>Lessonsmith hit a snag</p>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "#39423c" }}>
              Something threw while starting the app. Your courses are safe in local storage — a reload usually fixes it.
            </p>
            <pre style={{ margin: "14px 0 0", padding: 12, background: "#f3f4f0", borderRadius: 8, fontSize: 11, color: "#67716a", overflow: "auto", maxHeight: 120 }}>{String(this.state.error)}</pre>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => location.reload()} style={{ background: "#175943", color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Reload</button>
              <button onClick={() => { localStorage.clear(); location.reload(); }} style={{ background: "#fff", color: "#14201a", border: "1px solid #d3d8cf", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Reset workspace</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BootBoundary>
    <App />
  </BootBoundary>
);
