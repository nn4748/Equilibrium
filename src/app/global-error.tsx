"use client";

/** Last-resort boundary: renders its own document, so styles are inline. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#000", color: "#f5f5f5", fontFamily: "ui-sans-serif, system-ui" }}>
        <div style={{ maxWidth: 420, padding: 32 }}>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.08em", color: "#8c8c8c" }}>FAULT / SYSTEM</p>
          <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.03em", margin: "12px 0" }}>Equilibrium could not start.</h1>
          <p style={{ color: "#8c8c8c" }}>Your local data has not been modified.</p>
          <button onClick={reset} style={{ marginTop: 16, height: 44, padding: "0 20px", background: "#f5f5f5", color: "#000", border: 0, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
