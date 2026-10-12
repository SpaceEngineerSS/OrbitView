"use client";

import type { ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useLocale } from "@/hooks/useLocale";
import { Dialog } from "@/components/ui/Dialog";
import { Switch, Segmented, Field, Kbd } from "@/components/ui/Controls";

/** A grouped list, like iOS Settings. */
function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mt-5 first:mt-0">
            <h3 className="text-[13px] font-semibold text-ink-2 px-1 mb-1.5">{title}</h3>
            <div className="rounded-[16px] bg-card-2 px-4 divide-y divide-separator">{children}</div>
        </section>
    );
}

/** Settings. Also rendered inside the phone's settings sheet. */
export function SettingsBody() {
    const { t, locale, setLocale } = useLocale();
    const settings = useAppStore((s) => s.settings);
    const update = useAppStore((s) => s.updateSettings);
    const observer = useAppStore((s) => s.observer);
    const openDialog = useUiStore((s) => s.openDialog);

    return (
        <div>
            <Group title={t("settings.general")}>
                <Field label={t("settings.language")}>
                    <Segmented size="sm" label={t("settings.language")} value={locale} onChange={setLocale}
                        options={[{ value: "tr", label: "Türkçe" }, { value: "en", label: "English" }]} />
                </Field>
                <Field label={t("settings.theme")}>
                    <Segmented size="sm" label={t("settings.theme")} value={settings.theme} onChange={(theme) => update({ theme })}
                        options={[
                            { value: "system", label: t("settings.themeSystem") },
                            { value: "light", label: t("settings.themeLight") },
                            { value: "dark", label: t("settings.themeDark") },
                        ]} />
                </Field>
                <Field label={t("settings.clock")} description={t("settings.clockHint")}>
                    <Segmented size="sm" label={t("settings.clock")} value={settings.clock} onChange={(clock) => update({ clock })}
                        options={[{ value: "utc", label: "UTC" }, { value: "local", label: t("time.local") }]} />
                </Field>
                <button type="button" onClick={() => openDialog("observer")} className="w-full flex items-center justify-between gap-4 py-2.5 text-left">
                    <span>
                        <span className="block text-[15px]">{t("settings.observer")}</span>
                        <span className="block text-[13px] text-ink-2">{observer ? observer.label : t("observer.none")}</span>
                    </span>
                    <CaretRight size={16} weight="bold" className="text-ink-3" />
                </button>
                <Field label={t("settings.minElevation")} description={t("settings.minElevationHint")}>
                    <Segmented size="sm" label={t("settings.minElevation")} value={settings.minElevation} onChange={(minElevation) => update({ minElevation })}
                        options={[0, 5, 10, 20].map((v) => ({ value: v, label: `${v}°` }))} />
                </Field>
            </Group>

            <Group title={t("settings.globe")}>
                <Field label={t("settings.basemap")}>
                    <Segmented size="sm" label={t("settings.basemap")} value={settings.basemap} onChange={(basemap) => update({ basemap })}
                        options={[{ value: "imagery", label: t("settings.basemapImagery") }, { value: "dark", label: t("settings.basemapDark") }]} />
                </Field>
                <Switch label={t("settings.showOrbit")} checked={settings.showOrbit} onChange={(showOrbit) => update({ showOrbit })} />
                <Switch label={t("settings.showGroundTrack")} checked={settings.showGroundTrack} onChange={(showGroundTrack) => update({ showGroundTrack })} />
                <Switch label={t("settings.showFootprint")} description={t("settings.showFootprintHint")} checked={settings.showFootprint} onChange={(showFootprint) => update({ showFootprint })} />
                <Switch label={t("settings.nightShadow")} checked={settings.showNightShadow} onChange={(showNightShadow) => update({ showNightShadow })} />
                <Switch label={t("settings.autoRotate")} checked={settings.autoRotate} onChange={(autoRotate) => update({ autoRotate })} />
            </Group>

            <div className="hidden md:block">
                <Group title={t("settings.shortcuts")}>
                    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 py-3 text-[14px] text-ink-2">
                        <dt><Kbd>/</Kbd></dt><dd>{t("shortcuts.search")}</dd>
                        <dt><Kbd>Space</Kbd></dt><dd>{t("shortcuts.play")}</dd>
                        <dt className="flex gap-1"><Kbd>←</Kbd><Kbd>→</Kbd></dt><dd>{t("shortcuts.hour")}</dd>
                        <dt className="flex gap-1"><Kbd>Shift</Kbd><Kbd>←</Kbd><Kbd>→</Kbd></dt><dd>{t("shortcuts.day")}</dd>
                        <dt className="flex gap-1"><Kbd>[</Kbd><Kbd>]</Kbd></dt><dd>{t("shortcuts.speed")}</dd>
                        <dt><Kbd>N</Kbd></dt><dd>{t("shortcuts.now")}</dd>
                        <dt><Kbd>F</Kbd></dt><dd>{t("shortcuts.follow")}</dd>
                        <dt><Kbd>Esc</Kbd></dt><dd>{t("shortcuts.deselect")}</dd>
                    </dl>
                </Group>
            </div>
        </div>
    );
}

export default function SettingsDialog() {
    const { t } = useLocale();
    const open = useUiStore((s) => s.dialog === "settings");
    const close = useUiStore((s) => s.closeDialog);
    return (
        <Dialog open={open} onClose={close} title={t("settings.title")} closeLabel={t("common.close")}>
            <SettingsBody />
        </Dialog>
    );
}
