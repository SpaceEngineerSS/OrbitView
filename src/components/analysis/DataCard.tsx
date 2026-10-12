"use client";

import { useState } from "react";
import { Copy, Check, DownloadSimple, LinkSimple, Database } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import { buildEphemeris, ephemerisToCSV, ephemerisToJSON, downloadFile, safeFileName } from "@/lib/Exporter";
import { useT } from "@/hooks/useLocale";
import { useTimelineStore } from "@/store/timelineStore";
import { Card, Note } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";

export default function DataCard({ obj, index }: { obj: SpaceObject; index: number }) {
    const t = useT();
    const [copied, setCopied] = useState<string | null>(null);
    const [span, setSpan] = useState(90);
    const [step, setStep] = useState(60);

    const copy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
        } catch { /* clipboard blocked */ }
    };

    const exportAs = (kind: "csv" | "json") => {
        const start = useTimelineStore.getState().currentTime;
        const rows = buildEphemeris(obj, start, span, step);
        if (kind === "csv") downloadFile(ephemerisToCSV(obj, rows), safeFileName(obj, "csv", start), "text/csv;charset=utf-8");
        else downloadFile(ephemerisToJSON(obj, rows), safeFileName(obj, "json", start), "application/json");
    };

    const tle = obj.tle ? `${obj.name}\n${obj.tle.line1}\n${obj.tle.line2}` : "";
    const time = () => useTimelineStore.getState().currentTime.toISOString().slice(0, 16) + "Z";

    return (
        <Card index={index} title={t("data.title")} icon={<Database size={16} weight="bold" />}>
            <pre className="text-[11.5px] leading-relaxed rounded-[12px] bg-card-2 p-3 overflow-x-auto whitespace-pre select-all font-[ui-monospace,SFMono-Regular,monospace]">{tle || "—"}</pre>
            <div className="grid grid-cols-2 gap-2 mt-2.5">
                <Button size="sm" variant="tinted" icon={copied === "tle" ? <Check size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
                    onClick={() => copy("tle", tle)} disabled={!tle}>
                    {copied === "tle" ? t("data.copied") : t("data.copyTle")}
                </Button>
                <Button size="sm" variant="tinted" icon={copied === "link" ? <Check size={15} weight="bold" /> : <LinkSimple size={15} weight="bold" />}
                    onClick={() => copy("link", `${location.origin}${location.pathname}?sat=${obj.id}&t=${encodeURIComponent(time())}`)}>
                    {copied === "link" ? t("data.copied") : t("data.copyLink")}
                </Button>
            </div>

            <div className="mt-5 text-[13px] font-semibold text-ink-2">{t("data.ephemeris")}</div>
            <div className="flex flex-wrap gap-2 mt-2">
                <Segmented size="sm" label={t("data.span")} value={span} onChange={setSpan}
                    options={[{ value: 90, label: "90 min" }, { value: 360, label: "6 h" }, { value: 1440, label: "24 h" }]} />
                <Segmented size="sm" label={t("data.step")} value={step} onChange={setStep}
                    options={[{ value: 10, label: "10 s" }, { value: 60, label: "1 min" }, { value: 300, label: "5 min" }]} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2.5">
                <Button size="sm" icon={<DownloadSimple size={15} weight="bold" />} onClick={() => exportAs("csv")}>CSV</Button>
                <Button size="sm" icon={<DownloadSimple size={15} weight="bold" />} onClick={() => exportAs("json")}>JSON</Button>
            </div>
            <Note className="mt-2.5">{t("data.ephemerisNote")}</Note>
        </Card>
    );
}
