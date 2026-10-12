"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useT } from "@/hooks/useLocale";

function GlobeError({ error }: { error?: Error }) {
    const t = useT();
    const noWebGL = /webgl|context/i.test(error?.message ?? "");
    return (
        <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm rounded-[24px] bg-card shadow-pop p-6">
                <h2 className="text-[19px] font-semibold mb-2">{t("errors.globeTitle")}</h2>
                <p className="text-[14px] text-ink-2 leading-relaxed">{noWebGL ? t("errors.noWebgl") : t("errors.globeBody")}</p>
                <button type="button" onClick={() => location.reload()}
                    className="mt-5 h-10 px-5 rounded-full bg-accent text-on-accent text-[14px] font-semibold">
                    {t("common.reload")}
                </button>
                {process.env.NODE_ENV !== "production" && error && (
                    <pre className="mt-4 text-[11px] text-red whitespace-pre-wrap">{error.message}</pre>
                )}
            </div>
        </div>
    );
}

/** Keeps a WebGL/Cesium failure from taking the panels down with it. */
export default class GlobeBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
    state: { error?: Error } = {};

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[globe]", error, info.componentStack);
    }

    render() {
        return this.state.error ? <GlobeError error={this.state.error} /> : this.props.children;
    }
}
