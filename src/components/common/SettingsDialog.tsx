"use client";

import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useLocale } from "@/hooks/useLocale";
import { Dialog } from "@/components/ui/Dialog";
import { Toggle, Segmented, Field, Kbd } from "@/components/ui/Controls";

/** Settings. Also rendered inline on the mobile Settings tab. */
export function SettingsBody() {
    const { t, locale, setLocale } = useLocale();
    const settings = useAppStore((s) => s.settings);
    const update = useAppStore((s) => s.updateSettings);
    const observer = useAppStore((s) => s.observer);
    const openDialog = useUiStore((s) => s.openDialog);

    return (
        <div>
            <h3 className="label mb-1">{t("settings.general")}</h3>
            <Field label={t("settings.language")}>
                <Segmented label={t("settings.language")} value={locale} onChange={setLocale}
                    options={[{ value: "tr", label: "Türkçe" }, { value: "en", label: "English" }]} />
            </Field>
            <Field label={t("settings.clock")} description={t("settings.clockHint")}>
                <Segmented label={t("settings.clock")} value={settings.clock} onChange={(clock) => update({ clock })}
                    options={[{ value: "utc", label: "UTC" }, { value: "local", label: t("time.local") }]} />
            </Field>
            <Field label={t("settings.observer")} description={observer ? observer.label : t("observer.none")}>
                <button type="button" onClick={() => openDialog("observer")} className="text-[12px] text-accent hover:underline underline-offset-2">
                    {observer ? t("common.change") : t("observer.set")}
                </button>
            </Field>
            <Field label={t("settings.minElevation")} description={t("settings.minElevationHint")}>
                <Segmented label={t("settings.minElevation")} value={settings.minElevation} onChange={(minElevation) => update({ minElevation })}
                    options={[0, 5, 10, 20].map((v) => ({ value: v, label: `${v}°` }))} />
            </Field>

            <h3 className="label mt-4 mb-1">{t("settings.globe")}</h3>
            <Field label={t("settings.basemap")}>
                <Segmented label={t("settings.basemap")} value={settings.basemap} onChange={(basemap) => update({ basemap })}
                    options={[{ value: "dark", label: t("settings.basemapDark") }, { value: "imagery", label: t("settings.basemapImagery") }]} />
            </Field>
            <Toggle label={t("settings.showOrbit")} checked={settings.showOrbit} onChange={(showOrbit) => update({ showOrbit })} />
            <Toggle label={t("settings.showGroundTrack")} checked={settings.showGroundTrack} onChange={(showGroundTrack) => update({ showGroundTrack })} />
            <Toggle label={t("settings.showFootprint")} description={t("settings.showFootprintHint")} checked={settings.showFootprint} onChange={(showFootprint) => update({ showFootprint })} />
            <Toggle label={t("settings.nightShadow")} checked={settings.showNightShadow} onChange={(showNightShadow) => update({ showNightShadow })} />
            <Toggle label={t("settings.autoRotate")} checked={settings.autoRotate} onChange={(autoRotate) => update({ autoRotate })} />

            <h3 className="label mt-4 mb-2 hidden md:block">{t("settings.shortcuts")}</h3>
            <dl className="hidden md:grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px] text-dim">
                <dt><Kbd>/</Kbd></dt><dd>{t("shortcuts.search")}</dd>
                <dt><Kbd>Space</Kbd></dt><dd>{t("shortcuts.play")}</dd>
                <dt><Kbd>←</Kbd> <Kbd>→</Kbd></dt><dd>{t("shortcuts.hour")}</dd>
                <dt><Kbd>Shift</Kbd> + <Kbd>←</Kbd> <Kbd>→</Kbd></dt><dd>{t("shortcuts.day")}</dd>
                <dt><Kbd>[</Kbd> <Kbd>]</Kbd></dt><dd>{t("shortcuts.speed")}</dd>
                <dt><Kbd>N</Kbd></dt><dd>{t("shortcuts.now")}</dd>
                <dt><Kbd>F</Kbd></dt><dd>{t("shortcuts.follow")}</dd>
                <dt><Kbd>Esc</Kbd></dt><dd>{t("shortcuts.deselect")}</dd>
            </dl>
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
