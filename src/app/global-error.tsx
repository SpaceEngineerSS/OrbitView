"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error:", error);
    }, [error]);

    return (
        <html>
            <body className="bg-slate-950">
                <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
                    {/* Warning Pattern Background */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 20px,
                #f59e0b 20px,
                #f59e0b 40px
              )`
                        }} />
                    </div>

                    {/* Glowing Orb */}
                    <div className="absolute w-96 h-96 bg-red-500/10 rounded-full blur-[100px]" />

                    {/* Content */}
                    <div className="relative z-10 text-center px-4">
                        {/* Error Icon */}
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                            <svg className="w-12 h-12 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        {/* Error Title */}
                        <h1 className="text-4xl font-bold text-white mb-2">
                            System Malfunction
                        </h1>
                        <h2 className="text-xl text-red-400 font-mono mb-4">
                            ERROR 500 - Internal Server Error
                        </h2>

                        {/* Message */}
                        <p className="text-slate-400 max-w-md mx-auto mb-8">
                            Houston, we have a problem. Our systems experienced an unexpected error.
                            Our engineers have been notified.
                        </p>

                        {/* Error Details (if available) */}
                        {error.digest && (
                            <div className="mb-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl max-w-md mx-auto">
                                <p className="text-xs text-slate-500 font-mono">
                                    Error ID: {error.digest}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => reset()}
                                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl hover:from-red-400 hover:to-orange-500 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)]"
                            >
                                Try Again
                            </button>
                            <a
                                href="/"
                                className="px-6 py-3 bg-slate-800/50 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all"
                            >
                                Go Home
                            </a>
                        </div>

                        {/* Status */}
                        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-600 font-mono">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            SYSTEM_STATUS: RECOVERING
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
