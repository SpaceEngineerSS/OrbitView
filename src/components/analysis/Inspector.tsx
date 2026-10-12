"use client";

import { Star, Crosshair, X } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import { regimeColor } from "@/lib/catalog";
import { useT } from "@/hooks/useLocale";
import { useAppStore } from "@/store/appStore";
import { IconButton } from "@/components/ui/Button";
import HeroCard from "./HeroCard";
import PassesCard from "./PassesCard";
import DopplerCard from "./DopplerCard";
import OrbitCard from "./OrbitCard";
import LifetimeCard from "./LifetimeCard";
import ApproachesCard from "./ApproachesCard";
import DataCard from "./DataCard";

/** Name, catalog number and the three actions that apply to the object. */
export function InspectorHeader({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const isFav = useAppStore((s) => s.favorites.includes(obj.id));
    const toggleFavorite = useAppStore((s) => s.toggleFavorite);
    const follow = useAppStore((s) => s.follow);
    const setFollow = useAppStore((s) => s.setFollow);
    const select = useAppStore((s) => s.select);

    return (
        <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
                <h2 className="text-[24px] font-semibold tracking-tight leading-tight truncate">{obj.name}</h2>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: regimeColor(obj) }} />
                    NORAD {obj.id}
                </div>
            </div>
            <IconButton size="sm" label={isFav ? t("inspector.unfavorite") : t("inspector.favorite")} onClick={() => toggleFavorite(obj.id)}>
                <Star size={17} weight={isFav ? "fill" : "bold"} color={isFav ? "var(--station)" : "currentColor"} />
            </IconButton>
            <IconButton size="sm" label={follow ? t("inspector.unfollow") : t("inspector.follow")} active={follow} onClick={() => setFollow(!follow)}>
                <Crosshair size={17} weight="bold" />
            </IconButton>
            <IconButton size="sm" label={t("inspector.close")} onClick={() => select(null)}>
                <X size={16} weight="bold" />
            </IconButton>
        </div>
    );
}

/** Every analysis as a card, most time-sensitive first. */
export function InspectorCards({ obj }: { obj: SpaceObject }) {
    return (
        <div key={obj.id} className="flex flex-col gap-3">
            <HeroCard obj={obj} />
            <PassesCard obj={obj} index={1} />
            <DopplerCard obj={obj} index={2} />
            <OrbitCard obj={obj} index={3} />
            <LifetimeCard obj={obj} index={4} />
            <ApproachesCard obj={obj} index={5} />
            <DataCard obj={obj} index={6} />
        </div>
    );
}
