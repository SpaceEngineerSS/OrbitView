"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            // Register service worker after page load
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        console.log("SW registered:", registration.scope);

                        // Check for updates
                        registration.addEventListener("updatefound", () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener("statechange", () => {
                                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                        // New content available
                                        console.log("New content available, refresh for updates");
                                    }
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        console.log("SW registration failed:", error);
                    });
            });
        }
    }, []);

    return null;
}
