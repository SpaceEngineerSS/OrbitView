"use client";

import { Star, Crosshair, X } from "lucide-react";
import type { SpaceObject } from "@/lib/space-objects";
import { regimeColor } from "@/lib/catalog";
import { useT } from "@/hooks/useLocale";
import { useAppStore } from "@/store/appStore";
import { useUiStore, type InspectorTab } from "@/store/uiStore";
import { IconButton } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import OverviewModule from "./OverviewModule";
import PassesModule from "./PassesModule";
import DopplerModule from "./DopplerModule";
import ElementsModule from "./ElementsModule";
import LifetimeModule from "./LifetimeModule";
import ConjunctionModule from "./ConjunctionModule";
import DataModule from "./DataModule";

const TABS: InspectorTab[] = ["overview", "passes", "doppler", "elements", "lifetime", "conjunctions", "data"];

export function InspectorHeader({ obj, compact = false }: { obj: SpaceObject; compact?: boolean }) {
    const t = useT();
    const isFav = useAppStore((s) => s.favorites.includes(obj.id));
    const toggleFavorite = useAppStore((s) => s.toggleFavorite);
    const follow = useAppStore((s) => s.follow);
    const setFollow = useAppStore((s) => s.setFollow);
    const select = useAppStore((s) => s.select);

    return (
        <div className="flex items-start gap-2 px-3 pt-2.5 pb-2">
            <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0" style={{ background: regimeColor(obj) }} />
            <div className="min-w-0 flex-1">
                <h2 className={compact ? "text-[15px] font-medium truncate" : "text-[17px] font-medium truncate"}>{obj.name}</h2>
                <div className="num text-[11px] text-dim">
                    NORAD {obj.id}
                    {obj.category && !compact && <span> · {t(`regime.${obj.category}`)}</span>}
                </div>
            </div>
            <IconButton label={isFav ? t("inspector.unfavorite") : t("inspector.favorite")} active={isFav} onClick={() => toggleFavorite(obj.id)}>
                <Star size={15} strokeWidth={1.5} fill={isFav ? "currentColor" : "none"} />
            </IconButton>
            <IconButton label={follow ? t("inspector.unfollow") : t("inspector.follow")} active={follow} onClick={() => setFollow(!follow)}>
                <Crosshair size={15} strokeWidth={1.5} />
            </IconButton>
            <IconButton label={t("inspector.close")} onClick={() => select(null)}>
                <X size={16} strokeWidth={1.5} />
            </IconButton>
        </div>
    );
}

export function InspectorTabs() {
    const t = useT();
    const tab = useUiStore((s) => s.inspectorTab);
    const setTab = useUiStore((s) => s.setInspectorTab);
    return (
        <Tabs
            label={t("inspector.sections")}
            tabs={TABS.map((id) => ({ id, label: t(`inspector.tab.${id}`) }))}
            value={tab}
            onChange={setTab}
            className="px-1"
        />
    );
}

export function InspectorBody({ obj }: { obj: SpaceObject }) {
    const tab = useUiStore((s) => s.inspectorTab);
    return (
        <div role="tabpanel" key={`${obj.id}-${tab}`}>
            {tab === "overview" && <OverviewModule obj={obj} />}
            {tab === "passes" && <PassesModule obj={obj} />}
            {tab === "doppler" && <DopplerModule obj={obj} />}
            {tab === "elements" && <ElementsModule obj={obj} />}
            {tab === "lifetime" && <LifetimeModule obj={obj} />}
            {tab === "conjunctions" && <ConjunctionModule obj={obj} />}
            {tab === "data" && <DataModule obj={obj} />}
        </div>
    );
}
