"use client";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <button onClick={unstable_retry} style={{ marginTop: 16, padding: "10px 24px", background: "#fff", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
