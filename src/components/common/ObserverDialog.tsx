"use client";

import { useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { Note } from "@/components/ui/Panel";

const CITIES = [
    { name: "İstanbul", lat: 41.0082, lon: 28.9784, alt: 40 },
    { name: "Ankara", lat: 39.9334, lon: 32.8597, alt: 938 },
    { name: "İzmir", lat: 38.4237, lon: 27.1428, alt: 25 },
    { name: "Antalya", lat: 36.8969, lon: 30.7133, alt: 40 },
    { name: "Berlin", lat: 52.52, lon: 13.405, alt: 34 },
    { name: "London", lat: 51.5074, lon: -0.1278, alt: 11 },
    { name: "New York", lat: 40.7128, lon: -74.006, alt: 10 },
    { name: "Houston", lat: 29.7604, lon: -95.3698, alt: 15 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503, alt: 40 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093, alt: 58 },
];

export default function ObserverDialog() {
    const t = useT();
    const open = useUiStore((s) => s.dialog === "observer");
    const close = useUiStore((s) => s.closeDialog);
    const observer = useAppStore((s) => s.observer);
    const setObserver = useAppStore((s) => s.setObserver);

    const [lat, setLat] = useState("");
    const [lon, setLon] = useState("");
    const [alt, setAlt] = useState("0");
    const [label, setLabel] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLat(observer ? String(observer.latitude) : "");
        setLon(observer ? String(observer.longitude) : "");
        setAlt(observer ? String(Math.round(observer.altitude)) : "0");
        setLabel(observer?.label ?? "");
        setError(null);
    }, [open, observer]);

    const locate = () => {
        if (!("geolocation" in navigator)) { setError(t("observer.geoUnsupported")); return; }
        setLocating(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                setLat(p.coords.latitude.toFixed(5));
                setLon(p.coords.longitude.toFixed(5));
                setAlt(String(Math.round(p.coords.altitude ?? 0)));
                setLabel(t("observer.myLocation"));
                setLocating(false);
            },
            (e) => {
                setError(e.code === e.PERMISSION_DENIED ? t("observer.geoDenied") : t("observer.geoFailed"));
                setLocating(false);
            },
            { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 }
        );
    };

    const save = () => {
        const la = parseFloat(lat.replace(",", "."));
        const lo = parseFloat(lon.replace(",", "."));
        const al = parseFloat(alt.replace(",", ".")) || 0;
        if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180)) { setError(t("observer.invalid")); return; }
        setObserver({ latitude: la, longitude: lo, altitude: Math.max(-500, Math.min(9000, al)), label: label.trim() || `${la.toFixed(2)}, ${lo.toFixed(2)}` });
        close();
    };

    return (
        <Dialog
            open={open}
            onClose={close}
            title={t("observer.title")}
            closeLabel={t("common.close")}
            footer={
                <>
                    {observer && <Button variant="ghost" onClick={() => { setObserver(null); close(); }}>{t("observer.clear")}</Button>}
                    <Button variant="accent" onClick={save}>{t("common.save")}</Button>
                </>
            }
        >
            <p className="text-[12.5px] text-dim mb-3">{t("observer.intro")}</p>

            <Button icon={<LocateFixed size={14} strokeWidth={1.5} />} onClick={locate} disabled={locating} className="w-full">
                {locating ? t("observer.locating") : t("observer.useDevice")}
            </Button>

            <div className="label mt-4 mb-1.5">{t("observer.cities")}</div>
            <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => (
                    <button
                        key={c.name}
                        type="button"
                        onClick={() => { setLat(String(c.lat)); setLon(String(c.lon)); setAlt(String(c.alt)); setLabel(c.name); }}
                        className="h-7 px-2 border border-rule-strong rounded-[2px] text-[12px] text-dim hover:text-ink hover:border-dim"
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <div className="label mt-4 mb-1.5">{t("observer.manual")}</div>
            <div className="grid grid-cols-3 gap-2">
                <label className="block">
                    <span className="text-[11px] text-dim">{t("observer.lat")}</span>
                    <TextInput inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className="num" placeholder="41.0082" />
                </label>
                <label className="block">
                    <span className="text-[11px] text-dim">{t("observer.lon")}</span>
                    <TextInput inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} className="num" placeholder="28.9784" />
                </label>
                <label className="block">
                    <span className="text-[11px] text-dim">{t("observer.alt")}</span>
                    <TextInput inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} className="num" />
                </label>
            </div>
            <label className="block mt-2">
                <span className="text-[11px] text-dim">{t("observer.label")}</span>
                <TextInput value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
            </label>

            {error && <div className="mt-3"><Note tone="warn">{error}</Note></div>}
            <p className="mt-3 text-[11.5px] text-faint">{t("observer.privacy")}</p>
        </Dialog>
    );
}
