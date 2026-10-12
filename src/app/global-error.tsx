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
            <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#eef0f5", color: "#101218", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                <div style={{ maxWidth: 360, background: "#ffffff", padding: 24, borderRadius: 24, boxShadow: "0 14px 36px rgba(16,18,24,0.14)" }}>
                    <div style={{ fontSize: 19, fontWeight: 600 }}>OrbitView</div>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "#636878" }}>
                        Something broke while loading the page. / Sayfa yüklenirken bir hata oluştu.
                    </p>
                    {error.digest && <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#9a9eab" }}>{error.digest}</p>}
                    <button type="button" onClick={reset}
                        style={{ height: 40, padding: "0 18px", background: "#3466f2", color: "#ffffff", border: 0, borderRadius: 999, fontWeight: 600, cursor: "pointer" }}>
                        Try again / Tekrar dene
                    </button>
                </div>
            </body>
        </html>
    );
}
