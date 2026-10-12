"use client";

import { MapPin } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";

/** Shown wherever a calculation needs the observer's location and none is set. */
export default function ObserverPrompt() {
    const t = useT();
    const open = useUiStore((s) => s.openDialog);
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-dim">{t("observer.needed")}</p>
            <Button size="sm" icon={<MapPin size={13} strokeWidth={1.5} />} onClick={() => open("observer")}>
                {t("observer.set")}
            </Button>
        </div>
    );
}
