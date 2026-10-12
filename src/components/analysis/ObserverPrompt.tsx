"use client";

import { MapPin } from "@phosphor-icons/react";
import { useT } from "@/hooks/useLocale";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";

/** Shown wherever a calculation needs the observer's location and none is set. */
export default function ObserverPrompt() {
    const t = useT();
    const open = useUiStore((s) => s.openDialog);
    return (
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center">
                <MapPin size={20} weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold">{t("observer.neededTitle")}</div>
                <div className="text-[13px] text-ink-2">{t("observer.needed")}</div>
            </div>
            <Button size="sm" variant="filled" onClick={() => open("observer")}>{t("observer.set")}</Button>
        </div>
    );
}
