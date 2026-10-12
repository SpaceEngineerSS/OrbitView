"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useT } from "@/hooks/useLocale";

function GlobeError({ error }: { error?: Error }) {
    const t = useT();
    const noWebGL = /webgl|context/i.test(error?.message ?? "");
    return (
        <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm border border-rule-strong bg-surface p-5">
                <h2 className="label text-alert mb-2">{t("errors.globeTitle")}</h2>
                <p className="text-[13px] text-dim leading-relaxed">{noWebGL ? t("errors.noWebgl") : t("errors.globeBody")}</p>
                <button type="button" onClick={() => location.reload()}
                    className="mt-4 h-8 px-3 border border-rule-strong text-[12px] hover:border-dim">
                    {t("common.reload")}
                </button>
                {process.env.NODE_ENV !== "production" && error && (
                    <pre className="num mt-4 text-[10.5px] text-alert whitespace-pre-wrap">{error.message}</pre>
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
