"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only, so dev never serves stale chunks. */
export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
        const register = () => {
            navigator.serviceWorker.register("/sw.js").catch((err: unknown) => {
                console.warn("[sw] registration failed", err);
            });
        };
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
    }, []);
    return null;
}
