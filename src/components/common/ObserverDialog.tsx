"use client";

import { useEffect, useState } from "react";
import { NavigationArrow } from "@phosphor-icons/react";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Controls";
import { Note } from "@/components/ui/Card";

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
                    {observer && <Button variant="plain" onClick={() => { setObserver(null); close(); }}>{t("observer.clear")}</Button>}
                    <Button variant="filled" onClick={save}>{t("common.save")}</Button>
                </>
            }
        >
            <p className="text-[14px] text-ink-2 mb-4">{t("observer.intro")}</p>

            <Button variant="tinted" size="lg" icon={<NavigationArrow size={18} weight="fill" />} onClick={locate} disabled={locating} className="w-full">
                {locating ? t("observer.locating") : t("observer.useDevice")}
            </Button>

            <div className="text-[13px] font-semibold text-ink-2 mt-5 mb-2">{t("observer.cities")}</div>
            <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => (
                    <button
                        key={c.name}
                        type="button"
                        onClick={() => { setLat(String(c.lat)); setLon(String(c.lon)); setAlt(String(c.alt)); setLabel(c.name); }}
                        className={label === c.name ? "h-8 px-3 rounded-full text-[13px] font-semibold bg-accent text-on-accent" : "h-8 px-3 rounded-full text-[13px] font-semibold bg-fill text-ink hover:bg-fill-strong"}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <div className="text-[13px] font-semibold text-ink-2 mt-5 mb-2">{t("observer.manual")}</div>
            <div className="grid grid-cols-3 gap-2">
                <label className="block">
                    <span className="block text-[12px] text-ink-2 mb-1">{t("observer.lat")}</span>
                    <TextInput inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.0082" />
                </label>
                <label className="block">
                    <span className="block text-[12px] text-ink-2 mb-1">{t("observer.lon")}</span>
                    <TextInput inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="28.9784" />
                </label>
                <label className="block">
                    <span className="block text-[12px] text-ink-2 mb-1">{t("observer.alt")}</span>
                    <TextInput inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} />
                </label>
            </div>
            <label className="block mt-2">
                <span className="block text-[12px] text-ink-2 mb-1">{t("observer.label")}</span>
                <TextInput value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
            </label>

            {error && <p className="mt-3 text-[14px] text-red">{error}</p>}
            <Note className="mt-3">{t("observer.privacy")}</Note>
        </Dialog>
    );
}
