"use client";

import { useEffect } from "react";

/**
 * Last-resort error page. It replaces the root layout, so it can't rely on
 * our fonts or CSS: everything is inline and plain.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error("[app]", error); }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#101215", color: "#e8e4da", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                <div style={{ maxWidth: 360, border: "1px solid #2b2f35", background: "#15171a", padding: 20 }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "#d9534f", textTransform: "uppercase" }}>OrbitView · error</div>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "#8d9097" }}>
                        Something broke while loading the page. / Sayfa yüklenirken bir hata oluştu.
                    </p>
                    {error.digest && <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#5d6168" }}>{error.digest}</p>}
                    <button type="button" onClick={reset}
                        style={{ height: 32, padding: "0 12px", background: "#1c1f23", color: "#e8e4da", border: "1px solid #3a3f46", borderRadius: 2, cursor: "pointer" }}>
                        Try again / Tekrar dene
                    </button>
                </div>
            </body>
        </html>
    );
}
