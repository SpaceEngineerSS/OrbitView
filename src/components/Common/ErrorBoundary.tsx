"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    className?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={`p-8 text-center bg-slate-900/50 border border-red-500/20 rounded-2xl backdrop-blur-xl ${this.props.className}`}>
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <ShieldAlert size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Visualizer Component Error</h2>
                    <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
                        An error occurred while rendering the 3D globe or scientific data. This might be due to a graphics driver issue or TLE parsing failure.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold transition-all mx-auto shadow-lg shadow-red-500/20"
                    >
                        <RefreshCw size={16} />
                        Reload Application
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-6 p-4 bg-black/40 rounded-lg text-left overflow-auto max-h-32 custom-scrollbar">
                            <code className="text-[10px] text-red-400 font-mono">
                                {this.state.error?.toString()}
                            </code>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
