"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        // Global unhandled promise rejection handler
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;

            // Detect empty object errors
            if (reason && typeof reason === 'object' && Object.keys(reason).length === 0) {
                console.warn('[Debug] Silent error caught: Empty object rejected');
                console.warn('[Debug] Event details:', {
                    type: event.type,
                    promise: event.promise,
                    reason: reason,
                    constructor: reason?.constructor?.name,
                });
            } else if (reason instanceof Error) {
                console.error('[Unhandled Promise Error]:', reason.message);
                console.error('[Stack]:', reason.stack);
            } else {
                console.error('[Unhandled Promise Rejection]:', reason);
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // Service Worker Registration
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            const registerSW = async () => {
                try {
                    const registration = await navigator.serviceWorker.register("/sw.js");
                    console.log("[SW] Registered successfully:", registration.scope);

                    // Check for updates
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        console.log("[SW] Update found, installing...");

                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                console.log("[SW] State changed:", newWorker.state);
                                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    console.log("[SW] New content available, refresh for updates");
                                }
                            });
                        }
                    });
                } catch (error) {
                    // Detailed error logging
                    if (error instanceof Error) {
                        console.error("[SW] Registration failed:", error.message);
                        console.error("[SW] Stack:", error.stack);
                    } else if (typeof error === 'object' && error !== null) {
                        console.error("[SW] Registration failed with object:", JSON.stringify(error, null, 2));
                    } else {
                        console.error("[SW] Registration failed:", error);
                    }
                }
            };

            // Register after page load
            if (document.readyState === 'complete') {
                registerSW();
            } else {
                window.addEventListener("load", registerSW);
            }
        }

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null;
}

