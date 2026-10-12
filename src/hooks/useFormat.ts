"use client";

import { useMemo } from "react";
import { useLocale } from "./useLocale";
import { useAppStore } from "@/store/appStore";

export interface Formatters {
    /** Fixed decimals with locale separators */
    num: (v: number | null | undefined, digits?: number) => string | null;
    /** Signed number, always shows + or − */
    signed: (v: number | null | undefined, digits?: number) => string | null;
    /** HH:MM:SS in the user's chosen clock (UTC or local) */
    time: (d: Date | number, seconds?: boolean) => string;
    /** e.g. 12 Oct */
    date: (d: Date | number) => string;
    /** e.g. 12 Oct 14:03 */
    dateTime: (d: Date | number) => string;
    /** 5 min 12 s / 3 h 4 min / 2 d 5 h */
    duration: (seconds: number) => string;
    /** Latitude/longitude with hemisphere letter */
    lat: (deg: number) => string;
    lon: (deg: number) => string;
    /** "UTC" or the local zone abbreviation */
    zone: string;
}

export function useFormat(): Formatters {
    const { intl, t } = useLocale();
    const clock = useAppStore((s) => s.settings.clock);

    return useMemo(() => {
        const timeZone = clock === "utc" ? "UTC" : undefined;
        const nf = new Map<number, Intl.NumberFormat>();
        const numFmt = (digits: number) => {
            let f = nf.get(digits);
            if (!f) {
                f = new Intl.NumberFormat(intl, { minimumFractionDigits: digits, maximumFractionDigits: digits });
                nf.set(digits, f);
            }
            return f;
        };
        const tFmt = new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone });
        const tFmtShort = new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
        const dFmt = new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", timeZone });
        const dtFmt = new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });

        let zone = "UTC";
        if (clock === "local") {
            const part = new Intl.DateTimeFormat(intl, { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName");
            zone = part?.value ?? t("time.local");
        }

        const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

        return {
            num: (v, digits = 1) => (ok(v) ? numFmt(digits).format(v) : null),
            signed: (v, digits = 1) => {
                if (!ok(v)) return null;
                const text = numFmt(digits).format(Math.abs(v));
                // A value that rounds to zero gets no sign ("0.00", not "−0.00").
                if (Math.abs(v) < 0.5 * 10 ** -digits) return text;
                return (v > 0 ? "+" : "−") + text;
            },
            time: (d, seconds = true) => (seconds ? tFmt : tFmtShort).format(d),
            date: (d) => dFmt.format(d),
            dateTime: (d) => dtFmt.format(d),
            duration: (s) => {
                const total = Math.max(0, Math.round(s));
                const d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600);
                const m = Math.floor((total % 3600) / 60), sec = total % 60;
                if (d > 0) return t("units.dh", { d, h });
                if (h > 0) return t("units.hm", { h, m });
                if (m > 0) return t("units.ms", { m, s: sec });
                return t("units.s", { s: sec });
            },
            lat: (deg) => `${numFmt(2).format(Math.abs(deg))}° ${deg >= 0 ? t("geo.n") : t("geo.s")}`,
            lon: (deg) => `${numFmt(2).format(Math.abs(deg))}° ${deg >= 0 ? t("geo.e") : t("geo.w")}`,
            zone,
        };
    }, [intl, t, clock]);
}
